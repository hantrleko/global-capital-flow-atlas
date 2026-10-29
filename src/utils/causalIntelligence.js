/**
 * EUGENE FINANCE Global Capital Flow Atlas - v2.5 Causal Intelligence Engine
 * 
 * Defines:
 * 1. "So What?" Executive Verdicts for all analytical modules (Observation ➔ Mechanism ➔ Action)
 * 2. Causal Knowledge Graph: Upstream Drivers & Downstream Consequences for every module
 * 3. Guided Investigation Playbooks: 3 step-by-step macro mystery storylines with contextual handoffs
 */

// 1. "So What?" Executive Verdicts for each module
export const MODULE_VERDICTS = {
  map: {
    id: 'map',
    moduleTitle: '全球双边信贷流向图谱',
    observation: '全球跨国信贷总额维持在 $47.62T 高位，资金高度集中于跨大西洋走廊及避税中枢（US ➔ GB / KY / LU）。',
    mechanism: '跨国非银机构（对冲基金/PE）通过开曼与卢森堡等离岸壳架构进行大规模加杠杆，严重掩盖了真实母国最终风险敞口。',
    verdict: '【避税与影子集中预警】建议开启「穿透离岸中心」，并进一步前往【影子银行与非银透视】核查离岸外汇掉期隐性负债。',
    severity: 'WARNING',
    focusPriority: 1
  },
  network: {
    id: 'network',
    moduleTitle: '金融网络拓扑与核心-外围结构',
    observation: '美英日德中 5 大节点占据全网 68% 的网络度中心度，外围新兴经济体高度依赖极少数核心银行通道。',
    mechanism: '核心-外围拓扑呈现高度非对称性，中枢节点一旦发生信用收缩，外围主权将面临流动性断崖式被动去杠杆。',
    verdict: '【中枢单点脆弱性】英国与美国为全球最大信贷汇集点，其同业拆借流动性直接决定外围新兴市场生死。',
    severity: 'INFO',
    focusPriority: 2
  },
  routing: {
    id: 'routing',
    moduleTitle: '资本路由矩阵与桑基穿透',
    observation: '通过开曼群岛与中国香港的信贷转口规模超过 $3.8T，中转路由占比持续高于直接双边借贷。',
    mechanism: '资金通过多重法律实体架构层层倒手以规避资本管制和税赋，拉长了资金链条并加剧了期限错配。',
    verdict: '【转口路径虚高】表面繁荣实为通道套利，若离岸监管收紧，转口资金将迅速断流。',
    severity: 'WARNING',
    focusPriority: 3
  },
  ews: {
    id: 'ews',
    moduleTitle: '巴塞尔早期预警系统 (EWS)',
    observation: '土耳其 (TR) 信贷/GDP 缺口突破 +18.4%，外债偿付比率 (DSR) 亮起红色高危警报。',
    mechanism: '私营与公共部门短期外币债务激增，在强美元与高外汇基差挤压下，外汇储备对短期债务覆盖率跌破安全阈值。',
    verdict: '【主权暴雷高危】土耳其已具备全面外债违约先兆，建议立即前往【期限结构】与【银行级联传染】评估外溢烈度。',
    severity: 'CRITICAL',
    focusPriority: 1
  },
  gsib: {
    id: 'gsib',
    moduleTitle: 'G-SIB 顶级跨国银行透镜',
    observation: '全球前 30 家全球系统重要性银行（G-SIB）跨国资产集中度达 61.4%，汇丰、摩根大通、巴克莱表外敞口庞大。',
    mechanism: '巴塞尔 III 杠杆率指标限制了银行表内做市能力，促使大行通过表外掉期和非银通道转嫁跨国流动性。',
    verdict: '【系统重要性集聚】少数头部银行承载全网大部分流动性做市功能，若遭遇挤兑将迅速扩散全网。',
    severity: 'INFO',
    focusPriority: 3
  },
  contagion: {
    id: 'contagion',
    moduleTitle: 'Eisenberg-Noe 银行级联传染模拟',
    observation: '土耳其 40% 外债减记将引发全网 +$284.8B 边际违约赤字，德国受损 $69.2B、英国受损 $48.5B。',
    mechanism: '德国银行直接持有高额 TR 敞口承担一阶损失（82%），英国与美国则主要因同业网络倒戈承担二阶多米诺传染损失。',
    verdict: '【多米诺传染失控】传统直接敞口分析低估了 37.6% 的二阶传染受损，必须立即在【我的组合】中建立 CDS 对冲防线。',
    severity: 'CRITICAL',
    focusPriority: 1
  },
  shadow: {
    id: 'shadow',
    moduleTitle: '影子银行与非银机构透视',
    observation: '非银金融机构 (NBFI) 跨国借贷占总信贷比重升至 43.8%，表外未记录的美元外汇掉期隐性债务超数十万亿美元。',
    mechanism: '对冲基金与离岸资管利用短期外汇掉期滚动借入美元购买长期资产，在清算统计中属于表外盲区。',
    verdict: '【表外暗雷】非银机构不受央行贴现窗保护，一旦外汇互换基差走阔将发生断崖式被动平仓。',
    severity: 'CRITICAL',
    focusPriority: 2
  },
  maturity: {
    id: 'maturity',
    moduleTitle: '期限结构与转期挤兑风险',
    observation: '全球 1 年以内到期短期跨境负债占比达 48.2%，部分新兴市场短期外债对官方外汇储备比例高达 140%。',
    mechanism: '以短贷长（Maturity Mismatch）的期限错配在宏观流动性宽松时放大收益，但在美联储维持高利率时形成巨幅「展期墙」。',
    verdict: '【再融资展期危机】未来 2 个季度展期偿债压力极高，若无央行常设互换线支持将直接触发主权降级违约。',
    severity: 'WARNING',
    focusPriority: 2
  },
  portfolio: {
    id: 'portfolio',
    moduleTitle: '我的组合压力映射与账户风控',
    observation: '在基准外债与离岸休克情景下，全球平衡组合预期净减记达 -$38.4M (-7.68%)，99% 压力 VaR 达 -$51.8M。',
    mechanism: '持仓中的高贝塔新兴市场主权债直接减记，而欧洲大行信用债与离岸 PE 股权则因二阶网络同业传染被动受损。',
    verdict: '【账户防护行动】立即买入 5Y TR 主权 CDS，并将开曼离岸 PE 头寸调降 20% 切换至 3M 短期美债，可收敛 55% 极端回撤。',
    severity: 'CRITICAL',
    focusPriority: 1
  },
  usd: {
    id: 'usd',
    moduleTitle: '美元融资与部门信贷格局',
    observation: '美元在跨国银行借贷中维持 54.2% 的绝对主导地位，非美银行持有的美元资产与美元负债敞口持续倒挂。',
    mechanism: '欧洲和日本银行严重依赖离岸美元回购与跨货币互换满足资产端的美元融资，形成结构性美元流动性短缺。',
    verdict: '【美元霸权双刃剑】离岸美元流动性指数处于警戒区间，美元走强将自动引发全球非美银行资产负债表被动收缩。',
    severity: 'WARNING',
    focusPriority: 2
  },
  currency: {
    id: 'currency',
    moduleTitle: '多极货币竞争与汇率错配',
    observation: '非美货币（欧元、日元、人民币）在双边贸易结算中份额微升，但资本金融交易中美元依然占据主导地位。',
    mechanism: '脱钩去美元化在贸易结算端初步显现，但在跨国银行资产负债储备与衍生品担保品端依然严重受制于美元网络外部性。',
    verdict: '【去美元化结构性脱节】贸易本币化无法替代金融流动性安全垫，外汇衍生品错配风险依然集中于美元端。',
    severity: 'INFO',
    focusPriority: 3
  },
  swaps: {
    id: 'swaps',
    moduleTitle: '央行流动性互换与基差仪表盘',
    observation: '美联储与五大常设央行（ECB, BOE, BOJ, SNB, BOC）互换额度平稳，但新兴市场 CIP 交叉货币基差持续走阔。',
    mechanism: '美联储互换网络仅对 G10 核心盟友提供兜底流动性，新兴市场和离岸中心无法直接接入，导致美元离岸借贷成本大幅飙升。',
    verdict: '【流动性阶梯分化】一旦发生风暴，核心 G10 享有美联储无限互换护城河，而外围市场将面临严重的美元荒。',
    severity: 'WARNING',
    focusPriority: 2
  },
  fragmentation: {
    id: 'fragmentation',
    moduleTitle: '地缘金融碎片与地缘经济阵营',
    observation: '西方核心阵营内部信贷流向集中度升至 72%，而跨阵营（美欧 vs 中俄及部分前沿市场）资本流速放缓 28%。',
    mechanism: '地缘政治制裁、供应链近岸/友岸外包导致跨国跨阵营银行主动削减双边授信额度，全球金融网络呈现巴尔干化。',
    verdict: '【地缘资本割裂】全球资本网络正从单一无阻力大流通分裂为以地缘阵营为界限的双轨并行体系。',
    severity: 'WARNING',
    focusPriority: 2
  },
  risk: {
    id: 'risk',
    moduleTitle: '国家风险与最终外债敞口',
    observation: '新兴市场前五大借款国对外债务对财政收入比例升至 280%，主权偿债缓冲处于近 10 年低位。',
    mechanism: '商品价格波动与本地货币对美元贬值使外债折算本币本息偿还额急剧放大，形成债务与汇率的负反馈螺旋。',
    verdict: '【主权再融资阻断】前沿市场国际再融资窗口基本关闭，建议在【级联传染】模块中测试主权违约溢出。',
    severity: 'CRITICAL',
    focusPriority: 2
  },
  compare: {
    id: 'compare',
    moduleTitle: '多国宏观审慎指标对照',
    observation: '土耳其、阿根廷与部分东欧国家在流动性比率、外债占比与巴塞尔资本充足率三维度上全线落入预警象限。',
    mechanism: '经济体基本面分化加剧，高外债、低储备经济体抗击外部利率冲击的韧性远弱于亚洲制造国。',
    verdict: '【国别分化极值】投资配置应规避预警象限国家，转为增配净债权主权实体。',
    severity: 'INFO',
    focusPriority: 3
  },
  gravity: {
    id: 'gravity',
    moduleTitle: '跨国银行信贷引力计量模型',
    observation: '双边经贸往来与地理空间距离对银行信贷的决定系数由 0.65 降至 0.42，法律管辖区与避税通道变量显著性大幅上升。',
    mechanism: '现代全球金融不再仅仅服务于实体货物贸易，离岸金融工程与跨国税收套利成为双边信贷规模的核心推手。',
    verdict: '【传统引力模型失效】金融走廊与贸易走廊发生脱钩，金融网络分析必须穿透离岸壳架构。',
    severity: 'INFO',
    focusPriority: 3
  },
  comparison: {
    id: 'comparison',
    moduleTitle: '跨历史周期宏观制度对比',
    observation: '当前 2026Q1 的美元融资压力指数与 2020 疫情初期相当，但明显高于 2018 贸易摩擦周期。',
    mechanism: '高利率维持时间（Higher for Longer）超过市场预期，存量再融资到期成本显著高于前两个历史周期。',
    verdict: '【长周期压力确认】当前资本流动压力并非偶发脉冲，而是具有长周期结构性特征，需做好长期防御。',
    severity: 'INFO',
    focusPriority: 3
  },
  playbook: {
    id: 'playbook',
    moduleTitle: '历史金融风暴情景剧场',
    observation: '对比 1997 亚洲金融危机、2008 跨大西洋次贷危机与 2020 美元流动性冻结，当前危机传导路径高度雷同。',
    mechanism: '历次风暴无一例外发端于离岸借贷隐性杠杆断裂，继而通过欧美大行清算同业网级联扩散至全球。',
    verdict: '【历史警钟】防范危机最有效的工具为央行无上限货币互换，需密切跟踪美联储常设互换池动向。',
    severity: 'INFO',
    focusPriority: 3
  },
  dossier: {
    id: 'dossier',
    moduleTitle: '宏观研究备忘录与数据导出',
    observation: '已生成符合 BIS SDMX 2.1 统计标准的跨国信贷全景定量底稿与投委会纪要。',
    mechanism: '集成 LBS Table A、CBS Table B 与 Eisenberg-Noe 级联清算不动点，具备完整审计溯源。',
    verdict: '【审计交付就绪】支持一键导出 Python 计量脚本、投行级研报卡片与官方时间戳备忘录。',
    severity: 'INFO',
    focusPriority: 3
  }
};

