/**
 * EUGENE FINANCE · Global Capital Flow Atlas
 * Reverse Stress Testing Solver (v5.5 / v6.0)
 * 
 * Implements binary search root-finding to reverse-engineer:
 * 1. Critical Haircut (alpha*): Break-point epicenter loss rate where portfolio hits risk limit.
 * 2. Safety Cushion (Delta alpha): Distance between current shock and breaking point.
 * 3. Historical Crisis Replay Matrix (2008, 2011, 2020, Current).
 */

import { computeClearingScenario } from './eisenbergNoeClearing.js';
import {
  computePortfolioStressOverlay,
  buildLiveClearingShockMap,
  PORTFOLIO_PRESETS
} from './portfolioStressEngine.js';

/**
 * Solves for the critical epicenter haircut percentage (alpha*) that causes
 * the portfolio to breach a given loss threshold (in USD Millions).
 */
export function solvePortfolioCriticalHaircut({
  dataset,
  quarter = '2026Q1',
  epicenter = 'TR',
  bufferMultiplier = 1.5,
  activePortfolio = null,
  targetLossLimitMn = 50.0,
  maxIterations = 10,
  toleranceMn = 0.5
}) {
  const portfolio = activePortfolio || PORTFOLIO_PRESETS[0];
  const maxLossCapMn = portfolio.baseAumUsdMn || 500.0;
  const targetLoss = Math.min(maxLossCapMn, Math.max(1.0, targetLossLimitMn));

  let low = 1.0;
  let high = 100.0;
  let bestHaircut = 100.0;
  let bestLoss = 0;
  let iterations = 0;

  while (iterations < maxIterations && (high - low) > 0.5) {
    iterations++;
    const mid = (low + high) / 2;

    const clearingRes = computeClearingScenario({
      dataset,
      quarter,
      epicenter,
      haircutPct: mid,
      bufferMultiplier,
      simMode: 'en_clearing'
    });

    const shockMap = buildLiveClearingShockMap({
      epicenter,
      haircut: mid,
      victimList: clearingRes.impactList || clearingRes.jurisdictionImpacts || []
    });

    const stressRes = computePortfolioStressOverlay(portfolio, {
      scenarioId: 'live_custom_contagion',
      customShockMap: shockMap,
      stressMultiplier: 1.0,
      enableLookThrough: true,
      activeHedges: []
    });

    const loss = stressRes.totalLossMn;
    bestHaircut = mid;
    bestLoss = loss;

    if (Math.abs(loss - targetLoss) <= toleranceMn) {
      break;
    }

    if (loss < targetLoss) {
      low = mid;
    } else {
      high = mid;
    }
  }

  const criticalHaircutPct = Math.round(bestHaircut * 10) / 10;
  return {
    criticalHaircutPct,
    criticalLossMn: Math.round(bestLoss * 10) / 10,
    targetLossLimitMn: targetLoss,
    iterations
  };
}

/**
 * Computes safety margin metrics given current scenario and target risk limits.
 */
export function computePortfolioSafetyCushion({
  dataset,
  quarter = '2026Q1',
  epicenter = 'TR',
  currentHaircut = 25,
  bufferMultiplier = 1.5,
  activePortfolio = null,
  targetLossLimitMn = 50.0
}) {
  const root = solvePortfolioCriticalHaircut({
    dataset,
    quarter,
    epicenter,
    bufferMultiplier,
    activePortfolio,
    targetLossLimitMn
  });

  const safetyCushionPct = Math.round((root.criticalHaircutPct - currentHaircut) * 10) / 10;
  let status = 'SAFE'; // 'SAFE' | 'WARNING' | 'BREACHED'
  let statusZh = '安全';
  let badgeColor = 'border-emerald-500/40 bg-emerald-950/50 text-emerald-300';

  if (safetyCushionPct < 0) {
    status = 'BREACHED';
    statusZh = '已破防击穿';
    badgeColor = 'border-rose-500/50 bg-rose-950/60 text-rose-300';
  } else if (safetyCushionPct <= 10) {
    status = 'WARNING';
    statusZh = '临界预警';
    badgeColor = 'border-amber-500/40 bg-amber-950/50 text-amber-300';
  }

  return {
    ...root,
    currentHaircut,
    safetyCushionPct,
    status,
    statusZh,
    badgeColor
  };
}

/**
 * Canonical Historical Crisis Replay Scenarios
 */
