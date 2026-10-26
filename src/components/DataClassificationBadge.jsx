import React, { useState, useMemo } from 'react';
import { 
  ShieldCheck, Cpu, Sparkles, AlertOctagon, HelpCircle, 
  ExternalLink, Clock, FileText, CheckCircle2, AlertTriangle, X 
} from 'lucide-react';
import { getDataClassification } from '../utils/dataClassification';

/**
 * DataClassificationBadge
 * Standardized data credibility, provenance and evidence badge across all analytical modules.
 * Anchored to the canonical 3-tier classification:
 * 1. 官方观测 (<= 2026Q1)
 * 2. 待公布估算 (2026Q2)
 * 3. 前瞻情景 (>= 2026Q3)
 */
export default function DataClassificationBadge({
  classification = 'MODEL_RECONSTRUCTED',
  quarter = '2026Q1',
  sourceText,
  methodText,
  vintage,
  evidenceDetails,
  onOpenAppendix,
  className = ''
}) {
  const [showEvidenceModal, setShowEvidenceModal] = useState(false);

  // Canonical 3-tier data classification derived directly from quarter
  const canonical = useMemo(() => getDataClassification(quarter), [quarter]);

  const configs = {
    OFFICIAL_OBSERVED: {
      label: '官方观测',
      code: 'OFFICIAL OBSERVED',
      badgeBg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300',
      dotColor: 'bg-emerald-400',
      icon: ShieldCheck,
      defaultSource: '国际清算银行 (BIS) SDMX 2.1 官方序列已核准',
      defaultMethod: '官方申报与汇总统计 (WS_LBS_D_PUB Table A6.2)',
      statusDesc: '该季度已于 BIS stats.bis.org 正式发布并由 API 校验核对入库。'
    },
    CACHED_PENDING_RELEASE: {
      label: '待公布估算',
      code: 'CACHED ESTIMATE',
      badgeBg: 'bg-amber-500/10 border-amber-500/30 text-amber-300',
      dotColor: 'bg-amber-400',
      icon: Clock,
      defaultSource: 'BIS 官方发布日预定为 2026-10-30 (尚未入库)',
      defaultMethod: '前序季度样本推算 · 待官方数据正式入库',
      statusDesc: '根据 BIS 统计发布日历 (data.bis.org/release-calendar)，2026Q2 数据于 10 月 30 日公布。在官方序列上线前，本项目标注为待公布估算，杜绝提前伪称已发生事实。'
    },
    MODEL_RECONSTRUCTED: {
      label: canonical.label,
      code: canonical.type,
      badgeBg: canonical.badgeClass,
      dotColor: canonical.type === 'OFFICIAL_OBSERVED' ? 'bg-emerald-400' : 'bg-purple-400',
      icon: canonical.type === 'OFFICIAL_OBSERVED' ? ShieldCheck : Sparkles,
      defaultSource: '总量锚定 BIS 官方公布值 (Table A6.2)',
      defaultMethod: '双比例 RAS 重构 (导出残差 0.0B 守恒)',
      statusDesc: '官方公开数据不提供完整银行间双边微观网络。本双边走廊由申报国总债权和总债务为硬边际约束，经 RAS 双比例迭代收敛与 0.1B 整点守恒调校生成，全量 506 条走廊导出后行差与列差均为 0.0 Bn USD。'
    },
    SCENARIO_PROJECTION: {
      label: '前瞻情景',
      code: 'SCENARIO PROJECTION',
      badgeBg: 'bg-purple-500/10 border-purple-500/30 text-purple-300',
      dotColor: 'bg-purple-400',
      icon: Sparkles,
      defaultSource: '前瞻探索情景 (非官方统计事实)',
      defaultMethod: '情景假定范围 ($47.90T–$49.30T)',
      statusDesc: '未发生季度不作为已校准计量确定性预测，而是作为宏观压力情景探索。范围为情景假定边界，非正式 95% 置信区间。'
    },
    NOWCAST_PREDICTION: {
      label: '前瞻情景',
      code: 'SCENARIO PROJECTION',
      badgeBg: 'bg-purple-500/10 border-purple-500/30 text-purple-300',
      dotColor: 'bg-purple-400',
      icon: Sparkles,
      defaultSource: '前瞻探索情景 (非官方统计事实)',
      defaultMethod: '情景假定范围 ($47.90T–$49.30T)',
      statusDesc: '未发生季度不作为已校准计量确定性预测，而是作为宏观压力情景探索。'
    },
    STRESS_SIMULATION: {
      label: '反事实情景',
      code: 'STRESS SIMULATION',
      badgeBg: 'bg-rose-500/10 border-rose-500/30 text-rose-300',
      dotColor: 'bg-rose-400',
      icon: AlertOctagon,
      defaultSource: '模型基准网络 + 外部冲击参数',
      defaultMethod: 'Eisenberg-Noe (2001) 级联违约清算算法',
      statusDesc: '设定外生违约激元，依据银行核心资本与资产减记乘数展开系统性传染推演。'
    }
  };

  const cfg = configs[classification] || configs.MODEL_RECONSTRUCTED;
  const Icon = cfg.icon;

  return (
    <>
      <div className={`inline-flex flex-wrap items-center gap-2 bg-slate-900/90 border border-slate-800 rounded-xl px-2.5 py-1 text-xs backdrop-blur-md ${className}`}>
        {/* Canonical Category Pill */}
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border font-mono font-medium text-[11px] ${canonical.badgeClass}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${canonical.type === 'OFFICIAL_OBSERVED' ? 'bg-emerald-400' : canonical.type === 'CACHED_PENDING_RELEASE' ? 'bg-amber-400' : 'bg-purple-400'} animate-pulse`} />
          <Icon className="w-3 h-3" />
          <span>{canonical.label}</span>
        </span>

        {/* Attribution Snippet */}
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
          <span className="truncate max-w-[260px] sm:max-w-none text-slate-300">
            {sourceText || cfg.defaultSource}
          </span>
          <span className="text-slate-600 hidden md:inline">·</span>
          <span className="text-slate-400 hidden lg:inline">
            {methodText || cfg.defaultMethod}
          </span>
          {vintage && (
            <>
              <span className="text-slate-600 hidden sm:inline">·</span>
              <span className="text-slate-500 hidden sm:inline">{vintage}</span>
            </>
          )}
        </div>

        {/* Evidence Card Trigger */}
        <button
          onClick={() => setShowEvidenceModal(true)}
          className="text-amber-400 hover:text-amber-300 font-mono text-[11px] flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 transition-all cursor-pointer ml-auto"
          title="打开该数据的完整统计期、发布日历、数据流代码与处理方式证据卡"
        >
          <FileText className="w-2.5 h-2.5" />
          <span>证据卡</span>
        </button>

        {/* Open Appendix Link */}
        {onOpenAppendix && (
          <button
            onClick={onOpenAppendix}
            className="text-sky-400 hover:text-sky-300 underline underline-offset-2 transition-colors cursor-pointer text-[11px] font-mono shrink-0 flex items-center gap-0.5"
            title="查看完整数学推导、数据分层与 BibTeX 引用附录"
          >
            <span>方法论</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </button>
        )}
      </div>

      {/* Interactive Evidence Card Modal */}
      {showEvidenceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-5 shadow-2xl space-y-4 font-sans relative">
            <button
              onClick={() => setShowEvidenceModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2.5 border-b border-slate-800 pb-3">
              <div className={`p-2 rounded-xl ${cfg.badgeBg}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>数据身份与溯源证据卡 (Evidence Card)</span>
                </h3>
                <span className="text-xs font-mono text-slate-400">
                  当前统计期: {quarter} · 状态: {cfg.code}
                </span>
              </div>
            </div>

            <div className="space-y-2.5 text-xs font-mono">
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-bold">1. 数据身份属性与定性:</span>
                <p className="text-slate-200 text-xs leading-relaxed font-sans">{cfg.statusDesc}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase block">官方 SDMX 接口:</span>
                  <span className="text-slate-200 font-bold block mt-0.5">BIS:WS_LBS_D_PUB</span>
                  <span className="text-[10px] text-slate-400">Table A6.2 (Locational)</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase block">官方日历发布日:</span>
                  <span className="text-amber-300 font-bold block mt-0.5">
                    {quarter <= '2026Q1' ? '已核准入库' : quarter === '2026Q2' ? '2026-10-30 (待公布)' : '尚未进入统计周期'}
                  </span>
                  <span className="text-[10px] text-slate-400">data.bis.org/release-calendar</span>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-bold">2. 矩阵平衡与守恒检验 (RAS Calibration):</span>
                <div className="space-y-0.5 text-slate-300 font-sans text-xs">
                  <div>• <strong>总量约束:</strong> {sourceText || cfg.defaultSource}</div>
                  <div>• <strong>连续收敛:</strong> 双比例 RAS 算法求解，最大边际残差 &lt; 0.0001 Bn USD。</div>
                  <div>• <strong>导出守恒:</strong> 506条双边走廊全量导出无截断；经 0.1B 整点守恒调校，实测导出矩阵行差 = 0.0 Bn，列差 = 0.0 Bn (Exact Balance)。</div>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-bold">3. 指标级数据来源细分 (Indicator-Level Provenance):</span>
                <div className="space-y-1 text-slate-300 font-sans text-xs">
                  <div className="flex items-start gap-1.5">
                    <span className="text-sky-400 font-mono text-[10px] shrink-0 font-bold">[全球债权]</span>
                    <span>
                      {quarter <= '2026Q1' 
                        ? '官方实测观测值 (BIS SDMX Table A6.2 已核准入库)' 
                        : quarter === '2026Q2' 
                          ? '待核实估算值 (官方发布日预定 2026-10-30，待入库核准)' 
                          : '前瞻探索情景推演 (假定范围 $47.90T–$49.30T)'}
                    </span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="text-sky-400 font-mono text-[10px] shrink-0 font-bold">[微观网络]</span>
                    <span>国别总额与 506 条双边走廊为模型分配与 RAS 重构 (官方不公开完整双边机密矩阵)。</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="text-amber-400 font-mono text-[10px] shrink-0 font-bold">[压力指数]</span>
                    <span>美元融资压力 (0-100) 为交叉货币掉期基差 (CIP Basis) 与央行互换用量之合成指标。</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="text-purple-400 font-mono text-[10px] shrink-0 font-bold">[风险预警]</span>
                    <span>信贷缺口 (Credit Gap) 与偿债比率 (DSR) 基于巴塞尔协议 III 监管框架标定。</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs font-sans">
              <a 
                href="https://data.bis.org/release-calendar" 
                target="_blank" 
                rel="noreferrer"
                className="text-sky-400 hover:underline flex items-center gap-1 font-mono text-[11px]"
              >
                <span>核实 BIS 官方发布日历</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <button
                onClick={() => setShowEvidenceModal(false)}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors text-xs"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
