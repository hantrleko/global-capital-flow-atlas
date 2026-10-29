/**
 * EUGENE FINANCE Global Capital Flow Atlas - Phase 3 Engine
 * Portfolio Stress Overlay (我的组合压力映射引擎)
 * 
 * Translates public BIS macro network exposures & Eisenberg-Noe systemic clearing 
 * into institution-specific portfolio risk control, stress VaR, and hedging metrics.
 * 
 * Theoretical Framework:
 * - Macro Network Contagion: Eisenberg & Noe (2001) Systemic Risk Clearing
 * - Portfolio Stress Mapping: Basel Committee on Banking Supervision (BCBS) 
 *   Stress Testing Principles (2018) & BIS Working Papers No. 894
 * - Asset Class Beta Adjustments & Ultimate Risk Look-Through Veiling
 */

import { OFC_LOOK_THROUGH_WEIGHTS } from './lookThroughEngine.js';

// Default Institutional Portfolio Presets
export const PORTFOLIO_PRESETS = [
  {
    id: 'global_macro_balanced',
    name: '全球平衡多资产组合 (Global Multi-Asset Balanced)',
    desc: '面向主权财富基金与跨资产对冲基金的标准全球配置，覆盖 G10 核心资产与高贝塔新兴市场',
    baseAumUsdMn: 500.0,
    currency: 'USD',
    positions: [
      { id: 'pos-1', name: '美国科技股权与美债 (US Equities & Treasuries)', country: 'US', assetClass: 'sovereign_debt', weight: 0.25, amountMn: 125.0 },
      { id: 'pos-2', name: '标普 500 核心指数多头 (S&P 500 Large-Cap)', country: 'US', assetClass: 'equities', weight: 0.15, amountMn: 75.0 },
      { id: 'pos-3', name: '德国联邦国债与法系公债 (DE/FR Sovereign Bunds)', country: 'DE', assetClass: 'sovereign_debt', weight: 0.15, amountMn: 75.0 },
      { id: 'pos-4', name: '欧洲核心跨国银行信贷 (Eurozone G-SIB Credit)', country: 'DE', assetClass: 'corporate_credit', weight: 0.08, amountMn: 40.0 },
      { id: 'pos-5', name: '英国金边国债与金融次级债 (UK Gilts & Sub-Debt)', country: 'GB', assetClass: 'corporate_credit', weight: 0.10, amountMn: 50.0 },
      { id: 'pos-6', name: '土耳其美元外债与主权债券 (TR External Sukuk/Bonds)', country: 'TR', assetClass: 'sovereign_debt', weight: 0.06, amountMn: 30.0 },
      { id: 'pos-7', name: '巴西大宗商品企业债 (BR Petrobras & Mining)', country: 'BR', assetClass: 'corporate_credit', weight: 0.05, amountMn: 25.0 },
      { id: 'pos-8', name: '开曼群岛离岸科技对冲基金 (Cayman Offshore PE/Tech)', country: 'KY', assetClass: 'equities', weight: 0.07, amountMn: 35.0 },
      { id: 'pos-9', name: '新加坡跨国司库与外汇衍生品 (SG FX Swaps & Collateral)', country: 'SG', assetClass: 'fx_derivatives', weight: 0.05, amountMn: 25.0 },
      { id: 'pos-10', name: '日本国债与跨货币基差套息 (JP JGBs & Basis Arbitrage)', country: 'JP', assetClass: 'sovereign_debt', weight: 0.04, amountMn: 20.0 }
    ]
  },
  {
    id: 'bank_treasury_liquidity',
    name: '跨国银行司库自营账户 (G-SIB Bank Treasury & Liquidity Book)',
    desc: '跨国商业银行高流动性资产 (HQLA) 投资组合，严苛受制于巴塞尔协议 III 流动性覆盖率 (LCR)',
    baseAumUsdMn: 2000.0,
    currency: 'USD',
    positions: [
      { id: 'tb-1', name: '美国短期国库券与超额储备 (US T-Bills & Fed Reserves)', country: 'US', assetClass: 'cash_hqla', weight: 0.40, amountMn: 800.0 },
      { id: 'tb-2', name: '德国与法国央行合格抵押品 (Bunds & OAT HQLA)', country: 'DE', assetClass: 'sovereign_debt', weight: 0.25, amountMn: 500.0 },
      { id: 'tb-3', name: '伦敦同业拆借与美元清算垫款 (London Interbank Credit)', country: 'GB', assetClass: 'interbank_loans', weight: 0.15, amountMn: 300.0 },
      { id: 'tb-4', name: '新兴市场主权美元做市头寸 (EM Sovereign Market-Making)', country: 'TR', assetClass: 'sovereign_debt', weight: 0.05, amountMn: 100.0 },
      { id: 'tb-5', name: '东京离岸日元/美元掉期流动性 (Tokyo Cross-Currency Swaps)', country: 'JP', assetClass: 'fx_derivatives', weight: 0.08, amountMn: 160.0 },
      { id: 'tb-6', name: '中国香港转口清算外汇头寸 (HK Clearing FX Balances)', country: 'HK', assetClass: 'interbank_loans', weight: 0.07, amountMn: 140.0 }
    ]
  },
  {
    id: 'em_high_yield_credit',
    name: '新兴市场高收益外债专户 (EM Sovereign & High-Yield Credit)',
    desc: '聚焦前沿与新兴主权外债的高贝塔信用投资组合，对美元流动性收缩及主权展期风险极其敏感',
    baseAumUsdMn: 250.0,
    currency: 'USD',
    positions: [
      { id: 'em-1', name: '土耳其里拉/美元双币种外债 (Turkey External Sovereign Debt)', country: 'TR', assetClass: 'sovereign_debt', weight: 0.30, amountMn: 75.0 },
      { id: 'em-2', name: '巴西主权公债与淡水河谷美元债 (Brazil Sovereign & Mining)', country: 'BR', assetClass: 'corporate_credit', weight: 0.22, amountMn: 55.0 },
      { id: 'em-3', name: '墨西哥国家石油与主权债券 (Mexico Pemex & Sovereign)', country: 'MX', assetClass: 'corporate_credit', weight: 0.18, amountMn: 45.0 },
      { id: 'em-4', name: '印尼大宗商品基础设施外债 (Indonesia Infrastructure USD)', country: 'ID', assetClass: 'corporate_credit', weight: 0.15, amountMn: 37.5 },
      { id: 'em-5', name: '中国离岸中资高收益城投与科技美元债 (China Offshore USD Bonds)', country: 'HK', assetClass: 'corporate_credit', weight: 0.15, amountMn: 37.5 }
    ]
  }
];

