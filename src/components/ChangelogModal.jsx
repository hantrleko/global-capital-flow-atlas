import React, { useState } from 'react';
import { 
  History, X, CheckCircle2, Sparkles, ShieldCheck, 
  Layers, GitBranch, ArrowRight, Activity, Cpu, 
  Terminal, Database, Share2, Copy, Check, ExternalLink
} from 'lucide-react';
import EugeneLogo, { EugeneFinanceEmblem } from './EugeneLogo';
import soundFx from '../utils/soundEffects';

export const SYSTEM_CHANGELOG = [
  {
    version: 'v4.0.0',
    date: '2026-10-29',
    status: 'LATEST',
    title: 'Phase 7 认知破壁与全景串联：零门槛投研导览与通俗因果叙事版 (Zero-Threshold Onboarding & Narrative Causal Atlas)',
    badge: '当前生产版本',
    badgeColor: 'border-emerald-500/50 bg-emerald-950/60 text-emerald-300',
    highlights: [
      {
        tag: '小白透视',
        title: '全局白话解读视角与 18 个核心金融术语通俗卡片 (Plain-Language Lens & Concept Tooltips)',
        desc: '全平台新增「💡 白话解读 / 🏛️ 专业术语」视角切换开关。内置 18 个核心金融量化概念词典（LBS/CBS、离岸壳、Eisenberg-Noe、CIP 基差、外汇掉期、VaR、主权 CDS 等），为每个术语提供通俗大白话、生活类比（如火灾险、中介费、民间借贷）与实战研读标准，悬停点击即可秒懂。'
      },
      {
        tag: '角色就绪',
        title: '三大受众预设角色与 30 秒极速就绪向导 (3 User Personas & Instant Setup)',
        desc: '新手导览提供「🌱 初次探索者」、「💼 宏观投资者」、「🔬 量化研究员」三大预设卡片。一键点击即可自动加载最佳视角、切换焦点/专家模式、设置离岸穿透与定位首选模块，消除“不知道从哪看起”的迷茫。'
      },
      {
        tag: '因果串联',
        title: '焦点模式四步因果推演主线与跨模块指引 (4-Step Causal Workflow & Breadcrumbs)',
        desc: '重构焦点模式 4 大核心支柱为因果闭环主线：① 查资金去向 ➔ ② 抓隐形杠杆 ➔ ③ 算多米诺骨牌 ➔ ④ 护住我的账户。在顶部增加链路指示器与导向箭头，专户风控页顶部新增全景传导面包屑，帮助使用者清晰掌握每一步的输入输出关联。'
      },
      {
        tag: '机制直观',
        title: '离岸穿透三段式图形化解构与多米诺四阶冲击波 (Visual Look-Through & Domino Shockwave Strips)',
        desc: '在双边地图中将抽象的 CBS 离岸穿透机制直观图解为「出资国跨国大行 ➔ 剥离 $6.84T 离岸通道空壳 ➔ 还原最终母国」三段式图板；在级联传染模拟器中新增「💥 震中引爆 ➔ 🩸 直接债主冲销 ➔ 🌊 同业踩踏外溢 ➔ 🛡️ 专户组合防线」四阶冲击波光条，彻底击破认知壁垒。'
      }
    ]
  },
  {
    version: 'v3.5.0',
    date: '2026-10-29',
    status: 'STABLE',
    title: 'Phase 6 审美与交互跃迁：机构级静奢投研终端版 (Institutional Quiet-Luxury Terminal)',
    badge: '历史稳定版',
    badgeColor: 'border-slate-500/50 bg-slate-900/60 text-slate-300',
    highlights: [
      {
        tag: '静奢双轨',
        title: '四级石墨静奢暗色体系与高对比投研纸本亮色主题 (4-Tier Graphite & Research Paper Themes)',
        desc: '重构色彩语义纪律：采用深海黑曜石至石墨卡片 4 级微光层阶，严格将红/琥珀/翡翠绿保留给真实风险与损益信号（中性化普通导航选中态），同步升级满足 WCAG AA 标准的纸本亮色主题，并全面执行 ≥11px 字号底线与 tabular-nums 等宽数字对齐。'
      },
      {
        tag: '零溢出顶栏',
        title: '紧凑双栏零溢出顶栏与结构化投研工具箱 (Zero-Overflow 2-Row Shell & Structured Toolbox)',
        desc: '将三行高密度顶栏压缩为 ~80px 紧凑双栏架构，低频工具统一收纳至「工具箱 ▾」浮层（计价币种、宏观 AI、冲击沙盒、私有数据、历史纪元、方法论附录），确保 1280px 桌面与 390px 移动视口零按钮截断。'
      },
      {
        tag: '同源研判',
        title: '首屏顶部实时同源研判条 (First-Screen Single-Source-of-Truth Verdict Strip)',
        desc: '将结论研判台提至主工作区首屏上方，浓缩为 ~38px 单行高密度实时研判条（点击展开三段式机理卡片），并与传染清算引擎、组合压力引擎实现 100% 实时计算同源同步。'
      },
      {
        tag: '图表重塑',
        title: '信号优先的减记归因图表、走廊聚光灯与对冲瀑布对照 (Signal-First Data Visualization)',
        desc: '级联传染与组合压力图表默认切换为「一阶直接损失 + 二阶网络传染」单调递减堆叠条形图；地图支持悬停流向聚光灯与右侧动脉榜单一键折叠扩屏；主动对冲防护台新增对冲前后净减记瀑布对照条与平滑数字插值。'
      }
    ]
  },
  {
    version: 'v3.0.0',
    date: '2026-10-29',
    status: 'STABLE',
    title: 'Phase 5 终极跃迁：全链路动态感知与闭环仿真版 (Live Dynamic Intelligence & Closed-Loop Simulation)',
    badge: '历史稳定版',
    badgeColor: 'border-slate-500/50 bg-slate-900/60 text-slate-300',
    highlights: [
      {
        tag: '动态研判',
        title: '实时数据驱动的动态三段式研判引擎 (Live Dynamic Verdict Engine)',
        desc: '彻底根除静态写死文案。研判引擎实时捕获当期跨国信贷总额、环比增速、活跃国家双边借贷头寸及最大异动走廊，随着季度切换与国别钻取，100% 动态生成专属该时空的现象、机理与行动指引。'
      },
      {
        tag: '自动编排',
        title: '剧本式侦探主线全状态自动编排 (Automated State Choreography)',
        desc: '3 大经典宏观破案故事线全面升级为声明式状态载荷驱动。使用者点击「下一步」时，系统自动联动底层地图离岸穿透开关、主权实体高亮聚焦、级联清算震中参数与组合情景，做到“所见即所讲”。'
      },
      {
        tag: '闭环联动',
        title: '传染清算 ➔ 组合风控动态穿透映射 (Live Contagion-to-Portfolio Bridge)',
        desc: '全面打通 Eisenberg-Noe Picard 级联清算模型与机构投资专户。支持在传染模拟器中将实时求解输出的各国边际违约损失率向量一键映射至组合资产，实现从宏观风暴到自营持仓减记的无缝闭环。'
      },
      {
        tag: '主动防御',
        title: '主动宏观对冲防护台与对冲前后对比 (Active Institutional Hedge Cockpit)',
        desc: '在组合压力映射中引入可勾选激活的交互式对冲方案（主权 CDS 互换、离岸 SPV 去杠杆至美债、跨货币互换基差套保），同屏实时对比对冲前净减记 vs 对冲后残余减记，精确量化挽回资本额。'
      }
    ]
  },
  {
    version: 'v2.5.0',
    date: '2026-10-29',
    status: 'STABLE',
    title: 'Phase 4 升级：认知聚焦与因果智能版 (Cognitive Focus & Causal Intelligence) · 三段式研判台、侦探主线与双模式架构',
    badge: '历史稳定版',
    badgeColor: 'border-slate-500/50 bg-slate-900/60 text-slate-300',
    highlights: [
      {
        tag: '结论研判',
        title: '三段式结论研判台 ("So What?" Executive Verdict Banner)',
        desc: '各分析工作台顶部常驻「现象 (Observation) ➔ 机理 (Mechanism) ➔ 结论与行动 (Verdict & Action)」三位一体研判台。直击使用者痛点，对 19 大模块分别输出最凝练的定量异动特征、深层驱动逻辑及具体风控/交易行动指引。'
      },
      {
        tag: '知识图谱',
        title: '宏观因果知识链 & 上下游下一跳 (Causal Knowledge Graph & Next-Step Bridge)',
        desc: '构建全球宏观跨模块因果逻辑图谱，打通上下游分析通道。提供一键直达前因溯源与后果推演的动态 CTA 跳转通道（如全球流向 ➔ 影子银行 ➔ 级联传染 ➔ 投资组合对冲）。'
      },
      {
        tag: '主线破案',
        title: '剧本式宏观侦探主线 (Guided Investigation Playbooks)',
        desc: '预设 3 条顶级对冲基金实战破案故事线（离岸影子杠杆穿透案、主权债务引爆全球大行案、地缘割裂与去美元化实证案）。底部常驻沉浸式导航 HUD，手把手带领使用者逐层解开全球资本流动暗流。'
      },
      {
        tag: '认知降维',
        title: '焦点决策模式 vs 专家全量模式 (Focus Mode vs. Pro Mode Toggle)',
        desc: '顶栏引入模式一键切换。焦点模式精简收敛为 4 大核心决策支柱（流向、传染、影子、组合），消除认知过载；专家模式保留 5 大宏观领域全量 19 个量化分析模块与参数，满足资深宽客深度研究需求。'
      }
    ]
  },
  {
    version: 'v2.0.0',
    date: '2026-10-28',
    status: 'STABLE',
    title: 'Phase 3 终极跃迁交付：我的组合压力映射 (Portfolio Stress Overlay) 与机构账户风控仪表盘',
    badge: '历史稳定版',
    badgeColor: 'border-slate-500/50 bg-slate-900/60 text-slate-300',
    highlights: [
      {
        tag: '核心突破',
        title: '我的组合压力映射引擎 (Portfolio Stress Overlay Engine)',
        desc: '将公共国际清算银行 (BIS) 跨国信贷网络与 Eisenberg-Noe 级联清算模型直接穿透映射至用户机构投资账户。全面支持全球宏观多空平衡组合、跨国银行司库流动性专户、新兴市场高收益外债专户及自定义组合 AUM 配置。'
      },
      {
        tag: '风控穿透',
        title: '一阶直接主权外债减记 vs 二阶网络多米诺级联损失拆解',
        desc: '基于资产类别贝塔弹性（主权债 0.95x、企业金融 1.35x、权益 1.65x、外汇衍生品 1.45x）及离岸穿透还原，精确量化各持仓标的损失贡献率与 99% 极端压力 VaR。'
      },
      {
        tag: '主动防御',
        title: 'AI 宏观对冲策略与资本防线生成 (Institutional Hedging Intelligence)',
        desc: '针对最大受损敞口自动生成主权 CDS 保护、交叉货币基差套保及离岸 SPV 去杠杆建议，并支持一键导出投行级「组合压力研报卡片」。'
      }
    ]
  },
  {
    version: 'v1.8.0',
    date: '2026-10-28',
    status: 'STABLE',
    title: 'Phase 2 交付：离岸金融中心穿透还原 (Look-Through OFCs) 与部门×工具多维切片',
    badge: '重要迭代',
    badgeColor: 'border-sky-500/50 bg-sky-950/60 text-sky-300',
    highlights: [
      {
        tag: '核心穿透',
        title: '离岸金融中心一键穿透还原 (Look-Through OFCs & Ultimate Risk)',
        desc: '基于 BIS CBS Table B 最终风险口径与 IMF CPIS 穿透模型，一键穿透开曼群岛 (KY)、卢森堡 (LU)、中国香港 (HK) 等 $6.85T 离岸转口资金，还原至美、中、德、英等母国真实风险承担者。'
      },
      {
        tag: '多维切片',
        title: '交易对手部门 × 金融工具交叉切片 (Sector & Instrument Slicing)',
        desc: '全球双边信贷走廊与地图全面支持银行同业 (Interbank)、非银金融机构 (NBFI/对冲基金)、主权公共部门及实体企业 4 大部门，以及跨境贷款、国际债务证券、外汇衍生品 3 大工具多维筛选与动态聚类。'
      },
      {
        tag: '研报交付',
        title: '新增离岸穿透与最终风险卡片模板 (Card Template 5)',
        desc: '在投行级研报卡片导出中新增「离岸中心穿透还原卡」，直观展示穿透离岸壳实体后各母国最终风险敞口及核心研判结论。'
      }
    ]
  },
  {
    version: 'v1.5.0',
    date: '2026-10-28',
    status: 'STABLE',
    title: 'Phase 1 交付：平行情景 A/B 差分对比、投行级单图导出与版本日志系统',
    badge: '主要里程碑',
    badgeColor: 'border-blue-500/50 bg-blue-950/60 text-blue-300',
    highlights: [
      {
        tag: '核心升级',
        title: '平行情景 A/B 差分推演工作台 (Scenario A vs. B Diff Workbench)',
        desc: '在网络传染模拟器中引入并行双情景清算与 Delta 差分引擎。支持将任意宏观冲击锁定为基准 A（如离岸美元流动性枯竭），并调制政策干预情景 B（如央行互换额度开启与资本缓冲倍数提升），同屏即时输出各国受损差值、被挽救经济体排序及直接/间接传染阻断效能。'
      },
      {
        tag: '交付生产力',
        title: '投行级研报单图卡片一键导出 (Publication-Ready Chart Cards)',
        desc: '专为投委会晨会与专业研报打造的一键生成卡片系统。涵盖宏观总览卡、双边走廊卡、级联清算卡及情景差分评估卡，内嵌 EUGENE FINANCE 官方图元水印、数据分级审计戳与高清 2x PNG / Markdown 复制。'
      },
      {
        tag: '治理架构',
        title: '全生命周期版本演进日志系统 (Changelog & Architecture Modal)',
        desc: '集中收录平台从 v1.0.0 初始发布至当前版本的技术架构演进、严苛数学测试矩阵及工程设计决策链。'
      }
    ]
  },
  {
    version: 'v1.4.0',
    date: '2026-10-28',
    status: 'STABLE',
    title: '界面空间重构与微观可读性优化 (Decluttering & Spatial Elevation)',
    badge: '体验增强',
    badgeColor: 'border-sky-500/50 bg-sky-950/60 text-sky-300',
    highlights: [
      {
        tag: '视觉消歧',
        title: '西欧核心枢纽防重叠机制 (European Hub Decluttering)',
        desc: '在全球宏观全景视图下收敛常驻标签至关键枢纽，西欧仅保留上方 GB 与下方 DE，根除文字重叠；缩放或切换至欧洲预设时自动平滑展开法国 (FR) 与瑞士 (CH)。'
      },
      {
        tag: '空间延展',
        title: '消除大屏 220px 黑色死区 (Void Elimination)',
        desc: '全景地图容器升级为响应式弹性高度 (xl:min-h-[720px] 2xl:min-h-[760px])，自适应填满宽屏显示器黄金视口。'
      },
      {
        tag: '移动优化',
        title: '390px 移动视口零溢出适配',
        desc: '适配 iPhone 14 标准 390x844 视口，重构 ECharts geo 布局比例 (98%) 与中心缩放 (1.05)，无横向滚动条。'
      },
      {
        tag: '首屏防护',
        title: '34px 极简胶囊宏观洞察栏 (Capsule Ticker)',
        desc: '重构 30 秒宏观洞察为单行 34px 胶囊交互栏，仅在首页地图视口激活，保护二级分析模块首屏黄金折叠线。'
      }
    ]
  },
  {
    version: 'v1.3.0',
    date: '2026-10-27',
    status: 'STABLE',
    title: 'EUGENE FINANCE 品牌标识确立与权威三级数据分级体系',
    badge: '品牌与合规',
    badgeColor: 'border-purple-500/50 bg-purple-950/60 text-purple-300',
    highlights: [
      {
        tag: '品牌塑造',
        title: 'EUGENE FINANCE 官方几何图元徽标集成',
        desc: '融入官方向上突破箭头与金融柱状图徽标，支持 Retina/4K 视网膜极清显示及暗黑毛玻璃自适应。'
      },
      {
        tag: '合规审计',
        title: '严格规范三级数据分级体系 (3-Tier Canonical Badges)',
        desc: '明确界定 2018Q1–2026Q1 为官方观测 (Official Observed)、2026Q2 为官方待公布估算 (Pending Release)、2026Q3–Q4 为前瞻压力情景 (Nowcast Scenario)，杜绝口径混淆。'
      }
    ]
  },
  {
    version: 'v1.2.0',
    date: '2026-10-26',
    status: 'STABLE',
    title: '跨模块主权实体图钉与深度快照链接架构 (Entity Pinning & Deep Links)',
    badge: '交互突破',
    badgeColor: 'border-amber-500/50 bg-amber-950/60 text-amber-300',
    highlights: [
      {
        tag: '全局联动',
        title: '全域主权实体图钉栏 (Global Pinned Entity Bar)',
        desc: '实现跨 18 个分析模块无缝承接当前聚焦经济体，支持一键发起传染冲击测试、期限转期穿透与走廊透视。'
      },
      {
        tag: '状态共享',
        title: 'URL Deep-Linking 状态双向同步与一键分享',
        desc: '将季度、模块、聚焦国家、计价币种及传染震中编码实时持久化于 URL 参数，支持一键复制推演现场。'
      },
      {
        tag: '智能辅助',
        title: '宏观 AI 决策副驾驶 (Macro AI Copilot)',
        desc: '集成多维度启发式宏观审慎推理，一键生成资产负债表穿透诊断与流动性断裂预警。'
      }
    ]
  },
  {
    version: 'v1.1.0',
    date: '2026-10-22',
    status: 'STABLE',
    title: '高维数据集分片冷启动与 337 项清算引擎测试矩阵',
    badge: '性能与验证',
    badgeColor: 'border-blue-500/50 bg-blue-950/60 text-blue-300',
    highlights: [
      {
        tag: '性能突破',
        title: '4 大高维数据分片按需载入 (On-Demand Data Partitioning)',
        desc: '将庞大的全量历史双边矩阵切分为核心基线 (411KB)、近期分片、历史分片与 CBS 风险分片，首屏冷启动耗时降低 65%。'
      },
      {
        tag: '学术级验证',
        title: '337 项 Eisenberg-Noe 清算引擎全量回归测试套件',
        desc: '建立覆盖零冲击恒等式、Picard 算子收敛性 (残差 < 1e-4)、双基线不变性及 Float64 无舍入计算规范的自动化测试流水线。'
      }
    ]
  },
  {
    version: 'v1.0.0',
    date: '2026-10-16',
    status: 'ARCHIVE',
    title: 'BIS 全球资本流向全景图初始发布 (Initial Release)',
    badge: '基础奠基',
    badgeColor: 'border-slate-700 bg-slate-900 text-slate-400',
    highlights: [
      {
        tag: '系统蓝图',
        title: '5 大分析域与 18 个宏观审慎分析模块全面上线',
        desc: '基于国际清算银行 (BIS) LBS 与 CBS 官方数据源，构建涵盖宏观地理拓扑、双边信贷走廊、早期预警 (EWS)、G-SIB 监管及货币霸权等完整量化分析体系。'
      }
    ]
  }
];

