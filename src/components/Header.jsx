import React, { useState, useEffect } from 'react';
import { 
  Play, Pause, SkipBack, SkipForward, Globe, ShieldAlert, 
  DollarSign, Activity, Database, Calendar, TrendingUp, Layers,
  Search, Coins, X, Sun, Moon, ArrowRightLeft, Clock, Sparkles,
  Zap, Radio, Command, HelpCircle, Split, Volume2, VolumeX, Bot
} from 'lucide-react';
import soundFx from '../utils/soundEffects';
import { HISTORICAL_REGIMES } from '../utils/macroScenarios';

export const NAVIGATION_DOMAINS = [
  {
    id: 'flows',
    title: '🌐 资本网络与流向',
    short: '流向拓扑',
    tabs: [
      { id: 'map', label: '信贷流向地图', desc: 'Bilateral Claims & Positions' },
      { id: 'network', label: '金融网络拓扑', desc: 'Centrality & Core-Periphery' },
      { id: 'routing', label: '资本路由矩阵', desc: 'Sankey Routing & NxN Heatmap' }
    ]
  },
  {
    id: 'vulnerability',
    title: '⚡ 早期预警与传染',
    short: '系统性风险',
    tabs: [
      { id: 'ews', label: '巴塞尔早期预警 (EWS)', desc: 'Credit Gap & CCyB Buffer' },
      { id: 'contagion', label: '银行级联传染模拟', desc: 'Eisenberg-Noe Contagion' },
      { id: 'shadow', label: '影子银行与非银透视', desc: 'Offshore NBFIs & FX Swaps' },
      { id: 'maturity', label: '期限结构与转期挤兑', desc: 'CBS Residual Maturity' }
    ]
  },
  {
    id: 'currency',
    title: '💵 美元与货币格局',
    short: '货币格局',
    tabs: [
      { id: 'usd', label: '美元融资与部门信贷', desc: 'Global Dollar Credit' },
      { id: 'currency', label: '多极货币竞争与错配', desc: 'Currency Hegemony & CMI' },
      { id: 'swaps', label: '央行互换线与基差', desc: 'Central Bank Swaps & Basis' },
      { id: 'fragmentation', label: '地缘金融碎片与阵营', desc: 'Geopolitical Blocs' }
    ]
  },
  {
    id: 'sovereign',
    title: '🛡️ 主权风险与实证',
    short: '主权与模型',
    tabs: [
      { id: 'risk', label: '国家风险与外债敞口', desc: 'CBS Exposure & Stress Testing' },
      { id: 'compare', label: '多国宏观雷达对照', desc: 'Multi-Jurisdiction Benchmark' },
      { id: 'gravity', label: '实证引力模型探索', desc: 'Empirical Banking Gravity' }
    ]
  },
  {
    id: 'intelligence',
    title: '📑 研报与历史复盘',
    short: '历史研报',
    tabs: [
      { id: 'comparison', label: '跨周期宏观对比', desc: 'Macro Regime Diff Engine' },
      { id: 'playbook', label: '历史风暴情景剧场', desc: 'Crisis Case Studies & Swaps' },
      { id: 'dossier', label: '宏观研报与数据导出', desc: 'Research Memo & BIS SDMX' }
    ]
  }
];