// 2. Causal Knowledge Graph: Upstream Drivers & Downstream Consequences for every module
export const MODULE_CAUSAL_LINKS = {
  map: {
    upstream: [
      { tab: 'usd', label: '美元融资与部门信贷', reason: '美元计价占比决定了双边信贷流动性的扩张空间' },
      { tab: 'fragmentation', label: '地缘金融碎片与阵营', reason: '地缘阵营界线决定了银行双边授信边界' }
    ],
    downstream: [
      { tab: 'shadow', label: '影子银行与非银透视', outcome: '开曼/卢森堡等离岸中转节点背后的非银表外掉期真相', cta: '穿透离岸影子通道 ➔' },
      { tab: 'contagion', label: '银行级联传染模拟', outcome: '双边信贷动脉一旦发生断裂，对全网多米诺骨牌级联清算冲击', cta: '测试级联清算传导 ➔' }
    ]
  },
  contagion: {
    upstream: [
      { tab: 'ews', label: '巴塞尔早期预警 (EWS)', reason: '主权违约早期预警红灯为级联传染模型提供外生休克输入' },
      { tab: 'maturity', label: '期限结构与转期挤兑', reason: '集中到期的短期外债展期失败是违约触发的核心震中' }
    ],
    downstream: [
      { tab: 'portfolio', label: '我的组合压力映射', outcome: '将全网清算各经济体受损直接映射至您的账户持仓并评估净减记', cta: '映射至我的组合 ➔' },
      { tab: 'gsib', label: 'G-SIB 顶级银行透镜', outcome: '查看全网传染对受损最深的全球系统重要性银行资本缓冲的侵蚀', cta: '查看 G-SIB 银行透镜 ➔' }
    ]
  },
  portfolio: {
    upstream: [
      { tab: 'contagion', label: '银行级联传染模拟', reason: 'Eisenberg-Noe Picard 清算输出的各国边际违约向量为组合提供压力基准' },
      { tab: 'risk', label: '国家风险与外债敞口', reason: '主权外债脆弱性评分决定组合资产的风险等级' }
    ],
    downstream: [
      { tab: 'swaps', label: '央行互换线与基差', outcome: '查验央行常设互换协议能否对冲组合承受的美元流动性断裂', cta: '查看央行互换防线 ➔' },
      { tab: 'dossier', label: '宏观研报与数据导出', outcome: '一键将组合压力评估与对冲建议导出为投委会报告卡片', cta: '导出风控审计简报 ➔' }
    ]
  },
  shadow: {
    upstream: [
      { tab: 'map', label: '信贷流向地图', reason: '地图上指向避税中枢 (KY, LU, HK) 的反常资金流向引导影子银行穿透' },
      { tab: 'usd', label: '美元融资与部门信贷', reason: '美元融资成本抬升逼迫非银机构前往离岸寻求掉期加杠杆' }
    ],
    downstream: [
      { tab: 'contagion', label: '银行级联传染模拟', outcome: '非银表外掉期断裂被动平仓引发的跨国银行级联去杠杆', cta: '推演级联清算冲击 ➔' },
      { tab: 'portfolio', label: '我的组合压力映射', outcome: '将组合中的离岸对冲基金/PE 持仓穿透至母国并测算潜在减记', cta: '穿透组合离岸持仓 ➔' }
    ]
  },
  ews: {
    upstream: [
      { tab: 'risk', label: '国家风险与外债敞口', reason: '外债占财政比率激增直接恶化巴塞尔早期预警评分' },
      { tab: 'usd', label: '美元融资与部门信贷', reason: '全球美元融资成本上升推高外债利息负担' }
    ],
    downstream: [
      { tab: 'maturity', label: '期限结构与转期挤兑', outcome: '高危预警国家面临极高的短期债务转期挤兑风险', cta: '核查债务展期墙 ➔' },
      { tab: 'contagion', label: '银行级联传染模拟', outcome: '将预警红色警报国作为震中注入模型测试多米诺传染', cta: '发起震中传染测试 ➔' }
    ]
  },
  maturity: {
    upstream: [
      { tab: 'ews', label: '巴塞尔早期预警 (EWS)', reason: '早期预警指标恶化导致国际资本拒绝为短期外债展期' }
    ],
    downstream: [
      { tab: 'contagion', label: '银行级联传染模拟', outcome: '债务到期无法展期直接导致主权违约并触发清算传染', cta: '运行违约清算 ➔' }
    ]
  },
  usd: {
    upstream: [
      { tab: 'currency', label: '多极货币竞争与错配', reason: '多极货币结算发展状况决定全球对美元融资的依赖度' }
    ],
    downstream: [
      { tab: 'shadow', label: '影子银行与非银透视', outcome: '离岸美元融资紧张迫使机构转向外汇掉期表外通道', cta: '查看非银掉期暗雷 ➔' },
      { tab: 'map', label: '信贷流向地图', outcome: '美元资金流向在全球核心动脉上的分配图谱', cta: '查看信贷流向图谱 ➔' }
    ]
  },
  fragmentation: {
    upstream: [
      { tab: 'comparison', label: '跨周期宏观对比', reason: '从全球化大融合周期进入地缘阵营割裂周期的历史对比' }
    ],
    downstream: [
      { tab: 'currency', label: '多极货币竞争与错配', outcome: '地缘割裂推动跨国贸易本币结算与非美储备探索', cta: '查看货币竞争态势 ➔' },
      { tab: 'map', label: '信贷流向地图', outcome: '阵营内部抱团与跨阵营信贷断流在地理拓扑上的实证', cta: '查看地理流向断层 ➔' }
    ]
  }
};

