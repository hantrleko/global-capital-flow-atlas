/**
 * Eisenberg-Noe (2001) Systemic Risk Clearing Engine & Multi-Round Stress Cascade
 * 
 * Mathematical Formulation:
 * Eisenberg, L., & Noe, T. H. (2001). Systemic Risk in Financial Systems.
 * Management Science, 47(2), 236-249.
 * 
 * Model Specifications:
 * - Dual-Baseline: S^(0) (zero-shock baseline) and S* (post-shock clearing shortfall)
 * - Marginal Incremental Shock Loss: ΔS = max(0, S* - S^(0)) computed in unrounded Float64 precision
 * - Fixed point: p* = min(pbar, Pi^T * p + e) solved via Picard iteration with convergence validation
 * - Dynamic data provenance: quarterly FX reserves (CBS Risk Table B) and liabilities (LBS Table A / Matrix Sum)
 * - Deterministic data fingerprinting and stale execution race prevention
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
 * Deterministic fingerprint of dataset slice and simulation inputs
 */
export function buildDataFingerprint({
  quarter,
  links = [],
  epicenter = '',
  haircutPct = 0,
  bufferMultiplier = 1.5,
  deleveragingMultiplier = 1.5,
  dollarSqueezePct = 12,
  simMode = 'en_clearing',
  enSortMetric = 'incremental'
}) {
  const linkCount = links.length;
  const linkSum = links.reduce((acc, l) => acc + (Number(l.claims_usd_bn) || 0), 0);
  const head = links[0] ? `${links[0].source}->${links[0].target}:${links[0].claims_usd_bn}` : 'empty';
  const tail = links[links.length - 1] ? `${links[links.length - 1].source}->${links[links.length - 1].target}:${links[links.length - 1].claims_usd_bn}` : 'empty';
  return `Q:${quarter}_N:${linkCount}_S:${linkSum.toFixed(2)}_H:${head}_T:${tail}_EPI:${epicenter}_HC:${haircutPct}_BUF:${bufferMultiplier}_DEL:${deleveragingMultiplier}_DSQ:${dollarSqueezePct}_M:${simMode}_SM:${enSortMetric}`;
}

/**
 * Pure Picard Fixed-Point Solver for Eisenberg-Noe Clearing Vectors
 * Returns independent residual, iteration count, and strict convergence flag.
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
  let finalResidual = 0;

  for (let iter = 0; iter < maxIterations; iter++) {
    iterCount = iter + 1;
    const pNext = new Float64Array(n);
    let diff = 0;

    for (let i = 0; i < n; i++) {
      let inflows = 0;
      for (let j = 0; j < n; j++) {
        inflows += Pi[j][i] * p[j];
      }
      const available = Math.max(0, inflows + eVec[i]);
      pNext[i] = Math.min(pbar[i], available);
      diff = Math.max(diff, Math.abs(pNext[i] - p[i]));
    }

    p = pNext;
    finalResidual = diff;
    if (diff < tolerance) {
      break;
    }
  }

  const converged = finalResidual < tolerance;

  return {
    p,
    iterCount,
    residual: finalResidual,
    converged,
    maxIterations,
    tolerance
  };
}

/**
 * Resolve quarterly reserves, liabilities, and data provenance for all countries
 */
