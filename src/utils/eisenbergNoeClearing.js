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
  PRODUCT: 'v2.4.0',
  MODEL: 'v2.2-DualBaseline-EN2001',
  DATA: (quarter) => {
    if (quarter <= '2026Q1') return 'BIS-SDMX-Official';
    if (quarter === '2026Q2') return 'BIS-Pending-Release (2026-10-30)';
    return 'Macro-NOWCAST-Scenario';
  }
};

/**
 * A1: Canonical Matrix Content Digest
 * Sorts links canonically by source and target and computes dual-word 64-bit hash
 * on raw unrounded values, distinguishing null, undefined, explicit zero, and positive claims.
 */
export function computeCanonicalMatrixDigest(links = []) {
  if (!links || links.length === 0) return 'EMPTY_MATRIX';

  const sorted = [...links].sort((a, b) => {
    const sComp = String(a.source).localeCompare(String(b.source));
    if (sComp !== 0) return sComp;
    return String(a.target).localeCompare(String(b.target));
  });

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
  allowEstimation = false
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

  if (qRecord && qRecord.fx_reserves_bn !== undefined && qRecord.fx_reserves_bn !== null) {
    const rawVal = qRecord.fx_reserves_bn;

    if (typeof rawVal !== 'number' || isNaN(rawVal) || !isFinite(rawVal) || rawVal < 0) {
      return {
        ...meta,
        status: 'INVALID_NUMERIC',
        value: null,
        isExplicitZero: false,
        isMissing: true,
        source: 'BIS_CBS_TABLE_B',
        explanation: '外汇储备记录存在非有限或非法数值'
      };
    }

    if (rawVal === 0) {
      return {
        ...meta,
        status: 'EXPLICIT_ZERO',
        value: 0,
        isExplicitZero: true,
        isMissing: false,
        source: 'BIS_CBS_TABLE_B',
        explanation: '官方统计明确记录外汇储备为 0.00'
      };
    }

    return {
      ...meta,
      status: qRecord.is_nowcast ? 'NOWCAST' : (quarter <= '2026Q1' ? 'OFFICIAL' : (quarter === '2026Q2' ? 'PENDING_VERIFICATION' : 'NOWCAST')),
      value: rawVal,
      isExplicitZero: false,
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
        status: 'ESTIMATED_ZERO',
        value: 0,
        isExplicitZero: true,
        isMissing: false,
        source: 'COUNTRY_METADATA_ESTIMATED',
        explanation: '静态元数据插补明确零'
      };
    }
    return {
      ...meta,
      status: 'ESTIMATED_STATIC_FALLBACK',
      value: staticVal,
      isExplicitZero: false,
      isMissing: false,
      source: 'COUNTRY_METADATA_ESTIMATED',
      explanation: '用户显式授权采用历史元数据常数估算'
    };
  }

  // Definite missing
  return {
    ...meta,
    status: 'MISSING',
    value: null,
    isExplicitZero: false,
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
  const links = matrixLinks || (dataset?.bilateral_matrix || {})[quarter] || [];

  const qLbs = (lbsData[countryCode] || []).find(q => q.quarter === quarter);
  const qCbs = (cbsRisk[countryCode] || []).find(q => q.quarter === quarter);

  const matrixSum = links
    .filter(l => l.target === countryCode)
    .reduce((sum, l) => sum + (Number(l.claims_usd_bn) || 0), 0);

  const baseResult = {
    jurisdiction: countryCode,
    period: quarter,
    unit: 'USD_BN',
    availableSources: {
      lbsResidence: qLbs?.liabilities_usd_bn ?? null,
      cbsUltimateRisk: qCbs?.cross_border_borrowings_bn ?? null,
      bilateralMatrixSum: matrixSum
    }
  };

  // 1. Bilateral Matrix Perimeter Column Sum
  if (requiredBasis === 'BILATERAL_MATRIX_PERIMETER') {
    return {
      ...baseResult,
      value: matrixSum,
      source: 'BILATERAL_MATRIX_SUM',
      statisticalBasis: '23国银行间闭合有向网络列和 (Inward Cross-Border Obligations)',
      isFallback: false,
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
        fallbackReason: null,
        status: qLbs.is_nowcast ? 'NOWCAST' : (quarter <= '2026Q1' ? 'OFFICIAL' : (quarter === '2026Q2' ? 'PENDING_VERIFICATION' : 'NOWCAST'))
      };
    }

    if (allowModelProxy) {
      return {
        ...baseResult,
        value: matrixSum,
        source: 'BILATERAL_MATRIX_SUM_PROXY',
        statisticalBasis: '23国闭合网络列和代理 (Model Proxy)',
        isFallback: true,
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
        fallbackReason: null,
        status: qCbs.is_nowcast ? 'NOWCAST' : (quarter <= '2026Q1' ? 'OFFICIAL' : (quarter === '2026Q2' ? 'PENDING_VERIFICATION' : 'NOWCAST'))
      };
    }

    if (allowModelProxy) {
      return {
        ...baseResult,
        value: matrixSum,
        source: 'BILATERAL_MATRIX_SUM_PROXY',
        statisticalBasis: '23国闭合网络列和代理 (Model Proxy)',
        isFallback: true,
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
  pbar,
  Pi,
  eVec,
  pCandidate,
  absTolerance = 1e-4,
  relTolerance = 1e-5
}) {
  const n = pbar.length;
  let maxAbsResidual = 0;
  let maxScaledResidual = 0;
  let worstNodeIndex = -1;
  let worstNodeResidual = 0;
  let boundsValid = true;
  const boundsViolations = [];

  for (let i = 0; i < n; i++) {
    const pi = pCandidate[i];
    const pb = pbar[i];

    // 1. Numerical legality & bounds check: 0 <= p_i <= pbar_i
    if (typeof pi !== 'number' || isNaN(pi) || !isFinite(pi)) {
      boundsValid = false;
      boundsViolations.push({ index: i, p: pi, pbar: pb, error: 'NON_FINITE_PAYMENT' });
      continue;
    }

    if (pb <= 0) {
      if (Math.abs(pi) > absTolerance) {
        boundsValid = false;
        boundsViolations.push({ index: i, p: pi, pbar: pb, error: 'NON_ZERO_PAYMENT_FOR_ZERO_DEBT' });
      }
    } else {
      if (pi < -absTolerance || pi > pb + absTolerance) {
        boundsValid = false;
        boundsViolations.push({ index: i, p: pi, pbar: pb, error: 'PAYMENT_EXCEEDS_BOUNDS' });
      }
    }

    // 2. Independent evaluation of Clearing Operator Phi_i(p)
    let inflows = 0;
    for (let j = 0; j < n; j++) {
      inflows += Pi[j][i] * pCandidate[j];
    }

    const available = Math.max(0, inflows + eVec[i]);
    const phi_i = pb > 0 ? Math.min(pb, available) : 0;

    // Independent residual r_i = p_i - Phi_i(p)
    const ri = Math.abs(pi - phi_i);
    const scale = Math.max(1.0, pb);
    const scaled_ri = ri / scale;

    if (ri > maxAbsResidual) {
      maxAbsResidual = ri;
      worstNodeIndex = i;
      worstNodeResidual = ri;
    }
    if (scaled_ri > maxScaledResidual) {
      maxScaledResidual = scaled_ri;
    }
  }

  // Combined absolute and relative tolerance threshold
  const worstNodePbar = worstNodeIndex >= 0 ? pbar[worstNodeIndex] : 0;
  const allowableTol = absTolerance + relTolerance * worstNodePbar;
  const fixedPointValid = boundsValid && maxAbsResidual <= allowableTol;

  return {
    fixedPointValid,
    maxAbsResidual,
    maxScaledResidual,
    worstNodeIndex,
    worstNodeResidual,
    boundsValid,
    boundsViolations,
    absTolerance,
    relTolerance,
    verificationSummary: fixedPointValid
      ? `固定点独立残差通过检验 (最大残差: ${maxAbsResidual < 1e-6 ? '<1e-6' : maxAbsResidual.toFixed(8)} B, 缩放残差: ${maxScaledResidual.toExponential(2)})`
      : `固定点残差超标或越界 (最大残差: ${maxAbsResidual.toFixed(6)} B > 允许容差 ${allowableTol.toFixed(6)} B)`
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
  tolerance = 1e-4
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
    pbar,
    Pi,
    eVec,
    pCandidate: p,
    absTolerance: tolerance,
    relTolerance: 1e-5
  });

  return {
    p,
    iterCount,
    residual: finalLoopDiff,
    finalLoopDiff,
    iterationConverged,
    maxIterations,
    tolerance,
    verification,
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
  allowModelProxy = false
}) {
  const countries = dataset.countries || [];
  const totalCount = countries.length;

  const countryInputs = {};
  let validReservesCount = 0;
  let validLiabFullCount = 0;

  // Pre-calculate bilateral matrix obligations for all targets
  const matrixLiabMap = {};
  currentLinks.forEach(l => {
    matrixLiabMap[l.target] = (matrixLiabMap[l.target] || 0) + (Number(l.claims_usd_bn) || 0);
  });

  countries.forEach(c => {
    // 1. Reserves via A2 centralized resolver
    const reservesInfo = resolveCountryReserves({
      dataset,
      country: c,
      quarter,
      allowEstimation
    });

    if (!reservesInfo.isMissing && reservesInfo.value !== null) {
      validReservesCount++;
    }

    // 2. Clearing liabilities (Matrix sum)
    const clearingLiab = resolveJurisdictionLiability({
      dataset,
      countryCode: c.code,
      quarter,
      requiredBasis: 'BILATERAL_MATRIX_PERIMETER',
      allowModelProxy: true,
      matrixLinks: currentLinks
    });

    // 3. Behavioral liabilities (LBS Residence basis with explicit proxy rule)
    const behLiab = resolveJurisdictionLiability({
      dataset,
      countryCode: c.code,
      quarter,
      requiredBasis: 'LBS_RESIDENCE',
      allowModelProxy,
      matrixLinks: currentLinks
    });

    if (behLiab.value !== null && !isNaN(behLiab.value)) {
      validLiabFullCount++;
    }

    // 4. Boundary Liquidity Buffer e_i
    let bufferVal = 0;
    let bufferStatus = 'BUFFER_AVAILABLE';
    if (reservesInfo.isMissing) {
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
      boundaryBuffer: {
        value: bufferVal,
        multiplier: bufferMultiplier,
        formula: `${bufferMultiplier}x FX Reserves`,
        status: bufferStatus,
        isUnavailable: reservesInfo.isMissing
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
  const links = currentLinks || (dataset.bilateral_matrix || {})[quarter] || [];
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
    tolerance
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
    tolerance
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

      return {
        code: c.code,
        name: c.name,
        name_zh: c.name_zh,
        region: c.region,
        tier: c.tier,
        reserves,
        reservesStatus: resObj?.status || 'MISSING',
        reservesSource: resObj?.source || 'NONE_MISSING',
        isExplicitZeroReserves: resObj?.isExplicitZero || false,
        r1Loss: r1,
        r2Spillover: r2,
        r3Dollar: r3,
        totalImpact,
        impactToReservesPct,
        enBaselineShortfallRaw: bObj.raw,
        enBaselineShortfall: bObj.display,
        enPostShockShortfallRaw: sObj.raw,
        enPostShockShortfall: sObj.display,
        enIncrementalShortfallRaw: incObj.raw,
        enIncrementalShortfall: incObj.display,
        enIncrementalDirect: incDirObj.display,
        enIncrementalIndirect: incIndirObj.display,
        enIncrementalToReservesPct,
        enBaselineToReservesPct,
        enPostShockToReservesPct,
        primaryMetricValue: simMode === 'en_clearing'
          ? (enSortMetric === 'incremental' ? incObj.raw : (enSortMetric === 'baseline' ? bObj.raw : sObj.raw))
          : totalImpact
      };
    })
    .filter(item => {
      if (simMode === 'en_clearing') {
        if (enSortMetric === 'incremental') return item.enIncrementalShortfallRaw > 0 || item.enPostShockShortfallRaw > 0;
        if (enSortMetric === 'baseline') return item.enBaselineShortfallRaw > 0;
        return item.enPostShockShortfallRaw > 0;
      }
      return item.totalImpact > 0;
    })
    .sort((a, b) => {
      if (simMode === 'en_clearing') {
        if (enSortMetric === 'incremental') return b.enIncrementalShortfallRaw - a.enIncrementalShortfallRaw;
        if (enSortMetric === 'baseline') return b.enBaselineShortfallRaw - a.enBaselineShortfallRaw;
        return b.enPostShockShortfallRaw - a.enPostShockShortfallRaw;
      }
      return b.totalImpact - a.totalImpact;
    });

  // Top incremental victim (only if delta > 0)
  const topVictim = (impactList.length > 0 && impactList[0].enIncrementalShortfallRaw > 0) ? impactList[0] : null;

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
  const epicenterCountry = countryMap[epicenter] || countries[0];

  const currentRun = {
    runId: `${quarter}-${epicenter}-${haircutPct}-${bufferMultiplier}-${revision}-${Date.now()}`,
    dataFingerprint,
    baselineCacheKey,
    shockCacheKey,
    datasetRevision: revision,
    quarter,
    quarterStatus,
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
    allConverged,
    allFixedPointsValid,
    baselineConvergence,
    shockConvergence,
    validLiabCoverage: spilloverLiabCoverageRatio,
    validReservesCoverage: reservesCoverageRatio,
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
    countryDataProvenance: countryInputs,
    impactList
  };
}
