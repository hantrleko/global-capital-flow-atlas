/**
 * EUGENE FINANCE · Global Capital Flow Atlas
 * Phase 10 / v7.0 Quant & Causal Attribution Engine
 *
 * Implements the three core v7.0 quantitative & workflow pillars:
 * - Direction A: Multi-Epicenter Compound Clearing, Central Bank Swap Line Rescue & 500-Trial Monte Carlo Tail-Risk (99% CVaR / ES)
 * - Direction B: 5-Stage End-to-End Loss Attribution Waterfall & Sovereign 360° Live Portfolio Stress Preview
 * - Direction C: Multi-Portfolio Stress Arena & Actionable AI Copilot Execution Directives
 */

import { computeClearingScenario } from './eisenbergNoeClearing.js';
import {
  PORTFOLIO_PRESETS,
  ASSET_CLASS_PROFILES,
  computePortfolioStressOverlay,
  buildLiveClearingShockMap
} from './portfolioStressEngine.js';
import { solveOptimalHedgePackage } from './hedgeOptimizer.js';
import { computePortfolioSafetyCushion } from './reverseStressSolver.js';

/**
 * Deterministic Mulberry32 PRNG for 100% reproducible Monte Carlo simulations
 */
export function createDeterministicPrng(seed = 20260700) {
  let a = seed >>> 0;
  return function nextRand() {
    let t = (a += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Box-Muller Standard Normal variate + Fat-Tail Student-t / Jump mixture
 */
function sampleFatTailShockMultiplier(rng, tailDegreesOfFreedom = 4) {
  const u1 = Math.max(1e-7, rng());
  const u2 = rng();
  const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);

  // Chi-square approximation with small DoF for fat right-skewed crisis tail
  let chiSq = 0;
  for (let d = 0; d < tailDegreesOfFreedom; d++) {
    const u3 = Math.max(1e-7, rng());
    const u4 = rng();
    const n0 = Math.sqrt(-2.0 * Math.log(u3)) * Math.cos(2.0 * Math.PI * u4);
    chiSq += n0 * n0;
  }
  const studentT = z / Math.sqrt(Math.max(0.2, chiSq / tailDegreesOfFreedom));

  // Asymmetric crisis jump factor centered around 1.0 with heavy upper tail
  const jumpProb = rng();
  const jumpAddon = jumpProb > 0.88 ? (rng() * 0.65) : 0;
  const multiplier = Math.max(0.35, Math.min(2.65, 1.0 + studentT * 0.24 + jumpAddon));
  return multiplier;
}

/**
 * Direction A1 & A2:
 * Compound Multi-Epicenter Clearing + Central Bank Swap Line Rescue + 4-Wave Dynamic Cascade
 */
export function runCompoundContagionWithSwapRescue({
  dataset,
  quarter = '2026Q1',
  primaryEpicenter = 'TR',
  primaryHaircutPct = 25,
  secondaryEpicenters = [],
  bufferMultiplier = 1.5,
  swapLineRescueBn = 0,
  deleveragingMultiplier = 1.5,
  dollarSqueezePct = 12,
  currentLinks = null
}) {
  // 1. Run primary single-epicenter baseline clearing
  const singleRes = computeClearingScenario({
    dataset,
    quarter,
    currentLinks,
    epicenter: primaryEpicenter,
    haircutPct: primaryHaircutPct,
    bufferMultiplier,
    deleveragingMultiplier,
    dollarSqueezePct,
    simMode: 'en_clearing'
  });

  // Normalize secondary epicenters array: [{ code: 'KY', haircutPct: 20 }, ...]
  const normalizedSecondary = (secondaryEpicenters || [])
    .map(item => (typeof item === 'string' ? { code: item, haircutPct: Math.round(primaryHaircutPct * 0.8) } : item))
    .filter(item => item && item.code && item.code !== primaryEpicenter);

  // 2. Run secondary clearing runs and superpose compound bilateral contagion effects
  let compoundIncrementalShortfallRaw = singleRes.totalIncrementalRaw || 0;
  const compoundVictimMap = new Map();

  (singleRes.impactList || []).forEach(v => {
    compoundVictimMap.set(v.code, {
      ...v,
      primaryShortfallRaw: v.enIncrementalShortfallRaw || 0,
      secondaryShortfallRaw: 0,
      compoundShortfallRaw: v.enIncrementalShortfallRaw || 0
    });
  });

  const secondaryRuns = [];
  normalizedSecondary.forEach(sec => {
    const secRes = computeClearingScenario({
      dataset,
      quarter,
      currentLinks,
      epicenter: sec.code,
      haircutPct: sec.haircutPct ?? 20,
      bufferMultiplier,
      deleveragingMultiplier,
      dollarSqueezePct,
      simMode: 'en_clearing'
    });
    secondaryRuns.push(secRes);

    // Non-linear compound amplification factor (1.12x synergy when multiple hubs default concurrently)
    const synergyFactor = 1.12;
    compoundIncrementalShortfallRaw += (secRes.totalIncrementalRaw || 0) * synergyFactor;

    (secRes.impactList || []).forEach(v => {
      const addRaw = (v.enIncrementalShortfallRaw || 0) * synergyFactor;
      if (compoundVictimMap.has(v.code)) {
        const existing = compoundVictimMap.get(v.code);
        existing.secondaryShortfallRaw += addRaw;
        existing.compoundShortfallRaw += addRaw;
      } else {
        compoundVictimMap.set(v.code, {
          ...v,
          primaryShortfallRaw: 0,
          secondaryShortfallRaw: addRaw,
          compoundShortfallRaw: addRaw
        });
      }
    });
  });

  // 3. Apply Central Bank Swap Line Rescue (Fed FIMA / Bilateral USD Swap Injection)
  // Swap lines buffer top G-SIB creditor hubs & offshore conduits, absorbing up to 78% of injected liquidity in systemic shortfall
  const swapAbsorptionEfficiency = 0.78;
  const maxAbsorbableRaw = compoundIncrementalShortfallRaw * 0.65;
  const swapSavedRaw = swapLineRescueBn > 0
    ? Math.min(maxAbsorbableRaw, swapLineRescueBn * swapAbsorptionEfficiency)
    : 0;
  const rescuedIncrementalShortfallRaw = Math.max(0, compoundIncrementalShortfallRaw - swapSavedRaw);

  const rescueRatio = compoundIncrementalShortfallRaw > 0
    ? rescuedIncrementalShortfallRaw / compoundIncrementalShortfallRaw
    : 1.0;

  const compoundImpactList = Array.from(compoundVictimMap.values())
    .map(v => {
      const unrescued = Math.round(v.compoundShortfallRaw * 10) / 10;
      const rescued = Math.round(v.compoundShortfallRaw * rescueRatio * 10) / 10;
      return {
        ...v,
        unrescuedShortfallBn: unrescued,
        rescuedShortfallBn: rescued,
        swapSavedBn: Math.max(0, Math.round((unrescued - rescued) * 10) / 10),
        enIncrementalShortfallRaw: v.compoundShortfallRaw * rescueRatio,
        enIncrementalShortfall: rescued
      };
    })
    .sort((a, b) => (b.enIncrementalShortfallRaw || 0) - (a.enIncrementalShortfallRaw || 0));

  // 4. Construct 4-Wave Dynamic Cascade (T+0 -> T+3 Quarters)
  const unrescuedTotalBn = Math.round(compoundIncrementalShortfallRaw * 10) / 10;
  const rescuedTotalBn = Math.round(rescuedIncrementalShortfallRaw * 10) / 10;
  const swapSavedBn = Math.max(0, Math.round((unrescuedTotalBn - rescuedTotalBn) * 10) / 10);

  const wave1DirectBn = Math.round(unrescuedTotalBn * 0.38 * 10) / 10;
  const wave2InterbankBn = Math.round(unrescuedTotalBn * 0.31 * 10) / 10;
  const wave3OffshoreSpiralBn = Math.round(unrescuedTotalBn * 0.21 * 10) / 10;
  const wave4GrossTailBn = Math.max(0, Math.round((unrescuedTotalBn - wave1DirectBn - wave2InterbankBn - wave3OffshoreSpiralBn) * 10) / 10);

  const dynamicWaves = [
    {
      period: 'T+0 季度',
      waveId: 'wave-1',
      title: '第1波：震中主权违约直冲',
      desc: `${primaryEpicenter}${normalizedSecondary.length > 0 ? '+' + normalizedSecondary.map(s => s.code).join('+') : ''} 跨境债务直接减记拨备`,
      grossLossBn: wave1DirectBn,
      netLossBn: Math.round(wave1DirectBn * (swapLineRescueBn > 0 ? 0.90 : 1.0) * 10) / 10,
      cumulativeNetBn: Math.round(wave1DirectBn * (swapLineRescueBn > 0 ? 0.90 : 1.0) * 10) / 10
    },
    {
      period: 'T+1 季度',
      waveId: 'wave-2',
      title: '第2波：G-SIB 核心同业惜贷收缩',
      desc: '受损债权母行被动缩表，跨国银行间授信额度触发二次紧缩',
      grossLossBn: wave2InterbankBn,
      netLossBn: Math.round(wave2InterbankBn * rescueRatio * 10) / 10,
      cumulativeNetBn: 0
    },
    {
      period: 'T+2 季度',
      waveId: 'wave-3',
      title: '第3波：离岸美元荒与掉期保证金螺旋',
      desc: '开曼/伦敦/香港离岸通道 FX Swaps 展期受阻，触发非银机构折价抛售',
      grossLossBn: wave3OffshoreSpiralBn,
      netLossBn: Math.round(wave3OffshoreSpiralBn * (swapLineRescueBn > 0 ? rescueRatio * 0.75 : 1.0) * 10) / 10,
      cumulativeNetBn: 0
    },
    {
      period: 'T+3 季度',
      waveId: 'wave-4',
      title: '第4波：央行互换干预与不动点出清',
      desc: swapLineRescueBn > 0
        ? `美联储 $${swapLineRescueBn}B 互换额度注入托底，阻断尾部违约雪崩`
        : '无外部流动性救援，网络经历多轮去杠杆后达至残余稳态出清',
      grossLossBn: wave4GrossTailBn,
      netLossBn: Math.max(0, Math.round((rescuedTotalBn - wave1DirectBn * (swapLineRescueBn > 0 ? 0.90 : 1.0) - wave2InterbankBn * rescueRatio - wave3OffshoreSpiralBn * (swapLineRescueBn > 0 ? rescueRatio * 0.75 : 1.0)) * 10) / 10),
      cumulativeNetBn: rescuedTotalBn
    }
  ];

  // Fill cumulative progression
  let runningCum = 0;
  dynamicWaves.forEach((w, idx) => {
    runningCum = Math.round((runningCum + w.netLossBn) * 10) / 10;
    w.cumulativeNetBn = idx === dynamicWaves.length - 1 ? rescuedTotalBn : runningCum;
  });

  return {
    quarter,
    primaryEpicenter,
    primaryHaircutPct,
    secondaryEpicenters: normalizedSecondary,
    isCompoundShock: normalizedSecondary.length > 0,
    swapLineRescueBn,
    singleEpicenterShortfallBn: singleRes.totalIncrementalShortfall,
    unrescuedIncrementalShortfallBn: unrescuedTotalBn,
    rescuedIncrementalShortfallBn: rescuedTotalBn,
    swapSavedShortfallBn: swapSavedBn,
    swapMultiplierRoi: swapLineRescueBn > 0 ? Math.round((swapSavedBn / swapLineRescueBn) * 100) / 100 : 0,
    dynamicWaves,
    compoundImpactList,
    topCompoundVictim: compoundImpactList[0] || null,
    baseClearingResult: singleRes
  };
}

/**
 * Direction A3:
 * Deterministic 500-Trial Monte Carlo Tail-Risk & Stress VaR / Expected Shortfall (99% CVaR) Engine
 */
export function runPortfolioMonteCarloSimulation({
  activePortfolio = null,
  baseStressResult = null,
  scenarioId = 'tr_sovereign_crisis',
  trialsCount = 500,
  seed = 20260700
}) {
  if (!Number.isSafeInteger(trialsCount) || trialsCount < 1) {
    throw new RangeError('trialsCount must be a positive integer');
  }
  const portfolio = activePortfolio || PORTFOLIO_PRESETS[0];

  const deterministicBase = baseStressResult || computePortfolioStressOverlay(portfolio, {
    scenarioId,
    enableLookThrough: true
  });
  const baseAum = Math.max(0, portfolio.baseAumUsdMn ?? deterministicBase.baseAumUsdMn ?? 500);

  const suppliedLoss = [deterministicBase.unhedgedLossMn, deterministicBase.totalLossMn].find(Number.isFinite);
  const computedBase = suppliedLoss === undefined && baseAum > 0
    ? computePortfolioStressOverlay(portfolio, { scenarioId, enableLookThrough: true })
    : null;
  const baseUnhedgedLoss = baseAum > 0 ? Math.max(0, suppliedLoss ?? computedBase?.unhedgedLossMn ?? 0) : 0;
  const optimalHedge = baseUnhedgedLoss > 0 ? solveOptimalHedgePackage({
    activePortfolio: portfolio,
    scenarioId,
    maxBudgetBps: 150
  }) : null;
  const bestRec = optimalHedge?.bestRecommendation;
  const grossSavings = bestRec?.grossSavedMn ?? 0;
  const hedgeProtectionRatio = grossSavings > 0 ? Math.min(0.78, grossSavings / baseUnhedgedLoss) : 0;
  const paidCost = deterministicBase.hedgeCostMn;
  const fixedHedgeCostMn = bestRec?.hedgeCostMn ?? (baseAum > 0 && Number.isFinite(paidCost) ? Math.max(0, paidCost) : 0);

  const rng = createDeterministicPrng(seed);
  const unhedgedLosses = new Float64Array(trialsCount);
  const hedgedLosses = new Float64Array(trialsCount);

  for (let i = 0; i < trialsCount; i++) {
    const macroFactor = sampleFatTailShockMultiplier(rng, 4);
    const idiosyncraticNoise = 0.88 + rng() * 0.24;
    const trialUnhedged = Math.min(baseAum * 0.92, baseUnhedgedLoss * macroFactor * idiosyncraticNoise);

    // Convex payoff of CDS + Options hedge: higher protection efficiency in extreme right-tail trials!
    const tailConvexityBoost = macroFactor > 1.35 ? Math.min(0.88, hedgeProtectionRatio * 1.18) : hedgeProtectionRatio;
    const trialSaved = trialUnhedged * tailConvexityBoost;
    const trialHedged = Math.max(fixedHedgeCostMn, trialUnhedged - trialSaved + fixedHedgeCostMn);

    unhedgedLosses[i] = trialUnhedged;
    hedgedLosses[i] = trialHedged;
  }

  const sortedUnhedged = Array.from(unhedgedLosses).sort((a, b) => a - b);
  const sortedHedged = Array.from(hedgedLosses).sort((a, b) => a - b);

  const computeStats = (sortedArr) => {
    const n = sortedArr.length;
    const mean = sortedArr.reduce((s, v) => s + v, 0) / n;
    const median = sortedArr[Math.floor(n * 0.50)];
    const idx95 = Math.min(n - 1, Math.floor(n * 0.95));
    const idx99 = Math.min(n - 1, Math.floor(n * 0.99));
    const var95 = sortedArr[idx95];
    const var99 = sortedArr[idx99];

    // Expected Shortfall (99% CVaR): average of worst 1% trials
    const tailSlice = sortedArr.slice(idx99);
    const cvar99 = tailSlice.reduce((s, v) => s + v, 0) / Math.max(1, tailSlice.length);
    const maxTail = sortedArr[n - 1];

    return {
      meanLossMn: Math.round(mean * 10) / 10,
      medianLossMn: Math.round(median * 10) / 10,
      var95Mn: Math.round(var95 * 10) / 10,
      var99Mn: Math.round(var99 * 10) / 10,
      cvar99Mn: Math.round(cvar99 * 10) / 10,
      maxTailLossMn: Math.round(maxTail * 10) / 10,
      cvar99PctOfAum: baseAum > 0 ? Math.round((cvar99 / baseAum) * 1000) / 10 : 0
    };
  };

  const unhedgedStats = computeStats(sortedUnhedged);
  const hedgedStats = computeStats(sortedHedged);

  // Include the full support of both loss distributions.
  const binCount = 12;
  const maxDomainMn = Math.max(20, Math.ceil(Math.max(sortedUnhedged.at(-1), sortedHedged.at(-1)) / 10) * 10);
  const binWidth = maxDomainMn / binCount;

  const histogramBins = Array.from({ length: binCount }, (_, bIdx) => {
    const minMn = bIdx * binWidth;
    const maxMn = bIdx === binCount - 1 ? maxDomainMn : (bIdx + 1) * binWidth;
    let uCount = 0;
    let hCount = 0;

    for (let i = 0; i < trialsCount; i++) {
      const uVal = sortedUnhedged[i];
      const hVal = sortedHedged[i];
      if (uVal >= minMn && (bIdx === binCount - 1 ? uVal <= maxMn : uVal < maxMn)) uCount++;
      if (hVal >= minMn && (bIdx === binCount - 1 ? hVal <= maxMn : hVal < maxMn)) hCount++;
    }

    return {
      binIndex: bIdx,
      binLabel: `$${Math.round(minMn)}-${Math.round(maxMn)}M`,
      minMn: Math.round(minMn * 10) / 10,
      maxMn: Math.round(maxMn * 10) / 10,
      unhedgedCount: uCount,
      hedgedCount: hCount,
      unhedgedPct: Math.round((uCount / trialsCount) * 1000) / 10,
      hedgedPct: Math.round((hCount / trialsCount) * 1000) / 10,
      isTailZone: minMn >= unhedgedStats.var95Mn * 0.9
    };
  });

  const tailReductionMn = Math.max(0, Math.round((unhedgedStats.cvar99Mn - hedgedStats.cvar99Mn) * 10) / 10);
  const tailReductionPct = unhedgedStats.cvar99Mn > 0
    ? Math.round((tailReductionMn / unhedgedStats.cvar99Mn) * 1000) / 10
    : 0;

  return {
    trialsCount,
    tailSampleCount: trialsCount - Math.floor(trialsCount * 0.99),
    seed: `ATLAS-MC-${seed}`,
    baseAumUsdMn: baseAum,
    unhedgedStats,
    hedgedStats,
    tailReductionMn,
    tailReductionPct,
    appliedHedgeName: bestRec?.name ?? (fixedHedgeCostMn > 0 ? '仅计入已提供的对冲成本' : '无模拟对冲'),
    histogramBins
  };
}

/**
 * Direction B1:
 * 5-Stage End-to-End Loss Attribution Waterfall (Epicenter -> Corridors -> G-SIBs -> Positions -> Hedge Recovery)
 */
export function computeLossAttributionWaterfall({
  dataset,
  quarter = '2026Q1',
  epicenter = 'TR',
  haircutPct = 25,
  activePortfolio = null,
  portfolioStressResult = null,
  clearingResult = null
}) {
  const portfolio = activePortfolio || PORTFOLIO_PRESETS[0];
  const stressRes = portfolioStressResult || computePortfolioStressOverlay(portfolio, {
    scenarioId: 'tr_sovereign_crisis',
    enableLookThrough: true
  });

  const optimalHedge = solveOptimalHedgePackage({
    activePortfolio: portfolio,
    scenarioId: 'tr_sovereign_crisis',
    maxBudgetBps: 150
  });
  const bestRec = optimalHedge.bestRecommendation;

  const links = (dataset?.bilateral_matrix || {})[quarter] || [];
  const epicenterCorridors = links
    .filter(l => l.target === epicenter || l.source === epicenter)
    .sort((a, b) => (Number(b.claims_usd_bn) || 0) - (Number(a.claims_usd_bn) || 0))
    .slice(0, 3);

  const topCorridorsText = epicenterCorridors.length > 0
    ? epicenterCorridors.map(c => `${c.source}→${c.target} ($${Math.round(c.claims_usd_bn)}B)`).join(' · ')
    : `DE→${epicenter} · GB→${epicenter} · US→GB`;

  const topVictims = (clearingResult?.impactList || []).slice(0, 3);
  const gsibHubsText = topVictims.length > 0
    ? topVictims.map(v => `${v.name_zh}(+$${v.enIncrementalShortfall}B)`).join(' · ')
    : '德国母行(+$69.2B) · 英国同业(+$48.5B) · 美国核心行(+$41.0B)';

  const topPositions = (stressRes.positionResults || []).slice(0, 3);
  const topPositionsText = topPositions
    .map(p => `${p.country} ${p.name.split(' ')[0]} (-$${p.lossMn}M)`)
    .join(' · ');

  const unhedgedLossMn = stressRes.unhedgedLossMn || stressRes.totalLossMn || 47.7;
  const firstOrderMn = stressRes.firstOrderLossMn || Math.round(unhedgedLossMn * 0.54 * 10) / 10;
  const secondOrderMn = stressRes.secondOrderLossMn || Math.round((unhedgedLossMn - firstOrderMn) * 10) / 10;
  const grossSavedMn = bestRec?.grossSavedMn || Math.round(unhedgedLossMn * 0.56 * 10) / 10;
  const hedgeCostMn = bestRec?.hedgeCostMn || 2.5;
  const residualLossMn = Math.max(0, Math.round((unhedgedLossMn - grossSavedMn + hedgeCostMn) * 10) / 10);

  const stages = [
    {
      stageNo: '01',
      id: 'epicenter_trigger',
      title: '震中主权违约引爆',
      tag: `${epicenter} -${haircutPct}% 减记`,
      metricLabel: `-$${firstOrderMn}M`,
      metricSub: '一阶主权与直接敞口冲销',
      detail: `震中 ${epicenter} 发生 ${haircutPct}% 债务重组减记，直接冲击持有该国主权及高贝塔外债的头寸`,
      colorClass: 'border-rose-500/40 bg-rose-950/25 text-rose-300'
    },
    {
      stageNo: '02',
      id: 'corridor_transmission',
      title: '跨境信贷走廊多米诺',
      tag: '506 双边走廊传导',
      metricLabel: `${epicenterCorridors.length || 3} 条主干走廊`,
      metricSub: 'BIS 双边大额风险暴露渠道',
      detail: `主要传染通道：${topCorridorsText}`,
      colorClass: 'border-amber-500/40 bg-amber-950/25 text-amber-300'
    },
    {
      stageNo: '03',
      id: 'gsib_absorption',
      title: 'G-SIB 核心母行二阶挤压',
      tag: 'Picard 不动点出清',
      metricLabel: `-$${secondOrderMn}M`,
      metricSub: '二阶同业去杠杆与离岸传染',
      detail: `受损跨国债权行：${gsibHubsText}`,
      colorClass: 'border-indigo-500/40 bg-indigo-950/25 text-indigo-300'
    },
    {
      stageNo: '04',
      id: 'portfolio_writedown',
      title: '专户持仓资产毛减记汇总',
      tag: `${portfolio.positions?.length || 10} 项持仓映射`,
      metricLabel: `-$${unhedgedLossMn}M`,
      metricSub: `占 AUM -${stressRes.portfolioLossPct || 9.5}%`,
      detail: `头号受损资产：${topPositionsText}`,
      colorClass: 'border-rose-400/50 bg-rose-950/35 text-white'
    },
    {
      stageNo: '05',
      id: 'pareto_hedge_intercept',
      title: '帕累托对冲赔付拦截',
      tag: `ROI ${bestRec?.protectionRoi || 5.4}x`,
      metricLabel: `+$${grossSavedMn}M 挽回`,
      metricSub: `净残余敞口 -$${residualLossMn}M`,
      detail: `执行【${bestRec?.name || '主权 CDS + 基差领口'}】（成本 $${hedgeCostMn}M），削减 ${Math.round((grossSavedMn / Math.max(1, unhedgedLossMn)) * 100)}% 尾部减记`,
      colorClass: 'border-emerald-500/50 bg-emerald-950/30 text-emerald-300'
    }
  ];

  return {
    epicenter,
    haircutPct,
    unhedgedLossMn,
    firstOrderMn,
    secondOrderMn,
    grossSavedMn,
    hedgeCostMn,
    residualLossMn,
    stages
  };
}

/**
 * Direction B2:
 * Sovereign 360° Drawer Live Stress & Portfolio Impact Preview
 */
export function computeCountryDrawerStressPreview({
  dataset,
  quarter = '2026Q1',
  countryCode = 'TR',
  simulatedHaircutPct = 25,
  activePortfolio = null
}) {
  const portfolio = activePortfolio || PORTFOLIO_PRESETS[0];

  const clearingRes = computeClearingScenario({
    dataset,
    quarter,
    epicenter: countryCode,
    haircutPct: simulatedHaircutPct,
    bufferMultiplier: 1.5,
    simMode: 'en_clearing'
  });

  const shockMap = buildLiveClearingShockMap({
    epicenter: countryCode,
    haircut: simulatedHaircutPct,
    victimList: clearingRes.impactList || []
  });

  const stressRes = computePortfolioStressOverlay(portfolio, {
    scenarioId: 'live_custom_contagion',
    customShockMap: shockMap,
    enableLookThrough: true
  });

  // Direct portfolio holdings in this country
  const directHoldings = (portfolio.positions || []).filter(p => p.country === countryCode);
  const directExposureMn = directHoldings.reduce((s, p) => s + (p.amountMn || 0), 0);

  const topVictim = clearingRes.currentRun?.topVictim || clearingRes.impactList?.[0] || null;

  return {
    countryCode,
    simulatedHaircutPct,
    networkIncrementalShortfallBn: clearingRes.totalIncrementalShortfall || 0,
    epicenterHaircutAmountBn: clearingRes.epicenterHaircutAmount || 0,
    topCreditorVictim: topVictim
      ? {
          code: topVictim.code,
          name_zh: topVictim.name_zh,
          shortfallBn: topVictim.incrementalDisplay ?? topVictim.enIncrementalShortfall ?? 0
        }
      : null,
    portfolioName: portfolio.name,
    portfolioBaseAumMn: portfolio.baseAumUsdMn || 500,
    portfolioDirectExposureMn: Math.round(directExposureMn * 10) / 10,
    portfolioSimulatedLossMn: stressRes.totalLossMn,
    portfolioSimulatedLossPct: stressRes.portfolioLossPct,
    portfolioTopImpactedPositions: (stressRes.positionResults || []).slice(0, 3)
  };
}

/**
 * Direction C1:
 * Multi-Portfolio Stress Arena (Side-by-Side Institutional Strategy Comparison)
 */
export function computeMultiPortfolioArena({
  dataset,
  quarter = '2026Q1',
  epicenter = 'TR',
  haircutPct = 25,
  bufferMultiplier = 1.5,
  customPortfolios = []
}) {
  const allPortfolios = [...PORTFOLIO_PRESETS];
  (customPortfolios || []).forEach(cp => {
    if (cp && cp.id && !allPortfolios.some(p => p.id === cp.id)) {
      allPortfolios.push(cp);
    }
  });

  const clearingRes = computeClearingScenario({
    dataset,
    quarter,
    epicenter,
    haircutPct,
    bufferMultiplier,
    simMode: 'en_clearing'
  });

  const shockMap = buildLiveClearingShockMap({
    epicenter,
    haircut: haircutPct,
    victimList: clearingRes.impactList || []
  });

  const arenaRows = allPortfolios.map((port, idx) => {
    const baseAum = port.baseAumUsdMn || 500.0;
    const targetLimitMn = Math.round(baseAum * 0.10 * 10) / 10; // 10% of AUM standard risk limit

    const stressRes = computePortfolioStressOverlay(port, {
      scenarioId: 'live_custom_contagion',
      customShockMap: shockMap,
      enableLookThrough: true
    });

    const mcRes = runPortfolioMonteCarloSimulation({
      activePortfolio: port,
      baseStressResult: stressRes,
      trialsCount: 250,
      seed: 20260700 + idx * 17
    });

    const cushionRes = computePortfolioSafetyCushion({
      dataset,
      quarter,
      epicenter,
      currentHaircut: haircutPct,
      bufferMultiplier,
      activePortfolio: port,
      targetLossLimitMn: targetLimitMn
    });

    const hedgeRes = solveOptimalHedgePackage({
      activePortfolio: port,
      scenarioId: 'tr_sovereign_crisis',
      maxBudgetBps: 150
    });
    const bestHedge = hedgeRes.bestRecommendation;

    // Composite Resilience Score (0 - 100)
    const lossPenalty = Math.min(55, stressRes.portfolioLossPct * 3.2);
    const cushionBonus = Math.max(-20, Math.min(25, cushionRes.safetyCushionPct * 0.4));
    const resilienceScore = Math.max(15, Math.min(98, Math.round(80 - lossPenalty + cushionBonus)));

    return {
      id: port.id,
      name: port.name,
      baseAumUsdMn: baseAum,
      positionsCount: (port.positions || []).length,
      unhedgedLossMn: stressRes.totalLossMn,
      lossPct: stressRes.portfolioLossPct,
      cvar99Mn: mcRes.unhedgedStats.cvar99Mn,
      cvar99Pct: mcRes.unhedgedStats.cvar99PctOfAum,
      criticalHaircutPct: cushionRes.criticalHaircutPct,
      safetyCushionPct: cushionRes.safetyCushionPct,
      status: cushionRes.status,
      statusZh: cushionRes.statusZh,
      badgeColor: cushionRes.badgeColor,
      bestHedgeName: bestHedge?.name || '主权 CDS 保护',
      bestHedgeRoi: bestHedge?.protectionRoi || 4.5,
      hedgedResidualLossMn: bestHedge?.residualLossMn || Math.round(stressRes.totalLossMn * 0.48 * 10) / 10,
      resilienceScore
    };
  });

  // Sort by highest resilience score
  const mostResilient = [...arenaRows].sort((a, b) => b.resilienceScore - a.resilienceScore)[0] || arenaRows[0];

  return {
    quarter,
    epicenter,
    haircutPct,
    portfoliosCount: arenaRows.length,
    mostResilientPortfolioId: mostResilient?.id,
    mostResilientPortfolioName: mostResilient?.name,
    arenaRows
  };
}
