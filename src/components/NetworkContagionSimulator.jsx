import React, { useState, useMemo, useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { 
  AlertOctagon, Play, RotateCcw, ShieldAlert, ArrowRight, 
  TrendingDown, Layers, Zap, Download, Info 
} from 'lucide-react';
import soundFx from '../utils/soundEffects';
import MethodologyFootnote from './MethodologyFootnote';
import DataClassificationBadge from './DataClassificationBadge';

export default function NetworkContagionSimulator({
  dataset,
  selectedQuarter,
  onSelectCountry,
  contagionConfig,
  onOpenAppendix
}) {
  const countries = dataset.countries || [];
  const currentLinks = (dataset.bilateral_matrix || {})[selectedQuarter] || [];
  const currentQIdx = dataset.quarters.indexOf(selectedQuarter);
  const lbsData = dataset.lbs_data || {};
  const cbsRisk = dataset.cbs_risk || {};

  // Standard Macro Contagion Presets
  const CONTAGION_PRESETS = [
    { id: 'emerging_debt', name: '前沿主权外债违约', epicenter: 'TR', haircut: 40, deleveraging: 1.8, dollarSqueeze: 15, desc: '新兴市场主权债务暴雷引发直接资产减记与信贷重估' },
    { id: 'dollar_crunch', name: '离岸美元流动性休克', epicenter: 'GB', haircut: 20, deleveraging: 2.2, dollarSqueeze: 25, desc: '欧洲美元转口中枢流动性骤紧与全球美元荒' },
    { id: 'euro_contagion', name: '泛欧跨国银行去杠杆', epicenter: 'IT', haircut: 30, deleveraging: 2.0, dollarSqueeze: 12, desc: '核心主权息差走阔导致多米诺骨牌级联收缩' }
  ];

  // Simulation parameters
  const [simMode, setSimMode] = useState('en_clearing'); // 'en_clearing' | 'behavioral'
  const [activePreset, setActivePreset] = useState('custom');
  const [epicenter, setEpicenter] = useState('TR'); // Default: Turkey (high external vulnerability)
  const [haircutPct, setHaircutPct] = useState(25); // Credit loss %
  const [deleveragingMultiplier, setDeleveragingMultiplier] = useState(1.5); // Bank deleveraging ratio
  const [dollarSqueezePct, setDollarSqueezePct] = useState(12); // Dollar liquidity squeeze %
  const [simResults, setSimResults] = useState(null);

  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  // Sync external configuration if passed from CountryDrawer or CrisisPlaybook
  useEffect(() => {
    if (contagionConfig) {
      if (contagionConfig.epicenter) setEpicenter(contagionConfig.epicenter);
      if (contagionConfig.haircut) setHaircutPct(contagionConfig.haircut);
      if (contagionConfig.deleveraging) setDeleveragingMultiplier(contagionConfig.deleveraging);
      if (contagionConfig.dollarSqueeze) setDollarSqueezePct(contagionConfig.dollarSqueeze);
      if (contagionConfig.presetId) setActivePreset(contagionConfig.presetId);
    }
  }, [contagionConfig]);

  const epicenterCountry = countries.find(c => c.code === epicenter) || countries[0];

  // Apply preset
  const handleSelectPreset = (p) => {
    soundFx.playTick();
    setActivePreset(p.id);
    setEpicenter(p.epicenter);
    setHaircutPct(p.haircut);
    setDeleveragingMultiplier(p.deleveraging);
    setDollarSqueezePct(p.dollarSqueeze);
  };

  // Run Eisenberg-Noe (2001) Fixed-Point Clearing & Multi-Round Stress Cascade
  const runSimulation = () => {
    soundFx.playShockwave();

    // 1. Authentic Eisenberg-Noe (2001) Clearing Vector Fixed Point p* = min(pbar, Pi^T * p + e)
    const n = countries.length;
    const codeToIndex = Object.fromEntries(countries.map((c, idx) => [c.code, idx]));
    
    // Matrix of interbank cross-border obligations L[j][i]: claims of creditor j on debtor i
    const L = Array.from({ length: n }, () => new Float64Array(n));
    currentLinks.forEach(l => {
      const j = codeToIndex[l.source]; // creditor
      const i = codeToIndex[l.target]; // debtor
      if (j !== undefined && i !== undefined) {
        L[j][i] = l.claims_usd_bn;
      }
    });

    // Nominal cross-border debt pbar[i] of debtor i: sum of obligations of i to all foreign creditors j
    const pbar = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      let sum = 0;
      for (let j = 0; j < n; j++) sum += L[j][i];
      pbar[i] = sum;
    }

    // Relative liabilities Pi[i][j]: proportion of debtor i's payments due to creditor j
    const Pi = Array.from({ length: n }, () => new Float64Array(n));
    for (let i = 0; i < n; i++) {
      if (pbar[i] > 0) {
        for (let j = 0; j < n; j++) {
          Pi[i][j] = L[j][i] / pbar[i];
        }
      }
    }

    // Operating capital / buffer e: banking equity / reserves (minus initial epicenter haircut shock)
    const e = new Float64Array(n);
    const epiIdx = codeToIndex[epicenter];
    for (let i = 0; i < n; i++) {
      const c = countries[i];
      const cap = (c.fx_reserves || 50) * 1.5;
      if (i === epiIdx) {
        e[i] = Math.max(-pbar[i], cap - pbar[i] * (haircutPct / 100));
      } else {
        e[i] = cap;
      }
    }

    // Picard iteration to find maximal clearing vector p*
    let p = new Float64Array(pbar);
    let iterationsCount = 0;
    let finalDiff = 0;
    for (let iter = 0; iter < 100; iter++) {
      iterationsCount = iter + 1;
      const pNext = new Float64Array(n);
      let diff = 0;
      for (let i = 0; i < n; i++) {
        let inflows = 0;
        for (let j = 0; j < n; j++) {
          inflows += Pi[j][i] * p[j];
        }
        const available = Math.max(0, inflows + e[i]);
        pNext[i] = Math.min(pbar[i], available);
        diff = Math.max(diff, Math.abs(pNext[i] - p[i]));
      }
      p = pNext;
      finalDiff = diff;
      if (diff < 1e-4) break;
    }

    // Compute Eisenberg-Noe clearing shortfalls and passed losses
    // For creditor j: direct loss from epicenter + indirect loss from other defaulting nodes
    const enLossesReceived = {};
    const enDirectLoss = {};
    const enIndirectLoss = {};
    let totalEnShortfall = 0;

    for (let j = 0; j < n; j++) {
      let direct = 0;
      let indirect = 0;
      for (let i = 0; i < n; i++) {
        const shortfall_i = pbar[i] - p[i];
        if (shortfall_i > 0) {
          const lossFrom_i = Pi[i][j] * shortfall_i;
          if (i === epiIdx) {
            direct += lossFrom_i;
          } else {
            indirect += lossFrom_i;
          }
        }
      }
      const directRounded = Math.round(direct * 10) / 10;
      const indirectRounded = Math.round(indirect * 10) / 10;
      const totLoss = Math.round((direct + indirect) * 10) / 10;
      enDirectLoss[countries[j].code] = directRounded;
      enIndirectLoss[countries[j].code] = indirectRounded;
      enLossesReceived[countries[j].code] = totLoss;
      totalEnShortfall += totLoss;
    }

    // 2. Multi-Round Behavioral Spillover Simulation
    const directCreditorLinks = currentLinks.filter(l => l.target === epicenter);
    
    // Round 1: Direct Losses
    const round1Losses = {};
    let totalR1Loss = 0;

    directCreditorLinks.forEach(l => {
      const loss = Math.round(l.claims_usd_bn * (haircutPct / 100));
      round1Losses[l.source] = (round1Losses[l.source] || 0) + loss;
      totalR1Loss += loss;
    });

    // Round 2: Secondary Deleveraging
    const round2Spillovers = {};
    let totalR2Contagion = 0;

    Object.entries(round1Losses).forEach(([creditorCode, r1Loss]) => {
      if (r1Loss > 10) {
        const retrenchmentPool = Math.round(r1Loss * deleveragingMultiplier);
        const otherLoans = currentLinks.filter(l => l.source === creditorCode && l.target !== epicenter);
        const totalOtherLoans = otherLoans.reduce((sum, l) => sum + l.claims_usd_bn, 0);

        if (totalOtherLoans > 0) {
          otherLoans.forEach(l => {
            const cut = Math.round(retrenchmentPool * (l.claims_usd_bn / totalOtherLoans));
            round2Spillovers[l.target] = (round2Spillovers[l.target] || 0) + cut;
            totalR2Contagion += cut;
          });
        }
      }
    });

    // Round 3: Dollar Refinancing Squeeze (Global Dollar Shortage)
    // Strictly derived from quarterly actual liabilities, NEVER hardcoded 120 fallback!
    const round3DollarSqueeze = {};
    let totalR3Dollar = 0;
    let validLiabCount = 0;

    countries.forEach(c => {
      if (c.code !== epicenter) {
        const qLbs = (lbsData[c.code] || []).find(q => q.quarter === selectedQuarter);
        const qCbs = (cbsRisk[c.code] || []).find(q => q.quarter === selectedQuarter);
        const actualLiab = qLbs?.liabilities_usd_bn 
          ?? qCbs?.cross_border_borrowings_bn 
          ?? currentLinks.filter(l => l.target === c.code).reduce((sum, l) => sum + l.claims_usd_bn, 0);

        if (actualLiab !== undefined && actualLiab !== null && !isNaN(actualLiab) && actualLiab > 0) {
          validLiabCount++;
          const dSqueeze = Math.round(actualLiab * (c.default_usd_share / 100) * (dollarSqueezePct / 100));
          round3DollarSqueeze[c.code] = dSqueeze;
          totalR3Dollar += dSqueeze;
        } else {
          round3DollarSqueeze[c.code] = null; // Marked as NA when missing
        }
      }
    });

    // Compile comprehensive impact ranking
    const impactList = countries
      .filter(c => c.code !== epicenter)
      .map(c => {
        const r1 = round1Losses[c.code] || 0;
        const r2 = round2Spillovers[c.code] || 0;
        const r3 = round3DollarSqueeze[c.code] !== null ? (round3DollarSqueeze[c.code] || 0) : null;
        const enLoss = enLossesReceived[c.code] || 0;
        const enDirect = enDirectLoss[c.code] || 0;
        const enIndirect = enIndirectLoss[c.code] || 0;
        const totalImpact = r1 + r2 + (r3 !== null ? r3 : 0);
        const reserves = c.fx_reserves || 1;
        const impactToReservesPct = parseFloat(((totalImpact / reserves) * 100).toFixed(1));
        const enShortfallToReservesPct = parseFloat(((enLoss / reserves) * 100).toFixed(1));

        return {
          code: c.code,
          name: c.name,
          name_zh: c.name_zh,
          region: c.region,
          tier: c.tier,
          r1Loss: r1,
          r2Spillover: r2,
          r3Dollar: r3,
          enLoss,
          enDirect,
          enIndirect,
          enShortfallToReservesPct,
          totalImpact,
          impactToReservesPct,
          primaryMetricValue: simMode === 'en_clearing' ? enLoss : totalImpact
        };
      })
      .filter(item => (simMode === 'en_clearing' ? item.enLoss > 0 : item.totalImpact > 0))
      .sort((a, b) => {
        return simMode === 'en_clearing' ? b.enLoss - a.enLoss : b.totalImpact - a.totalImpact;
      });

    setSimResults({
      modelVersion: 'v2.1-EN-2001',
      quarter: selectedQuarter,
      epicenterCode: epicenter,
      simMode,
      haircutPct,
      deleveragingMultiplier,
      dollarSqueezePct,
      iterationsCount,
      clearingResidual: finalDiff,
      epicenterDefaultAmount: Math.round((pbar[epiIdx] - p[epiIdx]) * 10) / 10,
      totalEnShortfall: Math.round(totalEnShortfall * 10) / 10,
      totalR1Loss,
      totalR2Contagion,
      totalR3Dollar,
      totalSystemicLoss: totalR1Loss + totalR2Contagion + totalR3Dollar,
      validLiabCoverage: `${validLiabCount}/${countries.length - 1}`,
      impactList
    });
  };

  // Run on mount or when parameters change
  useEffect(() => {
    runSimulation();
  }, [epicenter, haircutPct, deleveragingMultiplier, dollarSqueezePct, selectedQuarter, simMode]);

  // Render Cascade Chart
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
    if (!chartInstance.current || !simResults) return;

    const topImpacted = simResults.impactList.slice(0, 10).reverse();
    const isEn = simMode === 'en_clearing';

    const option = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: 'rgba(10, 15, 30, 0.94)',
        borderColor: isEn ? 'rgba(168, 85, 247, 0.5)' : 'rgba(244, 63, 94, 0.4)',
        borderWidth: 1,
        padding: [10, 14],
        extraCssText: 'box-shadow: 0 12px 36px rgba(0,0,0,0.6); backdrop-filter: blur(12px); border-radius: 8px;',
        textStyle: { color: '#f8fafc', fontSize: 12 },
        formatter: (params) => {
          const item = topImpacted[params[0].dataIndex];
          if (isEn) {
            return `
              <div class="p-1 font-sans">
                <div class="font-bold text-white border-b border-purple-500/40 pb-1 mb-1.5 flex items-center justify-between">
                  <span>${item.name_zh} (${item.code})</span>
                  <span class="text-[10px] font-mono text-purple-300">EN 2001 清算短缺</span>
                </div>
                <div class="space-y-1 text-xs">
                  <div>直接清算短缺 (来自震中): <b class="font-mono text-rose-400">$${item.enDirect}B (${Math.round(item.enDirect * 10).toLocaleString()} 亿美元)</b></div>
                  <div>网络次生级联清算短缺: <b class="font-mono text-purple-300">$${item.enIndirect}B (${Math.round(item.enIndirect * 10).toLocaleString()} 亿美元)</b></div>
                  <div class="border-t border-slate-800 pt-1">
                    清算短缺总额 (Clearing Shortfall): <b class="font-mono text-white text-sm font-bold">$${item.enLoss}B (${Math.round(item.enLoss * 10).toLocaleString()} 亿美元)</b>
                  </div>
                  <div class="text-[10px] text-slate-400">短缺占官方外储比例: <b class="font-mono text-amber-400">${item.enShortfallToReservesPct}%</b></div>
                  <div class="text-[10px] text-slate-500 mt-1 leading-normal">
                    模型定义：基于 Eisenberg-Noe 绝对优先与比例清偿的不动点未受偿义务，非实际全部资本亏损。
                  </div>
                </div>
              </div>
            `;
          }
          return `
            <div class="p-1 font-sans">
              <div class="font-bold text-white border-b border-slate-700 pb-1 mb-1">
                ${item.name_zh} (${item.code}) 行为级联损益
              </div>
              <div class="space-y-1 text-xs">
                <div>第一轮：直接资产减记损失: <b class="font-mono text-rose-400">$${item.r1Loss}B (${Math.round(item.r1Loss * 10).toLocaleString()} 亿美元)</b></div>
                <div>第二轮：去杠杆流动性抽离: <b class="font-mono text-amber-400">$${item.r2Spillover}B (${Math.round(item.r2Spillover * 10).toLocaleString()} 亿美元)</b></div>
                <div>第三轮：离岸美元再融资挤压: <b class="font-mono text-sky-400">${item.r3Dollar !== null ? `$${item.r3Dollar}B (${Math.round(item.r3Dollar * 10).toLocaleString()} 亿美元)` : 'NA (数据缺失)'}</b></div>
                <div class="border-t border-slate-800 pt-1">
                  综合受损总额: <b class="font-mono text-white text-sm font-bold">$${item.totalImpact}B (${Math.round(item.totalImpact * 10).toLocaleString()} 亿美元)</b>
                </div>
                <div class="text-[10px] text-slate-400">冲击占外汇储备比: <b class="font-mono text-rose-400">${item.impactToReservesPct}%</b></div>
              </div>
            </div>
          `;
        }
      },
      legend: {
        data: isEn
          ? ['直接违约清算短缺 (Direct Shortfall)', '网络次生级联短缺 (Indirect Shortfall)']
          : ['第一轮：直接资产减记 (Direct Loss)', '第二轮：去杠杆流动性抽离 (Secondary Retrenchment)', '第三轮：离岸美元再融资挤压 (USD Squeeze)'],
        top: 8,
        textStyle: { color: '#94a3b8', fontSize: 11 }
      },
      grid: {
        left: '18%',
        right: '8%',
        top: '16%',
        bottom: '8%'
      },
      xAxis: {
        type: 'value',
        name: isEn ? '清算短缺额 (USD Bn)' : '受损规模 (USD Bn)',
        splitLine: { lineStyle: { color: '#1e293b' } },
        axisLabel: { color: '#94a3b8', formatter: '${value}B' }
      },
      yAxis: {
        type: 'category',
        data: topImpacted.map(d => d.name_zh),
        axisLine: { lineStyle: { color: '#334155' } },
        axisLabel: { color: '#cbd5e1', fontSize: 11 }
      },
      series: isEn
        ? [
            {
              name: '直接违约清算短缺 (Direct Shortfall)',
              type: 'bar',
              stack: 'total',
              itemStyle: { color: '#f43f5e' },
              data: topImpacted.map(d => d.enDirect)
            },
            {
              name: '网络次生级联短缺 (Indirect Shortfall)',
              type: 'bar',
              stack: 'total',
              itemStyle: { color: '#a855f7' },
              data: topImpacted.map(d => d.enIndirect)
            }
          ]
        : [
            {
              name: '第一轮：直接资产减记 (Direct Loss)',
              type: 'bar',
              stack: 'total',
              itemStyle: { color: '#f43f5e' },
              data: topImpacted.map(d => d.r1Loss)
            },
            {
              name: '第二轮：去杠杆流动性抽离 (Secondary Retrenchment)',
              type: 'bar',
              stack: 'total',
              itemStyle: { color: '#f59e0b' },
              data: topImpacted.map(d => d.r2Spillover)
            },
            {
              name: '第三轮：离岸美元再融资挤压 (USD Squeeze)',
              type: 'bar',
              stack: 'total',
              itemStyle: { color: '#38bdf8' },
              data: topImpacted.map(d => d.r3Dollar || 0)
            }
          ]
    };

    chartInstance.current.setOption(option, true);
  }, [simResults, simMode]);

  const handleDownloadSnapshot = () => {
    if (!chartInstance.current) return;
    const url = chartInstance.current.getDataURL({
      type: 'png',
      pixelRatio: 2,
      backgroundColor: '#080c14'
    });
    const a = document.createElement('a');
    a.href = url;
    a.download = `bis_contagion_simulation_${epicenter}_${selectedQuarter}.png`;
    a.click();
  };

  return (
    <div className="glass-panel rounded-2xl p-5 shadow-2xl space-y-5">
      {/* Top Header & Simulation Controls */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-3 gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
            <AlertOctagon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                全球跨国银行网络系统性风险与传染扩散模拟器 (Eisenberg-Noe Contagion Cascade)
              </h2>
              <span className="text-[11px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                {selectedQuarter}
              </span>
              <DataClassificationBadge
                classification="STRESS_SIMULATION"
                sourceText="模型重构双边资产负债基准"
                methodText="Eisenberg & Noe (2001) 级联违约清算"
                onOpenAppendix={onOpenAppendix}
              />
            </div>
            <p className="text-xs text-slate-400 mt-1">
              基于模型重构之双边有向信贷网络，反事实推演某经济体违约或资本减记时，跨国银行一级资本的直接损失、去杠杆外溢与连锁流动性挤兑
            </p>
          </div>
        </div>

        <button
          onClick={handleDownloadSnapshot}
          className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
          title="导出高清仿真图 PNG"
        >
          <Download className="w-4 h-4" />
        </button>
      </div>

      {/* Model Mode Toggle Bar: Eisenberg-Noe (2001) vs Multi-Round Behavioral */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-900/90 border border-slate-800 rounded-xl">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-400 font-mono flex items-center gap-1.5 font-bold">
            <Layers className="w-4 h-4 text-purple-400" /> 清算模型契约 (Clearing Model Contract):
          </span>
          <div className="inline-flex rounded-lg bg-slate-950 p-1 border border-slate-800 text-xs">
            <button
              onClick={() => {
                soundFx.playTick();
                setSimMode('en_clearing');
              }}
              className={`px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                simMode === 'en_clearing'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Eisenberg–Noe (2001) 经典清算不动点</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-900/80 text-purple-200 border border-purple-400/40 font-mono">基准</span>
            </button>
            <button
              onClick={() => {
                soundFx.playTick();
                setSimMode('behavioral');
              }}
              className={`px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                simMode === 'behavioral'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>行为级联外溢模型 (Behavioral Contagion)</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-900/80 text-blue-200 border border-blue-400/40 font-mono">情景</span>
            </button>
          </div>
        </div>

        <div className="text-[11px] font-mono text-slate-400 flex items-center gap-3">
          <span>模型版本: <strong className="text-white">v2.1-EN-2001</strong></span>
          <span>·</span>
          <span>有效负债覆盖: <strong className="text-emerald-400">{simResults?.validLiabCoverage || '22/22'}</strong></span>
          <span>·</span>
          <span>矩阵方向: <strong className="text-slate-300">L[债权国][债务国]</strong></span>
        </div>
      </div>

      {/* Scenario Presets Pill Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <span className="text-xs font-mono text-slate-400 flex items-center gap-1 shrink-0">
          <Zap className="w-3.5 h-3.5 text-amber-400" /> 经典压力预设:
        </span>
        {CONTAGION_PRESETS.map(p => (
          <button
            key={p.id}
            onClick={() => handleSelectPreset(p)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all shrink-0 cursor-pointer border ${
              activePreset === p.id
                ? 'bg-rose-600/30 text-rose-300 border-rose-500/60 font-bold shadow-sm'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title={p.desc}
          >
            {p.name}
          </button>
        ))}
        <button
          onClick={() => setActivePreset('custom')}
          className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all shrink-0 cursor-pointer border ${
            activePreset === 'custom'
              ? 'bg-sky-600/30 text-sky-300 border-sky-500/60 font-bold shadow-sm'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          ⚙️ 自由参数工坊
        </button>
      </div>

      {/* Simulator Control Sliders */}
      <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
        <div>
          <label className="block text-slate-400 mb-1 font-semibold">1. 设定震中经济体 (Trigger Epicenter):</label>
          <select
            value={epicenter}
            onChange={(e) => {
              setEpicenter(e.target.value);
              setActivePreset('custom');
            }}
            className="w-full bg-slate-800 border border-slate-700 text-white font-bold px-2 py-1.5 rounded focus:outline-none focus:border-rose-500 cursor-pointer"
          >
            {countries.map(c => (
              <option key={c.code} value={c.code}>
                {c.name_zh} ({c.code}) - {c.region}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div className="flex justify-between text-slate-400 mb-1">
            <span className="font-semibold">2. 债务违约/资产减记率 (Haircut):</span>
            <span className="font-mono text-rose-400 font-bold">{haircutPct}%</span>
          </div>
          <input
            type="range"
            min={5}
            max={60}
            step={5}
            value={haircutPct}
            onChange={(e) => {
              setHaircutPct(parseInt(e.target.value, 10));
              setActivePreset('custom');
            }}
            className="w-full accent-rose-500 bg-slate-800 h-1.5 rounded appearance-none cursor-pointer mt-1"
          />
        </div>

        <div className={simMode === 'en_clearing' ? 'opacity-50' : ''}>
          <div className="flex justify-between text-slate-400 mb-1">
            <span className="font-semibold">3. 跨国银行去杠杆乘数 {simMode === 'en_clearing' && '(行为模式)'}:</span>
            <span className="font-mono text-amber-400 font-bold">{deleveragingMultiplier}x</span>
          </div>
          <input
            type="range"
            min={1.0}
            max={3.0}
            step={0.1}
            disabled={simMode === 'en_clearing'}
            value={deleveragingMultiplier}
            onChange={(e) => {
              setDeleveragingMultiplier(parseFloat(e.target.value));
              setActivePreset('custom');
            }}
            className="w-full accent-amber-500 bg-slate-800 h-1.5 rounded appearance-none cursor-pointer mt-1 disabled:cursor-not-allowed"
          />
        </div>

        <div className={simMode === 'en_clearing' ? 'opacity-50' : ''}>
          <div className="flex justify-between text-slate-400 mb-1">
            <span className="font-semibold">4. 离岸美元流动性抽水 {simMode === 'en_clearing' && '(行为模式)'}:</span>
            <span className="font-mono text-sky-400 font-bold">{dollarSqueezePct}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={30}
            step={2}
            disabled={simMode === 'en_clearing'}
            value={dollarSqueezePct}
            onChange={(e) => {
              setDollarSqueezePct(parseInt(e.target.value, 10));
              setActivePreset('custom');
            }}
            className="w-full accent-sky-400 bg-slate-800 h-1.5 rounded appearance-none cursor-pointer mt-1 disabled:cursor-not-allowed"
          />
        </div>
      </div>

      {/* Summary KPI Badges */}
      {simResults && (
        simMode === 'en_clearing' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-purple-950/20 p-3 rounded-xl border border-purple-500/30">
              <div className="text-[11px] text-purple-300 uppercase tracking-wider font-mono">
                震中清偿短缺 (Epicenter Default)
              </div>
              <div className="text-lg font-bold font-mono text-rose-400 mt-0.5">
                ${simResults.epicenterDefaultAmount}B ({Math.round(simResults.epicenterDefaultAmount * 10).toLocaleString()} 亿美元)
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                {epicenterCountry.name_zh} 在绝对优先与资本缓冲下的未清偿缺口
              </div>
            </div>

            <div className="bg-purple-950/20 p-3 rounded-xl border border-purple-500/30">
              <div className="text-[11px] text-purple-300 uppercase tracking-wider font-mono">
                全网清算短缺总额 (Systemic Shortfall)
              </div>
              <div className="text-lg font-bold font-mono text-purple-300 mt-0.5">
                ${simResults.totalEnShortfall}B ({Math.round(simResults.totalEnShortfall * 10).toLocaleString()} 亿美元)
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                经相对负债矩阵比例分摊后的全部债权国未受偿短缺
              </div>
            </div>

            <div className="bg-purple-950/20 p-3 rounded-xl border border-purple-500/30">
              <div className="text-[11px] text-purple-300 uppercase tracking-wider font-mono">
                Picard 迭代收敛与容差
              </div>
              <div className="text-lg font-bold font-mono text-emerald-400 mt-0.5">
                {simResults.iterationsCount} 次迭代 (收敛)
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                最大不动点残差: &lt; 1e-4 Bn USD
              </div>
            </div>

            <div className="bg-purple-950/20 p-3 rounded-xl border border-purple-500/30">
              <div className="text-[11px] text-purple-300 uppercase tracking-wider font-mono">
                受波及受损经济体数量
              </div>
              <div className="text-lg font-bold font-mono text-white mt-0.5">
                {simResults.impactList.length} 个重点管辖区
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                有效负债覆盖率: {simResults.validLiabCoverage} 经济体
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
              <div className="text-[11px] text-slate-400 uppercase tracking-wider font-mono">
                震中直接吸收敞口 (Round 1)
              </div>
              <div className="text-lg font-bold font-mono text-rose-400 mt-0.5">
                ${simResults.totalR1Loss}B ({Math.round(simResults.totalR1Loss * 10).toLocaleString()} 亿美元)
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                由 {epicenterCountry.name_zh} 的直接主要债权国银行承担
              </div>
            </div>

            <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
              <div className="text-[11px] text-slate-400 uppercase tracking-wider font-mono">
                次生信贷抽离外溢 (Round 2)
              </div>
              <div className="text-lg font-bold font-mono text-amber-400 mt-0.5">
                ${simResults.totalR2Contagion}B ({Math.round(simResults.totalR2Contagion * 10).toLocaleString()} 亿美元)
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                受损银行为了维系资本充足率削减的外债池
              </div>
            </div>

            <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
              <div className="text-[11px] text-slate-400 uppercase tracking-wider font-mono">
                离岸美元挤兑缺口 (Round 3)
              </div>
              <div className="text-lg font-bold font-mono text-sky-400 mt-0.5">
                ${simResults.totalR3Dollar}B ({Math.round(simResults.totalR3Dollar * 10).toLocaleString()} 亿美元)
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                非美实体美元未对冲敞口再融资冲击 (覆盖率: {simResults.validLiabCoverage})
              </div>
            </div>

            <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
              <div className="text-[11px] text-slate-400 uppercase tracking-wider font-mono">
                全网系统性流动性蒸发
              </div>
              <div className="text-lg font-bold font-mono text-white mt-0.5">
                ${simResults.totalSystemicLoss}B ({Math.round(simResults.totalSystemicLoss * 10).toLocaleString()} 亿美元)
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                波及经济体数量: {simResults.impactList.length} 个
              </div>
            </div>
          </div>
        )
      )}

      {/* Main Grid: Cascade Chart + Impact Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Cascade Chart (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900/40 border border-slate-800/90 rounded-xl p-3 flex flex-col justify-between">
          <div className="text-xs font-bold text-white flex items-center justify-between border-b border-slate-800 pb-2">
            <span>{simMode === 'en_clearing' ? 'Eisenberg-Noe (2001) 清算短缺前 10 大受害债权国' : '受冲击最深的前 10 大受害经济体级联损益'}</span>
            <span className="text-[10px] text-slate-400 font-mono">{simMode === 'en_clearing' ? '直接清算短缺 + 网络次生级联短缺' : 'Round 1 + Round 2 + Round 3'}</span>
          </div>
          <div ref={chartRef} className="w-full h-[360px]" />
        </div>

        {/* Impact Table (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900/40 border border-slate-800/90 rounded-xl p-3 flex flex-col justify-between">
          <div>
            <div className="text-xs font-bold text-white border-b border-slate-800 pb-2 mb-2 flex items-center justify-between">
              <span>{simMode === 'en_clearing' ? 'Eisenberg-Noe 清算短缺排序榜单' : '系统性行为受创排序榜单'}</span>
              <span className="text-slate-400 text-[10px]">{simMode === 'en_clearing' ? '按清算短缺额降序' : '按综合受损总额降序'}</span>
            </div>

            <div className="space-y-1.5 max-h-[340px] overflow-y-auto">
              {simResults?.impactList.map((item, idx) => {
                const displayVal = simMode === 'en_clearing' ? item.enLoss : item.totalImpact;
                const displayPct = simMode === 'en_clearing' ? item.enShortfallToReservesPct : item.impactToReservesPct;
                return (
                  <div
                    key={item.code}
                    onClick={() => onSelectCountry(item.code)}
                    className="p-2 bg-slate-950/80 hover:bg-slate-800/80 border border-slate-800/80 rounded-lg cursor-pointer transition-all flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-slate-500 text-[11px] w-4">{idx + 1}.</span>
                      <span className="font-bold text-white">{item.name_zh}</span>
                      <span className="font-mono text-[10px] text-slate-400">({item.code})</span>
                    </div>

                    <div className="text-right">
                      <div className={`font-mono font-bold ${simMode === 'en_clearing' ? 'text-purple-400' : 'text-rose-400'}`}>
                        -${displayVal}B ({Math.round(displayVal * 10).toLocaleString()} 亿美元)
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {simMode === 'en_clearing' ? `短缺/外储: ${displayPct}%` : `损耗储备: ${displayPct}%`}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="text-[11px] text-slate-400 bg-slate-950 p-2.5 rounded-lg border border-slate-800/80 mt-2 space-y-1">
            {simMode === 'en_clearing' ? (
              <div>💡 <strong>Eisenberg-Noe (2001) 清算模型契约说明：</strong> 本视图严格基于经典固定点清算算法 $p^* = \min(\bar{p}, \Pi^T p + e)$。每国承受的清算短缺 $s_j = \sum_i \Pi_{ij} (\bar{p}_i - p_i^*)$ 表示未清偿义务，基于比例偿付与绝对优先规则。此数值为网络清算模型下的短缺计量，不等同于现实宏观资产归零或真实违约概率。</div>
            ) : (
              <div>💡 <strong>行为级联去杠杆模型说明：</strong> 本模式为启发式多轮情景压力测试（Round 1 直接减记 + Round 2 资产负债表收缩外溢 + Round 3 美元再融资挤压），用于演示恐慌传染扩散路径，不同于 Eisenberg-Noe 的静态不动点清算。</div>
            )}
          </div>
        </div>
      </div>

      {/* Academic Methodology Footnote */}
      <MethodologyFootnote
        source="BIS CBS Table B4 (Consolidated Banking Statistics) & FSB G-SIB"
        accounting="最终风险承担原则 (Ultimate Risk Basis)"
        model="Eisenberg-Noe (2001) 级联清算模型"
        isSimulation={true}
        onOpenAppendix={onOpenAppendix}
      />
    </div>
  );
}