export default function ChangelogModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('timeline'); // 'timeline' | 'architecture'
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopyChangelog = () => {
    soundFx.playChime();
    const md = `# EUGENE FINANCE Global Capital Flow Atlas - Version Changelog
Current Version: v2.0.0 (Updated 2026-10-28)

${SYSTEM_CHANGELOG.map(rel => `## ${rel.version} (${rel.date}) - ${rel.title}
${rel.highlights.map(h => `- **${h.title}**: ${h.desc}`).join('\n')}
`).join('\n')}`;

    navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div 
        className="w-full max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-400/40 flex items-center justify-center text-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.2)]">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">
                  版本更迭记录与架构演进日志
                </h3>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  v4.0.0 Current
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                EUGENE FINANCE Global Capital Flow Atlas · 全周期架构演进与交付历程
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyChangelog}
              className="h-8 px-2.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer"
              title="复制完整 Markdown 格式更新日志"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
              <span>{copied ? '已复制' : '复制日志'}</span>
            </button>
            <button
              onClick={() => {
                soundFx.playTick();
                onClose();
              }}
              className="w-8 h-8 rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
              title="关闭日志弹窗"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-5 py-2.5 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between gap-3 text-xs">
          <div className="inline-flex rounded-lg bg-slate-950 p-0.5 border border-slate-800">
            <button
              onClick={() => {
                soundFx.playTick();
                setActiveTab('timeline');
              }}
              className={`px-3 py-1 rounded-md font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'timeline'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <GitBranch className="w-3.5 h-3.5" />
              <span>版本演进历程</span>
            </button>
            <button
              onClick={() => {
                soundFx.playTick();
                setActiveTab('architecture');
              }}
              className={`px-3 py-1 rounded-md font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'architecture'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>系统架构拓扑</span>
            </button>
          </div>

          <div className="text-[11px] font-mono text-slate-500">
            发布周期: 2026-10-16 至 2026-10-28 (累计 8 次关键发版)
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {activeTab === 'timeline' ? (
            <div className="relative border-l-2 border-slate-800 ml-3 sm:ml-4 pl-4 sm:pl-6 space-y-8">
              {SYSTEM_CHANGELOG.map((rel, idx) => {
                const isLatest = idx === 0 || rel.status === 'LATEST';
                return (
                  <div key={rel.version} className="relative group">
                    {/* Timeline Node Dot */}
                    <div 
                      className={`absolute -left-[25px] sm:-left-[33px] top-1.5 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                        isLatest 
                          ? 'bg-emerald-500 border-white shadow-[0_0_12px_rgba(16,185,129,0.8)]' 
                          : 'bg-slate-900 border-slate-600 group-hover:border-sky-400'
                      }`}
                    >
                      {isLatest && <div className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
                    </div>

                    {/* Version Card */}
                    <div className={`p-4 rounded-xl border transition-all ${
                      isLatest 
                        ? 'bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/20 border-emerald-500/40 shadow-lg' 
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                    }`}>
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-800/80">
                        <div className="flex items-center gap-2.5">
                          <span className="text-base font-black font-mono tracking-tight text-white">
                            {rel.version}
                          </span>
                          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${rel.badgeColor}`}>
                            {rel.badge}
                          </span>
                        </div>
                        <span className="text-xs font-mono text-slate-500">
                          {rel.date}
                        </span>
                      </div>

                      <h4 className="text-sm font-bold text-white mb-3">
                        {rel.title}
                      </h4>

                      <div className="grid grid-cols-1 gap-2.5">
                        {rel.highlights.map((h, hIdx) => (
                          <div 
                            key={hIdx} 
                            className="p-2.5 rounded-lg bg-slate-950/50 border border-slate-800/80 flex flex-col gap-1"
                          >
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-sky-300">
                              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-sky-500/10 border border-sky-500/30 text-sky-400">
                                {h.tag}
                              </span>
                              <span>{h.title}</span>
                            </div>
                            <p className="text-xs text-slate-400 leading-relaxed pl-1">
                              {h.desc}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold text-white">
                  <Cpu className="w-4 h-4 text-purple-400" />
                  <span>系统分层架构总览 (5-Layer Architectural Stack)</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-5 gap-2 text-xs">
                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-mono text-sky-400 font-bold">L1 · 数据载入层</span>
                      <h5 className="font-bold text-white mt-1">BIS 分片引擎</h5>
                      <p className="text-[11px] text-slate-400 mt-1">4 大按需分片 (Core, 近期, 历史, CBS 风险)</p>
                    </div>
                    <span className="text-[9px] font-mono text-emerald-400 mt-2">冷启动 411KB</span>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-mono text-purple-400 font-bold">L2 · 核心清算层</span>
                      <h5 className="font-bold text-white mt-1">Eisenberg-Noe</h5>
                      <p className="text-[11px] text-slate-400 mt-1">Picard 不动点迭代 (残差 &lt; 1e-4) 与双基线分解</p>
                    </div>
                    <span className="text-[9px] font-mono text-purple-400 mt-2">337 项单元测试</span>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-mono text-amber-400 font-bold">L3 · 状态调度层</span>
                      <h5 className="font-bold text-white mt-1">实体图钉 &amp; 链接</h5>
                      <p className="text-[11px] text-slate-400 mt-1">全站主权实体穿透与 URL 双向参数同步</p>
                    </div>
                    <span className="text-[9px] font-mono text-amber-400 mt-2">Deep-Link Sharing</span>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-mono text-rose-400 font-bold">L4 · 分析工作台</span>
                      <h5 className="font-bold text-white mt-1">A/B 差分推演</h5>
                      <p className="text-[11px] text-slate-400 mt-1">平行宇宙双情景对比与央行流动性救助效能</p>
                    </div>
                    <span className="text-[9px] font-mono text-rose-400 mt-2">Delta Diff Engine</span>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-mono text-emerald-400 font-bold">L5 · 研报交付层</span>
                      <h5 className="font-bold text-white mt-1">投行级研报卡片</h5>
                      <p className="text-[11px] text-slate-400 mt-1">6 款即时生成卡片（含机构组合压力与离岸穿透），高清 2x 导出与水印</p>
                    </div>
                    <span className="text-[9px] font-mono text-emerald-400 mt-2">Publication-Ready</span>
                  </div>
                </div>
              </div>

              {/* Technical Specifications */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2 font-mono flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-sky-400" />
                  <span>工程规范与数学不变性守护 (Engineering Invariants)</span>
                </h4>
                <ul className="text-xs text-slate-300 space-y-1.5">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong>零冲击恒等性 (Zero-Shock Invariance):</strong> 当初始外生冲击为 0 时，边际增量违约赤字严格 Bitwise 恒等于 0，绝不产生虚假增量。</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong>Float64 高精度全网守恒:</strong> 中间计算严禁过早舍入，各经济体受损总和严格等于全网清算差值。</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong>三级数据分级权威性:</strong> 官方已公布数据与模型前瞻推演在全平台所有图表与导出产物中均具有独立审计戳。</span>
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/90 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <EugeneLogo size="sm" showText={false} />
            <span>EUGENE FINANCE Quantitative Macro Research · 严格遵循国际清算银行标准</span>
          </div>
          <button
            onClick={() => {
              soundFx.playTick();
              onClose();
            }}
            className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors cursor-pointer"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
