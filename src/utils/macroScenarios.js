/**
 * Macro Scenarios, Historical Regimes and Risk Engines
 * Calibrated against BIS Quarterly Reviews and Financial Stability Board (FSB) frameworks.
 */

export const HISTORICAL_REGIMES = [
  {
    quarter: "2019Q4",
    name: "疫情前基准期 (Pre-Pandemic Baseline)",
    description: "全球跨境银行信贷平稳扩张，美元离岸流动性结构平衡，低波动率常态。",
    stress: 38.0,
    badgeColor: "emerald"
  },
  {
    quarter: "2020Q1",
    name: "新冠疫情闪崩与流动性挤兑 (COVID-19 Cash Dash)",
    description: "全球金融市场剧烈动荡，跨国实体与金融机构争夺美元现金，跨国信贷利差创后次贷危机新高，美联储火速开启多国央行流动性互换 (Swap Lines)。",
    stress: 82.0,
    badgeColor: "rose"
  },
  {
    quarter: "2021Q2",
    name: "大放水与全球信贷大繁荣 (Global Reflation & QE)",
    description: "主要发达经济体维持零利率与大规模资产购买，离岸中心与新兴市场迎来资金大幅净流入，跨境美元借贷成本降至历史低点。",
    stress: 25.0,
    badgeColor: "emerald"
  },
  {
    quarter: "2022Q3",
    name: "美联储历史性激进加息 (Aggressive Fed Tightening)",
    description: "全球通胀攀升，美联储以连续75bps节奏暴力加息，强势美元指数突破114，新兴市场面临资本外流与美元计价债务再融资挤压。",
    stress: 69.0,
    badgeColor: "rose"
  },
  {
    quarter: "2023Q1",
    name: "欧美银行业风暴 (SVB & Credit Suisse Shock)",
    description: "硅谷银行闪崩倒闭，瑞信受困并被瑞银紧急收购，170亿美元AT1债券全额减记，跨国银行间借贷审查急剧收紧，避险情绪冲高。",
    stress: 78.0,
    badgeColor: "amber"
  },
  {
    quarter: "2024Q4",
    name: "主要央行政策分化与宏观新常态 (Policy Divergence)",
    description: "美联储开启降息周期，欧洲央行跟进，日本央行逆势走出负利率，离岸私人信贷 (Private Credit) 与跨国非银机构敞口持续扩张。",
    stress: 32.0,
    badgeColor: "cyan"
  },
  {
    quarter: "2025Q3",
    name: "日元套息平仓与全球美元再平衡 (2025 Nowcast)",
    description: "美联储降息与日本央行加息共振，日元套息交易遭遇阶段性平仓回流，新兴市场汇率企稳，离岸非银信贷重塑。",
    stress: 48.0,
    badgeColor: "amber"
  },
  {
    quarter: "2026Q4",
    name: "多极本币结算网络与 AI 算力基建热潮 (2026 Projection)",
    description: "金砖伙伴联盟双边本币结算与央行互换常态化，跨国银团加大对绿色转型与主权 AI 算力基建的资本开支信贷投放。",
    stress: 34.0,
    badgeColor: "emerald"
  }
];

export const STRESS_SCENARIOS = {
  baseline: {
    id: "baseline",
    name: "基准官方状态 (Official BIS Baseline)",
    desc: "使用当前季度 BIS 报告的真实官方截面数据，未附加外生压力冲击。",
    dollarShockPct: 0,
    creditDeclinePct: 0,
    spreadWidenBps: 0
  },
  usd_squeeze: {
    id: "usd_squeeze",
    name: "极端美元荒冲击 (Severe USD Funding Squeeze)",
    desc: "假设全球美元外汇掉期基差 (FX Swap Basis) 扩大 150bps，非美银行美元信贷萎缩 12%，测试外债滚续缺口。",
    dollarShockPct: 15,
    creditDeclinePct: -12,
    spreadWidenBps: 150
  },
  sovereign_contagion: {
    id: "sovereign_contagion",
    name: "外围主权债务重估 (Sovereign Spread Widening)",
    desc: "欧洲外围国及新兴脆弱经济体主权利差走阔 250bps，跨国银行启动风险资本重估与授信额度削减 18%。",
    dollarShockPct: 8,
    creditDeclinePct: -18,
    spreadWidenBps: 250
  },
  offshore_deleveraging: {
    id: "offshore_deleveraging",
    name: "离岸转口中心去杠杆 (Offshore Conduit Deleveraging)",
    desc: "开曼、卢森堡等离岸投资基金及表外载体面临大规模流动性赎回，跨境转口信贷骤降 22%。",
    dollarShockPct: 5,
    creditDeclinePct: -22,
    spreadWidenBps: 120
  }
};

/**
 * Calculates graph topological centrality metrics for a given quarter's bilateral matrix.
 */
export function computeNetworkCentrality(countries, links) {
  const inDegree = {};
  const outDegree = {};
  const inVolume = {};
  const outVolume = {};

  countries.forEach(c => {
    inDegree[c.code] = 0;
    outDegree[c.code] = 0;
    inVolume[c.code] = 0;
    outVolume[c.code] = 0;
  });

  links.forEach(l => {
    if (outDegree[l.source] !== undefined) {
      outDegree[l.source] += 1;
      outVolume[l.source] += l.claims_usd_bn;
    }
    if (inDegree[l.target] !== undefined) {
      inDegree[l.target] += 1;
      inVolume[l.target] += l.claims_usd_bn;
    }
  });

  return countries.map(c => {
    const outV = outVolume[c.code] || 0;
    const inV = inVolume[c.code] || 0;
    const totV = outV + inV;
    // Hub intermediation proxy (ratio of bidirectional cross-border flow to net flow)
    const netV = Math.abs(outV - inV);
    const intermediationScore = totV > 0 ? (totV - netV) / totV : 0;

    return {
      code: c.code,
      name: c.name,
      name_zh: c.name_zh,
      outVolume: Math.round(outV),
      inVolume: Math.round(inV),
      totalVolume: Math.round(totV),
      intermediationScore: Math.round(intermediationScore * 100),
      tier: c.tier,
      region: c.region,
      type: c.type
    };
  });
}
