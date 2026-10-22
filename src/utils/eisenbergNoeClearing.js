/**
 * Eisenberg-Noe (2001) Systemic Risk Clearing Engine & Multi-Round Stress Cascade
 * 
 * Mathematical Formulation:
 * Eisenberg, L., & Noe, T. H. (2001). Systemic Risk in Financial Systems.
 * Management Science, 47(2), 236-249.
 * 
 * Standards & Protocols:
 * - A1: Canonical Matrix Digest & datasetRevision independent cache keys
 * - A2: Explicit distinction between OBSERVED, EXPLICIT_ZERO, and MISSING/NA reserves
 * - A3: Centralized liability resolver with declared statistical basis (no silent fallback)
 * - A4: Independent post-solve verification of clearing operator Phi(p) and scaled residuals
 * - A5: Rigorous subset coverage ratios (Full Network 23/23 vs Non-Epicenter Spillover 22/22)
 */

export const CLEARING_VERSION_REGISTRY = {
  PRODUCT: 'v1.0.0',
  MODEL: 'v1.0-DualBaseline-Workbench-EN2001',
  DATA: (quarter) => {
    if (quarter <= '2026Q1') return 'BIS-SDMX-Official';
    if (quarter === '2026Q2') return 'BIS-Pending-Release (2026-10-30)';
    return 'Macro-NOWCAST-Scenario';
  }
};

/**
 * P0: Unified Corridor Normalization & Deduplication
 * 
 * Defines the canonical contract for cross-border exposures:
 * 1. An exposure record can be a single exposure/tranche or an aggregated corridor.
 * 2. Stable ID Deduplication: If a record has an explicit `id`, duplicate imports with identical
 *    attributes are deduplicated (idempotent import).
 * 3. Conflicting Records: If the same `id` appears with conflicting amounts or endpoints,
 *    it is quarantined into `conflicts` and excluded from the matrix (with an explicit error message).
 * 4. True Multiple Exposures: Valid multiple exposures for the same (source, target) corridor
 *    are summed deterministically.
 * 5. Order Invariance: Sorting exposures canonically prior to aggregation guarantees that
 *    shuffling raw input order does NOT change normalized corridors or clearing results.
 */
export function normalizeCorridorExposures(rawRecords = [], options = {}) {
  const {
    sparseContract = 'UNLISTED_CORRIDORS_ARE_ZERO'
  } = options;

  if (!Array.isArray(rawRecords) || rawRecords.length === 0) {
    return {
      normalizedLinks: [],
      rawCount: 0,
      validExposuresCount: 0,
      aggregatedCount: 0,
      conflicts: [],
      sparseContract
    };
  }

  const seenIds = new Map(); // id -> record
  const conflicts = [];
  const validExposures = [];

  // Pass 1: Handle Stable IDs and identify conflicts / idempotent duplicates
  for (let idx = 0; idx < rawRecords.length; idx++) {
    const raw = rawRecords[idx];
    if (!raw || typeof raw !== 'object') continue;

    const source = raw.source || raw.debtor || raw.origin;
    const target = raw.target || raw.creditor || raw.destination;
    const rawAmount = raw.claims_usd_bn !== undefined ? raw.claims_usd_bn : (raw.amount !== undefined ? raw.amount : raw.claims);
    const id = raw.id || raw.exposure_id || null;

    if (!source || !target) {
      conflicts.push({
        record: raw,
        reason: 'MISSING_SOURCE_OR_TARGET',
        index: idx
      });
      continue;
    }

    const amount = Number(rawAmount);
    if (isNaN(amount) || !isFinite(amount) || amount < 0) {
      conflicts.push({
        record: raw,
        reason: 'INVALID_AMOUNT',
        index: idx
      });
      continue;
    }

    if (id !== null && id !== undefined && String(id).trim() !== '') {
      const stableId = String(id).trim();
      if (seenIds.has(stableId)) {
        const existing = seenIds.get(stableId);
        // Check if identical (idempotent re-import) or conflicting
        const isIdentical = (existing.source === source && existing.target === target && Math.abs(existing.amount - amount) < 1e-9);
        if (isIdentical) {
          // Idempotent duplicate: skip re-adding
          continue;
        } else {
          // Conflicting record with existing ID!
          conflicts.push({
            record: raw,
            existingRecord: existing,
            reason: `CONFLICTING_ID: ID "${stableId}" already registered with source=${existing.source}, target=${existing.target}, amount=${existing.amount}, but received conflicting source=${source}, target=${target}, amount=${amount}`,
            index: idx
          });
          continue;
        }
      } else {
        const item = { source: String(source).trim(), target: String(target).trim(), amount, id: stableId, originalRecord: raw };
        seenIds.set(stableId, item);
        validExposures.push(item);
      }
    } else {
      // Exposure without explicit ID
      validExposures.push({
        source: String(source).trim(),
        target: String(target).trim(),
        amount,
        id: null,
        originalRecord: raw
      });
    }
  }

  // Pass 2: Canonical sorting for absolute order invariance
  validExposures.sort((a, b) => {
    const sCmp = a.source.localeCompare(b.source);
    if (sCmp !== 0) return sCmp;
    const tCmp = a.target.localeCompare(b.target);
    if (tCmp !== 0) return tCmp;
    const idA = a.id || '';
    const idB = b.id || '';
    const idCmp = idA.localeCompare(idB);
    if (idCmp !== 0) return idCmp;
    return a.amount - b.amount;
  });

  // Pass 3: Aggregate multiple exposures by (source, target)
  const corridorMap = new Map();
  for (const exp of validExposures) {
    const key = `${exp.source}->${exp.target}`;
    if (!corridorMap.has(key)) {
      corridorMap.set(key, {
        source: exp.source,
        target: exp.target,
        claims_usd_bn: 0,
        usd_denominated_bn: 0,
        exposureCount: 0,
        exposureIds: [],
        rawRecords: [],
        sampleRaw: exp.originalRecord
      });
    }
    const corr = corridorMap.get(key);
    corr.claims_usd_bn += exp.amount;
    corr.exposureCount += 1;
    if (exp.id) corr.exposureIds.push(exp.id);
    corr.rawRecords.push(exp.originalRecord);

    // Track usd_denominated_bn if present on raw record
    const rawRec = exp.originalRecord || {};
    const rawUsd = rawRec.usd_denominated_bn !== undefined 
      ? Number(rawRec.usd_denominated_bn) 
      : (rawRec.usd_claims_bn !== undefined 
          ? Number(rawRec.usd_claims_bn) 
          : (rawRec.usd_pct !== undefined ? (exp.amount * Number(rawRec.usd_pct) / 100) : null));
    if (rawUsd !== null && !isNaN(rawUsd)) {
      corr.usd_denominated_bn += rawUsd;
    }
  }

  // Sort corridors deterministically
  const normalizedLinks = Array.from(corridorMap.values()).map(c => {
    const claims = Math.round(c.claims_usd_bn * 1e8) / 1e8;
    // If usd_denominated_bn was aggregated, use it; otherwise fallback to sample raw or null
    let usdDenom = Math.round(c.usd_denominated_bn * 1e8) / 1e8;
    if (usdDenom === 0 && claims > 0 && c.sampleRaw?.usd_denominated_bn === undefined && c.sampleRaw?.usd_claims_bn === undefined) {
      // Check if sample raw had default ratio or preserve whatever it had
      usdDenom = c.sampleRaw?.usd_pct ? Math.round(claims * (c.sampleRaw.usd_pct / 100) * 1e8) / 1e8 : Math.round(claims * 0.7 * 1e8) / 1e8;
    }
    return {
      source: c.source,
      target: c.target,
      claims_usd_bn: claims,
      usd_denominated_bn: usdDenom,
      exposureCount: c.exposureCount,
      exposureIds: c.exposureIds,
      isAggregated: c.exposureCount > 1,
      is_nowcast: c.sampleRaw?.is_nowcast || false,
      corridor_category: c.sampleRaw?.corridor_category || 'General'
    };
  });

  normalizedLinks.sort((a, b) => {
    const sCmp = a.source.localeCompare(b.source);
    if (sCmp !== 0) return sCmp;
    return a.target.localeCompare(b.target);
  });

  return {
    normalizedLinks,
    rawCount: rawRecords.length,
    validExposuresCount: validExposures.length,
    aggregatedCount: normalizedLinks.length,
    conflicts,
    sparseContract
  };
}

