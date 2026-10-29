import React from 'react';

export default function GuidedInvestigationHUD({
  activeTrack,
  currentStepIndex,
  onNextStep,
  onPrevStep,
  onExitTrack
}) {
  if (!activeTrack) return null;

  const steps = activeTrack.steps || [];
  const currentStep = steps[currentStepIndex] || steps[0];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === steps.length - 1;
  const progressPercent = ((currentStepIndex + 1) / steps.length) * 100;

  return (
    <div data-testid="guided-investigation-hud" className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[94%] max-w-4xl animate-slideUp">
      <div className="bg-slate-900/95 backdrop-blur-xl border border-cyan-500/60 rounded-2xl shadow-[0_10px_35px_rgba(0,0,0,0.7),0_0_20px_rgba(6,182,212,0.25)] p-4 text-white overflow-hidden relative">
        {/* Top Slim Progress Strip */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-slate-800">
          <div 
            className="h-full bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1">
          {/* Left Context: Track info & Prompt */}
          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <span data-testid="hud-step-badge" className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-mono font-bold flex items-center gap-1">
                🕵️ 侦探主线 [{currentStepIndex + 1}/{steps.length}]
              </span>
              <span className="font-semibold text-slate-200 truncate">
                {activeTrack.title}
              </span>
              <span className="text-slate-500 hidden sm:inline">|</span>
              <span className="text-cyan-400 font-medium">
                {currentStep.title}
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed font-sans pr-2">
              💡 <span className="font-medium text-amber-200">研判指引: </span>{currentStep.prompt}
            </p>
          </div>

          {/* Right Controls: Steps Navigation */}
          <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
            {/* Prev button */}
            <button
              onClick={onPrevStep}
              disabled={isFirstStep}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1 ${
                isFirstStep
                  ? 'bg-slate-800/40 border-slate-700/50 text-slate-600 cursor-not-allowed'
                  : 'bg-slate-800 hover:bg-slate-700 border-slate-600 text-slate-200 hover:text-white'
              }`}
            >
              <span>⬅️</span>
              <span className="hidden sm:inline">上一步</span>
            </button>

            {/* Next / Finish button */}
            <button
              onClick={onNextStep}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all shadow-lg flex items-center gap-1.5 ${
                isLastStep
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-emerald-500/25'
                  : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-cyan-500/25'
              }`}
            >
              <span>{currentStep.actionLabel || (isLastStep ? '🎉 结案归档' : '下一步 ➔')}</span>
            </button>

            {/* Exit button */}
            <button
              onClick={onExitTrack}
              className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-rose-900/50 hover:border-rose-500/50 border border-slate-700 text-slate-400 hover:text-rose-300 transition-colors text-xs"
              title="退出主线导引"
            >
              ✕
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
