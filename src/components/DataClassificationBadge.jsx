import React, { useState } from 'react';
import { 
  Cpu, Sparkles, AlertOctagon, ExternalLink, FileText, X
} from 'lucide-react';
import { getDataClassification } from '../utils/dataClassification';

export default function DataClassificationBadge({
  classification = 'MODEL_RECONSTRUCTED',
  quarter,
  sourceText,
  methodText,
  vintage,
  evidenceDetails,
  onOpenAppendix,
  className = ''
}) {
  const [showEvidenceModal, setShowEvidenceModal] = useState(false);

  const isScenario = classification === 'NOWCAST_PREDICTION' || classification === 'SCENARIO_PROJECTION';
  const isStress = classification === 'STRESS_SIMULATION';
  const canonical = getDataClassification(quarter, { scope: 'model', isScenario });
  const cfg = isStress ? {
    label: '反事实情景',
    code: 'STRESS SIMULATION',
    badgeBg: 'bg-rose-500/10 border-rose-500/30 text-rose-300',
    dot: 'bg-rose-400',
    icon: AlertOctagon,
    defaultSource: 'Atlas 基准网络与外部冲击参数',
    defaultMethod: 'Eisenberg-Noe 级联清算模型',
    statusDesc: '根据所选网络和冲击参数计算清算短缺与风险传导。'
  } : {
    label: canonical.label,
    code: canonical.type,
    badgeBg: canonical.badgeClass,
    dot: canonical.dotClass,
    icon: isScenario ? Sparkles : Cpu,
    defaultSource: canonical.provenance,
    defaultMethod: isScenario ? '预设参数与趋势情景' : '模型校准、估算或重构',
    statusDesc: isScenario ? '本模块展示 Atlas 情景结果。' : '本模块含 Atlas 模型估算或重构结果。'
  };
  const Icon = cfg.icon;

  return (
    <>
      <div className={`inline-flex flex-wrap items-center gap-2 bg-slate-900/90 border border-slate-800 rounded-xl px-2.5 py-1 text-xs backdrop-blur-md ${className}`}>
        {/* Canonical Category Pill */}
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border font-mono font-medium text-[11px] ${cfg.badgeBg}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
          <Icon className="w-3 h-3" />
          <span>{cfg.label}</span>
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

              <div className="rounded-lg border border-slate-800 bg-slate-950 p-2.5 font-sans">
                <p>来源说明 {sourceText || cfg.defaultSource}</p>
                <p className="mt-1 text-slate-300">处理方法 {methodText || cfg.defaultMethod}</p>
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
