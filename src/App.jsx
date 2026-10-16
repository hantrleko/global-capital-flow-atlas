import React, { useState, useEffect, useMemo, Suspense } from 'react';
import bisDataset from './data/bis_atlas_dataset.json';
import Header from './components/Header';
import CapitalFlowMap from './components/CapitalFlowMap';
import CountryDrawer from './components/CountryDrawer';
import CommandPalette from './components/CommandPalette';
import MacroAiCopilot from './components/MacroAiCopilot';
import ProjectIntroModal from './components/ProjectIntroModal';
import HistoricalMilestoneRibbon from './components/HistoricalMilestoneRibbon';
import EconometricsCodeExporter from './components/EconometricsCodeExporter';
import MacroShockSandbox from './components/MacroShockSandbox';
import InstitutionalReportModal from './components/InstitutionalReportModal';
import soundFx from './utils/soundEffects';
import { Keyboard, X, Bot, Sparkles } from 'lucide-react';

// Lazy-loaded secondary quant components for bundle code-splitting
const NetworkTopology = React.lazy(() => import('./components/NetworkTopology'));
const EarlyWarningSystem = React.lazy(() => import('./components/EarlyWarningSystem'));
const GsibMonitor = React.lazy(() => import('./components/GsibMonitor'));
const FinancialFragmentation = React.lazy(() => import('./components/FinancialFragmentation'));
const BilateralRoutingMatrix = React.lazy(() => import('./components/BilateralRoutingMatrix'));
const ShadowBankingMonitor = React.lazy(() => import('./components/ShadowBankingMonitor'));
const NetworkContagionSimulator = React.lazy(() => import('./components/NetworkContagionSimulator'));
const MaturityRolloverMonitor = React.lazy(() => import('./components/MaturityRolloverMonitor'));
const CentralBankSwapLines = React.lazy(() => import('./components/CentralBankSwapLines'));
const UsdFundingMonitor = React.lazy(() => import('./components/UsdFundingMonitor'));
const CurrencyHegemonyTracker = React.lazy(() => import('./components/CurrencyHegemonyTracker'));
const CountryRiskMatrix = React.lazy(() => import('./components/CountryRiskMatrix'));
const MultiCountryCompare = React.lazy(() => import('./components/MultiCountryCompare'));
const GravityEconometrics = React.lazy(() => import('./components/GravityEconometrics'));
const RegimeComparison = React.lazy(() => import('./components/RegimeComparison'));
const CrisisPlaybook = React.lazy(() => import('./components/CrisisPlaybook'));
const ResearchDossier = React.lazy(() => import('./components/ResearchDossier'));
const CustomDataImporter = React.lazy(() => import('./components/CustomDataImporter'));

const LoadingFallback = () => (
  <div className="w-full h-80 flex flex-col items-center justify-center gap-3 text-slate-400">
    <div className="w-8 h-8 rounded-full border-2 border-sky-400 border-t-transparent animate-spin" />
    <span className="text-xs font-mono text-slate-400">正在异步加载高维量化引擎 (Code-Splitting)...</span>
  </div>
);

