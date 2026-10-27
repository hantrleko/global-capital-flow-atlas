import React, { useState, useEffect, useMemo } from 'react';
import { 
  Play, Pause, SkipBack, SkipForward, Globe, ShieldAlert, 
  DollarSign, Activity, Database, Calendar, TrendingUp, Layers,
  Search, Coins, X, Sun, Moon, ArrowRightLeft, Clock, Sparkles,
  Zap, Radio, Command, HelpCircle, Split, Volume2, VolumeX, Bot,
  BookOpen, FileText, Sliders, Code, History, UploadCloud, Building2,
  Compass, ChevronRight, ChevronLeft, ArrowRight, Check, Share2
} from 'lucide-react';
import EugeneLogo from './EugeneLogo';
import soundFx from '../utils/soundEffects';
import { CURRENCY_LIST } from '../utils/currencyConversion';
import { NAVIGATION_DOMAINS, getTabTaskMeta } from '../utils/navigationConfig';
import { getDataClassification } from '../utils/dataClassification';

export { NAVIGATION_DOMAINS, getTabTaskMeta };

export default function Header({
  quarters = [],
  selectedQuarter = '2026Q1',
  onSelectQuarter,
  isPlaying = false,
  onTogglePlay,
  playSpeed = 1,
  onChangePlaySpeed,
  globalMacroMap = {},
  activeTab = 'map',
  onSelectTab,
  countries = [],
  onSelectCountry,
  theme = 'dark',
  onToggleTheme,
  onOpenCommandPalette,
  onOpenShortcuts,
  onOpenMacroAi,
  onOpenIntro,
  onOpenCodeExporter,
  onOpenShockSandbox,
  onOpenInstitutionalReport,
  onToggleMilestones,
  isMilestonesOpen = false,
  selectedCurrency = 'USD',
  onChangeCurrency,
  onOpenCustomData,
  customFileName = null,
  isSoundMuted = false,
  onToggleSound,
  onOpenAppendix,
  onCopyDeepLink
}) {
  const [searchQuery, setSearchQuery] = useState('');
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
  const classification = useMemo(() => getDataClassification(selectedQuarter), [selectedQuarter]);

  // Search filter
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
    <header className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur-md border-b border-slate-800/80 shadow-lg">
      <div className="max-w-[1780px] w-full mx-auto px-3 sm:px-5">
        
        {/* ROW 1: Compact Branding, Currency, Search & Tool Presets (Height: ~42px) */}
        <div className="h-11 flex items-center justify-between gap-3 border-b border-slate-800/60">
          {/* Logo & Title */}
          <div className="flex items-center gap-2.5 shrink-0">
            <EugeneLogo 
              size="md" 
              subtitle="Global Capital Flow Atlas · BIS 宏观审慎分析平台" 
            />
          </div>

          {/* Quick Actions & Tools */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Currency Selector (Top 3 on mobile, all 5 on sm+) */}
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-xs">
              {['USD', 'EUR', 'CNY', 'JPY', 'GOLD'].map((cur, idx) => (
                <button
                  key={cur}
                  onClick={() => onChangeCurrency && onChangeCurrency(cur)}
                  className={`px-1.5 sm:px-2 py-0.5 rounded text-[11px] font-mono font-semibold transition-all cursor-pointer ${
                    idx >= 3 ? 'hidden sm:inline-block' : ''
                  } ${
                    selectedCurrency === cur
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                  title={`计价币种: ${cur}`}
                >
                  {cur}
                </button>
              ))}
            </div>

            {/* Country Search Bar */}
            <div className="relative hidden md:block">
              <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-300 w-36 lg:w-44 focus-within:w-56 focus-within:border-sky-500 transition-all">
                <Search className="w-3.5 h-3.5 text-slate-400 mr-1.5 shrink-0" />
                <input
                  type="text"
                  placeholder="搜索国家 (代码/名称)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent border-none outline-none text-xs text-white placeholder-slate-400 w-full"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-white ml-1">
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {searchResults.length > 0 && (
                <div className="absolute top-full left-0 mt-1 w-64 max-h-60 overflow-y-auto bg-slate-900/95 border border-slate-700 rounded-xl shadow-2xl p-1.5 z-50 backdrop-blur-xl">
                  {searchResults.slice(0, 8).map(c => (
                    <button
                      key={c.code}
                      onClick={() => {
                        onSelectCountry && onSelectCountry(c.code);
                        setSearchQuery('');
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs hover:bg-blue-600/20 hover:text-sky-300 flex items-center justify-between text-slate-200 transition-colors cursor-pointer"
                    >
                      <span className="font-semibold">{c.name_zh} ({c.name})</span>
                      <span className="font-mono text-[11px] text-sky-400 bg-sky-950/60 px-1 rounded">{c.code}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center gap-1">
              {onCopyDeepLink && (
                <button
                  onClick={onCopyDeepLink}
                  className="h-7 px-2.5 rounded-lg border border-sky-500/40 bg-sky-950/40 text-sky-300 hover:text-white hover:bg-sky-900/50 flex items-center gap-1.5 text-xs font-semibold cursor-pointer shadow-sm transition-all"
                  title="一键复制当前推演视图深度链接 (包含当前季度、所选经济体与分析模块)"
                >
                  <Share2 className="w-3.5 h-3.5 text-sky-400" />
                  <span className="hidden sm:inline text-xs">分享推演</span>
                </button>
              )}

              {onOpenMacroAi && (
                <button
                  onClick={onOpenMacroAi}
                  className="hidden sm:flex h-7 px-2.5 rounded-lg border border-purple-500/40 bg-purple-950/40 text-purple-300 hover:text-white hover:bg-purple-900/50 items-center gap-1.5 text-xs font-semibold cursor-pointer shadow-sm transition-all"
                  title="唤起宏观 AI 智能审慎决策推演 (Macro Copilot)"
                >
                  <Bot className="w-3.5 h-3.5 text-purple-400" />
                  <span className="text-xs">宏观 AI</span>
                </button>
              )}

              {onOpenAppendix && (
                <button
                  onClick={onOpenAppendix}
                  className="hidden sm:flex h-7 px-2 rounded-lg border border-slate-700/80 bg-slate-900 text-slate-300 hover:text-white hover:border-slate-500 items-center gap-1 text-xs font-medium cursor-pointer"
                  title="方法论附录"
                >
                  <FileText className="w-3.5 h-3.5 text-sky-400" />
                  <span className="hidden xl:inline text-xs">方法论</span>
                </button>
              )}

              {onOpenIntro && (
                <button
                  onClick={onOpenIntro}
                  className="hidden sm:flex h-7 px-2 rounded-lg border border-slate-700/80 bg-slate-900 text-slate-300 hover:text-white hover:border-slate-500 items-center gap-1 text-xs font-medium cursor-pointer"
                  title="平台导读"
                >
                  <BookOpen className="w-3.5 h-3.5 text-sky-400" />
                  <span className="hidden xl:inline text-xs">导读</span>
                </button>
              )}

              {onOpenShockSandbox && (
                <button
                  onClick={onOpenShockSandbox}
                  className="hidden md:flex h-7 px-2 rounded-lg border border-rose-500/30 bg-rose-950/30 text-rose-300 hover:text-white hover:bg-rose-900/40 items-center gap-1 text-xs font-medium cursor-pointer"
                  title="冲击调制沙盒"
                >
                  <Sliders className="w-3.5 h-3.5 text-rose-400" />
                  <span className="hidden xl:inline text-xs">冲击沙盒</span>
                </button>
              )}

              {onOpenCustomData && (
                <button
                  onClick={onOpenCustomData}
                  className={`hidden md:flex h-7 px-2 rounded-lg border items-center gap-1 text-xs font-medium cursor-pointer ${
                    customFileName
                      ? 'border-emerald-500/60 bg-emerald-950/50 text-emerald-300'
                      : 'border-slate-700/80 bg-slate-900 text-slate-300 hover:text-white hover:border-slate-500'
                  }`}
                  title="私有数据导入"
                >
                  <UploadCloud className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden xl:inline text-xs">{customFileName ? '私有已载入' : '私有数据'}</span>
                </button>
              )}

              {/* Theme & Audio Toggles */}
              <button
                onClick={onToggleSound}
                className="h-7 w-7 rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
                title={isSoundMuted ? '取消静音' : '静音'}
              >
                {isSoundMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-sky-400" />}
              </button>
              <button
                onClick={onToggleTheme}
                className="h-7 w-7 rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
                title={theme === 'dark' ? '切换亮色主题' : '切换暗色主题'}
              >
                {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-indigo-400" />}
              </button>
            </div>
          </div>
        </div>

        {/* ROW 2: Quarter Navigator, Level 1 Domains & Scenario Mode (Height: ~38px) */}
        <div className="h-10 flex items-center justify-between gap-3 overflow-x-auto scrollbar-none border-b border-slate-800/50">
          {/* Quarter Switcher Controls */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5">
              <button
                onClick={prevQuarter}
                disabled={currentQuarterIdx <= 0}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
                title="上一季度"
              >
                <SkipBack className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={onTogglePlay}
                className="px-2 py-0.5 rounded text-xs font-semibold text-sky-400 hover:text-white hover:bg-slate-800 flex items-center gap-1 cursor-pointer"
                title={isPlaying ? '暂停演进' : '自动播放演进'}
              >
                {isPlaying ? <Pause className="w-3 h-3 text-amber-400" /> : <Play className="w-3 h-3 text-emerald-400" />}
              </button>
              <button
                onClick={nextQuarter}
                disabled={currentQuarterIdx >= quarters.length - 1}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
                title="下一季度"
              >
                <SkipForward className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Current Quarter Display */}
            <span
              id="current-quarter-display"
              data-testid="current-quarter-display"
              className="text-xs font-mono font-bold text-white px-2 py-0.5 bg-slate-900 border border-slate-700/80 rounded-md"
            >
              {selectedQuarter}
            </span>

            {/* Canonical Data Classification Badge */}
            <span className={`inline-flex items-center gap-1.5 text-xs font-mono font-medium px-2 py-0.5 rounded-full border ${classification.badgeClass}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${classification.dotClass} animate-pulse`} />
              <span>{classification.label}</span>
              <span className="hidden 2xl:inline opacity-80">· {classification.provenance}</span>
            </span>

            {/* Historical Milestones Toggle */}
            {onToggleMilestones && (
              <button
                onClick={onToggleMilestones}
                className={`hidden md:flex h-6 px-2 rounded-md border text-[11px] font-medium items-center gap-1 cursor-pointer transition-all ${
                  isMilestonesOpen
                    ? 'border-sky-500 bg-sky-950/60 text-sky-300'
                    : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white'
                }`}
                title="展开宏观历史转折期与关键纪元事件"
              >
                <History className="w-3 h-3 text-sky-400" />
                <span>纪元事件</span>
              </button>
            )}
          </div>

          {/* Level 1: 5 Domains (Segmented Tabs) */}
          <div className="flex items-center gap-1 shrink-0 bg-slate-900/60 p-0.5 rounded-lg border border-slate-800/80">
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
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                    isDomainActive
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <span>{dom.title}</span>
                  {hasCurrentTab && !isDomainActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Right Action: Scenario Mode Switcher */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Prominent Scenario vs Official Mode Toggle */}
            {selectedQuarter <= '2026Q1' ? (
              <button
                onClick={() => {
                  soundFx.playChime();
                  onSelectQuarter('2026Q4');
                }}
                className="px-2.5 py-1 rounded-lg bg-purple-500/15 border border-purple-500/40 text-purple-300 hover:text-white hover:bg-purple-600/30 text-xs font-medium flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                title="切换至 2026Q3–Q4 宏观前瞻情景与压力敏感性推演"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span>进入前瞻情景</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  soundFx.playTick();
                  onSelectQuarter('2026Q1');
                }}
                className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 hover:text-white hover:bg-emerald-600/30 text-xs font-medium flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                title="返回最新 BIS 官方核准发布季度 (2026Q1: $47.62T)"
              >
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>返回官方最新</span>
              </button>
            )}
          </div>
        </div>

        {/* ROW 3: Level 2 - Full-Width Module Navigation Bar (Height: ~36px) */}
        <div
          id="module-nav-container"
          data-testid="module-nav-container"
          className="h-9 flex items-center gap-2 overflow-x-auto scrollbar-none py-1"
        >
          <span className="text-[11px] font-mono text-slate-400 shrink-0 hidden sm:inline">
            {currentDisplayDomain.title}模块:
          </span>
          {currentDisplayDomain.tabs.map(tab => {
            const isTabActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  soundFx.playTick();
                  onSelectTab(tab.id);
                }}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer shrink-0 ${
                  isTabActive
                    ? 'bg-blue-600/30 text-sky-200 border border-blue-500/60 font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent'
                }`}
                title={`${tab.label} · ${tab.desc}`}
              >
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

      </div>
    </header>
  );
}