/**
 * A1: Canonical Matrix Content Digest
 * Normalizes exposures and computes dual-word 64-bit hash
 * on raw unrounded values, distinguishing null, undefined, explicit zero, and positive claims.
 */
export function computeCanonicalMatrixDigest(links = []) {
  if (!links || links.length === 0) return 'EMPTY_MATRIX';

  const norm = normalizeCorridorExposures(links);
  const sorted = norm.normalizedLinks;
  if (sorted.length === 0) return 'EMPTY_MATRIX';

  let h1 = 0x811c9dc5;
  let h2 = 0x1000193;

  for (let i = 0; i < sorted.length; i++) {
    const l = sorted[i];
    const valStr = (l.claims_usd_bn === null)
      ? 'NULL'
      : (l.claims_usd_bn === undefined)
        ? 'UNDEF'
        : String(l.claims_usd_bn);
    const itemStr = `${l.source}>${l.target}:${valStr};`;

    for (let c = 0; c < itemStr.length; c++) {
      const code = itemStr.charCodeAt(c);
      h1 = Math.imul(h1 ^ code, 0x01000193);
      h2 = Math.imul(h2 ^ (code * 31), 0x5bd1e995);
    }
  }

  return `${(h1 >>> 0).toString(16)}-${(h2 >>> 0).toString(16)}`;
}

/**
 * A1: Comprehensive Cache & Identity Keys
 */
export function buildDataFingerprint({
  revision = 1,
  quarter,
  links = [],
  epicenter = '',
  haircutPct = 0,
  bufferMultiplier = 1.5,
  deleveragingMultiplier = 1.5,
  dollarSqueezePct = 12,
  simMode = 'en_clearing',
  enSortMetric = 'incremental',
  allowModelProxy = false
}) {
  const digest = computeCanonicalMatrixDigest(links);
  return `REV:${revision}_Q:${quarter}_DIGEST:${digest}_EPI:${epicenter}_HC:${haircutPct}_BUF:${bufferMultiplier}_DEL:${deleveragingMultiplier}_DSQ:${dollarSqueezePct}_M:${simMode}_SM:${enSortMetric}_PRX:${allowModelProxy}`;
}

export function buildBaselineCacheKey({
  revision = 1,
  quarter,
  links = [],
  bufferMultiplier = 1.5
}) {
  const digest = computeCanonicalMatrixDigest(links);
  return `BASE_REV:${revision}_Q:${quarter}_DIGEST:${digest}_BUF:${bufferMultiplier}`;
}

export function buildShockCacheKey({
  revision = 1,
  quarter,
  links = [],
  epicenter = '',
  haircutPct = 0,
  bufferMultiplier = 1.5
}) {
  const digest = computeCanonicalMatrixDigest(links);
  return `SHOCK_REV:${revision}_Q:${quarter}_DIGEST:${digest}_EPI:${epicenter}_HC:${haircutPct}_BUF:${bufferMultiplier}`;
}

/**
 * A2: Centralized FX Reserves Resolver
 * Distinguishes OBSERVED, EXPLICIT_ZERO, MISSING, and INVALID_NUMERIC
 */
export function resolveCountryReserves({
  dataset,
  country,
  quarter,
  allowEstimation = false,
  assumeZeroReserves = false
}) {
  const code = typeof country === 'string' ? country : country?.code;
  const cMeta = dataset?.countries?.find(c => c.code === code) || (typeof country === 'object' ? country : null);
  const cbsRisk = dataset?.cbs_risk || {};
  const qRecord = (cbsRisk[code] || []).find(q => q.quarter === quarter);

  const meta = {
    unit: 'USD_BN',
    currency: 'USD',
    jurisdiction: code,
    period: quarter
  };

  // If explicit stress scenario assumption specifies zero reserves:
  if (assumeZeroReserves) {
    return {
      ...meta,
      status: 'SCENARIO_ASSUMED_ZERO',
      category: 'SCENARIO_ASSUMPTION',
      value: 0,
      isExplicitZero: false,
      isScenarioAssumed: true,
      isMissing: false,
      source: 'STRESS_SCENARIO_ASSUMPTION',
      explanation: '用户显式选定之零外储极端压力假设情景 (Stress Scenario Assumption)'
    };
  }

  if (qRecord && qRecord.fx_reserves_bn !== undefined && qRecord.fx_reserves_bn !== null) {
    const rawVal = qRecord.fx_reserves_bn;

    if (typeof rawVal !== 'number' || isNaN(rawVal) || !isFinite(rawVal) || rawVal < 0) {
      return {
        ...meta,
        status: 'INVALID_NUMERIC',
        category: 'INVALID_NUMERIC',
        value: null,
        isExplicitZero: false,
        isScenarioAssumed: false,
        isMissing: true,
        source: 'BIS_CBS_TABLE_B',
        explanation: '外汇储备记录存在非有限或非法数值'
      };
    }

    if (rawVal === 0) {
      return {
        ...meta,
        status: 'EXPLICIT_ZERO',
        category: 'OBSERVED_ZERO',
        value: 0,
        isExplicitZero: true,
        isScenarioAssumed: false,
        isMissing: false,
        source: 'BIS_CBS_TABLE_B',
        explanation: '官方统计明确记录外汇储备为 0.00'
      };
    }

    return {
      ...meta,
      status: qRecord.is_nowcast ? 'NOWCAST' : (quarter <= '2026Q1' ? 'OFFICIAL' : (quarter === '2026Q2' ? 'PENDING_VERIFICATION' : 'NOWCAST')),
      category: 'OBSERVED',
      value: rawVal,
      isExplicitZero: false,
      isScenarioAssumed: false,
      isMissing: false,
      source: 'BIS_CBS_TABLE_B (Quarterly)',
      explanation: '当季 CBS Table B 登记之官方外汇储备'
    };
  }

  // Check static metadata fallback only if explicit estimation is allowed
  if (allowEstimation && cMeta && cMeta.fx_reserves !== undefined && cMeta.fx_reserves !== null && !isNaN(cMeta.fx_reserves)) {
    const staticVal = Number(cMeta.fx_reserves);
    if (staticVal === 0) {
      return {
        ...meta,
        status: 'EXPLICIT_ZERO',
        category: 'OBSERVED_ZERO',
        value: 0,
        isExplicitZero: true,
        isScenarioAssumed: false,
        isMissing: false,
        source: 'COUNTRY_METADATA_ESTIMATED',
        explanation: '静态元数据插补明确零'
      };
    }
    return {
      ...meta,
      status: 'ESTIMATED_STATIC_FALLBACK',
      category: 'SCENARIO_ASSUMPTION',
      value: staticVal,
      isExplicitZero: false,
      isScenarioAssumed: true,
      isMissing: false,
      source: 'COUNTRY_METADATA_ESTIMATED',
      explanation: '用户显式授权采用历史元数据常数估算'
    };
  }

  // Definite missing
  return {
    ...meta,
    status: 'MISSING',
    category: 'MISSING',
    value: null,
    isExplicitZero: false,
    isScenarioAssumed: false,
    isMissing: true,
    source: 'NONE_MISSING',
    explanation: '当期未填报官方外汇储备数据，严格标记为缺失'
  };
}

/**
 * A3: Centralized Liability Resolver
 * Prohibits silent cross-basis substitution unless explicitly authorized as model proxy
 */
