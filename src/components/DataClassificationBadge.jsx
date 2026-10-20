import React from 'react';
import { ShieldCheck, Cpu, Sparkles, AlertOctagon, HelpCircle, ExternalLink } from 'lucide-react';

/**
 * DataClassificationBadge
 * Standardized data credibility and methodology badge across all analytical modules.
 * 
 * Classifications:
 * - OFFICIAL_OBSERVED: Anchored to published official BIS aggregates / Basel statistics
 * - MODEL_RECONSTRUCTED: Micro bilateral links or country breakdowns calibrated via RAS entropy balancing
 * - NOWCAST_PREDICTION: Econometric gravity model forward projection (2026Q3 - 2026Q4)
 * - STRESS_SIMULATION: Hypothetical counterfactual / stress testing (Eisenberg-Noe, shocks)
 */
export default function DataClassificationBadge({
  classification = 'MODEL_RECONSTRUCTED',
  sourceText,
  methodText,
  vintage,
  onOpenAppendix,
  className = ''
}) {
  const configs = {
    OFFICIAL_OBSERVED: {
      label: '官方观测基准',
      code: 'OFFICIAL OBSERVED',
      badgeBg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300',
      dotColor: 'bg-emerald-400',
      icon: ShieldCheck,
      defaultSource: '国际清算银行 (BIS) LBS / CBS 官方发布',
      defaultMethod: '官方申报与汇总统计口径'
    },
    MODEL_RECONSTRUCTED: {
      label: '模型分配与重构',
      code: 'MODEL RECONSTRUCTED',
      badgeBg: 'bg-sky-500/10 border-sky-500/30 text-sky-300',
      dotColor: 'bg-sky-400',
      icon: Cpu,
      defaultSource: '全球总量锚定 BIS 官方公布值 (Table A6.2)',
      defaultMethod: '最大熵 RAS 双边矩阵重构与特征向量中心度测算'
    },
    NOWCAST_PREDICTION: {
      label: '临近预报与外推',
      code: 'NOWCAST PREDICTION',
      badgeBg: 'bg-purple-500/10 border-purple-500/30 text-purple-300',
      dotColor: 'bg-purple-400',
      icon: Sparkles,
      defaultSource: 'BIS 历史 34 季度官方序列 (2018Q1-2026Q2)',
      defaultMethod: '动态空间引力计量外推 (95% CI: ±1.4%)'
    },
    STRESS_SIMULATION: {
      label: '反事实压力模拟',
      code: 'STRESS SIMULATION',
      badgeBg: 'bg-amber-500/10 border-amber-500/30 text-amber-300',
      dotColor: 'bg-amber-400',
      icon: AlertOctagon,
      defaultSource: '模型基准网络 + 外生冲击参数',
      defaultMethod: 'Eisenberg-Noe (2001) 级联违约清算算法'
    }
  };

  const cfg = configs[classification] || configs.MODEL_RECONSTRUCTED;
  const Icon = cfg.icon;

  return (
    <div className={`inline-flex flex-wrap items-center gap-2 bg-slate-900/90 border border-slate-800 rounded-xl px-2.5 py-1 text-xs backdrop-blur-md ${className}`}>
      {/* Category Pill */}
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border font-mono font-medium text-[11px] ${cfg.badgeBg}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dotColor} animate-pulse`} />
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

      {/* Open Appendix Link */}
      {onOpenAppendix && (
        <button
          onClick={onOpenAppendix}
          className="text-sky-400 hover:text-sky-300 underline underline-offset-2 transition-colors cursor-pointer text-[11px] font-mono shrink-0 flex items-center gap-0.5 ml-auto"
          title="查看完整数学推导、数据分层与 BibTeX 引用附录"
        >
          <span>方法论</span>
          <ExternalLink className="w-2.5 h-2.5" />
        </button>
      )}
    </div>
  );
}
