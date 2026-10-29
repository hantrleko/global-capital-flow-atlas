import React, { useState } from 'react';
import { getModuleVerdict, getModuleCausalLinks } from '../utils/causalIntelligence.js';

export default function ExecutiveVerdictBanner({ activeTab, onSelectTab }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  const verdict = getModuleVerdict(activeTab);
  const causalLinks = getModuleCausalLinks(activeTab);

  const getSeverityBadge = (severity) => {
    switch (severity) {
      case 'CRITICAL':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold tracking-wider uppercase bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-[0_0_12px_rgba(244,63,94,0.3)] animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
            高危预警 (CRITICAL)
          </span>
        );
      case 'WARNING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold tracking-wider uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
            中度关注 (WARNING)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold tracking-wider uppercase bg-sky-500/20 text-sky-300 border border-sky-500/40">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span>
            审慎研判 (INFO)
          </span>
        );
    }
  };

  return (
    <div className="mb-4 bg-gradient-to-r from-slate-900/95 via-slate-900/90 to-slate-950/95 border border-slate-700/60 rounded-xl shadow-xl backdrop-blur-md overflow-hidden transition-all duration-300">
      {/* Top Header Row */}
      <div className="px-4 py-2.5 bg-slate-800/50 border-b border-slate-700/50 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2.5">
          <span className="text-sm">🎯</span>
          <span className="font-semibold text-slate-200 tracking-wide">
            三段式研判台 (Executive Verdict) · <span className="text-cyan-400">{verdict.moduleTitle}</span>
          </span>
          {getSeverityBadge(verdict.severity)}
        </div>
        
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-slate-400 hidden sm:inline">
            解答「看什么、为何发生、如何行动」
          </span>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600/50 transition-colors flex items-center gap-1 text-[11px]"
            title={isCollapsed ? "展开研判台" : "收起研判台"}
          >
            {isCollapsed ? (
              <><span>展开研判</span><span>▼</span></>
            ) : (
              <><span>收起</span><span>▲</span></>
            )}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {!isCollapsed && (
        <div className="p-4 space-y-3.5">
          {/* Tri-stage Reason Deck: 现象 ➔ 机理 ➔ 结论 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Stage 1: Observation */}
            <div className="p-3 rounded-lg bg-slate-800/40 border border-slate-700/40 hover:border-slate-600/60 transition-colors">
              <div className="flex items-center gap-2 mb-1.5 text-xs font-semibold text-cyan-300 uppercase tracking-wider">
                <span className="w-5 h-5 rounded-full bg-cyan-950/80 border border-cyan-500/50 flex items-center justify-center text-[10px] text-cyan-400 font-bold">1</span>
                <span>宏观异动现象 (Observation)</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {verdict.observation}
              </p>
            </div>

            {/* Stage 2: Mechanism */}
            <div className="p-3 rounded-lg bg-slate-800/40 border border-slate-700/40 hover:border-slate-600/60 transition-colors">
              <div className="flex items-center gap-2 mb-1.5 text-xs font-semibold text-indigo-300 uppercase tracking-wider">
                <span className="w-5 h-5 rounded-full bg-indigo-950/80 border border-indigo-500/50 flex items-center justify-center text-[10px] text-indigo-400 font-bold">2</span>
                <span>深层驱动机理 (Mechanism)</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {verdict.mechanism}
              </p>
            </div>

            {/* Stage 3: Verdict & Action */}
            <div className="p-3 rounded-lg bg-gradient-to-br from-emerald-950/40 via-slate-800/40 to-slate-800/40 border border-emerald-500/30 hover:border-emerald-500/50 transition-colors">
              <div className="flex items-center gap-2 mb-1.5 text-xs font-semibold text-emerald-300 uppercase tracking-wider">
                <span className="w-5 h-5 rounded-full bg-emerald-950/80 border border-emerald-500/50 flex items-center justify-center text-[10px] text-emerald-400 font-bold">3</span>
                <span>研判结论与行动 (Verdict & Action)</span>
              </div>
              <p className="text-xs text-emerald-100 font-medium leading-relaxed">
                {verdict.verdict}
              </p>
            </div>
          </div>

          {/* Causal Knowledge Graph Next-Step Bridge */}
          {(causalLinks.upstream?.length > 0 || causalLinks.downstream?.length > 0) && (
            <div className="pt-2.5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
              {/* Upstream links */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] text-slate-400 flex items-center gap-1 font-medium">
                  <span>⬅️</span>
                  <span>前因溯源:</span>
                </span>
                {causalLinks.upstream && causalLinks.upstream.length > 0 ? (
                  causalLinks.upstream.map((link, idx) => (
                    <button
                      key={idx}
                      onClick={() => onSelectTab(link.tab)}
                      className="px-2.5 py-1 rounded-md bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white transition-all text-[11px] flex items-center gap-1.5 group"
                    >
                      <span>{link.label}</span>
                      <span className="text-slate-500 group-hover:text-cyan-400 text-[10px]">({link.relationship})</span>
                    </button>
                  ))
                ) : (
                  <span className="text-[11px] text-slate-500 italic">首端驱动源，无更早前因</span>
                )}
              </div>

              {/* Downstream links */}
              <div className="flex items-center gap-2 flex-wrap ml-auto">
                <span className="text-[11px] text-slate-400 flex items-center gap-1 font-medium">
                  <span>➡️</span>
                  <span>下一步推演与对冲:</span>
                </span>
                {causalLinks.downstream && causalLinks.downstream.length > 0 ? (
                  causalLinks.downstream.map((link, idx) => (
                    <button
                      key={idx}
                      onClick={() => onSelectTab(link.tab)}
                      className="px-3 py-1 rounded-md bg-gradient-to-r from-cyan-600/20 to-blue-600/30 hover:from-cyan-500/30 hover:to-blue-500/40 border border-cyan-500/40 hover:border-cyan-400 text-cyan-200 hover:text-white shadow-[0_0_10px_rgba(6,182,212,0.15)] transition-all text-[11px] font-semibold flex items-center gap-1.5 group"
                    >
                      <span>{link.cta}</span>
                      <span className="transform group-hover:translate-x-0.5 transition-transform">➔</span>
                    </button>
                  ))
                ) : (
                  <span className="text-[11px] text-slate-500 italic">终局归宿节点</span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