// Asset Class Vulnerability Multipliers (Beta Multiplier against Sovereign Clearing Shocks)
export const ASSET_CLASS_PROFILES = {
  cash_hqla: {
    id: 'cash_hqla',
    name_zh: '高流动性资产与现金 (HQLA / Cash)',
    beta: 0.08,
    desc: '主权储备与最高等级现金等价物，避险属性极高，仅承受极低再投资与基差折价'
  },
  sovereign_debt: {
    id: 'sovereign_debt',
    name_zh: '主权公共外债 (Sovereign Debt)',
    beta: 0.95,
    desc: '直接挂钩该国主权违约剪发率 (Haircut) 与外债展期偿还能力'
  },
  corporate_credit: {
    id: 'corporate_credit',
    name_zh: '跨国金融与企业债 (Corporate / Bank Credit)',
    beta: 1.35,
    desc: '承受主权危机向实体与银行体系传导的二阶挤压，违约溢价弹性放大'
  },
  equities: {
    id: 'equities',
    name_zh: '权益与对冲基金多头 (Equities & PE)',
    beta: 1.65,
    desc: '资本结构末端索偿权，在宏观流动性枯竭时承担最高波动性折价'
  },
  interbank_loans: {
    id: 'interbank_loans',
    name_zh: '同业拆借与跨国贷款 (Interbank Loans)',
    beta: 1.20,
    desc: '直接暴露于对手方银行同业挤兑与 Eisenberg-Noe 级联清算缺口'
  },
  fx_derivatives: {
    id: 'fx_derivatives',
    name_zh: '外汇掉期与表外衍生品 (FX Swaps & Derivatives)',
    beta: 1.45,
    desc: '交叉货币基差走阔导致保证金追缴 (Margin Call) 与期限展期断裂'
  }
};

