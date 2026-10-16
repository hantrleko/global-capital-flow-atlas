/**
 * Macro Scenarios, Historical Regimes and Risk Engines
 * Calibrated against BIS Quarterly Reviews and Financial Stability Board (FSB) frameworks.
 */

export const HISTORICAL_REGIMES = [
  {
    quarter: "2018Q2",
    name: "全球贸易争端与强势美元周期开启 (Trade Dispute Escalation)",
    description: "中美经贸摩擦升温，全球关税预期上升，美元指数自低位反弹，新兴市场局部主权外债承压。",
    stress: 42.0,
    badgeColor: "amber",
    tag: "关税与汇率"
  },
  {
    quarter: "2019Q3",
    name: "美联储预防式降息与隔夜回购微震 (Repo Spike & Mid-cycle Cut)",
    description: "美联储启动三次预防式降息，2019年9月美国隔夜回购利率发生罕见脉冲式飙升，离岸美元流动性警报初现。",
    stress: 45.0,
    badgeColor: "amber",
    tag: "回购市场"
  },
  {
    quarter: "2019Q4",
    name: "疫情前基准期 (Pre-Pandemic Baseline)",
    description: "全球跨境银行信贷平稳扩张，美元离岸流动性结构平衡，低波动率常态。",
    stress: 38.0,
    badgeColor: "emerald",
    tag: "低波常态"
  },
  {
    quarter: "2020Q1",
    name: "新冠疫情闪崩与美元现金挤兑 (COVID-19 Dash for Cash)",
    description: "全球金融市场剧烈动荡，跨国实体与金融机构争夺美元现金，跨国信贷利差创后次贷危机新高，美联储火速开启全球央行互换线。",
    stress: 82.0,
    badgeColor: "rose",
    tag: "流动性危机"
  },
  {
    quarter: "2020Q3",
    name: "无限量 QE 与跨国信贷筑底复苏 (Unlimited QE & Reflation)",
    description: "全球主要央行资产负债表极速膨胀，企业大举发行跨境债券并存入银行，全球跨境债权触底强劲反弹。",
    stress: 36.0,
    badgeColor: "emerald",
    tag: "量化宽松"
  },
  {
    quarter: "2021Q2",
    name: "通胀初现与跨国信贷大繁荣 (Global Reflation Boom)",
    description: "主要发达经济体维持零利率与大规模资产购买，离岸中心与新兴市场迎来资金大幅净流入，跨境美元借贷成本降至历史低点。",
    stress: 25.0,
    badgeColor: "emerald",
    tag: "信贷繁荣"
  },
  {
    quarter: "2022Q1",
    name: "俄乌地缘冲突与西方主权制裁 (Geopolitical Fracture & Sanctions)",
    description: "地缘危机爆发，欧美等国宣布冻结俄罗斯央行外汇储备并切断部分银行 SWIFT 通道，全球跨境金融体系碎片化序幕开启。",
    stress: 64.0,
    badgeColor: "rose",
    tag: "金融制裁"
  },
  {
    quarter: "2022Q3",
    name: "美联储激进加息与强美元风暴 (Aggressive Fed Tightening)",
    description: "全球通胀攀升，美联储以连续75bps节奏暴力加息，强势美元指数突破114，新兴市场面临资本外流与外债滚续挤压。",
    stress: 69.0,
    badgeColor: "rose",
    tag: "暴力加息"
  },
  {
    quarter: "2023Q1",
    name: "欧美银行业闪崩风暴 (SVB & Credit Suisse Shock)",
    description: "硅谷银行闪崩倒闭，瑞信受困并被瑞银紧急收购，170亿美元AT1债券全额减记，跨国银行间借贷审查急剧收紧。",
    stress: 78.0,
    badgeColor: "amber",
    tag: "银行危机"
  },
  {
    quarter: "2023Q4",
    name: "全球加息尾声与高利率长驻 (Higher-for-Longer Plateau)",
    description: "欧美政策利率见顶，高利率平台期持续，跨国借款主体转向短期限转期与合成美元外汇掉期融资。",
    stress: 44.0,
    badgeColor: "cyan",
    tag: "高息平台"
  },
  {
    quarter: "2024Q3",
    name: "日元套息交易巨震与央行分化 (BOJ Hike & Carry Unwind)",
    description: "日本央行加息引爆数十万亿日元全球套息平仓潮，全球股债异动，日元汇率暴力反弹，离岸流动性基差剧烈震荡。",
    stress: 61.0,
    badgeColor: "amber",
    tag: "套息平仓"
  },
  {
    quarter: "2024Q4",
    name: "全球降息周期开启与离岸非银扩张 (Easing Cycle & Private Credit)",
    description: "美联储以 50bps 开启降息周期，欧洲央行接续，离岸私人信贷 (Private Credit) 与跨国非银机构敞口持续扩张。",
    stress: 32.0,
    badgeColor: "cyan",
    tag: "降息周期"
  },
  {
    quarter: "2025Q2",
    name: "去美元化提速与多元双边互换常态化 (De-Dollarization & Currency Swaps)",
    description: "多极化货币网络快速演进，非美本币跨境信贷比重稳步上升，新兴市场央行互换线实际动用量创下新高。",
    stress: 41.0,
    badgeColor: "emerald",
    tag: "双边互换"
  },
  {
    quarter: "2025Q4",
    name: "全球供应链金融再布局 (Supply Chain Credit Realignment)",
    description: "友岸外包与跨国近岸制造基地转移，墨西哥、东南亚、东欧等地跨国银团项目贷款与供应链应收账款融资激增。",
    stress: 36.0,
    badgeColor: "cyan",
    tag: "供应链信贷"
  },
  {
    quarter: "2026Q2",
    name: "离岸美元总债权突破 47 万亿美元 (Record Cross-Border Scale)",
    description: "根据最新 BIS 官方基准统计，全球跨国银行跨境债权存量首次攀升突破 47.6 万亿美元历史峰值，非银与数字资产对冲通道扩容。",
    stress: 33.0,
    badgeColor: "emerald",
    tag: "破纪录规模"
  },
  {
    quarter: "2026Q4",
    name: "主权 AI 基础设施与多极清算新纪元 (Sovereign AI & Multipolar Settlement)",
    description: "金砖本币清算与央行数字货币 (mBridge/CBDC) 结算网络跨国试跑成熟，跨国银行对全球超算集群与绿色电网的绿色银团信贷达历史新高。",
    stress: 30.0,
    badgeColor: "emerald",
    tag: "AI 与新清算"
  }
];

export const MACRO_TIMELINE_EVENTS = HISTORICAL_REGIMES.map(r => ({
  quarter: r.quarter,
  name: r.name,
  tag: r.tag,
  description: r.description,
  stress: r.stress,
  color: r.badgeColor
}));

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
