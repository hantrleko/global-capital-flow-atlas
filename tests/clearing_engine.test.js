/**
 * Regression & Methodology Verification Test Suite for Eisenberg-Noe (2001) Clearing Engine
 * Run via: node tests/clearing_engine.test.js or npm test
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  computeClearingScenario,
  buildDataFingerprint,
  buildBaselineCacheKey,
  buildShockCacheKey,
  computeCanonicalMatrixDigest,
  normalizeCorridorExposures,
  resolveCountryReserves,
  resolveJurisdictionLiability,
  verifyFixedPointClearingVector,
  resolveCountryInputs,
  solvePicardFixedPoint,
  computeStressWorkbenchAnalysis,
  CLEARING_VERSION_REGISTRY
} from '../src/utils/eisenbergNoeClearing.js';
import { NAVIGATION_DOMAINS, getTabTaskMeta } from '../src/utils/navigationConfig.js';
import {
  isOffshoreConduit,
  OFC_JURISDICTIONS,
  transformToUltimateRiskLinks,
  getOfcLookThroughSummary
} from '../src/utils/lookThroughEngine.js';
import {
  PORTFOLIO_PRESETS,
  MACRO_STRESS_SCENARIOS,
  ASSET_CLASS_PROFILES,
  INSTITUTIONAL_HEDGE_CATALOG,
  buildLiveClearingShockMap,
  computePortfolioStressOverlay
} from '../src/utils/portfolioStressEngine.js';
import {
  MODULE_VERDICTS,
  MODULE_CAUSAL_LINKS,
  INVESTIGATION_TRACKS,
  getModuleVerdict,
  getModuleCausalLinks
} from '../src/utils/causalIntelligence.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load production BIS Atlas dataset
const datasetPath = path.resolve(__dirname, '../src/data/bis_atlas_dataset.json');
const dataset = JSON.parse(fs.readFileSync(datasetPath, 'utf8'));

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    testsFailed++;
    throw new Error(message);
  } else {
    console.log(`  ✓ ${message}`);
    testsPassed++;
  }
}

function runTestSuite() {
  console.log('\n===============================================================');
  console.log('🔬 RUNNING EISENBERG-NOE CLEARING ENGINE REGRESSION SUITE');
  console.log('===============================================================\n');

  // TEST 1: Zero-Shock Exact Invariance
  console.log('Test 1: Zero-Shock Exact Invariance (ΔS ≡ 0)');
  {
    const res = computeClearingScenario({
      dataset,
      quarter: '2026Q4',
      epicenter: 'TR',
      haircutPct: 0,
      bufferMultiplier: 1.5
    });

    assert(res.totalIncrementalRaw === 0, 'Zero-shock incremental raw shortfall must be exactly 0');
    assert(res.totalIncrementalShortfall === 0, 'Zero-shock display shortfall must be 0');
    assert(res.totalBaselineRaw === res.totalPostShockRaw, 'Baseline and post-shock totals must be bitwise identical');
    assert(res.currentRun.topVictim === null, 'Top incremental victim under zero shock must be null');
    assert(res.impactList.every(item => item.enIncrementalShortfallRaw === 0), 'Every country in impact list must have exactly 0 incremental shortfall under zero shock');
  }

  // TEST 2: Turkey (TR) 25% Baseline & Incremental Shock Loss Calibration
  console.log('\nTest 2: Turkey (TR) 25% Baseline & Marginal Incremental Loss Calibration');
  {
    const res = computeClearingScenario({
      dataset,
      quarter: '2026Q4',
      epicenter: 'TR',
      haircutPct: 25,
      bufferMultiplier: 1.5
    });

    // Check Baseline (~5521.9B)
    assert(Math.abs(res.totalBaselineRaw - 5521.8877) < 0.1, `Baseline raw shortfall ~5521.89B (got ${res.totalBaselineRaw.toFixed(4)})`);
    assert(res.totalBaselineShortfall === 5521.9, `Baseline display shortfall must be 5521.9B`);

    // Check Post-Shock (~5806.6B)
    assert(Math.abs(res.totalPostShockRaw - 5806.6406) < 0.1, `Post-shock raw shortfall ~5806.64B (got ${res.totalPostShockRaw.toFixed(4)})`);
    assert(res.totalPostShockShortfall === 5806.6, `Post-shock display shortfall must be 5806.6B`);

    // Check Incremental Delta (~284.8B, raw 284.7528B)
    assert(Math.abs(res.totalIncrementalRaw - 284.7528) < 0.05, `Incremental raw shortfall ~284.7528B (got ${res.totalIncrementalRaw.toFixed(4)})`);
    assert(res.totalIncrementalShortfall === 284.8, `Incremental display shortfall must be +284.8B`);

    // Assert Top Victim is Germany (DE) with incremental shortfall +69.2B
    assert(res.currentRun.topVictim !== null, 'Top victim must exist');
    assert(res.currentRun.topVictim.code === 'DE', `Top victim for TR shock must be Germany DE (got ${res.currentRun.topVictim.code})`);
    assert(res.currentRun.topVictim.incrementalDisplay === 69.2, `Germany DE incremental loss must be 69.2B (got ${res.currentRun.topVictim.incrementalDisplay})`);
  }

  // TEST 3: G-SIB Core Hub Contagion (US & UK Cross-Border Tests)
  console.log('\nTest 3: G-SIB Core Hub Contagion (US & UK Symmetries)');
  {
    // US Shock -> Japan (JP) is #1 creditor victim, UK (GB) is #2 creditor victim
    const resUS = computeClearingScenario({
      dataset,
      quarter: '2026Q4',
      epicenter: 'US',
      haircutPct: 20,
      bufferMultiplier: 1.5
    });
    assert(resUS.currentRun.topVictim.code === 'JP', `Top victim for US shock must be Japan JP (got ${resUS.currentRun.topVictim.code})`);
    assert(resUS.impactList[1].code === 'GB', `Second victim for US shock must be UK GB (got ${resUS.impactList[1].code})`);

    // UK (GB) Shock -> US is #1 creditor victim
    const resGB = computeClearingScenario({
      dataset,
      quarter: '2026Q4',
      epicenter: 'GB',
      haircutPct: 20,
      bufferMultiplier: 1.5
    });
    assert(resGB.currentRun.topVictim.code === 'US', `Top victim for GB shock must be US (got ${resGB.currentRun.topVictim.code})`);
    assert(Math.abs(resGB.currentRun.topVictim.incrementalDisplay - 725.3) < 0.2, `US incremental loss from GB shock must be ~725.3B (got ${resGB.currentRun.topVictim.incrementalDisplay})`);
  }

  // TEST 4: Picard Fixed-Point Dual Convergence
  console.log('\nTest 4: Picard Fixed-Point Dual-Baseline Convergence');
  {
    const res = computeClearingScenario({
      dataset,
      quarter: '2026Q4',
      epicenter: 'TR',
      haircutPct: 25,
      bufferMultiplier: 1.5,
      tolerance: 1e-4,
      maxIterations: 100
    });

    assert(res.allConverged === true, 'Overall simulation allConverged flag must be true');
    assert(res.convergenceStatus === 'CONVERGED', 'convergenceStatus must be CONVERGED');
    assert(res.baselineConvergence.converged === true, 'Baseline solver must converge');
    assert(res.baselineConvergence.residual < 1e-4, `Baseline residual must be < 1e-4 (got ${res.baselineConvergence.residual})`);
    assert(res.shockConvergence.converged === true, 'Shocked solver must converge');
    assert(res.shockConvergence.residual < 1e-4, `Shocked residual must be < 1e-4 (got ${res.shockConvergence.residual})`);
    assert(res.baselineConvergence.iterCount <= 100, `Baseline iterations (${res.baselineConvergence.iterCount}) <= 100`);
    assert(res.shockConvergence.iterCount <= 100, `Shocked iterations (${res.shockConvergence.iterCount}) <= 100`);
  }

  // TEST 5: Convergence Failure Guard & Protection Alert
  console.log('\nTest 5: Convergence Failure Guard (Protection when maxIterations artificially restricted)');
  {
    const resFailed = computeClearingScenario({
      dataset,
      quarter: '2026Q4',
      epicenter: 'TR',
      haircutPct: 25,
      maxIterations: 2, // Artificially low iteration limit
      tolerance: 1e-4
    });

    assert(resFailed.allConverged === false, 'allConverged must be false when iterations cap is exceeded');
    assert(resFailed.convergenceStatus === 'FAILED', 'convergenceStatus must report FAILED');
    assert(resFailed.baselineConvergence.converged === false, 'Baseline convergence must be false');
    assert(resFailed.shockConvergence.converged === false, 'Shock convergence must be false');
    assert(resFailed.baselineConvergence.residual > 1e-4, 'Baseline residual must exceed tolerance');
    assert(resFailed.shockConvergence.residual > 1e-4, 'Shock residual must exceed tolerance');
  }

  // TEST 6: Data Missingness (NA) & Provenance Traceability
  console.log('\nTest 6: Data Missingness (NA) & Full Provenance Integrity');
  {
    const prov = resolveCountryInputs({
      dataset,
      quarter: '2026Q4',
      bufferMultiplier: 1.5
    });

    assert(prov.totalJurisdictions === 23, `Must resolve all 23 jurisdictions (got ${prov.totalJurisdictions})`);
    assert(prov.validReservesCount === 23, `All 23 jurisdictions have valid FX reserves records (got ${prov.validReservesCount})`);
    assert(prov.reservesCoveragePct === 100, 'Reserves coverage percentage must be 100%');
    assert(prov.liabCoveragePct === 100, 'Liabilities coverage percentage must be 100%');

    // Test artificial missing reserves country injection
    const syntheticDataset = JSON.parse(JSON.stringify(dataset));
    syntheticDataset.countries.push({
      code: 'ZZ',
      name: 'Synthetic Atlantis',
      name_zh: '亚特兰蒂斯',
      fx_reserves: null,
      tier: 3
    });

    const synProv = resolveCountryInputs({
      dataset: syntheticDataset,
      quarter: '2026Q4',
      bufferMultiplier: 1.5
    });

    const zzInput = synProv.countryInputs['ZZ'];
    assert(zzInput !== undefined, 'Synthetic country ZZ must be resolved');
    assert(zzInput.reserves.value === null, 'ZZ reserves value must be null (NA)');
    assert(zzInput.reserves.isMissing === true, 'ZZ reserves isMissing flag must be true');
    assert(zzInput.boundaryBuffer.value === 0, 'ZZ boundary buffer must be 0');
    assert(zzInput.boundaryBuffer.isUnavailable === true, 'ZZ boundary buffer must be marked unavailable');
  }

  // TEST 7: Cross-Quarter Traceability for UK (GB) and Cayman Islands (KY)
  console.log('\nTest 7: Cross-Quarter Traceability for UK (GB) & Cayman Islands (KY)');
  {
    const quarters = ['2026Q1', '2026Q2', '2026Q3', '2026Q4'];
    quarters.forEach(q => {
      const qProv = resolveCountryInputs({ dataset, quarter: q, bufferMultiplier: 1.5 });
      const gb = qProv.countryInputs['GB'];
      const ky = qProv.countryInputs['KY'];

      assert(gb.reserves.value === 185, `GB reserves in ${q} must be 185B USD`);
      assert(ky.reserves.value === 0.5, `KY reserves in ${q} must be 0.5B USD`);
      assert(gb.reserves.source === 'BIS_CBS_TABLE_B (Quarterly)', `GB reserves source must be CBS Table B in ${q}`);
      assert(ky.reserves.source === 'BIS_CBS_TABLE_B (Quarterly)', `KY reserves source must be CBS Table B in ${q}`);

      if (q <= '2026Q1') {
        assert(gb.reserves.status === 'OFFICIAL', `GB status in ${q} must be OFFICIAL`);
      } else if (q === '2026Q2') {
        assert(gb.reserves.status === 'PENDING_VERIFICATION', `GB status in 2026Q2 must be PENDING_VERIFICATION`);
      } else {
        assert(gb.reserves.status === 'NOWCAST', `GB status in ${q} must be NOWCAST`);
      }
    });
  }

  // TEST 8: Custom Matrix Mutability & Stale Result Prevention (Data Fingerprinting)
  console.log('\nTest 8: Custom Matrix Mutability & Reactivity in Same Quarter');
  {
    const defaultLinks = dataset.bilateral_matrix['2026Q4'];
    const resDefault = computeClearingScenario({
      dataset,
      quarter: '2026Q4',
      currentLinks: defaultLinks,
      epicenter: 'TR',
      haircutPct: 25
    });

    // Mutate custom matrix by scaling US->TR debt
    const customLinks = defaultLinks.map(l => {
      if (l.target === 'TR') {
        return { ...l, claims_usd_bn: l.claims_usd_bn * 1.5 };
      }
      return { ...l };
    });

    const resCustom = computeClearingScenario({
      dataset,
      quarter: '2026Q4',
      currentLinks: customLinks,
      epicenter: 'TR',
      haircutPct: 25
    });

    assert(resDefault.dataFingerprint !== resCustom.dataFingerprint, 'Custom matrix mutation must change dataFingerprint');
    assert(resDefault.totalIncrementalRaw !== resCustom.totalIncrementalRaw, 'Incremental shortfall must update when matrix changes');
    assert(resCustom.totalIncrementalRaw > resDefault.totalIncrementalRaw, 'Increased debt to epicenter must increase incremental loss');

    // Reverting links must restore exact default results
    const resReverted = computeClearingScenario({
      dataset,
      quarter: '2026Q4',
      currentLinks: defaultLinks,
      epicenter: 'TR',
      haircutPct: 25
    });

    assert(resDefault.dataFingerprint === resReverted.dataFingerprint, 'Reverting matrix links restores original fingerprint');
    assert(resDefault.totalIncrementalRaw === resReverted.totalIncrementalRaw, 'Reverting matrix links restores original shortfall');
  }

  // TEST 9: Buffer Multiplier Sensitivity Analysis
  console.log('\nTest 9: Buffer Multiplier Sensitivity (1.0x vs 1.5x vs 2.0x FX Reserves)');
  {
    const res10 = computeClearingScenario({ dataset, quarter: '2026Q4', epicenter: 'TR', haircutPct: 25, bufferMultiplier: 1.0 });
    const res15 = computeClearingScenario({ dataset, quarter: '2026Q4', epicenter: 'TR', haircutPct: 25, bufferMultiplier: 1.5 });
    const res20 = computeClearingScenario({ dataset, quarter: '2026Q4', epicenter: 'TR', haircutPct: 25, bufferMultiplier: 2.0 });

    // Baseline shortfall decreases monotonically as outside liquidity buffer increases
    assert(res10.totalBaselineRaw > res15.totalBaselineRaw, 'Baseline shortfall: 1.0x buffer > 1.5x buffer');
    assert(res15.totalBaselineRaw > res20.totalBaselineRaw, 'Baseline shortfall: 1.5x buffer > 2.0x buffer');

    // Marginal incremental shock loss remains stable (+270B to +290B), proving ΔS isolates exogenous shock
    assert(Math.abs(res10.totalIncrementalShortfall - 290.0) < 1.0, `1.0x buffer incremental loss ~290.0B (got ${res10.totalIncrementalShortfall})`);
    assert(Math.abs(res15.totalIncrementalShortfall - 284.8) < 0.5, `1.5x buffer incremental loss ~284.8B (got ${res15.totalIncrementalShortfall})`);
    assert(Math.abs(res20.totalIncrementalShortfall - 273.5) < 1.0, `2.0x buffer incremental loss ~273.5B (got ${res20.totalIncrementalShortfall})`);
  }

  // TEST 10: Unrounded Aggregation & Precision Conservation
  console.log('\nTest 10: Unrounded Aggregation & Display Precision Conservation');
  {
    const res = computeClearingScenario({ dataset, quarter: '2026Q4', epicenter: 'TR', haircutPct: 25, bufferMultiplier: 1.5 });

    // Sum of raw creditor incremental deltas across non-epicenter victim jurisdictions
    let victimCreditorSumRaw = 0;
    res.impactList.forEach(item => {
      victimCreditorSumRaw += item.enIncrementalShortfallRaw;
    });

    assert(victimCreditorSumRaw > 0, 'Victim creditors sum must be positive');
    assert(Math.abs(victimCreditorSumRaw - 284.31508) < 0.05, `Victim creditors sum ~284.32B (got ${victimCreditorSumRaw.toFixed(5)})`);
    assert(Math.abs(res.totalIncrementalRaw - 284.75284) < 0.05, `Full network incremental raw shortfall ~284.7528B (got ${res.totalIncrementalRaw.toFixed(5)})`);
    assert(res.totalIncrementalRaw === Math.max(0, res.totalPostShockRaw - res.totalBaselineRaw), 'Total incremental delta must strictly equal (S* - S^(0)) in Float64');
    assert(res.totalIncrementalShortfall === Math.round(res.totalIncrementalRaw * 10) / 10, 'Display incremental shortfall must be exact 1-decimal rounding of Float64 total');
  }

  // TEST 11: A1 - Zero-Sum Distribution Mutation & Fingerprint Invalidation
  console.log('\nTest 11: A1 - Zero-Sum Distribution Mutation & Cache Invalidation');
  {
    const origLinks = dataset.bilateral_matrix['2026Q4'];
    const origDigest = computeCanonicalMatrixDigest(origLinks);
    const origFingerprint = buildDataFingerprint({
      revision: 1,
      quarter: '2026Q4',
      links: origLinks,
      epicenter: 'TR',
      haircutPct: 25
    });

    // Zero-sum mutation: edge count and sum of claims are bitwise identical,
    // but the spatial distribution between US->JP and US->GB shifts by 50B.
    let foundUSJP = false;
    let foundUSGB = false;
    const mutatedLinks = origLinks.map(l => {
      if (l.source === 'US' && l.target === 'JP') {
        foundUSJP = true;
        return { ...l, claims_usd_bn: l.claims_usd_bn - 50.0 };
      }
      if (l.source === 'US' && l.target === 'GB') {
        foundUSGB = true;
        return { ...l, claims_usd_bn: l.claims_usd_bn + 50.0 };
      }
      return { ...l };
    });

    assert(foundUSJP && foundUSGB, 'Must find both US->JP and US->GB corridors for zero-sum test');
    assert(mutatedLinks.length === origLinks.length, 'Mutated matrix must have identical corridor count');

    const origSum = origLinks.reduce((acc, l) => acc + l.claims_usd_bn, 0);
    const mutatedSum = mutatedLinks.reduce((acc, l) => acc + l.claims_usd_bn, 0);
    assert(Math.abs(origSum - mutatedSum) < 1e-9, 'Mutated matrix sum must be bitwise identical');

    const mutatedDigest = computeCanonicalMatrixDigest(mutatedLinks);
    assert(mutatedDigest !== origDigest, `Canonical digest must change despite identical sum and edge count (got ${mutatedDigest})`);

    const mutatedFingerprint = buildDataFingerprint({
      revision: 2,
      quarter: '2026Q4',
      links: mutatedLinks,
      epicenter: 'TR',
      haircutPct: 25
    });
    assert(mutatedFingerprint !== origFingerprint, 'Fingerprint must change when distribution changes');

    // Recomputation on mutated matrix produces updated clearing results
    const resMutated = computeClearingScenario({
      dataset: { ...dataset, datasetRevision: 2 },
      quarter: '2026Q4',
      currentLinks: mutatedLinks,
      epicenter: 'TR',
      haircutPct: 25
    });
    assert(resMutated.dataFingerprint === mutatedFingerprint, 'Scenario result must bind mutated fingerprint');
    assert(resMutated.datasetRevision === 2, 'Scenario result must reflect datasetRevision 2');

    // Restoration back to original links yields identical original digest and fingerprint
    const restoredDigest = computeCanonicalMatrixDigest(origLinks);
    assert(restoredDigest === origDigest, 'Restored digest must match original digest');
  }

  // TEST 12: A2 - Explicit Zero Reserves vs Missing Reserves & Division-by-Zero Guard
  console.log('\nTest 12: A2 - Explicit Zero vs Missing Reserves & Ratio Guard');
  {
    // Test resolveCountryReserves with synthetic records
    const synDataset = JSON.parse(JSON.stringify(dataset));
    
    // Explicit Zero
    synDataset.cbs_risk['TEST_ZERO'] = [{ quarter: '2026Q4', fx_reserves_bn: 0, is_nowcast: false }];
    // Definite Missing (null)
    synDataset.cbs_risk['TEST_NULL'] = [{ quarter: '2026Q4', fx_reserves_bn: null, is_nowcast: false }];
    // Invalid Numeric (negative or NaN)
    synDataset.cbs_risk['TEST_INVALID'] = [{ quarter: '2026Q4', fx_reserves_bn: -100, is_nowcast: false }];

    const resZero = resolveCountryReserves({ dataset: synDataset, country: 'TEST_ZERO', quarter: '2026Q4' });
    assert(resZero.status === 'EXPLICIT_ZERO', 'fx_reserves_bn = 0 must produce EXPLICIT_ZERO status');
    assert(resZero.value === 0, 'EXPLICIT_ZERO value must be 0');
    assert(resZero.isExplicitZero === true, 'isExplicitZero must be true');
    assert(resZero.isMissing === false, 'isMissing must be false for explicit zero');
    assert(resZero.unit === 'USD_BN', 'Must provide unit USD_BN');

    const resNull = resolveCountryReserves({ dataset: synDataset, country: 'TEST_NULL', quarter: '2026Q4' });
    assert(resNull.status === 'MISSING', 'fx_reserves_bn = null must produce MISSING status');
    assert(resNull.value === null, 'MISSING value must be null');
    assert(resNull.isExplicitZero === false, 'isExplicitZero must be false for null');
    assert(resNull.isMissing === true, 'isMissing must be true for null');

    const resInvalid = resolveCountryReserves({ dataset: synDataset, country: 'TEST_INVALID', quarter: '2026Q4' });
    assert(resInvalid.status === 'INVALID_NUMERIC', 'Negative fx_reserves must produce INVALID_NUMERIC status');
    assert(resInvalid.value === null, 'INVALID_NUMERIC value must be null');

    // Test scenario ratio formatting: explicit zero denominator returns 'N/A (外储为零)', missing returns 'NA'
    synDataset.countries.push(
      { code: 'TEST_ZERO', name: 'Zero Island', name_zh: '零储备岛', tier: 3 },
      { code: 'TEST_NULL', name: 'Null Island', name_zh: '缺失储备岛', tier: 3 }
    );
    synDataset.bilateral_matrix['2026Q4'].push(
      { source: 'TEST_ZERO', target: 'TR', claims_usd_bn: 20 },
      { source: 'TR', target: 'TEST_ZERO', claims_usd_bn: 20 },
      { source: 'TEST_NULL', target: 'TR', claims_usd_bn: 20 },
      { source: 'TR', target: 'TEST_NULL', claims_usd_bn: 20 }
    );

    const resScenario = computeClearingScenario({
      dataset: synDataset,
      quarter: '2026Q4',
      epicenter: 'TR',
      haircutPct: 25
    });

    const zeroItem = resScenario.impactList.find(i => i.code === 'TEST_ZERO');
    assert(zeroItem !== undefined, 'TEST_ZERO country must be in impact list');
    assert(zeroItem.enIncrementalToReservesPct === 'N/A (外储为零)', `Explicit zero reserves ratio must return 'N/A (外储为零)', got ${zeroItem.enIncrementalToReservesPct}`);

    const nullItem = resScenario.impactList.find(i => i.code === 'TEST_NULL');
    assert(nullItem !== undefined, 'TEST_NULL country must be in impact list');
    assert(nullItem.enIncrementalToReservesPct === 'NA', `Missing reserves ratio must return 'NA', got ${nullItem.enIncrementalToReservesPct}`);
  }

  // TEST 13: A3 - Centralized Liability Resolver & Prohibition of Silent Cross-Basis Fallback
  console.log('\nTest 13: A3 - Centralized Liability Resolver & Fallback Guard');
  {
    // Test LBS Residence basis resolution
    const lbsUS = resolveJurisdictionLiability({
      dataset,
      countryCode: 'US',
      quarter: '2026Q1',
      requiredBasis: 'LBS_RESIDENCE'
    });
    assert(lbsUS.value > 0, 'US LBS residence liabilities must be positive in 2026Q1');
    assert(lbsUS.source === 'BIS_LBS_TABLE_A', 'US LBS source must be BIS_LBS_TABLE_A');
    assert(lbsUS.isFallback === false, 'Official LBS must not be a fallback');

    // Test CBS Ultimate Risk basis resolution
    const cbsUS = resolveJurisdictionLiability({
      dataset,
      countryCode: 'US',
      quarter: '2026Q1',
      requiredBasis: 'CBS_ULTIMATE_RISK'
    });
    assert(cbsUS.value > 0, 'US CBS ultimate risk liabilities must be positive in 2026Q1');
    assert(cbsUS.source === 'BIS_CBS_TABLE_B', 'US CBS source must be BIS_CBS_TABLE_B');
    assert(cbsUS.isFallback === false, 'Official CBS must not be a fallback');

    // Test Bilateral Matrix Perimeter Column Sum
    const matrixUS = resolveJurisdictionLiability({
      dataset,
      countryCode: 'US',
      quarter: '2026Q1',
      requiredBasis: 'BILATERAL_MATRIX_PERIMETER'
    });
    assert(matrixUS.value > 0, 'US matrix perimeter sum must be positive in 2026Q1');
    assert(matrixUS.source === 'BILATERAL_MATRIX_SUM', 'US matrix source must be BILATERAL_MATRIX_SUM');

    // Test missing basis without authorization: must NOT silently fall back
    const synDataset = JSON.parse(JSON.stringify(dataset));
    delete synDataset.lbs_data['US']; // Remove LBS data for US

    const missingWithoutProxy = resolveJurisdictionLiability({
      dataset: synDataset,
      countryCode: 'US',
      quarter: '2026Q1',
      requiredBasis: 'LBS_RESIDENCE',
      allowModelProxy: false
    });
    assert(missingWithoutProxy.value === null, 'Missing LBS without allowModelProxy must return value = null');
    assert(missingWithoutProxy.status === 'UNAVAILABLE_MISSING', 'Must return status UNAVAILABLE_MISSING');
    assert(missingWithoutProxy.isFallback === false, 'Must not claim fallback when proxy is prohibited');

    // Test missing basis with explicit authorization: falls back to MODEL_PROXY
    const missingWithProxy = resolveJurisdictionLiability({
      dataset: synDataset,
      countryCode: 'US',
      quarter: '2026Q1',
      requiredBasis: 'LBS_RESIDENCE',
      allowModelProxy: true
    });
    assert(missingWithProxy.value > 0, 'With allowModelProxy = true, proxy column sum is provided');
    assert(missingWithProxy.source === 'BILATERAL_MATRIX_SUM_PROXY', 'Source must indicate BILATERAL_MATRIX_SUM_PROXY');
    assert(missingWithProxy.isFallback === true, 'isFallback must be true');
    assert(missingWithProxy.status === 'MODEL_PROXY', 'status must be MODEL_PROXY');
  }

  // TEST 14: A4 - Independent Fixed-Point Verification Operator (Phi(p))
  console.log('\nTest 14: A4 - Independent Clearing Operator Phi(p) Verification');
  {
    const res = computeClearingScenario({
      dataset,
      quarter: '2026Q4',
      epicenter: 'TR',
      haircutPct: 25,
      bufferMultiplier: 1.5
    });

    // 1. Genuine converged solution must pass independent verification
    assert(res.allFixedPointsValid === true, 'Genuine clearing vector must pass independent verification');
    assert(res.baselineConvergence.verification.fixedPointValid === true, 'Baseline verification must be valid');
    assert(res.shockConvergence.verification.fixedPointValid === true, 'Shocked verification must be valid');
    assert(res.shockConvergence.verification.maxAbsResidual < 1e-4, `Max abs residual must be < 1e-4 (got ${res.shockConvergence.verification.maxAbsResidual})`);
    assert(res.shockConvergence.verification.boundsValid === true, 'Payment bounds 0 <= p <= pbar must be strictly valid');

    // 2. Perturbed vector must FAIL independent verification
    const validP = res.shockConvergence.p;
    const perturbedP = validP.map((v, i) => i === 0 ? v + 1.0 : v); // Corrupt node 0 by 1.0B

    // Reconstruct input vectors for independent operator evaluation
    const inputs = resolveCountryInputs({ dataset, quarter: '2026Q4', bufferMultiplier: 1.5 });
    const n = dataset.countries.length;
    const pbarArr = dataset.countries.map(c => inputs.countryInputs[c.code].clearingLiabilities.value || 0);
    const eVec = dataset.countries.map((c, i) => {
      const b = inputs.countryInputs[c.code].boundaryBuffer.value || 0;
      return c.code === 'TR' ? Math.max(0, b - pbarArr[i] * 0.25) : b;
    });

    // Compute relative liability matrix Pi
    const links = dataset.bilateral_matrix['2026Q4'];
    const codeToIndex = Object.fromEntries(dataset.countries.map((c, idx) => [c.code, idx]));
    const Pi = Array.from({ length: n }, () => new Float64Array(n));
    for (const link of links) {
      const i = codeToIndex[link.source];
      const j = codeToIndex[link.target];
      if (i !== undefined && j !== undefined && pbarArr[i] > 0) {
        Pi[i][j] = link.claims_usd_bn / pbarArr[i];
      }
    }

    const perturbedVerif = verifyFixedPointClearingVector({
      pbar: pbarArr,
      Pi,
      eVec,
      pCandidate: perturbedP,
      absTolerance: 1e-4
    });

    assert(perturbedVerif.fixedPointValid === false, 'Perturbed candidate vector must FAIL independent verification');
    assert(perturbedVerif.maxAbsResidual >= 0.5, `Perturbed vector residual must be >= 0.5 (got ${perturbedVerif.maxAbsResidual})`);
  }

  // TEST 15: A5 - Strict Subset Coverage Label Definition (23/23 & 22/22)
  console.log('\nTest 15: A5 - Strict Subset Coverage Label Definition');
  {
    const res = computeClearingScenario({
      dataset,
      quarter: '2026Q4',
      epicenter: 'TR',
      haircutPct: 25
    });

    const cm = res.coverageMeta;
    assert(cm !== undefined, 'coverageMeta must be present in simulation results');
    assert(cm.totalJurisdictions === 23, 'Total network jurisdictions must be 23');
    assert(cm.reservesCoverageRatio === '23/23', `Reserves coverage ratio must be '23/23' (got ${cm.reservesCoverageRatio})`);
    assert(cm.reservesCoveragePct === 100, 'Reserves coverage percentage must be 100%');
    assert(cm.validReservesCount <= cm.totalJurisdictions, 'Reserves count must be subset of total network');

    assert(cm.spilloverUniverseCount === 22, 'Spillover universe count must be 22 (23 - 1 epicenter)');
    assert(cm.spilloverLiabCoverageRatio === '22/22', `Spillover liab coverage ratio must be '22/22' (got ${cm.spilloverLiabCoverageRatio})`);
    assert(cm.spilloverLiabCoveragePct === 100, 'Spillover liab coverage percentage must be 100%');
    assert(cm.validSpilloverLiabCount <= cm.spilloverUniverseCount, 'Spillover count must be subset of spillover universe');
    assert(cm.liabFullCoverageRatio === '23/23', `Full liab coverage ratio must be '23/23' (got ${cm.liabFullCoverageRatio})`);
  }

  // TEST 16: P0 - Unified Corridor Normalization & Exposure Aggregation
  console.log('\nTest 16: P0 - Unified Corridor Normalization & Exposure Aggregation');
  {
    // A single 100 corridor vs two separate tranches (40 + 60)
    const singleCorridor = [{ id: 'exp_1', source: 'US', target: 'JP', claims_usd_bn: 100 }];
    const splitCorridors = [
      { id: 'exp_2a', source: 'US', target: 'JP', claims_usd_bn: 40 },
      { id: 'exp_2b', source: 'US', target: 'JP', claims_usd_bn: 60 }
    ];

    const normSingle = normalizeCorridorExposures(singleCorridor);
    const normSplit = normalizeCorridorExposures(splitCorridors);

    assert(normSingle.normalizedLinks.length === 1, 'Single corridor must normalize to 1 link');
    assert(normSplit.normalizedLinks.length === 1, 'Split tranches (40+60) must aggregate to 1 link');
    assert(Math.abs(normSingle.normalizedLinks[0].claims_usd_bn - 100) < 1e-9, 'Single corridor amount must be 100');
    assert(Math.abs(normSplit.normalizedLinks[0].claims_usd_bn - 100) < 1e-9, 'Split tranches sum must be exactly 100');

    // Digest equivalence for identical economic exposures
    const digestSingle = computeCanonicalMatrixDigest(singleCorridor);
    const digestSplit = computeCanonicalMatrixDigest(splitCorridors);
    assert(digestSingle === digestSplit, `Canonical matrix digest must be identical (got ${digestSingle})`);

    // Order invariance under shuffling
    const rawList = [
      { source: 'GB', target: 'US', claims_usd_bn: 50 },
      { source: 'US', target: 'JP', claims_usd_bn: 120 },
      { source: 'DE', target: 'FR', claims_usd_bn: 80 }
    ];
    const shuffledList = [
      { source: 'DE', target: 'FR', claims_usd_bn: 80 },
      { source: 'GB', target: 'US', claims_usd_bn: 50 },
      { source: 'US', target: 'JP', claims_usd_bn: 120 }
    ];
    const digestRaw = computeCanonicalMatrixDigest(rawList);
    const digestShuffled = computeCanonicalMatrixDigest(shuffledList);
    assert(digestRaw === digestShuffled, 'Digest must be invariant under raw record order shuffling');

    // Idempotent re-import of stable ID
    const duplicateWithSameId = [
      { id: 'bond_001', source: 'US', target: 'GB', claims_usd_bn: 25 },
      { id: 'bond_001', source: 'US', target: 'GB', claims_usd_bn: 25 }
    ];
    const normDup = normalizeCorridorExposures(duplicateWithSameId);
    assert(normDup.normalizedLinks.length === 1, 'Identical stable ID duplicate must be deduplicated');
    assert(normDup.normalizedLinks[0].claims_usd_bn === 25, 'Deduplicated record must preserve single amount');
    assert(normDup.conflicts.length === 0, 'Identical re-import must produce 0 conflicts');

    // Conflicting records with same ID must be quarantined
    const conflictingWithSameId = [
      { id: 'loan_999', source: 'US', target: 'KY', claims_usd_bn: 10 },
      { id: 'loan_999', source: 'US', target: 'KY', claims_usd_bn: 30 }
    ];
    const normConflict = normalizeCorridorExposures(conflictingWithSameId);
    assert(normConflict.conflicts.length === 1, 'Conflicting ID record must be quarantined into conflicts');
    assert(normConflict.conflicts[0].reason.includes('CONFLICTING_ID'), 'Conflict reason must specify CONFLICTING_ID');
  }

  // TEST 17: P0 - Separation of Real Zero, Missing Data, and Scenario Assumed Zero
  console.log('\nTest 17: P0 - Separation of Real Zero, Missing Data, and Scenario Assumed Zero');
  {
    const synDataset = JSON.parse(JSON.stringify(dataset));
    synDataset.cbs_risk['REAL_ZERO'] = [{ quarter: '2026Q1', fx_reserves_bn: 0 }];
    synDataset.cbs_risk['MISSING_DATA'] = [{ quarter: '2026Q1', fx_reserves_bn: null }];

    // Real Zero
    const realZero = resolveCountryReserves({ dataset: synDataset, country: 'REAL_ZERO', quarter: '2026Q1' });
    assert(realZero.status === 'EXPLICIT_ZERO', 'Observed zero reserves must have EXPLICIT_ZERO status');
    assert(realZero.value === 0, 'Observed zero reserves value must be 0');
    assert(realZero.isExplicitZero === true, 'isExplicitZero must be true');
    assert(realZero.isMissing === false, 'isMissing must be false for explicit zero');

    // Missing Data
    const missingData = resolveCountryReserves({ dataset: synDataset, country: 'MISSING_DATA', quarter: '2026Q1' });
    assert(missingData.status === 'MISSING', 'Null reserves must have MISSING status');
    assert(missingData.value === null, 'Missing reserves value must be null');
    assert(missingData.isMissing === true, 'isMissing must be true for missing reserves');
    assert(missingData.isExplicitZero === false, 'isExplicitZero must be false for missing');

    // Scenario Assumed Zero
    const scenarioZero = resolveCountryReserves({ dataset, country: 'US', quarter: '2026Q1', assumeZeroReserves: true });
    assert(scenarioZero.status === 'SCENARIO_ASSUMED_ZERO', 'Stress scenario zero reserves must be tagged SCENARIO_ASSUMED_ZERO');
    assert(scenarioZero.value === 0, 'Scenario assumed zero must yield 0 buffer');
    assert(scenarioZero.isScenarioAssumed === true, 'isScenarioAssumed must be true');

    // Exclude Missing Jurisdictions from Rankings in computeClearingScenario
    const syntheticDataset = JSON.parse(JSON.stringify(dataset));
    syntheticDataset.countries.push({
      code: 'ZZ',
      name: 'Synthetic Missing State',
      name_zh: '虚拟缺失国',
      region: 'Emerging',
      tier: 'Peripheral',
      fx_reserves: {} // completely missing reserves across all quarters
    });

    const resMissing = computeClearingScenario({
      dataset: syntheticDataset,
      quarter: '2026Q4',
      epicenter: 'TR',
      haircutPct: 25
    });

    assert(resMissing.isPartiallyIncomplete === true, 'Dataset with missing country input must set isPartiallyIncomplete = true');
    assert(resMissing.missingJurisdictions.length === 1, 'Must record 1 missing jurisdiction (ZZ)');
    assert(resMissing.missingJurisdictions[0].code === 'ZZ', 'Missing jurisdiction must be ZZ');

    const zzImpact = resMissing.impactList.find(i => i.code === 'ZZ');
    assert(zzImpact !== undefined, 'ZZ must be present in impact list for full visibility');
    assert(zzImpact.rankingEligible === false, 'ZZ must NOT be eligible for ranking (rankingEligible = false)');
    assert(zzImpact.enIncrementalShortfall === 'NA', 'ZZ incremental shortfall must be rendered NA');
    assert(resMissing.currentRun.topVictim.code !== 'ZZ', 'ZZ must never be selected as topVictim');
  }

  // TEST 18: P0 - Node-by-Node Fixed-Point Verification & Worst Node Reporting
  console.log('\nTest 18: P0 - Node-by-Node Fixed-Point Verification & Worst Node Reporting');
  {
    const res = computeClearingScenario({
      dataset,
      quarter: '2026Q4',
      epicenter: 'TR',
      haircutPct: 25
    });

    const baseVerif = res.baselineConvergence?.verification;
    const shockVerif = res.shockConvergence?.verification;

    assert(baseVerif.fixedPointValid === true, 'Baseline fixed point must pass independent node-by-node verification');
    assert(shockVerif.fixedPointValid === true, 'Shocked fixed point must pass independent node-by-node verification');
    assert(shockVerif.nodeVerifications.length === 23, 'Must verify all 23 network nodes individually');

    // Each node must satisfy individual tolerance
    shockVerif.nodeVerifications.forEach(node => {
      assert(node.residual <= node.threshold + 1e-9, `Node ${node.code} residual (${node.residual}) must satisfy threshold (${node.threshold})`);
      assert(node.valid === true, `Node ${node.code} verification must be valid`);
    });

    // Check worstNode is reported
    assert(res.shockConvergence.worstNode !== undefined, 'Worst node must be reported in solver convergence');
    assert(res.shockConvergence.stopReason === 'CONVERGED_TOLERANCE', 'Stop reason must be CONVERGED_TOLERANCE');

    // Test canceling residuals protection: single node violation fails even if aggregate sum cancels out
    const N = 3;
    const codes = ['A', 'B', 'C'];
    const pbar = [100, 100, 100];
    const e = [50, 50, 50];
    const Pi = [
      [0, 0.5, 0.5],
      [0.5, 0, 0.5],
      [0.5, 0.5, 0]
    ];
    // Candidate vector where node A has +10 error and node B has -10 error (sum of deviations = 0)
    const cancelingP = [90, 100, 100]; // Node A is underpaying by 10 despite having enough resources
    const verifCancel = verifyFixedPointClearingVector({
      N,
      codes,
      pbar,
      e,
      Pi,
      pCandidate: cancelingP,
      absTolerance: 1e-4
    });

    assert(verifCancel.fixedPointValid === false, 'Canceling residual vector must FAIL verification');
    assert(verifCancel.worstNode.residual >= 5.0, `Worst node residual must be >= 5.0 (got ${verifCancel.worstNode.residual})`);
    assert(verifCancel.stopReason === 'TOLERANCE_EXCEEDED', 'Stop reason must report TOLERANCE_EXCEEDED');

    // Test bounds violation: p_i > pbar_i
    const violatingBoundsP = [150, 100, 100];
    const verifBounds = verifyFixedPointClearingVector({
      N,
      codes,
      pbar,
      e,
      Pi,
      pCandidate: violatingBoundsP,
      absTolerance: 1e-4
    });
    assert(verifBounds.fixedPointValid === false, 'Bounds violation vector must FAIL verification');
    assert(verifBounds.stopReason === 'BOUNDS_VIOLATION_UPPER', 'Stop reason must report BOUNDS_VIOLATION_UPPER');

    // Test NaN payment check
    const nanP = [NaN, 100, 100];
    const verifNan = verifyFixedPointClearingVector({
      N,
      codes,
      pbar,
      e,
      Pi,
      pCandidate: nanP,
      absTolerance: 1e-4
    });
    assert(verifNan.fixedPointValid === false, 'NaN payment vector must FAIL verification');
    assert(verifNan.stopReason === 'NON_FINITE_PAYMENT', 'Stop reason must report NON_FINITE_PAYMENT');
  }

  // TEST 19: P1 - Temporal State & Coverage Unification
  console.log('\nTest 19: P1 - Temporal State & Coverage Unification');
  {
    const res = computeClearingScenario({
      dataset,
      quarter: '2026Q4',
      epicenter: 'TR',
      haircutPct: 25
    });

    assert(res.runType === 'STRESS_SCENARIO', 'Scenario runType must be STRESS_SCENARIO');
    assert(res.runStatusLabel.includes('压力清算情景'), 'Run status label must indicate stress clearing scenario');
    assert(res.currentRun.quarterStatus === 'NOWCAST_SCENARIO', '2026Q4 quarter status must be NOWCAST_SCENARIO');
    assert(res.currentRun.versionMeta.productVersion === CLEARING_VERSION_REGISTRY.PRODUCT, 'Product version must match registry');
    assert(res.coverageMeta.reservesCoverageRatio === '23/23', 'Reserves coverage ratio must be 23/23');
    assert(res.coverageMeta.spilloverLiabCoverageRatio === '22/22', 'Spillover liab coverage ratio must be 22/22');
  }

  // TEST 20: Capital Network Stress-Testing Workbench Multi-Regime Analysis
  console.log('\nTest 20: Capital Network Stress-Testing Workbench Multi-Regime Analysis');
  {
    const wb = computeStressWorkbenchAnalysis({
      dataset,
      quarter: '2026Q4',
      epicenter: 'TR',
      haircutPct: 25
    });

    assert(wb !== null, 'Workbench analysis result must not be null');
    assert(wb.bufferRegimes.length === 3, 'Workbench must evaluate 3 buffer regimes (1.0x, 1.5x, 2.0x)');
    assert(wb.bufferRegimes.includes(1.0) && wb.bufferRegimes.includes(1.5) && wb.bufferRegimes.includes(2.0), 'Must include 1.0, 1.5, 2.0');

    // Sensitivity Range Checks
    const sr = wb.sensitivityRange;
    assert(Math.abs(sr.minIncrementalRaw - 273.5) < 0.5, `Min incremental loss ~273.5B (got ${sr.minIncrementalRaw})`);
    assert(Math.abs(sr.maxIncrementalRaw - 290.0) < 0.5, `Max incremental loss ~290.0B (got ${sr.maxIncrementalRaw})`);
    assert(Math.abs(sr.spreadDisplay - 16.5) < 0.5, `Spread display ~16.5B (got ${sr.spreadDisplay})`);
    assert(sr.rangeLabel.includes('$273.5B ~ $290.0B'), `Range label must format as $273.5B ~ $290.0B (got ${sr.rangeLabel})`);
    assert(sr.disclaimer.includes('绝非统计置信区间，亦非现实已发生经济损失'), 'Disclaimer must contain strict disclaimer text');

    // Ranking Stability Checks
    const rs = wb.rankingStability;
    assert(rs.top3StabilityPct === 100, `Top 3 ranking stability must be 100% under TR shock (got ${rs.top3StabilityPct}%)`);
    assert(rs.top3OverlapCount === 3, 'Top 3 overlap count must be 3');

    // Transmission Decomposition Checks
    const td = wb.transmissionDecomposition;
    assert(td.totalIncremental === 284.8, `Reference incremental loss must be 284.8B (got ${td.totalIncremental})`);
    assert(td.directSharePct > 40 && td.directSharePct < 60, `Direct and indirect shares both substantial (got direct ${td.directSharePct}%, indirect ${td.indirectSharePct}%)`);
    assert(Math.abs((td.directSharePct + td.indirectSharePct) - 100.0) < 0.2, 'Direct and indirect shares must sum to 100%');

    // Jurisdiction Comparison Matrix Checks
    assert(wb.jurisdictionComparison.length === 22, 'Jurisdiction comparison matrix must cover all 22 other countries');
    const deRow = wb.jurisdictionComparison.find(r => r.code === 'DE');
    assert(deRow !== undefined, 'Germany DE must be in comparison matrix');
    assert(deRow.delta15 === 69.2, `Germany DE 1.5x delta must be 69.2B (got ${deRow.delta15})`);
    assert(deRow.rankingEligible === true, 'Germany DE must be ranking eligible');
  }

  // TEST 21: P0/P1 Normalization Currency Field Contract & Stability Non-Zero Participant Guard
  console.log('\nTest 21: Normalization Currency Field Contract & Stability Non-Zero Participant Guard');
  {
    // D01: Corridor normalization field contract preserves usd_denominated_bn
    const sampleCorridors = [
      { source: 'US', target: 'GB', claims_usd_bn: 100, usd_denominated_bn: 75, corridor_category: 'Core' },
      { source: 'US', target: 'JP', claims_usd_bn: 80, usd_denominated_bn: 50, corridor_category: 'Core' }
    ];
    const norm = normalizeCorridorExposures(sampleCorridors);
    assert(norm.normalizedLinks.length === 2, 'Must normalize 2 sample links');
    assert(norm.normalizedLinks[0].usd_denominated_bn === 75, `Corridor USD volume must be preserved (got ${norm.normalizedLinks[0].usd_denominated_bn})`);
    assert(norm.normalizedLinks[1].usd_denominated_bn === 50, `Second corridor USD volume must be preserved (got ${norm.normalizedLinks[1].usd_denominated_bn})`);
    assert(norm.normalizedLinks[0].corridor_category === 'Core', 'Corridor category must be preserved');

    // Verify 2026Q1 official matrix has USD dominant corridors post normalization
    const norm2026Q1 = normalizeCorridorExposures(dataset.bilateral_matrix['2026Q1']);
    const domLinks = norm2026Q1.normalizedLinks.filter(l => (l.usd_denominated_bn / l.claims_usd_bn) >= 0.7);
    assert(domLinks.length === 10, `Post-normalization 2026Q1 must retain exactly 10 USD-dominant corridors >=70% (got ${domLinks.length})`);

    // D05: Zero-increment exclusion from top 3 stability calculation
    const wb = computeStressWorkbenchAnalysis({
      dataset,
      quarter: '2026Q4',
      epicenter: 'TR',
      haircutPct: 25
    });
    assert(wb.rankingStability.top3StabilityPct > 0, 'Stability percentage must be computed');
    assert(wb.rankingStability.top3OverlapCount === 3, 'Top 3 non-zero victims overlap must be 3 under TR shock');
  }

  // TEST 22: Chart Lifecycle Management, Dynamic Task Meta & CI Pre-Commit Gate
  console.log('\nTest 22: Chart Lifecycle Management, Dynamic Task Meta & CI Pre-Commit Gate');
  {
    // 1. Dynamic Task Meta Resolution: EWS must never show "全球资本流向全景"
    const ewsMeta = getTabTaskMeta('ews');
    assert(ewsMeta.taskName === '系统性风险 · 巴塞尔早期预警 (EWS)', `EWS taskName must be correct (got ${ewsMeta.taskName})`);
    assert(ewsMeta.coreTask === 'stress', `EWS coreTask must be 'stress' (got ${ewsMeta.coreTask})`);
    assert(ewsMeta.domainShort === '系统性风险', `EWS domainShort must be '系统性风险' (got ${ewsMeta.domainShort})`);

    const contagionMeta = getTabTaskMeta('contagion');
    assert(contagionMeta.taskName === '系统性风险 · 银行级联传染模拟', `Contagion taskName must be correct (got ${contagionMeta.taskName})`);
    assert(contagionMeta.coreTask === 'stress', `Contagion coreTask must be 'stress' (got ${contagionMeta.coreTask})`);

    const compareMeta = getTabTaskMeta('compare');
    assert(compareMeta.taskName === '主权与模型 · 多国宏观雷达对照', `Compare taskName must be correct (got ${compareMeta.taskName})`);
    assert(compareMeta.coreTask === 'compare', `Compare coreTask must be 'compare' (got ${compareMeta.coreTask})`);

    const mapMeta = getTabTaskMeta('map');
    assert(mapMeta.taskName === '流向拓扑 · 信贷流向地图', `Map taskName must be correct (got ${mapMeta.taskName})`);
    assert(mapMeta.coreTask === 'overview', `Map coreTask must be 'overview' (got ${mapMeta.coreTask})`);

    // Verify all tabs in NAVIGATION_DOMAINS resolve uniquely and have valid metadata
    let totalTabsCount = 0;
    const tabIds = new Set();
    NAVIGATION_DOMAINS.forEach(dom => {
      dom.tabs.forEach(t => {
        totalTabsCount++;
        assert(!tabIds.has(t.id), `Tab ID '${t.id}' must be unique across domains`);
        tabIds.add(t.id);

        const meta = getTabTaskMeta(t.id);
        assert(meta.taskName.includes(t.label), `Meta taskName must include tab label for '${t.id}'`);
        assert(['overview', 'compare', 'stress'].includes(meta.coreTask), `coreTask must be one of the 3 canonical paths for '${t.id}'`);
        if (t.id !== 'map') {
          assert(!meta.taskName.includes('全球资本流向全景'), `Non-map tab '${t.id}' must not inherit stale '全球资本流向全景'`);
        }
      });
    });
    assert(totalTabsCount === 19, `Must cover all 19 analytical tabs (got ${totalTabsCount})`);

    // 2. Chart Lifecycle Unmount/Remount Simulation:
    // When a DOM element unmounts and remounts, stale chart instances referencing detached DOM must be safely disposed
    let disposedCount = 0;
    const mockDom1 = { id: 'container-scatter-1', tagName: 'DIV' };
    const mockDom2 = { id: 'container-scatter-2', tagName: 'DIV' };

    class MockECharts {
      constructor(dom) {
        this._dom = dom;
        this._disposed = false;
      }
      getDom() { return this._dom; }
      isDisposed() { return this._disposed; }
      dispose() {
        this._disposed = true;
        disposedCount++;
      }
    }

    let activeChartInstance = new MockECharts(mockDom1);
    assert(activeChartInstance.getDom() === mockDom1, 'Initial mock chart bound to dom1');

    // Simulate subtab change: activeSubTab changes to 'matrix' (mockDom1 unmounts), then back to 'quadrant' (mockDom2 mounts)
    const currentContainer = mockDom2;
    if (activeChartInstance) {
      if (activeChartInstance.isDisposed() || activeChartInstance.getDom() !== currentContainer) {
        activeChartInstance.dispose();
        activeChartInstance = null;
      }
    }
    assert(disposedCount === 1, 'Stale chart instance bound to detached DOM must be disposed');
    assert(activeChartInstance === null, 'Chart reference must be reset to null upon detecting stale DOM');

    // Reinitialize on new active container
    activeChartInstance = new MockECharts(currentContainer);
    assert(activeChartInstance.getDom() === mockDom2, 'Reinitialized chart cleanly bound to newly mounted dom2');
    assert(!activeChartInstance.isDisposed(), 'New chart instance is active and not disposed');

    // 3. Candidate Dataset Pre-Commit CI Gate Protection
    const workflowPath = path.resolve(__dirname, '../.github/workflows/update-bis-data.yml');
    const workflowYaml = fs.readFileSync(workflowPath, 'utf8');
    const testIndex = workflowYaml.indexOf('Run Integrity Tests on Candidate Dataset');
    const commitIndex = workflowYaml.indexOf('Commit & Push Verified Dataset to Main');
    assert(testIndex !== -1, 'Workflow must contain candidate test step');
    assert(commitIndex !== -1, 'Workflow must contain commit step');
    assert(testIndex < commitIndex, 'Test step MUST precede commit & push to prevent main branch pollution');
  }

  // =========================================================================
  // Test 33: Phase 2 Look-Through OFC Engine & Sector/Instrument Slicing (v1.8.0)
  // =========================================================================
  console.log('\nTest 33: Phase 2 Look-Through OFC Engine & Sector/Instrument Slicing');
  {
    assert(CLEARING_VERSION_REGISTRY.PRODUCT === 'v3.0.0', 'Clearing version registry PRODUCT must be v3.0.0');
    assert(CLEARING_VERSION_REGISTRY.MODEL.includes('v3.0-DynamicIntelligence'), 'Model registry must declare v3.0-DynamicIntelligence');

    // Conduit detection
    assert(isOffshoreConduit('KY'), 'KY (Cayman Islands) must be identified as offshore conduit');
    assert(isOffshoreConduit('LU'), 'LU (Luxembourg) must be identified as offshore conduit');
    assert(isOffshoreConduit('HK'), 'HK (Hong Kong) must be identified as offshore conduit');
    assert(!isOffshoreConduit('US'), 'US must not be marked as conduit');
    assert(!isOffshoreConduit('CN'), 'CN must not be marked as conduit');
    assert('KY' in OFC_JURISDICTIONS, 'OFC_JURISDICTIONS must contain KY');

    const sampleLinks = (dataset?.bilateral_matrix || {})['2026Q1'] || [];
    assert(sampleLinks.length > 0, '2026Q1 bilateral links must exist');

    // OFC Summary
    const ofcSummary = getOfcLookThroughSummary(sampleLinks);
    assert(ofcSummary.totalOfcInflow > 0, `Total OFC inflow must be positive (got ${ofcSummary.totalOfcInflow}B)`);
    assert((ofcSummary.byUltimateParent?.US || 0) > 0, 'Reallocated US parent claims must be positive');
    assert((ofcSummary.byUltimateParent?.CN || 0) > 0, 'Reallocated CN parent claims must be positive');

    // Residence basis links transformation
    const residenceResult = transformToUltimateRiskLinks(sampleLinks, {
      accountingBasis: 'residence',
      selectedSector: 'all',
      selectedInstrument: 'all'
    });
    assert(residenceResult.links.length === sampleLinks.length, 'Residence basis must preserve all baseline links');
    assert(residenceResult.reallocatedCount === 0, 'Residence basis must have 0 reallocated links');

    // Ultimate Risk Look-Through transformation
    const ultimateResult = transformToUltimateRiskLinks(sampleLinks, {
      accountingBasis: 'ultimate_risk',
      selectedSector: 'all',
      selectedInstrument: 'all'
    });
    assert(ultimateResult.links.length > 0, 'Ultimate risk basis links must be generated');
    assert(ultimateResult.bypassedOfcCount > 0, `Should bypass OFC conduit links (bypassed ${ultimateResult.bypassedOfcCount})`);
    assert(ultimateResult.reallocatedCount > 0, `Should reallocate to parent destinations (reallocated ${ultimateResult.reallocatedCount})`);

    // Sector Slicing: Banks only
    const banksResult = transformToUltimateRiskLinks(sampleLinks, {
      accountingBasis: 'residence',
      selectedSector: 'banks',
      selectedInstrument: 'all'
    });
    assert(banksResult.links.length === sampleLinks.length, 'Banks sector slice should filter or weight links');
    assert(banksResult.links[0].claims_usd_bn < sampleLinks[0].claims_usd_bn, 'Banks-only claims must be weighted subset of total claims');

    // Instrument Slicing: Loans only
    const loansResult = transformToUltimateRiskLinks(sampleLinks, {
      accountingBasis: 'residence',
      selectedSector: 'all',
      selectedInstrument: 'loans'
    });
    assert(loansResult.links[0].claims_usd_bn < sampleLinks[0].claims_usd_bn, 'Loans-only claims must be weighted subset of total claims');
  }

  // =========================================================================
  // Test 34: Phase 3 Portfolio Stress Overlay Engine (v2.0.0)
  // =========================================================================
  console.log('\nTest 34: Phase 3 Portfolio Stress Overlay Engine (v2.0.0)');
  {
    assert(PORTFOLIO_PRESETS.length >= 3, `Must provide at least 3 institutional portfolio presets (got ${PORTFOLIO_PRESETS.length})`);
    assert(MACRO_STRESS_SCENARIOS.length >= 4, `Must provide at least 4 macro stress scenarios (got ${MACRO_STRESS_SCENARIOS.length})`);

    const defaultPreset = PORTFOLIO_PRESETS[0]; // Global Balanced ($500M)
    assert(defaultPreset.baseAumUsdMn === 500.0, 'Default portfolio AUM must be $500M');
    assert(defaultPreset.positions.length > 0, 'Portfolio positions must be populated');

    // Run baseline stress test under TR Sovereign Crisis
    const stressResult = computePortfolioStressOverlay(defaultPreset, {
      scenarioId: 'tr_sovereign_crisis',
      stressMultiplier: 1.0,
      enableLookThrough: true
    });

    assert(stressResult.baseAumUsdMn === 500.0, 'Stress result must retain base AUM');
    assert(stressResult.totalLossMn > 0, `Total stress loss must be strictly positive (got ${stressResult.totalLossMn}M)`);
    assert(stressResult.portfolioLossPct > 0, `Portfolio loss percentage must be positive (got ${stressResult.portfolioLossPct}%)`);
    assert(stressResult.stressedAumMn < stressResult.baseAumUsdMn, 'Stressed AUM must be strictly less than base AUM');
    assert(stressResult.stressedAumMn > 0, 'Stressed AUM must remain solvent and positive');

    // Mathematical Conservation: Total Loss strictly equals First-Order + Second-Order
    const decomposedLossSum = Math.round((stressResult.firstOrderLossMn + stressResult.secondOrderLossMn) * 10) / 10;
    assert(Math.abs(stressResult.totalLossMn - decomposedLossSum) <= 0.2, 'Direct and cascading losses must sum to total stress loss within rounding');

    // Sensitivity check: 2.0x multiplier must produce strictly higher losses than 1.0x
    const stressResult2x = computePortfolioStressOverlay(defaultPreset, {
      scenarioId: 'tr_sovereign_crisis',
      stressMultiplier: 2.0,
      enableLookThrough: true
    });
    assert(stressResult2x.totalLossMn > stressResult.totalLossMn, '2.0x stress multiplier must yield strictly higher portfolio loss than 1.0x');

    // Look-Through OFC Effect: Positions in KY must be flagged and unpacked
    const kyPos = stressResult.positionResults.find(p => p.country === 'KY');
    assert(kyPos !== undefined, 'KY position must exist in global balanced portfolio');
    assert(kyPos.isLookedThrough === true, 'KY position must have isLookedThrough set to true');

    // Hedging Recommendations
    assert(stressResult.hedgingAdvice.length >= 2, `Hedging recommendations must be generated (got ${stressResult.hedgingAdvice.length})`);
    assert(stressResult.topVictims.length > 0, 'Top victim exposures must be identified');
  }

  // =========================================================================
  // Test 35: Phase 4 Causal Intelligence, Verdict Engine & Guided Storylines (v2.5.0)
  // =========================================================================
  console.log('\nTest 35: Phase 4 Causal Intelligence, Verdict Engine & Guided Storylines (v2.5.0)');
  {
    // 1. Module Verdicts Coverage
    const coreTabs = ['map', 'network', 'routing', 'ews', 'gsib', 'contagion', 'shadow', 'maturity', 'portfolio', 'usd', 'fragmentation'];
    for (const tab of coreTabs) {
      const v = MODULE_VERDICTS[tab];
      assert(v !== undefined, `MODULE_VERDICTS must contain verdict entry for '${tab}'`);
      assert(v.id === tab, `Verdict id for '${tab}' must match tab`);
      assert(typeof v.observation === 'string' && v.observation.length > 10, `Verdict observation for '${tab}' must be substantive`);
      assert(typeof v.mechanism === 'string' && v.mechanism.length > 10, `Verdict mechanism for '${tab}' must be substantive`);
      assert(typeof v.verdict === 'string' && v.verdict.length > 10, `Verdict action for '${tab}' must be substantive`);
      assert(['CRITICAL', 'WARNING', 'INFO'].includes(v.severity), `Verdict severity for '${tab}' must be valid`);
    }

    // Fallback verdict lookup for unknown tab
    const fallbackVerdict = getModuleVerdict('unknown_experimental_tab');
    assert(fallbackVerdict.id === 'unknown_experimental_tab', 'Fallback verdict must adopt requested tabId');
    assert(fallbackVerdict.severity === 'INFO', 'Fallback verdict must default to INFO severity');

    // 2. Causal Knowledge Links
    const mapLinks = getModuleCausalLinks('map');
    assert(Array.isArray(mapLinks.downstream), 'Map module must return downstream causal links array');
    assert(mapLinks.downstream.length > 0, 'Map module must have actionable downstream links');
    const shadowTarget = mapLinks.downstream.find(l => l.tab === 'shadow');
    assert(shadowTarget !== undefined, 'Map module downstream links must include shadow banking');
    assert(typeof shadowTarget.cta === 'string', 'Causal link must declare actionable CTA text');

    const contagionLinks = getModuleCausalLinks('contagion');
    assert(Array.isArray(contagionLinks.upstream), 'Contagion module must have upstream causes');
    assert(contagionLinks.upstream.some(u => u.tab === 'ews'), 'Contagion upstream must link to EWS');
    assert(contagionLinks.downstream.some(d => d.tab === 'portfolio'), 'Contagion downstream must link to Portfolio Stress Overlay');

    // 3. Guided Investigation Playbooks (Storylines)
    assert(Array.isArray(INVESTIGATION_TRACKS), 'INVESTIGATION_TRACKS must be an array');
    assert(INVESTIGATION_TRACKS.length >= 3, `Must provide at least 3 macro mystery tracks (got ${INVESTIGATION_TRACKS.length})`);

    INVESTIGATION_TRACKS.forEach((track, tIdx) => {
      assert(typeof track.id === 'string', `Track ${tIdx} must have string id`);
      assert(typeof track.title === 'string', `Track ${tIdx} must have title`);
      assert(typeof track.description === 'string', `Track ${tIdx} must have description`);
      assert(Array.isArray(track.steps), `Track ${track.id} must have steps array`);
      assert(track.steps.length >= 3, `Track ${track.id} must have at least 3 investigation steps`);

      track.steps.forEach((st, sIdx) => {
        assert(st.stepIndex === sIdx + 1, `Track ${track.id} step index must be sequential`);
        assert(typeof st.tabId === 'string', `Track ${track.id} step ${sIdx + 1} must specify target tabId`);
        assert(typeof st.title === 'string', `Track ${track.id} step ${sIdx + 1} must specify title`);
        assert(typeof st.prompt === 'string', `Track ${track.id} step ${sIdx + 1} must specify prompt guide`);
        assert(typeof st.actionLabel === 'string', `Track ${track.id} step ${sIdx + 1} must specify actionLabel`);
      });
    });
  }

  // =========================================================================
  // Test 36: Phase 5 Live Dynamic Verdicts, Live Clearing-to-Portfolio Bridge & Interactive Hedge Simulation (v3.0.0)
  // =========================================================================
  console.log('\nTest 36: Phase 5 Live Dynamic Verdicts, Live Clearing-to-Portfolio Bridge & Interactive Hedge Simulation (v3.0.0)');
  {
    // 1. Dynamic Module Verdict Engine
    const dynamicMapVerdict = getModuleVerdict('map', {
      dataset,
      selectedQuarter: '2026Q1',
      selectedCountry: null
    });
    assert(dynamicMapVerdict.id === 'map', 'Map verdict must have id map');
    assert(dynamicMapVerdict.isDynamic === true, 'Verdict with dataset context must be marked isDynamic');
    assert(dynamicMapVerdict.observation.includes('47.62T') || dynamicMapVerdict.observation.includes('万亿美元'), 'Observation must include total claims metric');

    // Dynamic country focus verdict
    const dynamicTrVerdict = getModuleVerdict('map', {
      dataset,
      selectedQuarter: '2026Q1',
      selectedCountry: 'TR'
    });
    assert(dynamicTrVerdict.isDynamic === true, 'Country-focused verdict must be dynamic');
    assert(dynamicTrVerdict.observation.includes('TR'), 'Country-focused verdict observation must mention target country TR');
    assert(dynamicTrVerdict.mechanism.includes('TR') || dynamicTrVerdict.verdict.includes('TR'), 'Verdict mechanism or action must mention TR');

    // 2. Playbook State Choreography: Every step must declare valid statePayload
    INVESTIGATION_TRACKS.forEach(track => {
      track.steps.forEach(step => {
        assert(step.statePayload !== undefined && typeof step.statePayload === 'object', `Track ${track.id} step ${step.stepIndex} must have statePayload`);
      });
    });

    // Verify Track 1 step 1 state payload
    const track1Step1 = INVESTIGATION_TRACKS[0].steps[0];
    assert(track1Step1.statePayload.lookThrough === true, 'Track 1 Step 1 must configure lookThrough = true');
    assert(track1Step1.statePayload.country === 'KY', 'Track 1 Step 1 must target country KY');

    // 3. Contagion-to-Portfolio Shock Bridge
    // Run an Eisenberg-Noe clearing scenario
    const clearingOutput = computeClearingScenario({
      dataset,
      quarter: '2026Q1',
      epicenter: 'KY',
      haircutPct: 50
    });
    assert(clearingOutput && clearingOutput.allConverged, 'Clearing output must compute valid losses');

    const liveShockMap = buildLiveClearingShockMap(clearingOutput);
    assert(liveShockMap !== null && typeof liveShockMap === 'object', 'buildLiveClearingShockMap must return valid shock map');
    assert(liveShockMap['KY'] !== undefined, 'Shock map must contain epicenter KY');
    assert(liveShockMap['KY'] >= 0.4, 'Epicenter shock must reflect severe impairment');

    // Portfolio stress test using live custom contagion
    const defaultPortfolio = PORTFOLIO_PRESETS[0];
    const liveStressResult = computePortfolioStressOverlay(defaultPortfolio, {
      scenarioId: 'live_custom_contagion',
      liveClearingShockMap: liveShockMap,
      stressMultiplier: 1.0,
      enableLookThrough: true,
      activeHedges: []
    });

    assert(liveStressResult.scenarioName.includes('实时级联清算'), 'Scenario name must reflect live contagion');
    assert(liveStressResult.totalLossMn > 0, 'Live custom contagion stress must yield positive loss');

    // 4. Institutional Active Hedge Simulation
    assert(Array.isArray(INSTITUTIONAL_HEDGE_CATALOG), 'INSTITUTIONAL_HEDGE_CATALOG must be an array');
    assert(INSTITUTIONAL_HEDGE_CATALOG.length >= 3, 'Must offer at least 3 hedging instruments');

    const hedgedStressResult = computePortfolioStressOverlay(defaultPortfolio, {
      scenarioId: 'tr_sovereign_crisis',
      stressMultiplier: 1.0,
      enableLookThrough: true,
      activeHedges: ['cds_hedge', 'derisk_ofc']
    });

    assert(hedgedStressResult.activeHedges.length === 2, 'Result must record 2 active hedges');
    assert(hedgedStressResult.hedgeCostMn > 0, 'Active hedges must incur positive hedging cost');
    assert(hedgedStressResult.hedgedLossMn < hedgedStressResult.unhedgedLossMn, 'Hedged loss must be strictly lower than unhedged loss');
    assert(hedgedStressResult.netSavedMn > 0, 'Active hedging must deliver strictly positive net capital saved');
    assert(hedgedStressResult.hedgedStressedAumMn > hedgedStressResult.stressedAumMn, 'Hedged stressed AUM must be greater than unhedged stressed AUM');
    assert(hedgedStressResult.hedgedStressVaR99Mn < hedgedStressResult.stressVaR99Mn, 'Hedged VaR99 must be lower than unhedged VaR99');
  }

  console.log('\n===============================================================');
  console.log(`✅ REGRESSION SUITE COMPLETE: ${testsPassed} passed, ${testsFailed} failed.`);
  console.log('===============================================================\n');

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runTestSuite();