// Preset Macro Stress Scenarios that feed into the Portfolio Stress Overlay
export const MACRO_STRESS_SCENARIOS = [
  {
    id: 'tr_sovereign_crisis',
    name: '土耳其 (TR) 主权外债风暴与欧洲同业蔓延',
    desc: 'TR 发生 40% 外债减记，导致深度暴露的德英法跨国银行发生二级资本冲销',
    epicenter: 'TR',
    haircut: 0.40,
    bufferMultiplier: 1.5,
    systemicShockMap: {
      TR: 0.40, // Epicenter
      DE: 0.12, // Direct heavy creditor
      GB: 0.09, // Second-tier London conduit
      FR: 0.07,
      US: 0.04,
      JP: 0.03
    }
  },
  {
    id: 'dollar_liquidity_freeze',
    name: '离岸美元流动性休克 (Offshore Dollar Squeeze)',
    desc: '伦敦与离岸欧洲美元拆借利率飙升，跨国银行外汇掉期展期严重受阻',
    epicenter: 'GB',
    haircut: 0.25,
    bufferMultiplier: 1.0,
    systemicShockMap: {
      GB: 0.25,
      US: 0.14,
      DE: 0.16,
      JP: 0.15,
      KY: 0.22,
      SG: 0.18,
      HK: 0.14
    }
  },
  {
    id: 'em_sovereign_cascade',
    name: '新兴市场主权外债连环违约 (EM Contagion Cascade)',
    desc: '土耳其、巴西、拉美主要债务人同步遭遇汇率急贬与资本外逃',
    epicenter: 'EM_BLOC',
    haircut: 0.35,
    bufferMultiplier: 1.2,
    systemicShockMap: {
      TR: 0.38,
      BR: 0.28,
      MX: 0.24,
      ID: 0.20,
      DE: 0.08,
      US: 0.07
    }
  },
  {
    id: 'fed_tightening_150bp',
    name: '美联储突发加息 150bp 与欧日利差倒挂',
    desc: '美元无风险利率倒挂，全球非银机构 (NBFI) 离岸杠杆被动去化',
    epicenter: 'US',
    haircut: 0.15,
    bufferMultiplier: 1.0,
    systemicShockMap: {
      US: 0.15,
      JP: 0.18,
      GB: 0.14,
      DE: 0.11,
      KY: 0.26,
      LU: 0.19
    }
  },
  {
    id: 'live_custom_contagion',
    name: 'Eisenberg-Noe 实时级联清算仿真冲击 (Live Contagion Shock)',
    desc: '由网络传染模拟器实时 Picard 不动点求解输出的各国边际违约率向量驱动',
    epicenter: 'LIVE',
    haircut: 0.35,
    bufferMultiplier: 1.0,
    systemicShockMap: {}
  }
];

// Institutional Hedging Strategies Catalog
export const INSTITUTIONAL_HEDGE_CATALOG = [
  {
    id: 'cds_hedge',
    title: '买入主权违约互换 (Sovereign CDS)',
    desc: '为震中及最高危主权外债头寸建立 80% 违约冲销保护',
    costRate: 0.012,
    efficiency: 0.80,
    targetAssetClass: 'sovereign_debt'
  },
  {
    id: 'derisk_ofc',
    title: '离岸 SPV 去杠杆至短期美债 (De-risk Offshore SPVs)',
    desc: '将开曼/离岸 PE 与对冲股权头寸调降 50% 并再分配至 0-Beta 短期国库券',
    costRate: 0.002,
    efficiency: 0.50,
    targetAssetClass: 'equities'
  },
  {
    id: 'swap_basis_collar',
    title: '跨货币互换基差套保 (Basis Swap Collar)',
    desc: '对冲外汇掉期与表外衍生品保证金追缴及基差走阔损失 70%',
    costRate: 0.005,
    efficiency: 0.70,
    targetAssetClass: 'fx_derivatives'
  }
];

