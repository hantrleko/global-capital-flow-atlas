import React, { useMemo } from 'react';
import { Globe, DollarSign, Activity } from 'lucide-react';
import { formatValueInCurrency } from '../utils/currencyConversion';
import { useAnimatedNumber } from '../utils/useAnimatedValue';

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
    <div className="flex overflow-x-auto md:grid md:grid-cols-3 gap-2 w-full pb-0.5 md:pb-0 scrollbar-none">
      {/* KPI Card 1: Total Claims */}
      <div className="min-w-[270px] md:min-w-0 flex-1 bg-[#0d1321]/95 border border-white/[0.07] rounded-xl px-3.5 py-1.5 flex items-center justify-between shadow-sm hover:border-white/[0.14] transition-colors shrink-0">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-400" title="Total Cross-Border Banking Claims (BIS LBS)">
              全球跨境信贷总额
            </span>
            <span className="text-[11px] font-mono text-slate-400 bg-[#131b2e] px-1.5 py-0.2 rounded border border-white/[0.07]">
              BIS LBS
            </span>
          </div>
          <div className="flex items-baseline gap-2 tabular-nums">
            <span className="text-base md:text-lg font-bold font-mono text-white tracking-tight">
              {totalFormatted}
            </span>
            <span className={`text-xs font-mono font-semibold ${deltaBn >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {deltaBn >= 0 ? `+${deltaBn}B` : `${deltaBn}B`} ({deltaBn >= 0 ? `+${deltaPct}%` : `${deltaPct}%`})
            </span>
          </div>
        </div>
        <div className="w-8 h-8 rounded-lg bg-[#131b2e] border border-white/[0.08] flex items-center justify-center text-indigo-400 shrink-0">
          <Globe className="w-4 h-4" />
        </div>
      </div>

      {/* KPI Card 2: USD Share & Stress */}
      <div className="min-w-[270px] md:min-w-0 flex-1 bg-[#0d1321]/95 border border-white/[0.07] rounded-xl px-3.5 py-1.5 flex items-center justify-between shadow-sm hover:border-white/[0.14] transition-colors shrink-0">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-400" title="USD Denominated Share & Offshore Funding Stress Index">
              美元份额与紧缩指数
            </span>
            <span className="text-[11px] font-mono text-slate-400 bg-[#131b2e] px-1.5 py-0.2 rounded border border-white/[0.07]">
              CBS 统计
            </span>
          </div>
          <div className="flex items-baseline gap-2 tabular-nums">
            <span className="text-base md:text-lg font-bold font-mono text-white tracking-tight">
              {Number(animatedUsdShare).toFixed(1)}%
            </span>
            <span className={`text-xs font-mono font-semibold ${deltaUsdShare >= 0 ? 'text-indigo-300' : 'text-slate-400'}`}>
              {deltaUsdShare >= 0 ? `+${deltaUsdShare}%` : `${deltaUsdShare}%`}
            </span>
            <span className="text-xs font-mono text-slate-300 ml-1">
              压力: <span className={stressIndex > 50 ? 'text-amber-400 font-semibold' : 'text-emerald-400 font-semibold'}>{Number(animatedStressIndex).toFixed(1)}</span>
            </span>
          </div>
        </div>
        <div className="w-8 h-8 rounded-lg bg-[#131b2e] border border-white/[0.08] flex items-center justify-center text-indigo-400 shrink-0">
          <DollarSign className="w-4 h-4" />
        </div>
      </div>

      {/* KPI Card 3: Network Corridors & Hubs */}
      <div className="min-w-[270px] md:min-w-0 flex-1 bg-[#0d1321]/95 border border-white/[0.07] rounded-xl px-3.5 py-1.5 flex items-center justify-between shadow-sm hover:border-white/[0.14] transition-colors shrink-0">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-400" title="Top-5 Bilateral Corridor Concentration & Core Hubs">
              走廊集中度与核心枢纽
            </span>
            <span className="text-[11px] font-mono text-indigo-300 bg-[#131b2e] px-1.5 py-0.2 rounded border border-white/[0.07]">
              506 走廊
            </span>
          </div>
          <div className="flex items-baseline gap-2 tabular-nums">
            <span className="text-base md:text-lg font-bold font-mono text-white tracking-tight">
              Top 5 占 {Number(animatedTop5).toFixed(1)}%
            </span>
            <span className="text-xs font-sans text-slate-400">
              枢纽: 美英日德中
            </span>
          </div>
        </div>
        <div className="w-8 h-8 rounded-lg bg-[#131b2e] border border-white/[0.08] flex items-center justify-center text-emerald-400 shrink-0">
          <Activity className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
}