export function resolveJurisdictionLiability({
  dataset,
  countryCode,
  quarter,
  requiredBasis = 'LBS_RESIDENCE', // 'LBS_RESIDENCE' | 'CBS_ULTIMATE_RISK' | 'BILATERAL_MATRIX_PERIMETER'
  allowModelProxy = false,
  matrixLinks = null
}) {
  const lbsData = dataset?.lbs_data || {};
  const cbsRisk = dataset?.cbs_risk || {};
  const rawLinks = matrixLinks || (dataset?.bilateral_matrix || {})[quarter] || [];
  const hasQuarterMatrix = Boolean(matrixLinks || (dataset?.bilateral_matrix && dataset.bilateral_matrix[quarter]));

  // Canonically normalize matrix links
  const normLinks = normalizeCorridorExposures(rawLinks).normalizedLinks;

  const qLbs = (lbsData[countryCode] || []).find(q => q.quarter === quarter);
  const qCbs = (cbsRisk[countryCode] || []).find(q => q.quarter === quarter);

  const matrixSum = normLinks
    .filter(l => l.target === countryCode)
    .reduce((sum, l) => sum + (Number(l.claims_usd_bn) || 0), 0);

  const baseResult = {
    jurisdiction: countryCode,
    period: quarter,
    unit: 'USD_BN',
    availableSources: {
      lbsResidence: qLbs?.liabilities_usd_bn ?? null,
      cbsUltimateRisk: qCbs?.cross_border_borrowings_bn ?? null,
      bilateralMatrixSum: hasQuarterMatrix ? matrixSum : null
    }
  };

  // 1. Bilateral Matrix Perimeter Column Sum
  if (requiredBasis === 'BILATERAL_MATRIX_PERIMETER') {
    if (!hasQuarterMatrix) {
      return {
        ...baseResult,
        value: null,
        source: 'NONE_MISSING',
        statisticalBasis: '23国银行间闭合有向网络列和 (Inward Cross-Border Obligations)',
        isFallback: false,
        isMissing: true,
        fallbackReason: '该季度双边网络矩阵数据未填报或缺失，禁止按零负债推演',
        status: 'MISSING_QUARTER_MATRIX'
      };
    }
    return {
      ...baseResult,
      value: matrixSum,
      source: 'BILATERAL_MATRIX_SUM',
      statisticalBasis: '23国银行间闭合有向网络列和 (Inward Cross-Border Obligations)',
      isFallback: false,
      isMissing: false,
      fallbackReason: null,
      status: quarter <= '2026Q1' ? 'OFFICIAL_MATRIX' : (quarter === '2026Q2' ? 'PENDING_MATRIX' : 'NOWCAST_MATRIX')
    };
  }

  // 2. LBS Residence Basis
  if (requiredBasis === 'LBS_RESIDENCE') {
    if (qLbs && qLbs.liabilities_usd_bn !== undefined && qLbs.liabilities_usd_bn !== null) {
      const val = Number(qLbs.liabilities_usd_bn);
      return {
        ...baseResult,
        value: val,
        source: 'BIS_LBS_TABLE_A',
        statisticalBasis: '居住地原则跨国银行负债 (Locational Banking Statistics)',
        isFallback: false,
        isMissing: false,
        fallbackReason: null,
        status: qLbs.is_nowcast ? 'NOWCAST' : (quarter <= '2026Q1' ? 'OFFICIAL' : (quarter === '2026Q2' ? 'PENDING_VERIFICATION' : 'NOWCAST'))
      };
    }

    if (allowModelProxy && hasQuarterMatrix) {
      return {
        ...baseResult,
        value: matrixSum,
        source: 'BILATERAL_MATRIX_SUM_PROXY',
        statisticalBasis: '23国闭合网络列和代理 (Model Proxy)',
        isFallback: true,
        isMissing: false,
        fallbackReason: 'LBS统计缺失，用户显式授权采用闭合矩阵列和作为模型代理',
        status: 'MODEL_PROXY'
      };
    }

    return {
      ...baseResult,
      value: null,
      source: 'NONE_MISSING',
      statisticalBasis: '居住地原则跨国银行负债 (Locational Banking Statistics)',
      isFallback: false,
      isMissing: true,
      fallbackReason: '当期LBS居住地统计未填报，且未授权跨口径代理',
      status: 'UNAVAILABLE_MISSING'
    };
  }

  // 3. CBS Ultimate Risk Basis
  if (requiredBasis === 'CBS_ULTIMATE_RISK') {
    if (qCbs && qCbs.cross_border_borrowings_bn !== undefined && qCbs.cross_border_borrowings_bn !== null) {
      const val = Number(qCbs.cross_border_borrowings_bn);
      return {
        ...baseResult,
        value: val,
        source: 'BIS_CBS_TABLE_B',
        statisticalBasis: '最终风险承担原则跨国借款 (Consolidated Ultimate Risk)',
        isFallback: false,
        isMissing: false,
        fallbackReason: null,
        status: qCbs.is_nowcast ? 'NOWCAST' : (quarter <= '2026Q1' ? 'OFFICIAL' : (quarter === '2026Q2' ? 'PENDING_VERIFICATION' : 'NOWCAST'))
      };
    }

    if (allowModelProxy && hasQuarterMatrix) {
      return {
        ...baseResult,
        value: matrixSum,
        source: 'BILATERAL_MATRIX_SUM_PROXY',
        statisticalBasis: '23国闭合网络列和代理 (Model Proxy)',
        isFallback: true,
        isMissing: false,
        fallbackReason: 'CBS跨国借款统计缺失，用户显式授权采用闭合矩阵列和作为模型代理',
        status: 'MODEL_PROXY'
      };
    }

    return {
      ...baseResult,
      value: null,
      source: 'NONE_MISSING',
      statisticalBasis: '最终风险承担原则跨国借款 (Consolidated Ultimate Risk)',
      isFallback: false,
      isMissing: true,
      fallbackReason: '当期CBS统计未填报，且未授权跨口径代理',
      status: 'UNAVAILABLE_MISSING'
    };
  }

  throw new Error(`Unsupported statistical basis: ${requiredBasis}`);
}

/**
 * A4: Independent Fixed-Point Verification Function
 * Recomputes Phi(p) independently on final payment vector p, evaluating exact
 * node-wise absolute and scaled residuals against Eisenberg-Noe operator.
 */