export default function Header({
  quarters,
  selectedQuarter,
  onSelectQuarter,
  isPlaying,
  onTogglePlay,
  playSpeed = 1,
  onChangePlaySpeed,
  globalMacroMap,
  activeTab,
  onSelectTab,
  countries = [],
  onSelectCountry,
  theme = 'dark',
  onToggleTheme,
  onOpenCommandPalette,
  onOpenShortcuts,
  onOpenMacroAi,
  isSoundMuted = false,
  onToggleSound
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const currentMacro = globalMacroMap[selectedQuarter] || {};
  const currentQuarterIdx = quarters.indexOf(selectedQuarter);

  // Active domain calculation
  const activeDomain = NAVIGATION_DOMAINS.find(d => d.tabs.some(t => t.id === activeTab)) || NAVIGATION_DOMAINS[0];
  const [selectedDomainId, setSelectedDomainId] = useState(activeDomain.id);

  useEffect(() => {
    const matched = NAVIGATION_DOMAINS.find(d => d.tabs.some(t => t.id === activeTab));
    if (matched && matched.id !== selectedDomainId) {
      setSelectedDomainId(matched.id);
    }
  }, [activeTab]);

  const currentDisplayDomain = NAVIGATION_DOMAINS.find(d => d.id === selectedDomainId) || activeDomain;

  // Search filter
  const searchResults = searchQuery.trim() === '' ? [] : countries.filter(c => 
    c.name_zh.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Find if current quarter is a special historical regime
  const currentRegime = HISTORICAL_REGIMES.find(r => r.quarter === selectedQuarter);

  const prevQuarter = () => {
    if (currentQuarterIdx > 0) {
      soundFx.playTick();
      onSelectQuarter(quarters[currentQuarterIdx - 1]);
    }
  };

  const nextQuarter = () => {
    if (currentQuarterIdx < quarters.length - 1) {
      soundFx.playTick();
      onSelectQuarter(quarters[currentQuarterIdx + 1]);
    }
  };

  return (
    <header className="border-b border-slate-800/80 bg-slate-950/85 sticky top-0 z-30 backdrop-blur-xl shadow-2xl">
      {/* Top Bar: Title & Status */}
      <div className="max-w-[1780px] w-full mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-4">
        {/* Logo & Platform Title */}
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-blue-600/30 to-indigo-600/30 border border-blue-400/50 flex items-center justify-center text-blue-400 shadow-[0_0_22px_rgba(59,130,246,0.35)]">
            <Globe className="w-6 h-6 animate-pulse-subtle text-sky-400" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-lg md:text-xl font-bold tracking-tight text-white flex items-center gap-2">
                BIS Global Capital Flow Atlas
                <span className="text-xs font-semibold text-slate-300 bg-slate-800/90 px-2 py-0.5 rounded-md border border-slate-700">
                  全球资本流动图谱
                </span>
              </h1>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-mono bg-emerald-500/15 text-emerald-300 border border-emerald-500/35 px-2.5 py-0.5 rounded-full shadow-[0_0_12px_rgba(16,185,129,0.25)]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                BIS 官方季度频率标准 (SDMX 2.1 Audited)
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              以国际清算银行居住地 (LBS) 与综合银行统计 (CBS) 为基石 · 国际信贷、美元流动性与国家主权敞口监测台
            </p>
          </div>
        </div>

        {/* Global Country Search & Key Metrics Badges */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Pro Terminal Command Palette Trigger */}
          {onOpenCommandPalette && (
            <button
              onClick={onOpenCommandPalette}
              className="px-2.5 py-1.5 rounded-xl border border-slate-700/80 bg-slate-900/90 text-slate-300 hover:text-white hover:border-slate-500 flex items-center gap-1.5 text-xs font-mono transition-all shadow-sm group"
              title="快速全局检索与命令面板 (Ctrl+K 或 /)"
            >
              <Command className="w-3.5 h-3.5 text-sky-400 group-hover:scale-110 transition-transform" />
              <span className="hidden sm:inline text-[11px]">命令面板</span>
              <kbd className="px-1 py-0.2 rounded bg-slate-800 text-[10px] text-slate-400 border border-slate-700">⌘K</kbd>
            </button>
          )}

          {/* BIS Macro AI Copilot Trigger */}
          {onOpenMacroAi && (
            <button
              onClick={() => {
                soundFx.playChime();
                onOpenMacroAi();
              }}
              className="px-2.5 py-1.5 rounded-xl border border-blue-500/50 bg-gradient-to-r from-blue-900/60 to-indigo-900/60 text-sky-200 hover:text-white hover:border-blue-400 flex items-center gap-1.5 text-xs font-semibold transition-all shadow-[0_0_15px_rgba(59,130,246,0.25)] group cursor-pointer"
              title="打开 BIS 宏观 AI 决策推演智能体 (Macro Copilot 2.0)"
            >
              <Bot className="w-3.5 h-3.5 text-sky-400 group-hover:scale-110 transition-transform animate-pulse-subtle" />
              <span className="hidden md:inline text-[11px]">宏观 AI 大脑</span>
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-ping" />
            </button>
          )}

          {/* Sound Mute / Unmute Toggle */}
          {onToggleSound && (
            <button
              onClick={onToggleSound}
              className={`p-2 rounded-xl border flex items-center justify-center text-xs transition-all shadow-sm ${
                isSoundMuted
                  ? 'bg-slate-900/90 border-slate-700/80 text-slate-500 hover:text-slate-300'
                  : 'bg-blue-950/40 border-blue-500/40 text-sky-400 hover:bg-blue-900/40'
              }`}
              title={isSoundMuted ? '开启彭博终端机械原声音效' : '已开启彭博音效 (点击静音)'}
            >
              {isSoundMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-sky-400" />}
            </button>
          )}

          {/* Keyboard Shortcuts Trigger */}
          {onOpenShortcuts && (
            <button
              onClick={onOpenShortcuts}
              className="p-1.5 rounded-xl border border-slate-700/80 bg-slate-900/90 text-slate-400 hover:text-white hover:border-slate-500 transition-all text-xs"
              title="键盘快捷键指引 (按 ? 随时打开)"
            >
              <HelpCircle className="w-4 h-4 text-slate-300" />
            </button>
          )}

          {/* Theme Switcher Button */}
          {onToggleTheme && (
            <button
              onClick={onToggleTheme}
              className={`p-2 rounded-xl border flex items-center gap-1.5 text-xs font-semibold transition-all shadow-sm ${
                theme === 'light'
                  ? 'bg-amber-100 border-amber-300 text-amber-900 hover:bg-amber-200'
                  : 'bg-slate-900/90 border-slate-700/80 text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
              title={theme === 'light' ? '切换为彭博终端暗色模式' : '切换为金融时报浅色纸媒模式'}
            >
              {theme === 'light' ? (
                <>
                  <Sun className="w-4 h-4 text-amber-600" />
                  <span className="hidden sm:inline text-[11px]">FT 浅色纸媒</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-sky-400" />
                  <span className="hidden sm:inline text-[11px]">彭博暗夜</span>
                </>
              )}
            </button>
          )}

          {/* Quick Country Search Bar */}
          <div className="relative min-w-[210px]">
            <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-700/80 rounded-xl px-2.5 py-1.5 focus-within:border-sky-500 focus-within:ring-1 focus-within:ring-sky-500/50 transition-all">
              <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="快速检索经济体 (中/EN/代码)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none w-full"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-white">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Search Dropdown */}
            {searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1.5 bg-slate-900/95 backdrop-blur-xl border border-slate-700 rounded-xl shadow-2xl z-50 max-h-60 overflow-y-auto divide-y divide-slate-800">
                {searchResults.map(c => (
                  <div
                    key={c.code}
                    onClick={() => {
                      onSelectCountry?.(c.code);
                      setSearchQuery('');
                    }}
                    className="p-2.5 hover:bg-blue-600/20 cursor-pointer flex items-center justify-between text-xs transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sky-400 font-bold">{c.code}</span>
                      <span className="font-medium text-white">{c.name_zh}</span>
                      <span className="text-[10px] text-slate-400">({c.name})</span>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                      {c.region}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Metric 1: Total Claims */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl px-3.5 py-1.5 min-w-[135px] shadow-sm">
            <div className="text-[10px] uppercase tracking-wider text-slate-400 flex items-center gap-1 font-mono">
              <TrendingUp className="w-3 h-3 text-sky-400" /> 全球跨境总债权
            </div>
            <div className="text-base font-bold text-white font-mono flex items-baseline gap-1 mt-0.5">
              ${((currentMacro.total_cross_border_claims_usd_bn || 0) / 1000).toFixed(2)}
              <span className="text-[11px] font-normal text-slate-400">万亿 USD</span>
            </div>
          </div>

          {/* Metric 2: USD Share */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl px-3.5 py-1.5 min-w-[135px] shadow-sm">
            <div className="text-[10px] uppercase tracking-wider text-slate-400 flex items-center gap-1 font-mono">
              <DollarSign className="w-3 h-3 text-emerald-400" /> 美元计价占比
            </div>
            <div className="text-base font-bold text-emerald-400 font-mono mt-0.5">
              {currentMacro.global_usd_share_pct || 0}%
              <span className="text-[11px] font-normal text-slate-400 ml-1.5">
                (${((currentMacro.total_usd_cross_border_bn || 0) / 1000).toFixed(2)}T)
              </span>
            </div>
          </div>

          {/* Metric 3: BIS USD Funding Stress */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl px-3.5 py-1.5 min-w-[150px] shadow-sm">
            <div className="text-[10px] uppercase tracking-wider text-slate-400 flex items-center gap-1 font-mono">
              <Activity className="w-3 h-3 text-amber-400" /> 美元融资压力指数
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-base font-bold font-mono ${
                (currentMacro.bis_usd_funding_stress_index || 0) > 65 
                  ? 'text-rose-400' 
                  : (currentMacro.bis_usd_funding_stress_index || 0) > 45 
                  ? 'text-amber-400' 
                  : 'text-emerald-400'
              }`}>
                {currentMacro.bis_usd_funding_stress_index || 0}
              </span>
              <div className="w-16 h-2 bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-300 ${
                    (currentMacro.bis_usd_funding_stress_index || 0) > 65 
                      ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]' 
                      : (currentMacro.bis_usd_funding_stress_index || 0) > 45 
                      ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]' 
                      : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]'
                  }`}
                  style={{ width: `${Math.min(100, currentMacro.bis_usd_funding_stress_index || 0)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Structured Domain Navigation Bar */}
      <div className="border-t border-slate-800/80 bg-slate-900/60 px-4 py-2 space-y-1.5 shadow-md">
        <div className="max-w-[1780px] w-full mx-auto">
          {/* Tier 1: 5 Intelligence Domains & Historical Regimes */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/60 pb-1.5">
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
              <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider hidden sm:inline mr-1">
                分析域:
              </span>
              {NAVIGATION_DOMAINS.map(dom => {
                const isDomainActive = dom.id === currentDisplayDomain.id;
                const hasCurrentTab = dom.tabs.some(t => t.id === activeTab);
                return (
                  <button
                    key={dom.id}
                    onClick={() => {
                      soundFx.playTick();
                      setSelectedDomainId(dom.id);
                      if (!hasCurrentTab) {
                        onSelectTab(dom.tabs[0].id);
                      }
                    }}
                    className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                      isDomainActive
                        ? 'bg-blue-600/25 text-sky-300 border border-blue-500/50 shadow-[0_0_12px_rgba(59,130,246,0.3)]'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/60 border border-transparent'
                    }`}
                  >
                    <span>{dom.title}</span>
                    {hasCurrentTab && (
                      <span className="w-1.5 h-1.5 rounded-full bg-sky-400 shadow-[0_0_6px_#38bdf8] animate-pulse" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Quick jump to historical regimes */}
            <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-400 shrink-0">
              <span className="text-[11px] text-slate-500 flex items-center gap-1 font-mono">
                <Calendar className="w-3 h-3 text-sky-400" /> 历史风暴情景:
              </span>
              {HISTORICAL_REGIMES.map(reg => (
                <button
                  key={reg.quarter}
                  onClick={() => {
                    soundFx.playTick();
                    onSelectQuarter(reg.quarter);
                  }}
                  className={`px-2 py-0.5 rounded text-[11px] font-mono transition-all border cursor-pointer ${
                    selectedQuarter === reg.quarter
                      ? 'bg-blue-500/25 text-blue-300 border-blue-400/60 font-bold shadow-[0_0_8px_rgba(59,130,246,0.3)]'
                      : 'bg-slate-800/60 text-slate-400 border-slate-700/60 hover:text-white hover:bg-slate-700'
                  }`}
                  title={reg.description}
                >
                  {reg.quarter}
                </button>
              ))}
            </div>
          </div>

          {/* Tier 2: Specific Functional Tabs of Active Domain */}
          <div className="flex items-center gap-2 overflow-x-auto pt-1">
            <span className="text-[11px] font-mono text-sky-400/70 hidden sm:inline">
              ↳ 功能模块:
            </span>
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {currentDisplayDomain.tabs.map(tab => {
                const isTabActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      soundFx.playTick();
                      onSelectTab(tab.id);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                      isTabActive
                        ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(59,130,246,0.45)] font-semibold scale-[1.02]'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/80 font-medium'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span className="text-[10px] hidden xl:inline opacity-70 font-mono">
                      ({tab.desc})
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Timeline & Playback Bar */}
      <div className="bg-slate-950/95 px-4 py-2.5 border-t border-slate-800/80 shadow-inner">
        <div className="max-w-[1780px] w-full mx-auto flex flex-col xl:flex-row items-center justify-between gap-3">
          {/* Controls: Play/Pause, Step, Quarter Dropdown & Year Jumpers */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={prevQuarter}
              disabled={currentQuarterIdx === 0}
              className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="上一季度 (← 方向键)"
            >
              <SkipBack className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onTogglePlay}
              className={`px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-semibold shadow-md transition-all ${
                isPlaying 
                  ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-[0_0_12px_rgba(217,119,6,0.5)]' 
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-[0_0_12px_rgba(59,130,246,0.5)]'
              }`}
              title="按空格键 Space 播放或暂停"
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isPlaying ? '暂停回放' : '动态播放'}</span>
            </button>
            <button
              onClick={nextQuarter}
              disabled={currentQuarterIdx === quarters.length - 1}
              className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="下一季度 (→ 方向键)"
            >
              <SkipForward className="w-3.5 h-3.5" />
            </button>

            {/* Playback Speed Multiplier */}
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-xs font-mono ml-0.5" title="回放速率调节">
              {[0.5, 1, 1.5, 2].map(spd => (
                <button
                  key={spd}
                  onClick={() => onChangePlaySpeed?.(spd)}
                  className={`px-1.5 py-0.5 rounded text-[10px] sm:text-[11px] transition-all font-medium ${
                    playSpeed === spd
                      ? 'bg-sky-500/30 text-sky-300 font-bold border border-sky-400/40 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title={`设置回放倍速: ${spd}x`}
                >
                  {spd}x
                </button>
              ))}
            </div>

            {/* Direct Quarter Selector Dropdown */}
            <div className="flex items-center gap-1 bg-slate-900 border border-blue-500/40 rounded-lg px-2 py-1 shadow-[0_0_10px_rgba(59,130,246,0.2)]">
              <span className="text-[10px] font-mono text-slate-400">季度:</span>
              <select
                value={selectedQuarter}
                onChange={(e) => onSelectQuarter(e.target.value)}
                className="bg-transparent text-sky-300 font-mono font-bold text-xs focus:outline-none cursor-pointer"
              >
                {quarters.map((q, idx) => (
                  <option key={q} value={q} className="bg-slate-900 text-white font-mono">
                    {q} ({idx + 1}/28)
                  </option>
                ))}
              </select>
            </div>

            {/* Quick Year Jump Buttons */}
            <div className="hidden sm:flex items-center gap-1 bg-slate-900/90 border border-slate-800 p-0.5 rounded-lg ml-1">
              <span className="text-[10px] text-slate-500 px-1.5 font-mono">年份:</span>
              {['2018', '2019', '2020', '2021', '2022', '2023', '2024'].map(yr => {
                const isCurrentYear = selectedQuarter.startsWith(yr);
                return (
                  <button
                    key={yr}
                    onClick={() => onSelectQuarter(`${yr}Q4`)}
                    className={`px-2 py-0.5 rounded text-[11px] font-mono transition-all ${
                      isCurrentYear
                        ? 'bg-blue-600 text-white font-bold shadow-sm'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                    title={`跳转到 ${yr} 年`}
                  >
                    {yr}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Timeline Range Slider with cyber glow track */}
          <div className="flex-1 max-w-lg w-full flex items-center gap-2.5">
            <span className="text-[11px] font-mono text-slate-500 shrink-0">{quarters[0]}</span>
            <input
              type="range"
              min={0}
              max={quarters.length - 1}
              value={currentQuarterIdx}
              onChange={(e) => onSelectQuarter(quarters[parseInt(e.target.value, 10)])}
              className="w-full accent-sky-400 bg-slate-800 h-2 rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-[11px] font-mono text-slate-500 shrink-0">{quarters[quarters.length - 1]}</span>
          </div>

          {/* Historical Macro Event Context Pill */}
          <div className="text-xs flex items-center gap-2 max-w-md truncate shrink-0">
            {currentRegime ? (
              <div className="bg-blue-500/15 border border-blue-500/40 text-blue-300 px-3 py-1 rounded-xl text-xs truncate flex items-center gap-2 shadow-[0_0_10px_rgba(59,130,246,0.2)]">
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
                <span className="font-semibold">{currentRegime.name}:</span>
                <span className="opacity-90">{currentRegime.description}</span>
              </div>
            ) : (
              <div className="text-slate-400 text-xs font-mono">
                环比信贷增速: <span className="text-white font-semibold">{currentMacro.global_qoq_growth_pct || 0}%</span> · 美元融资压力: <span className="text-amber-400">{currentMacro.bis_usd_funding_stress_index || 0}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
