import React, { useState, useMemo } from 'react';
import { Sparkles, ArrowRight, ShieldAlert, Zap, Globe, ChevronDown, ChevronUp } from 'lucide-react';
import soundFx from '../utils/soundEffects';

/**
 * Single-Line Sleek Macro Insights Ticker & Tour Banner
 * Provides instant institutional discoveries without pushing down the primary chart canvas.
 * Seamlessly fits within first-screen fold (<= 36px height in compact mode).
 */
export default function MacroInsightsBanner({
  dataset,
  selectedQuarter,
  onSelectTab,
  onSelectCountry,
  onSetContagionEpicenter
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Compute 3 institutional discoveries dynamically for selectedQuarter
  const insights = useMemo(() => {
    const matrix = (dataset?.bilateral_matrix || {})[selectedQuarter] || [];
    const sortedLinks = [...matrix].sort((a, b) => (b.claims_usd_bn || 0) - (a.claims_usd_bn || 0));
    const topLink = sortedLinks[0] || { source: 'JP', target: 'US', claims_usd_bn: 3260 };

    const cbsRisk = dataset?.cbs_risk || {};
    const riskCountries = Object.entries(cbsRisk)
      .map(([code, data]) => ({ code, score: data.composite_risk_score || 0 }))
      .sort((a, b) => b.score - a.score);
    const topRisk = riskCountries[0]?.code || 'TR';

    return [
      {
        id: 'corridor',
        category: '核心走廊',
        icon: Globe,
        color: 'text-sky-400 border-sky-500/40 bg-sky-950/40 hover:bg-sky-900/60',
        shortText: `${topLink.source} ➔ ${topLink.target} 规模居首 ($${topLink.claims_usd_bn >= 1000 ? `${(topLink.claims_usd_bn / 1000).toFixed(2)}T` : `${topLink.claims_usd_bn}B`})`,
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
        category: '审慎预警',
        icon: ShieldAlert,
        color: 'text-amber-400 border-amber-500/40 bg-amber-950/40 hover:bg-amber-900/60',
        shortText: `${topRisk} 等经济体杠杆指标触发黄/红灯`,
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
        category: '级联穿透',
        icon: Zap,
        color: 'text-purple-400 border-purple-500/40 bg-purple-950/40 hover:bg-purple-900/60',
        shortText: `核心 G-SIB 负债集中度处于高分位`,
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
    <section className="w-full bg-slate-900/80 border border-slate-800/90 rounded-xl overflow-hidden shadow-sm backdrop-blur-md transition-all">
      {/* Compact Single-Line Strip (Height: 34px) */}
      <div className="h-8.5 px-3 flex items-center justify-between gap-2.5 text-xs">
        {/* Left: Discovery Label */}
        <div className="flex items-center gap-2 shrink-0">
          <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
          <span className="font-semibold text-slate-200 hidden sm:inline whitespace-nowrap">
            本季 30 秒宏观洞察 · <span className="font-mono text-sky-400">{selectedQuarter}</span>:
          </span>
          <span className="font-semibold text-slate-200 sm:hidden">
            {selectedQuarter} 洞察:
          </span>
        </div>

        {/* Center: 3 Interactive Discovery Capsules */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none flex-1 py-0.5">
          {insights.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={item.onClick}
                className={`h-6.5 px-2.5 rounded-lg border text-[11px] font-medium flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-all shadow-sm shrink-0 ${item.color}`}
                title={`点击立即跳转至该发现推演现场: ${item.headline}`}
              >
                <Icon className="w-3 h-3 shrink-0" />
                <span className="truncate max-w-[200px] lg:max-w-none">{item.shortText}</span>
                <ArrowRight className="w-2.5 h-2.5 opacity-60 ml-0.5" />
              </button>
            );
          })}
        </div>

        {/* Right: Expand/Collapse Details Toggle */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-slate-400 hover:text-white flex items-center gap-0.5 text-[11px] cursor-pointer shrink-0 pl-1 border-l border-slate-800"
          title={isExpanded ? '收起详情卡片' : '展开三卡深度详情'}
        >
          <span className="hidden md:inline">{isExpanded ? '收起' : '展开详情'}</span>
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Expanded Multi-Card Deep View */}
      {isExpanded && (
        <div className="p-2.5 border-t border-slate-800/80 bg-slate-950/60 grid grid-cols-1 md:grid-cols-3 gap-2 animate-fade-in">
          {insights.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                className="p-2.5 rounded-lg border border-slate-800 bg-slate-900/60 flex flex-col justify-between gap-1.5 transition-all hover:border-slate-700"
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold font-mono tracking-wider uppercase opacity-80 flex items-center gap-1 text-slate-300">
                      <Icon className="w-3 h-3 text-sky-400" />
                      {item.category}
                    </span>
                    <button
                      onClick={item.onClick}
                      className="text-[11px] font-semibold text-sky-400 hover:text-sky-300 flex items-center gap-0.5 cursor-pointer bg-slate-800/60 px-1.5 py-0.5 rounded border border-slate-700 transition-all hover:border-sky-400"
                    >
                      <span>{item.actionLabel}</span>
                      <ArrowRight className="w-2.5 h-2.5" />
                    </button>
                  </div>
                  <h4 className="text-xs font-bold text-white tracking-tight leading-snug">
                    {item.headline}
                  </h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed mt-0.5">
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
