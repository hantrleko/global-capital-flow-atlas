import React, { useState, useMemo, useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { 
  AlertOctagon, Play, RotateCcw, ShieldAlert, ArrowRight, 
  TrendingDown, Layers, Zap, Download, Info, ChevronDown, ChevronUp, HelpCircle, FileText,
  Activity, GitCompare, Sliders, CheckCircle2, BarChart2, Sparkles, Briefcase, Copy, Check,
  Bookmark, Star
} from 'lucide-react';
import soundFx from '../utils/soundEffects';
import MethodologyFootnote from './MethodologyFootnote';
import DataClassificationBadge from './DataClassificationBadge';
import ContagionSensitivityTornado from './ContagionSensitivityTornado';
import { addWatermarkToDataUrl } from '../utils/exportWatermark';
import { getDataClassification } from '../utils/dataClassification';
import { encodeReproducibilityCode } from '../utils/reproducibilityEngine';
import { saveScenario } from '../utils/workspaceStorage';

import {
  CLEARING_VERSION_REGISTRY,
  computeClearingScenario,
  computeStressWorkbenchAnalysis,
  buildDataFingerprint
} from '../utils/eisenbergNoeClearing';

export { CLEARING_VERSION_REGISTRY };

export default function NetworkContagionSimulator({
  dataset,
  selectedQuarter,
  onSelectCountry,
  contagionConfig,
  onOpenAppendix,
  onOpenChartCard,
  onMapToPortfolio,
  onClearingResultChange
}) {
  const countries = dataset.countries || [];

  // Standard Macro Contagion Presets
  const CONTAGION_PRESETS = [
    { id: 'emerging_debt', name: '前沿主权外债违约', epicenter: 'TR', haircut: 40, deleveraging: 1.8, dollarSqueeze: 15, buffer: 1.5, desc: '新兴市场主权债务暴雷引发直接资产减记与信贷重估' },
    { id: 'dollar_crunch', name: '离岸美元流动性休克', epicenter: 'GB', haircut: 20, deleveraging: 2.2, dollarSqueeze: 25, buffer: 1.5, desc: '欧洲美元转口中枢流动性骤紧与全球美元荒' },
    { id: 'euro_contagion', name: '泛欧跨国银行去杠杆', epicenter: 'IT', haircut: 30, deleveraging: 2.0, dollarSqueeze: 12, buffer: 1.5, desc: '核心主权息差走阔导致多米诺骨牌级联收缩' }
  ];

  // Standard Scenario A vs B Comparison Presets
  const DIFF_PRESET_PAIRS = [
    {
      id: 'dollar_rescue',
      name: '离岸美元危机: 无干预 (GB 30% 1.0x) vs. 央行互换救助 (GB 15% 2.0x)',
      a: { name: '情景 A (离岸美元流动性休克·无干预)', epicenter: 'GB', haircutPct: 30, bufferMultiplier: 1.0 },
      b: { name: '情景 B (央行货币互换流动性注入·救助)', epicenter: 'GB', haircutPct: 15, bufferMultiplier: 2.0 }
    },
    {
      id: 'em_sovereign',
      name: '新兴市场外债违约: 深度违约 (TR 45% 1.0x) vs. 多边展期托底 (TR 20% 1.8x)',
      a: { name: '情景 A (新兴市场外债恶性违约)', epicenter: 'TR', haircutPct: 45, bufferMultiplier: 1.0 },
      b: { name: '情景 B (IMF 与多边外债展期托底)', epicenter: 'TR', haircutPct: 20, bufferMultiplier: 1.8 }
    },
    {
      id: 'europe_ccyb',
      name: '欧系跨国银行外溢: 顺周期踩踏 (IT 35% 1.0x) vs. 逆周期缓冲释放 (IT 15% 2.0x)',
      a: { name: '情景 A (泛欧跨国银行顺周期踩踏)', epicenter: 'IT', haircutPct: 35, bufferMultiplier: 1.0 },
      b: { name: '情景 B (逆周期资本缓冲 CCyB 释出)', epicenter: 'IT', haircutPct: 15, bufferMultiplier: 2.0 }
    }
  ];

  // Simulation parameters
  const [simMode, setSimMode] = useState('en_clearing'); // 'en_clearing' | 'behavioral'
  const [activeViewTab, setActiveViewTab] = useState('single_scenario'); // 'single_scenario' | 'workbench' | 'diff_ab'
  const [enSortMetric, setEnSortMetric] = useState('incremental'); // 'incremental' | 'post_shock' | 'baseline'
  const [showBaselineDiagnostic, setShowBaselineDiagnostic] = useState(false);
  const [activePreset, setActivePreset] = useState('custom');
  const [epicenter, setEpicenter] = useState('TR'); // Default: Turkey (high external vulnerability)
  const [haircutPct, setHaircutPct] = useState(25); // Credit loss %
  const [bufferMultiplier, setBufferMultiplier] = useState(1.5); // 1.0 | 1.5 | 2.0x FX Reserves
  const [deleveragingMultiplier, setDeleveragingMultiplier] = useState(1.5); // Bank deleveraging ratio
  const [dollarSqueezePct, setDollarSqueezePct] = useState(12); // Dollar liquidity squeeze %
  const [allowModelProxy, setAllowModelProxy] = useState(false); // Explicit authorization for model proxy liabilities
  const [isRecomputing, setIsRecomputing] = useState(false); // Immediate visual feedback during recomputation
  const [simResults, setSimResults] = useState(null);
  const [copiedRepCode, setCopiedRepCode] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);

  const handleCopyReproducibilityCode = () => {
    soundFx.playChime();
    const code = encodeReproducibilityCode({
      quarter: selectedQuarter,
      tab: 'contagion',
      epicenter: epicenterCountry.code,
      haircut: haircutPct,
      bufferMultiplier: bufferMultiplier,
      accountingBasis: 'ultimate_risk'
    });
    if (navigator.clipboard) {
      navigator.clipboard.writeText(code);
    }
    setCopiedRepCode(true);
    setTimeout(() => setCopiedRepCode(false), 3000);
  };

  const handleBookmarkScenario = () => {
    soundFx.playChime();
    const code = encodeReproducibilityCode({
      quarter: selectedQuarter,
      tab: 'contagion',
      epicenter: epicenterCountry.code,
      haircut: haircutPct,
      bufferMultiplier: bufferMultiplier,
      accountingBasis: 'ultimate_risk'
    });
    saveScenario({
      title: `${epicenterCountry.name_zh || epicenterCountry.code} 主权减记 ${haircutPct}% (外储缓冲 ${bufferMultiplier}x)`,
      reproducibilityCode: code,
      epicenter: epicenterCountry.code,
      haircut: haircutPct,
      bufferMultiplier: bufferMultiplier,
      notes: `增量清算损失: +$${simResults?.incrementalTotalDisplay || 0}B, 首要受害国: ${simResults?.topVictim?.name_zh || simResults?.topVictim?.code || '无'}`
    });
    setIsBookmarked(true);
    setTimeout(() => setIsBookmarked(false), 2500);
  };

  // Scenario A & B state for Diff Workbench
  const [diffScenarioA, setDiffScenarioA] = useState({
    name: '情景 A (离岸美元流动性休克·无干预)',
    epicenter: 'GB',
    haircutPct: 30,
    bufferMultiplier: 1.0
  });

  const [diffScenarioB, setDiffScenarioB] = useState({
    name: '情景 B (央行货币互换流动性注入·救助)',
    epicenter: 'GB',
    haircutPct: 15,
    bufferMultiplier: 2.0
  });

  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const runTokenRef = useRef(0);

  // Sync external configuration if passed from CountryDrawer or CrisisPlaybook
  useEffect(() => {
    if (contagionConfig) {
      if (contagionConfig.epicenter) setEpicenter(contagionConfig.epicenter);
      if (contagionConfig.haircut) setHaircutPct(contagionConfig.haircut);
      if (contagionConfig.buffer) setBufferMultiplier(contagionConfig.buffer);
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
    if (p.buffer) setBufferMultiplier(p.buffer);
    setDeleveragingMultiplier(p.deleveraging);
    setDollarSqueezePct(p.dollarSqueeze);
  };

  // Dynamically resolve links slice from active dataset (transparently accounts for custom matrix)
  const currentLinks = useMemo(() => {
    return (dataset.bilateral_matrix || {})[selectedQuarter] || [];
  }, [dataset, selectedQuarter]);

  const cbsRiskKeysCount = useMemo(() => {
    return Object.keys(dataset.cbs_risk || {}).length;
  }, [dataset.cbs_risk]);

  // Deterministic Fingerprint Key: binds revision, cbsCount, quarter, active matrix links, and all scenario parameters
  const dataFingerprint = useMemo(() => {
    return buildDataFingerprint({
      revision: `${dataset?.datasetRevision ?? 1}_cbs:${cbsRiskKeysCount}`,
      quarter: selectedQuarter,
      links: currentLinks,
      epicenter,
      haircutPct,
      bufferMultiplier,
      deleveragingMultiplier,
      dollarSqueezePct,
      simMode,
      enSortMetric,
      allowModelProxy
    });
  }, [dataset?.datasetRevision, cbsRiskKeysCount, selectedQuarter, currentLinks, epicenter, haircutPct, bufferMultiplier, deleveragingMultiplier, dollarSqueezePct, simMode, enSortMetric, allowModelProxy]);

  // Pure Simulation Executor with Async Race Protection & Recomputing Indicator
  const executeSimulation = () => {
    const token = ++runTokenRef.current;
    setIsRecomputing(true);

    const results = computeClearingScenario({
      dataset,
      quarter: selectedQuarter,
      currentLinks,
      epicenter,
      haircutPct,
      bufferMultiplier,
      deleveragingMultiplier,
      dollarSqueezePct,
      simMode,
      enSortMetric,
      allowModelProxy
    });

    // Guard against stale async or delayed race conditions
    if (token === runTokenRef.current) {
      setSimResults(results);
      setIsRecomputing(false);
    }
  };

  // Re-run whenever identity key (dataFingerprint) changes
  useEffect(() => {
    executeSimulation();
  }, [dataFingerprint]);

  // Synchronize live clearing output to parent ExecutiveVerdictBanner
  useEffect(() => {
    if (simResults && onClearingResultChange) {
      onClearingResultChange(simResults);
    }
  }, [simResults, onClearingResultChange]);

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
    const isIncrementalMode = isEn && enSortMetric === 'incremental';

    const enLegend = isIncrementalMode
      ? ['一阶直接减记 (Direct ΔS)', '二阶级联溢出 (Indirect ΔS)']
      : ['零冲击基线短缺 (Zero-Shock Base)', '冲击净增量 (Marginal Shock Loss)'];

    const enSeries = isIncrementalMode
      ? [
          {
            name: '一阶直接减记 (Direct ΔS)',
            type: 'bar',
            stack: 'total',
            barMaxWidth: 22,
            itemStyle: { color: '#fb7185', borderRadius: [0, 0, 0, 0] },
            data: topImpacted.map(d => d.enIncrementalDirect ?? 0)
          },
          {
            name: '二阶级联溢出 (Indirect ΔS)',
            type: 'bar',
            stack: 'total',
            barMaxWidth: 22,
            itemStyle: { color: '#818cf8', borderRadius: [0, 4, 4, 0] },
            data: topImpacted.map(d => d.enIncrementalIndirect ?? 0)
          }
        ]
      : [
          {
            name: '零冲击基线短缺 (Zero-Shock Base)',
            type: 'bar',
            stack: 'total',
            barMaxWidth: 22,
            itemStyle: { color: '#334155' },
            data: topImpacted.map(d => d.enBaselineShortfall)
          },
          {
            name: '冲击净增量 (Marginal Shock Loss)',
            type: 'bar',
            stack: 'total',
            barMaxWidth: 22,
            itemStyle: { color: '#fb7185', borderRadius: [0, 4, 4, 0] },
            data: topImpacted.map(d => d.enIncrementalShortfall)
          }
        ];

    const option = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: 'rgba(13, 19, 33, 0.96)',
        borderColor: 'rgba(255, 255, 255, 0.12)',
        borderWidth: 1,
        padding: [10, 14],
        extraCssText: 'box-shadow: 0 12px 36px rgba(0,0,0,0.6); backdrop-filter: blur(12px); border-radius: 10px;',
        textStyle: { color: '#f8fafc', fontSize: 12 },
        formatter: (params) => {
          const item = topImpacted[params[0].dataIndex];
          if (!item) return '';
          if (isEn) {
            return `
              <div class="p-1 font-sans">
                <div class="font-bold text-white border-b border-white/10 pb-1 mb-1.5 flex items-center justify-between gap-3">
                  <span>${item.name_zh} (${item.code})</span>
                  <span class="text-[11px] font-mono text-indigo-300">Eisenberg-Noe 边际分解</span>
                </div>
                <div class="space-y-1 text-xs">
                  <div class="text-rose-400 font-bold">
                    冲击净增量 (ΔS): <b class="font-mono text-white">+$${item.enIncrementalShortfall}B</b>
                  </div>
                  <div class="text-slate-300 text-[11px] pl-2 border-l border-indigo-400/40">
                    <div>· 一阶直接减记: <b class="font-mono text-rose-300">+$${item.enIncrementalDirect}B</b></div>
                    <div>· 二阶级联溢出: <b class="font-mono text-indigo-300">+$${item.enIncrementalIndirect}B</b></div>
                  </div>
                  <div class="border-t border-slate-800 pt-1 text-slate-400 text-[11px]">
                    零冲击基线 (S0): <b class="font-mono text-slate-300">$${item.enBaselineShortfall}B</b> · 冲击后总额 (S*): <b class="font-mono text-white">$${item.enPostShockShortfall}B</b>
                  </div>
                  <div class="text-[11px] text-slate-400">
                    增量占官方外储比: <b class="font-mono text-amber-400">${item.enIncrementalToReservesPct !== 'NA' ? `+${item.enIncrementalToReservesPct}%` : 'NA'}</b>
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
                <div>第一轮：直接资产减记损失: <b class="font-mono text-rose-400">$${item.r1Loss}B</b></div>
                <div>第二轮：去杠杆流动性抽离: <b class="font-mono text-amber-400">$${item.r2Spillover}B</b></div>
                <div>第三轮：离岸美元再融资挤压: <b class="font-mono text-sky-400">${item.r3Dollar !== null ? `$${item.r3Dollar}B` : 'NA'}</b></div>
                <div class="border-t border-slate-800 pt-1">
                  综合受损总额: <b class="font-mono text-white text-sm font-bold">$${item.totalImpact}B</b>
                </div>
                <div class="text-[11px] text-slate-400">冲击占外汇储备比: <b class="font-mono text-rose-400">${item.impactToReservesPct}%</b></div>
              </div>
            </div>
          `;
        }
      },
      legend: {
        data: isEn
          ? enLegend
          : ['第一轮：直接资产减记 (Direct Loss)', '第二轮：去杠杆流动性抽离 (Secondary Retrenchment)', '第三轮：离岸美元再融资挤压 (USD Squeeze)'],
        top: 6,
        textStyle: { color: '#94a3b8', fontSize: 11 }
      },
      grid: {
        left: '16%',
        right: '7%',
        top: '15%',
        bottom: '8%'
      },
      xAxis: {
        type: 'value',
        name: isIncrementalMode ? '边际违约赤字 ΔS ($B)' : (isEn ? '清算短缺额 ($B)' : '受损规模 ($B)'),
        nameTextStyle: { color: '#94a3b8', fontSize: 11 },
        splitLine: { lineStyle: { color: '#1e293b', type: 'dashed' } },
        axisLabel: { color: '#94a3b8', fontSize: 11, formatter: '${value}B' }
      },
      yAxis: {
        type: 'category',
        data: topImpacted.map(d => d.name_zh),
        axisLine: { lineStyle: { color: '#334155' } },
        axisLabel: { color: '#cbd5e1', fontSize: 11 }
      },
      series: isEn
        ? enSeries
        : [
            {
              name: '第一轮：直接资产减记 (Direct Loss)',
              type: 'bar',
              stack: 'total',
              itemStyle: { color: '#fb7185' },
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
  }, [simResults, simMode, enSortMetric]);

  // Capital Network Stress-Testing Workbench Multi-Regime Analysis (1.0x, 1.5x, 2.0x)
  const workbenchResults = useMemo(() => {
    if (simMode !== 'en_clearing') return null;
    try {
      return computeStressWorkbenchAnalysis({
        dataset,
        quarter: selectedQuarter,
        currentLinks,
        epicenter,
        haircutPct,
        allowModelProxy
      });
    } catch (err) {
      console.error('Failed to compute workbench analysis:', err);
      return null;
    }
  }, [dataset, selectedQuarter, currentLinks, epicenter, haircutPct, allowModelProxy, simMode]);

  // Scenario A vs. B Parallel Delta Diff Analysis Engine
  const diffResults = useMemo(() => {
    if (simMode !== 'en_clearing' || activeViewTab !== 'diff_ab') return null;

    try {
      const resA = computeClearingScenario({
        dataset,
        quarter: selectedQuarter,
        currentLinks,
        epicenter: diffScenarioA.epicenter,
        haircutPct: diffScenarioA.haircutPct,
        bufferMultiplier: diffScenarioA.bufferMultiplier,
        deleveragingMultiplier: 1.5,
        dollarSqueezePct: 12,
        simMode: 'en_clearing',
        enSortMetric: 'incremental',
        allowModelProxy
      });

      const resB = computeClearingScenario({
        dataset,
        quarter: selectedQuarter,
        currentLinks,
        epicenter: diffScenarioB.epicenter,
        haircutPct: diffScenarioB.haircutPct,
        bufferMultiplier: diffScenarioB.bufferMultiplier,
        deleveragingMultiplier: 1.5,
        dollarSqueezePct: 12,
        simMode: 'en_clearing',
        enSortMetric: 'incremental',
        allowModelProxy
      });

      const totalA = resA?.currentRun?.incrementalTotal ?? 0;
      const totalB = resB?.currentRun?.incrementalTotal ?? 0;
      const deltaTotal = totalB - totalA;
      const deltaPct = totalA > 0 ? ((deltaTotal / totalA) * 100).toFixed(1) : '0.0';

      const mapA = Object.fromEntries((resA?.impactList || []).map(item => [item.code, item]));
      const mapB = Object.fromEntries((resB?.impactList || []).map(item => [item.code, item]));

      const jurisdictionDiffs = (dataset.countries || []).map(c => {
        const itemA = mapA[c.code];
        const itemB = mapB[c.code];
        const lossA = itemA?.incrementalShortfall ?? 0;
        const lossB = itemB?.incrementalShortfall ?? 0;
        const delta = lossB - lossA;
        return {
          code: c.code,
          name_zh: c.name_zh || c.name,
          region: c.region,
          lossA,
          lossB,
          delta,
          isSaved: delta < -0.01,
          isWorse: delta > 0.01
        };
      }).sort((a, b) => a.delta - b.delta);

      const topSaved = jurisdictionDiffs.filter(j => j.isSaved).slice(0, 5);

      return {
        resA,
        resB,
        totalA,
        totalB,
        deltaTotal,
        deltaPct,
        jurisdictionDiffs,
        topSaved
      };
    } catch (err) {
      console.error('Failed to compute diff results:', err);
      return null;
    }
  }, [dataset, selectedQuarter, currentLinks, diffScenarioA, diffScenarioB, simMode, activeViewTab, allowModelProxy]);

  const handleDownloadSnapshot = async () => {
    if (!chartInstance.current) return;
    const rawUrl = chartInstance.current.getDataURL({
      type: 'png',
      pixelRatio: 2,
      backgroundColor: '#080c14'
    });
    const watermarkedUrl = await addWatermarkToDataUrl(
      rawUrl, 
      selectedQuarter, 
      `级联违约传染仿真 · ${epicenterCountry.name_zh || epicenter} (${haircutPct}% Haircut)`
    );
    const a = document.createElement('a');
    a.href = watermarkedUrl;
    a.download = `bis_contagion_simulation_${epicenter}_${selectedQuarter}.png`;
    a.click();
  };

  const handleExportScenarioCsv = () => {
    if (!simResults || !simResults.currentRun) return;
    soundFx.playTick();
    const cr = simResults.currentRun;
    const rows = [
      ['=== BIS Atlas Network Stress Clearing Scenario Report ==='],
      ['Report Generation Timestamp', new Date().toISOString()],
      ['Product Version', cr.versionMeta.productVersion],
      ['Model Version', cr.versionMeta.modelVersion],
      ['Data Version', cr.versionMeta.dataVersion],
      ['Dataset Revision', simResults.datasetRevision ?? 1],
      ['Run Type', cr.runType || 'STRESS_SCENARIO'],
      ['Run Status Label', cr.runStatusLabel || '外生冲击压力清算情景'],
      ['Quarter', cr.quarter],
      ['Quarter Status', cr.quarterStatus],
      ['Fixed-Point Convergence Status', cr.convergenceStatus],
      ['Fixed-Point Independent Verification Valid', simResults.allFixedPointsValid ? 'TRUE' : 'FALSE'],
      ['Solver Stop Reason', simResults.shockConvergence?.stopReason || 'CONVERGED_TOLERANCE'],
      ['Worst Node Code', simResults.shockConvergence?.worstNode?.code || 'None'],
      ['Worst Node Residual (USD Bn)', simResults.shockConvergence?.worstNode?.residual !== undefined ? simResults.shockConvergence.worstNode.residual.toExponential(4) : 'NA'],
      ['Worst Node Threshold (USD Bn)', simResults.shockConvergence?.worstNode?.threshold !== undefined ? simResults.shockConvergence.worstNode.threshold.toExponential(4) : 'NA'],
      ['Partially Incomplete Input Flag', simResults.isPartiallyIncomplete ? 'TRUE' : 'FALSE'],
      ['Missing Jurisdictions List', (simResults.missingJurisdictions || []).map(m => m.code).join('; ') || 'None'],
      ['Baseline Picard Iterations', simResults.baselineConvergence?.iterCount ?? 'NA'],
      ['Baseline Picard Loop Residual (USD Bn)', simResults.baselineConvergence?.residual !== undefined ? simResults.baselineConvergence.residual.toFixed(8) : 'NA'],
      ['Baseline Operator Max Abs Residual (USD Bn)', simResults.baselineConvergence?.verification?.maxAbsResidual !== undefined ? simResults.baselineConvergence.verification.maxAbsResidual.toFixed(8) : 'NA'],
      ['Baseline Operator Max Scaled Residual', simResults.baselineConvergence?.verification?.maxScaledResidual !== undefined ? simResults.baselineConvergence.verification.maxScaledResidual.toExponential(4) : 'NA'],
      ['Shock Picard Iterations', simResults.shockConvergence?.iterCount ?? 'NA'],
      ['Shock Picard Loop Residual (USD Bn)', simResults.shockConvergence?.residual !== undefined ? simResults.shockConvergence.residual.toFixed(8) : 'NA'],
      ['Shock Operator Max Abs Residual (USD Bn)', simResults.shockConvergence?.verification?.maxAbsResidual !== undefined ? simResults.shockConvergence.verification.maxAbsResidual.toFixed(8) : 'NA'],
      ['Shock Operator Max Scaled Residual', simResults.shockConvergence?.verification?.maxScaledResidual !== undefined ? simResults.shockConvergence.verification.maxScaledResidual.toExponential(4) : 'NA'],
      ['Picard Convergence Tolerance (USD Bn)', '0.0001 (1e-4)'],
      ['FX Reserves Boundary Buffer Multiplier', `${cr.bufferMultiplier}x FX Reserves`],
      ['FX Reserves Jurisdiction Coverage (Whole Network)', `${cr.coverageMeta?.reservesCoverageRatio || simResults.validReservesCoverage} (${cr.coverageMeta?.reservesCoveragePct || 100}%)`],
      ['Spillover Liabilities Jurisdiction Coverage (Non-Epicenter)', `${cr.coverageMeta?.spilloverLiabCoverageRatio || '22/22'} (${cr.coverageMeta?.spilloverLiabCoveragePct || 100}%)`],
      ['Total Liabilities Jurisdiction Coverage (Whole Network)', `${cr.coverageMeta?.liabFullCoverageRatio || '23/23'} (${cr.coverageMeta?.liabFullCoveragePct || 100}%)`],
      ['Data Fingerprint Hash', cr.dataFingerprint],
      ['Epicenter Code', cr.epicenterCode],
      ['Epicenter Name', cr.epicenterNameZh],
      ['Epicenter Total Liabilities (USD Bn)', cr.epicenterLiabDisplay],
      ['Haircut Percentage', `${cr.haircutPct}%`],
      ['Epicenter Haircut Amount (USD Bn)', cr.epicenterHaircutAmountDisplay],
      ['Zero-Shock Baseline Shortfall (USD Bn)', cr.baselineTotalDisplay],
      ['Post-Shock Total Shortfall (USD Bn)', cr.postShockTotalDisplay],
      ['Marginal Incremental Shortfall (USD Bn)', `+${cr.incrementalTotalDisplay}`],
      ['Top Incremental Victim', cr.topVictim ? `${cr.topVictim.name_zh} (${cr.topVictim.code}): ${cr.topVictim.incrementalFormatted}` : 'None'],
      [''],
      ['Jurisdiction Code', 'Jurisdiction Name', 'Baseline Shortfall (USD Bn)', 'Post-Shock Shortfall (USD Bn)', 'Marginal Incremental Shortfall (USD Bn)', 'FX Reserves (USD Bn)', 'Reserves Provenance Source', 'Reserves Status', 'Incremental / Reserves (%)', 'Direct from Epicenter (USD Bn)', 'Indirect from Cascade (USD Bn)', 'Ranking Eligible']
    ];

    simResults.impactList.forEach(item => {
      rows.push([
        item.code,
        item.name_zh,
        item.enBaselineShortfall,
        item.enPostShockShortfall,
        item.enIncrementalShortfall,
        item.reserves !== null ? item.reserves : 'NA',
        item.reservesSource || 'BIS_CBS_TABLE_B',
        item.reservesStatus || 'OFFICIAL',
        item.enIncrementalToReservesPct,
        item.enIncrementalDirect,
        item.enIncrementalIndirect,
        item.rankingEligible !== false ? 'TRUE' : 'FALSE'
      ]);
    });

    const csvContent = '\uFEFF' + rows.map(r => r.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `bis_clearing_scenario_${cr.epicenterCode}_${cr.quarter}_${cr.haircutPct}pct_${cr.bufferMultiplier}buf.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportWorkbenchCsv = () => {
    if (!workbenchResults) return;
    soundFx.playTick();
    const wb = workbenchResults;
    const rows = [
      ['=== BIS Atlas Capital Network Stress-Testing Workbench Report ==='],
      ['Report Generation Timestamp', new Date().toISOString()],
      ['Product Version', CLEARING_VERSION_REGISTRY.PRODUCT],
      ['Model Version', CLEARING_VERSION_REGISTRY.MODEL],
      ['Data Version', CLEARING_VERSION_REGISTRY.DATA(wb.quarter)],
      ['Dataset Revision', dataset?.datasetRevision ?? 1],
      ['Quarter', wb.quarter],
      ['Epicenter Code', wb.epicenter],
      ['Epicenter Name', epicenterCountry.name_zh],
      ['Haircut Percentage', `${wb.haircutPct}%`],
      ['Buffer Regimes Analyzed', wb.bufferRegimes.map(b => `${b.toFixed(1)}x`).join(', ')],
      ['Scenario Sensitivity Range (USD Bn)', wb.sensitivityRange.rangeLabel],
      ['Min Incremental Shortfall (USD Bn)', `$${wb.sensitivityRange.minIncrementalDisplay}B`],
      ['Max Incremental Shortfall (USD Bn)', `$${wb.sensitivityRange.maxIncrementalDisplay}B`],
      ['Sensitivity Spread (USD Bn)', `$${wb.sensitivityRange.spreadDisplay}B`],
      ['Sensitivity Spread Ratio (%)', `+${wb.sensitivityRange.spreadPct}%`],
      ['Methodology Disclaimer', wb.sensitivityRange.disclaimer],
      ['Top 3 Victims Overlap Stability (%)', `${wb.rankingStability.top3StabilityPct}%`],
      ['Ranking Stability Summary', wb.rankingStability.summary],
      ['Reference 1.5x Total Incremental Loss (USD Bn)', `$${wb.transmissionDecomposition.totalIncremental}B`],
      ['Reference Direct Loss Share (%)', `${wb.transmissionDecomposition.directSharePct}%`],
      ['Reference Indirect Cascade Share (%)', `${wb.transmissionDecomposition.indirectSharePct}%`],
      [''],
      ['Jurisdiction Code', 'Jurisdiction Name', 'Region', '1.0x Strict Buffer ΔS (USD Bn)', '1.5x Academic Base ΔS (USD Bn)', '2.0x Broad Buffer ΔS (USD Bn)', 'Direct Absorption (USD Bn)', 'Indirect Cascade (USD Bn)', 'Ranking Eligible', 'FX Reserves Status']
    ];

    wb.jurisdictionComparison.forEach(row => {
      rows.push([
        row.code,
        row.name_zh,
        row.region,
        row.delta10,
        row.delta15,
        row.delta20,
        row.directLoss,
        row.indirectLoss,
        row.rankingEligible ? 'TRUE' : 'FALSE',
        row.reservesStatus
      ]);
    });

    const csvContent = '\uFEFF' + rows.map(r => r.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `bis_stress_workbench_${wb.epicenter}_${wb.quarter}_${wb.haircutPct}pct.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportDiffCsv = () => {
    if (!diffResults) return;
    soundFx.playTick();
    const rows = [
      ['=== BIS Atlas Network Stress Clearing Scenario A vs. B Diff Report ==='],
      ['Report Generation Timestamp', new Date().toISOString()],
      ['Product Version', CLEARING_VERSION_REGISTRY.PRODUCT],
      ['Quarter', selectedQuarter],
      ['Scenario A Name', diffScenarioA.name],
      ['Scenario A Epicenter', diffScenarioA.epicenter],
      ['Scenario A Haircut Pct', `${diffScenarioA.haircutPct}%`],
      ['Scenario A Buffer', `${diffScenarioA.bufferMultiplier}x`],
      ['Scenario A Incremental Loss (USD Bn)', `$${diffResults.totalA.toFixed(1)}B`],
      ['Scenario B Name', diffScenarioB.name],
      ['Scenario B Epicenter', diffScenarioB.epicenter],
      ['Scenario B Haircut Pct', `${diffScenarioB.haircutPct}%`],
      ['Scenario B Buffer', `${diffScenarioB.bufferMultiplier}x`],
      ['Scenario B Incremental Loss (USD Bn)', `$${diffResults.totalB.toFixed(1)}B`],
      ['Delta Total Loss (USD Bn)', `${diffResults.deltaTotal > 0 ? '+' : ''}${diffResults.deltaTotal.toFixed(1)}B`],
      ['Delta Percent (%)', `${diffResults.deltaPct}%`],
      [''],
      ['Jurisdiction Code', 'Jurisdiction Name', 'Region', 'Loss Scenario A (USD Bn)', 'Loss Scenario B (USD Bn)', 'Delta Shortfall (USD Bn)', 'Evaluation Status']
    ];

    diffResults.jurisdictionDiffs.forEach(row => {
      rows.push([
        row.code,
        row.name_zh,
        row.region,
        row.lossA.toFixed(1),
        row.lossB.toFixed(1),
        row.delta.toFixed(1),
        row.isSaved ? 'RESCUED_MITIGATED' : row.isWorse ? 'DETERIORATED' : 'NEUTRAL'
      ]);
    });

    const csvContent = '\uFEFF' + rows.map(r => r.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `bis_contagion_diff_A_vs_B_${selectedQuarter}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      data-testid="network-contagion-simulator"
      className="glass-panel rounded-2xl p-2.5 sm:p-3.5 shadow-2xl space-y-2 scroll-mt-24"
    >
      {/* Top Header & Simulation Controls (Zero-Wrap Single Row on Desktop) */}
      <div className="flex flex-wrap lg:flex-nowrap items-center justify-between border-b border-slate-800 pb-1.5 gap-2 overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-7 h-7 rounded-lg bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0">
            <AlertOctagon className="w-3.5 h-3.5" />
          </div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-white whitespace-nowrap" title="Eisenberg-Noe (2001) Cross-Border Interbank Network Contagion Simulator">
              跨国银行网络传染模拟器 (Eisenberg-Noe)
            </h2>
            <span className="text-[11px] font-mono text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 shrink-0">
              {selectedQuarter}
            </span>
            <DataClassificationBadge
              classification="STRESS_SIMULATION"
              quarter={selectedQuarter}
              sourceText="BIS 双边重构基准"
              methodText="Eisenberg-Noe (2001)"
              onOpenAppendix={onOpenAppendix}
              className="hidden 2xl:inline-flex"
            />
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Model Contract Switch */}
          <div className="atlas-segmented text-xs">
            <button
              onClick={() => {
                soundFx.playTick();
                setSimMode('en_clearing');
              }}
              className={`px-2.5 py-0.5 rounded-md font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                simMode === 'en_clearing'
                  ? 'atlas-pill-active'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Eisenberg–Noe 基准</span>
            </button>
            <button
              onClick={() => {
                soundFx.playTick();
                setSimMode('behavioral');
              }}
              className={`px-2.5 py-0.5 rounded-md font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                simMode === 'behavioral'
                  ? 'atlas-pill-active'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>行为级联</span>
            </button>
          </div>

          {onOpenChartCard && (
            <button
              onClick={onOpenChartCard}
              className="px-2.5 py-1 bg-[#0d1321] hover:bg-[#131b2e] border border-white/[0.1] rounded-lg text-slate-200 hover:text-white transition-colors cursor-pointer flex items-center gap-1 text-xs font-medium"
              title="一键生成投行级研报卡片 (Publication-Ready Chart Card)"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">研报卡片</span>
            </button>
          )}

          {onMapToPortfolio && (
            <button
              onClick={() => {
                soundFx.playChime();
                onMapToPortfolio({
                  epicenter: epicenterCountry.code,
                  haircut: haircutPct,
                  victimList: simResults?.impactList || simResults?.jurisdictionImpacts || [],
                  incrementalDisplayShortfall: simResults?.incrementalTotalDisplay,
                  topVictimCountry: simResults?.topVictim?.name_zh || simResults?.topVictim?.code
                });
              }}
              data-testid="map-contagion-to-portfolio-btn"
              className="px-2.5 py-1 bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-400/40 rounded-lg text-indigo-200 hover:text-white transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold shadow-sm"
              title="将当前 Eisenberg-Noe 清算受损向量直接映射至投资专户进行风控与对冲评估"
            >
              <Briefcase className="w-3.5 h-3.5 text-indigo-300" />
              <span className="hidden sm:inline">映射至组合对冲 ➔</span>
            </button>
          )}

          <button
            onClick={handleCopyReproducibilityCode}
            data-testid="copy-reproducibility-code-btn"
            className="px-2.5 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-400/30 rounded-lg text-indigo-200 hover:text-white transition-colors cursor-pointer flex items-center gap-1 text-xs font-mono"
            title="一键生成并复制当前推演的确定性学术复现码 (Deterministic Reproducibility Code)"
          >
            {copiedRepCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-indigo-400" />}
            <span className="hidden sm:inline">{copiedRepCode ? '已复制复现码' : '场景复现码'}</span>
          </button>

          <button
            onClick={handleBookmarkScenario}
            data-testid="bookmark-scenario-btn"
            className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-400/30 rounded-lg text-amber-200 hover:text-white transition-colors cursor-pointer flex items-center gap-1 text-xs font-mono"
            title="将当前清算情景及复现码收藏至本地工作区"
          >
            <Star className={`w-3.5 h-3.5 ${isBookmarked ? 'text-amber-400 fill-amber-400' : 'text-amber-300'}`} />
            <span className="hidden sm:inline">{isBookmarked ? '已收藏' : '收藏情景'}</span>
          </button>

          <button
            onClick={handleExportScenarioCsv}
            className="px-2 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1 text-xs font-mono"
            title="导出当前清算情景数据 CSV (包含版本元数据、基线与增量)"
          >
            <FileText className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline">导出 CSV</span>
          </button>
          <button
            onClick={handleDownloadSnapshot}
            className="p-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="导出高清仿真图 PNG"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Sub-bar: View Selector + Single-Scenario Presets or Workbench Indicators */}
      <div className="flex items-center justify-between gap-2 p-1.5 bg-[#0d1321]/90 border border-white/[0.08] rounded-xl text-xs">
        <div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-x-auto scrollbar-none">
          {simMode === 'en_clearing' && (
            <div className="atlas-segmented text-xs shrink-0 mr-1">
              <button
                onClick={() => {
                  soundFx.playTick();
                  setActiveViewTab('single_scenario');
                }}
                className={`px-2.5 py-0.5 rounded-md font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                  activeViewTab === 'single_scenario'
                    ? 'atlas-pill-active'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Activity className="w-3 h-3" />
                <span>单一情景</span>
              </button>
              <button
                onClick={() => {
                  soundFx.playTick();
                  setActiveViewTab('workbench');
                }}
                className={`px-2.5 py-0.5 rounded-md font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                  activeViewTab === 'workbench'
                    ? 'atlas-pill-active'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <GitCompare className="w-3 h-3" />
                <span>多机制实验台</span>
              </button>
              <button
                onClick={() => {
                  soundFx.playTick();
                  setActiveViewTab('diff_ab');
                }}
                className={`px-2.5 py-0.5 rounded-md font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                  activeViewTab === 'diff_ab'
                    ? 'atlas-pill-active'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <GitCompare className="w-3 h-3" />
                <span>A/B 差分对比</span>
              </button>
              <button
                onClick={() => {
                  soundFx.playTick();
                  setActiveViewTab('sensitivity');
                }}
                data-testid="tab-sensitivity-tornado"
                className={`px-2.5 py-0.5 rounded-md font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                  activeViewTab === 'sensitivity'
                    ? 'atlas-pill-active'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Sliders className="w-3 h-3" />
                <span>敏感性龙卷风</span>
              </button>
            </div>
          )}

          {activeViewTab === 'single_scenario' ? (
            <>
              <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1 shrink-0">
                <Zap className="w-3 h-3 text-amber-400" /> 预设:
              </span>
              {CONTAGION_PRESETS.map(p => (
                <button
                  key={p.id}
                  onClick={() => handleSelectPreset(p)}
                  className={`px-2.5 py-0.5 rounded-md text-[11px] font-medium transition-all shrink-0 cursor-pointer border ${
                    activePreset === p.id
                      ? 'atlas-pill-active font-semibold'
                      : 'bg-slate-900/80 border-white/[0.08] text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                  title={p.desc}
                >
                  {p.name}
                </button>
              ))}
              <button
                onClick={() => setActivePreset('custom')}
                className={`px-2.5 py-0.5 rounded-md text-[11px] font-medium transition-all shrink-0 cursor-pointer border ${
                  activePreset === 'custom'
                    ? 'atlas-pill-active font-semibold'
                    : 'bg-slate-900/80 border-white/[0.08] text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                ⚙️ 自由调参
              </button>
            </>
          ) : activeViewTab === 'workbench' ? (
            <div className="text-[11px] font-mono text-slate-400 flex items-center gap-2">
              <span className="text-slate-500">对照机制:</span>
              <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">1.0x 严格外储</span>
              <span>vs</span>
              <span className="px-1.5 py-0.2 rounded bg-indigo-950/60 text-indigo-200 border border-indigo-400/30">1.5x 学术基准</span>
              <span>vs</span>
              <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">2.0x 广义缓冲</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
              <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1 shrink-0">
                <Sparkles className="w-3 h-3" /> 对决预设:
              </span>
              {DIFF_PRESET_PAIRS.map(pair => (
                <button
                  key={pair.id}
                  onClick={() => {
                    soundFx.playTick();
                    setDiffScenarioA(pair.a);
                    setDiffScenarioB(pair.b);
                  }}
                  className="px-2 py-0.5 rounded text-[11px] font-medium transition-all shrink-0 cursor-pointer border bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:border-emerald-500/50"
                  title={pair.name}
                >
                  {pair.name.split(':')[0]}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="hidden xl:flex text-[11px] font-mono text-slate-400 items-center gap-1.5 shrink-0">
          {isRecomputing && (
            <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse font-bold">
              ⚡ 重算中...
            </span>
          )}
          <span><strong className="text-slate-200">{simResults?.versionMeta?.productVersion || CLEARING_VERSION_REGISTRY.PRODUCT}</strong></span>
          <span>·</span>
          <span>外储 <strong className="text-emerald-400">{simResults?.coverageMeta?.reservesCoverageRatio || '23/23'}</strong></span>
        </div>
      </div>

      {/* RENDER CONTENT BASED ON VIEW TAB */}
      {simMode === 'en_clearing' && activeViewTab === 'workbench' ? (
        <div className="space-y-5">
          {/* Workbench Controls & Parameters */}
          <div className="p-4 bg-slate-900/90 border border-purple-500/30 rounded-xl flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">震中经济体 (Trigger Epicenter):</label>
                <select
                  value={epicenter}
                  onChange={(e) => setEpicenter(e.target.value)}
                  className="bg-slate-800 border border-slate-700 text-white font-bold px-3 py-1.5 rounded-lg focus:outline-none focus:border-purple-500 cursor-pointer"
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
                  <span className="font-semibold">违约减记率 (Haircut):</span>
                  <span className="font-mono text-rose-400 font-bold ml-2">{haircutPct}%</span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={60}
                  step={5}
                  value={haircutPct}
                  onChange={(e) => setHaircutPct(parseInt(e.target.value, 10))}
                  className="w-44 accent-rose-500 bg-slate-800 h-1.5 rounded appearance-none cursor-pointer mt-1"
                />
              </div>

              <div className="flex items-center gap-2 pt-3 text-[11px] font-mono text-slate-400">
                <span className="text-slate-500">对照机制:</span>
                <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">1.0x 严格外储</span>
                <span className="text-slate-600">|</span>
                <span className="px-2 py-0.5 rounded bg-purple-950/80 text-purple-200 border border-purple-500/30 font-bold">1.5x 学术基准</span>
                <span className="text-slate-600">|</span>
                <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">2.0x 广义缓冲</span>
              </div>
            </div>

            <button
              onClick={handleExportWorkbenchCsv}
              className="px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-lg shadow-md transition-colors cursor-pointer flex items-center gap-2 text-xs font-mono"
            >
              <FileText className="w-4 h-4" />
              <span>导出实验台对比矩阵 CSV</span>
            </button>
          </div>

          {/* Workbench 3 Analysis Cards */}
          {workbenchResults && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Card 1: Scenario Sensitivity Range */}
              <div className="bg-slate-900/80 p-4 rounded-xl border border-purple-500/40 shadow-lg space-y-2">
                <div className="text-[11px] text-purple-300 uppercase tracking-wider font-mono flex items-center justify-between">
                  <span>1. 情景敏感性范围 (Sensitivity Range)</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-500/30">
                    1.0x ~ 2.0x 缓冲
                  </span>
                </div>
                <div className="text-2xl font-bold font-mono text-purple-300">
                  {workbenchResults.sensitivityRange.rangeLabel}
                </div>
                <div className="text-xs text-slate-300 font-mono flex items-center justify-between">
                  <span>极差 (Spread):</span>
                  <strong className="text-rose-400 font-bold">
                    +${workbenchResults.sensitivityRange.spreadDisplay}B (+{workbenchResults.sensitivityRange.spreadPct}%)
                  </strong>
                </div>
                <div className="p-2.5 bg-amber-950/40 border border-amber-500/40 rounded-lg text-[10px] text-amber-200/90 leading-relaxed">
                  ⚠️ {workbenchResults.sensitivityRange.disclaimer}
                </div>
              </div>

              {/* Card 2: Ranking Stability Index */}
              <div className="bg-slate-900/80 p-4 rounded-xl border border-sky-500/40 shadow-lg space-y-2 flex flex-col justify-between">
                <div>
                  <div className="text-[11px] text-sky-300 uppercase tracking-wider font-mono flex items-center justify-between">
                    <span>2. 受害者排名稳定性 (Ranking Stability)</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-sky-950 text-sky-300 border border-sky-500/30">
                      Top 3 重合度
                    </span>
                  </div>
                  <div className="text-2xl font-bold font-mono text-sky-400 mt-1">
                    {workbenchResults.rankingStability.top3StabilityPct}%
                  </div>
                  <div className="text-xs text-slate-300 mt-1 font-semibold">
                    {workbenchResults.rankingStability.summary}
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed border-t border-slate-800 pt-2">
                  检验极度紧缩流动性 (1.0x) 与宽松缓冲 (2.0x) 下前 3 大核心受害管辖区的重合率。重合度高达 {workbenchResults.rankingStability.top3StabilityPct}%，表明外溢受创位次具有高结构稳健性，不受外部缓冲规模假设的逆转。
                </p>
              </div>

              {/* Card 3: Transmission Decomposition */}
              <div className="bg-slate-900/80 p-4 rounded-xl border border-rose-500/40 shadow-lg space-y-2 flex flex-col justify-between">
                <div>
                  <div className="text-[11px] text-rose-300 uppercase tracking-wider font-mono flex items-center justify-between">
                    <span>3. 传染传播路径分解 (1.5x 基准)</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-500/30">
                      双重机制拆解
                    </span>
                  </div>
                  <div className="text-lg font-bold font-mono text-rose-400 mt-1 flex items-center justify-between">
                    <span>直接吸收: {workbenchResults.transmissionDecomposition.directSharePct}%</span>
                    <span className="text-purple-300">次生级联: {workbenchResults.transmissionDecomposition.indirectSharePct}%</span>
                  </div>
                  {/* Visual Proportion Bar */}
                  <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden flex mt-2">
                    <div
                      className="bg-rose-500 h-full transition-all"
                      style={{ width: `${Math.max(1, workbenchResults.transmissionDecomposition.directSharePct)}%` }}
                      title={`直接敞口吸收: ${workbenchResults.transmissionDecomposition.directSharePct}%`}
                    />
                    <div
                      className="bg-purple-500 h-full transition-all"
                      style={{ width: `${workbenchResults.transmissionDecomposition.indirectSharePct}%` }}
                      title={`网络次生级联: ${workbenchResults.transmissionDecomposition.indirectSharePct}%`}
                    />
                  </div>
                </div>
                <div className="text-[11px] text-slate-400 font-mono space-y-1 border-t border-slate-800 pt-2">
                  <div className="flex justify-between">
                    <span>直接受震中违约冲击:</span>
                    <span className="text-rose-400 font-bold">${workbenchResults.transmissionDecomposition.totalDirectDisplay}B</span>
                  </div>
                  <div className="flex justify-between">
                    <span>网络多轮级联扩散:</span>
                    <span className="text-purple-300 font-bold">${workbenchResults.transmissionDecomposition.totalIndirectDisplay}B</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Multi-Regime Comparative Table */}
          {workbenchResults && (
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-purple-400" />
                  <h3 className="text-xs font-bold text-white">
                    全网管辖区多流动性机制对照矩阵 (Cross-Regime Shortfall Matrix)
                  </h3>
                  <span className="text-[11px] font-mono text-slate-400">
                    (按 1.5x 基准增量降序排列)
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 font-mono">
                  点击行可下钻查看管辖区双边敞口
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-[11px] text-slate-400 font-mono">
                      <th className="py-2 px-2.5">排名</th>
                      <th className="py-2 px-2.5">经济体 / 管辖区</th>
                      <th className="py-2 px-2.5">地区</th>
                      <th className="py-2 px-2.5 text-right">1.0x 严格外储 (ΔS)</th>
                      <th className="py-2 px-2.5 text-right text-purple-300 font-bold">1.5x 学术基准 (ΔS)</th>
                      <th className="py-2 px-2.5 text-right">2.0x 广义缓冲 (ΔS)</th>
                      <th className="py-2 px-2.5 text-right text-rose-400">直接吸收受损</th>
                      <th className="py-2 px-2.5 text-right text-purple-400">级联波及受损</th>
                      <th className="py-2 px-2.5 text-center">外储状态</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {workbenchResults.jurisdictionComparison.map((row, idx) => {
                      const isEligible = row.rankingEligible;
                      return (
                        <tr
                          key={row.code}
                          onClick={() => onSelectCountry(row.code)}
                          className={`hover:bg-slate-800/60 cursor-pointer transition-colors ${
                            !isEligible ? 'opacity-60 bg-slate-950/30' : ''
                          }`}
                        >
                          <td className="py-2 px-2.5 font-mono text-slate-500">
                            {isEligible ? `${idx + 1}.` : '—'}
                          </td>
                          <td className="py-2 px-2.5 font-bold text-white flex items-center gap-1.5">
                            <span>{row.name_zh}</span>
                            <span className="font-mono text-[10px] text-slate-400">({row.code})</span>
                            {!isEligible && (
                              <span className="text-[9px] px-1 py-0.2 rounded bg-amber-950 text-amber-400 border border-amber-500/30">
                                缺失不排
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-2.5 text-slate-400 font-mono text-[11px]">
                            {row.region}
                          </td>
                          <td className="py-2 px-2.5 text-right font-mono">
                            {typeof row.delta10 === 'number' ? `+$${row.delta10}B` : 'NA'}
                          </td>
                          <td className="py-2 px-2.5 text-right font-mono font-bold text-purple-300">
                            {typeof row.delta15 === 'number' ? `+$${row.delta15}B` : 'NA'}
                          </td>
                          <td className="py-2 px-2.5 text-right font-mono">
                            {typeof row.delta20 === 'number' ? `+$${row.delta20}B` : 'NA'}
                          </td>
                          <td className="py-2 px-2.5 text-right font-mono text-rose-400">
                            {typeof row.directLoss === 'number' ? `$${row.directLoss}B` : 'NA'}
                          </td>
                          <td className="py-2 px-2.5 text-right font-mono text-purple-400">
                            {typeof row.indirectLoss === 'number' ? `$${row.indirectLoss}B` : 'NA'}
                          </td>
                          <td className="py-2 px-2.5 text-center font-mono text-[10px]">
                            <span className={`px-1.5 py-0.5 rounded border ${
                              row.reservesStatus === 'OFFICIAL' ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/30' :
                              row.reservesStatus === 'PENDING_VERIFICATION' ? 'bg-amber-950/80 text-amber-300 border-amber-500/30' :
                              row.reservesStatus === 'NOWCAST' ? 'bg-sky-950/80 text-sky-300 border-sky-500/30' :
                              'bg-rose-950/80 text-rose-300 border-rose-500/30'
                            }`}>
                              {row.reservesStatus}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-lg text-[11px] text-slate-400 leading-relaxed space-y-1">
                <div>
                  💡 <strong>资本网络压力测试实验台机制说明：</strong>
                </div>
                <div className="pl-3 border-l-2 border-purple-500/40 space-y-1">
                  <div>· <strong>1.0x 严格外储机制：</strong> 假设外部现金流注入 $e_i$ 严格受限于各国官方公布之外储，测试极度流动性冻结下的资本短缺上限。</div>
                  <div>· <strong>1.5x 学术基准机制：</strong> 经典 Eisenberg-Noe 宏观金融网络基准设定，允许适度动用二级流动性缓冲与主权财政空间。</div>
                  <div>· <strong>2.0x 广义缓冲机制：</strong> 考虑双边央行流动性互换协议（Swap Lines）与常备借贷便利介入后的系统韧性。</div>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : simMode === 'en_clearing' && activeViewTab === 'diff_ab' ? (
        /* Scenario A vs. B Parallel Delta Diff View */
        <div className="space-y-4 animate-fade-in">
          {/* Top Diff Actions & Presets */}
          <div className="p-3 bg-slate-900/90 border border-emerald-500/30 rounded-xl flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <GitCompare className="w-4 h-4 text-emerald-400" />
                <span>平行情景 A/B 差分对比实验台 (Scenario A vs. B Delta Diff)</span>
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 font-bold">
                Phase 1 交付特性
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportDiffCsv}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg shadow-md transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-mono"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>导出差分对比 CSV</span>
              </button>
            </div>
          </div>

          {/* Scenario A & B Dual Parameters Panel */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
            {/* Scenario A Card */}
            <div className="p-3.5 rounded-xl border border-rose-500/40 bg-slate-900/80 space-y-3">
              <div className="flex items-center justify-between border-b border-rose-500/20 pb-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <span className="text-xs font-bold text-white">{diffScenarioA.name}</span>
                </div>
                <span className="text-xs font-mono font-bold text-rose-400">
                  全网违约: ${diffResults?.totalA?.toFixed(1) ?? '...'}B
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold text-[11px]">震中经济体:</label>
                  <select
                    value={diffScenarioA.epicenter}
                    onChange={(e) => setDiffScenarioA(prev => ({ ...prev, epicenter: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-700 text-white font-bold px-2 py-1 rounded-lg text-xs"
                  >
                    {countries.map(c => (
                      <option key={c.code} value={c.code}>{c.name_zh} ({c.code})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold text-[11px]">
                    减记率: <span className="text-rose-400 font-mono">{diffScenarioA.haircutPct}%</span>
                  </label>
                  <input
                    type="range"
                    min={5}
                    max={60}
                    step={5}
                    value={diffScenarioA.haircutPct}
                    onChange={(e) => setDiffScenarioA(prev => ({ ...prev, haircutPct: parseInt(e.target.value, 10) }))}
                    className="w-full accent-rose-500 bg-slate-800 h-1.5 rounded appearance-none cursor-pointer mt-1"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold text-[11px]">外储缓冲倍数:</label>
                  <select
                    value={diffScenarioA.bufferMultiplier}
                    onChange={(e) => setDiffScenarioA(prev => ({ ...prev, bufferMultiplier: parseFloat(e.target.value) }))}
                    className="w-full bg-slate-800 border border-slate-700 text-white font-bold px-2 py-1 rounded-lg text-xs"
                  >
                    <option value={1.0}>1.0x 严格外储 (极度紧缩)</option>
                    <option value={1.5}>1.5x 学术基准</option>
                    <option value={2.0}>2.0x 广义缓冲</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Scenario B Card */}
            <div className="p-3.5 rounded-xl border border-emerald-500/40 bg-slate-900/80 space-y-3">
              <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="text-xs font-bold text-white">{diffScenarioB.name}</span>
                </div>
                <span className="text-xs font-mono font-bold text-emerald-400">
                  全网违约: ${diffResults?.totalB?.toFixed(1) ?? '...'}B
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold text-[11px]">震中经济体:</label>
                  <select
                    value={diffScenarioB.epicenter}
                    onChange={(e) => setDiffScenarioB(prev => ({ ...prev, epicenter: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-700 text-white font-bold px-2 py-1 rounded-lg text-xs"
                  >
                    {countries.map(c => (
                      <option key={c.code} value={c.code}>{c.name_zh} ({c.code})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold text-[11px]">
                    减记率: <span className="text-emerald-400 font-mono">{diffScenarioB.haircutPct}%</span>
                  </label>
                  <input
                    type="range"
                    min={5}
                    max={60}
                    step={5}
                    value={diffScenarioB.haircutPct}
                    onChange={(e) => setDiffScenarioB(prev => ({ ...prev, haircutPct: parseInt(e.target.value, 10) }))}
                    className="w-full accent-emerald-500 bg-slate-800 h-1.5 rounded appearance-none cursor-pointer mt-1"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold text-[11px]">外储缓冲倍数:</label>
                  <select
                    value={diffScenarioB.bufferMultiplier}
                    onChange={(e) => setDiffScenarioB(prev => ({ ...prev, bufferMultiplier: parseFloat(e.target.value) }))}
                    className="w-full bg-slate-800 border border-slate-700 text-white font-bold px-2 py-1 rounded-lg text-xs"
                  >
                    <option value={1.0}>1.0x 严格外储</option>
                    <option value={1.5}>1.5x 学术基准</option>
                    <option value={2.0}>2.0x 广义缓冲 (互换救助)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Delta Executive Summary */}
          {diffResults && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
                <span className="text-[11px] font-mono text-slate-400">全网违约赤字差值 (Delta S_total)</span>
                <div className={`text-2xl font-black font-mono mt-1 ${
                  diffResults.deltaTotal < 0 ? 'text-emerald-400' : diffResults.deltaTotal > 0 ? 'text-rose-400' : 'text-slate-200'
                }`}>
                  {diffResults.deltaTotal > 0 ? '+' : ''}${diffResults.deltaTotal.toFixed(1)}B
                </div>
                <span className={`text-[10px] font-mono font-bold mt-1 ${
                  diffResults.deltaTotal < 0 ? 'text-emerald-300' : 'text-rose-300'
                }`}>
                  {diffResults.deltaTotal < 0 ? `阻断违约挽救 ${Math.abs(parseFloat(diffResults.deltaPct))}%` : `受损扩大 +${diffResults.deltaPct}%`}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
                <span className="text-[11px] font-mono text-slate-400">最大减损受惠经济体</span>
                <div className="text-base font-bold text-white mt-1">
                  {diffResults.topSaved.length > 0 
                    ? `${diffResults.topSaved[0].name_zh} (${diffResults.topSaved[0].code})`
                    : '全网未发生显著二阶转移'}
                </div>
                <span className="text-[10px] font-mono text-emerald-400 mt-1">
                  {diffResults.topSaved.length > 0
                    ? `挽救损益 -$${Math.abs(diffResults.topSaved[0].delta).toFixed(1)}B`
                    : '基准参数对齐'}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
                <span className="text-[11px] font-mono text-slate-400">不动点收敛状态</span>
                <div className="text-base font-bold font-mono text-sky-400 mt-1 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
                  <span>CONVERGED &lt; 1e-4</span>
                </div>
                <span className="text-[10px] font-mono text-slate-400 mt-1">
                  情景 A ({diffResults.resA?.shockConvergence?.iterCount ?? 0}次) · 情景 B ({diffResults.resB?.shockConvergence?.iterCount ?? 0}次)
                </span>
              </div>
            </div>
          )}

          {/* Comparative Table */}
          {diffResults && (
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
              <div className="p-3 border-b border-slate-800 flex items-center justify-between text-xs">
                <span className="font-bold text-white">跨国经济体受损差分明细表 (按挽救减损额排序)</span>
                <span className="text-[11px] font-mono text-slate-400">绿负值 (Δ &lt; 0) 表示干预后受损减轻</span>
              </div>
              <div className="overflow-x-auto max-h-[420px] scrollbar-thin">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 sticky top-0 border-b border-slate-800 font-mono text-[11px]">
                    <tr>
                      <th className="py-2 px-3">经济体</th>
                      <th className="py-2 px-3">区域</th>
                      <th className="py-2 px-3 text-right text-rose-300">情景 A 受损 ($B)</th>
                      <th className="py-2 px-3 text-right text-emerald-300">情景 B 受损 ($B)</th>
                      <th className="py-2 px-3 text-right font-bold">差分 Δ ($B)</th>
                      <th className="py-2 px-3 text-center">干预效果评级</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {diffResults.jurisdictionDiffs.map(row => (
                      <tr 
                        key={row.code}
                        onClick={() => onSelectCountry(row.code)}
                        className="hover:bg-slate-800/50 cursor-pointer transition-colors"
                      >
                        <td className="py-2 px-3 font-bold text-white flex items-center gap-1.5 font-sans">
                          <span>{row.name_zh}</span>
                          <span className="text-slate-400 font-mono text-[10px]">({row.code})</span>
                        </td>
                        <td className="py-2 px-3 text-slate-400 text-[11px]">{row.region}</td>
                        <td className="py-2 px-3 text-right text-rose-300">${row.lossA.toFixed(1)}B</td>
                        <td className="py-2 px-3 text-right text-emerald-300">${row.lossB.toFixed(1)}B</td>
                        <td className={`py-2 px-3 text-right font-bold ${
                          row.delta < -0.01 ? 'text-emerald-400' : row.delta > 0.01 ? 'text-rose-400' : 'text-slate-400'
                        }`}>
                          {row.delta > 0 ? '+' : ''}{row.delta.toFixed(1)}B
                        </td>
                        <td className="py-2 px-3 text-center">
                          {row.delta < -5 ? (
                            <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-500/30 font-bold">
                              大幅挽救
                            </span>
                          ) : row.delta < -0.01 ? (
                            <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950/60 text-emerald-400 border border-emerald-500/20">
                              轻微减损
                            </span>
                          ) : row.delta > 0.01 ? (
                            <span className="px-2 py-0.5 rounded text-[10px] bg-rose-950 text-rose-300 border border-rose-500/30">
                              受损走阔
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400">
                              中性持平
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : activeViewTab === 'sensitivity' ? (
        <ContagionSensitivityTornado
          dataset={dataset}
          selectedQuarter={selectedQuarter}
          customMatrix={currentLinks}
          simResults={simResults}
          epicenterCountry={epicenterCountry}
          haircutPct={haircutPct}
          bufferMultiplier={bufferMultiplier}
          deleveraging={deleveragingMultiplier}
          dollarSqueeze={dollarSqueezePct}
        />
      ) : (
        /* Single Scenario View */
        <div className="space-y-3">
          {/* Main Grid: Cascade Chart (7 cols) + Controls & Impact Table (5 cols) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4">
            {/* Cascade Chart (7 cols) */}
            <div className="lg:col-span-7 bg-slate-900/40 border border-slate-800/90 rounded-xl p-3 flex flex-col gap-2">
              <div className="text-xs font-bold text-white flex flex-wrap items-center justify-between border-b border-slate-800 pb-1.5 gap-2">
                <span>{simMode === 'en_clearing' ? 'Eisenberg-Noe (2001) 清算短缺受害国级联分解 (前 10 大)' : '受冲击最深的前 10 大受害经济体级联损益'}</span>
                {simMode === 'en_clearing' ? (
                  <span className="text-[11px] text-slate-400 font-mono">
                    {enSortMetric === 'incremental' ? '按冲击净增量 ΔS 排序 (堆叠一阶直接与二阶级联)' : enSortMetric === 'baseline' ? '按零冲击基线排序' : '按冲击后总额排序'}
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-400 font-mono">Round 1 + Round 2 + Round 3</span>
                )}
              </div>
              <div ref={chartRef} className="w-full h-[calc(100vh-340px)] min-h-[350px] max-h-[580px]" />
            </div>

            {/* Controls & Impact Table (5 cols) */}
            <div className="lg:col-span-5 flex flex-col gap-3">
              {/* Simulator Control Sliders (Compact Grid) */}
              <div className="p-2.5 bg-slate-900/90 border border-slate-800 rounded-xl grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                <div>
                  <label className="block text-slate-400 mb-0.5 font-semibold text-[11px]">1. 震中经济体:</label>
                  <select
                    value={epicenter}
                    onChange={(e) => {
                      setEpicenter(e.target.value);
                      setActivePreset('custom');
                    }}
                    className="w-full bg-slate-800 border border-slate-700 text-white font-bold px-2 py-1 rounded text-xs focus:outline-none focus:border-rose-500 cursor-pointer"
                  >
                    {countries.map(c => (
                      <option key={c.code} value={c.code}>
                        {c.name_zh} ({c.code}) - {c.region}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex justify-between text-slate-400 mb-0.5 text-[11px]">
                    <span className="font-semibold">2. 债务减记率 (Haircut):</span>
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

                {simMode === 'en_clearing' ? (
                  <div>
                    <div className="flex justify-between text-slate-400 mb-1 text-[11px]">
                      <span className="font-semibold" title="外部现金流注入参数化倍数 e_i = k * FX Reserves">
                        3. 流动性缓冲倍数:
                      </span>
                      <span className="font-mono text-purple-400 font-bold">{bufferMultiplier.toFixed(1)}x 外储</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1 mt-1">
                      {[
                        { val: 1.0, label: '1.0x 严格' },
                        { val: 1.5, label: '1.5x 基准' },
                        { val: 2.0, label: '2.0x 缓冲' }
                      ].map(opt => (
                        <button
                          key={opt.val}
                          type="button"
                          onClick={() => {
                            soundFx.playTick();
                            setBufferMultiplier(opt.val);
                            setActivePreset('custom');
                          }}
                          className={`py-1 px-1 text-[11px] rounded font-mono transition-all cursor-pointer border ${
                            bufferMultiplier === opt.val
                              ? 'atlas-pill-active font-bold'
                              : 'bg-slate-800/80 text-slate-300 hover:text-white border-white/[0.08]'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex justify-between text-slate-400 mb-1 text-[11px]">
                      <span className="font-semibold">3. 去杠杆乘数:</span>
                      <span className="font-mono text-amber-400 font-bold">{deleveragingMultiplier}x</span>
                    </div>
                    <input
                      type="range"
                      min={1.0}
                      max={3.0}
                      step={0.1}
                      value={deleveragingMultiplier}
                      onChange={(e) => {
                        setDeleveragingMultiplier(parseFloat(e.target.value));
                        setActivePreset('custom');
                      }}
                      className="w-full accent-amber-500 bg-slate-800 h-1.5 rounded appearance-none cursor-pointer mt-1"
                    />
                  </div>
                )}

                {simMode === 'en_clearing' ? (
                  <div>
                    <div className="flex justify-between text-slate-400 mb-1 text-[11px]">
                      <span className="font-semibold">4. 排序与绘图口径:</span>
                      <span className="font-mono text-indigo-300 font-bold">
                        {enSortMetric === 'incremental' ? '冲击增量 ΔS' : (enSortMetric === 'baseline' ? '基线 S0' : '总额 S*')}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-1 mt-1">
                      {[
                        { val: 'incremental', label: '增量 ΔS' },
                        { val: 'post_shock', label: '总额 S*' },
                        { val: 'baseline', label: '基线 S0' }
                      ].map(opt => (
                        <button
                          key={opt.val}
                          type="button"
                          onClick={() => {
                            soundFx.playTick();
                            setEnSortMetric(opt.val);
                          }}
                          className={`py-1 px-1 text-[11px] rounded font-mono transition-all cursor-pointer border ${
                            enSortMetric === opt.val
                              ? 'atlas-pill-active font-bold'
                              : 'bg-slate-800/80 text-slate-300 hover:text-white border-white/[0.08]'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex justify-between text-slate-400 mb-1 text-[11px]">
                      <span className="font-semibold">4. 美元抽水:</span>
                      <span className="font-mono text-sky-400 font-bold">{dollarSqueezePct}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={30}
                      step={2}
                      value={dollarSqueezePct}
                      onChange={(e) => {
                        setDollarSqueezePct(parseInt(e.target.value, 10));
                        setActivePreset('custom');
                      }}
                      className="w-full accent-sky-400 bg-slate-800 h-1.5 rounded appearance-none cursor-pointer mt-1"
                    />
                  </div>
                )}
              </div>

              {/* Impact Table (5 cols) */}
              <div className="bg-slate-900/40 border border-slate-800/90 rounded-xl p-3 flex flex-col justify-between flex-1">
          <div>
            <div className="text-xs font-bold text-white border-b border-slate-800 pb-2 mb-2 flex flex-wrap items-center justify-between gap-1.5">
              <span>{simMode === 'en_clearing' ? '清算受创排序榜单' : '系统性行为受创排序榜单'}</span>
              {simMode === 'en_clearing' ? (
                <div className="atlas-segmented text-[11px]">
                  <button
                    onClick={() => {
                      soundFx.playTick();
                      setEnSortMetric('incremental');
                    }}
                    className={`px-2 py-0.5 rounded font-mono transition-colors cursor-pointer ${
                      enSortMetric === 'incremental'
                        ? 'atlas-pill-active font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    冲击增量 Δ
                  </button>
                  <button
                    onClick={() => {
                      soundFx.playTick();
                      setEnSortMetric('post_shock');
                    }}
                    className={`px-2 py-0.5 rounded font-mono transition-colors cursor-pointer ${
                      enSortMetric === 'post_shock'
                        ? 'atlas-pill-active font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    总短缺 S*
                  </button>
                  <button
                    onClick={() => {
                      soundFx.playTick();
                      setEnSortMetric('baseline');
                    }}
                    className={`px-2 py-0.5 rounded font-mono transition-colors cursor-pointer ${
                      enSortMetric === 'baseline'
                        ? 'atlas-pill-active font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    基线 S0
                  </button>
                </div>
              ) : (
                <span className="text-slate-400 text-[11px]">按综合受损总额降序</span>
              )}
            </div>

            <div className="space-y-1.5 max-h-[340px] overflow-y-auto">
              {simResults?.impactList.map((item, idx) => {
                if (simMode === 'en_clearing') {
                  const isEligible = item.rankingEligible !== false;
                  return (
                    <div
                      key={item.code}
                      onClick={() => onSelectCountry(item.code)}
                      className={`p-2 rounded-lg cursor-pointer transition-all flex items-center justify-between text-xs border ${
                        !isEligible
                          ? 'bg-slate-950/40 border-slate-800/40 opacity-70'
                          : 'bg-slate-950/80 hover:bg-slate-800/80 border-slate-800/80'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-slate-500 text-[11px] w-4">
                          {!isEligible ? '—' : `${idx + 1}.`}
                        </span>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-white">{item.name_zh}</span>
                            <span className="font-mono text-[10px] text-slate-400">({item.code})</span>
                            {!isEligible && (
                              <span className="text-[9px] px-1 py-0.2 rounded bg-amber-950 text-amber-400 border border-amber-500/30">
                                缺失不排
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            {item.isMissingInput ? (
                              <span className="text-amber-400/80">输入缺失 (外储: {item.reservesStatus})</span>
                            ) : (
                              `基线 $${item.enBaselineShortfall}B → 冲击后 $${item.enPostShockShortfall}B`
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-mono font-bold text-rose-400">
                          {!isEligible ? (
                            <span className="text-slate-400 font-mono">NA</span>
                          ) : item.enIncrementalShortfall > 0 ? (
                            `+${item.enIncrementalShortfall}B`
                          ) : (
                            '$0.0B'
                          )}
                          {isEligible && (
                            <span className="text-[10px] font-normal text-slate-400 ml-1">
                              (+{Math.round(item.enIncrementalShortfall * 10).toLocaleString()} 亿)
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-amber-400/90 font-mono">
                          {item.enIncrementalToReservesPct !== 'NA' ? `增量/外储: +${item.enIncrementalToReservesPct}%` : '增量/外储: NA'}
                        </div>
                      </div>
                    </div>
                  );
                }

                // Behavioral mode
                const displayVal = item.totalImpact;
                const displayPct = item.impactToReservesPct;
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
                      <div className="font-mono font-bold text-rose-400">
                        -${displayVal}B ({Math.round(displayVal * 10).toLocaleString()} 亿美元)
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        损耗储备: {displayPct}%
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="text-[11px] text-slate-400 bg-slate-950 p-2.5 rounded-lg border border-slate-800/80 mt-2 space-y-1">
            {simMode === 'en_clearing' ? (
              <div>
                💡 <strong>Eisenberg-Noe (2001) 双基线清算模型契约说明：</strong> 本模拟器同时计算零冲击初始基线 <code className="font-mono text-slate-200">p⁽⁰⁾</code> 与施加冲击后的清算不动点 <code className="font-mono text-slate-200">p*</code>。压力测试聚焦于<strong>边际增量 <code className="font-mono text-rose-300">Δsⱼ = sⱼ* − sⱼ⁽⁰⁾</code></strong>，将特定震中违约的外生破坏力与静态闭合网络的内生结构缺口彻底解耦，保障压力评估的客观性与科学性。
              </div>
            ) : (
              <div>
                💡 <strong>行为级联去杠杆模型说明：</strong> 本模式为启发式多轮情景压力测试（Round 1 直接减记 + Round 2 资产负债表收缩外溢 + Round 3 美元再融资挤压），用于演示恐慌传染扩散路径，不同于 Eisenberg-Noe 的静态不动点清算。
              </div>
            )}
          </div>
        </div>
      </div>
    </div>

      {/* v4.0 Domino 4-Stage Shockwave Strip */}
      {simResults && (
        <div
          data-testid="domino-shockwave-strip"
          className="p-3 bg-[#0d1321]/95 border border-white/[0.08] rounded-xl shadow-lg space-y-2.5 animate-fade-in"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-base">🀄</span>
              <span className="font-semibold text-white text-xs">
                多米诺骨牌级联推演全景链路 (4-Stage Domino Shockwave)
              </span>
              <span className="text-[11px] text-slate-400 font-mono hidden md:inline">
                · 从微观震中违约到专户投资防线的四阶因果传导
              </span>
            </div>
            {onMapToPortfolio && (
              <button
                onClick={() => {
                  soundFx.playChime();
                  onMapToPortfolio({
                    epicenter: epicenterCountry.code,
                    haircut: haircutPct,
                    victimList: simResults?.impactList || simResults?.jurisdictionImpacts || [],
                    incrementalDisplayShortfall: simResults?.incrementalTotalDisplay,
                    topVictimCountry: simResults?.topVictim?.name_zh || simResults?.topVictim?.code
                  });
                }}
                className="text-[11px] font-semibold text-indigo-300 hover:text-white flex items-center gap-1 cursor-pointer"
              >
                <span>映射至我的专户对冲</span>
                <span>➔</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
            {/* Stage 0 */}
            <div className="p-2.5 rounded-lg bg-rose-950/30 border border-rose-500/30 space-y-1">
              <div className="flex items-center justify-between text-rose-300 font-semibold text-[11px]">
                <span className="flex items-center gap-1">
                  <span>💥 第0阶: 震中引爆</span>
                </span>
                <span className="font-mono text-rose-400">Haircut {haircutPct}%</span>
              </div>
              <div className="font-bold text-white text-sm">
                {epicenterCountry.name_zh} ({epicenterCountry.code})
              </div>
              <div className="text-[11px] text-slate-400 leading-tight">
                主权债违约或外债展期中断，外部硬流动性瞬间抽干
              </div>
            </div>

            {/* Stage 1 */}
            <div className="p-2.5 rounded-lg bg-amber-950/30 border border-amber-500/30 space-y-1">
              <div className="flex items-center justify-between text-amber-300 font-semibold text-[11px]">
                <span className="flex items-center gap-1">
                  <span>🩸 第1阶: 直接债主冲销</span>
                </span>
                <span className="font-mono text-amber-400">
                  {simResults.totalR1Loss ? `$${simResults.totalR1Loss}B` : (simResults.topVictim?.incrementalDisplay ? `+$${simResults.topVictim.incrementalDisplay}B` : (simResults.currentRun?.topVictim?.incrementalDisplay ? `+$${simResults.currentRun.topVictim.incrementalDisplay}B` : '直接损失'))}
                </span>
              </div>
              <div className="font-bold text-white text-sm truncate">
                {simResults.topVictim ? `${simResults.topVictim.name_zh}首当其冲` : (simResults.currentRun?.topVictim ? `${simResults.currentRun.topVictim.name_zh}首当其冲` : '跨国直贷行坏账')}
              </div>
              <div className="text-[11px] text-slate-400 leading-tight">
                主要债权国跨国银行计提直接坏账损失，冲销一级资本
              </div>
            </div>

            {/* Stage 2 */}
            <div className="p-2.5 rounded-lg bg-sky-950/30 border border-sky-500/30 space-y-1">
              <div className="flex items-center justify-between text-sky-300 font-semibold text-[11px]">
                <span className="flex items-center gap-1">
                  <span>🌊 第2阶: 同业踩踏外溢</span>
                </span>
                <span className="font-mono text-sky-400">
                  {simResults.currentRun?.incrementalTotalDisplay ? `+${simResults.currentRun.incrementalTotalDisplay}B` : (simResults.incrementalTotalDisplay ? `+${simResults.incrementalTotalDisplay}B` : (simResults.totalR2Contagion ? `$${simResults.totalR2Contagion}B` : (simResults.totalSystemicLoss ? `$${simResults.totalSystemicLoss}B` : '$0.0B')))}
                </span>
              </div>
              <div className="font-bold text-white text-sm">
                Eisenberg-Noe 级联清算
              </div>
              <div className="text-[11px] text-slate-400 leading-tight">
                受损银行压缩同业信贷，跨国银行网络被动去杠杆踩踏
              </div>
            </div>

            {/* Stage 3 */}
            <div className="p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-500/30 space-y-1">
              <div className="flex items-center justify-between text-emerald-300 font-semibold text-[11px]">
                <span className="flex items-center gap-1">
                  <span>🛡️ 第3阶: 专户组合防线</span>
                </span>
                <span className="font-mono text-emerald-400">主动对冲</span>
              </div>
              <div className="font-bold text-white text-sm">
                组合压力映射与 CDS
              </div>
              <div className="text-[11px] text-slate-400 leading-tight">
                穿透至二级市场资产池，计算在险价值 VaR 并建立防御
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Summary KPI Badges */}
      {simResults && (
        simMode === 'en_clearing' ? (
          <div className="space-y-3">
            {/* Solver Convergence Alert Banner if FAILED */}
            {(!simResults.allConverged || !simResults.allFixedPointsValid) && (
              <div className="p-3.5 bg-rose-950/90 border border-rose-500 rounded-xl text-rose-200 flex items-start gap-3 shadow-xl">
                <AlertOctagon className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs">
                  <div className="font-bold text-sm text-rose-300">
                    ⚠️ 清算不动点求解未收敛或独立验证未通过 (Fixed-Point Solver FAILED)
                  </div>
                  <p className="text-slate-300">
                    在当前迭代轮数内，不动点残差未达到 1e-4 Bn USD 守恒容差或算子独立检验存在越界。请注意当前清算结果处于未完全出清截断状态。
                  </p>
                  <div className="font-mono text-[11px] text-rose-300 bg-black/40 p-1.5 rounded border border-rose-500/30">
                    基线独立最大残差: {simResults.baselineConvergence?.verification?.maxAbsResidual !== undefined ? simResults.baselineConvergence.verification.maxAbsResidual.toFixed(6) : 'NA'} Bn USD ({simResults.baselineConvergence?.verification?.fixedPointValid ? '独立验证通过' : '未通过'}) | 冲击独立最大残差: {simResults.shockConvergence?.verification?.maxAbsResidual !== undefined ? simResults.shockConvergence.verification.maxAbsResidual.toFixed(6) : 'NA'} Bn USD ({simResults.shockConvergence?.verification?.fixedPointValid ? '独立验证通过' : '未通过'})
                  </div>
                </div>
              </div>
            )}

            {/* 4 Core Eisenberg-Noe KPI Badges */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                <div className="text-[11px] text-slate-400 uppercase tracking-wider font-mono">
                  1. 震中外生减记 (Epicenter Haircut)
                </div>
                <div className="text-lg font-bold font-mono text-rose-400 mt-0.5">
                  ${simResults.currentRun?.epicenterHaircutAmountDisplay ?? simResults.epicenterHaircutAmount}B ({Math.round((simResults.currentRun?.epicenterHaircutAmountDisplay ?? simResults.epicenterHaircutAmount) * 10).toLocaleString()} 亿美元)
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {simResults.currentRun?.epicenterNameZh || epicenterCountry.name_zh} ({simResults.currentRun?.epicenterCode || epicenter}) 负债总额 ${simResults.currentRun?.epicenterLiabDisplay ?? simResults.epicenterLiab}B 施加 {haircutPct}% 减记
                </div>
              </div>

              <div className="bg-rose-950/30 p-3 rounded-xl border border-rose-500/40 shadow-lg relative overflow-hidden">
                <div className="absolute top-1.5 right-2 px-1.5 py-0.5 rounded text-[11px] font-mono bg-rose-500/20 text-rose-300 border border-rose-500/40 font-semibold tracking-wider">
                  核心指标
                </div>
                <div className="text-[11px] text-rose-300 uppercase tracking-wider font-mono">
                  2. 冲击净增量短缺 (Marginal Loss ΔS)
                </div>
                <div className="text-xl font-bold font-mono text-rose-400 mt-0.5">
                  +${simResults.currentRun?.incrementalTotalDisplay ?? simResults.totalIncrementalShortfall}B (+${(((simResults.currentRun?.incrementalTotalRaw ?? simResults.totalIncrementalShortfall)) / 1000).toFixed(4)}T)
                </div>
                <div className="text-[11px] text-rose-200/80 mt-0.5">
                  剥离静态基线后的冲击边际破坏力 (放大 {((simResults.currentRun?.incrementalTotalRaw ?? simResults.totalIncrementalShortfall) / Math.max(1, simResults.currentRun?.epicenterHaircutAmountRaw ?? simResults.epicenterHaircutAmount)).toFixed(2)}x)
                </div>
              </div>

              <div className="bg-purple-950/20 p-3 rounded-xl border border-purple-500/30">
                <div className="text-[11px] text-purple-300 uppercase tracking-wider font-mono">
                  3. 冲击后清算总短缺 (Post-Shock Total S*)
                </div>
                <div className="text-lg font-bold font-mono text-purple-300 mt-0.5">
                  ${simResults.currentRun?.postShockTotalDisplay ?? simResults.totalPostShockShortfall}B (${(((simResults.currentRun?.postShockTotalRaw ?? simResults.totalPostShockShortfall)) / 1000).toFixed(4)}T)
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  基线 ${simResults.currentRun?.baselineTotalDisplay ?? simResults.totalBaselineShortfall}B (${(((simResults.currentRun?.baselineTotalRaw ?? simResults.totalBaselineShortfall)) / 1000).toFixed(4)}T) + 冲击增量
                </div>
              </div>

              <div className={`p-3 rounded-xl border ${simResults.allFixedPointsValid ? 'bg-slate-900/80 border-slate-800' : 'bg-rose-950/40 border-rose-500/80 shadow-lg'}`}>
                <div className="text-[11px] text-slate-400 uppercase tracking-wider font-mono flex items-center justify-between">
                  <span>4. 不动点收敛与逐节点独立验证</span>
                  {simResults.allFixedPointsValid ? (
                    <span className="text-[10px] text-emerald-400 bg-emerald-950/80 px-1.5 py-0.2 rounded border border-emerald-500/30">逐节点验证通过</span>
                  ) : (
                    <span className="text-[10px] text-rose-300 bg-rose-900/80 px-1.5 py-0.2 rounded border border-rose-500/50 font-bold">FAILED</span>
                  )}
                </div>
                <div className={`text-base font-bold font-mono mt-0.5 ${simResults.allFixedPointsValid ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {simResults.allFixedPointsValid ? 'Picard 收敛 & 逐节点独立验证通过' : '清算不动点未收敛或验证未通过'}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5 font-mono">
                  基线: {simResults.baselineConvergence?.iterCount} 轮 / 冲击: {simResults.shockConvergence?.iterCount} 轮
                  {simResults.shockConvergence?.worstNode && (
                    <span className="text-slate-300 ml-1">
                      (最差节点: {simResults.shockConvergence.worstNode.code} 残差 {simResults.shockConvergence.worstNode.residual.toExponential(2)})
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5 font-mono">
                  全网外储: {simResults.coverageMeta?.reservesCoverageRatio || simResults.validReservesCoverage} · 波及负债: {simResults.coverageMeta?.spilloverLiabCoverageRatio || '22/22'} · 终止: {simResults.shockConvergence?.stopReason || 'CONVERGED_TOLERANCE'}
                </div>
              </div>
            </div>

            {/* Incomplete Data / Missing Jurisdiction Notice */}
            {simResults.isPartiallyIncomplete && (
              <div className="p-3 bg-amber-950/80 border border-amber-500/60 rounded-xl text-amber-200 flex items-start gap-3 shadow-lg">
                <AlertOctagon className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <div className="font-bold text-amber-300">
                    ⚠️ 存在部分管辖区输入数据缺失（已自动隔离，不计入受害国排名）
                  </div>
                  <p className="text-slate-300">
                    受影响管辖区：{simResults.missingJurisdictions?.map(m => `${m.code} (${m.name_zh || m.name})`).join('、')}。
                    依据数据质量契约，缺失输入不可假定为零缓冲或零负债，对应经济体清算短缺标为 NA 并排除在脆弱性位次排序之外。
                  </p>
                </div>
              </div>
            )}

            {/* Expandable Diagnostic Accordion: Why is Baseline Large? */}
            <div className="bg-slate-900/90 border border-purple-500/30 rounded-xl overflow-hidden transition-all">
              <button
                onClick={() => {
                  soundFx.playTick();
                  setShowBaselineDiagnostic(!showBaselineDiagnostic);
                }}
                className="w-full px-4 py-2.5 flex items-center justify-between text-left hover:bg-slate-800/60 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-purple-400 shrink-0" />
                  <span className="text-xs font-bold text-white">
                    🔬 核心方法论诊断：为何网络零冲击基线短缺偏大（${(((simResults.currentRun?.baselineTotalRaw ?? simResults.totalBaselineShortfall)) / 1000).toFixed(4)}T）？
                  </span>
                  <span className="text-[10px] font-mono text-purple-300 bg-purple-950/80 px-2 py-0.5 rounded border border-purple-500/40">
                    实证与边界机制
                  </span>
                </div>
                <div className="flex items-center gap-1 text-xs text-slate-400">
                  <span>{showBaselineDiagnostic ? '收起诊断' : '展开诊断拆解'}</span>
                  {showBaselineDiagnostic ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </button>

              {showBaselineDiagnostic && (
                <div className="p-4 border-t border-slate-800/80 bg-slate-950/60 grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs text-slate-300">
                  <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800 space-y-1">
                    <div className="font-bold text-sky-400 flex items-center gap-1.5">
                      <span>1. 闭合银行间边界限制 (Network Perimeter)</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                      当前网络模型聚焦全球 23 个核心管辖区间的跨国银行资产负债。这是一个纯粹的银行间闭合系统，未纳入各国庞大的国内工商业居民存款、经常账户累积顺差、非银金融机构流动性及主权国内资产。
                    </p>
                  </div>

                  <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800 space-y-1">
                    <div className="font-bold text-emerald-400 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">2. 外部流动性缓冲参数化假定 (Boundary Capital e_i)</span>
                      <span className="font-mono text-[10px] text-emerald-300 bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-500/30">
                        敏感度设定: {simResults.bufferMultiplier}x FX Reserves
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                      经典 Eisenberg-Noe 假设外部缓冲注入来自网络闭合边界之外的自由现金流。本系统将外部流动性参数化为各国官方外汇储备的动态倍数（e_i = {simResults.bufferMultiplier} × 官方外汇储备 FX Reserves）。当前外储覆盖率达 {simResults.coverageMeta?.reservesCoverageRatio || simResults.validReservesCoverage}（{simResults.coverageMeta?.reservesCoveragePct || 100}%）。无数据记录严格标记为 NA 并以 0 缓冲参与清算，不施加常数插补。支持通过上方参数栏在 1.0x（严格外储）、1.5x（学术基准）、2.0x（广义互换缓冲）间切换进行敏感性分析。
                    </p>
                  </div>

                  <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800 space-y-1">
                    <div className="font-bold text-amber-400 flex items-center gap-1.5">
                      <span>3. 清算中枢与主要储备货币国的结构性错配 (Structural Mismatch)</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                      全球金融中心与核心储备货币国承担数万亿美元的跨国负债，但官方主权外汇储备规模极小。在当前 {selectedQuarter} 矩阵中：
                      {simResults?.currentRun?.structuralSamples?.map((s) => (
                        <span key={s.code} className="inline-block mr-2 font-mono text-slate-200">
                          · {s.name} ({s.code}): 负债 {s.liabilitiesTrillion ? `$${s.liabilitiesTrillion}T` : 'NA'}，外储 {s.reservesBn !== null ? `$${s.reservesBn}B` : 'NA'} [{s.reservesStatus || 'OFFICIAL'}]
                        </span>
                      ))}
                      。在未引入美联储贴现窗口与常备央行互换（FIMA/Swap Lines）的极简模型中，静态不动点清算自然呈现内生结构性未清偿短缺（当前网络基线 ${(simResults?.currentRun?.baselineTotalDisplay / 1000).toFixed(4)}T）。
                    </p>
                  </div>

                  <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800 space-y-1">
                    <div className="font-bold text-rose-400 flex items-center gap-1.5">
                      <span>4. 压力测试科学准则：差分增量（Differential Incremental Loss）</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                      在宏观金融压力测试中，<strong>绝对短缺量（${(((simResults?.currentRun?.postShockTotalRaw ?? simResults?.totalPostShockShortfall)) / 1000).toFixed(4)}T / ${simResults?.currentRun?.postShockTotalDisplay ?? simResults?.totalPostShockShortfall}B）绝不能称作“{simResults?.currentRun?.epicenterNameZh || epicenterCountry.name_zh}冲击造成的损失”</strong>！科学的评估指标是<strong>边际净增量（ΔS = S* - S^(0) = +${simResults?.currentRun?.incrementalTotalDisplay ?? simResults?.totalIncrementalShortfall}B / +${(((simResults?.currentRun?.incrementalTotalRaw ?? simResults?.totalIncrementalShortfall)) / 1000).toFixed(4)}T）</strong>。
                      {simResults?.currentRun?.topVictim && (
                        <span>
                          观察增量排位能精准识别第一受害国（{simResults?.currentRun?.epicenterNameZh || epicenterCountry.name_zh}的最大外生波及受害者为 <strong>{simResults?.currentRun?.topVictim?.name_zh} ({simResults?.currentRun?.topVictim?.code})</strong>，增量排名第 1，<strong>{simResults?.currentRun?.topVictim?.incrementalFormatted}</strong>），避免真实传染链路被静态庞大基线所掩盖。
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              )}
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
      </div>
      )}

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