/**
 * Builds a dynamic shock map from Eisenberg-Noe Picard clearing output
 */
export function buildLiveClearingShockMap(clearingOutput = {}) {
  const shockMap = {};
  if (!clearingOutput) return shockMap;

  // Set epicenter shock
  const epi = clearingOutput.epicenter || clearingOutput.epicenterCode;
  if (epi) {
    const rawHaircut = clearingOutput.haircut !== undefined ? clearingOutput.haircut : (clearingOutput.haircutPct !== undefined ? clearingOutput.haircutPct : 35);
    shockMap[epi] = Math.min(1.0, rawHaircut > 1 ? rawHaircut / 100 : rawHaircut);
  }

  // Iterate over creditors/victims in clearing output
  const victims = clearingOutput.victimList || clearingOutput.impactList || clearingOutput.creditorImpacts || [];
  victims.forEach(v => {
    const code = v.country || v.code;
    if (code && !shockMap[code]) {
      const shortfall = v.incrementalShortfall || v.rawShortfall || v.loss || v.enIncrementalShortfallRaw || 0;
      // Convert raw dollar shortfall to proportional haircut scale (capped at 50%)
      const ratio = Math.min(0.50, Math.max(0.04, shortfall / 180));
      shockMap[code] = Math.round(ratio * 1000) / 1000;
    }
  });

  return shockMap;
}

/**
 * Compute Portfolio Stress Overlay under a given Macro Shock
 * 
 * @param {Object} portfolio - Portfolio object with positions and base AUM
 * @param {Object} options - Options including scenarioId, customShockMap, stressMultiplier, enableLookThrough
 * @returns {Object} Stress impact assessment containing expected losses, breakdown, and hedging advice
 */
