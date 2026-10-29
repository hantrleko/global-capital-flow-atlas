import React from 'react';
import { Info, ExternalLink, HelpCircle } from 'lucide-react';
import soundFx from '../utils/soundEffects';

export default function MethodologyFootnote({ 
  source = "BIS LBS Table A6.2", 
  accounting = "常住地即时交易对手原则 (Residence Principle)", 
  model = "最大熵矩阵平衡 (RAS)", 
  isSimulation = false,
  note = null,
  onOpenAppendix
}) {
  return (
    <div className="mt-3.5 pt-2.5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400 font-mono">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="flex items-center gap-1 text-slate-400 font-semibold">
          <Info className="w-3.5 h-3.5 text-sky-400 shrink-0" />
          <span>数据源:</span>
          <span className="text-slate-300 bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-700/60">
            {source}
          </span>
        </span>

        <span className="text-slate-600">|</span>

        <span className="text-slate-400">
          口径: <span className="text-slate-300">{accounting}</span>
        </span>

        {model && (
          <>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400">
              模型: <span className="text-slate-300">{model}</span>
            </span>
          </>
        )}

        {isSimulation && (
          <span className="px-1.5 py-0.5 rounded text-[11px] bg-amber-500/15 text-amber-300 border border-amber-500/30">
            示意性模拟推演 (Stylized Simulation)
          </span>
        )}
      </div>

      {onOpenAppendix && (
        <button
          onClick={() => {
            soundFx.playTick();
            onOpenAppendix();
          }}
          className="text-sky-400 hover:text-sky-300 hover:underline flex items-center gap-1 transition-colors cursor-pointer shrink-0"
        >
          <span>查看完整方法论附录</span>
          <ExternalLink className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}
