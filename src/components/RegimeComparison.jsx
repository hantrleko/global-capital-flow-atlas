import React, { useState, useMemo, useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { 
  ArrowRightLeft, TrendingUp, TrendingDown, DollarSign, 
  Layers, ArrowUpRight, ArrowDownRight, Compass, Download 
} from 'lucide-react';
import { HISTORICAL_REGIMES } from '../utils/macroScenarios';

export default function RegimeComparison({
  dataset,
  onSelectCountry
}) {
  const quarters = dataset.quarters || [];
  const [quarterA, setQuarterA] = useState('2019Q4'); // Baseline
  const [quarterB, setQuarterB] = useState('2023Q2'); // Comparison target

  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  const countries = dataset.countries || [];
  const countryMap = Object.fromEntries(countries.map(c => [c.code, c]));
  const globalMacro = dataset.global_macro || [];

  const macroA = globalMacro.find(m => m.quarter === quarterA) || {};
  const macroB = globalMacro.find(m => m.quarter === quarterB) || {};

  const linksA = (dataset.bilateral_matrix || {})[quarterA] || [];
  const linksB = (dataset.bilateral_matrix || {})[quarterB] || [];

  // Compute bilateral changes (Delta)
  const corridorDiffs = useMemo(() => {
    const mapA = Object.fromEntries(linksA.map(l => [`${l.source}->${l.target}`, l]));
    const diffs = [];

    linksB.forEach(lB => {
      const key = `${lB.source}->${lB.target}`;
      const lA = mapA[key];
      const valA = lA ? lA.claims_usd_bn : 0;
      const valB = lB.claims_usd_bn;
      const delta = Math.round(valB - valA);
      const deltaPct = valA > 0 ? Math.round(((valB - valA) / valA) * 100) : 0;

      const usdA = lA ? lA.usd_denominated_bn : 0;
      const usdB = lB.usd_denominated_bn;
      const deltaUsd = Math.round(usdB - usdA);

      diffs.push({
        source: lB.source,
        target: lB.target,
        srcName: countryMap[lB.source]?.name_zh || lB.source,
        dstName: countryMap[lB.target]?.name_zh || lB.target,
        valA,
        valB,
        delta,
        deltaPct,
        deltaUsd,
        category: lB.corridor_category
      });
    });

    return diffs.sort((a, b) => b.delta - a.delta);
  }, [linksA, linksB, countryMap]);

  // Top 8 Expanding vs Top 8 Contracting Corridors
  const topExpanding = corridorDiffs.slice(0, 8);
  const topContracting = [...corridorDiffs].reverse().slice(0, 8);

  // Global aggregate deltas
  const deltaTotalClaims = Math.round((macroB.total_cross_border_claims_usd_bn || 0) - (macroA.total_cross_border_claims_usd_bn || 0));
  const deltaUsdCredit = Math.round((macroB.total_usd_cross_border_bn || 0) - (macroA.total_usd_cross_border_bn || 0));
  const deltaStress = Math.round((macroB.bis_usd_funding_stress_index || 0) - (macroA.bis_usd_funding_stress_index || 0));

  // Initialize Bar Divergence Chart
  useEffect(() => {
    if (!chartRef.current) return;
    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current, 'dark');
      const handleResize = () => chartInstance.current?.resize();
      window.addEventListener('resize', handleResize);
      return () => {
        window.removeEventListener('resize', handleResize);
        chartInstance.current?.dispose();
        chartInstance.current = null;
      };
    }
  }, []);

  useEffect(() => {
    if (!chartInstance.current) return;

    // Combined top 6 expanding + top 6 contracting for divergence chart
    const combined = [...topExpanding.slice(0, 6), ...topContracting.slice(0, 6)].reverse();

    const option = {
      backgroundColor: '#080c14',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: '#0f172a',
        borderColor: '#334155',
        textStyle: { color: '#f8fafc', fontSize: 12 },
        formatter: (params) => {
          const item = combined[params[0].dataIndex];
          const sign = item.delta >= 0 ? '+' : '';
          return `
            <div class="p-1 font-sans">
              <div class="font-bold text-sky-400 mb-1 border-b border-slate-700 pb-1">
                ${item.srcName} → ${item.dstName} 走廊信贷变化
              </div>
              <div class="space-y-1 text-xs">
                <div>${quarterA} 规模: <b class="font-mono text-slate-300">$${item.valA >= 1000 ? `${(item.valA / 1000).toFixed(2)}T` : `${item.valA}B`}</b></div>
                <div>${quarterB} 规模: <b class="font-mono text-white">$${item.valB >= 1000 ? `${(item.valB / 1000).toFixed(2)}T` : `${item.valB}B`}</b></div>
                <div class="${item.delta >= 0 ? 'text-emerald-400' : 'text-rose-400'} font-bold">
                  净变动 (Delta): ${sign}$${Math.abs(item.delta) >= 1000 ? `${(Math.abs(item.delta) / 1000).toFixed(2)}T` : `${Math.abs(item.delta)}B`} (${sign}${item.deltaPct}%)
                </div>
              </div>
            </div>
          `;
        }
      },
      grid: {
        left: '22%',
        right: '8%',
        top: '6%',
        bottom: '8%'
      },
      xAxis: {
        type: 'value',
        name: '信贷增减 (Delta $Bn)',
        splitLine: { lineStyle: { color: '#1e293b' } },
        axisLabel: { color: '#94a3b8' }
      },
      yAxis: {
        type: 'category',
        data: combined.map(c => `${c.srcName}→${c.dstName}`),
        axisLine: { lineStyle: { color: '#334155' } },
        axisLabel: { color: '#cbd5e1', fontSize: 11 }
      },
      series: [
        {
          name: '信贷规模变动 ($Bn)',
          type: 'bar',
          data: combined.map(c => ({
            value: c.delta,
            itemStyle: {
              color: c.delta >= 0 ? '#10b981' : '#f43f5e'
            }
          })),
          label: {
            show: true,
            position: 'right',
            formatter: (p) => `${p.value > 0 ? '+' : ''}${p.value}B`,
            color: '#cbd5e1',
            fontSize: 10
          }
        }
      ]
    };

    chartInstance.current.setOption(option, true);
  }, [corridorDiffs, quarterA, quarterB, topExpanding, topContracting]);

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 shadow-2xl space-y-5">
      {/* Selector & KPI Top Bar */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-4 gap-4">
        <div>
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4 text-purple-400" />
            跨宏观周期信贷差分对比分析 (Macro Regime Diff Engine)
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            对比两个关键宏观节点的国际银行信贷扩张、美元抽离与结构性再平衡
          </p>
        </div>

        {/* Dual Quarter Selectors */}
        <div className="flex items-center gap-3 bg-slate-900 p-2 rounded-lg border border-slate-800 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">基准季度 (A):</span>
            <select
              value={quarterA}
              onChange={(e) => setQuarterA(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-slate-200 px-2 py-1 rounded font-mono font-bold focus:outline-none focus:border-purple-500"
            >
              {quarters.map(q => <option key={q} value={q}>{q}</option>)}
            </select>
          </div>

          <span className="text-slate-500 font-bold">VS</span>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">对比季度 (B):</span>
            <select
              value={quarterB}
              onChange={(e) => setQuarterB(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-slate-200 px-2 py-1 rounded font-mono font-bold focus:outline-none focus:border-purple-500"
            >
              {quarters.map(q => <option key={q} value={q}>{q}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Aggregate Delta Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
          <div className="text-[11px] text-slate-400 flex items-center gap-1 font-mono uppercase">
            <TrendingUp className="w-3.5 h-3.5 text-blue-400" /> 全球跨境总债权净变动 (Δ Claims)
          </div>
          <div className={`text-lg font-bold font-mono mt-1 ${deltaTotalClaims >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {deltaTotalClaims >= 0 ? '+' : ''}${Math.abs(deltaTotalClaims) >= 1000 ? `${(deltaTotalClaims / 1000).toFixed(2)}T` : `${deltaTotalClaims}B`}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            从 ${macroA.total_cross_border_claims_usd_bn || 0}B 变动至 ${macroB.total_cross_border_claims_usd_bn || 0}B
          </div>
        </div>

        <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
          <div className="text-[11px] text-slate-400 flex items-center gap-1 font-mono uppercase">
            <DollarSign className="w-3.5 h-3.5 text-emerald-400" /> 美元跨境信贷净变动 (Δ USD)
          </div>
          <div className={`text-lg font-bold font-mono mt-1 ${deltaUsdCredit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {deltaUsdCredit >= 0 ? '+' : ''}${Math.abs(deltaUsdCredit) >= 1000 ? `${(deltaUsdCredit / 1000).toFixed(2)}T` : `${deltaUsdCredit}B`}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            美元占比变动: {((macroB.global_usd_share_pct || 0) - (macroA.global_usd_share_pct || 0)).toFixed(1)}%
          </div>
        </div>

        <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
          <div className="text-[11px] text-slate-400 flex items-center gap-1 font-mono uppercase">
            <Compass className="w-3.5 h-3.5 text-amber-400" /> 美元融资压力指数净变动 (Δ Stress)
          </div>
          <div className={`text-lg font-bold font-mono mt-1 ${deltaStress <= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {deltaStress >= 0 ? '+' : ''}{deltaStress} 分
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            从 {macroA.bis_usd_funding_stress_index || 0} 分变动至 {macroB.bis_usd_funding_stress_index || 0} 分
          </div>
        </div>
      </div>

      {/* Divergence Chart & Detailed Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Divergence Bar Chart (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900/40 p-3 rounded-xl border border-slate-800">
          <div className="text-xs font-bold text-white mb-2 flex items-center justify-between border-b border-slate-800 pb-2">
            <span>主要双边信贷走廊扩张 / 收缩排行榜</span>
            <span className="text-slate-400 font-mono text-[11px]">{quarterA} → {quarterB}</span>
          </div>
          <div ref={chartRef} className="w-full h-[360px]" />
        </div>

        {/* Detailed Breakdown Tables (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          {/* Top Expanding */}
          <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800">
            <div className="text-xs font-bold text-emerald-400 mb-2 flex items-center gap-1">
              <ArrowUpRight className="w-3.5 h-3.5" /> 扩张最显著的信贷通道 (Top Expansions)
            </div>
            <div className="space-y-1 text-xs">
              {topExpanding.slice(0, 4).map(item => (
                <div key={`${item.source}->${item.target}`} className="flex justify-between p-1 bg-slate-950/60 rounded text-[11px]">
                  <span className="text-slate-300">{item.srcName} → {item.dstName}</span>
                  <span className="font-mono text-emerald-400 font-bold">+{item.delta >= 1000 ? `$${(item.delta / 1000).toFixed(2)}T` : `$${item.delta}B`} (+{item.deltaPct}%)</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Contracting */}
          <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800">
            <div className="text-xs font-bold text-rose-400 mb-2 flex items-center gap-1">
              <ArrowDownRight className="w-3.5 h-3.5" /> 抽离 / 收缩最剧烈的信贷通道 (Top Retrenchments)
            </div>
            <div className="space-y-1 text-xs">
              {topContracting.slice(0, 4).map(item => (
                <div key={`${item.source}->${item.target}`} className="flex justify-between p-1 bg-slate-950/60 rounded text-[11px]">
                  <span className="text-slate-300">{item.srcName} → {item.dstName}</span>
                  <span className="font-mono text-rose-400 font-bold">${item.delta <= -1000 ? `-${(Math.abs(item.delta) / 1000).toFixed(2)}T` : `${item.delta}B`} ({item.deltaPct}%)</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
