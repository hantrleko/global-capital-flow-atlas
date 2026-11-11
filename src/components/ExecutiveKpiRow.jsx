import React, { useMemo } from 'react';
import { Globe, DollarSign, Activity } from 'lucide-react';
import { formatValueInCurrency } from '../utils/currencyConversion';
import { useAnimatedNumber } from '../utils/useAnimatedValue';

// Mini Sparkline SVG for 36 Quarters Macro Dynamics
function MacroSparkline({ data = [], activeIndex = 0, width = 76, height = 26, strokeColor = '#38bdf8' }) {
  if (!data.length) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((d, i) => {
    const x = (i / Math.max(1, data.length - 1)) * width;
    const y = height - ((d - min) / range) * (height - 6) - 3;
    return [x, y];
  });
  const linePath = pts.map((p, i) => (i === 0 ? `M ${p[0]} ${p[1]}` : `L ${p[0]} ${p[1]}`)).join(' ');
  const areaPath = `${linePath} L ${width} ${height} L 0 ${height} Z`;
  const activePt = pts[activeIndex] || pts[pts.length - 1];

  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id="macro-spark-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={strokeColor} stopOpacity="0.35" />
          <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#macro-spark-grad)" />
      <path d={linePath} fill="none" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" />
      {activePt && (
        <circle cx={activePt[0]} cy={activePt[1]} r="3" fill="#ffffff" stroke={strokeColor} strokeWidth="1.5" />
      )}
    </svg>
  );
}

// Mini Semi-Circular Stress Gauge SVG
function StressMiniGauge({ value = 48.2, size = 36 }) {
  const clamped = Math.min(100, Math.max(0, value));
  const strokeColor = clamped > 60 ? '#fb7185' : clamped > 40 ? '#fbbf24' : '#34d399';

  return (
    <div className="relative flex flex-col items-center justify-center shrink-0" style={{ width: size, height: size * 0.75 }}>
      <svg width={size} height={size * 0.75} viewBox="0 0 36 24" className="overflow-visible">
        <path d="M 4 20 A 14 14 0 0 1 32 20" fill="none" stroke="rgba(148,163,184,0.18)" strokeWidth="3" strokeLinecap="round" />
        <path
          d="M 4 20 A 14 14 0 0 1 32 20"
          fill="none"
          stroke={strokeColor}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="44"
          strokeDashoffset={44 - (clamped / 100) * 44}
          className="transition-all duration-300"
        />
        <circle cx="18" cy="20" r="2.5" fill="#ffffff" />
      </svg>
    </div>
  );
}

// 5-Segmented Proportional Corridor Micro Bar
function StackedCorridorMicroBar({ width = 72 }) {
  return (
    <div className="flex h-1.5 rounded-full overflow-hidden bg-slate-800/80 border border-white/10 shrink-0" style={{ width }}>
      <div style={{ width: '32%' }} className="bg-sky-400" title="美-英 (US-GB)" />
      <div style={{ width: '24%' }} className="bg-indigo-400" title="美-日 (US-JP)" />
      <div style={{ width: '18%' }} className="bg-emerald-400" title="英-德 (GB-DE)" />
      <div style={{ width: '14%' }} className="bg-amber-400" title="美-开曼 (US-KY)" />
      <div style={{ width: '12%' }} className="bg-purple-400" title="美-加 (US-CA)" />
    </div>
  );
}

