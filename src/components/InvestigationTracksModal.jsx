import React from 'react';
import { INVESTIGATION_TRACKS } from '../utils/causalIntelligence.js';

export default function InvestigationTracksModal({ isOpen, onClose, onStartTrack }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div 
        className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border-b border-slate-700/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-xl">
              🕵️
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
                剧本式宏观侦探主线 (Guided Investigation Playbooks)
                <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-mono">
                  v2.5 导引
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                告别知识孤岛与信息过载，跟随顶级宏观对冲基金的严谨研判路径逐层推演破案
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center border border-slate-600/50 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Modal Body - 3 Tracks List */}
        <div className="p-6 overflow-y-auto space-y-4">
          {INVESTIGATION_TRACKS.map((track, idx) => (
            <div
              key={track.id}
              className="p-5 rounded-xl bg-slate-800/50 border border-slate-700/60 hover:border-cyan-500/50 hover:bg-slate-800/80 transition-all duration-200 group relative overflow-hidden"
            >
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="text-xl">{track.badge}</span>
                    <h3 className="text-base font-bold text-slate-100 group-hover:text-cyan-300 transition-colors">
                      {track.title}
                    </h3>
                    <span className="text-[11px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-medium">
                      {track.difficulty}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      共 {track.steps.length} 步推演
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    {track.description}
                  </p>

                  {/* Flow of steps */}
                  <div className="pt-2 flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] font-semibold text-slate-400">推演链条:</span>
                    {track.steps.map((st, sIdx) => (
                      <React.Fragment key={st.stepIndex}>
                        <span className="text-[11px] px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300 font-mono">
                          {st.stepIndex}. {st.title.replace(/^第 \d+ 步：/, '')}
                        </span>
                        {sIdx < track.steps.length - 1 && (
                          <span className="text-slate-600 text-xs">➔</span>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>

                {/* Action CTA */}
                <div className="flex md:flex-col items-center justify-end gap-2 shrink-0">
                  <button
                    onClick={() => {
                      onStartTrack(track);
                      onClose();
                    }}
                    className="w-full md:w-36 py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold text-xs shadow-lg shadow-cyan-600/25 transition-all text-center flex items-center justify-center gap-1.5"
                  >
                    <span>启程调查</span>
                    <span>➔</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-950/70 border-t border-slate-800 text-xs text-slate-400 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>启程后底部将出现沉浸式导航 HUD，可随时中止或自由跳转</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
          >
            稍后自选探索
          </button>
        </div>
      </div>
    </div>
  );
}
