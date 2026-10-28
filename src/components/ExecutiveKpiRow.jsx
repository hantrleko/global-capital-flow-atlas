import React, { useMemo } from 'react';
import { Globe, DollarSign, Activity, TrendingUp, ShieldCheck } from 'lucide-react';
import { formatValueInCurrency } from '../utils/currencyConversion';
import { getDataClassification } from '../utils/dataClassification';

export default function ExecutiveKpiRow({
  dataset,
  selectedQuarter,
  selectedCurrency = 'USD'
}) {
  const classification = useMemo(() => getDataClassification(selectedQuarter), [selectedQuarter]);
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

  const totalFormatted = formatValueInCurrency(totalClaimsVal, selectedCurrency, selectedQuarter);

  // Dynamic USD share & stress metrics
  const usdShare = currentMacro.global_usd_share_pct ?? currentMacro.usd_denominated_share_pct ?? 52.8;
  const prevUsdShare = prevMacro ? (prevMacro.global_usd_share_pct ?? prevMacro.usd_denominated_share_pct ?? usdShare) : usdShare;
  const deltaUsdShare = Math.round((usdShare - prevUsdShare) * 10) / 10;

  const stressIndex = currentMacro.bis_usd_funding_stress_index ?? currentMacro.funding_stress_index ?? 48.2;

  // Corridor density stats
  const currentLinks = (dataset.bilateral_matrix || {})[selectedQuarter] || [];
  const top5Claims = useMemo(() => {
    const sorted = [...currentLinks].sort((a, b) => b.claims_usd_bn - a.claims_usd_bn);
    const sum5 = sorted.slice(0, 5).reduce((acc, cur) => acc + (cur.claims_usd_bn || 0), 0);
    const sumAll = sorted.reduce((acc, cur) => acc + (cur.claims_usd_bn || 0), 0);
    return sumAll > 0 ? Math.round((sum5 / sumAll) * 1000) / 10 : 41.8;
  }, [currentLinks]);

  return (
    <div className="flex overflow-x-auto md:grid md:grid-cols-3 gap-2 md:gap-2.5 w-full pb-0.5 md:pb-0 scrollbar-none">
      {/* KPI Card 1: Total Claims */}
      <div className="min-w-[270px] md:min-w-0 flex-1 bg-slate-900/90 border border-slate-800 rounded-xl px-3 py-1.5 flex items-center justify-between shadow-sm hover:border-slate-700 transition-colors shrink-0">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400">全球跨境信贷总额</span>
            <span className="text-[11px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700/60">
              BIS LBS
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-base md:text-lg font-bold font-mono text-white tracking-tight">
              {totalFormatted}
            </span>
            <span className={`text-xs font-mono font-semibold ${deltaBn >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {deltaBn >= 0 ? `+${deltaBn}B` : `${deltaBn}B`} ({deltaBn >= 0 ? `+${deltaPct}%` : `${deltaPct}%`})
            </span>
          </div>
        </div>
        <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-400/20 flex items-center justify-center text-sky-400 shrink-0">
          <Globe className="w-4 h-4" />
        </div>
      </div>

      {/* KPI Card 2: USD Share & Stress */}
      <div className="min-w-[270px] md:min-w-0 flex-1 bg-slate-900/90 border border-slate-800 rounded-xl px-3 py-1.5 flex items-center justify-between shadow-sm hover:border-slate-700 transition-colors shrink-0">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400">美元份额与紧缩指数</span>
            <span className="text-[11px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700/60">
              CBS 统计
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-base md:text-lg font-bold font-mono text-white tracking-tight">
              {Number(usdShare).toFixed(1)}%
            </span>
            <span className={`text-xs font-mono font-semibold ${deltaUsdShare >= 0 ? 'text-indigo-300' : 'text-slate-400'}`}>
              {deltaUsdShare >= 0 ? `+${deltaUsdShare}%` : `${deltaUsdShare}%`}
            </span>
            <span className="text-xs font-mono text-slate-300 ml-1">
              压力: <span className={stressIndex > 50 ? 'text-amber-400 font-semibold' : 'text-emerald-400 font-semibold'}>{Number(stressIndex).toFixed(1)}</span>
            </span>
          </div>
        </div>
        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-400/20 flex items-center justify-center text-indigo-400 shrink-0">
          <DollarSign className="w-4 h-4" />
        </div>
      </div>

      {/* KPI Card 3: Network Corridors & Hubs */}
      <div className="min-w-[270px] md:min-w-0 flex-1 bg-slate-900/90 border border-slate-800 rounded-xl px-3 py-1.5 flex items-center justify-between shadow-sm hover:border-slate-700 transition-colors shrink-0">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400">走廊集中度与核心枢纽</span>
            <span className="text-[11px] font-mono text-sky-300 bg-sky-950/60 px-1.5 py-0.5 rounded border border-sky-800/60">
              506 走廊
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-base md:text-lg font-bold font-mono text-white tracking-tight">
              Top 5 占 {top5Claims}%
            </span>
            <span className="text-xs font-sans text-slate-400">
              枢纽: 美英日德中
            </span>
          </div>
        </div>
        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-400/20 flex items-center justify-center text-emerald-400 shrink-0">
          <Activity className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
}
