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
                    <div className="text-xl font-bold font-mono text-white">2018Q1 – 2026Q2 (34 季度)</div>
                    <p className="text-xs text-slate-300">
                      <strong>全球总量锚定 BIS 官方公布值</strong>（2025 年末全球跨境银行总债权收于 <strong>$46.12T</strong>，2026Q2 官方最新基准公布值为 <strong>$47.82T</strong>）；国别总额与双边信贷走廊在满足该总量硬约束下，基于申报国权重与最大熵矩阵平衡 (RAS) 进行模型校准分配。
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-purple-500/30 bg-purple-950/20 space-y-2">
                    <div className="flex items-center gap-2 text-purple-400 font-semibold text-xs">
                      <Activity className="w-4 h-4" />
                      临近预报区间 (Econometric Nowcasts)
                    </div>
                    <div className="text-xl font-bold font-mono text-white">2026Q3 – 2026Q4 (2 季度)</div>
                    <p className="text-xs text-slate-300">
                      由于 BIS 官方统计每季度滞后约 1 个季度发布（如 Q2 数据于当年 9 月底公布），对当期和正在进行的季度（2026Q3/Q4）采用<strong>动态引力计量模型</strong>进行临近预报，并显式标注 <code>[NOWCAST]</code> 徽标与 95% 置信区间。
                    </p>
                  </div>
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
              </div>
            )}

            {activeSection === 'eisenberg_noe' && (
              <div className="space-y-5 animate-fade-in">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-rose-400" />
                    四、级联清算模型与示意性说明 (Eisenberg-Noe Stylized Contagion)
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    明确区分官方公布数据与结构性计量模拟演示。
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
                    <li>资本充足率（CET1）、杠杆率、FSB 附加缓冲要求<strong>完全取自各机构最新官方年报及巴塞尔披露</strong>；</li>
                    <li>银行间级联传染路径基于学术经典文献 <strong>Eisenberg-Noe (2001) 清算向量不动点算法</strong> 进行<strong>示意性结构模拟</strong>；</li>
                    <li>用于定量展示流动性螺旋与资产减记的系统性扩散机理，<strong>并非且不应被理解为监管部门未公开的逐笔真实合同</strong>。</li>
                  </ul>
                </div>
              </div>
            )}

            {activeSection === 'nowcast' && (
              <div className="space-y-5 animate-fade-in">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Activity className="w-4 h-4 text-purple-400" />
                    五、临近预报 (Nowcast) 与动态引力模型
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    对于 2026Q3 及 2026Q4 尚未完整发布终审公报的期间，提供透明可复现的模型预测。
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/70 space-y-3 text-xs">
                  <div className="font-semibold text-white">模型规范：动态时变面板引力方程 (Dynamic Panel Gravity Specification)</div>
                  <div className="p-3 bg-slate-900 rounded-lg font-mono text-sky-300 overflow-x-auto text-[11px]">
                    ln(Claims_ijt) = α_0 + α_1*ln(GDP_it) + α_2*ln(GDP_jt) - α_3*ln(Dist_ij) + β*Δ(InterestDiff_t) + γ*SanctionIndex_t + ε_ijt
                  </div>
                  <div className="space-y-1 text-slate-300">
                    <p>• <strong>2026Q3 临近预测值：</strong>约 $48.20T (95% 置信区间: $47.60T – $48.80T)</p>
                    <p>• <strong>2026Q4 临近预测值：</strong>约 $48.60T (95% 置信区间: $47.90T – $49.30T)</p>
                    <p className="text-slate-400 text-[11px] mt-2">
                      注：在界面中所有 2026Q3/Q4 数据均显式标有 <code>[NOWCAST]</code> 徽标，禁止将预测值混同于官方统计事实。
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