export function computePortfolioStressOverlay(portfolio, options = {}) {
  const {
    scenarioId = 'tr_sovereign_crisis',
    customShockMap = null,
    liveClearingShockMap = null,
    stressMultiplier = 1.0,
    enableLookThrough = true,
    activeHedges = []
  } = options;

  const positions = portfolio?.positions || [];
  const baseAum = portfolio?.baseAumUsdMn || positions.reduce((sum, p) => sum + (p.amountMn || 0), 0) || 500.0;

  // Resolve shock map
  let activeShockMap = {};
  const presetScenario = MACRO_STRESS_SCENARIOS.find(s => s.id === scenarioId);
  const providedMap = customShockMap || liveClearingShockMap;
  if (providedMap && Object.keys(providedMap).length > 0) {
    activeShockMap = { ...providedMap };
  } else if (presetScenario) {
    activeShockMap = { ...presetScenario.systemicShockMap };
  } else {
    activeShockMap = { TR: 0.40, DE: 0.10, GB: 0.08, US: 0.04 };
  }

  let totalLossMn = 0;
  let totalFirstOrderLossMn = 0;
  let totalSecondOrderLossMn = 0;

  const positionResults = positions.map(pos => {
    const rawCountry = pos.country;
    const assetClassProfile = ASSET_CLASS_PROFILES[pos.assetClass] || ASSET_CLASS_PROFILES.sovereign_debt;
    const beta = assetClassProfile.beta;

    // Check if country should be looked through (OFC conduit)
    let effectiveCountry = rawCountry;
    let lookThroughParents = null;

    if (enableLookThrough && OFC_LOOK_THROUGH_WEIGHTS[rawCountry]) {
      lookThroughParents = OFC_LOOK_THROUGH_WEIGHTS[rawCountry];
    }

    // Determine shock magnitude for this position
    let countryShock = 0;
    let isEpicenter = false;

    if (lookThroughParents) {
      // Aggregate weighted parent shocks
      lookThroughParents.forEach(pw => {
        const pShock = (activeShockMap[pw.parent] || 0.02) * stressMultiplier;
        countryShock += pShock * pw.share;
      });
    } else {
      countryShock = (activeShockMap[rawCountry] || 0.02) * stressMultiplier;
      if (presetScenario && presetScenario.epicenter === rawCountry) {
        isEpicenter = true;
      }
    }

    // Cap maximum loss at 100% of position value
    const rawLossPct = Math.min(1.0, countryShock * beta);
    const lossMn = Math.round(pos.amountMn * rawLossPct * 100) / 100;

    // Decompose into first-order (direct shock) vs second-order (network domino)
    let firstOrderRatio = 0.5;
    if (isEpicenter || countryShock >= 0.30) {
      firstOrderRatio = 0.85; // Epicenter or directly impacted has heavy first-order loss
    } else if (countryShock <= 0.08) {
      firstOrderRatio = 0.25; // Peripheral nodes mostly suffer from domino contagion
    }

    const firstOrderLossMn = Math.round(lossMn * firstOrderRatio * 100) / 100;
    const secondOrderLossMn = Math.round((lossMn - firstOrderLossMn) * 100) / 100;
    const stressedValueMn = Math.max(0, Math.round((pos.amountMn - lossMn) * 100) / 100);

    totalLossMn += lossMn;
    totalFirstOrderLossMn += firstOrderLossMn;
    totalSecondOrderLossMn += secondOrderLossMn;

    return {
      ...pos,
      countryShockPct: Math.round(countryShock * 1000) / 10,
      effectiveBeta: beta,
      rawLossPct: Math.round(rawLossPct * 1000) / 10,
      lossMn,
      firstOrderLossMn,
      secondOrderLossMn,
      stressedValueMn,
      lossContributionPct: 0, // will compute after totalLossMn
      isLookedThrough: Boolean(lookThroughParents),
      riskTier: rawLossPct > 0.20 ? 'HIGH' : (rawLossPct > 0.08 ? 'MEDIUM' : 'LOW')
    };
  });

  // Calculate loss contribution pct
  const safeTotalLoss = Math.max(0.01, totalLossMn);
  positionResults.forEach(pr => {
    pr.lossContributionPct = Math.round((pr.lossMn / safeTotalLoss) * 1000) / 10;
  });

  // Sort by highest loss amount
  positionResults.sort((a, b) => b.lossMn - a.lossMn);

  const totalLossRounded = Math.round(totalLossMn * 10) / 10;
  const portfolioLossPct = Math.round((totalLossMn / Math.max(1, baseAum)) * 1000) / 10;
  const stressedAumMn = Math.max(0, Math.round((baseAum - totalLossMn) * 10) / 10);

  // Calculate Active Hedges overlay effect
  let hedgedLossMn = totalLossMn;
  let hedgeCostMn = 0;

  if (activeHedges && activeHedges.length > 0) {
    let lossReduction = 0;
    positionResults.forEach(pos => {
      // CDS Hedge: covers sovereign debt losses on high risk or epicenter assets
      if (activeHedges.includes('cds_hedge') && (pos.assetClass === 'sovereign_debt' || pos.country === 'TR')) {
        const covered = pos.lossMn * 0.80;
        lossReduction += covered;
        hedgeCostMn += pos.amountMn * 0.012;
      }
      // De-risk OFC: reduces offshore equity losses by 50%
      if (activeHedges.includes('derisk_ofc') && (pos.isLookedThrough || pos.assetClass === 'equities' || pos.country === 'KY')) {
        const covered = pos.lossMn * 0.50;
        lossReduction += covered;
        hedgeCostMn += pos.amountMn * 0.002;
      }
      // Swap Basis Collar: mitigates FX derivatives losses by 70%
      if (activeHedges.includes('swap_basis_collar') && (pos.assetClass === 'fx_derivatives' || pos.assetClass === 'interbank_loans')) {
        const covered = pos.lossMn * 0.70;
        lossReduction += covered;
        hedgeCostMn += pos.amountMn * 0.005;
      }
    });

    hedgedLossMn = Math.max(0, Math.round((totalLossMn - lossReduction) * 10) / 10);
    hedgeCostMn = Math.round(hedgeCostMn * 10) / 10;
  }

  const netSavedMn = Math.max(0, Math.round((totalLossRounded - hedgedLossMn - hedgeCostMn) * 10) / 10);
  const hedgedStressedAumMn = Math.round((baseAum - hedgedLossMn - hedgeCostMn) * 10) / 10;
  const hedgedLossPct = Math.round((hedgedLossMn / Math.max(1, baseAum)) * 1000) / 10;

  // Stress VaR (99% 1-Month Horizon): Historical Basel multiplier on expected stress loss
  const stressVaR99Mn = Math.round(totalLossRounded * 1.35 * 10) / 10;
  const hedgedStressVaR99Mn = Math.round(hedgedLossMn * 1.35 * 10) / 10;

  // Generate Institutional Hedging Recommendations
  const topVictims = positionResults.slice(0, 3);
  const hedgingAdvice = generateHedgingRecommendations(topVictims, totalLossRounded, portfolioLossPct);

  return {
    scenarioId,
    scenarioName: presetScenario?.name || '自定义宏观压力情景',
    scenarioDesc: presetScenario?.desc || '基于用户调制参数的宏观网络冲击',
    baseAumUsdMn: Math.round(baseAum * 10) / 10,
    stressedAumMn,
    totalLossMn: totalLossRounded,
    portfolioLossPct,
    unhedgedLossMn: totalLossRounded,
    hedgedLossMn,
    hedgedLossPct,
    hedgeCostMn,
    netSavedMn,
    hedgedStressedAumMn,
    activeHedges,
    availableHedges: INSTITUTIONAL_HEDGE_CATALOG,
    firstOrderLossMn: Math.round(totalFirstOrderLossMn * 10) / 10,
    secondOrderLossMn: Math.round(totalSecondOrderLossMn * 10) / 10,
    stressVaR99Mn,
    hedgedStressVaR99Mn,
    positionsCount: positions.length,
    positionResults,
    topVictims,
    hedgingAdvice,
    stressMultiplier,
    enableLookThrough
  };
}