export function verifyFixedPointClearingVector({
  N,
  codes = [],
  pbar,
  Pi,
  eVec,
  e,
  pCandidate,
  absTolerance = 1e-4,
  relTolerance = 1e-5
}) {
  const ext = eVec || e || [];
  const n = N !== undefined ? N : (pbar ? pbar.length : 0);
  let maxAbsResidual = 0;
  let maxScaledResidual = 0;
  let worstNodeIndex = -1;
  let worstNodeResidual = 0;
  let worstNodePhi = 0;
  let worstNodeScaledResidual = 0;
  let boundsValid = true;
  let allNodesValid = true;
  let hasNonFinite = false;
  const boundsViolations = [];
  const nodeVerifications = [];

  for (let i = 0; i < n; i++) {
    const pi = pCandidate[i];
    const pb = pbar[i];
    let nodePassed = true;
    let failureReason = null;
    const nodeCode = Array.isArray(codes) && codes[i] ? codes[i] : `Node_${i}`;

    // 1. Numerical legality & bounds check: 0 <= p_i <= pbar_i
    if (typeof pi !== 'number' || isNaN(pi) || !isFinite(pi)) {
      boundsValid = false;
      hasNonFinite = true;
      nodePassed = false;
      failureReason = 'NON_FINITE_PAYMENT';
      boundsViolations.push({ index: i, code: nodeCode, p: pi, pbar: pb, error: 'NON_FINITE_PAYMENT' });
      nodeVerifications.push({
        nodeIndex: i,
        code: nodeCode,
        p: pi,
        pbar: pb,
        phi: null,
        absResidual: Infinity,
        residual: Infinity,
        scaledResidual: Infinity,
        allowableTol: absTolerance,
        threshold: absTolerance,
        valid: false,
        passed: false,
        failureReason
      });
      allNodesValid = false;
      continue;
    }

    if (pb <= 0) {
      if (Math.abs(pi) > absTolerance) {
        boundsValid = false;
        nodePassed = false;
        failureReason = 'ZERO_DEBT_POSITIVE_PAYMENT';
        boundsViolations.push({ index: i, code: nodeCode, p: pi, pbar: pb, error: 'ZERO_DEBT_POSITIVE_PAYMENT' });
      }
    } else {
      if (pi < -absTolerance) {
        boundsValid = false;
        nodePassed = false;
        failureReason = 'BOUNDS_VIOLATION_LOWER';
        boundsViolations.push({ index: i, code: nodeCode, p: pi, pbar: pb, error: 'BOUNDS_VIOLATION_LOWER' });
      } else if (pi > pb + absTolerance) {
        boundsValid = false;
        nodePassed = false;
        failureReason = 'BOUNDS_VIOLATION_UPPER';
        boundsViolations.push({ index: i, code: nodeCode, p: pi, pbar: pb, error: 'BOUNDS_VIOLATION_UPPER' });
      }
    }

    // 2. Independent evaluation of Clearing Operator Phi_i(p)
    let inflows = 0;
    for (let j = 0; j < n; j++) {
      inflows += Pi[j][i] * pCandidate[j];
    }

    const available = Math.max(0, inflows + ext[i]);
    const phi_i = pb > 0 ? Math.min(pb, available) : 0;

    // Independent residual r_i = p_i - Phi_i(p)
    const ri = Math.abs(pi - phi_i);
    const scale = Math.max(1.0, pb);
    const scaled_ri = ri / scale;
    const nodeTol = absTolerance + relTolerance * pb;

    if (ri > nodeTol + 1e-9) {
      nodePassed = false;
      if (!failureReason) failureReason = 'TOLERANCE_EXCEEDED';
    }

    if (!nodePassed) {
      allNodesValid = false;
    }

    if (ri > maxAbsResidual) {
      maxAbsResidual = ri;
      worstNodeIndex = i;
      worstNodeResidual = ri;
      worstNodePhi = phi_i;
      worstNodeScaledResidual = scaled_ri;
    }
    if (scaled_ri > maxScaledResidual) {
      maxScaledResidual = scaled_ri;
    }

    nodeVerifications.push({
      nodeIndex: i,
      code: nodeCode,
      p: pi,
      pbar: pb,
      phi: phi_i,
      absResidual: ri,
      residual: ri,
      scaledResidual: scaled_ri,
      allowableTol: nodeTol,
      threshold: nodeTol,
      valid: nodePassed,
      passed: nodePassed,
      failureReason
    });
  }

  // Combined absolute and relative tolerance threshold
  const worstNodePbar = worstNodeIndex >= 0 ? pbar[worstNodeIndex] : 0;
  const allowableTol = absTolerance + relTolerance * worstNodePbar;
  const fixedPointValid = boundsValid && !hasNonFinite && allNodesValid && maxAbsResidual <= allowableTol;

  let stopReason = 'CONVERGED_TOLERANCE';
  if (hasNonFinite) {
    stopReason = 'NON_FINITE_PAYMENT';
  } else if (!boundsValid) {
    stopReason = boundsViolations[0]?.error || 'BOUNDS_VIOLATION';
  } else if (!allNodesValid || maxAbsResidual > allowableTol) {
    stopReason = 'TOLERANCE_EXCEEDED';
  }

  return {
    fixedPointValid,
    allNodesValid,
    stopReason,
    maxAbsResidual,
    maxScaledResidual,
    worstNodeIndex,
    worstNodeResidual,
    worstNode: worstNodeIndex >= 0 ? {
      index: worstNodeIndex,
      code: Array.isArray(codes) && codes[worstNodeIndex] ? codes[worstNodeIndex] : `Node_${worstNodeIndex}`,
      p: pCandidate[worstNodeIndex],
      pbar: pbar[worstNodeIndex],
      phi: worstNodePhi,
      absResidual: maxAbsResidual,
      residual: maxAbsResidual,
      scaledResidual: worstNodeScaledResidual,
      threshold: allowableTol
    } : null,
    boundsValid,
    boundsViolations,
    absTolerance,
    relTolerance,
    nodeVerifications,
    verificationSummary: fixedPointValid
      ? `固定点独立逐节点残差通过检验 (最大残差: ${maxAbsResidual < 1e-6 ? '<1e-6' : maxAbsResidual.toFixed(8)} B, 缩放残差: ${maxScaledResidual.toExponential(2)})`
      : `固定点残差超标或越界 (停止原因: ${stopReason}, 最差节点索引 ${worstNodeIndex}, 残差 ${maxAbsResidual.toFixed(6)} B > 阈值 ${allowableTol.toFixed(6)} B)`
  };
}

/**
 * Pure Picard Fixed-Point Solver with loop difference tracking
 */
export function solvePicardFixedPoint({
  pbar,
  Pi,
  eVec,
  maxIterations = 100,
  tolerance = 1e-4,
  codes = []
}) {
  const n = pbar.length;
  let p = new Float64Array(pbar);
  let iterCount = 0;
  let finalLoopDiff = 0;

  for (let iter = 0; iter < maxIterations; iter++) {
    iterCount = iter + 1;
    const pNext = new Float64Array(n);
    let diff = 0;

    for (let i = 0; i < n; i++) {
      if (pbar[i] <= 0) {
        pNext[i] = 0;
        continue;
      }
      let inflows = 0;
      for (let j = 0; j < n; j++) {
        inflows += Pi[j][i] * p[j];
      }
      const available = Math.max(0, inflows + eVec[i]);
      pNext[i] = Math.min(pbar[i], available);
      diff = Math.max(diff, Math.abs(pNext[i] - p[i]));
    }

    p = pNext;
    finalLoopDiff = diff;
    if (diff < tolerance) {
      break;
    }
  }

  const iterationConverged = finalLoopDiff < tolerance;

  // Perform independent post-solve fixed point verification (A4)
  const verification = verifyFixedPointClearingVector({
    codes,
    pbar,
    Pi,
    eVec,
    pCandidate: p,
    absTolerance: tolerance,
    relTolerance: 1e-5
  });

  const stopReason = !iterationConverged
    ? 'MAX_ITERATIONS_EXCEEDED'
    : (verification.fixedPointValid ? 'CONVERGED_TOLERANCE' : verification.stopReason);

  return {
    p,
    iterCount,
    residual: finalLoopDiff,
    finalLoopDiff,
    iterationConverged,
    maxIterations,
    tolerance,
    verification,
    stopReason,
    worstNode: verification.worstNode,
    converged: iterationConverged && verification.fixedPointValid
  };
}

/**
 * A5: Resolve Country Inputs & Rigorous Coverage Statistics
 */
export function resolveCountryInputs({
  dataset,
  quarter,
  currentLinks = [],
  bufferMultiplier = 1.5,
  allowEstimation = false,
  allowModelProxy = false,
  assumeZeroReserves = false
}) {
  const countries = dataset.countries || [];
  const totalCount = countries.length;

  const countryInputs = {};
  let validReservesCount = 0;
  let validLiabFullCount = 0;
  let observedReservesCount = 0;
  let observedZeroReservesCount = 0;
  let assumedZeroReservesCount = 0;
  let missingReservesCount = 0;

  // Pre-calculate canonically normalized bilateral matrix obligations for all targets
  const normResult = normalizeCorridorExposures(currentLinks);
  const normLinks = normResult.normalizedLinks;
  const matrixLiabMap = {};
  normLinks.forEach(l => {
    matrixLiabMap[l.target] = (matrixLiabMap[l.target] || 0) + (Number(l.claims_usd_bn) || 0);
  });

  countries.forEach(c => {
    // 1. Reserves via A2 centralized resolver
    const reservesInfo = resolveCountryReserves({
      dataset,
      country: c,
      quarter,
      allowEstimation,
      assumeZeroReserves
    });

    if (reservesInfo.isScenarioAssumed) {
      assumedZeroReservesCount++;
      validReservesCount++;
    } else if (reservesInfo.isExplicitZero) {
      observedZeroReservesCount++;
      validReservesCount++;
    } else if (reservesInfo.value !== null && !reservesInfo.isMissing) {
      observedReservesCount++;
      validReservesCount++;
    } else {
      missingReservesCount++;
    }

    // 2. Clearing liabilities (Matrix sum)
    const clearingLiab = resolveJurisdictionLiability({
      dataset,
      countryCode: c.code,
      quarter,
      requiredBasis: 'BILATERAL_MATRIX_PERIMETER',
      allowModelProxy: true,
      matrixLinks: normLinks
    });

    // 3. Behavioral liabilities (LBS Residence basis with explicit proxy rule)
    const behLiab = resolveJurisdictionLiability({
      dataset,
      countryCode: c.code,
      quarter,
      requiredBasis: 'LBS_RESIDENCE',
      allowModelProxy,
      matrixLinks: normLinks
    });

    if (behLiab.value !== null && !isNaN(behLiab.value)) {
      validLiabFullCount++;
    }

    // 4. Boundary Liquidity Buffer e_i
    let bufferVal = 0;
    let bufferStatus = 'BUFFER_AVAILABLE';
    const isMissingInput = reservesInfo.isMissing;

    if (reservesInfo.isScenarioAssumed) {
      bufferVal = 0;
      bufferStatus = 'BUFFER_SCENARIO_ASSUMED_ZERO';
    } else if (reservesInfo.isMissing) {
      bufferVal = 0;
      bufferStatus = 'BUFFER_UNAVAILABLE_MISSING_RESERVES';
    } else if (reservesInfo.isExplicitZero) {
      bufferVal = 0;
      bufferStatus = 'BUFFER_EXPLICIT_ZERO';
    } else if (reservesInfo.value > 0) {
      bufferVal = reservesInfo.value * bufferMultiplier;
      bufferStatus = 'BUFFER_ACTIVE';
    }

    countryInputs[c.code] = {
      code: c.code,
      name: c.name,
      name_zh: c.name_zh,
      quarter,
      reserves: reservesInfo,
      clearingLiabilities: clearingLiab,
      behavioralLiabilities: behLiab,
      isMissingInput,
      missingFields: isMissingInput ? ['FX_RESERVES'] : [],
      boundaryBuffer: {
        value: bufferVal,
        multiplier: bufferMultiplier,
        formula: `${bufferMultiplier}x FX Reserves`,
        status: bufferStatus,
        isUnavailable: isMissingInput
      }
    };
  });

  // A5: Strictly defined universe coverage
  const reservesCoveragePct = totalCount > 0 ? parseFloat(((validReservesCount / totalCount) * 100).toFixed(1)) : 0;
  const liabFullCoveragePct = totalCount > 0 ? parseFloat(((validLiabFullCount / totalCount) * 100).toFixed(1)) : 0;

  return {
    countryInputs,
    totalJurisdictions: totalCount,
    validReservesCount,
    observedReservesCount,
    observedZeroReservesCount,
    assumedZeroReservesCount,
    missingReservesCount,
    reservesCoverageRatio: `${validReservesCount}/${totalCount}`,
    reservesCoveragePct,
    validLiabFullCount,
    liabFullCoverageRatio: `${validLiabFullCount}/${totalCount}`,
    liabFullCoveragePct,
    liabCoverageRatio: `${validLiabFullCount}/${totalCount}`,
    liabCoveragePct: liabFullCoveragePct
  };
}

