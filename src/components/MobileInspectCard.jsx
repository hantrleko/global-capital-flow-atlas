import React from 'react';
import { X, ArrowRight, Globe, Layers, DollarSign } from 'lucide-react';
import soundFx from '../utils/soundEffects';

/**
 * MobileInspectCard
 * Tap-to-Inspect Card replacing unstable hover tooltips on mobile (< 768px).
 * Displays full balance-sheet or corridor details right beneath the canvas.
 */
export default function MobileInspectCard({
  inspectedEntity,
  onClose,
  onSelectCountry,
  selectedQuarter
}) {
  if (!inspectedEntity) return null;

  const isCorridor = inspectedEntity.type === 'corridor';
  const data = inspectedEntity.data || {};

  return (
    <div 
      data-testid="mobile-inspect-card"
      className="md:hidden bg-slate-900/95 border border-sky-500/40 rounded-2xl p-4 shadow-2xl space-y-3 animate-fade-in text-white mt-2"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-400/30 flex items-center justify-center text-sky-400">
            {isCorridor ? <Layers className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
          </div>
          <div>
            <div className="text-xs font-mono text-sky-300">
              {isCorridor ? '双边信贷走廊' : '主权经济体头寸'} · {selectedQuarter}
            </div>
            <h4 className="text-sm font-bold text-white">
              {isCorridor 
                ? `${data.fromName || data.source} → ${data.toName || data.target}` 
                : `${data.name_zh || data.name} (${data.code})`}
            </h4>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-11 h-11 rounded-xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-center text-slate-400 hover:text-white cursor-pointer"
          aria-label="关闭详情卡"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 gap-2 text-xs font-mono">
        {isCorridor ? (
          <>
            <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
              <span className="text-[11px] text-slate-400 font-sans block">双边债权规模</span>
              <span className="text-sm font-bold text-white tabular-nums">
                ${data.claims_usd_bn >= 1000 ? `${(data.claims_usd_bn / 1000).toFixed(2)}T` : `${data.claims_usd_bn}B`}
              </span>
            </div>
            <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
              <span className="text-[11px] text-slate-400 font-sans block">美元计价总额</span>
              <span className="text-sm font-bold text-emerald-400 tabular-nums">
                ${data.usd_denominated_bn >= 1000 ? `${(data.usd_denominated_bn / 1000).toFixed(2)}T` : `${data.usd_denominated_bn}B`}
                <span className="text-[10px] text-slate-400 font-normal ml-1">({data.usdShare || 0}%)</span>
              </span>
            </div>
          </>
        ) : (
          <>
            <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
              <span className="text-[11px] text-slate-400 font-sans block">跨国银行总债权</span>
              <span className="text-sm font-bold text-white tabular-nums">
                ${data.claims >= 1000 ? `${(data.claims / 1000).toFixed(2)}T` : `${data.claims || 0}B`}
              </span>
            </div>
            <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
              <span className="text-[11px] text-slate-400 font-sans block">跨国银行总负债</span>
              <span className="text-sm font-bold text-white tabular-nums">
                ${data.liab >= 1000 ? `${(data.liab / 1000).toFixed(2)}T` : `${data.liab || 0}B`}
              </span>
            </div>
            <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
              <span className="text-[11px] text-slate-400 font-sans block">净外部头寸 (Net)</span>
              <span className={`text-sm font-bold tabular-nums ${(data.net || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {(data.net || 0) >= 0 ? `+$${data.net}B` : `-$${Math.abs(data.net)}B`}
              </span>
            </div>
            <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
              <span className="text-[11px] text-slate-400 font-sans block">美元计价份额</span>
              <span className="text-sm font-bold text-emerald-400 tabular-nums">
                {data.currency?.USD || 50}%
              </span>
            </div>
          </>
        )}
      </div>

      {/* Action Button */}
      {!isCorridor && data.code && (
        <button
          onClick={() => {
            soundFx.playTick();
            onSelectCountry && onSelectCountry(data.code);
            onClose();
          }}
          className="w-full min-h-[44px] rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
        >
          <span>穿透该经济体完整资产负债表</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
