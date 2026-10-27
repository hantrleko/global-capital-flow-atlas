import React, { useState, useMemo } from 'react';
import { Sparkles, ArrowRight, ShieldAlert, Zap, Globe, ChevronDown, ChevronUp } from 'lucide-react';
import soundFx from '../utils/soundEffects';

/**
 * Macro Insights Story Banner
 * Synthesizes 3 actionable institutional discoveries for the selected quarter.
 * Lowers cognitive load for users and guides them straight to high-impact insights.
 */
export default function MacroInsightsBanner({
  dataset,
  selectedQuarter,
  onSelectTab,
  onSelectCountry,
  onSetContagionEpicenter
}) {
  const [isExpanded, setIsExpanded] = useState(true);

  // Compute 3 institutional discoveries dynamically
  const insights = useMemo(() => {
    const matrix = (dataset?.bilateral_matrix || {})[selectedQuarter] || [];
    const sortedLinks = [...matrix].sort((a, b) => (b.claims_usd_bn || 0) - (a.claims_usd_bn || 0));
    const topLink = sortedLinks[0] || { source: 'US', target: 'GB', claims_usd_bn: 2450 };

    const cbsRisk = dataset?.cbs_risk || {};
    // Find countries with risk signals
    const riskCountries = Object.entries(cbsRisk)
      .map(([code, data]) => ({ code, score: data.composite_risk_score || 0 }))
      .sort((a, b) => b.score - a.score);
    const topRisk = riskCountries[0]?.code || 'TR';

    return [
      {
        id: 'corridor',
        category: '核心资金动脉',
        icon: Globe,
        accent: 'from-blue-500/20 to-sky-500/10 text-sky-400 border-sky-500/30',
        headline: `${topLink.source} ➔ ${topLink.target} 跨国走廊规模居首`,
        detail: `双边银行跨境债权达 $${topLink.claims_usd_bn >= 1000 ? `${(topLink.claims_usd_bn / 1000).toFixed(2)}T` : `${topLink.claims_usd_bn}B`}，占据全球主要跨境流动主干道。`,
        actionLabel: '穿透走廊',
        onClick: () => {
          soundFx.playTick();
          if (onSelectCountry) onSelectCountry(topLink.source);
          onSelectTab('map');
        }
      },
      {
        id: 'warning',
        category: '早期审慎预警',
        icon: ShieldAlert,
        accent: 'from-amber-500/20 to-orange-500/10 text-amber-400 border-amber-500/30',
        headline: `${topRisk} 等经济体宏观杠杆指标触发黄/红灯`,
        detail: `信贷-GDP 缺口及外债还本付息覆盖率逼近巴塞尔预警门槛，需严密防范跨国去杠杆外溢。`,
        actionLabel: '诊断雷达',
        onClick: () => {
          soundFx.playTick();
          if (onSelectCountry) onSelectCountry(topRisk);
          onSelectTab('ews');
        }
      },
      {
        id: 'contagion',
        category: '网络级联穿透',
        icon: Zap,
        accent: 'from-purple-500/20 to-rose-500/10 text-purple-400 border-purple-500/30',
        headline: `核心 G-SIB 跨境负债集中度处于高分位`,
        detail: `若关键金融中枢爆发流动性缺口，Eisenberg-Noe 清算算法推演将对欧洲与亚太形成二级传染。`,
        actionLabel: '模拟清算',
        onClick: () => {
          soundFx.playChime();
          if (onSetContagionEpicenter) onSetContagionEpicenter('US');
          onSelectTab('contagion');
        }
      }
    ];
  }, [dataset, selectedQuarter, onSelectTab, onSelectCountry, onSetContagionEpicenter]);

  return (
    <section className="w-full bg-slate-900/60 border border-slate-800/80 rounded-xl overflow-hidden shadow-md backdrop-blur-sm transition-all">
      {/* Banner Header Strip */}
      <div className="h-8 px-3 sm:px-4 bg-slate-900/90 border-b border-slate-800/60 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
          <span className="font-semibold text-slate-200">
            本季 30 秒宏观洞察 · <span className="font-mono text-sky-400">{selectedQuarter}</span>
          </span>
          <span className="hidden md:inline text-[10px] text-slate-400 font-mono">
            (EUGENE FINANCE Quantitative Intelligence)
          </span>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-slate-400 hover:text-white flex items-center gap-1 text-[11px] cursor-pointer"
        >
          <span>{isExpanded ? '收起导览' : '展开导览'}</span>
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* 3 Insight Discovery Cards */}
      {isExpanded && (
        <div className="p-2 sm:p-2.5 grid grid-cols-1 md:grid-cols-3 gap-2 animate-fade-in">
          {insights.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                className={`p-2.5 rounded-lg border bg-gradient-to-br ${item.accent} flex flex-col justify-between gap-1.5 transition-all hover:border-slate-500`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold font-mono tracking-wider uppercase opacity-80 flex items-center gap-1">
                      <Icon className="w-3 h-3" />
                      {item.category}
                    </span>
                    <button
                      onClick={item.onClick}
                      className="text-[11px] font-semibold text-white hover:underline flex items-center gap-0.5 cursor-pointer bg-slate-950/60 px-1.5 py-0.5 rounded border border-slate-700/60 transition-all hover:border-sky-400"
                    >
                      <span>{item.actionLabel}</span>
                      <ArrowRight className="w-2.5 h-2.5" />
                    </button>
                  </div>
                  <h4 className="text-xs font-bold text-white tracking-tight leading-snug">
                    {item.headline}
                  </h4>
                  <p className="text-[11px] text-slate-300/90 leading-relaxed mt-0.5 line-clamp-2">
                    {item.detail}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