/**
 * Master Pure Eisenberg-Noe Clearing & Stress Simulation
 */
export function computeClearingScenario({
  dataset,
  quarter,
  currentLinks = null,
  epicenter = 'TR',
  haircutPct = 25,
  bufferMultiplier = 1.5,
  deleveragingMultiplier = 1.5,
  dollarSqueezePct = 12,
  simMode = 'en_clearing',
  enSortMetric = 'incremental',
  allowEstimation = false,
  allowModelProxy = false,
  maxIterations = 100,
  tolerance = 1e-4
}) {
  if (!dataset || !dataset.countries) {
    throw new Error('computeClearingScenario: Invalid dataset provided.');
  }

  const countries = dataset.countries;
  const n = countries.length;
  const rawLinks = currentLinks || (dataset.bilateral_matrix || {})[quarter];
  const quarterMatrixExists = Boolean(currentLinks || (dataset?.bilateral_matrix && dataset.bilateral_matrix[quarter]));

  if (!quarterMatrixExists) {
    return {
      quarter,
      convergenceStatus: 'FAILED',
      allConverged: false,
      allFixedPointsValid: false,
      stopReason: 'MISSING_QUARTER_MATRIX',
      errorMessage: `所选季度 ${quarter} 缺少双边网络矩阵数据，不可按零负债推演`,
      impactList: [],
      missingJurisdictions: countries.map(c => ({ code: c.code, name_zh: c.name_zh, missingFields: ['BILATERAL_MATRIX'], reason: '季度双边矩阵缺失' }))
    };
  }

  // Canonically normalize exposures: deduplicate stable IDs, aggregate tranches, sort canonically
  const normResult = normalizeCorridorExposures(rawLinks || []);
  const links = normResult.normalizedLinks;
  const codeToIndex = Object.fromEntries(countries.map((c, idx) => [c.code, idx]));
  const countryMap = Object.fromEntries(countries.map(c => [c.code, c]));
  const revision = dataset?.datasetRevision ?? 1;

  // A1: Full Canonical Fingerprint
  const dataFingerprint = buildDataFingerprint({
    revision,
    quarter,
    links,
    epicenter,
    haircutPct,
    bufferMultiplier,
    deleveragingMultiplier,
    dollarSqueezePct,
    simMode,
    enSortMetric,
    allowModelProxy
  });

  // A1: Independent Cache Keys
  const baselineCacheKey = buildBaselineCacheKey({
    revision,
    quarter,
    links,
    bufferMultiplier
  });

  const shockCacheKey = buildShockCacheKey({
    revision,
    quarter,
    links,
    epicenter,
    haircutPct,
    bufferMultiplier
  });

  // A2 & A3: Resolve Country Inputs and Provenance
  const {
    countryInputs,
    validReservesCount,
    reservesCoverageRatio,
    reservesCoveragePct,
    validLiabFullCount,
    liabFullCoverageRatio,
    liabFullCoveragePct
  } = resolveCountryInputs({
    dataset,
    quarter,
    currentLinks: links,
    bufferMultiplier,
    allowEstimation,
    allowModelProxy
  });

  // 1. Construct Interbank Cross-Border Obligation Matrix L
  const L = Array.from({ length: n }, () => new Float64Array(n));
  links.forEach(l => {
    const j = codeToIndex[l.source]; // creditor
    const i = codeToIndex[l.target]; // debtor
    if (j !== undefined && i !== undefined) {
      L[j][i] = Number(l.claims_usd_bn) || 0;
    }
  });

  // Nominal cross-border debt pbar[i] of debtor i
  const pbar = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    let sum = 0;
    for (let j = 0; j < n; j++) sum += L[j][i];
    pbar[i] = sum;
  }

  // Relative liabilities Pi[i][j]: proportion of debtor i's payments due to creditor j
  const Pi = Array.from({ length: n }, () => new Float64Array(n));
  for (let i = 0; i < n; i++) {
    if (pbar[i] > 0) {
      for (let j = 0; j < n; j++) {
        Pi[i][j] = L[j][i] / pbar[i];
      }
    }
  }

  // (A) Zero-Shock Baseline: e_i^(0) = bufferMultiplier * FX_reserves (strictly derived)
  const eBaseline = new Float64Array(n);
  const countryCodesList = countries.map(c => c.code);
  for (let i = 0; i < n; i++) {
    const c = countries[i];
    const cInput = countryInputs[c.code];
    eBaseline[i] = cInput ? cInput.boundaryBuffer.value : 0;
  }

  const baselineConvergence = solvePicardFixedPoint({
    pbar,
    Pi,
    eVec: eBaseline,
    maxIterations,
    tolerance,
    codes: countryCodesList
  });

  // (B) Shocked Vector: Epicenter buffer reduced by haircut % on nominal liabilities
  const epiIdx = codeToIndex[epicenter];
  const eShocked = new Float64Array(eBaseline);
  if (epiIdx !== undefined) {
    eShocked[epiIdx] = Math.max(-pbar[epiIdx], eBaseline[epiIdx] - pbar[epiIdx] * (haircutPct / 100));
  }

  const shockConvergence = solvePicardFixedPoint({
    pbar,
    Pi,
    eVec: eShocked,
    maxIterations,
    tolerance,
    codes: countryCodesList
  });

  // A4: Independent Fixed-Point Verification
  const allConverged = baselineConvergence.converged && shockConvergence.converged;
  const allFixedPointsValid = baselineConvergence.verification.fixedPointValid && shockConvergence.verification.fixedPointValid;
  const convergenceStatus = (allConverged && allFixedPointsValid) ? 'CONVERGED' : 'FAILED';

  // Compute clearing shortfalls for every creditor j using exact unrounded Float64 precision
  let totBaseRaw = 0;
  let totShockRaw = 0;
  const enBaselineShortfall = {};
  const enPostShockShortfall = {};
  const enIncrementalShortfall = {};
  const enIncrementalDirect = {};
  const enIncrementalIndirect = {};

  const pBase = baselineConvergence.p;
  const pShock = shockConvergence.p;

  for (let j = 0; j < n; j++) {
    let sumBaseRaw = 0;
    let sumShockRaw = 0;
    let directIncRaw = 0;

    for (let i = 0; i < n; i++) {
      const shortB_i = Math.max(0, pbar[i] - pBase[i]);
      const shortS_i = Math.max(0, pbar[i] - pShock[i]);
      if (shortB_i > 0) sumBaseRaw += Pi[i][j] * shortB_i;
      if (shortS_i > 0) {
        sumShockRaw += Pi[i][j] * shortS_i;
        if (i === epiIdx) {
          const incFromEpi = Pi[i][j] * Math.max(0, pBase[i] - pShock[i]);
          directIncRaw += incFromEpi;
        }
      }
    }

    totBaseRaw += sumBaseRaw;
    totShockRaw += sumShockRaw;

    const deltaRaw = Math.max(0, sumShockRaw - sumBaseRaw);
    const directVal = Math.min(deltaRaw, directIncRaw);
    const indirectVal = Math.max(0, deltaRaw - directVal);

    const code = countries[j].code;
    enBaselineShortfall[code] = {
      raw: sumBaseRaw,
      display: Math.round(sumBaseRaw * 10) / 10
    };
    enPostShockShortfall[code] = {
      raw: sumShockRaw,
      display: Math.round(sumShockRaw * 10) / 10
    };
    enIncrementalShortfall[code] = {
      raw: deltaRaw,
      display: Math.round(deltaRaw * 10) / 10
    };
    enIncrementalDirect[code] = {
      raw: directVal,
      display: Math.round(directVal * 10) / 10
    };
    enIncrementalIndirect[code] = {
      raw: indirectVal,
      display: Math.round(indirectVal * 10) / 10
    };
  }

  // Exact unrounded incremental delta (never back-calculated from rounded totals!)
  const totIncrementalRaw = Math.max(0, totShockRaw - totBaseRaw);
  const epicenterHaircutAmountRaw = epiIdx !== undefined ? pbar[epiIdx] * (haircutPct / 100) : 0;
  const epicenterHaircutAmountDisplay = Math.round(epicenterHaircutAmountRaw * 10) / 10;
  const epicenterLiabRaw = epiIdx !== undefined ? pbar[epiIdx] : 0;
  const epicenterLiabDisplay = Math.round(epicenterLiabRaw * 10) / 10;

  // 2. Multi-Round Behavioral Spillover Simulation
  const directCreditorLinks = links.filter(l => l.target === epicenter);
  
  // Round 1: Direct Losses
  const round1Losses = {};
  let totalR1Loss = 0;
  directCreditorLinks.forEach(l => {
    const loss = Math.round((Number(l.claims_usd_bn) || 0) * (haircutPct / 100));
    round1Losses[l.source] = (round1Losses[l.source] || 0) + loss;
    totalR1Loss += loss;
  });

  // Round 2: Secondary Deleveraging
  const round2Spillovers = {};
  let totalR2Contagion = 0;
  Object.entries(round1Losses).forEach(([creditorCode, r1Loss]) => {
    if (r1Loss > 10) {
      const retrenchmentPool = Math.round(r1Loss * deleveragingMultiplier);
      const otherLoans = links.filter(l => l.source === creditorCode && l.target !== epicenter);
      const totalOtherLoans = otherLoans.reduce((sum, l) => sum + (Number(l.claims_usd_bn) || 0), 0);

      if (totalOtherLoans > 0) {
        otherLoans.forEach(l => {
          const cut = Math.round(retrenchmentPool * ((Number(l.claims_usd_bn) || 0) / totalOtherLoans));
          round2Spillovers[l.target] = (round2Spillovers[l.target] || 0) + cut;
          totalR2Contagion += cut;
        });
      }
    }
  });

  // Round 3: Dollar Refinancing Squeeze
  const round3DollarSqueeze = {};
  let totalR3Dollar = 0;
  let validSpilloverLiabCount = 0;

  countries.forEach(c => {
    if (c.code !== epicenter) {
      const cInput = countryInputs[c.code];
      const actualLiab = cInput?.behavioralLiabilities?.value;

      if (actualLiab !== undefined && actualLiab !== null && !isNaN(actualLiab) && actualLiab > 0) {
        validSpilloverLiabCount++;
        const defaultUsdShare = Number(c.default_usd_share) || 50;
        const dSqueeze = Math.round(actualLiab * (defaultUsdShare / 100) * (dollarSqueezePct / 100));
        round3DollarSqueeze[c.code] = dSqueeze;
        totalR3Dollar += dSqueeze;
      } else {
        round3DollarSqueeze[c.code] = null; // Marked as NA when missing
      }
    }
  });

  // A5: Spillover Universe (22 countries excluding epicenter)
  const spilloverUniverseCount = Math.max(1, n - 1);
  const spilloverLiabCoverageRatio = `${validSpilloverLiabCount}/${spilloverUniverseCount}`;
  const spilloverLiabCoveragePct = parseFloat(((validSpilloverLiabCount / spilloverUniverseCount) * 100).toFixed(1));

  // Compile Comprehensive Impact Ranking
  const impactList = countries
    .filter(c => c.code !== epicenter)
    .map(c => {
      const r1 = round1Losses[c.code] || 0;
      const r2 = round2Spillovers[c.code] || 0;
      const r3 = round3DollarSqueeze[c.code] !== null ? (round3DollarSqueeze[c.code] || 0) : null;
      const totalImpact = r1 + r2 + (r3 !== null ? r3 : 0);

      const bObj = enBaselineShortfall[c.code] || { raw: 0, display: 0 };
      const sObj = enPostShockShortfall[c.code] || { raw: 0, display: 0 };
      const incObj = enIncrementalShortfall[c.code] || { raw: 0, display: 0 };
      const incDirObj = enIncrementalDirect[c.code] || { raw: 0, display: 0 };
      const incIndirObj = enIncrementalIndirect[c.code] || { raw: 0, display: 0 };

      const cInput = countryInputs[c.code];
      const resObj = cInput?.reserves;
      const reserves = resObj?.value;

      // A2: Dependent Ratios Zero/Null Handling
      let impactToReservesPct = 'NA';
      let enIncrementalToReservesPct = 'NA';
      let enBaselineToReservesPct = 'NA';
      let enPostShockToReservesPct = 'NA';

      if (resObj && !resObj.isMissing) {
        if (resObj.isExplicitZero || reserves === 0) {
          impactToReservesPct = 'N/A (外储为零)';
          enIncrementalToReservesPct = 'N/A (外储为零)';
          enBaselineToReservesPct = 'N/A (外储为零)';
          enPostShockToReservesPct = 'N/A (外储为零)';
        } else if (reserves > 0) {
          impactToReservesPct = parseFloat(((totalImpact / reserves) * 100).toFixed(1));
          enIncrementalToReservesPct = parseFloat(((incObj.raw / reserves) * 100).toFixed(1));
          enBaselineToReservesPct = parseFloat(((bObj.raw / reserves) * 100).toFixed(1));
          enPostShockToReservesPct = parseFloat(((sObj.raw / reserves) * 100).toFixed(1));
        }
      }

      const isMissingInput = Boolean(cInput?.isMissingInput);

      return {
        code: c.code,
        name: c.name,
        name_zh: c.name_zh,
        region: c.region,
        tier: c.tier,
        reserves,
        reservesStatus: resObj?.status || 'MISSING',
        reservesSource: resObj?.source || 'NONE_MISSING',
        reservesCategory: resObj?.category || 'MISSING',
        isExplicitZeroReserves: resObj?.isExplicitZero || false,
        isScenarioAssumedReserves: resObj?.isScenarioAssumed || false,
        isMissingInput,
        rankingEligible: !isMissingInput,
        r1Loss: r1,
        r2Spillover: r2,
        r3Dollar: r3,
        totalImpact,
        impactToReservesPct: isMissingInput ? 'NA' : impactToReservesPct,
        enBaselineShortfallRaw: isMissingInput ? null : bObj.raw,
        enBaselineShortfall: isMissingInput ? 'NA' : bObj.display,
        enPostShockShortfallRaw: isMissingInput ? null : sObj.raw,
        enPostShockShortfall: isMissingInput ? 'NA' : sObj.display,
        enIncrementalShortfallRaw: isMissingInput ? null : incObj.raw,
        enIncrementalShortfall: isMissingInput ? 'NA' : incObj.display,
        enIncrementalDirect: isMissingInput ? 'NA' : incDirObj.display,
        enIncrementalIndirect: isMissingInput ? 'NA' : incIndirObj.display,
        enIncrementalToReservesPct: isMissingInput ? 'NA' : enIncrementalToReservesPct,
        enBaselineToReservesPct: isMissingInput ? 'NA' : enBaselineToReservesPct,
        enPostShockToReservesPct: isMissingInput ? 'NA' : enPostShockToReservesPct,
        primaryMetricValue: isMissingInput ? -1 : (simMode === 'en_clearing'
          ? (enSortMetric === 'incremental' ? incObj.raw : (enSortMetric === 'baseline' ? bObj.raw : sObj.raw))
          : totalImpact)
      };
    })
    .filter(item => {
      if (item.isMissingInput) return true; // keep missing input in list to display NA and provenance
      if (simMode === 'en_clearing') {
        if (enSortMetric === 'incremental') return item.enIncrementalShortfallRaw > 0 || item.enPostShockShortfallRaw > 0;
        if (enSortMetric === 'baseline') return item.enBaselineShortfallRaw > 0;
        return item.enPostShockShortfallRaw > 0;
      }
      return item.totalImpact > 0;
    })
    .sort((a, b) => {
      // Missing inputs sink to the bottom
      if (a.isMissingInput && !b.isMissingInput) return 1;
      if (!a.isMissingInput && b.isMissingInput) return -1;
      if (simMode === 'en_clearing') {
        if (enSortMetric === 'incremental') return (b.enIncrementalShortfallRaw || 0) - (a.enIncrementalShortfallRaw || 0);
        if (enSortMetric === 'baseline') return (b.enBaselineShortfallRaw || 0) - (a.enBaselineShortfallRaw || 0);
        return (b.enPostShockShortfallRaw || 0) - (a.enPostShockShortfallRaw || 0);
      }
      return (b.totalImpact || 0) - (a.totalImpact || 0);
    });

  // Top incremental victim (only if delta > 0 and rankingEligible)
  const eligibleVictims = impactList.filter(item => item.rankingEligible && (item.enIncrementalShortfallRaw || 0) > 0);
  const topVictim = (eligibleVictims.length > 0) ? eligibleVictims[0] : null;

  // Track any jurisdictions with missing inputs
  const missingJurisdictions = countries
    .filter(c => countryInputs[c.code]?.isMissingInput)
    .map(c => ({
      code: c.code,
      name_zh: c.name_zh,
      missingFields: countryInputs[c.code]?.missingFields || ['FX_RESERVES'],
      reason: '基础数据未填报或不可用，已隔离不参与受害者排名'
    }));

  // Structural Mismatch Samples (US, GB, KY dynamically resolved with complete provenance trace)
  const structuralSamples = ['US', 'GB', 'KY'].map(code => {
    const idx = codeToIndex[code];
    const liab = idx !== undefined ? pbar[idx] : null;
    const cMeta = countryMap[code];
    const cInput = countryInputs[code];
    const res = cInput?.reserves?.value ?? null;
    return {
      code,
      name: cMeta?.name_zh || code,
      quarter,
      liabilitiesBn: liab !== null ? Math.round(liab * 10) / 10 : null,
      liabilitiesTrillion: liab !== null ? (liab / 1000).toFixed(2) : null,
      liabilitiesSource: 'BILATERAL_MATRIX_SUM',
      reservesBn: res,
      reservesSource: cInput?.reserves?.source || 'NONE_MISSING',
      reservesStatus: cInput?.reserves?.status || 'MISSING',
      bufferMultiplier,
      bufferBn: cInput?.boundaryBuffer?.value ?? 0
    };
  });

  const quarterStatus = quarter <= '2026Q1' ? 'OFFICIAL' : (quarter === '2026Q2' ? 'PENDING_VERIFICATION' : 'NOWCAST_SCENARIO');
  const runType = haircutPct > 0 ? 'STRESS_SCENARIO' : 'BASELINE_CLEARING';
  const runStatusLabel = haircutPct > 0 
    ? `外生冲击压力清算情景 (基于 ${quarter} 矩阵，震中 ${countryMap[epicenter]?.name_zh || epicenter} 减记 ${haircutPct}%)` 
    : `${quarter} 网络基准出清 (${quarterStatus === 'OFFICIAL' ? '官方核准' : (quarterStatus === 'PENDING_VERIFICATION' ? '待核实估算' : '情景推演')})`;
  const epicenterCountry = countryMap[epicenter] || countries[0];

  const currentRun = {
    runId: `${quarter}-${epicenter}-${haircutPct}-${bufferMultiplier}-${revision}-${Date.now()}`,
    dataFingerprint,
    baselineCacheKey,
    shockCacheKey,
    datasetRevision: revision,
    quarter,
    quarterStatus,
    runType,
    runStatusLabel,
    epicenterCode: epicenter,
    epicenterNameZh: epicenterCountry.name_zh,
    epicenterLiabRaw,
    epicenterLiabDisplay,
    haircutPct,
    bufferMultiplier,
    epicenterHaircutAmountRaw,
    epicenterHaircutAmountDisplay,
    baselineTotalRaw: totBaseRaw,
    postShockTotalRaw: totShockRaw,
    incrementalTotalRaw: totIncrementalRaw,
    baselineTotalDisplay: Math.round(totBaseRaw * 10) / 10,
    postShockTotalDisplay: Math.round(totShockRaw * 10) / 10,
    incrementalTotalDisplay: Math.round(totIncrementalRaw * 10) / 10,
    convergenceStatus,
    stopReason: shockConvergence.stopReason || 'TOLERANCE_MET',
    allConverged,
    allFixedPointsValid,
    baselineConvergence,
    shockConvergence,
    validLiabCoverage: spilloverLiabCoverageRatio,
    validReservesCoverage: reservesCoverageRatio,
    missingJurisdictions,
    isPartiallyIncomplete: missingJurisdictions.length > 0,
    corridorNormalizationMeta: {
      rawCount: normResult.rawCount,
      validExposuresCount: normResult.validExposuresCount,
      aggregatedCount: normResult.aggregatedCount,
      conflicts: normResult.conflicts
    },
    coverageMeta: {
      totalJurisdictions: n,
      validReservesCount,
      reservesCoverageRatio,
      reservesCoveragePct,
      validLiabFullCount,
      liabFullCoverageRatio,
      liabFullCoveragePct,
      spilloverUniverseCount,
      validSpilloverLiabCount,
      spilloverLiabCoverageRatio,
      spilloverLiabCoveragePct
    },
    topVictim: topVictim ? {
      code: topVictim.code,
      name_zh: topVictim.name_zh,
      incrementalRaw: topVictim.enIncrementalShortfallRaw,
      incrementalDisplay: topVictim.enIncrementalShortfall,
      incrementalFormatted: `+$${topVictim.enIncrementalShortfall}B (+${Math.round(topVictim.enIncrementalShortfall * 10).toLocaleString()} 亿美元)`
    } : null,
    structuralSamples,
    versionMeta: {
      productVersion: CLEARING_VERSION_REGISTRY.PRODUCT,
      modelVersion: CLEARING_VERSION_REGISTRY.MODEL,
      dataVersion: CLEARING_VERSION_REGISTRY.DATA(quarter)
    }
  };

  return {
    modelVersion: CLEARING_VERSION_REGISTRY.MODEL,
    versionMeta: currentRun.versionMeta,
    currentRun,
    quarter,
    quarterStatus,
    runType,
    runStatusLabel,
    dataFingerprint,
    baselineCacheKey,
    shockCacheKey,
    datasetRevision: revision,
    epicenterCode: epicenter,
    simMode,
    enSortMetric,
    haircutPct,
    bufferMultiplier,
    deleveragingMultiplier,
    dollarSqueezePct,
    convergenceStatus,
    stopReason: shockConvergence.stopReason || 'TOLERANCE_MET',
    allConverged,
    allFixedPointsValid,
    baselineConvergence,
    shockConvergence,
    iterationsCount: shockConvergence.iterCount,
    clearingResidual: shockConvergence.verification.maxAbsResidual,
    epicenterHaircutAmount: epicenterHaircutAmountDisplay,
    epicenterLiab: epicenterLiabDisplay,
    totalBaselineShortfall: currentRun.baselineTotalDisplay,
    totalPostShockShortfall: currentRun.postShockTotalDisplay,
    totalIncrementalShortfall: currentRun.incrementalTotalDisplay,
    totalBaselineRaw: totBaseRaw,
    totalPostShockRaw: totShockRaw,
    totalIncrementalRaw: totIncrementalRaw,
    totalR1Loss,
    totalR2Contagion,
    totalR3Dollar,
    totalSystemicLoss: totalR1Loss + totalR2Contagion + totalR3Dollar,
    validLiabCoverage: currentRun.validLiabCoverage,
    validReservesCoverage: currentRun.validReservesCoverage,
    coverageMeta: currentRun.coverageMeta,
    missingJurisdictions,
    isPartiallyIncomplete: missingJurisdictions.length > 0,
    corridorNormalizationMeta: currentRun.corridorNormalizationMeta,
    countryDataProvenance: countryInputs,
    impactList
  };
}

