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
  resolveCountryReserves,
  resolveJurisdictionLiability,
  verifyFixedPointClearingVector,
  resolveCountryInputs,
  solvePicardFixedPoint,
  CLEARING_VERSION_REGISTRY
} from '../src/utils/eisenbergNoeClearing.js';

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

  console.log('\n===============================================================');
  console.log(`✅ REGRESSION SUITE COMPLETE: ${testsPassed} passed, ${testsFailed} failed.`);
  console.log('===============================================================\n');

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runTestSuite();