export default function App() {
  const quarters = bisDataset.quarters || [];
  // Default to the latest quarter (2026Q4)
  const [selectedQuarter, setSelectedQuarter] = useState(quarters[quarters.length - 1] || '2026Q4');
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState(1);
  const [activeTab, setActiveTab] = useState('map');
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isMacroAiOpen, setIsMacroAiOpen] = useState(false);
  const [isIntroOpen, setIsIntroOpen] = useState(() => {
    return !localStorage.getItem('bis_atlas_intro_seen');
  });
  const [isMilestonesOpen, setIsMilestonesOpen] = useState(false);
  const [isCodeExporterOpen, setIsCodeExporterOpen] = useState(false);
  const [isShockSandboxOpen, setIsShockSandboxOpen] = useState(false);
  const [isInstitutionalReportOpen, setIsInstitutionalReportOpen] = useState(false);
  const [isCustomDataOpen, setIsCustomDataOpen] = useState(false);
  const [customMatrix, setCustomMatrix] = useState(null);
  const [customFileName, setCustomFileName] = useState(null);
  const [selectedCurrency, setSelectedCurrency] = useState(() => {
    return localStorage.getItem('bis_atlas_currency') || 'USD';
  });
  const [isSoundMuted, setIsSoundMuted] = useState(() => soundFx.isMuted());
  const [contagionConfig, setContagionConfig] = useState(null);
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('bis_atlas_theme') || 'dark';
  });

  const handleCurrencyChange = (newCur) => {
    soundFx.playTick();
    setSelectedCurrency(newCur);
    localStorage.setItem('bis_atlas_currency', newCur);
  };

  // Active dataset that transparently overlays custom uploaded matrix in memory
  const activeDataset = useMemo(() => {
    if (!customMatrix) return bisDataset;
    return {
      ...bisDataset,
      bilateral_matrix: {
        ...bisDataset.bilateral_matrix,
        [selectedQuarter]: customMatrix
      }
    };
  }, [customMatrix, selectedQuarter]);

  const toggleSound = () => {
    const next = soundFx.toggleMute();
    setIsSoundMuted(next);
  };

  const toggleTheme = () => {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('bis_atlas_theme', next);
      return next;
    });
  };

  useEffect(() => {
    if (theme === 'light') {
      document.body.classList.add('theme-light');
    } else {
      document.body.classList.remove('theme-light');
    }
  }, [theme]);

  // Global macro dictionary keyed by quarter
  const globalMacroMap = useMemo(() => {
    return Object.fromEntries((bisDataset.global_macro || []).map(m => [m.quarter, m]));
  }, []);

  // Auto-play timer for timeline with variable playback speed
  useEffect(() => {
    if (!isPlaying) return;

    const intervalTime = Math.round(2000 / playSpeed);
    const interval = setInterval(() => {
      setSelectedQuarter(prev => {
        const curIdx = quarters.indexOf(prev);
        if (curIdx < quarters.length - 1) {
          return quarters[curIdx + 1];
        } else {
          // Reached end, loop back or stop
          setIsPlaying(false);
          return prev;
        }
      });
    }, intervalTime);

    return () => clearInterval(interval);
  }, [isPlaying, playSpeed, quarters]);

  // Global Pro-Terminal Keyboard Shortcuts (Space, ArrowLeft, ArrowRight, Ctrl+K, ?, etc.)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Do not trigger global shortcuts if typing in input/textarea
      const tag = e.target.tagName;
      if (['INPUT', 'TEXTAREA'].includes(tag)) {
        if (e.key === 'Escape') {
          setIsCommandPaletteOpen(false);
          setIsShortcutsOpen(false);
        }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      } else if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setIsCommandPaletteOpen(true);
      } else if (e.key === '?') {
        e.preventDefault();
        setIsShortcutsOpen(prev => !prev);
      } else if (e.key === ' ') {
        e.preventDefault();
        soundFx.playChime();
        setIsPlaying(prev => !prev);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        soundFx.playTick();
        setSelectedQuarter(prev => {
          const curIdx = quarters.indexOf(prev);
          return curIdx > 0 ? quarters[curIdx - 1] : prev;
        });
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        soundFx.playTick();
        setSelectedQuarter(prev => {
          const curIdx = quarters.indexOf(prev);
          return curIdx < quarters.length - 1 ? quarters[curIdx + 1] : prev;
        });
      } else if (e.key === 'Escape') {
        setIsCommandPaletteOpen(false);
        setIsShortcutsOpen(false);
        setIsMacroAiOpen(false);
        setIsIntroOpen(false);
        setIsCodeExporterOpen(false);
        setIsShockSandboxOpen(false);
        setIsInstitutionalReportOpen(false);
        setIsCustomDataOpen(false);
        setSelectedCountry(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [quarters]);

  return (
    <div className="min-h-screen cyber-bg-glow text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Header & Interactive Timeline Bar */}
      <Header
        quarters={quarters}
        selectedQuarter={selectedQuarter}
        onSelectQuarter={(q) => {
          setSelectedQuarter(q);
          setIsPlaying(false);
        }}
        isPlaying={isPlaying}
        onTogglePlay={() => setIsPlaying(!isPlaying)}
        playSpeed={playSpeed}
        onChangePlaySpeed={setPlaySpeed}
        globalMacroMap={globalMacroMap}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        countries={bisDataset.countries}
        onSelectCountry={(code) => setSelectedCountry(code)}
        theme={theme}
        onToggleTheme={toggleTheme}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
        onOpenMacroAi={() => setIsMacroAiOpen(true)}
        onOpenIntro={() => setIsIntroOpen(true)}
        onOpenCodeExporter={() => setIsCodeExporterOpen(true)}
        onOpenShockSandbox={() => setIsShockSandboxOpen(true)}
        onOpenInstitutionalReport={() => setIsInstitutionalReportOpen(true)}
        onToggleMilestones={() => setIsMilestonesOpen(prev => !prev)}
        isMilestonesOpen={isMilestonesOpen}
        selectedCurrency={selectedCurrency}
        onChangeCurrency={handleCurrencyChange}
        onOpenCustomData={() => setIsCustomDataOpen(true)}
        customFileName={customFileName}
        isSoundMuted={isSoundMuted}
        onToggleSound={toggleSound}
      />

      {/* Historical Macro Milestones Ribbon (2018-2026 Epochs) */}
      <HistoricalMilestoneRibbon
        selectedQuarter={selectedQuarter}
        onSelectQuarter={(q) => {
          setSelectedQuarter(q);
          setIsPlaying(false);
        }}
        isOpen={isMilestonesOpen}
        onToggle={() => setIsMilestonesOpen(prev => !prev)}
      />

      {/* Main Analysis Viewport */}
      <main className="flex-1 max-w-[1780px] w-full mx-auto p-4 md:p-6 space-y-6">
        <Suspense fallback={<LoadingFallback />}>
          {activeTab === 'map' && (
            <CapitalFlowMap
              dataset={activeDataset}
              selectedQuarter={selectedQuarter}
              onSelectQuarter={(q) => setSelectedQuarter(q)}
              selectedCountry={selectedCountry}
              onSelectCountry={(code) => setSelectedCountry(code)}
              selectedCurrency={selectedCurrency}
            />
          )}

          {activeTab === 'network' && (
            <NetworkTopology
              dataset={activeDataset}
              selectedQuarter={selectedQuarter}
              selectedCountry={selectedCountry}
              onSelectCountry={(code) => setSelectedCountry(code)}
            />
          )}

          {activeTab === 'ews' && (
            <EarlyWarningSystem
              dataset={activeDataset}
              selectedQuarter={selectedQuarter}
              onSelectQuarter={(q) => setSelectedQuarter(q)}
              onSelectCountry={(code) => setSelectedCountry(code)}
            />
          )}

          {activeTab === 'gsib' && (
            <GsibMonitor
              dataset={activeDataset}
              selectedQuarter={selectedQuarter}
              onSelectCountry={(code) => setSelectedCountry(code)}
              selectedCurrency={selectedCurrency}
            />
          )}

          {activeTab === 'fragmentation' && (
            <FinancialFragmentation
              dataset={activeDataset}
              selectedQuarter={selectedQuarter}
              onSelectCountry={(code) => setSelectedCountry(code)}
            />
          )}

          {activeTab === 'routing' && (
            <BilateralRoutingMatrix
              dataset={activeDataset}
              selectedQuarter={selectedQuarter}
              onSelectCountry={(code) => setSelectedCountry(code)}
            />
          )}

          {activeTab === 'shadow' && (
            <ShadowBankingMonitor
              dataset={activeDataset}
              selectedQuarter={selectedQuarter}
              onSelectCountry={(code) => setSelectedCountry(code)}
            />
          )}

          {activeTab === 'contagion' && (
            <NetworkContagionSimulator
              dataset={activeDataset}
              selectedQuarter={selectedQuarter}
              onSelectCountry={(code) => setSelectedCountry(code)}
              contagionConfig={contagionConfig}
            />
          )}

          {activeTab === 'maturity' && (
            <MaturityRolloverMonitor
              dataset={activeDataset}
              selectedQuarter={selectedQuarter}
              onSelectCountry={(code) => setSelectedCountry(code)}
            />
          )}

          {activeTab === 'swaps' && (
            <CentralBankSwapLines
              dataset={activeDataset}
              selectedQuarter={selectedQuarter}
              onSelectCountry={(code) => setSelectedCountry(code)}
            />
          )}

          {activeTab === 'usd' && (
            <UsdFundingMonitor
              dataset={activeDataset}
              selectedQuarter={selectedQuarter}
              onSelectCountry={(code) => setSelectedCountry(code)}
            />
          )}

          {activeTab === 'currency' && (
            <CurrencyHegemonyTracker
              dataset={activeDataset}
              selectedQuarter={selectedQuarter}
              onSelectCountry={(code) => setSelectedCountry(code)}
            />
          )}

          {activeTab === 'risk' && (
            <CountryRiskMatrix
              dataset={activeDataset}
              selectedQuarter={selectedQuarter}
              selectedCountry={selectedCountry}
              onSelectCountry={(code) => setSelectedCountry(code)}
            />
          )}

          {activeTab === 'compare' && (
            <MultiCountryCompare
              dataset={activeDataset}
              selectedQuarter={selectedQuarter}
              onSelectCountry={(code) => setSelectedCountry(code)}
            />
          )}

          {activeTab === 'gravity' && (
            <GravityEconometrics
              dataset={activeDataset}
              selectedQuarter={selectedQuarter}
              onSelectCountry={(code) => setSelectedCountry(code)}
            />
          )}

          {activeTab === 'comparison' && (
            <RegimeComparison
              dataset={activeDataset}
              onSelectCountry={(code) => setSelectedCountry(code)}
            />
          )}

          {activeTab === 'playbook' && (
            <CrisisPlaybook
              dataset={activeDataset}
              selectedQuarter={selectedQuarter}
              onSelectQuarter={(q) => setSelectedQuarter(q)}
              onSelectCountry={(code) => setSelectedCountry(code)}
              onSelectTab={setActiveTab}
              onSetContagionConfig={setContagionConfig}
            />
          )}

          {activeTab === 'dossier' && (
            <ResearchDossier
              dataset={activeDataset}
              selectedQuarter={selectedQuarter}
            />
          )}
        </Suspense>
      </main>

      {/* Sovereign 360° Detailed Profile Drawer (Overlay) */}
      {selectedCountry && (
        <CountryDrawer
          dataset={bisDataset}
          countryCode={selectedCountry}
          selectedQuarter={selectedQuarter}
          onClose={() => setSelectedCountry(null)}
          onSelectTab={setActiveTab}
          onSelectQuarter={setSelectedQuarter}
          onSelectCountry={setSelectedCountry}
          onSetContagionEpicenter={(code) => {
            setContagionConfig({ epicenter: code, haircut: 35, deleveraging: 1.8, dollarSqueeze: 15 });
          }}
        />
      )}

      {/* BIS Macro AI Copilot Floating Quick Trigger */}
      <div className="fixed bottom-6 right-6 z-30">
        <button
          onClick={() => {
            soundFx.playChime();
            setIsMacroAiOpen(true);
          }}
          className="px-3.5 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 text-white text-xs font-bold shadow-[0_0_25px_rgba(59,130,246,0.6)] flex items-center gap-2 transition-all hover:scale-105 group border border-blue-400/40 cursor-pointer"
          title="打开 BIS 宏观 AI 决策推演智能体 (Macro Copilot 2.0)"
        >
          <Bot className="w-4 h-4 group-hover:rotate-12 transition-transform animate-pulse-subtle" />
          <span className="hidden sm:inline">宏观 AI 大脑</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399] animate-ping" />
        </button>
      </div>

      {/* BIS Atlas Project Brief & Institutional Onboarding Modal */}
      <ProjectIntroModal
        isOpen={isIntroOpen}
        onClose={() => setIsIntroOpen(false)}
        onExploreFeature={(tab) => {
          setActiveTab(tab);
          setIsIntroOpen(false);
        }}
      />

      {/* Econometrics Code Exporter Modal */}
      <EconometricsCodeExporter
        isOpen={isCodeExporterOpen}
        onClose={() => setIsCodeExporterOpen(false)}
        selectedQuarter={selectedQuarter}
        countries={bisDataset.countries}
      />

      {/* Macro Shock Sandbox Modal */}
      <MacroShockSandbox
        isOpen={isShockSandboxOpen}
        onClose={() => setIsShockSandboxOpen(false)}
        dataset={bisDataset}
        selectedQuarter={selectedQuarter}
        onApplyShock={(shock) => {
          setContagionConfig(shock);
          setActiveTab('contagion');
        }}
      />

      {/* Institutional Intelligence Briefing Report Modal */}
      <InstitutionalReportModal
        isOpen={isInstitutionalReportOpen}
        onClose={() => setIsInstitutionalReportOpen(false)}
        dataset={activeDataset}
        selectedQuarter={selectedQuarter}
      />

      {/* Custom Data Ingestion Sandbox Modal */}
      <Suspense fallback={null}>
        <CustomDataImporter
          isOpen={isCustomDataOpen}
          onClose={() => setIsCustomDataOpen(false)}
          onApplyCustomData={(matrix, fName) => {
            setCustomMatrix(matrix);
            setCustomFileName(fName);
          }}
          onResetToOfficial={() => {
            setCustomMatrix(null);
            setCustomFileName(null);
          }}
        />
      </Suspense>

      {/* BIS Macro AI Copilot Modal Window */}
      <MacroAiCopilot
        isOpen={isMacroAiOpen}
        onClose={() => setIsMacroAiOpen(false)}
        dataset={bisDataset}
        selectedQuarter={selectedQuarter}
        onSelectQuarter={setSelectedQuarter}
        onSelectTab={setActiveTab}
        onSelectCountry={setSelectedCountry}
        activeTab={activeTab}
      />

      {/* Command Palette Modal */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        countries={bisDataset.countries}
        quarters={quarters}
        selectedQuarter={selectedQuarter}
        onSelectQuarter={(q) => {
          setSelectedQuarter(q);
          setIsPlaying(false);
        }}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onSelectCountry={(code) => setSelectedCountry(code)}
        theme={theme}
        onToggleTheme={toggleTheme}
        onOpenIntro={() => {
          setIsCommandPaletteOpen(false);
          setIsIntroOpen(true);
        }}
        onOpenCodeExporter={() => {
          setIsCommandPaletteOpen(false);
          setIsCodeExporterOpen(true);
        }}
        onOpenShockSandbox={() => {
          setIsCommandPaletteOpen(false);
          setIsShockSandboxOpen(true);
        }}
        onOpenInstitutionalReport={() => {
          setIsCommandPaletteOpen(false);
          setIsInstitutionalReportOpen(true);
        }}
        onToggleMilestones={() => {
          setIsCommandPaletteOpen(false);
          setIsMilestonesOpen(prev => !prev);
        }}
        onOpenCustomData={() => {
          setIsCommandPaletteOpen(false);
          setIsCustomDataOpen(true);
        }}
      />

      {/* Keyboard Shortcuts Reference Modal */}
      {isShortcutsOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in"
          onClick={() => setIsShortcutsOpen(false)}
        >
          <div 
            className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Keyboard className="w-5 h-5 text-sky-400" />
                <h3 className="text-base font-bold text-white">彭博终端式键盘快捷键指引</h3>
              </div>
              <button 
                onClick={() => setIsShortcutsOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              {[
                { key: 'Ctrl + K / ⌘K / /', desc: '打开全局命令检索面板 (Command Palette)' },
                { key: 'Space (空格键)', desc: '播放 / 暂停历史季度演进时间轴' },
                { key: '← / → (方向键)', desc: '步退 / 步进一个季度 (2018Q1 - 2026Q4 全36季)' },
                { key: 'Esc', desc: '关闭所有弹窗 / 退出经济体抽屉' },
                { key: '?', desc: '显示 / 隐藏此键盘快捷键指引' }
              ].map((sc, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800">
                  <span className="text-slate-300">{sc.desc}</span>
                  <kbd className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-sky-400 font-bold text-[11px]">
                    {sc.key}
                  </kbd>
                </div>
              ))}
            </div>

            <div className="pt-2 text-center">
              <button
                onClick={() => setIsShortcutsOpen(false)}
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
              >
                我知道了 (OK)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Institutional Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-4 px-6 text-xs text-slate-500 text-center">
        <div className="max-w-[1780px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            BIS Global Capital Flow Atlas · 国际清算银行统计宏观经济分析与金融风险对照系统
          </div>
          <div className="flex items-center gap-4 text-[11px] font-mono">
            <span>数据源: BIS LBS &amp; CBS 季度基准</span>
            <span>口径: 2018Q1-2024Q4 官方审计 / 2025Q1-2026Q4 央行先导推演</span>
            <span>总计: 36 季度</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