/**
 * P0 / Next Stage Feature: Capital Network Stress-Testing Workbench Pure Analysis
 * 
 * Compares network response across multiple liquidity buffer regimes:
 * - 1.0x FX reserves (constrained liquidity buffer)
 * - 1.5x FX reserves (baseline prudent buffer)
 * - 2.0x FX reserves (abundant liquidity buffer)
 * 
 * Computes:
 * - Scenario Sensitivity Range (情景敏感性范围): min to max delta shortfall across regimes
 * - Victim Ranking Stability Index: consistency of top victim rankings across buffer assumptions
 * - Contagion Transmission Path Decomposition: Direct interbank exposure vs Indirect cascading contagion
 */
export function computeStressWorkbenchAnalysis({
  dataset,
  quarter,
  epicenter = 'TR',
  haircutPct = 25,
  bufferRegimes = [1.0, 1.5, 2.0],
  allowModelProxy = false,
  currentLinks = null
}) {
  if (!dataset || !dataset.countries) {
    throw new Error('computeStressWorkbenchAnalysis: Invalid dataset provided.');
  }

  const regimeResults = {};
  const regimeIncrementalTotals = {};

  bufferRegimes.forEach(buf => {
    const res = computeClearingScenario({
      dataset,
      quarter,
      currentLinks,
      epicenter,
      haircutPct,
      bufferMultiplier: buf,
      allowModelProxy
    });
    regimeResults[buf] = res;
    regimeIncrementalTotals[buf] = res.totalIncrementalRaw;
  });

  const rawTotals = Object.values(regimeIncrementalTotals);
  const minIncrementalRaw = Math.min(...rawTotals);
  const maxIncrementalRaw = Math.max(...rawTotals);
  const sensitivitySpreadRaw = maxIncrementalRaw - minIncrementalRaw;
  const spreadPct = minIncrementalRaw > 0 ? parseFloat(((sensitivitySpreadRaw / minIncrementalRaw) * 100).toFixed(2)) : 0;

  // Baseline 1.5x reference result
  const ref15 = regimeResults[1.5] || regimeResults[bufferRegimes[0]];

  // Rank Stability Calculation: Compare rankings between min buffer (1.0x) and max buffer (2.0x)
  // Excludes zero-increment countries: only jurisdictions with meaningful positive incremental shortfall participate in top victim stability
  const resMinBuf = regimeResults[Math.min(...bufferRegimes)];
  const resMaxBuf = regimeResults[Math.max(...bufferRegimes)];

  const minList = (resMinBuf?.impactList || []).filter(i => i.rankingEligible && (i.enIncrementalShortfallRaw || 0) > 1e-4);
  const maxList = (resMaxBuf?.impactList || []).filter(i => i.rankingEligible && (i.enIncrementalShortfallRaw || 0) > 1e-4);

  const top3MinList = minList.slice(0, 3).map(i => i.code);
  const top3MaxList = maxList.slice(0, 3).map(i => i.code);
  const top3Min = new Set(top3MinList);
  const top3Max = new Set(top3MaxList);
  let top3OverlapCount = 0;
  top3Min.forEach(c => { if (top3Max.has(c)) top3OverlapCount++; });
  const compareBaseCount = Math.max(1, Math.min(3, Math.min(top3MinList.length, top3MaxList.length)));
  const top3StabilityPct = Math.round((top3OverlapCount / compareBaseCount) * 100);

  // Transmission Path Decomposition from reference run
  let totalDirectRaw = 0;
  let totalIndirectRaw = 0;
  (ref15?.impactList || []).forEach(item => {
    if (item.rankingEligible) {
      totalDirectRaw += item.enIncrementalDirect || 0;
      totalIndirectRaw += item.enIncrementalIndirect || 0;
    }
  });

  const directSharePct = ref15?.totalIncrementalShortfall > 0 
    ? parseFloat(((totalDirectRaw / ref15.totalIncrementalShortfall) * 100).toFixed(1)) 
    : 0;
  const indirectSharePct = ref15?.totalIncrementalShortfall > 0 
    ? parseFloat(((totalIndirectRaw / ref15.totalIncrementalShortfall) * 100).toFixed(1)) 
    : 0;

  // Compile Jurisdiction Comparison Matrix
  const jurisdictionComparison = dataset.countries
    .filter(c => c.code !== epicenter)
    .map(c => {
      const code = c.code;
      const d10 = regimeResults[1.0]?.currentRun ? (regimeResults[1.0].impactList.find(i => i.code === code)?.enIncrementalShortfall ?? 'NA') : 'NA';
      const d15 = regimeResults[1.5]?.currentRun ? (regimeResults[1.5].impactList.find(i => i.code === code)?.enIncrementalShortfall ?? 'NA') : 'NA';
      const d20 = regimeResults[2.0]?.currentRun ? (regimeResults[2.0].impactList.find(i => i.code === code)?.enIncrementalShortfall ?? 'NA') : 'NA';
      const refItem = ref15?.impactList.find(i => i.code === code);

      return {
        code,
        name: c.name,
        name_zh: c.name_zh,
        region: c.region,
        tier: c.tier,
        delta10: d10,
        delta15: d15,
        delta20: d20,
        directLoss: refItem?.enIncrementalDirect ?? 'NA',
        indirectLoss: refItem?.enIncrementalIndirect ?? 'NA',
        rankingEligible: refItem?.rankingEligible ?? true,
        reservesStatus: refItem?.reservesStatus ?? 'UNKNOWN'
      };
    })
    .sort((a, b) => {
      const vA = typeof a.delta15 === 'number' ? a.delta15 : -1;
      const vB = typeof b.delta15 === 'number' ? b.delta15 : -1;
      return vB - vA;
    });

  return {
    quarter,
    epicenter,
    haircutPct,
    bufferRegimes,
    regimeResults,
    sensitivityRange: {
      minIncrementalRaw,
      maxIncrementalRaw,
      minIncrementalDisplay: Math.round(minIncrementalRaw * 10) / 10,
      maxIncrementalDisplay: Math.round(maxIncrementalRaw * 10) / 10,
      spreadRaw: sensitivitySpreadRaw,
      spreadDisplay: Math.round(sensitivitySpreadRaw * 10) / 10,
      spreadPct,
      rangeLabel: `$${(minIncrementalRaw).toFixed(1)}B ~ $${(maxIncrementalRaw).toFixed(1)}B`,
      disclaimer: '情景敏感性范围（Scenario Sensitivity Range）系基于不同流动性缓冲乘数（1.0x ~ 2.0x 外储）计算之模型边际短缺响应边界，绝非统计置信区间，亦非现实已发生经济损失。'
    },
    rankingStability: {
      top3OverlapCount,
      top3StabilityPct,
      summary: `Top 3 核心受害者跨缓冲情景重合度为 ${top3StabilityPct}%`
    },
    transmissionDecomposition: {
      totalIncremental: ref15?.totalIncrementalShortfall ?? 0,
      totalDirectDisplay: Math.round(totalDirectRaw * 10) / 10,
      totalIndirectDisplay: Math.round(totalIndirectRaw * 10) / 10,
      directSharePct,
      indirectSharePct
    },
    jurisdictionComparison
  };
}