/**
 * Generate Actionable Hedging Advice based on Top Vulnerable Positions
 */
function generateHedgingRecommendations(topVictims, totalLossMn, lossPct) {
  const recommendations = [];

  if (topVictims.length === 0) return recommendations;

  const primary = topVictims[0];
  if (primary.country === 'TR') {
    recommendations.push({
      priority: 'CRITICAL',
      title: '买入 TR 主权信用违约互换 (CDS) 或做空里拉远期',
      desc: `最大受损敞口为 ${primary.name} (-$${primary.lossMn}M)。建议配置 5Y TR CDS 保护头寸，或买入 USD/TRY 看涨期权锁定汇率敞口。`
    });
  } else if (primary.country === 'DE' || primary.country === 'FR') {
    recommendations.push({
      priority: 'HIGH',
      title: '防范欧洲跨国银行二阶传染：买入 iTraxx Europe Crossover CDS',
      desc: `核心欧洲敞口承受网络二级溢出受损 (-$${primary.lossMn}M)。建议做空欧洲银行次级债指数 (CoCo / AT1) 阻断级联减记。`
    });
  } else if (primary.isLookedThrough) {
    recommendations.push({
      priority: 'MEDIUM',
      title: '离岸 SPV 穿透去杠杆与现金化',
      desc: `${primary.name} 属于离岸通道架构。穿透后实际最终风险暴露集中，建议收缩离岸非银对冲头寸，切换至在岸 3M 美债。`
    });
  } else {
    recommendations.push({
      priority: 'HIGH',
      title: `对冲 ${primary.name} 宏观下行敞口`,
      desc: `该持仓贡献了总损失的 ${primary.lossContributionPct}%。建议削减权重至 5% 以下或买入等值股指/债券看跌期权。`
    });
  }

  // Cross-Currency Basis & Macro Shield Advice
  recommendations.push({
    priority: lossPct > 10 ? 'CRITICAL' : 'MEDIUM',
    title: '调高美元现金与常设流动性互换 (FIMA) 缓冲',
    desc: `当前全组合预期受损达 -$${totalLossMn}M (${lossPct}%)。建议将现金与高等级国债 (HQLA) 占比调高至 20% 以上，以满足衍生品保证金追缴。`
  });

  return recommendations;
}