export const HISTORICAL_CRISIS_PRESETS = [
  {
    id: 'gfc_2008',
    name: '2008Q4 雷曼兄弟倒闭 (GFC Lehman Freeze)',
    labelZh: '2008 全球金融危机',
    quarter: '2008Q4',
    epicenter: 'US',
    haircut: 45,
    bufferMultiplier: 0.8,
    desc: '全球最大投行破产导致批发融资链冻结与无差别去杠杆踩踏'
  },
  {
    id: 'euro_2011',
    name: '2011Q4 欧债主权违约危机 (Eurozone Sovereign Debt)',
    labelZh: '2011 欧债危机',
    quarter: '2011Q4',
    epicenter: 'IT',
    haircut: 35,
    bufferMultiplier: 1.0,
    desc: '南欧边缘国家主权息差失控，引发跨国核心行主权信贷减记'
  },
  {
    id: 'covid_2020',
    name: '2020Q1 疫情离岸美元挤兑 (COVID-19 Dash for Cash)',
    labelZh: '2020 离岸美元荒',
    quarter: '2020Q1',
    epicenter: 'GB',
    haircut: 25,
    bufferMultiplier: 1.2,
    desc: '跨境实体与跨国基金恐慌性囤积美元现金，外汇掉期基差急剧走阔'
  }
];

/**
 * Evaluates current portfolio across historical crisis periods vs current active shock.
 */
export function computeHistoricalCrisisReplay({
  dataset,
  activePortfolio = null,
  currentEpicenter = 'TR',
  currentHaircut = 25,
  currentBuffer = 1.5,
  targetLossLimitMn = 50.0
}) {
  const portfolio = activePortfolio || PORTFOLIO_PRESETS[0];

  const results = HISTORICAL_CRISIS_PRESETS.map(crisis => {
    // Run clearing scenario for this crisis epicenter
    const clearing = computeClearingScenario({
      dataset,
      quarter: '2026Q1', // Use canonical connectivity with crisis epicenter
      epicenter: crisis.epicenter,
      haircutPct: crisis.haircut,
      bufferMultiplier: crisis.bufferMultiplier,
      simMode: 'en_clearing'
    });

    const shockMap = buildLiveClearingShockMap({
      epicenter: crisis.epicenter,
      haircut: crisis.haircut,
      victimList: clearing.impactList || clearing.jurisdictionImpacts || []
    });

    const stress = computePortfolioStressOverlay(portfolio, {
      scenarioId: 'live_custom_contagion',
      customShockMap: shockMap,
      stressMultiplier: 1.0,
      enableLookThrough: true,
      activeHedges: []
    });

    return {
      id: crisis.id,
      name: crisis.name,
      labelZh: crisis.labelZh,
      epicenter: crisis.epicenter,
      haircut: crisis.haircut,
      bufferMultiplier: crisis.bufferMultiplier,
      desc: crisis.desc,
      totalLossMn: stress.totalLossMn,
      lossPct: stress.portfolioLossPct,
      stressVaR99Mn: stress.stressVaR99Mn,
      isBreached: stress.totalLossMn >= targetLossLimitMn,
      cushionMn: Math.round((targetLossLimitMn - stress.totalLossMn) * 10) / 10
    };
  });

  // Also include current active shock
  const currentClearing = computeClearingScenario({
    dataset,
    quarter: '2026Q1',
    epicenter: currentEpicenter,
    haircutPct: currentHaircut,
    bufferMultiplier: currentBuffer,
    simMode: 'en_clearing'
  });

  const currentShockMap = buildLiveClearingShockMap({
    epicenter: currentEpicenter,
    haircut: currentHaircut,
    victimList: currentClearing.impactList || currentClearing.jurisdictionImpacts || []
  });

  const currentStress = computePortfolioStressOverlay(portfolio, {
    scenarioId: 'live_custom_contagion',
    customShockMap: currentShockMap,
    stressMultiplier: 1.0,
    enableLookThrough: true,
    activeHedges: []
  });

  const currentResult = {
    id: 'current_active',
    name: `当前自定义冲击 (${currentEpicenter} -${currentHaircut}%)`,
    labelZh: '当前设定冲击',
    epicenter: currentEpicenter,
    haircut: currentHaircut,
    bufferMultiplier: currentBuffer,
    desc: '当前清算模拟器设定的震中主权减记与缓冲乘数',
    totalLossMn: currentStress.totalLossMn,
    lossPct: currentStress.portfolioLossPct,
    stressVaR99Mn: currentStress.stressVaR99Mn,
    isBreached: currentStress.totalLossMn >= targetLossLimitMn,
    cushionMn: Math.round((targetLossLimitMn - currentStress.totalLossMn) * 10) / 10
  };

  return {
    portfolioName: portfolio.name,
    baseAumUsdMn: portfolio.baseAumUsdMn,
    targetLossLimitMn,
    scenarios: [...results, currentResult]
  };
}