// 3. Guided Investigation Playbooks: 3 Step-by-Step Macro Mystery Storylines
export const INVESTIGATION_TRACKS = [
  {
    id: 'shadow_dollar_mystery',
    title: '离岸美元避税与影子杠杆穿透追踪',
    subtitle: '揭开开曼与卢森堡离岸中转资金的面纱，追踪表外外汇掉期隐性负债',
    description: '揭开开曼与卢森堡离岸中转资金的面纱，追踪表外外汇掉期隐性负债',
    difficulty: '入门推荐',
    badge: '焦点主线 1',
    badgeColor: 'border-purple-500/50 bg-purple-950/60 text-purple-300',
    totalSteps: 4,
    steps: [
      {
        stepIndex: 1,
        tabId: 'map',
        title: '第 1 步：发现避税中枢资金异常积聚',
        prompt: '在信贷流向地图上观察开曼群岛 (KY) 与卢森堡 (LU) 汇聚的数万亿美元流向。点击「穿透离岸中心」开关，观察光弧如何自动重定向回美国和欧洲真实母公司主体。',
        actionLabel: '下一步：前往影子银行核查表外掉期 ➔'
      },
      {
        stepIndex: 2,
        tabId: 'shadow',
        title: '第 2 步：核查非银机构外汇掉期暗雷',
        prompt: '深入影子银行透镜，审视高达数十万亿美元的表外未记录外汇掉期。非银对冲基金利用开曼架构以短博长，形成极其脆弱的美元流动性断层。',
        actionLabel: '下一步：推演离岸流动性休克冲击 ➔'
      },
      {
        stepIndex: 3,
        tabId: 'contagion',
        title: '第 3 步：运行级联清算求解二阶受损',
        prompt: '在级联传染模拟器中切换至「离岸美元流动性休克」情景，观察英国伦敦和美欧核心银行如何在两轮多米诺传导中分摊数千亿美元损失。',
        actionLabel: '下一步：映射至投资组合测算减记 ➔'
      },
      {
        stepIndex: 4,
        tabId: 'portfolio',
        title: '第 4 步：在投资账户中筑起主动风控防线',
        prompt: '查看您的组合资产在此离岸休克下的预期减记与 99% VaR，采纳 AI 宏观对冲建议（缩减开曼 PE 敞口切换至短期美债，买入 CDS 锁定风险）。',
        actionLabel: '完成调查 · 查看风控简报'
      }
    ]
  },
  {
    id: 'sovereign_default_cascade',
    title: '主权债务风暴如何引爆全球大行？',
    subtitle: '从前沿市场早期预警红灯，到短期展期墙崩塌，再到全球银行多米诺违约',
    description: '从前沿市场早期预警红灯，到短期展期墙崩塌，再到全球银行多米诺违约',
    difficulty: '核心实战',
    badge: '焦点主线 2',
    badgeColor: 'border-rose-500/50 bg-rose-950/60 text-rose-300',
    totalSteps: 4,
    steps: [
      {
        stepIndex: 1,
        tabId: 'ews',
        title: '第 1 步：捕获土耳其主权违约早期预警',
        prompt: '在巴塞尔 EWS 雷达中定位信贷/GDP 缺口与外汇外债比率，土耳其 (TR) 全面亮起红色警报，偿债能力面临极限承压。',
        actionLabel: '下一步：核验短期债务展期压力 ➔'
      },
      {
        stepIndex: 2,
        tabId: 'maturity',
        title: '第 2 步：核查短期外债展期墙风险',
        prompt: '在期限结构模块中查看 1 年以内到期外债占比。土耳其与新兴市场外汇储备对到期外债覆盖率不足，再融资窗口即将关闭。',
        actionLabel: '下一步：测试向欧洲核心大行传染 ➔'
      },
      {
        stepIndex: 3,
        tabId: 'contagion',
        title: '第 3 步：Picard 不动点清算：德国首当其冲',
        prompt: '观察土耳其 40% 外债减记如何直接重创德国银行 ($69.2B)，并间接通过同业网络拉垮英国与美国银行。',
        actionLabel: '下一步：映射至我的投资账户 ➔'
      },
      {
        stepIndex: 4,
        tabId: 'portfolio',
        title: '第 4 步：组合资产压力映射与 CDS 对冲',
        prompt: '查看组合中新兴市场外债的直接减记与欧洲银行的二阶传染减记，一键生成对冲方案与投委会卡片。',
        actionLabel: '完成调查 · 导出研报卡片'
      }
    ]
  },
  {
    id: 'geopolitical_fragmentation_blocs',
    title: '地缘金融割裂与去美元化实证检验',
    subtitle: '实证检验地缘政治阵营对跨境资本流动性的重塑与双轨货币竞争',
    description: '实证检验地缘政治阵营对跨境资本流动性的重塑与双轨货币竞争',
    difficulty: '进阶宏观',
    badge: '焦点主线 3',
    badgeColor: 'border-blue-500/50 bg-blue-950/60 text-blue-300',
    totalSteps: 3,
    steps: [
      {
        stepIndex: 1,
        tabId: 'fragmentation',
        title: '第 1 步：量化地缘阵营资本巴尔干化',
        prompt: '在地缘金融碎片模块中观察西方核心阵营与非西方阵营之间的双边借贷断崖，跨阵营信贷流速同比锐减 28%。',
        actionLabel: '下一步：检验多极货币竞争态势 ➔'
      },
      {
        stepIndex: 2,
        tabId: 'currency',
        title: '第 2 步：多极货币结算 vs 储备错配脱节',
        prompt: '观察贸易端本币结算的上升与金融资产端美元高壁垒之间的结构性错配，去美元化在金融交易端依然步履维艰。',
        actionLabel: '下一步：跨历史危机周期对照 ➔'
      },
      {
        stepIndex: 3,
        tabId: 'comparison',
        title: '第 3 步：跨周期制度对比与长远结论',
        prompt: '将当前地缘割裂周期与 2008 全球化顶峰对比，确认全球资本流动已进入去中心化双轨并行的宏观新范式。',
        actionLabel: '完成调查 · 总结宏观结论'
      }
    ]
  }
];

// Helper to retrieve verdict for current tab
export function getModuleVerdict(tabId) {
  return MODULE_VERDICTS[tabId] || {
    id: tabId,
    moduleTitle: '宏观审慎分析工作台',
    observation: '当前正在监视全球跨国银行双边信贷网络与流动性指标分布。',
    mechanism: '跨国金融机构通过复杂的同业拆借、衍生品及离岸管道分配资本。',
    verdict: '【常规审慎监视】持续跟踪异常走廊流向与期限错配指标。',
    severity: 'INFO',
    focusPriority: 3
  };
}

// Helper to retrieve causal links for current tab
export function getModuleCausalLinks(tabId) {
  return MODULE_CAUSAL_LINKS[tabId] || { upstream: [], downstream: [] };
}
