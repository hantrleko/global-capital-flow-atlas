/**
 * Financial & Macroprudential Plain-Language Glossary Library (金融专业术语人话词典)
 * Designed for v4.0.0 Zero-Threshold Cognitive Onboarding.
 * 
 * Provides:
 * 1. 18 Core Financial Concepts (plain-language summary, real-world metaphor, interpretation rule).
 * 2. 4-Stage Causal Workflow metadata for Focus Mode.
 */

export const FINANCIAL_GLOSSARY = {
  lbs: {
    term: 'LBS 居住地原则',
    en: 'Locational Banking Statistics',
    simpleTitle: '资金地理出入境记录',
    tag: '基础统计',
    plainText: '记录资金物理上从哪个国家/离岸中心汇出、流向哪里，就像海关资金出入境记录。',
    metaphor: '就像看快递面单上的发件地（比如开曼群岛），哪怕实际寄件人是美国母公司。',
    readingRule: '用于观察全球资金的物理中转站、离岸资金池集聚与币种份额（如美元占比）。'
  },
  cbs: {
    term: 'CBS 最终风险原则',
    en: 'Consolidated Banking Statistics',
    simpleTitle: '最终穿透记账',
    tag: '穿透穿透',
    plainText: '剥离避税地或空壳子公司，穿透到实际出资母公司或担保人的母国记账。',
    metaphor: '看透快递代收点，直接找到真正掏钱和兜底的主人（真正谁承担债务）。',
    readingRule: '用于还原真实的国别主权债务敞口，避免开曼等离岸中心掩盖真实风险。'
  },
  eisenberg_noe: {
    term: 'Eisenberg-Noe 清算模型',
    en: 'Eisenberg-Noe (2001) Systemic Risk Clearing',
    simpleTitle: '金融多米诺骨牌数学解',
    tag: '量化模型',
    plainText: '一套严格求解银行相互借钱网络的级联违约数学算法，能同时计算多轮传染后的最终平衡点。',
    metaphor: '桌上摆满多米诺骨牌，推倒第一块（震中国违约）后，精确计算哪几块骨牌会被连带撞倒。',
    readingRule: '重点看「边际增量 ΔS」：数值越大，说明该震中违约对全球银行系统的外溢破坏力越强。'
  },
  credit_to_gdp_gap: {
    term: '信贷/GDP 缺口',
    en: 'Credit-to-GDP Gap',
    simpleTitle: '债务增速与实体经济脱节度',
    tag: '巴塞尔预警',
    plainText: '私人非金融部门信贷总额占 GDP 的比例偏离其长期历史趋势的偏差值。',
    metaphor: '测一个人的体重是否超出了健康身高趋势线，发胖太快说明有三高风险。',
    readingRule: '缺口 > 2% 亮黄灯，> 8% 亮红灯：提示该国信贷过度扩张，未来 1-2 年面临银行业危机。'
  },
  ccyb: {
    term: 'CCyB 逆周期资本缓冲',
    en: 'Countercyclical Capital Buffer',
    simpleTitle: '晴天修屋顶的银行安全垫',
    tag: '巴塞尔三',
    plainText: '监管部门在信贷狂热、债务膨胀时强令银行额外存下的核心资本，供危机时吸收损失。',
    metaphor: '丰年把粮仓堆满，荒年才有余粮放开救灾，防止粮价崩盘。',
    readingRule: '推荐值一般在 0% ~ 2.5% 之间；推荐值越高，代表监管部门认为当前信贷过热、需要踩刹车。'
  },
  dsr: {
    term: '还本付息比率 (DSR)',
    en: 'Debt Service Ratio',
    simpleTitle: '借款人每月还款现金流压力',
    tag: '违约预警',
    plainText: '借款实体当年所需偿还的债务本息占其总收入的可支配比例。',
    metaphor: '一个人月薪 1 万，每个月房贷车贷要还 6000 块，稍有降薪就会断供。',
    readingRule: 'DSR 偏差 > 2.5% 为高危红色警报：说明借款人几乎所有收入都在偿债，对加息毫无抵抗力。'
  },
  fx_swaps: {
    term: '外汇掉期表外美元负债',
    en: 'FX Swaps & Forwards (Off-Balance Sheet)',
    simpleTitle: '全球金融的庞大暗账',
    tag: '影子银行',
    plainText: '通过外汇掉期合约借入美元，期满按远期汇率换回，传统资产负债表不将其列入法定负债。',
    metaphor: '用本币做典当质押借了美元急用，口头约定下周赎回，虽然没写进借条，但还款责任分毫不少。',
    readingRule: '全球非美机构此类隐藏负债超过 85 万亿美元，一旦发生美元流动性挤兑，极易引发抛售踩踏。'
  },
  nbfis: {
    term: '非银金融中介 (NBFIs)',
    en: 'Non-Bank Financial Intermediaries',
    simpleTitle: '无央行兜底的影子银行群',
    tag: '影子银行',
    plainText: '对冲基金、私募信贷基金、货币市场基金等非银行金融实体，借用杠杆从事跨国信贷。',
    metaphor: '民间金融互助社，虽然规模堪比大银行，但没有央行的贴现窗当“急救车”。',
    readingRule: '在加息周期中，NBFIs 最容易遭遇追缴保证金 (Margin Call) 引发流动性休克。'
  },
  cip_basis: {
    term: 'CIP 交叉货币基差',
    en: 'Cross-Currency Basis',
    simpleTitle: '离岸借美元的加价溢价',
    tag: '美元流动性',
    plainText: '衡量非美金融机构在外汇市场上借入美元相比美国本土机构所需支付的额外利差溢价。',
    metaphor: '外地人租房要比本地人多付 20% 中介中转费，中介费越高说明房源越紧张。',
    readingRule: '基差负值深度越大（如 -40bp、-80bp），说明全球离岸美元荒越严峻、流动性断层越深。'
  },
  gsib: {
    term: 'G-SIBs 全球系统重要性银行',
    en: 'Global Systemically Important Banks',
    simpleTitle: '大到不能倒的跨国超级银行',
    tag: '系统核心',
    plainText: '巴塞尔委员会认定的全球 30 家巨无霸跨国银行（摩根大通、汇丰、工行、德银等）。',
    metaphor: '全球金融电力网络的核心特高压变电枢纽，一台跳闸，整片大洲停电。',
    readingRule: '重点关注其跨国同业资产与负债集中度，评估一国震中对全球核心大行的穿透传染度。'
  },
  var: {
    term: '99% 压力 VaR (在险价值)',
    en: 'Value at Risk (99% Stressed)',
    simpleTitle: '百年一遇的最坏单日/单月亏损',
    tag: '专户风控',
    plainText: '在 99% 的统计置信度下，某一投资组合在极端危机冲击下预期的最大净值回撤损失额。',
    metaphor: '百年一遇的特大暴雨下，防洪堤坝最多可能被淹没冲垮多少米。',
    readingRule: '通常按巴塞尔 III 压力乘数（如 1.35x）倍增，用来指导机构应计提多少风险储备金。'
  },
  cds: {
    term: 'CDS 信用违约互换',
    en: 'Credit Default Swap',
    simpleTitle: '针对债务违约的对冲保险单',
    tag: '主动对冲',
    plainText: '买方向卖方支付保费，当目标国家或企业发生债务违约时，卖方全额赔付买方的损失。',
    metaphor: '给邻居的房屋买火灾险，如果邻居家着火炸开，保险公司赔付你的连带损失。',
    readingRule: '组合持有高风险新兴市场外债时，买入 5Y 主权 CDS 能以 2%~3% 的保费挽回 80% 以上硬损失。'
  },
  direct_loss: {
    term: '一阶直接损失',
    en: 'First-Order Direct Impairment',
    simpleTitle: '借钱给违约者的直接坏账',
    tag: '损失拆解',
    plainText: '你直接借钱给震中国家/企业，其减记违约导致的当期本金直接账面冲销。',
    metaphor: '你借了小明 10 万块，小明破产了只能还 3 万，你直接被吞掉 7 万。',
    readingRule: '在损失归因图中表现为红色柱条，直接由持仓本金暴露和外生减记率乘积决定。'
  },
  indirect_spillover: {
    term: '二阶级联传染损失',
    en: 'Second-Order Cascading Contagion',
    simpleTitle: '别家银行被拖垮后的连带踩踏',
    tag: '损失拆解',
    plainText: '其他受害银行为了自保，收回对你的信贷或降低抵押率，在金融网络中引发的多米诺次生灾害。',
    metaphor: '隔壁老王也借了小明钱，老王破产了没办法只能来逼你提前还款，连锁引发资金链断裂。',
    readingRule: '在损失归因图中表现为紫色柱条，在跨国危机中二阶传染损失经常超过一阶直接损失。'
  },
  look_through: {
    term: '离岸穿透还原',
    en: 'Look-Through Accounting Restatement',
    simpleTitle: '撕掉开曼马甲看清真实债主',
    tag: '穿透还原',
    plainText: '通过算法穿透开曼、卢森堡等离岸避税壳实体，把资金按最终母公司母国重定向还原。',
    metaphor: '查账时把所有皮包公司的名义账户归拢到幕后真正老板的名下。',
    readingRule: '开启穿透后，全球对美、英、中真实债务敞口增加 28% 以上，消除了离岸盲区。'
  },
  haircut: {
    term: '违约减记率 (Haircut)',
    en: 'Debt Impairment / Haircut Ratio',
    simpleTitle: '债务打折率 / 违约缩水幅度',
    tag: '压力参数',
    plainText: '借款人发生主权违约或债务重组时，债务本金按约定或清算被打折冲销的百分比。',
    metaphor: '欠债 100 块只能按 75 块清偿，剩下的 25 块就是被“剪掉的头发”（减记 25%）。',
    readingRule: '模拟器中通常设置在 10% ~ 50% 之间，用于模拟从温和重组到全面破产的破坏力。'
  },
  swap_lines: {
    term: '央行常设货币互换协议',
    en: 'Central Bank Liquidity Swap Lines',
    simpleTitle: '国家央行之间的美元消防栓',
    tag: '央行救市',
    plainText: '美联储与欧洲、日本、英国、瑞士、加拿大五大央行建立的无上限常备双边美元互换管道。',
    metaphor: '各城市消防队之间连通的紧急供水高压管网，哪里着火立刻调拨邻城水库灭火。',
    readingRule: '当离岸美元荒爆发时，互换线开启规模直接决定全球流动性底线与踩踏蔓延能否刹车。'
  },
  offshore_conduits: {
    term: '离岸金融中转站',
    en: 'Offshore Financial Centers (OFCs)',
    simpleTitle: '跨国资本避税过桥驿站',
    tag: '离岸中枢',
    plainText: '开曼群岛、卢森堡、百慕大等辖区，自身实体经济极小，但注册了数万亿美元的跨国资管与金融工具。',
    metaphor: '高速公路上的保税物流转运仓，货物在这里只是打个转改个标签，不在此地消费。',
    readingRule: '分析跨境信贷时必须将此类中继站剥离，否则会将大量对美、对欧债务误判为对开曼的债务。'
  },
  deleveraging: {
    term: '去杠杆乘数 / 资产抛售收缩',
    en: 'Deleveraging & Balance Sheet Contraction',
    simpleTitle: '银行被迫贱卖资产还债',
    tag: '踩踏传导',
    plainText: '当跨国银行遭遇坏账冲击且资本充足率跌破监管红线时，被迫成倍削减对其他正常国家的同业贷款以维系杠杆上限。',
    metaphor: '房贷首付不够了，必须把手里的二套房甚至股票按市价打折大甩卖，导致整个小区二手房价一起崩跌。',
    readingRule: '模拟器中去杠杆乘数每增加 0.5x，二阶多米诺传染造成的全球信贷蒸发量通常翻倍。'
  },
  fima: {
    term: '美联储 FIMA 回购便利工具',
    en: 'Foreign and International Monetary Authorities Repo',
    simpleTitle: '外国央行用美债抵押换美元的当铺',
    tag: '流动性支持',
    plainText: '允许外国央行直接将持有的美国国债抵押给美联储，借出隔夜美元现金，避免在公开市场上恐慌性抛售美债。',
    metaphor: '把家里祖传的黄金抵押给典当行快速换现金应急，不用在集市上跳楼大甩卖。',
    readingRule: 'FIMA 使用规模激增通常预示着新兴市场国家正遭遇严峻的离岸美元挤兑。'
  },
  picard: {
    term: 'Picard 逐次逼近不动点迭代',
    en: 'Picard Successive Approximation',
    simpleTitle: '一步步推算多米诺最后谁倒下的算法',
    tag: '数学求解',
    plainText: '用于求解 Eisenberg-Noe 级联清算模型核心方程的数学算法，通过一轮轮迭代直至各银行实际偿付向量收敛稳定。',
    metaphor: '多米诺骨牌一张张推倒，直到没有骨牌再继续倒下时的最终稳定状态。',
    readingRule: '迭代残差必须收敛至 1e-4 以下，确保每一家银行的破产冲销额都满足数学上的不动点守恒定理。'
  },
  unhedged_fx: {
    term: '未对冲外汇负债',
    en: 'Unhedged FX Liabilities',
    simpleTitle: '没买保险就借的美元外债',
    tag: '汇率风险',
    plainText: '企业或金融机构借入大量美元外债，但自身收入全是本币，且没有购买任何外汇远期或掉期对冲工具。',
    metaphor: '借了美元买车，自己每个月工资却发披索，一旦美元对披索暴涨 50%，每个月还贷额直接翻倍导致破产。',
    readingRule: '未对冲美元外债占比越高，该国在美元升值或美联储加息周期中爆发债务违约的概率越大。'
  }
};

