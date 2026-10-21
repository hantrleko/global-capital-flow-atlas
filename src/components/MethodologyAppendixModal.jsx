import React, { useState } from 'react';
import { 
  X, BookOpen, Database, ShieldAlert, Cpu, Layers, 
  ExternalLink, CheckCircle, Copy, FileText, Scale, Activity
} from 'lucide-react';
import soundFx from '../utils/soundEffects';

export default function MethodologyAppendixModal({ isOpen, onClose }) {
  const [activeSection, setActiveSection] = useState('overview');
  const [copiedCitation, setCopiedCitation] = useState(false);

  if (!isOpen) return null;

  const handleCopyCitation = (text) => {
    soundFx.playChime();
    navigator.clipboard.writeText(text);
    setCopiedCitation(true);
    setTimeout(() => setCopiedCitation(false), 2500);
  };

  const bibtexCitation = `@software{GlobalCapitalFlowAtlas2026,
  author = {EF Lab Quantitative Macro Research},
  title = {BIS Global Capital Flow Atlas: Multi-Dimensional Cross-Border Banking & Macroprudential Surveillance Platform},
  year = {2026},
  url = {https://hantrleko.github.io/global-capital-flow-atlas/},
  note = {Based on BIS Locational Banking Statistics (LBS Table A6) & Consolidated Banking Statistics (CBS Table B4) with Stylized Matrix Balancing}
}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div 
        className="relative w-full max-w-5xl max-h-[92vh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-sky-400 shadow-sm">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-tight">方法论与数据附录 (Methodology & Data Appendix)</h2>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  Data Vintage: 2026-10-14
                </span>
              </div>
              <p className="text-xs text-slate-400">
                国际清算银行统计口径规范、矩阵最大熵估算方程与实证计量假定说明
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              soundFx.playTick();
              onClose();
            }}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="关闭窗口"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Layout */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Navigation Sidebar */}
          <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-slate-800 bg-slate-950/40 p-3 space-y-1 shrink-0 overflow-y-auto">
            <div className="text-[10px] uppercase font-mono tracking-wider text-slate-500 px-3 py-1.5 font-semibold">
              附录章节
            </div>
            {[
              { id: 'overview', label: '1. 数据源与分层规范', icon: Database },
              { id: 'lbs_cbs', label: '2. LBS 与 CBS 统计口径', icon: Layers },
              { id: 'ras_matrix', label: '3. 矩阵最大熵平衡算法', icon: Cpu },
              { id: 'eisenberg_noe', label: '4. 级联清算模型假定', icon: ShieldAlert },
              { id: 'nowcast', label: '5. 临近预报与置信区间', icon: Activity },
              { id: 'citation', label: '6. 学术引用与 BibTeX', icon: FileText }
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeSection === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    soundFx.playTick();
                    setActiveSection(tab.id);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium transition-all text-left cursor-pointer ${
                    isActive 
                      ? 'bg-blue-600/20 border border-blue-500/40 text-sky-300 font-semibold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-sky-400' : 'text-slate-500'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Body Section */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm text-slate-300 leading-relaxed">
            {activeSection === 'overview' && (
              <div className="space-y-5 animate-fade-in">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Database className="w-4 h-4 text-sky-400" />
                    一、数据源架构与严谨分层 (Data Architecture & Provenance)
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    系统严格遵循国际清算银行 (BIS) 与金融稳定委员会 (FSB) 公布的官方数据标准，建立分层透明的数据管道。
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-950/20 space-y-2">
                    <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs">
                      <CheckCircle className="w-4 h-4" />
                      官方观测区间 (Observed Periods)
                    </div>
                    <div className="text-xl font-bold font-mono text-white">2018Q1 – 2026Q1 官方确证 / 2026Q2 待发布预估</div>
                    <p className="text-xs text-slate-300">
                      <strong>全球总量锚定 BIS 官方公布值</strong>（2025 年末全球跨境银行总债权收于 <strong>$46.12T</strong>，2026Q1 SDMX 官方最新确证值为 <strong>$47.62T</strong>，2026Q2 待官方发布估算基准值为 <strong>$47.82T</strong>）；国别总额与双边信贷走廊在满足该总量硬约束下，基于申报国权重与双比例最大熵矩阵平衡 (RAS) 进行模型重构校准。
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-purple-500/30 bg-purple-950/20 space-y-2">
                    <div className="flex items-center gap-2 text-purple-400 font-semibold text-xs">
                      <Activity className="w-4 h-4" />
                      前瞻情景推演区间 (Scenario Projections)
                    </div>
                    <div className="text-xl font-bold font-mono text-white">2026Q3 – 2026Q4 (2 季度)</div>
                    <p className="text-xs text-slate-300">
                      由于 BIS 官方统计每季度滞后约 1 个季度发布（如 Q2 数据于当年 10 月底公布），对远端季度（2026Q3/Q4）采用锚定近期动量的<strong>趋势情景推演</strong>，显式标注 <code>[SCENARIO PROJECTION]</code> 徽标与合理情景范围 ($47.90T–$49.30T)。
                    </p>
                  </div>
                </div>

                {/* Indicator-Level Provenance Table */}
                <div className="p-4 rounded-xl border border-slate-700 bg-slate-950/70 space-y-3">
                  <div className="text-xs font-semibold text-white flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-sky-400" />
                    指标级数据来源与可信度分层表 (Indicator-Level Provenance Table)
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono text-slate-300 border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400 text-[11px]">
                          <th className="py-2 pr-3">指标类别</th>
                          <th className="py-2 pr-3">数据源 / 计算方法</th>
                          <th className="py-2 pr-3">可信度定性</th>
                          <th className="py-2">核查依据 / 容差</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 text-[11px]">
                        <tr>
                          <td className="py-2 font-bold text-white font-sans">全球跨境总债权</td>
                          <td className="py-2">BIS SDMX 2.1 API (WS_LBS_D_PUB Table A6.2)</td>
                          <td className="py-2 text-emerald-400 font-sans">官方观测 (≤2026Q1) / 待核实估算 (2026Q2)</td>
                          <td className="py-2 text-slate-400">stats.bis.org API 实时核验</td>
                        </tr>
                        <tr>
                          <td className="py-2 font-bold text-white font-sans">国别资产与负债</td>
                          <td className="py-2">LBS 申报国历史参与份额 + 宏观总量恒等分配</td>
                          <td className="py-2 text-sky-400 font-sans">模型分配 (Model Allocated)</td>
                          <td className="py-2 text-slate-400">∑Claims = ∑Liab = 全球总量 (残差 0.0B)</td>
                        </tr>
                        <tr>
                          <td className="py-2 font-bold text-white font-sans">双边微观信贷走廊</td>
                          <td className="py-2">双比例最大熵 RAS 算法 (Iterative Proportional Fitting)</td>
                          <td className="py-2 text-sky-400 font-sans">模型重构 (Model Reconstructed)</td>
                          <td className="py-2 text-emerald-400">506 条全量导出，行差=0.0B，列差=0.0B</td>
                        </tr>
                        <tr>
                          <td className="py-2 font-bold text-white font-sans">美元融资压力指数</td>
                          <td className="py-2">交叉货币掉期基差 (EUR/JPY/CNY) + 央行互换用量</td>
                          <td className="py-2 text-amber-400 font-sans">合成指数 (Synthetic Composite)</td>
                          <td className="py-2 text-slate-400">0–100 综合离岸美元流动性紧张度</td>
                        </tr>
                        <tr>
                          <td className="py-2 font-bold text-white font-sans">早期预警与资本缓冲</td>
                          <td className="py-2">Credit-to-GDP Gap / DSR / Guidotti 比率</td>
                          <td className="py-2 text-purple-400 font-sans">监管标定 (Regulatory Stylized)</td>
                          <td className="py-2 text-slate-400">巴塞尔协议 III (Basel III) 监测规则</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-sky-500/30 bg-sky-950/20 space-y-2">
                  <div className="text-xs font-semibold text-sky-300 flex items-center gap-2">
                    <Database className="w-4 h-4" />
                    核心计量口径：期末存量 (Positions) 与 未调整存量变化 (Stock Changes)
                  </div>
                  <p className="text-xs text-slate-300 leading-normal">
                    本项目严格遵循 BIS 国际银行统计准则：<br />
                    • <strong>未清偿存量资产 (Amounts Outstanding / Positions)</strong>：反映期末全球跨境银行债权总额（如 2026Q1 官方确证值 $47.62T）。不可将其称为单季“资本流动量”；<br />
                    • <strong>未调整存量变化 (Unadjusted Stock Changes)</strong>：反映相邻季度间存量资产一阶差分 ΔClaims = Claims(t) - Claims(t-1)。注意：由于切片未做多币种汇率波动与统计断点剔除，不可等同于正式的调整后资金净流动 (Break- & FX-adjusted Flows)。
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-slate-700 bg-slate-950/60 space-y-2">
                  <div className="text-xs font-semibold text-slate-200">数据发布周期与更新机制</div>
                  <p className="text-xs text-slate-400 leading-normal">
                    国际清算银行通常在每年 1 月、4 月、7 月、10 月发布季度银行统计公报。本项目通过 GitHub Actions 流水线自动化同步官方更新，确保历史序列与国际金融统计完全接轨。
                  </p>
                </div>
              </div>
            )}

            {activeSection === 'lbs_cbs' && (
              <div className="space-y-5 animate-fade-in">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-sky-400" />
                    二、LBS 与 CBS 双轨统计口径辨析 (Residence vs Ultimate Risk)
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    正确理解国际银行统计，核心在于区分 BIS 旗下两套并立的统计支柱。
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/50 space-y-2">
                    <div className="text-xs font-bold text-sky-400 font-mono">1. 地域性银行业统计 (Locational Banking Statistics, LBS - Table A6)</div>
                    <p className="text-xs text-slate-300">
                      <strong>核心原则：常住地原则 (Residence Principle)</strong>。无论银行法人母国为何，只要业务设立在伦敦、新加坡或开曼群岛，均计入该所在辖区。
                    </p>
                    <p className="text-xs text-slate-400">
                      <strong>应用价值：</strong>追踪跨国货币流动、离岸欧洲美元 (Eurodollar) 资金池与跨货币清算路由，是本系统构建“资本流动地图”与“网络拓扑图”的核心基准。
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/50 space-y-2">
                    <div className="text-xs font-bold text-amber-400 font-mono">2. 综合银行业统计 (Consolidated Banking Statistics, CBS - Table B4)</div>
                    <p className="text-xs text-slate-300">
                      <strong>核心原则：最终风险承担原则 (Ultimate Risk Basis)</strong>。穿透中间离岸避税地或特殊目的实体 (SPV)，根据最终母国母行或主权担保人的实际住所确定风险归属。
                    </p>
                    <p className="text-xs text-slate-400">
                      <strong>应用价值：</strong>评估特定国家商业银行体系在危机时的真实对外资产负债表损失，是本系统“国家风险矩阵”与“巴塞尔早期预警系统 (EWS)”的计算基础。
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'ras_matrix' && (
              <div className="space-y-5 animate-fade-in">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-sky-400" />
                    三、双边信贷矩阵平衡算法 (Biproportional RAS / Maximum Entropy)
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    由于 BIS 出于统计保密协议限制，对部分细分双边走廊实行数据脱敏，本系统采用国际通行的最大熵矩阵平衡算法。
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/80 font-mono text-xs text-slate-300 space-y-2">
                  <div className="text-slate-400 font-semibold">【数学优化规划】</div>
                  <div className="p-3 bg-slate-900 rounded-lg text-emerald-400 overflow-x-auto">
                    min ∑_(i,j) X_ij * ln(X_ij / X_ij^0)<br />
                    s.t.  ∑_j X_ij = Claims_i  (各报告国出境总头寸硬约束)<br />
                    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ∑_i X_ij = Liab_j    (各对手国入境总头寸硬约束)
                  </div>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    算法通过迭代双比例平衡因子 (r_i, s_j)，使得双边矩阵 <code className="text-sky-300">X_ij = r_i * X_ij^0 * s_j</code> 在极小化信息相对熵的条件下精确收敛于各国官方边际总量，保障总资产与总负债的会计一致性。
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-950/20 space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold">
                    <CheckCircle className="w-4 h-4" />
                    两阶段守恒与实测检验 (Two-Stage Verification)
                  </div>
                  <div className="space-y-1.5 text-slate-300">
                    <p>• <strong>阶段一（连续空间 RAS 求解）：</strong>迭代求解双比例乘子，直至最大边际残差 &lt; 1e-4 Bn USD，确保数学上最大熵分布收敛；</p>
                    <p>• <strong>阶段二（离散整点调校与全量导出）：</strong>为防止四舍五入或截断丢额，采用 0.1B 离散整点分配算法与行中性列对齐，所有 506 条双边走廊全量保留无截断，<strong>导出矩阵实测行差 = 0.0 Bn USD，列差 = 0.0 Bn USD</strong>，与各国 LBS 节点头寸绝对一致。</p>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'eisenberg_noe' && (
              <div className="space-y-5 animate-fade-in">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-rose-400" />
                    四、级联清算模型与双基线契约说明 (Eisenberg-Noe Stylized Contagion)
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    系统性风险网络清算算法原理、外部流动性缓冲参数化假定与收敛守护规范。
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-950/20 text-xs text-amber-200/90 leading-relaxed space-y-2">
                  <div className="font-bold flex items-center gap-1.5 text-amber-300">
                    <Scale className="w-4 h-4" />
                    重要方法论说明 (Methodology Disclaimer):
                  </div>
                  <p>
                    各国金融监管机构（美联储、欧洲央行、金融稳定委员会等）对各商业银行间具体的逐笔信贷对账与敞口明细实行最高等级的商业保密法。
                    因此，本系统的“银行级联传染模拟”与“Top 30 G-SIBs 微观透镜”模块：
                  </p>
                  <ul className="list-disc pl-5 space-y-1 text-slate-300">
                    <li>资本充足率（CET1）、杠杆率、FSB 附加缓冲要求<strong>完全取自各机构最新官方披露</strong>；</li>
                    <li>银行间级联传染路径基于学术经典文献 <strong>Eisenberg-Noe (2001) 清算向量不动点算法</strong> 进行<strong>示意性结构模拟</strong>；</li>
                    <li>用于定量展示流动性螺旋与资产减记的系统性扩散机理，<strong>并非且不应被理解为监管部门未公开的逐笔真实合同</strong>。</li>
                  </ul>
                </div>

                <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/70 space-y-3 text-xs text-slate-300">
                  <div className="font-semibold text-white flex items-center gap-2">
                    <span>🔬 外部流动性缓冲假定学术依据 (Boundary Capital e_i Parameterization)</span>
                  </div>
                  <p className="leading-relaxed">
                    在经典 Eisenberg-Noe (2001) 框架中，向量 <strong>\(e_i \ge 0\)</strong> 代表各节点在网络闭合边界之外持有的“外生自由现金流或可变现流动性缓冲”。在微观单体银行体系中，这通常对应于中央银行准备金与未抵押优质流动性资产（HQLA）。
                  </p>
                  <p className="leading-relaxed">
                    在跨国宏观金融网络模型中（参考 Glasserman & Young, 2015；Cont et al., 2013 及 BIS 宏观审慎工作论文），国家主权管辖区层面的外部流动性缓冲常以官方外汇储备为锚。本系统设立<strong>参数化敏感度阶梯</strong>：
                  </p>
                  <ul className="list-disc pl-5 space-y-1 text-slate-400">
                    <li><strong>1.0x 外储（严格外储）：</strong>仅假定主权直接动用官方外汇储备用于跨国银行间垫付；</li>
                    <li><strong>1.5x 外储（学术基准）：</strong>纳入主权流动性缓冲与可紧急变现主权债资产（系统默认）；</li>
                    <li><strong>2.0x 外储（广义互换缓冲）：</strong>额外计入核心双边央行常备流动性互换行（Swap Lines）额度。</li>
                  </ul>
                  <p className="text-amber-300 text-[11px] bg-amber-950/40 p-2.5 rounded border border-amber-500/30">
                    ⚠️ <strong>特别提示：</strong>外部缓冲设定为纯粹的模型边界参数（Model Boundary Parameter），旨在为不动点清算提供收敛边界，<strong>绝不等同于现实宏观世界中已经或必定发生的外储损失或全要素经济资本损失</strong>。
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/70 space-y-3 text-xs text-slate-300">
                  <div className="font-semibold text-white">双基线差分（Dual-Baseline Difference）与 Picard 求解收敛守护</div>
                  <p className="leading-relaxed">
                    由于全球 23 个核心管辖区网络是一个闭合的离散银行间系统，核心储备货币国（如美、英、开曼）的数万亿跨国负债远超其官方外汇储备，零冲击状态下模型即存在内生未清偿差额。因此，本系统严格贯彻<strong>双基线差分准则</strong>：
                  </p>
                  <div className="font-mono bg-slate-900 p-2.5 rounded border border-slate-800 text-[11px] text-sky-300 space-y-1">
                    <div>1. 零冲击基线: S^(0) = Σ_j s_j^(0), 由 p^(0) = min(pbar, Pi^T * p^(0) + e^(0)) 求解</div>
                    <div>2. 冲击后总短缺: S* = Σ_j s_j*, 由 p* = min(pbar, Pi^T * p* + e*) 求解</div>
                    <div>3. 冲击边际净增量: ΔS = max(0, S* - S^(0))（以 64 位双精度浮点数直接相减，禁止由舍入总额反推）</div>
                  </div>
                  <p className="leading-relaxed text-slate-400">
                    双基线求解均采用 Picard 迭代，收敛容差阈值严格定为 <strong>1e-4 Bn USD（10 万美元）</strong>。每次运行均独立校验基线与冲击后残差；若超过最大迭代限制仍未收敛，系统将触发 FAILED 熔断保护并在报告与界面中显式告警。
                  </p>
                </div>
              </div>
            )}

            {activeSection === 'nowcast' && (
              <div className="space-y-5 animate-fade-in">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Activity className="w-4 h-4 text-purple-400" />
                    五、前瞻情景推演 (Scenario Projections) 与探索路径
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    对于 2026Q3 及 2026Q4 尚未完整发布终审公报的期间，提供透明设定的探索情景路径。
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/70 space-y-3 text-xs">
                  <div className="font-semibold text-white">情景设定与假定范围说明 (Scenario Scope)</div>
                  <div className="space-y-1.5 text-slate-300">
                    <p>• <strong>2026Q3 情景设定值：</strong>约 $48.20T (情景范围: $47.60T – $48.80T，±1.25%)</p>
                    <p>• <strong>2026Q4 情景设定值：</strong>约 $48.60T (情景范围: $47.90T – $49.30T，±1.44% / ±$0.70T)</p>
                    <p className="text-slate-400 text-[11px] mt-2">
                      注：Q3、Q4 目前设定为宏观前瞻探索情景（非已校准 ARX 计量确定性预测或正式置信区间）。全站界面均显式标有 <code>[SCENARIO PROJECTION]</code> 徽标，禁止与 BIS 官方发布之统计观测值混淆。
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'citation' && (
              <div className="space-y-5 animate-fade-in">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-400" />
                    六、学术引用与 BibTeX 规范
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    在学术论文、研报或投委会备忘录中引用本研究图谱的标准化格式。
                  </p>
                </div>

                <div className="relative p-4 rounded-xl border border-slate-800 bg-slate-950 font-mono text-xs text-slate-300">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-slate-500 text-[10px]">
                    <span>BIBTEX 引用条目</span>
                    <button
                      onClick={() => handleCopyCitation(bibtexCitation)}
                      className="flex items-center gap-1 text-sky-400 hover:text-sky-300 transition-colors cursor-pointer"
                    >
                      {copiedCitation ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedCitation ? '已复制到剪贴板' : '复制代码'}</span>
                    </button>
                  </div>
                  <pre className="pt-3 text-[11px] text-slate-300 overflow-x-auto leading-normal whitespace-pre">
                    {bibtexCitation}
                  </pre>
                </div>

                <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/50 space-y-2 text-xs">
                  <div className="text-slate-400 font-semibold">APA 格式引用：</div>
                  <p className="text-slate-300 italic">
                    EF Lab. (2026). Global Capital Flow Atlas: Multi-Dimensional Cross-Border Banking & Macroprudential Surveillance Platform. Available from https://hantrleko.github.io/global-capital-flow-atlas/
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <div className="flex items-center gap-2 font-mono text-[11px]">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>EF Lab Quantitative Macro Research © 2026</span>
          </div>
          <button
            onClick={() => {
              soundFx.playTick();
              onClose();
            }}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          >
            完成阅读并关闭
          </button>
        </div>
      </div>
    </div>
  );
}
