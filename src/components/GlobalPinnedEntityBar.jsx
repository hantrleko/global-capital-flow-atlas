import React from 'react';
import { 
  Pin, Zap, ShieldAlert, ArrowRightLeft, 
  BarChart2, FileText, X, Globe, Sparkles 
} from 'lucide-react';
import soundFx from '../utils/soundEffects';

/**
 * Global Pinned Entity Bar
 * Ensures sovereign focus is maintained across all 18 analytical tabs.
 * Allows users to discover a vulnerability in one module and immediately stress-test it in others.
 */
export default function GlobalPinnedEntityBar({
  selectedCountry,
  dataset,
  selectedQuarter,
  activeTab,
  onSelectTab,
  onSetContagionEpicenter,
  onClearCountry,
  onOpenDrawer
}) {
  if (!selectedCountry) return null;

  const countries = dataset?.countries || [];
  const country = countries.find(c => c.code === selectedCountry) || {
    code: selectedCountry,
    name: selectedCountry,
    name_zh: selectedCountry
  };

  // Compute total bilateral claims / liabilities for this country in the quarter
  const matrix = (dataset?.bilateral_matrix || {})[selectedQuarter] || [];
  let totalClaims = 0;
  let totalLiab = 0;
  matrix.forEach(l => {
    if (l.source === selectedCountry) totalClaims += (l.claims_usd_bn || 0);
    if (l.target === selectedCountry) totalLiab += (l.claims_usd_bn || 0);
  });

  const handleContagion = () => {
    soundFx.playChime();
    if (onSetContagionEpicenter) {
      onSetContagionEpicenter(selectedCountry);
    }
    onSelectTab('contagion');
  };

  const handleEws = () => {
    soundFx.playTick();
    onSelectTab('ews');
  };

  const handleRouting = () => {
    soundFx.playTick();
    onSelectTab('routing');
  };

  const handleCompare = () => {
    soundFx.playTick();
    onSelectTab('compare');
  };

  return (
    <div 
      id="pinned-entity-bar"
      data-testid="pinned-entity-bar"
      className="w-full bg-gradient-to-r from-blue-950/90 via-slate-900/95 to-indigo-950/90 border border-blue-500/50 rounded-xl px-3.5 py-2 shadow-lg flex items-center justify-between gap-3 flex-wrap backdrop-blur-md animate-fade-in"
    >
      {/* Left: Entity Identification & Key Metric */}
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-blue-500/20 border border-blue-400/50 flex items-center justify-center text-blue-400">
          <Pin className="w-4 h-4 fill-blue-400 text-blue-400 rotate-45" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold text-sky-400 bg-sky-950/80 px-1.5 py-0.5 rounded border border-sky-500/40">
            {country.code}
          </span>
          <span className="text-xs font-bold text-white">
            {country.name_zh || country.name}
          </span>
          <span className="hidden sm:inline text-[11px] text-slate-300 border-l border-slate-700 pl-2">
            对外债权: <strong className="text-emerald-400 font-mono font-semibold">${Math.round(totalClaims)}B</strong> · 
            外部负债: <strong className="text-rose-400 font-mono font-semibold">${Math.round(totalLiab)}B</strong>
          </span>
        </div>
      </div>

      {/* Center & Right: Cross-Module Drill-Down Action Buttons */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[11px] text-slate-400 hidden lg:inline mr-1">
          穿透推演:
        </span>

        {/* 1. Contagion Stress Test Button */}
        <button
          onClick={handleContagion}
          className={`h-6.5 px-2.5 rounded-lg text-xs font-medium flex items-center gap-1 cursor-pointer transition-all shadow-sm ${
            activeTab === 'contagion'
              ? 'bg-rose-600 text-white border border-rose-400'
              : 'bg-rose-950/50 text-rose-300 border border-rose-500/40 hover:bg-rose-900/60 hover:text-white'
          }`}
          title={`将 ${country.name_zh} 设为震中运行 Eisenberg-Noe 级联清算模型`}
        >
          <Zap className="w-3 h-3 text-rose-400" />
          <span>传染压力推演</span>
        </button>

        {/* 2. EWS Diagnostic Button */}
        <button
          onClick={handleEws}
          className={`h-6.5 px-2.5 rounded-lg text-xs font-medium flex items-center gap-1 cursor-pointer transition-all shadow-sm ${
            activeTab === 'ews'
              ? 'bg-amber-600 text-white border border-amber-400'
              : 'bg-amber-950/50 text-amber-300 border border-amber-500/40 hover:bg-amber-900/60 hover:text-white'
          }`}
          title={`诊断 ${country.name_zh} 在巴塞尔预警系统中的信号`}
        >
          <ShieldAlert className="w-3 h-3 text-amber-400" />
          <span>预警雷达</span>
        </button>

        {/* 3. Bilateral Routing Button */}
        <button
          onClick={handleRouting}
          className={`h-6.5 px-2.5 rounded-lg text-xs font-medium flex items-center gap-1 cursor-pointer transition-all shadow-sm ${
            activeTab === 'routing'
              ? 'bg-sky-600 text-white border border-sky-400'
              : 'bg-sky-950/50 text-sky-300 border border-sky-500/40 hover:bg-sky-900/60 hover:text-white'
          }`}
          title={`查看 ${country.name_zh} 与各对手方的双边信贷走廊`}
        >
          <ArrowRightLeft className="w-3 h-3 text-sky-400" />
          <span>双边走廊</span>
        </button>

        {/* 4. Multi-Country Compare Button */}
        <button
          onClick={handleCompare}
          className={`h-6.5 px-2.5 rounded-lg text-xs font-medium flex items-center gap-1 cursor-pointer transition-all shadow-sm ${
            activeTab === 'compare'
              ? 'bg-purple-600 text-white border border-purple-400'
              : 'bg-purple-950/50 text-purple-300 border border-purple-500/40 hover:bg-purple-900/60 hover:text-white'
          }`}
          title={`将 ${country.name_zh} 纳入横截面雷达对比`}
        >
          <BarChart2 className="w-3 h-3 text-purple-400" />
          <span>多国对比</span>
        </button>

        {/* 5. Sovereign Profile Drawer Button */}
        {onOpenDrawer && (
          <button
            onClick={() => {
              soundFx.playTick();
              onOpenDrawer();
            }}
            className="h-6.5 px-2 rounded-lg text-xs font-medium flex items-center gap-1 cursor-pointer bg-slate-800/80 text-slate-300 hover:text-white border border-slate-700 shadow-sm"
            title={`展开 ${country.name_zh} 主权 360° 完整量化档案`}
          >
            <FileText className="w-3 h-3 text-slate-400" />
            <span className="hidden sm:inline">主权档案</span>
          </button>
        )}

        {/* 6. Clear Pin Button */}
        <button
          onClick={() => {
            soundFx.playTick();
            onClearCountry();
          }}
          className="h-6.5 w-6.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 flex items-center justify-center cursor-pointer ml-1"
          title="取消钉选当前经济体"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