/**
 * Focus Mode 4-Stage Causal Workflow Metadata
 */
export const CAUSAL_WORKFLOW_STEPS = [
  {
    step: 1,
    id: 'map',
    label: '全球双边信贷流向',
    shortTitle: '① 查资金去向',
    question: '全球 $47.6T 跨境资金借给了谁？',
    purpose: '观察跨国银行资金物理血管，定位避税中转异常汇聚',
    actionCta: '下一步：前往影子银行透视表外暗雷 ➔',
    nextTab: 'shadow'
  },
  {
    step: 2,
    id: 'shadow',
    label: '影子银行与非银透视',
    shortTitle: '② 抓隐形杠杆',
    question: '开曼/卢森堡避税壳里藏了多少暗债？',
    purpose: '透视非银对冲基金与 $85T 表外未记录的外汇掉期负债',
    actionCta: '下一步：运行级联清算求解连环爆雷 ➔',
    nextTab: 'contagion'
  },
  {
    step: 3,
    id: 'contagion',
    label: '银行级联传染模拟',
    shortTitle: '③ 算多米诺骨牌',
    question: '一国主权违约会连环拖垮哪家大行？',
    purpose: '求解 Eisenberg-Noe 级联清算模型，拆解一阶坏账与二阶同业踩踏',
    actionCta: '下一步：映射至我的投资账户建立对冲 ➔',
    nextTab: 'portfolio'
  },
  {
    step: 4,
    id: 'portfolio',
    label: '我的组合压力映射',
    shortTitle: '④ 护住我的账户',
    question: '宏观风暴下我的持仓亏多少、如何对冲？',
    purpose: '将全网清算受损向量投射至专户 AUM，激活 CDS 对冲挽回资本',
    actionCta: '完成闭环：导出投行级研报卡片 ➔',
    nextTab: 'map'
  }
];