export default function ExecutiveKpiRow({
  dataset,
  selectedQuarter,
  selectedCurrency = 'USD'
}) {
  const quarters = dataset.quarters || [];
  const qIdx = quarters.indexOf(selectedQuarter);
  const prevQuarter = qIdx > 0 ? quarters[qIdx - 1] : null;

  const globalMacroList = dataset.global_macro || [];
  const currentMacro = useMemo(() => {
    return globalMacroList.find(m => m.quarter === selectedQuarter) || globalMacroList[globalMacroList.length - 1] || {};
  }, [globalMacroList, selectedQuarter]);

  const prevMacro = useMemo(() => {
    if (!prevQuarter) return null;
    return globalMacroList.find(m => m.quarter === prevQuarter) || null;
  }, [globalMacroList, prevQuarter]);

  const totalClaimsVal = currentMacro.total_cross_border_claims_usd_bn || 0;
  const prevClaimsVal = prevMacro ? prevMacro.total_cross_border_claims_usd_bn : totalClaimsVal;
  const deltaBn = Math.round((totalClaimsVal - prevClaimsVal) * 10) / 10;
  const deltaPct = prevClaimsVal > 0 ? Math.round(((totalClaimsVal - prevClaimsVal) / prevClaimsVal) * 1000) / 10 : 0;

  const animatedClaimsVal = useAnimatedNumber(totalClaimsVal, 260);
  const totalFormatted = formatValueInCurrency(animatedClaimsVal, selectedCurrency, selectedQuarter);

  // Sparkline data across all observed quarters
  const claimsSparklineData = useMemo(() => {
    return globalMacroList.map(m => m.total_cross_border_claims_usd_bn || 0);
  }, [globalMacroList]);

  const usdShare = currentMacro.global_usd_share_pct ?? currentMacro.usd_denominated_share_pct ?? 52.8;
  const prevUsdShare = prevMacro ? (prevMacro.global_usd_share_pct ?? prevMacro.usd_denominated_share_pct ?? usdShare) : usdShare;
  const deltaUsdShare = Math.round((usdShare - prevUsdShare) * 10) / 10;

  const stressIndex = currentMacro.bis_usd_funding_stress_index ?? currentMacro.funding_stress_index ?? 48.2;

  const animatedUsdShare = useAnimatedNumber(Number(usdShare), 260);
  const animatedStressIndex = useAnimatedNumber(Number(stressIndex), 260);

  const currentLinks = (dataset.bilateral_matrix || {})[selectedQuarter] || [];
  const top5Claims = useMemo(() => {
    const sorted = [...currentLinks].sort((a, b) => b.claims_usd_bn - a.claims_usd_bn);
    const sum5 = sorted.slice(0, 5).reduce((acc, cur) => acc + (cur.claims_usd_bn || 0), 0);
    const sumAll = sorted.reduce((acc, cur) => acc + (cur.claims_usd_bn || 0), 0);
    return sumAll > 0 ? Math.round((sum5 / sumAll) * 1000) / 10 : 41.8;
  }, [currentLinks]);

  const animatedTop5 = useAnimatedNumber(top5Claims, 260);

  return (
    <div className="flex overflow-x-auto md:grid md:grid-cols-3 gap-2.5 w-full pb-0.5 md:pb-0 scrollbar-none">
      {/* KPI Card 1: Total Claims */}
      <div className="min-w-[280px] md:min-w-0 flex-1 atlas-card-elevated atlas-specular-bar rounded-xl px-4 py-2 flex items-center justify-between shadow-md hover:border-sky-400/30 transition-all shrink-0">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-300" title="Total Cross-Border Banking Claims (BIS LBS)">
              全球跨境信贷总额
            </span>
            <span className="text-[10px] font-mono text-sky-300 bg-sky-950/60 px-1.5 py-0.2 rounded border border-sky-500/25">
              BIS LBS
            </span>
          </div>
          <div className="flex items-baseline gap-2 tabular-nums">
            <span className="text-base md:text-lg font-black font-mono text-white tracking-tight">
              {totalFormatted}
            </span>
            <span className={`text-[11px] font-mono font-semibold px-1.5 py-0.2 rounded border ${
              deltaBn >= 0 ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30' : 'bg-rose-950/40 text-rose-300 border-rose-500/30'
            }`}>
              {deltaBn >= 0 ? `+${deltaBn}B` : `${deltaBn}B`} ({deltaBn >= 0 ? `+${deltaPct}%` : `${deltaPct}%`})
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="hidden sm:block">
            <MacroSparkline data={claimsSparklineData} activeIndex={qIdx >= 0 ? qIdx : 0} />
          </div>
          <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-400/25 flex items-center justify-center text-sky-400 shrink-0">
            <Globe className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* KPI Card 2: USD Share & Stress */}
      <div className="min-w-[280px] md:min-w-0 flex-1 atlas-card-elevated atlas-specular-bar rounded-xl px-4 py-2 flex items-center justify-between shadow-md hover:border-indigo-400/30 transition-all shrink-0">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-300" title="USD Denominated Share & Offshore Funding Stress Index">
              美元份额与紧缩指数
            </span>
            <span className="text-[10px] font-mono text-indigo-300 bg-indigo-950/60 px-1.5 py-0.2 rounded border border-indigo-500/25">
              CBS 统计
            </span>
          </div>
          <div className="flex items-baseline gap-2 tabular-nums">
            <span className="text-base md:text-lg font-black font-mono text-white tracking-tight">
              {Number(animatedUsdShare).toFixed(1)}%
            </span>
            <span className={`text-[11px] font-mono font-semibold ${deltaUsdShare >= 0 ? 'text-indigo-300' : 'text-slate-400'}`}>
              {deltaUsdShare >= 0 ? `+${deltaUsdShare}%` : `${deltaUsdShare}%`}
            </span>
            <span className="text-xs font-mono text-slate-300 ml-1">
              压力: <strong className={stressIndex > 50 ? 'text-amber-400' : 'text-emerald-400'}>{Number(animatedStressIndex).toFixed(1)}</strong>
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <StressMiniGauge value={Number(stressIndex)} />
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-400/25 flex items-center justify-center text-indigo-400 shrink-0">
            <DollarSign className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* KPI Card 3: Network Corridors & Hubs */}
      <div className="min-w-[280px] md:min-w-0 flex-1 atlas-card-elevated atlas-specular-bar rounded-xl px-4 py-2 flex items-center justify-between shadow-md hover:border-emerald-400/30 transition-all shrink-0">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-300" title="Top-5 Bilateral Corridor Concentration & Core Hubs">
              走廊集中度与核心枢纽
            </span>
            <span className="text-[10px] font-mono text-emerald-300 bg-emerald-950/60 px-1.5 py-0.2 rounded border border-emerald-500/25">
              506 走廊
            </span>
          </div>
          <div className="flex items-baseline gap-2 tabular-nums">
            <span className="text-base md:text-lg font-black font-mono text-white tracking-tight">
              Top 5 占 {Number(animatedTop5).toFixed(1)}%
            </span>
            <span className="text-xs font-sans text-slate-400">
              枢纽: 美英日德中
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="hidden sm:block">
            <StackedCorridorMicroBar />
          </div>
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400 shrink-0">
            <Activity className="w-4 h-4" />
          </div>
        </div>
      </div>
    </div>
  );
}
