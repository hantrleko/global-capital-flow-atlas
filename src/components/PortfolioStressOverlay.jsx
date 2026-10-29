import React, { useState, useMemo, useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import {
  Briefcase, TrendingDown, ShieldAlert, Sparkles, Sliders,
  ArrowRight, FileText, Download, Copy, Check, RotateCcw,
  Plus, Trash2, PieChart, AlertCircle, Info, ChevronRight,
  Layers, DollarSign, Activity, ShieldCheck
} from 'lucide-react';
import soundFx from '../utils/soundEffects';
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
  liveClearingShockMap = null
}) {
  const [selectedPresetId, setSelectedPresetId] = useState('global_macro_balanced');
  const [selectedScenarioId, setSelectedScenarioId] = useState(() => {
    return (liveClearingShockMap && Object.keys(liveClearingShockMap).length > 0) ? 'live_custom_contagion' : 'tr_sovereign_crisis';
  });
  const [stressMultiplier, setStressMultiplier] = useState(1.0);
  const [enableLookThrough, setEnableLookThrough] = useState(true);
  const [activeHedges, setActiveHedges] = useState(['cds_hedge']);
  const [copiedMemo, setCopiedMemo] = useState(false);

  // Custom portfolio state
  const [customPositions, setCustomPositions] = useState([
    { id: 'c-1', name: '美股科技成长 (US Tech Equities)', country: 'US', assetClass: 'equities', weight: 0.35, amountMn: 175.0 },
    { id: 'c-2', name: '德国主权债券 (German Bunds)', country: 'DE', assetClass: 'sovereign_debt', weight: 0.25, amountMn: 125.0 },
    { id: 'c-3', name: '英国金融同业 (UK Interbank)', country: 'GB', assetClass: 'interbank_loans', weight: 0.15, amountMn: 75.0 },
    { id: 'c-4', name: '土耳其美元外债 (Turkey External Debt)', country: 'TR', assetClass: 'sovereign_debt', weight: 0.15, amountMn: 75.0 },
    { id: 'c-5', name: '开曼群岛离岸资产 (Cayman SPV / Fund)', country: 'KY', assetClass: 'equities', weight: 0.10, amountMn: 50.0 }
  ]);
  const [customAum, setCustomAum] = useState(500.0);

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

  // Render ECharts Loss Attribution Horizontal Bar Chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    if (!chartInstanceRef.current) {
      chartInstanceRef.current = echarts.init(chartContainerRef.current);
    }
    const chart = chartInstanceRef.current;

    const victims = [...stressResult.positionResults].reverse(); // bottom-up
    const categories = victims.map(v => v.name.length > 18 ? v.name.slice(0, 16) + '...' : v.name);
    const directLosses = victims.map(v => v.firstOrderLossMn);
    const secondOrderLosses = victims.map(v => v.secondOrderLossMn);
    const remainingValues = victims.map(v => v.stressedValueMn);

    const option = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: '#090d16',
        borderColor: '#334155',
        textStyle: { color: '#e2e8f0', fontSize: 11 },
        formatter: (params) => {
          const idx = params[0].dataIndex;
          const pos = victims[idx];
          return `
            <div class="font-mono text-xs p-1">
              <div class="font-bold text-white mb-1">${pos.name} (${pos.country})</div>
              <div>原始持仓: $${pos.amountMn}M</div>
              <div class="text-rose-400">直接冲击损失: -$${pos.firstOrderLossMn}M</div>
              <div class="text-purple-400">二阶传染损失: -$${pos.secondOrderLossMn}M</div>
              <div class="text-amber-400 font-bold border-t border-slate-700 mt-1 pt-1">
                总减记: -$${pos.lossMn}M (-${pos.rawLossPct}%)
              </div>
              <div class="text-emerald-400">压力后余值: $${pos.stressedValueMn}M</div>
            </div>
          `;
        }
      },
      legend: {
        data: ['压力后余值', '一阶直接损失', '二阶网络传染损失'],
        textStyle: { color: '#94a3b8', fontSize: 11 },
        top: 0,
        right: 10
      },
      grid: {
        top: 36,
        left: 10,
        right: 40,
        bottom: 15,
        containLabel: true
      },
      xAxis: {
        type: 'value',
        axisLine: { lineStyle: { color: '#334155' } },
        splitLine: { lineStyle: { color: '#1e293b', type: 'dashed' } },
        axisLabel: {
          color: '#64748b',
          fontSize: 10,
          formatter: '${value}M'
        }
      },
      yAxis: {
        type: 'category',
        data: categories,
        axisLine: { lineStyle: { color: '#334155' } },
        axisLabel: { color: '#cbd5e1', fontSize: 11 }
      },
      series: [
        {
          name: '压力后余值',
          type: 'bar',
          stack: 'total',
          itemStyle: { color: '#1e293b' },
          data: remainingValues
        },
        {
          name: '一阶直接损失',
          type: 'bar',
          stack: 'total',
          itemStyle: { color: '#f43f5e' },
          data: directLosses
        },
        {
          name: '二阶网络传染损失',
          type: 'bar',
          stack: 'total',
          itemStyle: { color: '#a855f7' },
          data: secondOrderLosses
        }
      ]
    };

    chart.setOption(option);

    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [stressResult]);

  // Copy Risk Memo
  const handleCopyRiskMemo = () => {
    soundFx.playChime();
    const memo = `### EUGENE FINANCE · 机构组合压力映射风控简报 (Portfolio Stress Overlay)
- **基准组合**: ${stressResult.scenarioName} | **报告期**: ${selectedQuarter}
- **组合基础资产规模 (Base AUM)**: $${stressResult.baseAumUsdMn}M
- **宏观压力情景**: ${stressResult.scenarioName} (倍数: ${stressMultiplier}x)
- **预期资产净减记 (Total Stress Loss)**: -$${stressResult.totalLossMn}M (-${stressResult.portfolioLossPct}%)
- **直接主权减记 (First-Order)**: -$${stressResult.firstOrderLossMn}M
- **二阶级联传染损失 (Second-Order Domino)**: -$${stressResult.secondOrderLossMn}M
- **极值风险价值 (99% 1-Month Stress VaR)**: -$${stressResult.stressVaR99Mn}M
- **受损敞口前三位**:
${stressResult.topVictims.map((v, i) => `  ${i + 1}. ${v.name} (${v.country}): 减记 -$${v.lossMn}M (-${v.rawLossPct}%, 贡献 ${v.lossContributionPct}%)`).join('\n')}
- **对冲与资本防线建议**:
${stressResult.hedgingAdvice.map((h, i) => `  ${i + 1}. [${h.priority}] ${h.title}: ${h.desc}`).join('\n')}
- **模型来源**: BIS CBS Table B Ultimate Risk & Eisenberg-Noe 2001 Clearing Engine`;

    navigator.clipboard.writeText(memo);
    setCopiedMemo(true);
    setTimeout(() => setCopiedMemo(false), 2500);
  };

  return (
    <div className="space-y-4 text-slate-200 animate-fade-in" data-testid="portfolio-stress-overlay">
      
      {/* 1. Header Banner & Presets Selector */}
      <div className="glass-panel rounded-2xl p-4 sm:p-5 border border-slate-800 bg-slate-950/80 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-400/40 flex items-center justify-center text-purple-400 shrink-0 shadow-[0_0_15px_rgba(168,85,247,0.25)]">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  我的组合压力映射 (Portfolio Stress Overlay)
                </h2>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40">
                  Phase 3 · v2.0.0
                </span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  机构定制风控
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 max-w-3xl leading-relaxed">
                将国际清算银行 (BIS) 公共信贷网络与 Eisenberg-Noe 级联清算模型直接穿透映射至用户机构投资账户，把全球宏观波动转化为真实账户资产减记、二阶多米诺传染与对冲防线方案。
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start lg:self-auto shrink-0">
            <button
              onClick={handleCopyRiskMemo}
              data-testid="copy-risk-memo-btn"
              className="h-8 px-3 rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
              title="复制机构级风控审计备忘录 (Markdown)"
            >
              {copiedMemo ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
              <span>{copiedMemo ? '已复制风控简报' : '复制风控简报'}</span>
            </button>

            {onOpenChartCard && (
              <button
                onClick={onOpenChartCard}
                className="h-8 px-3 rounded-lg border border-purple-500/40 bg-purple-950/40 hover:bg-purple-900/50 text-purple-200 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                title="导出投行级组合压力卡片"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>导出研报卡片</span>
              </button>
            )}
          </div>
        </div>

        {/* Portfolio Preset Switcher Pills */}
        <div className="mt-4 pt-3.5 border-t border-slate-800/80 flex items-center gap-2 overflow-x-auto scrollbar-none text-xs">
          <span className="text-[11px] font-mono text-slate-400 shrink-0 flex items-center gap-1">
            <Briefcase className="w-3 h-3 text-purple-400" />
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
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedPresetId === preset.id
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'bg-slate-900/90 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <span>{preset.name.split(' (')[0]}</span>
              <span className="text-[10px] font-mono opacity-80">(${preset.baseAumUsdMn}M)</span>
            </button>
          ))}
          <button
            onClick={() => {
              soundFx.playTick();
              setSelectedPresetId('custom');
            }}
            data-testid="preset-custom"
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              selectedPresetId === 'custom'
                ? 'bg-purple-600 text-white shadow-md'
                : 'bg-slate-900/90 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <span>⚙️ 自定义组合</span>
            <span className="text-[10px] font-mono opacity-80">(${customAum}M)</span>
          </button>
        </div>
      </div>

      {/* 2. Top Executive KPI Bar (5 Core Portfolio Risk Metrics) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        {/* Base AUM */}
        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-mono text-slate-400">组合基准资产规模</span>
          <div className="text-xl font-black font-mono text-white mt-1">
            ${stressResult.baseAumUsdMn}M
          </div>
          <span className="text-[10px] text-slate-500 font-mono mt-1">
            {stressResult.positionsCount} 项持仓标的
          </span>
        </div>

        {/* Total Stress Loss */}
        <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/40 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-rose-300 font-semibold">预期压力净减记</span>
            <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div className="text-xl font-black font-mono text-rose-400 mt-1">
            -${stressResult.totalLossMn}M
          </div>
          <div className="flex items-center justify-between gap-1 mt-1">
            <span className="text-[10px] font-mono font-bold text-rose-300">
              回撤: -{stressResult.portfolioLossPct}%
            </span>
            {stressResult.netSavedMn > 0 && (
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                挽回 +${stressResult.netSavedMn}M
              </span>
            )}
          </div>
        </div>

        {/* First-Order vs Second-Order */}
        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-mono text-slate-400">直接 vs 级联传染损失</span>
          <div className="text-sm font-bold font-mono text-white mt-1 flex items-baseline justify-between">
            <span className="text-rose-400">直接: ${stressResult.firstOrderLossMn}M</span>
            <span className="text-purple-400">间接: ${stressResult.secondOrderLossMn}M</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-slate-800 mt-1.5 overflow-hidden flex">
            <div 
              className="h-full bg-rose-500" 
              style={{ width: `${Math.round((stressResult.firstOrderLossMn / Math.max(0.1, stressResult.totalLossMn)) * 100)}%` }} 
            />
            <div 
              className="h-full bg-purple-500" 
              style={{ width: `${Math.round((stressResult.secondOrderLossMn / Math.max(0.1, stressResult.totalLossMn)) * 100)}%` }} 
            />
          </div>
        </div>

        {/* Stressed AUM */}
        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-mono text-slate-400">压力后资产净值 (Stressed AUM)</span>
          <div className="text-xl font-black font-mono text-sky-400 mt-1">
            ${stressResult.stressedAumMn}M
          </div>
          <span className="text-[10px] text-slate-400 font-mono mt-1">
            资本留存率: {Math.round((stressResult.stressedAumMn / Math.max(1, stressResult.baseAumUsdMn)) * 1000) / 10}%
          </span>
        </div>

        {/* Stress VaR 99% */}
        <div className="p-3.5 rounded-xl bg-purple-950/30 border border-purple-500/40 shadow-sm flex flex-col justify-between col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-purple-300 font-semibold">99% 压力 VaR (1M)</span>
            <ShieldAlert className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="text-xl font-black font-mono text-purple-300 mt-1">
            -${stressResult.stressVaR99Mn}M
          </div>
          <span className="text-[10px] text-purple-400 font-mono mt-1">
            巴塞尔 III 压力覆盖倍数 1.35x
          </span>
        </div>
      </div>

      {/* 3. Interactive Scenario & Sensitivity Control Bar */}
      <div className="glass-panel rounded-xl p-3.5 border border-slate-800 bg-slate-900/80 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Scenario Selector */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-mono text-slate-400 font-bold shrink-0">
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
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  selectedScenarioId === 'live_custom_contagion'
                    ? 'bg-amber-500 text-slate-950 shadow-md animate-pulse'
                    : 'bg-amber-950/60 text-amber-300 hover:text-white border border-amber-500/50'
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
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                  selectedScenarioId === sc.id
                    ? 'bg-rose-600 text-white shadow-sm font-semibold'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {sc.name.split(' (')[0]}
              </button>
            ))}
          </div>
        </div>

        {/* Controls: Multiplier & Look-Through */}
        <div className="flex items-center gap-3 ml-auto">
          {/* Stress Multiplier */}
          <div className="flex items-center gap-2 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
            <span className="text-[11px] font-mono text-slate-400">压力倍数:</span>
            <input 
              type="range"
              min="0.5"
              max="2.5"
              step="0.1"
              value={stressMultiplier}
              onChange={(e) => setStressMultiplier(parseFloat(e.target.value))}
              className="w-20 accent-purple-500 cursor-pointer"
            />
            <span className="font-mono font-bold text-purple-300 w-8">{stressMultiplier}x</span>
          </div>

          {/* Look-Through OFC Toggle */}
          <button
            onClick={() => {
              soundFx.playTick();
              setEnableLookThrough(!enableLookThrough);
            }}
            data-testid="toggle-portfolio-lookthrough"
            className={`px-2.5 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              enableLookThrough
                ? 'bg-amber-950/60 border-amber-500/50 text-amber-300'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
            }`}
            title="一键穿透开曼/香港等离岸壳实体，还原至母国真实风险承担者计算损失"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>{enableLookThrough ? '离岸穿透: 已开启' : '离岸穿透: 注册地'}</span>
          </button>
        </div>
      </div>

      {/* 4. Main Analytics: ECharts Chart & Hedging Advice */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Chart: Loss Attribution Waterfall (2 Cols) */}
        <div className="lg:col-span-2 glass-panel rounded-xl p-4 border border-slate-800 bg-slate-900/60 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>持仓标的压力减记拆解 (Portfolio Loss Attribution by Asset)</span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                一阶直接主权外债减记（红）与二阶网络级联多米诺传染损失（紫）
              </p>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
              Float64 守恒
            </span>
          </div>

          <div 
            ref={chartContainerRef} 
            className="w-full h-[320px] sm:h-[350px]"
            data-testid="portfolio-stress-chart"
          />
        </div>

        {/* Right Col: Actionable Institutional Hedging Advice & Active Hedge Cockpit */}
        <div className="glass-panel rounded-xl p-4 border border-slate-800 bg-slate-900/60 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-white">主动宏观对冲防护台 (Active Hedge Overlay)</h3>
            </div>
            {stressResult.netSavedMn > 0 && (
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/40 font-bold animate-pulse">
                保全 +${stressResult.netSavedMn}M
              </span>
            )}
          </div>

          {/* Interactive Hedge Strategies Switches */}
          <div className="space-y-2">
            {[
              { id: 'cds_hedge', title: '买入主权违约互换 (Sovereign CDS)', tag: '80% 冲销', desc: '锁定高危主权外债头寸违约减记' },
              { id: 'derisk_ofc', title: '离岸 SPV 调降至短期美债 (T-Bills)', tag: '50% 避险', desc: '开曼/离岸 PE 敞口削减 50% 转入 0-Beta HQLA' },
              { id: 'swap_basis_collar', title: '跨货币互换基差套保 (Basis Collar)', tag: '70% 减震', desc: '对冲外汇掉期表外保证金追缴' }
            ].map(h => {
              const isChecked = activeHedges.includes(h.id);
              return (
                <label
                  key={h.id}
                  data-testid={`hedge-toggle-${h.id}`}
                  className={`p-2 rounded-lg border flex items-start gap-2.5 cursor-pointer transition-all ${
                    isChecked
                      ? 'bg-emerald-950/30 border-emerald-500/50 text-white'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
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
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className={isChecked ? 'text-emerald-300' : 'text-slate-300'}>{h.title}</span>
                      <span className="text-[9px] font-mono px-1 rounded bg-slate-800 text-emerald-400 border border-emerald-500/30">{h.tag}</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">{h.desc}</p>
                  </div>
                </label>
              );
            })}
          </div>

          {/* Hedge Capital Preserved Bar */}
          {stressResult.netSavedMn > 0 && (
            <div className="p-2.5 rounded-lg bg-emerald-950/50 border border-emerald-500/40 text-xs font-mono flex items-center justify-between">
              <span className="text-emerald-300 font-bold">对冲净挽回资本:</span>
              <span className="text-emerald-400 font-black text-sm">+{selectedCurrency === 'USD' ? '$' : ''}{stressResult.netSavedMn}M</span>
            </div>
          )}

          {/* AI Hedging Advice List */}
          <div className="space-y-2 pt-1 border-t border-slate-800">
            <span className="text-[11px] font-mono text-slate-400 font-semibold">AI 宏观研判备忘:</span>
            {stressResult.hedgingAdvice.slice(0, 2).map((adv, idx) => (
              <div 
                key={idx} 
                className="p-2 rounded-lg bg-slate-950/80 border border-slate-800/80 space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200">{adv.title}</span>
                  <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold ${
                    adv.priority === 'CRITICAL' 
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' 
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  }`}>
                    {adv.priority}
                  </span>
                </div>
                <p className="text-[10px] leading-relaxed text-slate-400">
                  {adv.desc}
                </p>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
            <span>最大受损标的: <strong className="text-rose-400">{stressResult.topVictims[0]?.name || 'N/A'}</strong></span>
            <button
              onClick={() => onOpenContagion && onOpenContagion()}
              className="text-sky-400 hover:text-sky-300 flex items-center gap-1 cursor-pointer font-mono text-xs"
            >
              <span>查看级联传染源</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* 5. Detailed Positions Table & Interactive Editor */}
      <div className="glass-panel rounded-xl p-4 border border-slate-800 bg-slate-900/60 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>持仓穿透与压力明细清单 (Position Exposures & Stress Breakdown)</span>
              <span className="text-xs font-mono text-purple-400">({stressResult.positionResults.length} 标的)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              可查看单个资产类别贝塔、母国穿透状态及直接/间接损失分摊
            </p>
          </div>

          {selectedPresetId === 'custom' && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  soundFx.playTick();
                  const newId = `c-${Date.now()}`;
                  setCustomPositions([
                    ...customPositions,
                    { id: newId, name: '新外债/股权标的', country: 'US', assetClass: 'corporate_credit', weight: 0.1, amountMn: 50.0 }
                  ]);
                }}
                className="h-7 px-2.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer shadow-sm"
              >
                <Plus className="w-3 h-3" />
                <span>添加持仓标的</span>
              </button>
            </div>
          )}
        </div>

        {/* Scrollable Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 text-[11px] text-slate-400 uppercase bg-slate-950/40">
                <th className="py-2.5 px-3">标的名称与代码</th>
                <th className="py-2.5 px-2">主权地区</th>
                <th className="py-2.5 px-2">资产类别</th>
                <th className="py-2.5 px-2 text-right">初始敞口</th>
                <th className="py-2.5 px-2 text-right">直接损失 (1阶)</th>
                <th className="py-2.5 px-2 text-right">级联损失 (2阶)</th>
                <th className="py-2.5 px-2 text-right">总减记额</th>
                <th className="py-2.5 px-2 text-right">减记幅度</th>
                <th className="py-2.5 px-3 text-right">压力后余值</th>
                <th className="py-2.5 px-2 text-center">风险评级</th>
                {selectedPresetId === 'custom' && <th className="py-2.5 px-2 text-center">操作</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {stressResult.positionResults.map((pos) => {
                const assetLabel = ASSET_CLASS_PROFILES[pos.assetClass]?.name_zh.split(' (')[0] || pos.assetClass;
                return (
                  <tr key={pos.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-3 font-sans font-medium text-white flex items-center gap-1.5">
                      <span>{pos.name}</span>
                      {pos.isLookedThrough && (
                        <span className="text-[9px] font-mono px-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          已穿透
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-2">
                      <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700/80 text-sky-300 font-bold">
                        {pos.country}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 font-sans text-slate-300">{assetLabel}</td>
                    <td className="py-2.5 px-2 text-right font-bold">${pos.amountMn}M</td>
                    <td className="py-2.5 px-2 text-right text-rose-400">-${pos.firstOrderLossMn}M</td>
                    <td className="py-2.5 px-2 text-right text-purple-400">-${pos.secondOrderLossMn}M</td>
                    <td className="py-2.5 px-2 text-right font-bold text-rose-400">-${pos.lossMn}M</td>
                    <td className="py-2.5 px-2 text-right text-amber-400 font-bold">-{pos.rawLossPct}%</td>
                    <td className="py-2.5 px-3 text-right text-emerald-400 font-bold">${pos.stressedValueMn}M</td>
                    <td className="py-2.5 px-2 text-center">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        pos.riskTier === 'HIGH' 
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' 
                          : (pos.riskTier === 'MEDIUM' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40')
                      }`}>
                        {pos.riskTier}
                      </span>
                    </td>
                    {selectedPresetId === 'custom' && (
                      <td className="py-2.5 px-2 text-center">
                        <button
                          onClick={() => {
                            soundFx.playTick();
                            setCustomPositions(customPositions.filter(p => p.id !== pos.id));
                          }}
                          className="text-slate-500 hover:text-rose-400 transition-colors p-1"
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
