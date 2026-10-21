import React, { useState, useMemo, useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { 
  ShieldAlert, AlertTriangle, ShieldCheck, Flame, 
  ArrowUpDown, Sliders, Info, Zap, ChevronRight 
} from 'lucide-react';
import { STRESS_SCENARIOS } from '../utils/macroScenarios';

export default function CountryRiskMatrix({
  dataset,
  selectedQuarter,
  selectedCountry,
  onSelectCountry
}) {
  const scatterRef = useRef(null);
  const [selectedScenarioId, setSelectedScenarioId] = useState('baseline');
  const [riskBasis, setRiskBasis] = useState('immediate'); // 'immediate' | 'ultimate'
  const [sortField, setSortField] = useState('vulnerability_score');
  const [sortAsc, setSortAsc] = useState(false);

  // Custom Scenario Sliders
  const [customSpread, setCustomSpread] = useState(180);
  const [customCreditShock, setCustomCreditShock] = useState(15);
  const [customDollarShock, setCustomDollarShock] = useState(12);

  const isCustom = selectedScenarioId === 'custom';
  const presetScenario = STRESS_SCENARIOS[selectedScenarioId] || STRESS_SCENARIOS.baseline;

  const scenario = isCustom ? {
    id: 'custom',
    name: '自定义宏观冲击工坊 (Custom Stress Scenario)',
    desc: `自定义压力测试：利差走阔 +${customSpread}bps，信贷收缩 -${customCreditShock}%，外债汇率承压 +${customDollarShock}%。`,
    dollarShockPct: customDollarShock,
    creditDeclinePct: -customCreditShock,
    spreadWidenBps: customSpread
  } : presetScenario;

  const quarters = dataset.quarters || [];
  const countries = dataset.countries || [];
  const cbsRisk = dataset.cbs_risk || {};
  const currentQIdx = quarters.indexOf(selectedQuarter);

  // BIS CBS Offshore Reallocation Matrix (Immediate Counterparty -> Ultimate Risk Basis)
  const OFFSHORE_REALLOCATIONS = useMemo(() => ({
    KY: { name: '开曼群岛', domesticPct: 0.08, parents: { US: 0.62, CN: 0.22, GB: 0.08 } },
    LU: { name: '卢森堡', domesticPct: 0.14, parents: { DE: 0.42, FR: 0.24, US: 0.20 } },
    CH: { name: '瑞士离岸信托', domesticPct: 0.45, parents: { DE: 0.25, US: 0.18, GB: 0.12 } },
    HK: { name: '中国香港', domesticPct: 0.32, parents: { CN: 0.52, US: 0.10, GB: 0.06 } },
    SG: { name: '新加坡', domesticPct: 0.36, parents: { US: 0.28, CN: 0.22, JP: 0.14 } }
  }), []);

  // Compute stress-adjusted risk table factoring in Immediate vs Ultimate Risk Basis
  const riskTable = useMemo(() => {
    // 1. Calculate offshore conduit reallocations if Ultimate Risk is selected
    const parentAdditions = {};
    if (riskBasis === 'ultimate') {
      countries.forEach(c => {
        const alloc = OFFSHORE_REALLOCATIONS[c.code];
        if (alloc) {
          const qRisk = (cbsRisk[c.code] || [])[currentQIdx] || {};
          const nominalBorrowing = qRisk.cross_border_borrowings_bn || c.base_liab || 100;
          const reallocatedPool = nominalBorrowing * (1.0 - alloc.domesticPct);
          Object.entries(alloc.parents).forEach(([pCode, pct]) => {
            parentAdditions[pCode] = (parentAdditions[pCode] || 0) + (reallocatedPool * pct);
          });
        }
      });
    }

    return countries.map(c => {
      const qRisk = (cbsRisk[c.code] || [])[currentQIdx] || {};
      let baseBorrowing = qRisk.cross_border_borrowings_bn || c.base_liab || 100;

      // Adjust borrowing under Ultimate Risk Basis
      if (riskBasis === 'ultimate') {
        const conduit = OFFSHORE_REALLOCATIONS[c.code];
        if (conduit) {
          // Offshore shell collapsed to true domestic absorption
          baseBorrowing = Math.round(baseBorrowing * conduit.domesticPct);
        } else if (parentAdditions[c.code]) {
          // Sovereign parent absorbs its offshore entities' guaranteed liabilities
          baseBorrowing = Math.round(baseBorrowing + parentAdditions[c.code]);
        }
      }

      const reserves = qRisk.fx_reserves_bn || c.fx_reserves || 1.0;

      // Apply scenario shocks
      const debtShockMultiplier = 1.0 + (scenario.creditDeclinePct / 100);
      const stressedBorrowing = Math.max(10, baseBorrowing * debtShockMultiplier);
      const stressedReserves = Math.max(1, reserves - (scenario.dollarShockPct > 0 ? (baseBorrowing * 0.05) : 0));

      const debtToReserves = stressedBorrowing / stressedReserves;
      
      // Calculate adjusted vulnerability score
      let adjustedScore = (qRisk.vulnerability_score || 30.0) + (scenario.spreadWidenBps / 10.0) * (c.default_usd_share / 100.0);
      if (c.type === 'emerging_vulnerable') adjustedScore += 12;
      if (riskBasis === 'ultimate' && OFFSHORE_REALLOCATIONS[c.code]) {
        adjustedScore = Math.max(15, adjustedScore - 22); // Conduit stripped of facade risk
      }
      adjustedScore = Math.min(99, Math.max(5, Math.round(adjustedScore)));

      // Refinancing gap under stress ($Bn)
      const refGap = scenario.creditDeclinePct < 0 
        ? Math.round(baseBorrowing * Math.abs(scenario.creditDeclinePct / 100) * (c.default_usd_share / 100))
        : 0;

      let rating = 'LOW';
      let badgeColor = 'emerald';
      if (adjustedScore >= 70) {
        rating = 'HIGH';
        badgeColor = 'rose';
      } else if (adjustedScore >= 50) {
        rating = 'ELEVATED';
        badgeColor = 'amber';
      } else if (adjustedScore >= 32) {
        rating = 'MODERATE';
        badgeColor = 'yellow';
      }

      return {
        code: c.code,
        name: c.name,
        name_zh: c.name_zh,
        region: c.region,
        tier: c.tier,
        type: c.type,
        usdShare: c.default_usd_share,
        reserves: Math.round(reserves),
        borrowings: Math.round(baseBorrowing),
        stressedBorrowing: Math.round(stressedBorrowing),
        refGap,
        debtToReserves: parseFloat(debtToReserves.toFixed(2)),
        vulnerability_score: adjustedScore,
        rating,
        badgeColor,
        sectorBreakdown: qRisk.sector_breakdown || {}
      };
    }).sort((a, b) => {
      const valA = a[sortField];
      const valB = b[sortField];
      if (typeof valA === 'string') {
        return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortAsc ? valA - valB : valB - valA;
    });
  }, [countries, cbsRisk, currentQIdx, scenario, sortField, sortAsc, riskBasis, OFFSHORE_REALLOCATIONS]);

  // Scatter Plot: Debt-to-Reserves vs Vulnerability Score
  useEffect(() => {
    if (!scatterRef.current) return;
    const chart = echarts.init(scatterRef.current, 'dark');

    const scatterData = riskTable.map(r => {
      let color = '#10b981';
      if (r.rating === 'HIGH') color = '#f43f5e';
      else if (r.rating === 'ELEVATED') color = '#f59e0b';
      else if (r.rating === 'MODERATE') color = '#eab308';

      return {
        name: r.name_zh,
        countryCode: r.code,
        value: [r.debtToReserves, r.vulnerability_score, r.borrowings],
        itemStyle: {
          color: color,
          borderColor: selectedCountry === r.code ? '#ffffff' : '#1e293b',
          borderWidth: selectedCountry === r.code ? 3 : 1
        },
        symbolSize: Math.max(12, Math.min(36, Math.sqrt(r.borrowings) * 0.9)),
        extra: r
      };
    });

    const option = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(10, 15, 30, 0.94)',
        borderColor: 'rgba(244, 63, 94, 0.4)',
        borderWidth: 1,
        padding: [10, 14],
        extraCssText: 'box-shadow: 0 12px 36px rgba(0,0,0,0.6); backdrop-filter: blur(12px); border-radius: 8px;',
        formatter: (params) => {
          const r = params.data.extra;
          return `
            <div class="p-1 font-sans text-xs">
              <div class="font-bold text-white mb-1 border-b border-slate-700 pb-1">
                ${r.name_zh} (${r.code}) · 风险等级: <span class="text-${r.badgeColor}-400">${r.rating}</span>
              </div>
              <div class="space-y-1">
                <div>外债/外储比: <b class="font-mono text-white">${r.debtToReserves}x</b></div>
                <div>综合脆弱性得分: <b class="font-mono text-amber-400">${r.vulnerability_score} / 100</b></div>
                <div>外债本金规模: <b class="font-mono text-slate-200">${r.borrowings >= 1000 ? `$${(r.borrowings / 1000).toFixed(2)}T` : `$${r.borrowings}B`} (${Math.round(r.borrowings * 10).toLocaleString()} 亿美元)</b></div>
                <div>美元债务份额: <b class="font-mono text-emerald-400">${r.usdShare}%</b></div>
                ${r.refGap > 0 ? `<div class="text-rose-400">预计展期缺口: <b>$${r.refGap}B (${Math.round(r.refGap * 10).toLocaleString()} 亿美元)</b></div>` : ''}
              </div>
            </div>
          `;
        }
      },
      grid: {
        left: '5%',
        right: '6%',
        bottom: '12%',
        top: '12%',
        containLabel: true
      },
      xAxis: {
        type: 'value',
        name: '外债 / 官方储备比率 (倍)',
        nameLocation: 'middle',
        nameGap: 28,
        splitLine: { lineStyle: { color: '#1e293b' } },
        axisLabel: { color: '#94a3b8' }
      },
      yAxis: {
        type: 'value',
        name: '综合脆弱性得分 (0-100)',
        min: 0,
        max: 100,
        splitLine: { lineStyle: { color: '#1e293b' } },
        axisLabel: { color: '#94a3b8' }
      },
      series: [
        {
          name: 'Country Vulnerability',
          type: 'scatter',
          data: scatterData,
          label: {
            show: true,
            formatter: '{b}',
            position: 'top',
            color: '#cbd5e1',
            fontSize: 10
          },
          markLine: {
            silent: true,
            lineStyle: { color: '#475569', type: 'dashed' },
            data: [
              { yAxis: 50, label: { formatter: '高危预警线 (50分)', position: 'end', color: '#f59e0b' } },
              { xAxis: 2.0, label: { formatter: '储备覆盖警戒线 (2.0x)', position: 'end', color: '#f59e0b' } }
            ]
          }
        }
      ]
    };

    chart.setOption(option);
    chart.on('click', (p) => {
      if (p.data && p.data.countryCode) {
        onSelectCountry(p.data.countryCode);
      }
    });

    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      chart.dispose();
    };
  }, [riskTable, selectedCountry]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Banner: Stress Testing Controls */}
      <div className="glass-panel rounded-2xl p-5 shadow-2xl">
        <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-3 mb-3 gap-3">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              BIS 综合银行统计 (CBS) 国家风险敞口与外债脆弱性压力测试
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              测算在不同宏观流动性冲击下，各国对跨国银行的美元再融资敞口、外汇储备保障倍数及潜在展期缺口
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {/* Risk Accounting Basis Toggle */}
            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700/80 rounded-xl p-1 text-xs shadow-sm">
              <span className="text-[11px] font-mono text-slate-400 px-1.5">统计口径:</span>
              <button
                onClick={() => setRiskBasis('immediate')}
                className={`px-2.5 py-1 rounded-lg transition-all text-xs font-medium cursor-pointer ${
                  riskBasis === 'immediate'
                    ? 'bg-blue-600 text-white font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="按法定借款人所在地统计 (离岸避税港名义借款虚高)"
              >
                即期借款人原则 (Immediate)
              </button>
              <button
                onClick={() => setRiskBasis('ultimate')}
                className={`px-2.5 py-1 rounded-lg transition-all text-xs font-medium cursor-pointer flex items-center gap-1 ${
                  riskBasis === 'ultimate'
                    ? 'bg-emerald-600 text-white font-bold shadow-[0_0_12px_rgba(16,185,129,0.35)]'
                    : 'text-slate-400 hover:text-emerald-400'
                }`}
                title="穿透剥离避税港外壳，将资产回溯归属至真实最终母国担保人"
              >
                <span>⚡ 最终风险穿透原则 (Ultimate Risk)</span>
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-amber-400" /> 选择压力情景:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {Object.values(STRESS_SCENARIOS).map(sc => (
                  <button
                    key={sc.id}
                    onClick={() => setSelectedScenarioId(sc.id)}
                    className={`px-2.5 py-1 rounded text-xs transition-all cursor-pointer ${
                      selectedScenarioId === sc.id
                        ? 'bg-rose-600 text-white font-semibold shadow-md shadow-rose-600/30'
                        : 'bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    {sc.name.split(' ')[0]}
                  </button>
                ))}
                <button
                  onClick={() => setSelectedScenarioId('custom')}
                  className={`px-2.5 py-1 rounded text-xs transition-all flex items-center gap-1 cursor-pointer ${
                    selectedScenarioId === 'custom'
                      ? 'bg-amber-600 text-white font-semibold shadow-md shadow-amber-600/30'
                      : 'bg-slate-900 text-amber-400 border border-amber-500/40 hover:bg-slate-800'
                  }`}
                >
                  <Sliders className="w-3 h-3" />
                  <span>自定义冲击工坊</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Offshore Conduit Piercing Ledger Banner */}
        {riskBasis === 'ultimate' && (
          <div className="mb-3 p-3.5 bg-emerald-950/30 border border-emerald-500/40 rounded-xl space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded-lg bg-emerald-500/20 text-emerald-400">
                  <ShieldCheck className="w-4 h-4" />
                </span>
                <span className="font-bold text-emerald-300">
                  CBS 最终风险穿透情景模拟已启动 [启发式母国重分配 · 非官方逐笔担保合同]
                </span>
              </div>
              <span className="text-[11px] font-mono text-emerald-400/90 hidden sm:inline">
                剥离离岸虚高外壳，将实质债务按学术假定权重穿透至实际母公司所在国
              </span>
            </div>
            <p className="text-[11px] text-emerald-200/80 leading-normal font-sans">
              方法论说明：由于 BIS 官方公开 CBS 统计按保密法脱敏、不公开离岸实体逐笔商业担保人名单，本模式基于学术文献设定的启发式重分配权重（如开曼离岸债务按 62% 美国 / 22% 中国 / 8% 英国穿透回溯），作为结构性穿透情景演示，非官方担保人实测数据。
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 text-[11px] font-mono pt-1">
              {Object.entries(OFFSHORE_REALLOCATIONS).map(([code, conduit]) => (
                <div key={code} className="bg-slate-900/80 p-2 rounded-lg border border-white/5">
                  <div className="flex justify-between items-center text-white font-bold">
                    <span>{conduit.name} ({code})</span>
                    <span className="text-emerald-400">本国仅 {Math.round(conduit.domesticPct * 100)}%</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1 truncate">
                    实质母国: {Object.entries(conduit.parents).map(([p, pct]) => `${p} ${Math.round(pct * 100)}%`).join(', ')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Custom Sliders Panel when isCustom is true */}
        {isCustom && (
          <div className="mb-3 p-3 bg-amber-950/20 border border-amber-500/30 rounded-lg grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>外汇掉期利差走阔 (FX Basis Spread):</span>
                <span className="font-mono text-amber-400 font-bold">+{customSpread} bps</span>
              </div>
              <input
                type="range"
                min={0}
                max={400}
                step={20}
                value={customSpread}
                onChange={(e) => setCustomSpread(parseInt(e.target.value, 10))}
                className="w-full accent-amber-500 bg-slate-800 h-1.5 rounded appearance-none cursor-pointer"
              />
            </div>
            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>跨国银行信贷收缩率 (Credit Squeeze):</span>
                <span className="font-mono text-rose-400 font-bold">-{customCreditShock}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={35}
                step={2}
                value={customCreditShock}
                onChange={(e) => setCustomCreditShock(parseInt(e.target.value, 10))}
                className="w-full accent-rose-500 bg-slate-800 h-1.5 rounded appearance-none cursor-pointer"
              />
            </div>
            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>外汇储备损耗/承压 (Reserve Drain):</span>
                <span className="font-mono text-cyan-400 font-bold">+{customDollarShock}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={25}
                step={1}
                value={customDollarShock}
                onChange={(e) => setCustomDollarShock(parseInt(e.target.value, 10))}
                className="w-full accent-cyan-500 bg-slate-800 h-1.5 rounded appearance-none cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* Active Scenario Narrative */}
        <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-lg text-xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-slate-300">
            <Zap className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong className="text-white">{scenario.name}: </strong>
              {scenario.desc}
            </span>
          </div>
          <div className="flex items-center gap-4 shrink-0 font-mono text-[11px]">
            <span className="text-slate-400">
              全球外债展期缺口估算: <b className="text-rose-400 text-sm font-bold">
                ${riskTable.reduce((s, r) => s + r.refGap, 0)}B ({Math.round(riskTable.reduce((s, r) => s + r.refGap, 0) * 10).toLocaleString()} 亿美元)
              </b>
            </span>
            <span className="text-slate-400">
              高危预警国数: <b className="text-amber-400 text-sm font-bold">{riskTable.filter(r => r.rating === 'HIGH').length} 个</b>
            </span>
          </div>
        </div>
      </div>

      {/* Middle Row: Scatter Plot & Priority Watchlist */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Scatter Plot (7 cols) */}
        <div className="lg:col-span-7 glass-panel rounded-2xl p-5 shadow-2xl">
          <div className="border-b border-slate-800 pb-2 mb-2 flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              国家主权/外债脆弱性象限分布图
            </h3>
            <span className="text-xs text-slate-500 font-mono">{selectedQuarter}</span>
          </div>
          <div ref={scatterRef} className="w-full h-[320px]" />
        </div>

        {/* Priority Vulnerability Watchlist (5 cols) */}
        <div className="lg:col-span-5 glass-panel rounded-2xl p-5 shadow-2xl flex flex-col justify-between">
          <div>
            <div className="border-b border-slate-800 pb-2 mb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Flame className="w-4 h-4 text-rose-400" />
                当前情景下高风险预警国 (Top Vulnerable Sovereigns)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                受外债高企、美元借贷比重过高或外储垫底挤压的重点国
              </p>
            </div>

            <div className="space-y-2">
              {riskTable.slice(0, 5).map((r, idx) => (
                <div
                  key={r.code}
                  onClick={() => onSelectCountry(r.code)}
                  className="bg-slate-900/90 border border-slate-800/90 rounded-lg p-2.5 hover:border-slate-700 cursor-pointer transition-all flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-mono font-bold text-rose-400 w-4">{idx + 1}.</span>
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-1.5">
                        {r.name_zh}
                        <span className="text-[10px] text-slate-400 font-mono">({r.code})</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                          r.rating === 'HIGH' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' :
                          r.rating === 'ELEVATED' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                          'bg-emerald-500/20 text-emerald-300'
                        }`}>
                          {r.rating}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        外债: <b className="font-mono text-slate-200">${r.borrowings}B</b> · 外储: <b className="font-mono text-slate-200">${r.reserves}B</b>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs font-mono font-bold text-amber-400">
                      {r.vulnerability_score} <span className="text-[10px] font-normal text-slate-400">分</span>
                    </div>
                    {r.refGap > 0 && (
                      <div className="text-[10px] text-rose-400 font-mono">
                        缺口: -${r.refGap}B
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="text-[11px] text-slate-500 bg-slate-900/60 p-2.5 rounded border border-slate-800 mt-2">
            💡 提示：点击列表或图表中的任意经济体，可在右侧抽屉式面板中调阅其完整的 BIS 历史穿透数据与双边银行对手方名单。
          </div>
        </div>
      </div>

      {/* Comprehensive Risk Data Table */}
      <div className="glass-panel rounded-2xl p-5 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Sliders className="w-4 h-4 text-blue-400" />
            全景主权与跨国银行敞口对照表 ({riskTable.length} 个重点管辖区)
          </h3>
          <span className="text-xs text-slate-400">点击表头快速升降序排列</span>
        </div>

        <div className="overflow-x-auto max-h-[360px]">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-900 text-slate-400 text-[11px] uppercase tracking-wider sticky top-0 border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">经济体 / 代码</th>
                <th className="py-2.5 px-3 cursor-pointer hover:text-white" onClick={() => handleSort('region')}>
                  所属区域 <ArrowUpDown className="w-3 h-3 inline ml-0.5 opacity-50" />
                </th>
                <th className="py-2.5 px-3 cursor-pointer hover:text-white" onClick={() => handleSort('vulnerability_score')}>
                  脆弱性得分 <ArrowUpDown className="w-3 h-3 inline ml-0.5 opacity-50" />
                </th>
                <th className="py-2.5 px-3">风险评级</th>
                <th className="py-2.5 px-3 cursor-pointer hover:text-white text-right" onClick={() => handleSort('borrowings')}>
                  跨境借贷本金 ($B) <ArrowUpDown className="w-3 h-3 inline ml-0.5 opacity-50" />
                </th>
                <th className="py-2.5 px-3 cursor-pointer hover:text-white text-right" onClick={() => handleSort('reserves')}>
                  官方外储规模 ($B) <ArrowUpDown className="w-3 h-3 inline ml-0.5 opacity-50" />
                </th>
                <th className="py-2.5 px-3 cursor-pointer hover:text-white text-right" onClick={() => handleSort('debtToReserves')}>
                  外债/外储倍数 <ArrowUpDown className="w-3 h-3 inline ml-0.5 opacity-50" />
                </th>
                <th className="py-2.5 px-3 text-right">美元比重</th>
                {scenario.creditDeclinePct < 0 && (
                  <th className="py-2.5 px-3 text-right text-rose-400 font-bold">冲击展期缺口 ($B)</th>
                )}
                <th className="py-2.5 px-3 text-center">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {riskTable.map(r => (
                <tr 
                  key={r.code}
                  className={`hover:bg-slate-800/50 transition-colors ${selectedCountry === r.code ? 'bg-blue-950/40' : ''}`}
                >
                  <td className="py-2 px-3 font-medium text-white flex items-center gap-1.5">
                    <span>{r.name_zh}</span>
                    <span className="text-[10px] text-slate-500 font-mono">({r.code})</span>
                  </td>
                  <td className="py-2 px-3 text-slate-400">{r.region}</td>
                  <td className="py-2 px-3">
                    <span className="font-mono font-bold text-amber-400">{r.vulnerability_score}</span>
                  </td>
                  <td className="py-2 px-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      r.rating === 'HIGH' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                      r.rating === 'ELEVATED' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                      r.rating === 'MODERATE' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                      'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    }`}>
                      {r.rating}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-slate-200">${r.borrowings.toLocaleString()}B</td>
                  <td className="py-2 px-3 text-right font-mono text-slate-200">${r.reserves.toLocaleString()}B</td>
                  <td className="py-2 px-3 text-right font-mono">
                    <span className={r.debtToReserves > 2 ? 'text-rose-400 font-bold' : 'text-slate-300'}>
                      {r.debtToReserves}x
                    </span>
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-emerald-400">{r.usdShare}%</td>
                  {scenario.creditDeclinePct < 0 && (
                    <td className="py-2 px-3 text-right font-mono text-rose-400 font-bold">
                      {r.refGap > 0 ? `-$${r.refGap.toLocaleString()}B` : '-'}
                    </td>
                  )}
                  <td className="py-2 px-3 text-center">
                    <button
                      onClick={() => onSelectCountry(r.code)}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-blue-600 text-slate-300 hover:text-white transition-colors text-[11px] inline-flex items-center gap-1"
                    >
                      <span>穿透</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
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
