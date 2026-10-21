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

  console.log('\n===============================================================');
  console.log(`✅ REGRESSION SUITE COMPLETE: ${testsPassed} passed, ${testsFailed} failed.`);
  console.log('===============================================================\n');

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runTestSuite();
