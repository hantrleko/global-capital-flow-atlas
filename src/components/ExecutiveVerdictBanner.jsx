import React, { useState } from 'react';
import { ChevronDown, ChevronUp, ArrowRight, ArrowLeft } from 'lucide-react';
import { getModuleVerdict, getModuleCausalLinks } from '../utils/causalIntelligence.js';

export default function ExecutiveVerdictBanner({ activeTab, onSelectTab, context = {} }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const verdict = getModuleVerdict(activeTab, context);
  const causalLinks = getModuleCausalLinks(activeTab);
  const primaryDownstream = causalLinks.downstream?.[0] || null;

  const cleanCtaText = (cta = '') => cta.replace(/\s*[➔→]+\s*$/, '').trim();

  const getSeverityBadge = (severity) => {
    switch (severity) {
      case 'CRITICAL':
        return (
          <span
            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/35 shrink-0"
            title="Critical Systemic Risk Alert"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            <span>高危预警</span>
          </span>
        );
      case 'WARNING':
        return (
          <span
            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/35 shrink-0"
            title="Elevated Macroprudential Watch"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span>中度关注</span>
          </span>
        );
      default:
        return (
          <span
            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/35 shrink-0"
            title="Macroprudential Intelligence Note"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
            <span>审慎研判</span>
          </span>
        );
    }
  };

  const headlineText = verdict.headline || verdict.observation;

  return (
    <div
      data-testid="executive-verdict-banner"
      className="bg-[#0d1321]/95 border border-white/[0.08] rounded-xl shadow-md backdrop-blur-md overflow-hidden transition-all duration-200"
    >
      {/* Compact Single-Line First-Screen Verdict Strip (~34px) */}
      <div className="min-h-[34px] px-3 py-1 flex items-center justify-between gap-2.5 text-xs">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {getSeverityBadge(verdict.severity)}

          <span
            className="font-semibold text-slate-200 shrink-0 hidden sm:inline"
            title="Executive Verdict · 三段式动态研判台"
          >
            实时研判 · <span className="text-indigo-300">{verdict.moduleTitle}</span>
          </span>

          <span className="text-slate-600 hidden md:inline shrink-0">|</span>

          <span
            data-testid="verdict-live-headline"
            className="text-xs text-slate-300 truncate tabular-nums"
            title={headlineText}
          >
            {headlineText}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {primaryDownstream && (
            <button
              onClick={() => onSelectTab(primaryDownstream.tab)}
              className="h-7 px-2.5 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-400/35 hover:border-indigo-400/60 text-indigo-200 hover:text-white transition-all text-[11px] font-semibold flex items-center gap-1 cursor-pointer whitespace-nowrap"
              title={primaryDownstream.outcome}
            >
              <span>{cleanCtaText(primaryDownstream.cta)}</span>
              <ArrowRight className="w-3 h-3 shrink-0" />
            </button>
          )}

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            data-testid="toggle-verdict-details"
            className="h-7 px-2.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-white/[0.08] text-slate-300 hover:text-white transition-colors flex items-center gap-1 text-[11px] font-medium cursor-pointer whitespace-nowrap"
            title={isExpanded ? '收起三段式机理拆解' : '展开现象 ➔ 机理 ➔ 行动三段式研判'}
          >
            <span>{isExpanded ? '收起机理' : '机理拆解'}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Expandable 3-Stage Reasoning Deck */}
      {isExpanded && (
        <div className="px-3.5 pb-3.5 pt-2.5 border-t border-white/[0.06] bg-[#0a0f1c]/90 space-y-3 animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            {/* Stage 1: Observation */}
            <div className="p-3 rounded-lg bg-[#131b2e]/70 border border-white/[0.07]">
              <div
                className="flex items-center gap-2 mb-1.5 text-xs font-semibold text-sky-300"
                title="Observation · 定量宏观异动现象"
              >
                <span className="w-5 h-5 rounded-full bg-sky-500/15 border border-sky-400/40 flex items-center justify-center text-[11px] text-sky-300 font-bold">
                  1
                </span>
                <span>宏观异动现象</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed tabular-nums">
                {verdict.observation}
              </p>
            </div>

            {/* Stage 2: Mechanism */}
            <div className="p-3 rounded-lg bg-[#131b2e]/70 border border-white/[0.07]">
              <div
                className="flex items-center gap-2 mb-1.5 text-xs font-semibold text-indigo-300"
                title="Mechanism · 跨国资产负债表传导机理"
              >
                <span className="w-5 h-5 rounded-full bg-indigo-500/15 border border-indigo-400/40 flex items-center justify-center text-[11px] text-indigo-300 font-bold">
                  2
                </span>
                <span>深层驱动机理</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed tabular-nums">
                {verdict.mechanism}
              </p>
            </div>

            {/* Stage 3: Verdict & Action */}
            <div className="p-3 rounded-lg bg-emerald-950/25 border border-emerald-500/25">
              <div
                className="flex items-center gap-2 mb-1.5 text-xs font-semibold text-emerald-300"
                title="Verdict & Action · 审慎风控与对冲行动指引"
              >
                <span className="w-5 h-5 rounded-full bg-emerald-500/15 border border-emerald-400/40 flex items-center justify-center text-[11px] text-emerald-300 font-bold">
                  3
                </span>
                <span>研判结论与行动</span>
              </div>
              <p className="text-xs text-emerald-100 font-medium leading-relaxed tabular-nums">
                {verdict.verdict}
              </p>
            </div>
          </div>

          {/* Causal Knowledge Graph Next-Step Bridge */}
          {(causalLinks.upstream?.length > 0 || causalLinks.downstream?.length > 0) && (
            <div className="pt-2 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-2.5 text-xs">
              {/* Upstream links */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] text-slate-400 flex items-center gap-1 font-medium">
                  <ArrowLeft className="w-3 h-3 text-slate-500" />
                  <span>前因溯源:</span>
                </span>
                {causalLinks.upstream && causalLinks.upstream.length > 0 ? (
                  causalLinks.upstream.map((link, idx) => (
                    <button
                      key={idx}
                      onClick={() => onSelectTab(link.tab)}
                      title={link.reason || link.label}
                      className="px-2.5 py-1 rounded-md bg-slate-800/80 hover:bg-slate-700/80 border border-white/[0.08] hover:border-slate-500 text-slate-300 hover:text-white transition-all text-[11px] flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>{link.label}</span>
                    </button>
                  ))
                ) : (
                  <span className="text-[11px] text-slate-500">首端驱动源</span>
                )}
              </div>

              {/* Downstream links */}
              <div className="flex items-center gap-2 flex-wrap ml-auto">
                <span className="text-[11px] text-slate-400 flex items-center gap-1 font-medium">
                  <span>因果下一跳:</span>
                </span>
                {causalLinks.downstream && causalLinks.downstream.length > 0 ? (
                  causalLinks.downstream.map((link, idx) => (
                    <button
                      key={idx}
                      onClick={() => onSelectTab(link.tab)}
                      title={link.outcome || link.label}
                      className="px-2.5 py-1 rounded-md bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-400/35 hover:border-indigo-400/60 text-indigo-200 hover:text-white transition-all text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <span>{cleanCtaText(link.cta)}</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  ))
                ) : (
                  <span className="text-[11px] text-slate-500">终局归宿节点</span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
