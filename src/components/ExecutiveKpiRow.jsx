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

  // Corridor density stats
  const currentLinks = (dataset.bilateral_matrix || {})[selectedQuarter] || [];
  const top5Claims = useMemo(() => {
    const sorted = [...currentLinks].sort((a, b) => b.claims_usd_bn - a.claims_usd_bn);
    const sum5 = sorted.slice(0, 5).reduce((acc, cur) => acc + (cur.claims_usd_bn || 0), 0);
    const sumAll = sorted.reduce((acc, cur) => acc + (cur.claims_usd_bn || 0), 0);
    return sumAll > 0 ? Math.round((sum5 / sumAll) * 1000) / 10 : 41.8;
  }, [currentLinks]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 w-full">
      {/* KPI Card 1: Total Claims */}
      <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl px-3.5 py-2 flex items-center justify-between shadow-sm hover:border-slate-700 transition-colors">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400">全球跨境银行信贷总额</span>
            <span className={`text-[11px] font-mono font-medium px-2 py-0.5 rounded-full border ${classification.badgeClass}`}>
              {classification.label}
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-base md:text-lg font-bold font-mono text-white tracking-tight">
              ${totalFormatted.value} {totalFormatted.unit}
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
      <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl px-3.5 py-2 flex items-center justify-between shadow-sm hover:border-slate-700 transition-colors">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400">美元计价份额与离岸紧缩</span>
            <span className="text-[11px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700/60">
              CBS 口径
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-base md:text-lg font-bold font-mono text-white tracking-tight">
              {currentMacro.usd_denominated_share_pct ? `${currentMacro.usd_denominated_share_pct.toFixed(1)}%` : '52.8%'}
            </span>
            <span className="text-xs font-mono text-slate-300">
              压力指数: {currentMacro.funding_stress_index ? currentMacro.funding_stress_index.toFixed(1) : '48.2'}
            </span>
          </div>
        </div>
        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-400/20 flex items-center justify-center text-indigo-400 shrink-0">
          <DollarSign className="w-4 h-4" />
        </div>
      </div>

      {/* KPI Card 3: Network Corridors & Hubs */}
      <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl px-3.5 py-2 flex items-center justify-between shadow-sm hover:border-slate-700 transition-colors">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400">网络走廊与枢纽集中度</span>
            <span className="text-[11px] font-mono text-sky-300 bg-sky-950/60 px-1.5 py-0.5 rounded border border-sky-800/60">
              506 条双向走廊
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-base md:text-lg font-bold font-mono text-white tracking-tight">
              Top 5 占 {top5Claims}%
            </span>
            <span className="text-xs font-sans text-slate-400">
              核心枢纽: 美英日德中
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