export function resolveCountryInputs({
  dataset,
  quarter,
  currentLinks = [],
  bufferMultiplier = 1.5
}) {
  const countries = dataset.countries || [];
  const cbsRisk = dataset.cbs_risk || {};
  const lbsData = dataset.lbs_data || {};
  const isHistorical = quarter <= '2026Q1';
  const isPending = quarter === '2026Q2';
  const quarterDefaultStatus = isHistorical ? 'OFFICIAL' : (isPending ? 'PENDING_VERIFICATION' : 'NOWCAST');

  const countryInputs = {};
  let validReservesCount = 0;
  let validLiabCount = 0;

  // Pre-calculate bilateral matrix obligations for all targets
  const matrixLiabMap = {};
  currentLinks.forEach(l => {
    matrixLiabMap[l.target] = (matrixLiabMap[l.target] || 0) + (Number(l.claims_usd_bn) || 0);
  });

  countries.forEach(c => {
    // 1. Quarterly FX Reserves lookup
    const qCbs = (cbsRisk[c.code] || []).find(q => q.quarter === quarter);
    let reservesVal = null;
    let reservesSource = 'MISSING_NA';
    let reservesStatus = 'DATA_UNAVAILABLE';
    let reservesMissing = true;

    if (qCbs && qCbs.fx_reserves_bn !== undefined && qCbs.fx_reserves_bn !== null && !isNaN(qCbs.fx_reserves_bn)) {
      reservesVal = Number(qCbs.fx_reserves_bn);
      reservesSource = 'BIS_CBS_TABLE_B (Quarterly)';
      reservesStatus = qCbs.is_nowcast ? 'NOWCAST' : (isHistorical ? 'OFFICIAL' : (isPending ? 'PENDING_VERIFICATION' : 'NOWCAST'));
      reservesMissing = false;
      validReservesCount++;
    } else if (c.fx_reserves !== undefined && c.fx_reserves !== null && !isNaN(c.fx_reserves)) {
      reservesVal = Number(c.fx_reserves);
      reservesSource = 'COUNTRY_METADATA_FALLBACK';
      reservesStatus = 'STATIC_FALLBACK';
      reservesMissing = false;
      validReservesCount++;
    }

    // 2. Network clearing nominal liabilities (matrix sum)
    const matrixLiab = matrixLiabMap[c.code] || 0;
    const clearingLiab = {
      value: matrixLiab,
      unit: 'USD Bn',
      source: 'BILATERAL_MATRIX_SUM',
      status: quarterDefaultStatus
    };

    // 3. Behavioral liabilities base lookup (LBS Table A -> CBS Table B -> Matrix sum)
    const qLbs = (lbsData[c.code] || []).find(q => q.quarter === quarter);
    let behLiabVal = null;
    let behLiabSource = 'MISSING_NA';
    let behLiabStatus = 'DATA_UNAVAILABLE';
    let behLiabMissing = true;

    if (qLbs && qLbs.liabilities_usd_bn !== undefined && qLbs.liabilities_usd_bn !== null && !isNaN(qLbs.liabilities_usd_bn) && qLbs.liabilities_usd_bn > 0) {
      behLiabVal = Number(qLbs.liabilities_usd_bn);
      behLiabSource = 'BIS_LBS_TABLE_A';
      behLiabStatus = qLbs.is_nowcast ? 'NOWCAST' : quarterDefaultStatus;
      behLiabMissing = false;
      validLiabCount++;
    } else if (qCbs && qCbs.cross_border_borrowings_bn !== undefined && qCbs.cross_border_borrowings_bn !== null && !isNaN(qCbs.cross_border_borrowings_bn) && qCbs.cross_border_borrowings_bn > 0) {
      behLiabVal = Number(qCbs.cross_border_borrowings_bn);
      behLiabSource = 'BIS_CBS_TABLE_B';
      behLiabStatus = qCbs.is_nowcast ? 'NOWCAST' : quarterDefaultStatus;
      behLiabMissing = false;
      validLiabCount++;
    } else if (matrixLiab > 0) {
      behLiabVal = matrixLiab;
      behLiabSource = 'BILATERAL_MATRIX_SUM_FALLBACK';
      behLiabStatus = quarterDefaultStatus;
      behLiabMissing = false;
      validLiabCount++;
    }

    // 4. Boundary Liquidity Buffer e_i = bufferMultiplier * FX Reserves
    const bufferVal = !reservesMissing && reservesVal > 0 ? reservesVal * bufferMultiplier : 0;

    countryInputs[c.code] = {
      code: c.code,
      name: c.name,
      name_zh: c.name_zh,
      quarter,
      reserves: {
        value: reservesVal,
        unit: 'USD Bn',
        source: reservesSource,
        status: reservesStatus,
        isMissing: reservesMissing
      },
      clearingLiabilities: clearingLiab,
      behavioralLiabilities: {
        value: behLiabVal,
        unit: 'USD Bn',
        source: behLiabSource,
        status: behLiabStatus,
        isMissing: behLiabMissing
      },
      boundaryBuffer: {
        value: bufferVal,
        multiplier: bufferMultiplier,
        formula: `${bufferMultiplier}x FX Reserves`,
        isUnavailable: reservesMissing || reservesVal <= 0
      }
    };
  });

  const totalCount = countries.length;
  const reservesCoveragePct = totalCount > 0 ? parseFloat(((validReservesCount / totalCount) * 100).toFixed(1)) : 0;
  const liabCoveragePct = totalCount > 0 ? parseFloat(((validLiabCount / totalCount) * 100).toFixed(1)) : 0;

  return {
    countryInputs,
    validReservesCount,
    validLiabCount,
    totalJurisdictions: totalCount,
    reservesCoverageRatio: `${validReservesCount}/${totalCount}`,
    reservesCoveragePct,
    liabCoverageRatio: `${validLiabCount}/${totalCount}`,
    liabCoveragePct
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

  // Build Deterministic Fingerprint
  const dataFingerprint = buildDataFingerprint({
    quarter,
    links,
    epicenter,
    haircutPct,
    bufferMultiplier,
    deleveragingMultiplier,
    dollarSqueezePct,
    simMode,
    enSortMetric
  });

  // Resolve Country Inputs and Provenance
  const {
    countryInputs,
    validReservesCount,
    validLiabCount,
    reservesCoverageRatio,
    reservesCoveragePct,
    liabCoverageRatio,
    liabCoveragePct
  } = resolveCountryInputs({
    dataset,
    quarter,
    currentLinks: links,
    bufferMultiplier
  });

  // 1. Construct Interbank Cross-Border Obligation Matrix L
  // L[j][i]: claims of creditor j on debtor i
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

  const allConverged = baselineConvergence.converged && shockConvergence.converged;
  const convergenceStatus = allConverged ? 'CONVERGED' : 'FAILED';

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

  // Exact unrounded incremental delta (CRITICAL: never back-calculated from rounded totals!)
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

  countries.forEach(c => {
    if (c.code !== epicenter) {
      const cInput = countryInputs[c.code];
      const actualLiab = cInput?.behavioralLiabilities?.value;

      if (actualLiab !== undefined && actualLiab !== null && !isNaN(actualLiab) && actualLiab > 0) {
        const defaultUsdShare = Number(c.default_usd_share) || 50;
        const dSqueeze = Math.round(actualLiab * (defaultUsdShare / 100) * (dollarSqueezePct / 100));
        round3DollarSqueeze[c.code] = dSqueeze;
        totalR3Dollar += dSqueeze;
      } else {
        round3DollarSqueeze[c.code] = null; // Marked as NA when missing
      }
    }
  });

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
      const reserves = cInput?.reserves?.value;
      const impactToReservesPct = reserves ? parseFloat(((totalImpact / reserves) * 100).toFixed(1)) : 'NA';
      const enIncrementalToReservesPct = reserves ? parseFloat(((incObj.raw / reserves) * 100).toFixed(1)) : 'NA';
      const enBaselineToReservesPct = reserves ? parseFloat(((bObj.raw / reserves) * 100).toFixed(1)) : 'NA';
      const enPostShockToReservesPct = reserves ? parseFloat(((sObj.raw / reserves) * 100).toFixed(1)) : 'NA';

      return {
        code: c.code,
        name: c.name,
        name_zh: c.name_zh,
        region: c.region,
        tier: c.tier,
        reserves,
        reservesStatus: cInput?.reserves?.status || 'DATA_UNAVAILABLE',
        reservesSource: cInput?.reserves?.source || 'MISSING_NA',
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

  // Top incremental victim (only exists if incremental shortfall > 0)
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
      reservesSource: cInput?.reserves?.source || 'MISSING_NA',
      reservesStatus: cInput?.reserves?.status || 'DATA_UNAVAILABLE',
      bufferMultiplier,
      bufferBn: cInput?.boundaryBuffer?.value ?? 0
    };
  });

  const quarterStatus = quarter <= '2026Q1' ? 'OFFICIAL' : (quarter === '2026Q2' ? 'PENDING_VERIFICATION' : 'NOWCAST_SCENARIO');
  const epicenterCountry = countryMap[epicenter] || countries[0];

  const currentRun = {
    runId: `${quarter}-${epicenter}-${haircutPct}-${bufferMultiplier}-${Date.now()}`,
    dataFingerprint,
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
    baselineConvergence,
    shockConvergence,
    validLiabCoverage: `${validLiabCount}/${countries.length - 1}`,
    validReservesCoverage: `${validReservesCount}/${countries.length}`,
    coverageMeta: {
      validReservesCount,
      totalJurisdictions: n,
      reservesCoverageRatio,
      reservesCoveragePct,
      validLiabCount,
      liabCoverageRatio,
      liabCoveragePct
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
    epicenterCode: epicenter,
    simMode,
    enSortMetric,
    haircutPct,
    bufferMultiplier,
    deleveragingMultiplier,
    dollarSqueezePct,
    convergenceStatus,
    allConverged,
    baselineConvergence,
    shockConvergence,
    iterationsCount: shockConvergence.iterCount,
    clearingResidual: shockConvergence.residual,
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
