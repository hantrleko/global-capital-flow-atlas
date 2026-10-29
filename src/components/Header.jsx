import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Play, Pause, SkipBack, SkipForward, Search, X, Sun, Moon,
  Sparkles, Volume2, VolumeX, Bot, BookOpen, FileText, Sliders,
  History, UploadCloud, Check, Share2, Briefcase, ChevronDown, ArrowRight
} from 'lucide-react';
import EugeneLogo from './EugeneLogo';
import soundFx from '../utils/soundEffects';
import { NAVIGATION_DOMAINS, getTabTaskMeta } from '../utils/navigationConfig';
import { getDataClassification } from '../utils/dataClassification';
import { CAUSAL_WORKFLOW_STEPS } from '../utils/financialGlossary';

export { NAVIGATION_DOMAINS, getTabTaskMeta };

export default function Header({
  quarters = [],
  selectedQuarter = '2026Q1',
  onSelectQuarter,
  isPlaying = false,
  onTogglePlay,
  activeTab = 'map',
  onSelectTab,
  countries = [],
  onSelectCountry,
  theme = 'dark',
  onToggleTheme,
  onOpenMacroAi,
  onOpenIntro,
  onOpenShockSandbox,
  onToggleMilestones,
  isMilestonesOpen = false,
  selectedCurrency = 'USD',
  onChangeCurrency,
  onOpenCustomData,
  customFileName = null,
  isSoundMuted = false,
  onToggleSound,
  onOpenAppendix,
  onCopyDeepLink,
  onOpenChangelog,
  onOpenChartCard,
  viewMode = 'focus',
  onToggleViewMode,
  onOpenInvestigationModal,
  isBeginnerMode = true,
  onToggleBeginnerMode
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isToolboxOpen, setIsToolboxOpen] = useState(false);
  const toolboxRef = useRef(null);
  const currentQuarterIdx = quarters.indexOf(selectedQuarter);

  const activeDomain = NAVIGATION_DOMAINS.find(d => d.tabs.some(t => t.id === activeTab)) || NAVIGATION_DOMAINS[0];
  const [selectedDomainId, setSelectedDomainId] = useState(activeDomain.id);

  useEffect(() => {
    const matched = NAVIGATION_DOMAINS.find(d => d.tabs.some(t => t.id === activeTab));
    if (matched && matched.id !== selectedDomainId) {
      setSelectedDomainId(matched.id);
    }
  }, [activeTab]);

  // Close toolbox popover on outside click or Escape
  useEffect(() => {
    if (!isToolboxOpen) return;
    const handleClickOutside = (e) => {
      if (toolboxRef.current && !toolboxRef.current.contains(e.target)) {
        setIsToolboxOpen(false);
      }
    };
    const handleEsc = (e) => {
      if (e.key === 'Escape') setIsToolboxOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleEsc);
    };
  }, [isToolboxOpen]);

  const currentDisplayDomain = NAVIGATION_DOMAINS.find(d => d.id === selectedDomainId) || activeDomain;
  const classification = useMemo(() => getDataClassification(selectedQuarter), [selectedQuarter]);

  const searchResults = searchQuery.trim() === '' ? [] : countries.filter(c =>
    c.name_zh.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
    <header className="sticky top-0 z-40 bg-[#070a12]/95 backdrop-blur-md border-b border-white/[0.08] shadow-md">
      <div className="max-w-[1780px] w-full mx-auto px-3 sm:px-5">
        {/* ROW 1: Compact 44px Institutional Bar (Brand + Quarter Timeline Capsule + Primary Tools & Toolbox Popover) */}
        <div className="h-11 flex items-center justify-between gap-2 border-b border-white/[0.06]">
          {/* Left: Brand Identity */}
          <div className="flex items-center shrink-0 min-w-0">
            <EugeneLogo size="md" subtitle="BIS 宏观审慎投研终端" />
          </div>

          {/* Center: Unified Quarter Timeline & Data Provenance Capsule */}
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="flex items-center bg-[#0d1321] border border-white/[0.08] rounded-lg p-0.5">
              <button
                onClick={prevQuarter}
                disabled={currentQuarterIdx <= 0}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800/70 disabled:opacity-30 cursor-pointer"
                title="上一季度 (←)"
              >
                <SkipBack className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={onTogglePlay}
                className="px-1.5 py-0.5 rounded text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800/70 flex items-center cursor-pointer"
                title={isPlaying ? '暂停演进 (Space)' : '自动播放季度演进 (Space)'}
              >
                {isPlaying ? <Pause className="w-3 h-3 text-amber-400" /> : <Play className="w-3 h-3 text-emerald-400" />}
              </button>
              <button
                onClick={nextQuarter}
                disabled={currentQuarterIdx >= quarters.length - 1}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800/70 disabled:opacity-30 cursor-pointer"
                title="下一季度 (→)"
              >
                <SkipForward className="w-3.5 h-3.5" />
              </button>
            </div>

            <span
              id="current-quarter-display"
              data-testid="current-quarter-display"
              className="text-xs font-mono font-bold text-white px-2 py-0.5 bg-[#0d1321] border border-white/[0.1] rounded-md tabular-nums"
            >
              {selectedQuarter}
            </span>

            <span
              className={`inline-flex items-center gap-1 text-[11px] font-mono font-medium px-2 py-0.5 rounded-full border whitespace-nowrap ${classification.badgeClass}`}
              title={classification.provenance}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${classification.dotClass}`} />
              <span>{classification.label}</span>
            </span>

            {/* Scenario vs Official Quick Switch (Visible on sm+) */}
            {selectedQuarter <= '2026Q1' ? (
              <button
                onClick={() => {
                  soundFx.playChime();
                  onSelectQuarter('2026Q4');
                }}
                className="hidden sm:flex h-7 px-2.5 rounded-lg bg-[#131b2e] hover:bg-[#182238] border border-indigo-400/30 text-indigo-200 hover:text-white text-[11px] font-medium items-center gap-1 transition-all cursor-pointer whitespace-nowrap"
                title="切换至 2026Q3–Q4 宏观前瞻情景与压力敏感性推演"
              >
                <Sparkles className="w-3 h-3 text-indigo-400" />
                <span>进入前瞻情景</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  soundFx.playTick();
                  onSelectQuarter('2026Q1');
                }}
                className="hidden sm:flex h-7 px-2.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/35 text-emerald-300 hover:text-white text-[11px] font-medium items-center gap-1 transition-all cursor-pointer whitespace-nowrap"
                title="返回最新 BIS 官方核准发布季度 (2026Q1: $47.62T)"
              >
                <Check className="w-3 h-3 text-emerald-400" />
                <span>返回官方最新</span>
              </button>
            )}
          </div>

          {/* Right: Search, Investigation, Chart Card, Share, Theme, Toolbox Popover & Version */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Compact Country Search (lg+) */}
            <div className="relative hidden lg:block">
              <div className="flex items-center bg-[#0d1321] border border-white/[0.08] rounded-lg px-2 py-1 text-xs text-slate-300 w-36 xl:w-44 focus-within:w-52 focus-within:border-indigo-400/60 transition-all">
                <Search className="w-3.5 h-3.5 text-slate-400 mr-1.5 shrink-0" />
                <input
                  type="text"
                  placeholder="搜索国家/代码..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent border-none outline-none text-xs text-white placeholder-slate-400 w-full"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-white ml-1 cursor-pointer">
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {searchResults.length > 0 && (
                <div className="absolute top-full right-0 mt-1 w-64 max-h-60 overflow-y-auto bg-[#182238]/98 border border-white/[0.12] rounded-xl shadow-2xl p-1.5 z-50 backdrop-blur-xl">
                  {searchResults.slice(0, 8).map(c => (
                    <button
                      key={c.code}
                      onClick={() => {
                        onSelectCountry && onSelectCountry(c.code);
                        setSearchQuery('');
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs hover:bg-indigo-500/20 hover:text-indigo-200 flex items-center justify-between text-slate-200 transition-colors cursor-pointer"
                    >
                      <span className="font-semibold">{c.name_zh}</span>
                      <span className="font-mono text-[11px] text-indigo-300 bg-slate-900/80 px-1.5 py-0.5 rounded">{c.code}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* v4.0 Beginner Tour Guide Button */}
            {onOpenIntro && (
              <button
                onClick={onOpenIntro}
                data-testid="header-tour-btn"
                className="h-7 px-2.5 rounded-lg border border-indigo-400/30 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-200 hover:text-white flex items-center gap-1 text-xs font-semibold cursor-pointer transition-all whitespace-nowrap"
                title="打开 30 秒新手导览、角色极速就绪与四步因果推演流程图"
              >
                <span>🧭</span>
                <span className="hidden sm:inline">新手导览</span>
              </button>
            )}

            {/* v4.0 Plain Language vs Pro Terminology Toggle */}
            {onToggleBeginnerMode && (
              <button
                onClick={onToggleBeginnerMode}
                data-testid="header-beginner-toggle"
                className={`h-7 px-2.5 rounded-lg border text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all whitespace-nowrap ${
                  isBeginnerMode
                    ? 'border-amber-400/40 bg-amber-500/15 text-amber-200 hover:bg-amber-500/25'
                    : 'border-white/[0.08] bg-[#0d1321] hover:bg-[#131b2e] text-slate-300 hover:text-white'
                }`}
                title={isBeginnerMode ? '当前为【白话通俗解读】模式 (通俗比喻与三点释义)，点击切换至学术量化口径' : '当前为【专业量化术语】模式，点击开启零门槛白话释义'}
              >
                <span>{isBeginnerMode ? '💡 白话解读' : '🏛️ 专业术语'}</span>
              </button>
            )}

            {/* Guided Investigation Playbooks */}
            {onOpenInvestigationModal && (
              <button
                onClick={onOpenInvestigationModal}
                data-testid="header-investigation-btn"
                className="hidden sm:flex h-7 px-2.5 rounded-lg border border-white/[0.1] bg-[#0d1321] hover:bg-[#131b2e] text-slate-200 hover:text-white items-center gap-1 text-xs font-medium cursor-pointer transition-all whitespace-nowrap"
                title="打开剧本式宏观侦探主线推演 (Guided Investigation Playbooks)"
              >
                <span>🕵️</span>
                <span>侦探主线</span>
              </button>
            )}

            {/* Publication-Ready Chart Card */}
            {onOpenChartCard && (
              <button
                onClick={onOpenChartCard}
                className="hidden sm:flex h-7 px-2.5 rounded-lg border border-white/[0.1] bg-[#0d1321] hover:bg-[#131b2e] text-slate-200 hover:text-white items-center gap-1 text-xs font-medium cursor-pointer transition-all whitespace-nowrap"
                title="一键生成投行级研报单图卡片 (Publication-Ready Chart Card)"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>研报卡片</span>
              </button>
            )}

            {/* Deep-Link Share */}
            {onCopyDeepLink && (
              <button
                onClick={onCopyDeepLink}
                className="h-7 w-7 rounded-lg border border-white/[0.08] bg-[#0d1321] hover:bg-[#131b2e] text-slate-300 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
                title="一键复制当前推演视图深度链接 (包含当前季度、所选经济体与分析模块)"
              >
                <Share2 className="w-3.5 h-3.5 text-indigo-400" />
              </button>
            )}

            {/* Theme Toggle */}
            <button
              onClick={onToggleTheme}
              data-testid="header-theme-toggle"
              className="hidden md:flex h-7 w-7 rounded-lg border border-white/[0.08] bg-[#0d1321] hover:bg-[#131b2e] text-slate-300 hover:text-white items-center justify-center cursor-pointer transition-colors"
              title={theme === 'dark' ? '切换研报纸本亮色主题' : '切换静奢石墨暗色主题'}
            >
              {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-indigo-500" />}
            </button>

            {/* Structured Toolbox Popover */}
            <div className="relative" ref={toolboxRef}>
              <button
                onClick={() => {
                  soundFx.playTick();
                  setIsToolboxOpen(prev => !prev);
                }}
                data-testid="header-toolbox-btn"
                className={`h-7 px-2 rounded-lg border text-xs font-medium flex items-center gap-1 cursor-pointer transition-all whitespace-nowrap ${
                  isToolboxOpen || customFileName
                    ? 'border-indigo-400/50 bg-[#182238] text-white'
                    : 'border-white/[0.08] bg-[#0d1321] hover:bg-[#131b2e] text-slate-300 hover:text-white'
                }`}
                title="展开投研工具箱 (计价币种、宏观 AI、冲击沙盒、私有数据、方法论)"
              >
                <span className="hidden sm:inline">工具箱</span>
                <span className="sm:hidden font-mono text-[11px]">{selectedCurrency}</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${isToolboxOpen ? 'rotate-180' : ''}`} />
              </button>

              {isToolboxOpen && (
                <div
                  data-testid="header-toolbox-popover"
                  className="absolute right-0 top-full mt-1.5 w-72 bg-[#182238]/98 border border-white/[0.12] rounded-xl shadow-2xl p-3 z-50 backdrop-blur-xl space-y-3 animate-fade-in"
                >
                  {/* Currency Section */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
                      <span>全局计价基准币种</span>
                      <span className="font-mono text-indigo-300">{selectedCurrency}</span>
                    </div>
                    <div className="grid grid-cols-5 gap-1 bg-[#0d1321] p-1 rounded-lg border border-white/[0.06]">
                      {['USD', 'EUR', 'CNY', 'JPY', 'GOLD'].map(cur => (
                        <button
                          key={cur}
                          onClick={() => onChangeCurrency && onChangeCurrency(cur)}
                          className={`py-1 rounded text-[11px] font-mono font-semibold transition-all cursor-pointer ${
                            selectedCurrency === cur
                              ? 'atlas-pill-active'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          {cur}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Analytical Tools Grid */}
                  <div className="space-y-1.5 pt-2 border-t border-white/[0.06]">
                    <div className="text-[11px] text-slate-400 font-medium">高阶量化与文档工具</div>
                    <div className="grid grid-cols-2 gap-1.5 text-xs">
                      {onOpenMacroAi && (
                        <button
                          onClick={() => { setIsToolboxOpen(false); onOpenMacroAi(); }}
                          className="p-2 rounded-lg bg-[#0d1321] hover:bg-[#131b2e] border border-white/[0.06] text-slate-200 flex items-center gap-1.5 cursor-pointer"
                        >
                          <Bot className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                          <span>宏观 AI 助手</span>
                        </button>
                      )}
                      {onOpenShockSandbox && (
                        <button
                          onClick={() => { setIsToolboxOpen(false); onOpenShockSandbox(); }}
                          className="p-2 rounded-lg bg-[#0d1321] hover:bg-[#131b2e] border border-white/[0.06] text-slate-200 flex items-center gap-1.5 cursor-pointer"
                        >
                          <Sliders className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                          <span>冲击沙盒</span>
                        </button>
                      )}
                      {onOpenCustomData && (
                        <button
                          onClick={() => { setIsToolboxOpen(false); onOpenCustomData(); }}
                          className="p-2 rounded-lg bg-[#0d1321] hover:bg-[#131b2e] border border-white/[0.06] text-slate-200 flex items-center gap-1.5 cursor-pointer"
                        >
                          <UploadCloud className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>{customFileName ? '私有已载入' : '私有数据'}</span>
                        </button>
                      )}
                      {onToggleMilestones && (
                        <button
                          onClick={() => { setIsToolboxOpen(false); onToggleMilestones(); }}
                          className="p-2 rounded-lg bg-[#0d1321] hover:bg-[#131b2e] border border-white/[0.06] text-slate-200 flex items-center gap-1.5 cursor-pointer"
                        >
                          <History className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span>{isMilestonesOpen ? '收起纪元' : '历史纪元'}</span>
                        </button>
                      )}
                      {onOpenAppendix && (
                        <button
                          onClick={() => { setIsToolboxOpen(false); onOpenAppendix(); }}
                          className="p-2 rounded-lg bg-[#0d1321] hover:bg-[#131b2e] border border-white/[0.06] text-slate-200 flex items-center gap-1.5 cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>方法论附录</span>
                        </button>
                      )}
                      {onOpenIntro && (
                        <button
                          onClick={() => { setIsToolboxOpen(false); onOpenIntro(); }}
                          className="p-2 rounded-lg bg-[#0d1321] hover:bg-[#131b2e] border border-white/[0.06] text-slate-200 flex items-center gap-1.5 cursor-pointer"
                        >
                          <BookOpen className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>平台导读</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Preferences Footer */}
                  <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between gap-2 text-xs">
                    <button
                      onClick={onToggleTheme}
                      data-testid="toolbox-theme-toggle"
                      className="flex-1 py-1.5 px-2.5 rounded-lg bg-[#0d1321] hover:bg-[#131b2e] border border-white/[0.06] text-slate-200 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-indigo-400" />}
                      <span>{theme === 'dark' ? '纸本亮色' : '石墨暗色'}</span>
                    </button>
                    <button
                      onClick={onToggleSound}
                      className="py-1.5 px-2.5 rounded-lg bg-[#0d1321] hover:bg-[#131b2e] border border-white/[0.06] text-slate-200 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {isSoundMuted ? <VolumeX className="w-3.5 h-3.5 text-slate-400" /> : <Volume2 className="w-3.5 h-3.5 text-indigo-400" />}
                      <span>{isSoundMuted ? '已静音' : '音效'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Version Changelog Trigger */}
            {onOpenChangelog && (
              <button
                onClick={onOpenChangelog}
                className="h-7 px-2 rounded-lg border border-white/[0.1] bg-[#0d1321] hover:bg-[#131b2e] text-slate-200 hover:text-white flex items-center gap-1.5 text-[11px] font-mono font-semibold cursor-pointer transition-all whitespace-nowrap"
                title="查看 v4.0.0 版本更迭记录与架构演进日志"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>v4.0.0</span>
              </button>
            )}
          </div>
        </div>

        {/* ROW 2: Compact 36px Navigation Bar (Mode Switcher + 4 Core Pillars OR 5 Domains & Active Modules) */}
        <div
          id="module-nav-container"
          data-testid="module-nav-container"
          className="h-9 flex items-center gap-2 overflow-x-auto scrollbar-none py-1"
        >
          {/* Focus vs Pro Mode Toggle */}
          {onToggleViewMode && (
            <button
              onClick={onToggleViewMode}
              data-testid="header-view-mode-toggle"
              className="h-7 px-2.5 rounded-lg border border-white/[0.1] bg-[#0d1321] hover:bg-[#131b2e] text-slate-200 hover:text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shrink-0 transition-all"
              title={viewMode === 'focus' ? '当前为焦点模式 (4大核心支柱)，点击展开全量19模块' : '当前为专家模式 (全量19模块)，点击收敛至4大核心支柱'}
            >
              <span>{viewMode === 'focus' ? '🎯 焦点模式' : '🔬 专家模式'}</span>
            </button>
          )}

          <span className="h-4 w-px bg-white/[0.08] shrink-0" />

          {viewMode === 'focus' ? (
            <>
              <div className="flex items-center gap-1 shrink-0">
                {CAUSAL_WORKFLOW_STEPS.map((tab, idx) => {
                  const isTabActive = activeTab === tab.id;
                  return (
                    <React.Fragment key={tab.id}>
                      {idx > 0 && (
                        <span className="text-slate-600 text-[11px] px-0.5 select-none shrink-0 font-mono">➔</span>
                      )}
                      <button
                        data-testid={tab.id === 'portfolio' ? 'header-portfolio-btn' : `header-tab-${tab.id}`}
                        onClick={() => {
                          soundFx.playTick();
                          onSelectTab(tab.id);
                        }}
                        className={`h-7 px-2.5 rounded-lg text-xs transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer shrink-0 ${
                          isTabActive
                            ? 'atlas-pill-active font-semibold'
                            : 'text-slate-400 hover:text-white hover:bg-[#0d1321] border border-transparent'
                        }`}
                        title={`${tab.shortTitle} · ${tab.label}\n【核心问题】: ${tab.question}\n【分析目标】: ${tab.purpose}`}
                      >
                        <span className={isTabActive ? 'text-indigo-200 font-semibold' : 'text-slate-300'}>
                          {isBeginnerMode ? tab.shortTitle : `${tab.step}. ${tab.label}`}
                        </span>
                        {isBeginnerMode && (
                          <span className="hidden xl:inline text-[11px] text-slate-400 font-normal">
                            · {tab.label}
                          </span>
                        )}
                      </button>
                    </React.Fragment>
                  );
                })}
              </div>

              {!['map', 'contagion', 'shadow', 'portfolio'].includes(activeTab) && (
                <div className="flex items-center gap-1.5 pl-2 border-l border-white/[0.08] shrink-0">
                  <span className="text-[11px] text-slate-400 font-mono">延伸视图:</span>
                  <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold atlas-pill-active">
                    {getTabTaskMeta(activeTab).label}
                  </span>
                </div>
              )}

              {onToggleViewMode && (
                <button
                  onClick={onToggleViewMode}
                  className="hidden md:flex items-center gap-1 ml-auto text-[11px] text-slate-400 hover:text-indigo-300 transition-colors cursor-pointer shrink-0"
                  title="展开 5 大宏观领域全部 19 个量化分析模块"
                >
                  <span>全部 19 模块</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </>
          ) : (
            <>
              {/* 5 Domains Segmented Capsule */}
              <div className="atlas-segmented shrink-0">
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
                      className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition-all flex items-center gap-1 whitespace-nowrap cursor-pointer ${
                        isDomainActive
                          ? 'atlas-pill-active'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <span>{dom.title}</span>
                    </button>
                  );
                })}
              </div>

              <span className="h-4 w-px bg-white/[0.08] shrink-0" />

              {/* Active Domain's Module Tabs */}
              <div className="flex items-center gap-1 shrink-0">
                {currentDisplayDomain.tabs.map(tab => {
                  const isTabActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      data-testid={tab.id === 'portfolio' ? 'header-portfolio-btn' : undefined}
                      onClick={() => {
                        soundFx.playTick();
                        onSelectTab(tab.id);
                      }}
                      className={`h-7 px-2.5 rounded-lg text-xs transition-all flex items-center gap-1 whitespace-nowrap cursor-pointer shrink-0 ${
                        isTabActive
                          ? 'atlas-pill-active font-semibold'
                          : 'text-slate-400 hover:text-white hover:bg-[#0d1321]'
                      }`}
                      title={`${tab.label} · ${tab.desc}`}
                    >
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {!currentDisplayDomain.tabs.some(t => t.id === 'portfolio') && (
                <button
                  onClick={() => onSelectTab && onSelectTab('portfolio')}
                  data-testid="header-portfolio-btn"
                  className="hidden lg:flex h-7 px-2.5 rounded-lg border border-white/[0.08] bg-[#0d1321] hover:bg-[#131b2e] text-slate-300 hover:text-white text-[11px] font-medium items-center gap-1 ml-auto shrink-0 cursor-pointer"
                  title="快速跳转至我的组合压力映射"
                >
                  <Briefcase className="w-3 h-3 text-indigo-400" />
                  <span>组合压力</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </header>
  );
}
