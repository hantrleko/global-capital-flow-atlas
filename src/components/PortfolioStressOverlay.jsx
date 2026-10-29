import React, { useState, useMemo, useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import {
  Briefcase, TrendingDown, ShieldAlert, Sparkles,
  Copy, Check, Plus, Trash2, ChevronRight, ShieldCheck
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

export default function PortfolioStressOverlay({
  dataset,
  selectedQuarter = '2026Q1',
  selectedCurrency = 'USD',
  onOpenChartCard,
  onOpenContagion,
  liveClearingShockMap = null,
  onPortfolioResultChange
}) {
  const [selectedPresetId, setSelectedPresetId] = useState('global_macro_balanced');
  const [selectedScenarioId, setSelectedScenarioId] = useState(() => {
    return (liveClearingShockMap && Object.keys(liveClearingShockMap).length > 0) ? 'live_custom_contagion' : 'tr_sovereign_crisis';
  });
  const [stressMultiplier, setStressMultiplier] = useState(1.0);
  const [enableLookThrough, setEnableLookThrough] = useState(true);
  const [activeHedges, setActiveHedges] = useState(['cds_hedge']);
  const [chartMode, setChartMode] = useState('loss_delta'); // 'loss_delta' | 'full_aum'
  const [copiedMemo, setCopiedMemo] = useState(false);

  // Custom portfolio state
  const [customPositions, setCustomPositions] = useState([
    { id: 'c-1', name: '美股科技成长 (US Tech Equities)', country: 'US', assetClass: 'equities', weight: 0.35, amountMn: 175.0 },
    { id: 'c-2', name: '德国主权债券 (German Bunds)', country: 'DE', assetClass: 'sovereign_debt', weight: 0.25, amountMn: 125.0 },
    { id: 'c-3', name: '英国金融同业 (UK Interbank)', country: 'GB', assetClass: 'interbank_loans', weight: 0.15, amountMn: 75.0 },
    { id: 'c-4', name: '土耳其美元外债 (Turkey External Debt)', country: 'TR', assetClass: 'sovereign_debt', weight: 0.15, amountMn: 75.0 },
    { id: 'c-5', name: '开曼群岛离岸资产 (Cayman SPV / Fund)', country: 'KY', assetClass: 'equities', weight: 0.10, amountMn: 50.0 }
  ]);
  const [customAum] = useState(500.0);

  const chartContainerRef = useRef(null);
  const chartInstanceRef = useRef(null);

  // Active Portfolio definition
  const activePortfolio = useMemo(() => {
    if (selectedPresetId === 'custom') {
      return {
        id: 'custom',
        name: '自定义机构自营组合 (Custom Institutional Portfolio)',
        desc: '由用户自定义配置各主权国家敞口、资产类别与 AUM 规模',
        baseAumUsdMn: customAum,
        currency: selectedCurrency,
        positions: customPositions
      };
    }
    return PORTFOLIO_PRESETS.find(p => p.id === selectedPresetId) || PORTFOLIO_PRESETS[0];
  }, [selectedPresetId, customPositions, customAum, selectedCurrency]);

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
                  v4.0.0 · 专户风控
                </span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  BIS CBS 穿透映射
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 max-w-3xl leading-relaxed">
                将 BIS 跨国银行信贷网络与 Eisenberg-Noe 级联清算向量直接映射至机构专户持仓，拆解一阶主权减记、二阶多米诺传染与主动对冲净保全效应。
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start lg:self-auto shrink-0">
            <button
              onClick={handleCopyRiskMemo}
              data-testid="copy-risk-memo-btn"
              className="h-8 px-3 rounded-lg border border-white/[0.1] bg-[#131b2e] hover:bg-[#182238] text-slate-200 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer"
              title="复制机构级风控审计备忘录 (Markdown)"
            >
              {copiedMemo ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
              <span>{copiedMemo ? '已复制风控简报' : '复制风控简报'}</span>
            </button>

            {onOpenChartCard && (
              <button
                onClick={onOpenChartCard}
                className="h-8 px-3 rounded-lg border border-indigo-400/35 bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-200 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                title="导出投行级组合压力卡片 (Publication-Ready Chart Card)"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
                <span>导出研报卡片</span>
              </button>
            )}
          </div>
        </div>

        {/* Portfolio Preset Switcher Pills */}
        <div className="mt-3.5 pt-3 border-t border-white/[0.06] flex items-center gap-2 overflow-x-auto scrollbar-none text-xs">
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
        </div>
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

      {/* 4. Main Analytics: Signal-First Loss Attribution Chart & Active Hedge Cockpit */}
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
      </div>

      {/* 5. Detailed Positions Table & Interactive Editor */}
      <div className="rounded-xl p-4 bg-[#0d1321]/95 border border-white/[0.08] space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3
              className="text-sm font-bold text-white flex items-center gap-2"
              title="Position Exposures & Stress Breakdown"
            >
              <span>持仓穿透与压力明细清单</span>
              <span className="text-xs font-mono text-indigo-300">({stressResult.positionResults.length} 项标的)</span>
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
                    <td className="py-2.5 px-3 font-medium text-white flex items-center gap-1.5" title={pos.name}>
                      <span>{cleanZhName(pos.name)}</span>
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
    </div>
  );
}
