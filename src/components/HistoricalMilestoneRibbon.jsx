import React, { useState } from 'react';
import { 
  Sparkles, Calendar, Zap, AlertTriangle, ShieldCheck, 
  ChevronRight, ChevronDown, Filter, Search, ArrowRight, History
} from 'lucide-react';
import { MACRO_TIMELINE_EVENTS } from '../utils/macroScenarios';
import soundFx from '../utils/soundEffects';

export default function HistoricalMilestoneRibbon({
  selectedQuarter,
  onSelectQuarter,
  isOpen,
  onToggle
}) {
  const [filterTag, setFilterTag] = useState('ALL');
  const [searchWord, setSearchWord] = useState('');

  const allTags = ['ALL', ...Array.from(new Set(MACRO_TIMELINE_EVENTS.map(e => e.tag).filter(Boolean)))];

  const filteredEvents = MACRO_TIMELINE_EVENTS.filter(evt => {
    if (filterTag !== 'ALL' && evt.tag !== filterTag) return false;
    if (searchWord.trim()) {
      const q = searchWord.toLowerCase();
      return (
        evt.quarter.toLowerCase().includes(q) ||
        evt.name.toLowerCase().includes(q) ||
        evt.description.toLowerCase().includes(q) ||
        (evt.tag && evt.tag.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="border-b border-slate-800/80 bg-slate-950/90 text-xs backdrop-blur-md transition-all">
      {/* Ribbon Bar Header Toggle */}
      <div className="max-w-[1780px] mx-auto px-4 py-1.5 flex items-center justify-between gap-3 text-slate-300">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              soundFx.playTick();
              onToggle();
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-950/60 hover:bg-blue-900/60 border border-blue-500/40 text-sky-300 font-semibold cursor-pointer transition-all shadow-sm group"
          >
            <History className="w-3.5 h-3.5 text-sky-400 group-hover:rotate-12 transition-transform" />
            <span>宏观历史转折期 (2018-2026Q1 官方观测 · 2026Q2 待公布 · 2026Q3-Q4 前瞻情景)</span>
            {isOpen ? <ChevronDown className="w-3.5 h-3.5 ml-1" /> : <ChevronRight className="w-3.5 h-3.5 ml-1" />}
          </button>

          <span className="text-[11px] text-slate-400 hidden md:inline">
            已收录 <span className="text-white font-mono font-bold">{MACRO_TIMELINE_EVENTS.length}</span> 个关键期 · 点击卡片穿梭
          </span>
        </div>

        {/* Current Active Milestone Highlight */}
        {(() => {
          const matched = MACRO_TIMELINE_EVENTS.find(e => e.quarter === selectedQuarter);
          const isNowcast = selectedQuarter > '2026Q2';
          if (matched) {
            return (
              <div className="flex items-center gap-2 overflow-hidden text-right">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isNowcast ? 'bg-purple-400 animate-pulse' : 'bg-sky-400 animate-ping'}`} />
                <span className="text-slate-400 text-[11px] truncate hidden sm:inline">
                  {isNowcast ? '前瞻预测推演:' : '当前观测周期:'}
                </span>
                <span className={`font-bold font-mono shrink-0 ${isNowcast ? 'text-purple-300' : 'text-sky-300'}`}>
                  {matched.quarter} {isNowcast && '[NOWCAST]'}
                </span>
                <span className="text-white truncate max-w-xs text-[11px] font-medium hidden lg:inline">
                  {matched.name.split('(')[0]}
                </span>
              </div>
            );
          }
          return null;
        })()}
      </div>

      {/* Expandable Horizontal Carousel View */}
      {isOpen && (
        <div className="border-t border-slate-800/60 p-4 space-y-3 bg-slate-900/40 animate-fade-in">
          {/* Filter & Search Controls */}
          <div className="max-w-[1780px] mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider mr-1">分类过滤:</span>
              {allTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => {
                    soundFx.playTick();
                    setFilterTag(tag);
                  }}
                  className={`px-2 py-0.5 rounded-full text-[11px] font-mono transition-all cursor-pointer ${
                    filterTag === tag
                      ? 'bg-blue-600 text-white font-bold shadow-[0_0_10px_rgba(59,130,246,0.4)]'
                      : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700/80'
                  }`}
                >
                  {tag === 'ALL' ? '全部纪元' : tag}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 focus-within:border-sky-500 text-xs">
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="搜索大事件 / 关键字..."
                value={searchWord}
                onChange={(e) => setSearchWord(e.target.value)}
                className="bg-transparent text-white placeholder-slate-500 focus:outline-none text-xs w-36 sm:w-48"
              />
            </div>
          </div>

          {/* Cards Horizontal Scroller */}
          <div className="max-w-[1780px] mx-auto flex items-stretch gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-700">
            {filteredEvents.map(evt => {
              const isSelected = evt.quarter === selectedQuarter;
              const isHighStress = evt.stress >= 65;
              const isLowStress = evt.stress <= 35;

              return (
                <div
                  key={evt.quarter}
                  onClick={() => {
                    soundFx.playChime();
                    onSelectQuarter(evt.quarter);
                  }}
                  className={`min-w-[270px] max-w-[290px] rounded-xl p-3.5 flex flex-col justify-between transition-all cursor-pointer border relative select-none group ${
                    isSelected
                      ? 'bg-gradient-to-b from-blue-900/50 to-slate-900 border-sky-400 shadow-[0_0_20px_rgba(56,189,248,0.35)] scale-[1.02]'
                      : 'bg-slate-900/80 hover:bg-slate-800/90 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {/* Top Bar: Quarter & Tag */}
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-2">
                      <div className="flex items-center gap-1.5">
                        <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${
                          isSelected ? 'bg-sky-400 text-slate-950' : 'bg-slate-800 text-sky-400'
                        }`}>
                          {evt.quarter}
                        </span>
                        {evt.tag && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-300 border border-slate-700">
                            {evt.tag}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 text-[11px] font-mono">
                        <span className="text-slate-500">压力:</span>
                        <span className={`font-bold ${
                          isHighStress ? 'text-rose-400' : isLowStress ? 'text-emerald-400' : 'text-amber-400'
                        }`}>
                          {evt.stress}
                        </span>
                      </div>
                    </div>

                    <h4 className="text-xs font-bold text-white group-hover:text-sky-300 transition-colors line-clamp-2 leading-snug mb-1.5">
                      {evt.name}
                    </h4>

                    <p className="text-[11px] text-slate-400 line-clamp-3 leading-relaxed">
                      {evt.description}
                    </p>
                  </div>

                  {/* Bottom Footer: One-click Jump */}
                  <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                    <span className={`font-medium ${isSelected ? 'text-sky-400 font-bold' : 'text-slate-500 group-hover:text-slate-300'}`}>
                      {isSelected ? '✓ 正在观测该季' : '点击穿梭至本季'}
                    </span>
                    <ArrowRight className={`w-3.5 h-3.5 transition-transform ${
                      isSelected ? 'text-sky-400 translate-x-0.5' : 'text-slate-500 group-hover:translate-x-1 group-hover:text-white'
                    }`} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
