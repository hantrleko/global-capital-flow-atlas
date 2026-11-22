import React, { useState, useMemo, useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import {
  Briefcase, TrendingDown, ShieldAlert, Sparkles,
  Copy, Check, Plus, Trash2, ChevronRight, ShieldCheck,
  Sliders, ArrowUpRight, Award, Zap, History, Save, FolderOpen, Presentation, AlertTriangle,
  Upload, FileText, X
} from 'lucide-react';
import soundFx from '../utils/soundEffects';
import { useAnimatedNumber } from '../utils/useAnimatedValue';
import ConceptTooltip from './ConceptTooltip';
import {
  PORTFOLIO_PRESETS,
  MACRO_STRESS_SCENARIOS,
  ASSET_CLASS_PROFILES,
  computePortfolioStressOverlay
} from '../utils/portfolioStressEngine';
import {
  SAMPLE_GRANULAR_CSV,
  parseAndValidateHoldingsCsv,
  computeGranularBondStress
} from '../utils/csvHoldingsEngine';
import {
  saveCustomPortfolio,
  getWorkspace
} from '../utils/workspaceStorage';
import {
  computePortfolioSafetyCushion,
  computeHistoricalCrisisReplay
} from '../utils/reverseStressSolver';
import {
  solveOptimalHedgePackage,
  EXPANDED_HEDGE_CATALOG
} from '../utils/hedgeOptimizer';
import {
  runPortfolioMonteCarloSimulation,
  computeLossAttributionWaterfall,
  computeMultiPortfolioArena
} from '../utils/v7QuantEngine';

export default function PortfolioStressOverlay({
  dataset,
  selectedQuarter = '2026Q1',
  selectedCurrency = 'USD',
  onOpenChartCard,
  onOpenContagion,
  onOpenPitchDeck,
  liveClearingShockMap = null,
  onPortfolioResultChange,
  externalPortfolio = null
}) {
  const [selectedPresetId, setSelectedPresetId] = useState('global_macro_balanced');
  const [selectedScenarioId, setSelectedScenarioId] = useState(() => {
    return (liveClearingShockMap && Object.keys(liveClearingShockMap).length > 0) ? 'live_custom_contagion' : 'tr_sovereign_crisis';
  });
  const [stressMultiplier, setStressMultiplier] = useState(1.0);
  const [enableLookThrough, setEnableLookThrough] = useState(true);
  const [activeHedges, setActiveHedges] = useState(['cds_hedge']);
  const [chartMode, setChartMode] = useState('loss_delta'); // 'loss_delta' | 'full_aum'
  const [activeSubTab, setActiveSubTab] = useState('attribution'); // 'attribution' | 'reverse_stress' | 'crisis_backtest'
  const [targetLossLimitMn, setTargetLossLimitMn] = useState(50.0);
  const [copiedMemo, setCopiedMemo] = useState(false);
  const [savedToWorkspace, setSavedToWorkspace] = useState(false);
  const [isOptimizerModalOpen, setIsOptimizerModalOpen] = useState(false);
  const [hedgeBudgetBps, setHedgeBudgetBps] = useState(100);
  const [isCsvImporterOpen, setIsCsvImporterOpen] = useState(false);
  const [csvInputText, setCsvInputText] = useState('');
  const [csvUploadFileName, setCsvUploadFileName] = useState('');

  // Custom portfolio state
  const [customPositions, setCustomPositions] = useState([
    { id: 'c-1', name: '美股科技成长 (US Tech Equities)', country: 'US', assetClass: 'equities', weight: 0.35, amountMn: 175.0 },
    { id: 'c-2', name: '德国主权债券 (German Bunds)', country: 'DE', assetClass: 'sovereign_debt', weight: 0.25, amountMn: 125.0 },
    { id: 'c-3', name: '英国金融同业 (UK Interbank)', country: 'GB', assetClass: 'interbank_loans', weight: 0.15, amountMn: 75.0 },
    { id: 'c-4', name: '土耳其美元外债 (Turkey External Debt)', country: 'TR', assetClass: 'sovereign_debt', weight: 0.15, amountMn: 75.0 },
    { id: 'c-5', name: '开曼群岛离岸资产 (Cayman SPV / Fund)', country: 'KY', assetClass: 'equities', weight: 0.10, amountMn: 50.0 }
  ]);
  const [customAum, setCustomAum] = useState(500.0);

  // Sync external portfolio if passed from workspace
  useEffect(() => {
    if (externalPortfolio) {
      if (externalPortfolio.positions) {
        setCustomPositions(externalPortfolio.positions);
      }
      if (externalPortfolio.baseAumUsdMn) {
        setCustomAum(externalPortfolio.baseAumUsdMn);
      }
      setSelectedPresetId('custom');
    }
  }, [externalPortfolio]);

  const chartContainerRef = useRef(null);
  const chartInstanceRef = useRef(null);

  // Active Portfolio definition
  const activePortfolio = useMemo(() => {
    if (selectedPresetId === 'custom') {
      return {
        id: 'custom',
        name: externalPortfolio?.name || '自定义机构自营组合 (Custom Institutional Portfolio)',
        desc: '由用户自定义配置各主权国家敞口、资产类别与 AUM 规模',
        baseAumUsdMn: customAum,
        currency: selectedCurrency,
        positions: customPositions
      };
    }
    return PORTFOLIO_PRESETS.find(p => p.id === selectedPresetId) || PORTFOLIO_PRESETS[0];
  }, [selectedPresetId, customPositions, customAum, selectedCurrency, externalPortfolio]);

  // Granular CSV Holdings Live Parsing & Duration/OAS Bond Stress Preview (150bps shock)
  const parsedCsvHoldings = useMemo(() => {
    if (!csvInputText.trim()) {
      return {
        positions: [],
        errors: [],
        totalAumMn: 0,
        weightedDurationYears: 0,
        weightedOasBps: 0,
        count: 0
      };
    }
    return parseAndValidateHoldingsCsv(csvInputText);
  }, [csvInputText]);

  const csvBondStressPreview = useMemo(() => {
    return computeGranularBondStress(parsedCsvHoldings.positions, 150);
  }, [parsedCsvHoldings.positions]);

  const activeGranularBondSummary = useMemo(() => {
    const positions = activePortfolio?.positions || [];
    const hasGranularMetrics = positions.some(
      (p) => typeof p.durationYears === 'number' || typeof p.oasBps === 'number'
    );
    if (!hasGranularMetrics) return null;
    return computeGranularBondStress(positions, 150);
  }, [activePortfolio]);

  const handleCsvFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      soundFx.playTick();
      setCsvUploadFileName(file.name);
      setCsvInputText(text);
    } finally {
      e.target.value = '';
    }
  };

  const handleLoadSampleCsv = () => {
    soundFx.playTick();
    setCsvUploadFileName('buy_side_granular_sample.csv');
    setCsvInputText(SAMPLE_GRANULAR_CSV);
  };

  const handleApplyCsvHoldings = () => {
    if (parsedCsvHoldings.positions.length === 0) return;
    soundFx.playChime();
    setCustomPositions(parsedCsvHoldings.positions);
    setCustomAum(parsedCsvHoldings.totalAumMn);
    setSelectedPresetId('custom');
    setIsCsvImporterOpen(false);
  };

  // Compute Stress Result
  const stressResult = useMemo(() => {
    return computePortfolioStressOverlay(activePortfolio, {
      scenarioId: selectedScenarioId,
      customShockMap: selectedScenarioId === 'live_custom_contagion' ? liveClearingShockMap : null,
      stressMultiplier,
      enableLookThrough,
      activeHedges
    });
  }, [activePortfolio, selectedScenarioId, liveClearingShockMap, stressMultiplier, enableLookThrough, activeHedges]);

  // Reverse Stress Metrics
  const safetyMetrics = useMemo(() => {
    return computePortfolioSafetyCushion({
      dataset,
      quarter: selectedQuarter,
      epicenter: 'TR',
      currentHaircut: 25,
      bufferMultiplier: 1.5,
      activePortfolio,
      targetLossLimitMn
    });
  }, [dataset, selectedQuarter, activePortfolio, targetLossLimitMn]);

  // Historical Crisis Replay Metrics
  const crisisReplay = useMemo(() => {
    return computeHistoricalCrisisReplay({
      dataset,
      activePortfolio,
      currentEpicenter: 'TR',
      currentHaircut: 25,
      currentBuffer: 1.5,
      targetLossLimitMn
    });
  }, [dataset, activePortfolio, targetLossLimitMn]);

  // Optimal Hedge Solver
  const optimalHedgePackage = useMemo(() => {
    return solveOptimalHedgePackage({
      activePortfolio,
      scenarioId: selectedScenarioId,
      customShockMap: selectedScenarioId === 'live_custom_contagion' ? liveClearingShockMap : null,
      maxBudgetBps: hedgeBudgetBps,
      minProtectionPct: 20.0,
      stressMultiplier,
      enableLookThrough
    });
  }, [activePortfolio, selectedScenarioId, liveClearingShockMap, hedgeBudgetBps, stressMultiplier, enableLookThrough]);

  // v7.0 Direction A3: Deterministic 500-Trial Monte Carlo Fat-Tail & 99% CVaR Simulation
  const monteCarloResult = useMemo(() => {
    return runPortfolioMonteCarloSimulation({
      activePortfolio,
      baseStressResult: stressResult,
      scenarioId: selectedScenarioId,
      trialsCount: 500,
      seed: 20260700
    });
  }, [activePortfolio, stressResult, selectedScenarioId]);

  // v7.0 Direction B1: 5-Stage End-to-End Loss Attribution Waterfall
  const waterfallResult = useMemo(() => {
    return computeLossAttributionWaterfall({
      dataset,
      quarter: selectedQuarter,
      epicenter: 'TR',
      haircutPct: 25,
      activePortfolio,
      portfolioStressResult: stressResult
    });
  }, [dataset, selectedQuarter, activePortfolio, stressResult]);

  // v7.0 Direction C1: Multi-Portfolio Stress Arena Comparison
  const arenaResult = useMemo(() => {
    return computeMultiPortfolioArena({
      dataset,
      quarter: selectedQuarter,
      epicenter: 'TR',
      haircutPct: 25,
      bufferMultiplier: 1.5,
      customPortfolios: selectedPresetId === 'custom' ? [activePortfolio] : []
    });
  }, [dataset, selectedQuarter, selectedPresetId, activePortfolio]);

  // Save to workspace
  const handleSaveToWorkspace = () => {
    soundFx.playChime();
    saveCustomPortfolio({
      id: selectedPresetId === 'custom' ? `custom-${Date.now()}` : selectedPresetId,
      name: activePortfolio.name,
      baseAumUsdMn: activePortfolio.baseAumUsdMn,
      positions: activePortfolio.positions
    });
    setSavedToWorkspace(true);
    setTimeout(() => setSavedToWorkspace(false), 2500);
  };

  const handleApplyOptimalHedges = (hedges) => {
    soundFx.playChime();
    setActiveHedges(hedges);
    setIsOptimizerModalOpen(false);
  };

  // Synchronize live portfolio stress result to parent ExecutiveVerdictBanner (Single Source of Truth)
  useEffect(() => {
    if (stressResult && onPortfolioResultChange) {
      onPortfolioResultChange(stressResult);
    }
  }, [stressResult, onPortfolioResultChange]);

  // Animated KPI readouts (synchronous initial value, smooth 260ms tween on subsequent changes)
  const animTotalLoss = useAnimatedNumber(stressResult.totalLossMn, 260);
  const animLossPct = useAnimatedNumber(stressResult.portfolioLossPct, 260);
  const animStressedAum = useAnimatedNumber(stressResult.stressedAumMn, 260);
  const animVaR99 = useAnimatedNumber(stressResult.stressVaR99Mn, 260);

  const cleanZhName = (raw = '') => raw.split(' (')[0].trim();
  const [isLightTheme, setIsLightTheme] = useState(() =>
    typeof document !== 'undefined' && document.body.classList.contains('theme-light')
  );

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const syncTheme = () => setIsLightTheme(document.body.classList.contains('theme-light'));
    syncTheme();
    const obs = new MutationObserver(syncTheme);
    obs.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);

  // Render ECharts Loss Attribution Horizontal Bar Chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    if (!chartInstanceRef.current) {
      chartInstanceRef.current = echarts.init(chartContainerRef.current);
    }
    const chart = chartInstanceRef.current;

    const victims = [...stressResult.positionResults].reverse(); // bottom-up so #1 victim is at top
    const categories = victims.map(v => {
      const shortName = cleanZhName(v.name);
      return shortName.length > 16 ? `${shortName.slice(0, 15)}…` : `${shortName} (${v.country})`;
    });
    const directLosses = victims.map(v => v.firstOrderLossMn);
    const secondOrderLosses = victims.map(v => v.secondOrderLossMn);
    const remainingValues = victims.map(v => v.stressedValueMn);

    const isLossDelta = chartMode === 'loss_delta';

    const series = isLossDelta
      ? [
          {
            name: '一阶直接损失',
            type: 'bar',
            stack: 'loss',
            barMaxWidth: 22,
            itemStyle: { color: '#fb7185' },
            data: directLosses
          },
          {
            name: '二阶网络传染',
            type: 'bar',
            stack: 'loss',
            barMaxWidth: 22,
            itemStyle: { color: '#818cf8', borderRadius: [0, 4, 4, 0] },
            data: secondOrderLosses
          }
        ]
      : [
          {
            name: '压力后余值',
            type: 'bar',
            stack: 'total',
            barMaxWidth: 22,
            itemStyle: { color: '#1e293b' },
            data: remainingValues
          },
          {
            name: '一阶直接损失',
            type: 'bar',
            stack: 'total',
            barMaxWidth: 22,
            itemStyle: { color: '#fb7185' },
            data: directLosses
          },
          {
            name: '二阶网络传染',
            type: 'bar',
            stack: 'total',
            barMaxWidth: 22,
            itemStyle: { color: '#818cf8', borderRadius: [0, 4, 4, 0] },
            data: secondOrderLosses
          }
        ];

    const option = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: 'rgba(13, 19, 33, 0.96)',
        borderColor: 'rgba(255, 255, 255, 0.12)',
        textStyle: { color: '#e2e8f0', fontSize: 12 },
        formatter: (params) => {
          const idx = params[0].dataIndex;
          const pos = victims[idx];
          return `
            <div class="font-sans text-xs p-1 space-y-1">
              <div class="font-bold text-white border-b border-white/10 pb-1">${pos.name} (${pos.country})</div>
              <div class="flex justify-between gap-4"><span>原始持仓:</span><b class="font-mono">$${pos.amountMn}M</b></div>
              <div class="flex justify-between gap-4 text-rose-400"><span>一阶直接损失:</span><b class="font-mono">-$${pos.firstOrderLossMn}M</b></div>
              <div class="flex justify-between gap-4 text-indigo-300"><span>二阶网络传染:</span><b class="font-mono">-$${pos.secondOrderLossMn}M</b></div>
              <div class="flex justify-between gap-4 text-amber-300 font-bold border-t border-slate-700 pt-1">
                <span>总压力减记:</span><b class="font-mono">-$${pos.lossMn}M (-${pos.rawLossPct}%)</b>
              </div>
              <div class="flex justify-between gap-4 text-emerald-400"><span>压力后余值:</span><b class="font-mono">$${pos.stressedValueMn}M</b></div>
            </div>
          `;
        }
      },
      legend: {
        data: isLossDelta
          ? ['一阶直接损失', '二阶网络传染']
          : ['压力后余值', '一阶直接损失', '二阶网络传染'],
        textStyle: { color: isLightTheme ? '#475569' : '#94a3b8', fontSize: 11 },
        top: 2,
        right: 8
      },
      grid: {
        top: 34,
        left: 8,
        right: 28,
        bottom: 10,
        containLabel: true
      },
      xAxis: {
        type: 'value',
        axisLine: { lineStyle: { color: isLightTheme ? '#cbd5e1' : '#334155' } },
        splitLine: { lineStyle: { color: isLightTheme ? '#e2e8f0' : '#1e293b', type: 'dashed' } },
        axisLabel: {
          color: isLightTheme ? '#475569' : '#94a3b8',
          fontSize: 11,
          formatter: isLossDelta ? '-${value}M' : '${value}M'
        }
      },
      yAxis: {
        type: 'category',
        data: categories,
        axisLine: { lineStyle: { color: isLightTheme ? '#cbd5e1' : '#334155' } },
        axisLabel: { color: isLightTheme ? '#1e293b' : '#cbd5e1', fontSize: 11 }
      },
      series
    };

    chart.setOption(option, true);

    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [stressResult, chartMode, isLightTheme]);

  // Copy Risk Memo
  const handleCopyRiskMemo = () => {
    soundFx.playChime();
    const memo = `### EUGENE FINANCE · 机构组合压力映射风控简报 (Portfolio Stress Overlay)
- **基准组合**: ${activePortfolio.name} | **报告期**: ${selectedQuarter}
- **组合基础资产规模 (Base AUM)**: $${stressResult.baseAumUsdMn}M
- **宏观压力情景**: ${stressResult.scenarioName} (倍数: ${stressMultiplier}x)
- **预期资产净减记 (Total Stress Loss)**: -$${stressResult.totalLossMn}M (-${stressResult.portfolioLossPct}%)
- **直接主权减记 (First-Order)**: -$${stressResult.firstOrderLossMn}M
- **二阶级联传染损失 (Second-Order Domino)**: -$${stressResult.secondOrderLossMn}M
- **极值风险价值 (99% 1-Month Stress VaR)**: -$${stressResult.stressVaR99Mn}M
- **主动对冲残余减记**: -$${stressResult.hedgedLossMn}M (净挽回资本: +$${stressResult.netSavedMn}M)
- **受损敞口前三位**:
${stressResult.topVictims.map((v, i) => `  ${i + 1}. ${v.name} (${v.country}): 减记 -$${v.lossMn}M (-${v.rawLossPct}%, 贡献 ${v.lossContributionPct}%)`).join('\n')}
- **对冲与资本防线建议**:
${stressResult.hedgingAdvice.map((h, i) => `  ${i + 1}. [${h.priority}] ${h.title}: ${h.desc}`).join('\n')}
- **模型来源**: BIS CBS Table B Ultimate Risk & Eisenberg-Noe 2001 Clearing Engine`;

    navigator.clipboard.writeText(memo);
    setCopiedMemo(true);
    setTimeout(() => setCopiedMemo(false), 2500);
  };

  const grossRecoveredMn = Math.max(0, Math.round((stressResult.unhedgedLossMn - stressResult.hedgedLossMn) * 10) / 10);
  const residualRatioPct = stressResult.unhedgedLossMn > 0
    ? Math.min(100, Math.round(((stressResult.hedgedLossMn + stressResult.hedgeCostMn) / stressResult.unhedgedLossMn) * 100))
    : 0;
  const savedRatioPct = Math.max(0, 100 - residualRatioPct);

  return (
    <div className="space-y-3.5 text-slate-200 animate-fade-in" data-testid="portfolio-stress-overlay">
      {/* v4.0 Causal Chain Context Breadcrumb Strip */}
      <div
        data-testid="portfolio-causal-breadcrumb"
        className="px-3.5 py-2 rounded-xl bg-[#0d1321]/90 border border-indigo-400/20 text-xs flex flex-wrap items-center justify-between gap-2 shadow-sm"
      >
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-slate-400 font-mono text-[11px]">🔗 全景因果链:</span>
          <span className="text-slate-400">① 查资金去向</span>
          <span className="text-slate-600 font-mono">➔</span>
          <span className="text-slate-400">② 抓隐形杠杆</span>
          <span className="text-slate-600 font-mono">➔</span>
          <span className="text-slate-400">③ 算多米诺骨牌</span>
          <span className="text-slate-600 font-mono">➔</span>
          <span className="text-indigo-300 font-semibold bg-indigo-500/15 px-2 py-0.5 rounded border border-indigo-400/30">
            ④ 护住我的账户 (终局防线)
          </span>
        </div>
        <div className="text-[11px] text-slate-400 hidden sm:block">
          宏观清算受损向量已实时投射至专户 · 可勾选 CDS 对冲减震
        </div>
      </div>

      {/* 1. Quiet-Luxury Header Card & Portfolio Presets */}
      <div className="rounded-2xl p-4 bg-[#0d1321]/95 border border-white/[0.08] shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#131b2e] border border-indigo-400/30 flex items-center justify-center text-indigo-300 shrink-0">
              <Briefcase className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2
                  className="text-base sm:text-lg font-bold text-white tracking-tight"
                  title="Portfolio Stress Overlay · 机构专户宏观压力穿透与风控仪表盘"
                >
                  我的组合压力映射
                </h2>
                <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-400/30">
                  v6.0.0 · 专户风控
                </span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  BIS CBS 穿透映射
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 max-w-3xl leading-relaxed">
                将 BIS 跨国银行信贷网络与 Eisenberg-Noe 级联清算向量直接映射至机构专户持仓，拆解一阶主权减记、二阶多米诺传染与反向破防临界点。
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap self-start lg:self-auto shrink-0">
            <button
              onClick={handleSaveToWorkspace}
              data-testid="save-portfolio-to-workspace-btn"
              className="h-8 px-2.5 rounded-lg border border-indigo-400/30 bg-[#131b2e] hover:bg-[#182238] text-indigo-200 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer"
              title="将当前专户配置及持仓保存至本地工作区"
            >
              {savedToWorkspace ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Save className="w-3.5 h-3.5 text-indigo-400" />}
              <span>{savedToWorkspace ? '已保存工作区' : '保存至工作区'}</span>
            </button>

            <button
              onClick={() => setIsOptimizerModalOpen(true)}
              data-testid="auto-hedge-optimizer-btn"
              className="h-8 px-2.5 rounded-lg border border-emerald-500/40 bg-emerald-950/30 hover:bg-emerald-900/40 text-emerald-200 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              title="打开帕累托最优对冲处方求解器 (预算约束下收益最大化)"
            >
              <Award className="w-3.5 h-3.5 text-emerald-400" />
              <span>智能对冲处方</span>
            </button>

            {onOpenPitchDeck && (
              <button
                onClick={onOpenPitchDeck}
                data-testid="portfolio-open-pitchdeck-btn"
                className="h-8 px-2.5 rounded-lg border border-amber-400/40 bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 text-amber-200 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                title="打开投委会 4 幕路演全屏幻灯片"
              >
                <Presentation className="w-3.5 h-3.5 text-amber-400" />
                <span>投委会路演</span>
              </button>
            )}

            <button
              onClick={handleCopyRiskMemo}
              data-testid="copy-risk-memo-btn"
              className="h-8 px-2.5 rounded-lg border border-white/[0.1] bg-[#131b2e] hover:bg-[#182238] text-slate-200 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer"
              title="复制机构级风控审计备忘录 (Markdown)"
            >
              {copiedMemo ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
              <span className="hidden sm:inline">{copiedMemo ? '已复制风控简报' : '复制简报'}</span>
            </button>

            {onOpenChartCard && (
              <button
                onClick={onOpenChartCard}
                className="h-8 px-2.5 rounded-lg border border-indigo-400/35 bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-200 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                title="导出投行级组合压力卡片 (Publication-Ready Chart Card)"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
                <span>研报卡片</span>
              </button>
            )}
          </div>
        </div>

        {/* Portfolio Preset Switcher Pills */}
        <div className="mt-3.5 pt-3 border-t border-white/[0.06] flex items-center justify-between gap-2 flex-wrap text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-medium text-slate-400 shrink-0 flex items-center gap-1">
              <Briefcase className="w-3 h-3 text-indigo-400" />
              <span>账户配置:</span>
            </span>
            {PORTFOLIO_PRESETS.map(preset => (
              <button
                key={preset.id}
                onClick={() => {
                  soundFx.playTick();
                  setSelectedPresetId(preset.id);
                }}
                data-testid={`preset-${preset.id}`}
                title={preset.name}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 border ${
                  selectedPresetId === preset.id
                    ? 'atlas-pill-active'
                    : 'bg-[#131b2e]/70 text-slate-400 hover:text-white border-white/[0.06]'
                }`}
              >
                <span>{cleanZhName(preset.name)}</span>
                <span className="text-[11px] font-mono opacity-85 tabular-nums">(${preset.baseAumUsdMn}M)</span>
              </button>
            ))}
            <button
              onClick={() => {
                soundFx.playTick();
                setSelectedPresetId('custom');
              }}
              data-testid="preset-custom"
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 border ${
                selectedPresetId === 'custom'
                  ? 'atlas-pill-active'
                  : 'bg-[#131b2e]/70 text-slate-400 hover:text-white border-white/[0.06]'
              }`}
            >
              <span>自定义组合</span>
              <span className="text-[11px] font-mono opacity-85 tabular-nums">(${customAum}M)</span>
            </button>
            <button
              onClick={() => {
                soundFx.playTick();
                setIsCsvImporterOpen(prev => !prev);
              }}
              data-testid="open-csv-holdings-btn"
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 border ${
                isCsvImporterOpen
                  ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400/50'
                  : 'bg-[#131b2e]/90 text-emerald-300 hover:text-white border-emerald-500/35 hover:border-emerald-400/60'
              }`}
              title="导入买方个券级 CSV 持仓 (含久期 Duration / OAS 利差)"
            >
              <span>📥 导入 CSV 个券久期持仓</span>
            </button>
          </div>

          {/* Sub-View Mode Switcher */}
          <div className="atlas-segmented text-xs shrink-0 flex-wrap">
            <button
              onClick={() => { soundFx.playTick(); setActiveSubTab('attribution'); }}
              data-testid="tab-attribution"
              className={`px-2.5 py-1 rounded-md font-semibold cursor-pointer transition-all ${
                activeSubTab === 'attribution' ? 'atlas-pill-active' : 'text-slate-400 hover:text-white'
              }`}
            >
              📊 减记拆解与五级归因
            </button>
            <button
              onClick={() => { soundFx.playTick(); setActiveSubTab('reverse_stress'); }}
              data-testid="tab-reverse-stress"
              className={`px-2.5 py-1 rounded-md font-semibold cursor-pointer transition-all ${
                activeSubTab === 'reverse_stress' ? 'atlas-pill-active text-amber-300' : 'text-slate-400 hover:text-white'
              }`}
            >
              🛡️ 反向破防求根
            </button>
            <button
              onClick={() => { soundFx.playTick(); setActiveSubTab('crisis_backtest'); }}
              data-testid="tab-crisis-backtest"
              className={`px-2.5 py-1 rounded-md font-semibold cursor-pointer transition-all ${
                activeSubTab === 'crisis_backtest' ? 'atlas-pill-active text-sky-300' : 'text-slate-400 hover:text-white'
              }`}
            >
              ⏳ 历史危机平行穿越
            </button>
            <button
              onClick={() => { soundFx.playTick(); setActiveSubTab('monte_carlo'); }}
              data-testid="tab-monte-carlo"
              className={`px-2.5 py-1 rounded-md font-semibold cursor-pointer transition-all ${
                activeSubTab === 'monte_carlo' ? 'atlas-pill-active text-rose-300' : 'text-slate-400 hover:text-white'
              }`}
            >
              🎲 蒙特卡洛肥尾 (99% CVaR)
            </button>
            <button
              onClick={() => { soundFx.playTick(); setActiveSubTab('portfolio_arena'); }}
              data-testid="tab-portfolio-arena"
              className={`px-2.5 py-1 rounded-md font-semibold cursor-pointer transition-all ${
                activeSubTab === 'portfolio_arena' ? 'atlas-pill-active text-emerald-300' : 'text-slate-400 hover:text-white'
              }`}
            >
              🏆 多专户抗压 PK
            </button>
          </div>
        </div>

        {/* Granular CSV Holdings & Duration/OAS Stress Importer Panel */}
        {isCsvImporterOpen && (
          <div
            data-testid="csv-holdings-importer-panel"
            className="mt-3.5 pt-3.5 border-t border-emerald-500/25 space-y-3 animate-fade-in"
          >
            <div className="rounded-xl p-4 bg-[#070a12]/90 border border-emerald-500/30 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.08] pb-2.5">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <FileText className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-sm font-bold text-white">
                      买方个券级 CSV 持仓与久期 / OAS 压力映射导入器
                    </h3>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                      Duration + OAS 估值冲击
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-mono">
                    标准字段: ticker,name,country,assetClass,amountMn,durationYears,oasBps
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsCsvImporterOpen(false)}
                  className="h-7 w-7 rounded-lg border border-white/[0.1] bg-[#131b2e] text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
                  title="关闭导入面板"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Sample Loader & Local File Upload Controls */}
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleLoadSampleCsv}
                    data-testid="load-sample-csv-btn"
                    className="h-8 px-3 rounded-lg border border-emerald-500/40 bg-emerald-950/35 hover:bg-emerald-900/45 text-emerald-200 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    <span>载入买方实盘个券模板 (含久期 Duration / OAS)</span>
                  </button>

                  <label className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg border border-white/[0.1] bg-[#131b2e] text-xs text-slate-300">
                    <Upload className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span className="text-[11px] text-slate-400 shrink-0">本地 CSV 上传:</span>
                    <input
                      type="file"
                      accept=".csv,.txt"
                      onChange={handleCsvFileUpload}
                      className="text-[11px] file:text-[11px] text-slate-300 file:mr-2 file:py-0.5 file:px-2 file:rounded file:border file:border-white/15 file:bg-[#0d1321] file:text-slate-200 hover:file:bg-[#182238] file:cursor-pointer cursor-pointer max-w-[230px]"
                    />
                  </label>
                </div>

                {csvUploadFileName && (
                  <span className="text-[11px] font-mono text-indigo-300">
                    当前载入: {csvUploadFileName}
                  </span>
                )}
              </div>

              {/* Editor Textarea + Live Parsed Preview */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="font-semibold text-slate-300">CSV 原始持仓输入区</span>
                    <span className="font-mono">支持缺失久期/OAS 自动补全缺省值</span>
                  </div>
                  <textarea
                    data-testid="csv-holdings-textarea"
                    value={csvInputText}
                    onChange={(e) => setCsvInputText(e.target.value)}
                    rows={7}
                    spellCheck={false}
                    placeholder={'ticker,name,country,assetClass,amountMn,durationYears,oasBps\nUST-10Y,US Treasury 4.25% Nov 2034,US,sovereign_debt,180,8.2,12'}
                    className={`w-full rounded-xl p-3 font-mono text-xs leading-relaxed border focus:outline-none focus:border-emerald-400/60 transition-colors resize-y ${
                      isLightTheme
                        ? 'bg-white text-slate-900 border-slate-300 placeholder:text-slate-400'
                        : 'bg-[#0d1321] text-slate-100 border-white/[0.12] placeholder:text-slate-500'
                    }`}
                  />
                </div>

                {/* Live Parsed Preview Box */}
                <div className="rounded-xl p-3.5 bg-[#0d1321]/95 border border-white/[0.08] flex flex-col justify-between space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-white">实时解析与久期/OAS 冲击预览</span>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-400/30">
                      +150bps 平行加息/利差冲击
                    </span>
                  </div>

                  {!csvInputText.trim() ? (
                    <div className="flex-1 flex items-center justify-center py-6 text-center text-xs text-slate-400 border border-dashed border-white/[0.08] rounded-lg px-4">
                      请粘贴 CSV 个券持仓、上传本地 .csv 文件，或点击「载入买方实盘个券模板」查看实时久期与 OAS 压力测算。
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {parsedCsvHoldings.errors.length > 0 && (
                        <div className="p-2.5 rounded-lg bg-rose-950/35 border border-rose-500/40 space-y-1 text-[11px] text-rose-200">
                          <div className="font-semibold flex items-center gap-1.5 text-rose-300">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                            <span>校验告警 ({parsedCsvHoldings.errors.length} 条)</span>
                          </div>
                          {parsedCsvHoldings.errors.slice(0, 3).map((err, idx) => (
                            <div key={idx} className="font-mono leading-snug">{err}</div>
                          ))}
                        </div>
                      )}

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 tabular-nums">
                        <div className="p-2.5 rounded-lg bg-[#131b2e]/90 border border-white/[0.07]">
                          <div className="text-[11px] text-slate-400">有效标的数</div>
                          <div className="text-sm font-bold font-mono text-white mt-0.5">
                            {parsedCsvHoldings.count} 只
                          </div>
                        </div>
                        <div className="p-2.5 rounded-lg bg-[#131b2e]/90 border border-white/[0.07]">
                          <div className="text-[11px] text-slate-400">总规模 AUM</div>
                          <div className="text-sm font-bold font-mono text-sky-300 mt-0.5">
                            ${parsedCsvHoldings.totalAumMn}M
                          </div>
                        </div>
                        <div className="p-2.5 rounded-lg bg-[#131b2e]/90 border border-white/[0.07]">
                          <div className="text-[11px] text-slate-400">加权久期</div>
                          <div className="text-sm font-bold font-mono text-indigo-300 mt-0.5">
                            {parsedCsvHoldings.weightedDurationYears} Years
                          </div>
                        </div>
                        <div className="p-2.5 rounded-lg bg-[#131b2e]/90 border border-white/[0.07]">
                          <div className="text-[11px] text-slate-400">加权 OAS</div>
                          <div className="text-sm font-bold font-mono text-amber-300 mt-0.5">
                            {parsedCsvHoldings.weightedOasBps} bps
                          </div>
                        </div>
                      </div>

                      <div className="p-2.5 rounded-lg bg-rose-950/25 border border-rose-500/35 flex flex-wrap items-center justify-between gap-2 tabular-nums">
                        <div className="space-y-0.5">
                          <div className="text-[11px] font-semibold text-rose-200">
                            +150bps 利率/利差冲击估值预估 (Duration + OAS Shock)
                          </div>
                          <div className="text-[11px] font-mono text-slate-300">
                            久期 MtM -${csvBondStressPreview.durationLossMn}M · 利差走阔调整 -${csvBondStressPreview.spreadStressAdjustmentMn}M
                          </div>
                        </div>
                        <div className="text-right font-mono">
                          <div className="text-sm font-bold text-rose-400">
                            -${csvBondStressPreview.totalLossMn}M
                          </div>
                          <div className="text-[11px] text-rose-300">
                            回撤 -{csvBondStressPreview.lossPct}%
                          </div>
                        </div>
                      </div>

                      {parsedCsvHoldings.positions.length > 0 && (
                        <div className="max-h-28 overflow-y-auto rounded-lg border border-white/[0.07] bg-[#070a12]/80">
                          <table className="w-full text-left text-[11px] font-mono tabular-nums">
                            <thead>
                              <tr className="border-b border-white/[0.08] text-slate-400 bg-[#131b2e]/60">
                                <th className="py-1.5 px-2">Ticker</th>
                                <th className="py-1.5 px-2">国家</th>
                                <th className="py-1.5 px-2">资产类别</th>
                                <th className="py-1.5 px-2 text-right">规模</th>
                                <th className="py-1.5 px-2 text-right">久期</th>
                                <th className="py-1.5 px-2 text-right">OAS</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/[0.05] text-slate-200">
                              {parsedCsvHoldings.positions.map((item) => (
                                <tr key={item.id}>
                                  <td className="py-1 px-2 font-semibold text-emerald-300">{item.ticker}</td>
                                  <td className="py-1 px-2">{item.country}</td>
                                  <td className="py-1 px-2 text-slate-300">{item.assetClass}</td>
                                  <td className="py-1 px-2 text-right">${item.amountMn}M</td>
                                  <td className="py-1 px-2 text-right">{item.durationYears}Y</td>
                                  <td className="py-1 px-2 text-right">{item.oasBps}bp</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Footer Action Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <span className="text-[11px] text-slate-400">
                  应用后将自动切换至「自定义组合」并更新全盘压力映射、500 次蒙特卡洛 99% CVaR 及对冲求解器
                </span>
                <button
                  type="button"
                  onClick={handleApplyCsvHoldings}
                  disabled={parsedCsvHoldings.positions.length === 0}
                  data-testid="apply-csv-holdings-btn"
                  className={`h-8 px-4 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md ${
                    parsedCsvHoldings.positions.length > 0
                      ? 'bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer'
                      : 'bg-slate-800 text-slate-500 border border-white/[0.08] cursor-not-allowed'
                  }`}
                >
                  <span>⚡ 立即应用个券级持仓并映射压力</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2. Top Executive KPI Bar (5 Core Portfolio Risk Metrics) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 tabular-nums">
        {/* Base AUM */}
        <div className="p-3.5 rounded-xl bg-[#0d1321]/95 border border-white/[0.08] flex flex-col justify-between">
          <span className="text-xs font-medium text-slate-400" title="Base Portfolio Assets Under Management">
            组合基准资产规模
          </span>
          <div className="text-xl font-bold font-mono text-white mt-1">
            ${stressResult.baseAumUsdMn}M
          </div>
          <span className="text-[11px] text-slate-400 mt-1">
            {stressResult.positionsCount} 项持仓标的
          </span>
        </div>

        {/* Total Stress Loss */}
        <div className="p-3.5 rounded-xl bg-rose-950/25 border border-rose-500/35 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-300" title="Expected Unhedged Stress Impairment">
              预期压力净减记
            </span>
            <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div className="text-xl font-bold font-mono text-rose-400 mt-1" data-testid="portfolio-kpi-total-loss">
            -${Number(animTotalLoss).toFixed(1).replace(/\.0$/, '')}M
          </div>
          <div className="flex items-center justify-between gap-1 mt-1">
            <span className="text-[11px] font-mono font-semibold text-rose-300">
              回撤 -{Number(animLossPct).toFixed(1)}%
            </span>
            {stressResult.netSavedMn > 0 && (
              <span className="text-[11px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                挽回 +${stressResult.netSavedMn}M
              </span>
            )}
          </div>
        </div>

        {/* First-Order vs Second-Order */}
        <div className="p-3.5 rounded-xl bg-[#0d1321]/95 border border-white/[0.08] flex flex-col justify-between">
          <span className="text-xs font-medium text-slate-400" title="First-Order Direct vs Second-Order Network Domino Loss">
            直接 vs 级联传染损失
          </span>
          <div className="text-xs font-bold font-mono text-white mt-1.5 flex items-baseline justify-between gap-1">
            <span className="text-rose-400">一阶 -${stressResult.firstOrderLossMn}M</span>
            <span className="text-indigo-300">二阶 -${stressResult.secondOrderLossMn}M</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-slate-800 mt-2 overflow-hidden flex">
            <div
              className="h-full bg-rose-400"
              style={{ width: `${Math.round((stressResult.firstOrderLossMn / Math.max(0.1, stressResult.totalLossMn)) * 100)}%` }}
            />
            <div
              className="h-full bg-indigo-400"
              style={{ width: `${Math.round((stressResult.secondOrderLossMn / Math.max(0.1, stressResult.totalLossMn)) * 100)}%` }}
            />
          </div>
        </div>

        {/* Stressed AUM */}
        <div className="p-3.5 rounded-xl bg-[#0d1321]/95 border border-white/[0.08] flex flex-col justify-between">
          <span className="text-xs font-medium text-slate-400" title="Post-Stress Remaining Net Asset Value">
            压力后资产净值
          </span>
          <div className="text-xl font-bold font-mono text-sky-300 mt-1">
            ${Number(animStressedAum).toFixed(1)}M
          </div>
          <span className="text-[11px] text-slate-400 font-mono mt-1">
            资本留存率 {Math.round((stressResult.stressedAumMn / Math.max(1, stressResult.baseAumUsdMn)) * 1000) / 10}%
          </span>
        </div>

        {/* Stress VaR 99% */}
        <div className="p-3.5 rounded-xl bg-[#131b2e]/90 border border-indigo-400/30 flex flex-col justify-between col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <ConceptTooltip termKey="var">
              <span className="text-xs font-semibold text-indigo-200 cursor-help" title="99% 1-Month Stress Value-at-Risk (Basel III 1.35x)">
                99% 压力 VaR (1M)
              </span>
            </ConceptTooltip>
            <ShieldAlert className="w-3.5 h-3.5 text-indigo-300" />
          </div>
          <div className="text-xl font-bold font-mono text-indigo-200 mt-1">
            -${Number(animVaR99).toFixed(1)}M
          </div>
          <span className="text-[11px] text-slate-400 font-mono mt-1">
            巴塞尔 III 压力乘数 1.35x
          </span>
        </div>
      </div>

      {/* 3. Interactive Scenario & Sensitivity Control Bar */}
      <div className="rounded-xl p-3 bg-[#0d1321]/95 border border-white/[0.08] flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-semibold text-slate-400 shrink-0">
            宏观冲击情景:
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {liveClearingShockMap && Object.keys(liveClearingShockMap).length > 0 && (
              <button
                onClick={() => {
                  soundFx.playChime();
                  setSelectedScenarioId('live_custom_contagion');
                }}
                data-testid="scenario-live_custom_contagion"
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 border ${
                  selectedScenarioId === 'live_custom_contagion'
                    ? 'bg-amber-500/20 text-amber-200 border-amber-400/60'
                    : 'bg-[#131b2e] text-amber-300 hover:text-white border-amber-500/30'
                }`}
                title="已同步接收网络传染模拟器的 Eisenberg-Noe 实时清算损失率"
              >
                <span>⚡ 实时清算冲击</span>
              </button>
            )}
            {MACRO_STRESS_SCENARIOS.filter(s => s.id !== 'live_custom_contagion').map(sc => (
              <button
                key={sc.id}
                onClick={() => {
                  soundFx.playTick();
                  setSelectedScenarioId(sc.id);
                }}
                data-testid={`scenario-${sc.id}`}
                title={sc.desc}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer border ${
                  selectedScenarioId === sc.id
                    ? 'atlas-pill-active font-semibold'
                    : 'bg-[#131b2e]/70 text-slate-400 hover:text-white border-white/[0.06]'
                }`}
              >
                {cleanZhName(sc.name)}
              </button>
            ))}
          </div>
        </div>

        {/* Controls: Multiplier & Look-Through */}
        <div className="flex items-center gap-2.5 ml-auto">
          <div className="flex items-center gap-2 bg-[#131b2e] px-2.5 py-1 rounded-lg border border-white/[0.08] tabular-nums">
            <span className="text-[11px] text-slate-400">冲击烈度:</span>
            <input
              type="range"
              min="0.5"
              max="2.5"
              step="0.1"
              value={stressMultiplier}
              onChange={(e) => setStressMultiplier(parseFloat(e.target.value))}
              className="w-20 accent-indigo-400 cursor-pointer"
            />
            <span className="font-mono font-bold text-indigo-300 w-8 text-right">{stressMultiplier.toFixed(1)}x</span>
          </div>

          <button
            onClick={() => {
              soundFx.playTick();
              setEnableLookThrough(!enableLookThrough);
            }}
            data-testid="toggle-portfolio-lookthrough"
            className={`px-2.5 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              enableLookThrough
                ? 'atlas-pill-active'
                : 'bg-[#131b2e] border-white/[0.08] text-slate-400 hover:text-white'
            }`}
            title="一键穿透开曼/香港等离岸壳实体，还原至母国真实风险承担者计算损失"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>{enableLookThrough ? '离岸穿透: 开启' : '离岸穿透: 注册地'}</span>
          </button>
        </div>
      </div>

      {/* 4. Main Analytics: Signal-First Loss Attribution Chart, Reverse Stress, or Crisis Backtest */}
      {activeSubTab === 'attribution' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
          {/* Left 2 Cols: Loss Attribution Chart (Zero void, ranked monotonically by loss delta) */}
          <div className="lg:col-span-2 rounded-xl p-4 bg-[#0d1321]/95 border border-white/[0.08] flex flex-col">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <div>
                <h3
                  className="text-sm font-bold text-white flex items-center gap-2"
                  title="Portfolio Loss Attribution by Asset"
                >
                  <span>持仓标的压力减记拆解</span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {chartMode === 'loss_delta'
                    ? '按受损金额降序排列：一阶直接主权冲击（玫瑰红）+ 二阶同业网络传染（靛紫）'
                    : '展示各持仓标的压力后剩余净值与一阶/二阶减记占比对照'}
                </p>
              </div>

              <div className="atlas-segmented text-[11px]">
                <button
                  onClick={() => setChartMode('loss_delta')}
                  className={`px-2.5 py-0.5 rounded-md font-medium cursor-pointer transition-all ${
                    chartMode === 'loss_delta' ? 'atlas-pill-active font-semibold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  减记归因 Δ
                </button>
                <button
                  onClick={() => setChartMode('full_aum')}
                  className={`px-2.5 py-0.5 rounded-md font-medium cursor-pointer transition-all ${
                    chartMode === 'full_aum' ? 'atlas-pill-active font-semibold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  全量净值对照
                </button>
              </div>
            </div>

            <div
              ref={chartContainerRef}
              className="w-full flex-1 min-h-[340px]"
              data-testid="portfolio-stress-chart"
            />
          </div>

          {/* Right Col: Active Hedge Cockpit with Unhedged ➔ Hedged Waterfall Comparison */}
          <div className="rounded-xl p-4 bg-[#0d1321]/95 border border-white/[0.08] flex flex-col justify-between space-y-3">
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <h3
                    className="text-sm font-bold text-white"
                    title="Active Institutional Hedge Overlay"
                  >
                    主动宏观对冲防护台
                  </h3>
                </div>
                {stressResult.netSavedMn > 0 && (
                  <span className="text-[11px] font-mono text-emerald-300 bg-emerald-500/15 px-2 py-0.5 rounded border border-emerald-500/35 font-semibold tabular-nums">
                    保全 +${stressResult.netSavedMn}M
                  </span>
                )}
              </div>

              {/* Unhedged ➔ Hedged Visual Waterfall Comparison */}
              <div className="p-2.5 rounded-lg bg-[#131b2e]/80 border border-white/[0.07] space-y-2 text-[11px] tabular-nums">
                <div className="flex items-center justify-between text-slate-300">
                  <span>未对冲原始减记: <strong className="font-mono text-rose-400">-${stressResult.unhedgedLossMn}M</strong></span>
                  <span>对冲后残余: <strong className="font-mono text-white">-${stressResult.hedgedLossMn}M</strong></span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden flex">
                  <div
                    className="h-full bg-rose-400 transition-all duration-300"
                    style={{ width: `${residualRatioPct}%` }}
                    title={`残余减记与对冲成本占比: ${residualRatioPct}%`}
                  />
                  <div
                    className="h-full bg-emerald-400 transition-all duration-300"
                    style={{ width: `${savedRatioPct}%` }}
                    title={`主动对冲净保全比例: ${savedRatioPct}%`}
                  />
                </div>
                <div className="flex items-center justify-between text-slate-400 font-mono">
                  <span>毛冲销: <span className="text-emerald-400">+${grossRecoveredMn}M</span></span>
                  <span>成本: <span className="text-amber-300">-${stressResult.hedgeCostMn}M</span></span>
                  <span>净挽回: <strong className="text-emerald-300">+${stressResult.netSavedMn}M</strong></span>
                </div>
              </div>

              {/* Interactive Hedge Strategies Switches */}
              <div className="space-y-2">
                {[
                  { id: 'cds_hedge', title: '买入主权违约互换 (CDS)', tag: '80% 冲销', desc: '锁定高危主权外债头寸一阶违约减记' },
                  { id: 'derisk_ofc', title: '离岸 SPV 调降至短期美债', tag: '50% 避险', desc: '开曼/离岸 PE 敞口削减 50% 转入 0-Beta 美债' },
                  { id: 'swap_basis_collar', title: '跨货币互换基差套保', tag: '70% 减震', desc: '对冲 FX Swaps 表外美元保证金追缴冲击' }
                ].map(h => {
                  const isChecked = activeHedges.includes(h.id);
                  return (
                    <label
                      key={h.id}
                      data-testid={`hedge-toggle-${h.id}`}
                      className={`p-2.5 rounded-lg border flex items-start gap-2.5 cursor-pointer transition-all ${
                        isChecked
                          ? 'bg-emerald-950/25 border-emerald-500/40 text-white'
                          : 'bg-[#131b2e]/50 border-white/[0.06] text-slate-400 hover:border-white/[0.14]'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          soundFx.playTick();
                          setActiveHedges(prev =>
                            prev.includes(h.id) ? prev.filter(x => x !== h.id) : [...prev, h.id]
                          );
                        }}
                        className="mt-0.5 accent-emerald-500 cursor-pointer"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 text-xs font-semibold">
                          {h.id === 'cds_hedge' ? (
                            <ConceptTooltip termKey="cds">
                              <span className={`${isChecked ? 'text-emerald-200' : 'text-slate-300'} cursor-help`}>{h.title}</span>
                            </ConceptTooltip>
                          ) : (
                            <span className={isChecked ? 'text-emerald-200' : 'text-slate-300'}>{h.title}</span>
                          )}
                          <span className="text-[11px] font-mono px-1.5 py-0.2 rounded bg-slate-800/90 text-emerald-300 border border-emerald-500/25 shrink-0">
                            {h.tag}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">{h.desc}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="pt-2.5 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-slate-400">
              <span className="truncate mr-2">
                首要风险源: <strong className="text-rose-300">{cleanZhName(stressResult.topVictims[0]?.name || 'N/A')}</strong>
              </span>
              <button
                onClick={() => onOpenContagion && onOpenContagion()}
                className="text-indigo-300 hover:text-white flex items-center gap-0.5 cursor-pointer font-medium text-xs shrink-0"
              >
                <span>级联传染源</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* v7.0 Direction B1: 5-Stage End-to-End Loss Attribution Waterfall */}
          {waterfallResult && (
            <div
              data-testid="loss-attribution-waterfall"
              className="lg:col-span-3 rounded-xl p-4 bg-[#0d1321]/95 border border-indigo-400/25 space-y-3 atlas-card-elevated atlas-specular-bar"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.08] pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 font-bold">
                    v7.0 五级因果归因瀑布
                  </span>
                  <h4 className="text-xs sm:text-sm font-bold text-white">
                    端到端五级风险传导与对冲归因链路 (震中引爆 ➔ 跨境走廊 ➔ G-SIB 母行 ➔ 专户减记 ➔ 对冲赔付)
                  </h4>
                </div>
                <span className="text-[11px] font-mono text-emerald-300">
                  毛减记 -${waterfallResult.unhedgedLossMn}M ➔ 对冲挽回 +${waterfallResult.grossSavedMn}M ➔ 净残余 -${waterfallResult.residualLossMn}M
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 text-xs">
                {waterfallResult.stages.map((st) => (
                  <div
                    key={st.id}
                    className={`p-3 rounded-xl border flex flex-col justify-between space-y-2 ${st.colorClass}`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-mono">
                        <span className="font-bold opacity-85">STAGE {st.stageNo}</span>
                        <span className="px-1.5 py-0.2 rounded bg-black/30 border border-white/10">{st.tag}</span>
                      </div>
                      <div className="font-bold text-white text-xs">{st.title}</div>
                      <div className="text-base font-black font-mono text-white pt-0.5">{st.metricLabel}</div>
                      <div className="text-[11px] font-mono opacity-90">{st.metricSub}</div>
                    </div>
                    <p className="text-[11px] text-slate-300/90 leading-snug border-t border-white/10 pt-1.5">
                      {st.detail}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* REVERSE STRESS TESTING PANEL */}
      {activeSubTab === 'reverse_stress' && (
        <div className="rounded-xl p-5 bg-[#0d1321]/95 border border-indigo-400/30 space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-3">
            <div>
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white tracking-tight">
                  反向压力测试求根器 (Reverse Stress Testing Breakpoint Solver)
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">
                  二分逆向收敛
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                反向求解：震中经济体减记达到多少百分比时，专户损失刚好击穿风控容忍限额（破防临界点 α*）。
              </p>
            </div>

            <div className="flex items-center gap-3 bg-[#131b2e] px-3 py-1.5 rounded-xl border border-white/[0.08]">
              <span className="text-xs text-slate-300 font-medium">容忍限额:</span>
              <input
                type="range"
                min="10"
                max="150"
                step="5"
                value={targetLossLimitMn}
                onChange={(e) => setTargetLossLimitMn(parseFloat(e.target.value))}
                className="w-24 accent-amber-400 cursor-pointer"
              />
              <span className="font-mono text-sm font-bold text-amber-300 w-16 text-right">${targetLossLimitMn}M</span>
            </div>
          </div>

          {/* Safety Margin Gauge */}
          <div
            data-testid="reverse-stress-cushion-gauge"
            className="p-4 rounded-xl bg-[#070a12]/90 border border-white/[0.08] grid grid-cols-1 md:grid-cols-4 gap-3 atlas-specular-bar"
          >
            <div className="space-y-1">
              <span className="text-[11px] text-slate-400 font-mono">当前情景冲击</span>
              <div className="text-xl font-bold font-mono text-rose-400">{safetyMetrics.currentHaircut}% 减记</div>
              <p className="text-[10px] text-slate-400">当前专户预期减记: -${stressResult.totalLossMn}M</p>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] text-indigo-300 font-mono">破防临界点 (α*)</span>
              <div className="text-xl font-bold font-mono text-white">{safetyMetrics.criticalHaircutPct}% 减记</div>
              <p className="text-[10px] text-slate-400">达到限额 ${safetyMetrics.targetLossLimitMn}M 的触发点</p>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] text-slate-400 font-mono">安全缓冲垫 (Safety Cushion)</span>
              <div className={`text-xl font-bold font-mono ${safetyMetrics.safetyCushionPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {safetyMetrics.safetyCushionPct > 0 ? '+' : ''}{safetyMetrics.safetyCushionPct}%
              </div>
              <p className="text-[10px] text-slate-400">
                {safetyMetrics.safetyCushionPct >= 0 ? '距离破防仍有吸收空间' : '已突破预设风险限额'}
              </p>
            </div>

            <div className="space-y-1 flex flex-col justify-center items-start">
              <span className="text-[11px] text-slate-400 font-mono">安全评估状态</span>
              <span className={`text-xs font-bold font-mono px-3 py-1 rounded-lg border ${safetyMetrics.badgeColor}`}>
                {safetyMetrics.statusZh}
              </span>
              <span className="text-[10px] text-slate-400 mt-0.5">迭代 {safetyMetrics.iterations} 轮精准收敛</span>
            </div>

            {/* Visual Horizon Scale Bar */}
            <div className="col-span-1 md:col-span-4 pt-3 border-t border-white/[0.08] space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                <span>0% 极小冲击</span>
                <span className="text-amber-300 font-semibold">主权违约减记率光学标尺 (0% – 100%)</span>
                <span>100% 完全违约</span>
              </div>
              <div className="relative w-full h-4 bg-slate-900 rounded-full overflow-hidden border border-white/10">
                <div
                  className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-emerald-500/25 via-emerald-500/40 to-amber-500/40 transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.max(0, safetyMetrics.criticalHaircutPct))}%` }}
                />
                <div
                  className="absolute top-0 bottom-0 right-0 bg-rose-500/25 border-l border-rose-500"
                  style={{ width: `${Math.max(0, 100 - safetyMetrics.criticalHaircutPct)}%` }}
                />
                <div
                  className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_8px_#ffffff] z-10 transition-all duration-300"
                  style={{ left: `${Math.min(99, Math.max(1, safetyMetrics.currentHaircut))}%` }}
                  title={`当前设定冲击: ${safetyMetrics.currentHaircut}%`}
                />
                <div
                  className="absolute top-0 bottom-0 w-1 bg-amber-400 shadow-[0_0_8px_#f59e0b] z-10 transition-all duration-300"
                  style={{ left: `${Math.min(99, Math.max(1, safetyMetrics.criticalHaircutPct))}%` }}
                  title={`破防临界点 α*: ${safetyMetrics.criticalHaircutPct}%`}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                <span className="text-slate-300 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-white shadow-sm inline-block" /> 当前冲击 {safetyMetrics.currentHaircut}%
                </span>
                <span className="text-amber-300 font-semibold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> 临界点 α* {safetyMetrics.criticalHaircutPct}%
                </span>
                <span className={safetyMetrics.safetyCushionPct >= 0 ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
                  缓冲空间: {safetyMetrics.safetyCushionPct > 0 ? `+${safetyMetrics.safetyCushionPct}%` : `${safetyMetrics.safetyCushionPct}%`}
                </span>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-indigo-950/30 border border-indigo-500/20 text-xs text-slate-300 leading-relaxed">
            💡 <strong>风控启示</strong>：当前在 ${safetyMetrics.targetLossLimitMn}M 风控预算下，土耳其前沿主权违约减记率只要不超过 <strong>{safetyMetrics.criticalHaircutPct}%</strong>，您的专户就不会发生爆仓危机。建议将动态对冲触发线设在临界点前 5%（即 {Math.max(5, safetyMetrics.criticalHaircutPct - 5).toFixed(1)}%）。
          </div>
        </div>
      )}

      {/* HISTORICAL CRISIS PARALLEL REPLAY PANEL */}
      {activeSubTab === 'crisis_backtest' && (
        <div
          data-testid="crisis-backtest-matrix"
          className="rounded-xl p-5 bg-[#0d1321]/95 border border-sky-400/30 space-y-4 shadow-xl"
        >
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
            <div>
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-sky-400" />
                <h3 className="text-sm font-bold text-white tracking-tight">
                  历史经典危机平行穿越回测 (Historical Crisis Parallel Replay Matrix)
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30 font-semibold">
                  同一持仓 · 四维投射
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                将您当前的专户持仓（AUM ${crisisReplay.baseAumUsdMn}M）同时投射进历史上 3 次最著名的宏观流动性雪崩情景，比对极端回撤与安全垫。
              </p>
            </div>

            <div className="text-xs font-mono text-slate-400">
              风控限额: <strong className="text-white">${targetLossLimitMn}M</strong>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {crisisReplay.scenarios.map(sc => (
              <div
                key={sc.id}
                className={`p-4 rounded-xl border flex flex-col justify-between space-y-3 transition-all ${
                  sc.id === 'current_active'
                    ? 'bg-amber-950/20 border-amber-500/40'
                    : 'bg-[#070a12]/90 border-white/[0.08]'
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-bold text-white">{sc.labelZh}</span>
                    <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${
                      sc.isBreached ? 'bg-rose-950 text-rose-300 border-rose-500/30' : 'bg-emerald-950 text-emerald-300 border-emerald-500/30'
                    }`}>
                      {sc.isBreached ? '超限' : '在控'}
                    </span>
                  </div>
                  <div className="text-xl font-bold font-mono text-rose-400">
                    -${sc.totalLossMn}M
                  </div>
                  <div className="text-xs font-mono text-slate-400">
                    回撤幅度: <strong className="text-slate-300">-{sc.lossPct}%</strong>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    {sc.desc}
                  </p>

                  {/* Micro Visual Stress vs Limit Bar */}
                  <div className="space-y-1 pt-1">
                    <div className="flex justify-between text-[10px] font-mono text-slate-400">
                      <span>损失占限额</span>
                      <span className={sc.isBreached ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
                        {Math.round((sc.totalLossMn / targetLossLimitMn) * 100)}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-900 border border-white/5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          sc.isBreached ? 'bg-gradient-to-r from-amber-500 to-rose-500' : 'bg-gradient-to-r from-emerald-500 to-sky-500'
                        }`}
                        style={{ width: `${Math.min(100, Math.round((sc.totalLossMn / targetLossLimitMn) * 100))}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-[11px] font-mono">
                  <span className="text-slate-400">限额安全垫:</span>
                  <span className={sc.cushionMn >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                    {sc.cushionMn >= 0 ? `+${sc.cushionMn}M` : `-${Math.abs(sc.cushionMn)}M`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* v7.0 Direction A3: 500-TRIAL MONTE CARLO FAT-TAIL & 99% CVaR (EXPECTED SHORTFALL) PANEL */}
      {activeSubTab === 'monte_carlo' && monteCarloResult && (
        <div
          data-testid="monte-carlo-tail-panel"
          className="rounded-xl p-5 bg-[#0d1321]/95 border border-rose-500/35 space-y-4 shadow-xl atlas-card-elevated atlas-specular-bar"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold">
                  v7.0 肥尾随机引擎 · {monteCarloResult.trialsCount} 次抽样
                </span>
                <h3 className="text-sm font-bold text-white tracking-tight">
                  蒙特卡洛肥尾损失分布与 99% 期望短缺 (Expected Shortfall / CVaR)
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                基于确定性随机数种子 ({monteCarloResult.seed}) 与 Student-t 肥尾跳跃扩散模型，模拟未对冲（红）与帕累托对冲后（绿）的尾部损失概率密度分布。
              </p>
            </div>
            <div className="text-xs font-mono px-3 py-1.5 rounded-lg bg-emerald-950/35 border border-emerald-500/35 text-emerald-300 font-bold">
              99% CVaR 尾部削峰: +${monteCarloResult.tailReductionMn}M (-{monteCarloResult.tailReductionPct}%)
            </div>
          </div>

          {/* 4 Tail-Risk Comparison Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono">
            <div className="p-3.5 rounded-xl bg-[#070a12]/90 border border-white/[0.08] space-y-1">
              <span className="text-[11px] text-slate-400">期望压力损失均值 (Expected Mean)</span>
              <div className="text-lg font-bold text-white">
                -${monteCarloResult.unhedgedStats.meanLossMn}M
              </div>
              <div className="text-[11px] text-emerald-400">
                对冲后均值: -${monteCarloResult.hedgedStats.meanLossMn}M
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#070a12]/90 border border-amber-500/30 space-y-1">
              <span className="text-[11px] text-amber-300">95% 置信度压力 VaR</span>
              <div className="text-lg font-bold text-amber-300">
                -${monteCarloResult.unhedgedStats.var95Mn}M
              </div>
              <div className="text-[11px] text-emerald-400">
                对冲后 95% VaR: -${monteCarloResult.hedgedStats.var95Mn}M
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#070a12]/90 border border-rose-500/35 space-y-1">
              <span className="text-[11px] text-rose-300">99% 极端分位 VaR</span>
              <div className="text-lg font-bold text-rose-400">
                -${monteCarloResult.unhedgedStats.var99Mn}M
              </div>
              <div className="text-[11px] text-emerald-400">
                对冲后 99% VaR: -${monteCarloResult.hedgedStats.var99Mn}M
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-rose-950/25 border border-rose-500/50 space-y-1">
              <span className="text-[11px] text-rose-200 font-bold">99% 期望短缺 (CVaR / ES 极值均值)</span>
              <div className="text-lg font-black text-rose-400">
                -${monteCarloResult.unhedgedStats.cvar99Mn}M
              </div>
              <div className="text-[11px] text-emerald-300 font-bold">
                对冲后 99% CVaR: -${monteCarloResult.hedgedStats.cvar99Mn}M
              </div>
            </div>
          </div>

          {/* Dual Distribution Histogram (Unhedged vs Hedged) */}
          <div className="p-4 rounded-xl bg-[#070a12]/90 border border-white/[0.08] space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-bold text-white">
                500 次随机冲击损失频数分布直方图 (Unhedged vs. Pareto-Hedged PDF)
              </span>
              <div className="flex items-center gap-4 text-[11px] font-mono">
                <span className="flex items-center gap-1.5 text-rose-300">
                  <span className="w-2.5 h-2.5 rounded-sm bg-rose-500/80 inline-block" /> 未对冲裸敞口分布
                </span>
                <span className="flex items-center gap-1.5 text-emerald-300">
                  <span className="w-2.5 h-2.5 rounded-sm bg-emerald-400 inline-block" /> 帕累托对冲后截尾分布
                </span>
              </div>
            </div>

            <div className="grid grid-cols-12 gap-1.5 items-end h-36 pt-4 px-2 border-b border-white/10">
              {monteCarloResult.histogramBins.map((bin) => {
                const uHeight = Math.min(100, Math.max(4, Math.round(bin.unhedgedPct * 2.6)));
                const hHeight = Math.min(100, Math.max(4, Math.round(bin.hedgedPct * 2.6)));
                return (
                  <div key={bin.binIndex} className="flex flex-col items-center h-full justify-end group">
                    <div className="w-full flex items-end justify-center gap-0.5 h-28">
                      <div
                        className={`w-1/2 rounded-t transition-all ${bin.isTailZone ? 'bg-rose-500' : 'bg-rose-500/65'}`}
                        style={{ height: `${bin.unhedgedCount > 0 ? uHeight : 2}%` }}
                        title={`未对冲 [${bin.binLabel}]: ${bin.unhedgedCount} 次 (${bin.unhedgedPct}%)`}
                      />
                      <div
                        className="w-1/2 bg-emerald-400/85 rounded-t transition-all"
                        style={{ height: `${bin.hedgedCount > 0 ? hHeight : 2}%` }}
                        title={`对冲后 [${bin.binLabel}]: ${bin.hedgedCount} 次 (${bin.hedgedPct}%)`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-12 gap-1 text-center font-mono text-[11px] text-slate-400">
              {monteCarloResult.histogramBins.map((bin) => (
                <div key={bin.binIndex} className="truncate" title={bin.binLabel}>
                  ${Math.round(bin.maxMn)}M
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* v7.0 Direction C1: MULTI-PORTFOLIO STRESS ARENA */}
      {activeSubTab === 'portfolio_arena' && arenaResult && (
        <div
          data-testid="multi-portfolio-arena"
          className="rounded-xl p-5 bg-[#0d1321]/95 border border-emerald-500/35 space-y-4 shadow-xl atlas-card-elevated atlas-specular-bar"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                  v7.0 多策略同屏竞技场
                </span>
                <h3 className="text-sm font-bold text-white tracking-tight">
                  多专户横向抗压竞技场 (Multi-Portfolio Stress Resilience Arena)
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                将全部机构预设专户与自定义组合置于同一宏观冲击下横向比拼：净回撤率、99% CVaR 尾部极值、破防临界点 α* 与最优对冲 ROI。
              </p>
            </div>
            <div className="text-xs font-mono px-3 py-1.5 rounded-lg bg-emerald-950/35 border border-emerald-500/35 text-emerald-300 font-bold">
              最佳抗压冠军: {cleanZhName(arenaResult.mostResilientPortfolioName)}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-sans">
              <thead>
                <tr className="border-b border-white/[0.08] text-[11px] text-slate-400 bg-[#070a12]/70 font-mono">
                  <th className="py-2.5 px-3">专户策略名称</th>
                  <th className="py-2.5 px-2 text-right">基准规模</th>
                  <th className="py-2.5 px-2 text-right">未对冲减记</th>
                  <th className="py-2.5 px-2 text-right">99% CVaR (ES)</th>
                  <th className="py-2.5 px-2 text-right">破防临界点 (α*)</th>
                  <th className="py-2.5 px-2 text-right">安全缓冲垫</th>
                  <th className="py-2.5 px-2 text-right">最优对冲 ROI</th>
                  <th className="py-2.5 px-2 text-center">韧性评分</th>
                  <th className="py-2.5 px-3 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06] text-slate-200 font-mono">
                {arenaResult.arenaRows.map((row) => {
                  const isCurrent = row.id === selectedPresetId;
                  return (
                    <tr
                      key={row.id}
                      className={`transition-colors ${isCurrent ? 'bg-indigo-950/35' : 'hover:bg-white/[0.03]'}`}
                    >
                      <td className="py-3 px-3 font-sans font-bold text-white flex items-center gap-2">
                        <span>{cleanZhName(row.name)}</span>
                        {isCurrent && (
                          <span className="text-[11px] font-mono px-1.5 py-0.2 rounded bg-indigo-500/25 text-indigo-300 border border-indigo-400/40">
                            当前激活
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-2 text-right text-slate-300">${row.baseAumUsdMn}M</td>
                      <td className="py-3 px-2 text-right text-rose-400 font-bold">
                        -${row.unhedgedLossMn}M (-{row.lossPct}%)
                      </td>
                      <td className="py-3 px-2 text-right text-rose-300">
                        -${row.cvar99Mn}M (-{row.cvar99Pct}%)
                      </td>
                      <td className="py-3 px-2 text-right text-amber-300 font-bold">
                        {row.criticalHaircutPct}%
                      </td>
                      <td className={`py-3 px-2 text-right font-bold ${row.safetyCushionPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {row.safetyCushionPct > 0 ? `+${row.safetyCushionPct}%` : `${row.safetyCushionPct}%`}
                      </td>
                      <td className="py-3 px-2 text-right text-emerald-300 font-bold">
                        {row.bestHedgeRoi}x (残余 -${row.hedgedResidualLossMn}M)
                      </td>
                      <td className="py-3 px-2 text-center">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/35 text-emerald-300 font-bold text-[11px]">
                          {row.resilienceScore} 分
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => {
                            soundFx.playChime();
                            setSelectedPresetId(row.id);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-[#131b2e] hover:bg-indigo-600/40 border border-white/10 text-[11px] font-sans font-semibold text-indigo-200 hover:text-white cursor-pointer transition-all"
                        >
                          {isCurrent ? '正在检视' : '切换至此专户'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. Detailed Positions Table & Interactive Editor */}
      <div className="rounded-xl p-4 bg-[#0d1321]/95 border border-white/[0.08] space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3
              className="text-sm font-bold text-white flex items-center gap-2 flex-wrap"
              title="Position Exposures & Stress Breakdown"
            >
              <span>持仓穿透与压力明细清单</span>
              <span className="text-xs font-mono text-indigo-300">({stressResult.positionResults.length} 项标的)</span>
              {activeGranularBondSummary && (
                <span
                  data-testid="active-granular-bond-summary"
                  className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                >
                  加权久期 {activeGranularBondSummary.weightedDurationYears} Years · 加权 OAS {activeGranularBondSummary.weightedOasBps} bps · +150bps 估值冲击 -${activeGranularBondSummary.totalLossMn}M
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              展示各持仓资产类别风险贝塔、离岸母国穿透标记与一阶/二阶损失归因
            </p>
          </div>

          {selectedPresetId === 'custom' && (
            <button
              onClick={() => {
                soundFx.playTick();
                const newId = `c-${Date.now()}`;
                setCustomPositions([
                  ...customPositions,
                  { id: newId, name: '新增跨国信贷标的', country: 'US', assetClass: 'corporate_credit', weight: 0.1, amountMn: 50.0 }
                ]);
              }}
              className="h-7 px-2.5 rounded-lg atlas-pill-active text-xs font-semibold flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>添加持仓标的</span>
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead>
              <tr className="border-b border-white/[0.08] text-[11px] text-slate-400 bg-[#070a12]/60">
                <th className="py-2.5 px-3 font-medium">持仓标的</th>
                <th className="py-2.5 px-2 font-medium">管辖区</th>
                <th className="py-2.5 px-2 font-medium">资产类别</th>
                <th className="py-2.5 px-2 text-right font-medium">初始敞口</th>
                <th className="py-2.5 px-2 text-right font-medium">一阶直接损失</th>
                <th className="py-2.5 px-2 text-right font-medium">二阶级联传染</th>
                <th className="py-2.5 px-2 text-right font-medium">总减记额</th>
                <th className="py-2.5 px-2 text-right font-medium">减记幅度</th>
                <th className="py-2.5 px-3 text-right font-medium">压力后余值</th>
                <th className="py-2.5 px-2 text-center font-medium">风险等级</th>
                {selectedPresetId === 'custom' && <th className="py-2.5 px-2 text-center font-medium">操作</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05] text-slate-200 tabular-nums">
              {stressResult.positionResults.map((pos) => {
                const assetLabel = ASSET_CLASS_PROFILES[pos.assetClass]?.name_zh.split(' (')[0] || pos.assetClass;
                const riskLabelMap = { HIGH: '高危', MEDIUM: '关注', LOW: '稳健' };
                return (
                  <tr key={pos.id} className="hover:bg-white/[0.03] transition-colors">
                    <td className="py-2.5 px-3 font-medium text-white flex items-center gap-1.5 flex-wrap" title={pos.name}>
                      {pos.ticker && (
                        <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-400/30 font-semibold">
                          {pos.ticker}
                        </span>
                      )}
                      <span>{cleanZhName(pos.name)}</span>
                      {typeof pos.durationYears === 'number' && (
                        <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-300 border border-white/[0.08]">
                          D {pos.durationYears}Y · OAS {pos.oasBps ?? 0}bp
                        </span>
                      )}
                      {pos.isLookedThrough && (
                        <span className="text-[11px] font-mono px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                          已穿透
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-2 font-mono">
                      <span className="px-1.5 py-0.5 rounded bg-[#131b2e] border border-white/[0.08] text-indigo-300 font-semibold">
                        {pos.country}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-slate-300">{assetLabel}</td>
                    <td className="py-2.5 px-2 text-right font-mono font-semibold">${pos.amountMn}M</td>
                    <td className="py-2.5 px-2 text-right font-mono text-rose-400">-${pos.firstOrderLossMn}M</td>
                    <td className="py-2.5 px-2 text-right font-mono text-indigo-300">-${pos.secondOrderLossMn}M</td>
                    <td className="py-2.5 px-2 text-right font-mono font-bold text-rose-400">-${pos.lossMn}M</td>
                    <td className="py-2.5 px-2 text-right font-mono text-amber-300 font-semibold">-{pos.rawLossPct}%</td>
                    <td className="py-2.5 px-3 text-right font-mono text-emerald-400 font-semibold">${pos.stressedValueMn}M</td>
                    <td className="py-2.5 px-2 text-center">
                      <span
                        title={pos.riskTier}
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                          pos.riskTier === 'HIGH'
                            ? 'bg-rose-500/15 text-rose-300 border border-rose-500/35'
                            : pos.riskTier === 'MEDIUM'
                              ? 'bg-amber-500/15 text-amber-300 border border-amber-500/35'
                              : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/35'
                        }`}
                      >
                        {riskLabelMap[pos.riskTier] || pos.riskTier}
                      </span>
                    </td>
                    {selectedPresetId === 'custom' && (
                      <td className="py-2.5 px-2 text-center">
                        <button
                          onClick={() => {
                            soundFx.playTick();
                            setCustomPositions(customPositions.filter(p => p.id !== pos.id));
                          }}
                          className="text-slate-500 hover:text-rose-400 transition-colors p-1 cursor-pointer"
                          title="删除持仓"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. Pareto Optimal Hedge Solver Modal */}
      {isOptimizerModalOpen && (
        <div
          data-testid="optimal-hedge-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in font-sans"
          onClick={() => setIsOptimizerModalOpen(false)}
        >
          <div
            className="w-full max-w-2xl bg-[#0a0f1c] border border-emerald-500/40 rounded-2xl shadow-2xl p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="text-sm font-bold text-white tracking-tight">
                    帕累托最优对冲处方求解器 (Pareto Optimal Hedge Solver)
                  </h3>
                  <p className="text-xs text-slate-400">
                    在对冲成本预算约束内，求解净挽回资本最高的处方组合与有效前沿
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOptimizerModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-[#070a12] border border-white/[0.08] flex items-center justify-between gap-3 text-xs">
              <span className="text-slate-300 font-medium">对冲成本预算上限:</span>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="20"
                  max="200"
                  step="10"
                  value={hedgeBudgetBps}
                  onChange={(e) => setHedgeBudgetBps(parseInt(e.target.value, 10))}
                  className="w-28 accent-emerald-400 cursor-pointer"
                />
                <span className="font-mono text-emerald-300 font-bold w-16 text-right">{hedgeBudgetBps} bps</span>
              </div>
            </div>

            {/* Recommended Box */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/40 to-indigo-950/30 border border-emerald-500/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>首选对冲处方: {optimalHedgePackage.bestRecommendation.name}</span>
                </span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/35 font-bold">
                  ROI: {optimalHedgePackage.bestRecommendation.protectionRoi}x
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs font-mono pt-1">
                <div className="p-2 rounded bg-slate-900/80">
                  <span className="text-[10px] text-slate-400">对冲总成本</span>
                  <div className="text-amber-300 font-bold">{optimalHedgePackage.bestRecommendation.costBps} bps (${optimalHedgePackage.bestRecommendation.hedgeCostMn}M)</div>
                </div>
                <div className="p-2 rounded bg-slate-900/80">
                  <span className="text-[10px] text-slate-400">毛冲销减记</span>
                  <div className="text-emerald-300 font-bold">+${optimalHedgePackage.bestRecommendation.grossSavedMn}M</div>
                </div>
                <div className="p-2 rounded bg-slate-900/80">
                  <span className="text-[10px] text-slate-400">净保全资本</span>
                  <div className="text-emerald-400 font-bold">+${optimalHedgePackage.bestRecommendation.netSavedMn}M</div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setIsOptimizerModalOpen(false)}
                className="px-3 py-1.5 rounded-lg border border-white/[0.1] text-xs text-slate-300 hover:text-white cursor-pointer"
              >
                取消
              </button>
              <button
                onClick={() => handleApplyOptimalHedges(optimalHedgePackage.bestRecommendation.hedgeIds)}
                data-testid="apply-optimal-hedge-btn"
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
              >
                <Check className="w-3.5 h-3.5" />
                <span>一键应用此对冲方案</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