/**
 * 3 Persona Presets for the 30-Second Quick Onboarding
 */
export const USER_PERSONAS = [
  {
    id: 'curious_explorer',
    icon: '🌱',
    title: '初次了解的探索者',
    name: '初次了解的探索者',
    badge: '零基础入门 · 白话解读透镜',
    subtitle: '零基础入门 · 白话解读透镜',
    desc: '我想在 3 分钟内看懂全球资本怎么流动的，需要人话解释和现实比喻。',
    recommendedTab: 'map',
    actions: {
      enableBeginnerMode: true,
      accountingBasis: 'ultimate_risk',
      viewMode: 'focus'
    }
  },
  {
    id: 'macro_investor',
    icon: '💼',
    title: '宏观多资产投资者',
    name: '宏观多资产投资者',
    badge: '专户风控 · 压力测试与对冲',
    subtitle: '专户风控 · 压力测试与对冲',
    desc: '我关注地缘冲击与主权债务违约对投资组合净值 (AUM) 的回撤与对冲工具。',
    recommendedTab: 'portfolio',
    actions: {
      enableBeginnerMode: false,
      accountingBasis: 'residence',
      scenarioId: 'tr_sovereign_crisis',
      viewMode: 'focus'
    }
  },
  {
    id: 'quant_researcher',
    icon: '🔬',
    title: '量化研究员 / 监管学者',
    name: '量化研究员 / 监管学者',
    badge: '专家模式 · 双基线清算与计量',
    subtitle: '专家模式 · 双基线清算与计量',
    desc: '我需要查验 Eisenberg-Noe Picard 不动点收敛性、BIS CBS/LBS 双向重构与计量导出。',
    recommendedTab: 'contagion',
    actions: {
      enableBeginnerMode: false,
      accountingBasis: 'residence',
      viewMode: 'pro'
    }
  }
];
