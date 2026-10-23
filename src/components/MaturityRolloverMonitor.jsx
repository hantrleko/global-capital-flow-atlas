import React, { useState, useMemo, useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { 
  Clock, ShieldAlert, AlertTriangle, CheckCircle2, TrendingDown,
  Layers, Filter, ArrowUpRight, ShieldCheck, Flame, Info 
} from 'lucide-react';
import DataClassificationBadge from './DataClassificationBadge';

export default function MaturityRolloverMonitor({
  dataset,
  selectedQuarter,
  onSelectCountry
}) {
  const chartRef1 = useRef(null);
  const chartRef2 = useRef(null);
  const chartInstance1 = useRef(null);
  const chartInstance2 = useRef(null);

  const [sortField, setSortField] = useState('guidotti'); // 'guidotti' | 'shortTermShare' | 'shortTermDebt'
  const [filterCompliance, setFilterCompliance] = useState('ALL'); // 'ALL' | 'DEFICIT_HAZARD' | 'VULNERABLE' | 'ADEQUATE'
  const [haircutPct, setHaircutPct] = useState(25); // Sudden stop simulated non-renewal %

  const countries = dataset.countries || [];
  const qIdx = dataset.quarters.indexOf(selectedQuarter);
  const cbsRisk = dataset.cbs_risk || {};

  // Compute maturity dataset for current quarter
  const maturityRows = useMemo(() => {
    return countries.map(c => {
      const qCbs = (cbsRisk[c.code] || [])[qIdx] || {};
      const mat = qCbs.maturity_profile || {
        short_term_pct: 42,
        medium_term_pct: 22,
        long_term_pct: 36,
        short_term_bn: 100,
        medium_term_bn: 50,
        long_term_bn: 80,
        guidotti_ratio_pct: 120,
        guidotti_compliance: 'ADEQUATE'
      };

      // Simulated sudden stop shock impact:
      // If haircutPct of short term debt is suddenly called and not rolled over:
      const suddenStopDrain = (mat.short_term_bn * (haircutPct / 100));
      const postShockReserves = Math.max(0, (qCbs.fx_reserves_bn || 0) - suddenStopDrain);
      const postShockGuidotti = mat.short_term_bn > 0 ? (postShockReserves / mat.short_term_bn) * 100 : 999;

      return {
        code: c.code,
        name: c.name,
        name_zh: c.name_zh,
        region: c.region,
        type: c.type,
        tier: c.tier,
        fx_reserves: qCbs.fx_reserves_bn || 0,
        total_external_debt: qCbs.cross_border_borrowings_bn || 0,
        short_term_pct: mat.short_term_pct,
        medium_term_pct: mat.medium_term_pct,
        long_term_pct: mat.long_term_pct,
        short_term_bn: mat.short_term_bn,
        medium_term_bn: mat.medium_term_bn,
        long_term_bn: mat.long_term_bn,
        guidotti_ratio: mat.guidotti_ratio_pct,
        guidotti_compliance: mat.guidotti_compliance,
        sudden_stop_drain: suddenStopDrain,
        post_shock_reserves: postShockReserves,
        post_shock_guidotti: postShockGuidotti
      };
    });
  }, [countries, cbsRisk, qIdx, haircutPct]);

  // Filtered and sorted
  const displayRows = useMemo(() => {
    let rows = [...maturityRows];
    if (filterCompliance !== 'ALL') {
      rows = rows.filter(r => r.guidotti_compliance === filterCompliance);
    }

    if (sortField === 'guidotti') {
      rows.sort((a, b) => a.guidotti_ratio - b.guidotti_ratio);
    } else if (sortField === 'shortTermShare') {
      rows.sort((a, b) => b.short_term_pct - a.short_term_pct);
    } else if (sortField === 'shortTermDebt') {
      rows.sort((a, b) => b.short_term_bn - a.short_term_bn);
    }
    return rows;
  }, [maturityRows, filterCompliance, sortField]);

  // Top summary stats
  const aggregateStats = useMemo(() => {
    const totalSt = maturityRows.reduce((acc, r) => acc + r.short_term_bn, 0);
    const totalMt = maturityRows.reduce((acc, r) => acc + r.medium_term_bn, 0);
    const totalLt = maturityRows.reduce((acc, r) => acc + r.long_term_bn, 0);
    const deficitCount = maturityRows.filter(r => r.guidotti_compliance === 'DEFICIT_HAZARD').length;
    const vulnerableCount = maturityRows.filter(r => r.guidotti_compliance === 'VULNERABLE').length;

    return {
      totalSt: Math.round(totalSt),
      totalMt: Math.round(totalMt),
      totalLt: Math.round(totalLt),
      stShareAvg: Math.round((totalSt / (totalSt + totalMt + totalLt || 1)) * 100),
      deficitCount,
      vulnerableCount
    };
  }, [maturityRows]);

  // ECharts 1: Stacked Maturity Profile Bar Chart
  useEffect(() => {
    if (!chartRef1.current) return;
    if (!chartInstance1.current) {
      chartInstance1.current = echarts.init(chartRef1.current, 'dark');
    }

    const sortedBySt = [...maturityRows].sort((a, b) => b.short_term_pct - a.short_term_pct);

    const option = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params) => {
          const item = sortedBySt[params[0].dataIndex];
          return `
            <div style="font-size:12px; font-family:monospace; min-width:180px;">
              <b style="color:#60a5fa">${item.name_zh} (${item.code})</b><br/>
              短期 (<1年): <b>${item.short_term_pct}%</b> ($${item.short_term_bn}B)<br/>
              中期 (1-2年): <b>${item.medium_term_pct}%</b> ($${item.medium_term_bn}B)<br/>
              长期 (>2年): <b>${item.long_term_pct}%</b> ($${item.long_term_bn}B)<br/>
              <span style="color:#f59e0b">格林斯潘-古多蒂比率: ${item.guidotti_ratio}%</span>
            </div>
          `;
        }
      },
      legend: {
        data: ['短期 (≤ 1年)', '中期 (1 - 2年)', '长期 (> 2年)'],
        top: 6,
        textStyle: { color: '#94a3b8', fontSize: 11 }
      },
      grid: { left: '3%', right: '4%', bottom: '8%', top: '16%', containLabel: true },
      xAxis: {
        type: 'category',
        data: sortedBySt.map(r => r.code),
        axisLabel: { color: '#94a3b8', fontSize: 10, interval: 0, rotate: 30 },
        axisLine: { lineStyle: { color: '#334155' } }
      },
      yAxis: {
        type: 'value',
        name: '期限份额占比 (%)',
        nameTextStyle: { color: '#64748b', fontSize: 10 },
        max: 100,
        axisLabel: { color: '#94a3b8', formatter: '{value}%' },
        splitLine: { lineStyle: { color: '#1e293b' } }
      },
      series: [
        {
          name: '短期 (≤ 1年)',
          type: 'bar',
          stack: 'total',
          data: sortedBySt.map(r => r.short_term_pct),
          itemStyle: { color: '#f43f5e' }
        },
        {
          name: '中期 (1 - 2年)',
          type: 'bar',
          stack: 'total',
          data: sortedBySt.map(r => r.medium_term_pct),
          itemStyle: { color: '#f59e0b' }
        },
        {
          name: '长期 (> 2年)',
          type: 'bar',
          stack: 'total',
          data: sortedBySt.map(r => r.long_term_pct),
          itemStyle: { color: '#3b82f6' }
        }
      ]
    };

    chartInstance1.current.setOption(option, true);
    chartInstance1.current.off('click');
    chartInstance1.current.on('click', (params) => {
      const item = sortedBySt[params.dataIndex];
      if (item) onSelectCountry?.(item.code);
    });

    const handleResize = () => chartInstance1.current?.resize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [maturityRows, onSelectCountry]);

  // ECharts 2: Guidotti Rule Scatter Plot (FX Reserves vs Short-Term Debt)
  useEffect(() => {
    if (!chartRef2.current) return;
    if (!chartInstance2.current) {
      chartInstance2.current = echarts.init(chartRef2.current, 'dark');
    }

    const scatterData = maturityRows.map(r => [
      r.short_term_bn,
      r.fx_reserves,
      r.guidotti_ratio,
      r.name_zh,
      r.code,
      r.guidotti_compliance
    ]);

    const option = {
      backgroundColor: 'transparent',
      tooltip: {
        formatter: (param) => {
          const d = param.data;
          return `
            <div style="font-size:12px; font-family:monospace;">
              <b>${d[3]} (${d[4]})</b><br/>
              短期跨国外债: <b>$${d[0]}B</b><br/>
              官方外汇储备: <b>$${d[1]}B</b><br/>
              储备/短债比率: <b style="color:${d[2] < 100 ? '#f43f5e' : '#10b981'}">${d[2]}%</b><br/>
              评估: <b>${d[5]}</b>
            </div>
          `;
        }
      },
      grid: { left: '4%', right: '6%', bottom: '10%', top: '14%', containLabel: true },
      xAxis: {
        type: 'log',
        name: '短期跨国银行外债 ($B, 对数轴)',
        nameLocation: 'middle',
        nameGap: 28,
        nameTextStyle: { color: '#64748b', fontSize: 11 },
        axisLabel: { color: '#94a3b8' },
        splitLine: { lineStyle: { color: '#1e293b' } }
      },
      yAxis: {
        type: 'log',
        name: '官方外汇储备 ($B, 对数轴)',
        nameTextStyle: { color: '#64748b', fontSize: 11 },
        axisLabel: { color: '#94a3b8' },
        splitLine: { lineStyle: { color: '#1e293b' } }
      },
      series: [
        {
          type: 'scatter',
          symbolSize: (data) => Math.max(14, Math.min(36, Math.sqrt(data[0]) * 1.5)),
          data: scatterData,
          itemStyle: {
            color: (params) => {
              const comp = params.data[5];
              return comp === 'DEFICIT_HAZARD' ? '#f43f5e' : comp === 'VULNERABLE' ? '#f59e0b' : '#10b981';
            },
            shadowBlur: 8,
            shadowColor: 'rgba(0,0,0,0.5)'
          },
          label: {
            show: true,
            formatter: (p) => p.data[4],
            position: 'top',
            color: '#cbd5e1',
            fontSize: 10,
            fontWeight: 'bold'
          },
          markLine: {
            silent: true,
            lineStyle: { color: '#f59e0b', type: 'dashed', width: 2 },
            data: [
              {
                name: 'Greenspan-Guidotti 100% 警戒线',
                coord: [100, 100]
              }
            ]
          }
        }
      ]
    };

    chartInstance2.current.setOption(option, true);
    chartInstance2.current.off('click');
    chartInstance2.current.on('click', (params) => {
      const code = params.data[4];
      if (code) onSelectCountry?.(code);
    });

    const handleResize = () => chartInstance2.current?.resize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [maturityRows, onSelectCountry]);

  return (
    <div className="space-y-4">
      {/* Top Banner & KPI Badges */}
      <div className="glass-panel rounded-xl p-3.5 sm:p-4 shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-600/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm font-bold text-white">
                  CBS 债务期限结构与转期挤兑风险监控 (Residual Maturity &amp; Rollover Risk)
                </h2>
                <span className="text-[11px] font-mono bg-rose-950/80 text-rose-300 border border-rose-600/40 px-2 py-0.2 rounded">
                  {selectedQuarter}
                </span>
                <DataClassificationBadge
                  classification={selectedQuarter > '2026Q2' ? 'NOWCAST_PREDICTION' : 'OFFICIAL_OBSERVED'}
                  quarter={selectedQuarter}
                  sourceText="BIS CBS Table B / IMF IFS 储备统计"
                  methodText="Greenspan-Guidotti 外债转期覆盖率"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                依据 BIS 综合银行统计 (CBS) 穿透监测 1 年内短期债务、离岸同业借贷与格林斯潘-古多蒂 (Greenspan-Guidotti) 储备覆盖度
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* KPI 1: Short Term Debt Total */}
            <div className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 min-w-[120px]">
              <div className="text-[10px] text-slate-400 uppercase font-mono">全球短期债务</div>
              <div className="text-sm font-bold text-rose-400 font-mono">
                ${(aggregateStats.totalSt / 1000).toFixed(2)}T
                <span className="text-[10px] text-slate-500 font-normal ml-1">({aggregateStats.stShareAvg}%)</span>
              </div>
            </div>

            {/* KPI 2: Hazard Jurisdictions */}
            <div className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 min-w-[125px]">
              <div className="text-[10px] text-slate-400 uppercase font-mono">古多蒂赤字红线</div>
              <div className="text-sm font-bold text-rose-500 font-mono flex items-center gap-1">
                <span>{aggregateStats.deficitCount} 个经济体</span>
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
              </div>
            </div>

            {/* KPI 3: Vulnerable */}
            <div className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 min-w-[115px]">
              <div className="text-[10px] text-slate-400 uppercase font-mono">转期预警关注</div>
              <div className="text-sm font-bold text-amber-400 font-mono">
                {aggregateStats.vulnerableCount} 个经济体
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Sudden Stop Stress Simulation Slider */}
        <div className="mt-4 p-4 bg-slate-900/80 rounded-xl border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Flame className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                <span>资本突停压力沙盘：短期信贷不续作冲击 (Sudden Stop Haircut)</span>
                <span className="font-mono text-amber-400 font-bold text-sm">{haircutPct}%</span>
              </div>
              <p className="text-[11px] text-slate-400">
                模拟跨国银行与货币市场基金停止续作短期同业拆借，官方外汇储备需直接偿还短债的抽离强度
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-80">
            <span className="text-[10px] font-mono text-slate-500">10%</span>
            <input
              type="range"
              min={10}
              max={60}
              step={5}
              value={haircutPct}
              onChange={(e) => setHaircutPct(parseInt(e.target.value, 10))}
              className="w-full accent-amber-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-[10px] font-mono text-slate-500">60%</span>
          </div>
        </div>
      </div>

      {/* Two Interactive Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Maturity Tranches Stacked */}
        <div className="glass-panel rounded-2xl p-5 shadow-2xl flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-400" /> 各国跨国外债剩余期限分布 (%)
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                红: 短期 (≤1年) · 黄: 中期 (1-2年) · 蓝: 长期 (&gt;2年) · 点击柱体穿透查看
              </p>
            </div>
          </div>
          <div ref={chartRef1} className="w-full h-[360px] mt-2" />
        </div>

        {/* Chart 2: Guidotti Rule Scatter Plot */}
        <div className="glass-panel rounded-2xl p-5 shadow-2xl flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-400" /> 格林斯潘-古多蒂规则散点图 (储备 vs 短期债务)
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                对数坐标 · 虚线为 100% 充足率平衡线 · 红色为储备低于短债的高危经济体
              </p>
            </div>
          </div>
          <div ref={chartRef2} className="w-full h-[360px] mt-2" />
        </div>
      </div>

      {/* Comprehensive Table & Filter Controls */}
      <div className="glass-panel rounded-2xl p-5 shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-white">经济体期限错配与转期脆弱性明细清单</h3>
            <span className="text-xs text-slate-500 font-mono">({displayRows.length} 个经济体)</span>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Filter by Compliance */}
            <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1 text-xs">
              <span className="text-slate-500 px-2 flex items-center gap-1">
                <Filter className="w-3 h-3" /> 筛选:
              </span>
              {[
                { id: 'ALL', label: '全部' },
                { id: 'DEFICIT_HAZARD', label: '🚨 储备赤字 (<100%)' },
                { id: 'VULNERABLE', label: '⚠️ 转期脆弱 (100-150%)' },
                { id: 'ADEQUATE', label: '✅ 储备安全 (>150%)' },
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setFilterCompliance(f.id)}
                  className={`px-2.5 py-1 rounded text-[11px] transition-colors ${
                    filterCompliance === f.id
                      ? 'bg-blue-600 text-white font-semibold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Sort Dropdown */}
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value)}
              className="bg-slate-900 border border-slate-800 text-slate-300 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500"
            >
              <option value="guidotti">按古多蒂储备覆盖率排序 (从低到高)</option>
              <option value="shortTermShare">按短期债务占比排序 (从高到低)</option>
              <option value="shortTermDebt">按短期债务绝对值排序 (从大到小)</option>
            </select>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto mt-3">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-900/90 text-slate-400 font-mono uppercase text-[11px] border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">经济体</th>
                <th className="py-2.5 px-3">区域分类</th>
                <th className="py-2.5 px-3 text-right">跨国总外债</th>
                <th className="py-2.5 px-3 text-right">短期债务 (&le;1Y)</th>
                <th className="py-2.5 px-3 text-right">短期占比</th>
                <th className="py-2.5 px-3 text-right">外汇储备</th>
                <th className="py-2.5 px-3 text-right">古多蒂覆盖率</th>
                <th className="py-2.5 px-3 text-right">冲击后储备剩余</th>
                <th className="py-2.5 px-3 text-center">风险评级</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {displayRows.map(r => (
                <tr
                  key={r.code}
                  onClick={() => onSelectCountry?.(r.code)}
                  className="hover:bg-slate-900/60 transition-colors cursor-pointer group"
                >
                  <td className="py-2.5 px-3 font-sans font-medium text-white flex items-center gap-1.5">
                    <span className="font-mono text-blue-400 group-hover:underline">{r.code}</span>
                    <span>{r.name_zh}</span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-400 font-sans">{r.region}</td>
                  <td className="py-2.5 px-3 text-right text-slate-300">${r.total_external_debt.toFixed(1)}B</td>
                  <td className="py-2.5 px-3 text-right font-bold text-rose-400">${r.short_term_bn.toFixed(1)}B</td>
                  <td className="py-2.5 px-3 text-right text-rose-300">{r.short_term_pct}%</td>
                  <td className="py-2.5 px-3 text-right text-emerald-400">${r.fx_reserves.toFixed(1)}B</td>
                  <td className="py-2.5 px-3 text-right font-bold">
                    <span className={`${
                      r.guidotti_ratio < 100 
                        ? 'text-rose-400 font-bold' 
                        : r.guidotti_ratio < 150 
                        ? 'text-amber-400' 
                        : 'text-emerald-400'
                    }`}>
                      {r.guidotti_ratio.toFixed(1)}%
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right text-slate-300">
                    ${r.post_shock_reserves.toFixed(1)}B
                    <span className="text-[10px] text-rose-400 ml-1">(-${r.sudden_stop_drain.toFixed(1)}B)</span>
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-sans font-bold ${
                      r.guidotti_compliance === 'DEFICIT_HAZARD'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        : r.guidotti_compliance === 'VULNERABLE'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    }`}>
                      {r.guidotti_compliance === 'DEFICIT_HAZARD' ? '赤字高危' : r.guidotti_compliance === 'VULNERABLE' ? '转期脆弱' : '安全充裕'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
