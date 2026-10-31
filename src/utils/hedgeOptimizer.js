/**
 * EUGENE FINANCE · Global Capital Flow Atlas
 * Pareto Optimal Hedge Solver & Prescription Engine (v6.0)
 * 
 * Computes the Pareto efficiency frontier of hedging strategies subject to
 * budget constraints (bps of AUM), maximizing capital preserved per basis point of cost.
 */

import {
  computePortfolioStressOverlay,
  INSTITUTIONAL_HEDGE_CATALOG,
  PORTFOLIO_PRESETS
} from './portfolioStressEngine.js';

export const EXPANDED_HEDGE_CATALOG = [
  ...INSTITUTIONAL_HEDGE_CATALOG,
  {
    id: 'gold_tail_hedge',
    title: '黄金尾部风险对冲 (Macro Gold Tail Put/Call)',
    desc: '配置宏观避险黄金期权领口，平滑全资产类别尾部系统性极端减记 30%',
    costRate: 0.003, // 30 bps
    efficiency: 0.30,
    targetAssetClass: 'all'
  }
];

/**
 * Solves for the Pareto-optimal hedge package under budget constraints.
 */
export function solveOptimalHedgePackage({
  activePortfolio = null,
  scenarioId = 'tr_sovereign_crisis',
  customShockMap = null,
  maxBudgetBps = 150, // Max acceptable hedge cost in basis points (e.g. 1.5% = 150 bps)
  minProtectionPct = 20.0, // Minimum loss reduction target %
  stressMultiplier = 1.0,
  enableLookThrough = true
}) {
  const portfolio = activePortfolio || PORTFOLIO_PRESETS[0];
  const aum = portfolio.baseAumUsdMn || 500.0;

  // 1. Compute Unhedged Baseline Loss
  const unhedgedResult = computePortfolioStressOverlay(portfolio, {
    scenarioId,
    customShockMap,
    stressMultiplier,
    enableLookThrough,
    activeHedges: []
  });
  const baselineLossMn = unhedgedResult.totalLossMn;

  const hedgeIds = EXPANDED_HEDGE_CATALOG.map(h => h.id);
  const n = hedgeIds.length;
  const numCombinations = 1 << n; // 2^n combinations

  const candidates = [];

  for (let mask = 0; mask < numCombinations; mask++) {
    const subset = [];
    let totalCostRate = 0;
    for (let i = 0; i < n; i++) {
      if ((mask & (1 << i)) !== 0) {
        subset.push(hedgeIds[i]);
        totalCostRate += EXPANDED_HEDGE_CATALOG[i].costRate;
      }
    }

    const costBps = Math.round(totalCostRate * 10000);
    const hedgeCostMn = Math.round(aum * totalCostRate * 10) / 10;

    // Run stressed portfolio overlay with this active hedge combination
    const hedgedResult = computePortfolioStressOverlay(portfolio, {
      scenarioId,
      customShockMap,
      stressMultiplier,
      enableLookThrough,
      activeHedges: subset
    });

    const residualLossMn = hedgedResult.hedgedLossMn;
    const grossSavedMn = Math.max(0, Math.round((baselineLossMn - residualLossMn) * 10) / 10);
    const netSavedMn = Math.round((grossSavedMn - hedgeCostMn) * 10) / 10;
    const protectionPct = baselineLossMn > 0 ? Math.round((grossSavedMn / baselineLossMn) * 1000) / 10 : 0;
    const protectionRoi = hedgeCostMn > 0 ? Math.round((grossSavedMn / hedgeCostMn) * 100) / 100 : 0;

    const hedgeTitles = subset.map(id => {
      const found = EXPANDED_HEDGE_CATALOG.find(h => h.id === id);
      return found ? found.title.split(' (')[0] : id;
    });

    candidates.push({
      id: subset.length === 0 ? 'unhedged' : subset.join('+'),
      name: subset.length === 0 ? '零对冲裸露 (No Hedge)' : hedgeTitles.join(' + '),
      hedgeIds: subset,
      count: subset.length,
      costBps,
      hedgeCostMn,
      baselineLossMn,
      residualLossMn,
      grossSavedMn,
      netSavedMn,
      protectionPct,
      protectionRoi,
      withinBudget: costBps <= maxBudgetBps,
      meetsProtectionTarget: protectionPct >= minProtectionPct
    });
  }

  // Identify Pareto Frontier among valid budget candidates
  // A candidate is Pareto efficient if no other candidate has both lower cost and higher netSavedMn
  const feasible = candidates.filter(c => c.withinBudget);
  feasible.forEach(c => {
    const dominated = feasible.some(other =>
      other.id !== c.id &&
      other.costBps <= c.costBps &&
      other.netSavedMn > c.netSavedMn
    );
    c.isParetoOptimal = !dominated;
  });

  // Rank recommendations:
  // 1. Must be Pareto optimal
  // 2. Highest netSavedMn
  // 3. If tied, highest ROI
  const sortedPareto = [...feasible]
    .filter(c => c.isParetoOptimal && c.count > 0)
    .sort((a, b) => b.netSavedMn - a.netSavedMn || b.protectionRoi - a.protectionRoi);

  const bestRecommendation = sortedPareto[0] || feasible[0] || candidates[0];

  return {
    portfolioName: portfolio.name,
    aumMn: aum,
    baselineLossMn,
    maxBudgetBps,
    minProtectionPct,
    bestRecommendation,
    paretoFrontier: sortedPareto,
    allCandidates: candidates.sort((a, b) => a.costBps - b.costBps)
  };
}
