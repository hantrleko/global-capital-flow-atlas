import React, { useState, useEffect, useMemo, Suspense } from 'react';
import {
  getDatasetSnapshot,
  loadHistoricalBilateral,
  loadCbsRisk,
  isQuarterLoaded,
  isCbsRiskLoaded,
  subscribeDataset
} from './services/dataLoader';
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
import MacroIntelligenceBriefing from './components/MacroIntelligenceBriefing';
import ExecutiveKpiRow from './components/ExecutiveKpiRow';
import GlobalPinnedEntityBar from './components/GlobalPinnedEntityBar';
import MacroInsightsBanner from './components/MacroInsightsBanner';
import ExecutiveVerdictBanner from './components/ExecutiveVerdictBanner';
import GuidedInvestigationHUD from './components/GuidedInvestigationHUD';
import InvestigationTracksModal from './components/InvestigationTracksModal';
import { buildLiveClearingShockMap } from './utils/portfolioStressEngine';
import soundFx from './utils/soundEffects';
import ErrorBoundary from './components/ErrorBoundary';
import { getDataClassification } from './utils/dataClassification';
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
const MethodologyAppendixModal = React.lazy(() => import('./components/MethodologyAppendixModal'));
const ChangelogModal = React.lazy(() => import('./components/ChangelogModal'));
const InstitutionalChartCardModal = React.lazy(() => import('./components/InstitutionalChartCardModal'));
const PortfolioStressOverlay = React.lazy(() => import('./components/PortfolioStressOverlay'));
const InstitutionalWorkspaceModal = React.lazy(() => import('./components/InstitutionalWorkspaceModal'));
const IcPitchDeckModal = React.lazy(() => import('./components/IcPitchDeckModal'));
import { decodeReproducibilityCode } from './utils/reproducibilityEngine';
import { evaluateWorkspaceAlerts } from './utils/workspaceStorage';

const LoadingFallback = () => (
  <div className="w-full h-80 flex flex-col items-center justify-center gap-3 text-slate-400">
    <div className="w-8 h-8 rounded-full border-2 border-sky-400 border-t-transparent animate-spin" />
    <span className="text-xs font-mono text-slate-400">正在异步加载高维量化引擎 (Code-Splitting)...</span>
  </div>
);

export default function App() {
  const [datasetState, setDatasetState] = useState(() => getDatasetSnapshot());
  const [isLoadingPartition, setIsLoadingPartition] = useState(false);
  const [partitionError, setPartitionError] = useState(null);

  useEffect(() => {
    return subscribeDataset((updated) => {
      setDatasetState(updated);
      setDatasetRevision(r => r + 1);
    });
  }, []);

  const quarters = datasetState.quarters || [];

  // Parse Deep Linking URL search parameters
  const initialParams = useMemo(() => {
    try {
      return new URLSearchParams(window.location.search);
    } catch {
      return new URLSearchParams();
    }
  }, []);

  const paramQ = initialParams.get('q');
  const paramTab = initialParams.get('tab');
  const paramCountry = initialParams.get('country');
  const paramCurrency = initialParams.get('currency');

  // Default to the latest official observed quarter (2026Q1) or deep-linked quarter
  const latestOfficialQuarter = useMemo(() => {
    const official = quarters.filter(q => q <= '2026Q1');
    return official[official.length - 1] || '2026Q1';
  }, [quarters]);

  const [selectedQuarter, setSelectedQuarter] = useState(() => {
    if (paramQ && quarters.includes(paramQ)) return paramQ;
    return '2026Q1';
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState(1);
  const [activeTab, setActiveTab] = useState(() => {
    if (paramTab) return paramTab;
    return 'map';
  });
  const [selectedCountry, setSelectedCountry] = useState(() => {
    if (paramCountry) return paramCountry;
    return null;
  });
  const [isCountryDrawerOpen, setIsCountryDrawerOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isMacroAiOpen, setIsMacroAiOpen] = useState(false);
  const [isIntroOpen, setIsIntroOpen] = useState(() => {
    if (initialParams.get('intro') === '0' || initialParams.get('intro') === 'false') return false;
    return !localStorage.getItem('bis_atlas_intro_seen');
  });
  const [isMilestonesOpen, setIsMilestonesOpen] = useState(false);
  const [isCodeExporterOpen, setIsCodeExporterOpen] = useState(false);
  const [isShockSandboxOpen, setIsShockSandboxOpen] = useState(false);
  const [isInstitutionalReportOpen, setIsInstitutionalReportOpen] = useState(false);
  const [isCustomDataOpen, setIsCustomDataOpen] = useState(false);
  const [isAppendixOpen, setIsAppendixOpen] = useState(false);
  const [isChangelogOpen, setIsChangelogOpen] = useState(false);
  const [isChartCardOpen, setIsChartCardOpen] = useState(false);
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(false);
  const [isPitchDeckOpen, setIsPitchDeckOpen] = useState(false);
  const [activeCustomPortfolio, setActiveCustomPortfolio] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [customMatrix, setCustomMatrix] = useState(null);
  const [customFileName, setCustomFileName] = useState(null);
  const [datasetRevision, setDatasetRevision] = useState(1);
  const [selectedCurrency, setSelectedCurrency] = useState(() => {
    if (paramCurrency && ['USD', 'EUR', 'CNY', 'JPY', 'GOLD'].includes(paramCurrency)) return paramCurrency;
    return localStorage.getItem('bis_atlas_currency') || 'USD';
  });
  const [isSoundMuted, setIsSoundMuted] = useState(() => soundFx.isMuted());
  const [contagionConfig, setContagionConfig] = useState(() => {
    const paramEpicenter = initialParams.get('epicenter');
    if (paramEpicenter) {
      return { epicenter: paramEpicenter, haircut: 35, deleveraging: 1.8, dollarSqueeze: 15 };
    }
    return null;
  });
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('bis_atlas_theme') || 'dark';
  });

  // v2.5 Focus Mode vs Pro Mode
  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem('bis_atlas_view_mode') || 'focus';
  });

  // v4.0 Zero-Threshold Plain-Language Lens State (Default true for lowest cognitive barrier)
  const [isBeginnerMode, setIsBeginnerMode] = useState(() => {
    const saved = localStorage.getItem('bis_atlas_beginner_mode');
    return saved !== null ? saved === 'true' : true;
  });

  const handleToggleBeginnerMode = () => {
    soundFx.playTick();
    setIsBeginnerMode(prev => {
      const next = !prev;
      localStorage.setItem('bis_atlas_beginner_mode', String(next));
      setToastMessage(next ? '💡 已开启【白话通俗解读】视角 (降低门槛与通俗类比)' : '🏛️ 已切换至【专业量化术语】视角 (高精学术/机构口径)');
      setTimeout(() => setToastMessage(null), 3000);
      return next;
    });
  };

  const handleSelectPersona = (persona) => {
    if (!persona) return;
    if (persona.actions?.enableBeginnerMode !== undefined) {
      setIsBeginnerMode(persona.actions.enableBeginnerMode);
      localStorage.setItem('bis_atlas_beginner_mode', String(persona.actions.enableBeginnerMode));
    }
    if (persona.actions?.viewMode) {
      setViewMode(persona.actions.viewMode);
      localStorage.setItem('bis_atlas_view_mode', persona.actions.viewMode);
    }
    if (persona.actions?.accountingBasis) {
      setExternalMapConfig(prev => ({ ...(prev || {}), accountingBasis: persona.actions.accountingBasis }));
    }
    if (persona.recommendedTab) {
      handleSelectTab(persona.recommendedTab);
    }
    setToastMessage(`✨ 已就绪【${persona.name}】预设视角！`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // v5.0 Academic Scenario Reproducibility Code deep-link restoration
  useEffect(() => {
    const repParam = initialParams.get('rep');
    if (repParam) {
      const decoded = decodeReproducibilityCode(repParam);
      if (decoded && decoded.isValid) {
        if (decoded.quarter) setSelectedQuarter(decoded.quarter);
        if (decoded.tab) setActiveTab(decoded.tab);
        if (decoded.epicenter) {
          setContagionConfig({
            epicenter: decoded.epicenter,
            haircut: decoded.haircut || 35,
            bufferMultiplier: decoded.bufferMultiplier || 1.5,
            deleveraging: 1.8,
            dollarSqueeze: 15
          });
        }
        if (decoded.accountingBasis) {
          setExternalMapConfig({ accountingBasis: decoded.accountingBasis });
        }
        setToastMessage(`🔬 已根据学术复现码还原情景: ${decoded.code}`);
        setTimeout(() => setToastMessage(null), 4000);
      }
    }
  }, []);

  // v2.5 Guided Investigation Playbooks State
  const [activeInvestigationTrack, setActiveInvestigationTrack] = useState(null);
  const [currentInvestigationStepIndex, setCurrentInvestigationStepIndex] = useState(0);
  const [isInvestigationModalOpen, setIsInvestigationModalOpen] = useState(false);

  // Phase 5 v3.0 & v3.5: Cross-Engine Bridges, Live Verdict Sync & State Choreography
  const [liveClearingShockMap, setLiveClearingShockMap] = useState(null);
  const [liveClearingResult, setLiveClearingResult] = useState(null);
  const [livePortfolioResult, setLivePortfolioResult] = useState(null);
  const [externalMapConfig, setExternalMapConfig] = useState(null);

  const applyInvestigationStatePayload = (payload) => {
    if (!payload) return;
    if (payload.country !== undefined) {
      setSelectedCountry(payload.country);
      if (payload.country) setIsCountryDrawerOpen(false);
    }
    if (payload.accountingBasis || payload.lookThrough !== undefined) {
      setExternalMapConfig({
        accountingBasis: payload.accountingBasis || (payload.lookThrough ? 'ultimate_risk' : 'residence'),
        selectedSector: payload.sector || 'all',
        selectedInstrument: payload.instrument || 'all'
      });
    }
    if (payload.epicenter || payload.haircut) {
      setContagionConfig(prev => ({
        ...(prev || {}),
        epicenter: payload.epicenter || prev?.epicenter || 'TR',
        haircut: payload.haircut || 35,
        deleveraging: 1.8,
        dollarSqueeze: 15
      }));
    }
  };

  const handleToggleViewMode = () => {
    soundFx.playTick();
    setViewMode(prev => {
      const next = prev === 'focus' ? 'pro' : 'focus';
      localStorage.setItem('bis_atlas_view_mode', next);
      setToastMessage(next === 'focus' ? '🎯 已切换至【焦点模式】(精简4大核心支柱)' : '🔬 已切换至【专家全量模式】(全量19模块与5大领域)');
      setTimeout(() => setToastMessage(null), 3000);
      return next;
    });
  };

  const handleStartInvestigationTrack = (track) => {
    soundFx.playChime();
    setActiveInvestigationTrack(track);
    setCurrentInvestigationStepIndex(0);
    if (track.steps && track.steps[0]) {
      const step0 = track.steps[0];
      handleSelectTab(step0.tabId);
      if (step0.statePayload) {
        applyInvestigationStatePayload(step0.statePayload);
      }
    }
    setToastMessage(`🕵️ 已启程调查主线: ${track.title}`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleNextInvestigationStep = () => {
    if (!activeInvestigationTrack) return;
    const steps = activeInvestigationTrack.steps || [];
    if (currentInvestigationStepIndex < steps.length - 1) {
      soundFx.playTick();
      const nextIdx = currentInvestigationStepIndex + 1;
      setCurrentInvestigationStepIndex(nextIdx);
      const nextStep = steps[nextIdx];
      handleSelectTab(nextStep.tabId);
      if (nextStep.statePayload) {
        applyInvestigationStatePayload(nextStep.statePayload);
      }
    } else {
      soundFx.playChime();
      setToastMessage(`🎉 恭喜！已完成【${activeInvestigationTrack.title}】全部推演！`);
      setTimeout(() => setToastMessage(null), 4000);
      setActiveInvestigationTrack(null);
      setCurrentInvestigationStepIndex(0);
    }
  };

  const handlePrevInvestigationStep = () => {
    if (!activeInvestigationTrack || currentInvestigationStepIndex <= 0) return;
    soundFx.playTick();
    const prevIdx = currentInvestigationStepIndex - 1;
    setCurrentInvestigationStepIndex(prevIdx);
    const prevStep = activeInvestigationTrack.steps[prevIdx];
    handleSelectTab(prevStep.tabId);
    if (prevStep.statePayload) {
      applyInvestigationStatePayload(prevStep.statePayload);
    }
  };

  const handleExitInvestigationTrack = () => {
    soundFx.playTick();
    setActiveInvestigationTrack(null);
    setCurrentInvestigationStepIndex(0);
  };

  const handleMapContagionToPortfolio = (contagionPayload) => {
    const shockMap = buildLiveClearingShockMap(contagionPayload);
    setLiveClearingShockMap(shockMap);
    handleSelectTab('portfolio');
    setToastMessage('🛡️ 已将当前 Eisenberg-Noe 实时清算受损向量同步至投资专户！');
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Keep URL search params synchronized for deep linking
  useEffect(() => {
    try {
      const params = new URLSearchParams();
      if (selectedQuarter) params.set('q', selectedQuarter);
      if (activeTab && activeTab !== 'map') params.set('tab', activeTab);
      if (selectedCountry) params.set('country', selectedCountry);
      if (selectedCurrency && selectedCurrency !== 'USD') params.set('currency', selectedCurrency);
      if (contagionConfig?.epicenter) params.set('epicenter', contagionConfig.epicenter);

      const qs = params.toString();
      const newPath = window.location.pathname + (qs ? `?${qs}` : '');
      window.history.replaceState(null, '', newPath);
    } catch {
      // Ignore in non-browser environments
    }
  }, [selectedQuarter, activeTab, selectedCountry, selectedCurrency]);

  const handleSelectTab = (tabId) => {
    setActiveTab(tabId);
    // Smoothly reposition scroll to main analysis viewport so stale scroll coordinates do not obscure view
    requestAnimationFrame(() => {
      const mainViewport = document.getElementById('main-viewport') || document.querySelector('main');
      if (mainViewport) {
        mainViewport.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  };

  const handleCopyDeepLink = () => {
    soundFx.playChime();
    const currentUrl = window.location.href;
    navigator.clipboard.writeText(currentUrl);
    setToastMessage('✅ 深度快照链接已复制！包含当前季度、所选视角与分析域');
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleCurrencyChange = (newCur) => {
    soundFx.playTick();
    setSelectedCurrency(newCur);
    localStorage.setItem('bis_atlas_currency', newCur);
  };

  // On-demand partition fetching: historical bilateral
  useEffect(() => {
    if (!isQuarterLoaded(selectedQuarter)) {
      setIsLoadingPartition(true);
      loadHistoricalBilateral()
        .then(() => {
          setPartitionError(null);
          setDatasetRevision(r => r + 1);
        })
        .catch(() => {
          setPartitionError('历史季度信贷数据加载失败，请检查网络');
        })
        .finally(() => {
          setIsLoadingPartition(false);
        });
    }
  }, [selectedQuarter]);

  // On-demand partition fetching: CBS risk data
  useEffect(() => {
    const riskTabs = ['ews', 'risk', 'gsib', 'maturity', 'compare', 'dossier', 'contagion', 'shadow'];
    const needsCbs = riskTabs.includes(activeTab) || Boolean(selectedCountry);
    if (needsCbs && !isCbsRiskLoaded()) {
      setIsLoadingPartition(true);
      loadCbsRisk()
        .then(() => {
          setPartitionError(null);
          setDatasetRevision(r => r + 1);
        })
        .catch(() => {
          setPartitionError('宏观审慎指标数据加载失败，请检查网络');
        })
        .finally(() => {
          setIsLoadingPartition(false);
        });
    }
  }, [activeTab, selectedCountry]);

  // Active dataset that transparently overlays custom uploaded matrix in memory with explicit datasetRevision
  const activeDataset = useMemo(() => {
    const base = customMatrix ? {
      ...datasetState,
      bilateral_matrix: {
        ...datasetState.bilateral_matrix,
        [selectedQuarter]: customMatrix
      }
    } : datasetState;
    return {
      ...base,
      datasetRevision
    };
  }, [customMatrix, selectedQuarter, datasetRevision, datasetState]);

  const liveVerdictContext = useMemo(() => ({
    dataset: activeDataset,
    selectedQuarter,
    selectedCountry,
    selectedCurrency,
    clearingResult: liveClearingResult,
    portfolioResult: livePortfolioResult,
    lookThroughEnabled: externalMapConfig?.accountingBasis === 'ultimate_risk'
  }), [activeDataset, selectedQuarter, selectedCountry, selectedCurrency, liveClearingResult, livePortfolioResult, externalMapConfig]);

  const workspaceAlertCount = useMemo(() => {
    const alerts = evaluateWorkspaceAlerts({
      incrementalLoss: liveClearingResult?.incrementalTotalRaw ?? 0,
      cipBasis: -32,
      stressVaR: livePortfolioResult?.stressVaR99Mn ?? 0
    });
    return alerts.length;
  }, [liveClearingResult, livePortfolioResult]);

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
    return Object.fromEntries((datasetState.global_macro || []).map(m => [m.quarter, m]));
  }, [datasetState]);

  const currentQuarterMacro = globalMacroMap[selectedQuarter] || {};
  const currentClaimsVal = currentQuarterMacro.total_cross_border_claims_usd_bn
    ? (currentQuarterMacro.total_cross_border_claims_usd_bn / 1000).toFixed(2)
    : '47.62';

  const quarterStatusLabel = useMemo(() => {
    const meta = getDataClassification(selectedQuarter);
    return {
      badge: meta.label,
      badgeColor: meta.badgeClass,
      dotColor: meta.dotClass,
      text: meta.isOfficial
        ? `官方总额 $${currentClaimsVal}T (BIS 审计发布)`
        : meta.type === 'PENDING_ESTIMATE'
          ? `待公布估算 $${currentClaimsVal}T (待10月30日公布)`
          : `情景中值 $${currentClaimsVal}T (范围 $47.90T–$49.30T)`
    };
  }, [selectedQuarter, currentClaimsVal]);

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
        if (isCountryDrawerOpen) {
          setIsCountryDrawerOpen(false);
        } else {
          setSelectedCountry(null);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [quarters]);

  return (
    <div className="min-h-screen cyber-bg-glow text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white overflow-x-hidden">
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
        onSelectTab={handleSelectTab}
        countries={activeDataset.countries}
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
        onOpenAppendix={() => setIsAppendixOpen(true)}
        onCopyDeepLink={handleCopyDeepLink}
        onOpenChangelog={() => setIsChangelogOpen(true)}
        onOpenChartCard={() => setIsChartCardOpen(true)}
        viewMode={viewMode}
        onToggleViewMode={handleToggleViewMode}
        onOpenInvestigationModal={() => setIsInvestigationModalOpen(true)}
        isBeginnerMode={isBeginnerMode}
        onToggleBeginnerMode={handleToggleBeginnerMode}
        onOpenWorkspace={() => setIsWorkspaceOpen(true)}
        workspaceAlertCount={workspaceAlertCount}
        onOpenPitchDeck={() => setIsPitchDeckOpen(true)}
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

      {/* On-demand partition fetch indicator */}
      {isLoadingPartition && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-2 bg-slate-900/95 border border-sky-500/50 text-sky-300 text-xs px-3.5 py-1.5 rounded-full shadow-[0_0_20px_rgba(56,189,248,0.3)] backdrop-blur animate-fade-in pointer-events-none">
          <div className="w-3 h-3 rounded-full border-2 border-sky-400 border-t-transparent animate-spin" />
          <span className="font-mono font-medium">按需载入高维数据分片...</span>
        </div>
      )}
      {partitionError && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-2.5 bg-rose-950/95 border border-rose-500/50 text-rose-200 text-xs px-3.5 py-1.5 rounded-full shadow-[0_0_20px_rgba(244,63,94,0.3)] backdrop-blur animate-fade-in">
          <span>{partitionError}</span>
          <button
            onClick={() => {
              setPartitionError(null);
              loadHistoricalBilateral();
              loadCbsRisk();
            }}
            className="underline font-bold text-white hover:text-rose-100 cursor-pointer"
          >
            重试
          </button>
        </div>
      )}

      {/* Main Analysis Viewport */}
      <main
        id="main-viewport"
        tabIndex={-1}
        className="flex-1 max-w-[1780px] w-full mx-auto px-3 sm:px-5 py-1.5 space-y-1.5 scroll-mt-24 outline-none"
      >
        {/* 3 Compact Executive KPIs: 全球信贷总额 · 美元计价份额与紧缩 · 核心走廊与枢纽 */}
        <ExecutiveKpiRow
          dataset={activeDataset}
          selectedQuarter={selectedQuarter}
          selectedCurrency={selectedCurrency}
        />

        {/* Pinned Entity Context Ribbon: Cross-Module Sovereign Stress Testing */}
        {selectedCountry && (
          <GlobalPinnedEntityBar
            selectedCountry={selectedCountry}
            dataset={activeDataset}
            selectedQuarter={selectedQuarter}
            activeTab={activeTab}
            onSelectTab={handleSelectTab}
            onSetContagionEpicenter={(code) => {
              setContagionConfig({ epicenter: code, haircut: 35, deleveraging: 1.8, dollarSqueeze: 15 });
            }}
            onClearCountry={() => {
              setSelectedCountry(null);
              setIsCountryDrawerOpen(false);
            }}
            onOpenDrawer={() => setIsCountryDrawerOpen(true)}
          />
        )}

        {/* 30-Second Institutional Macro Insights Single-Line Ticker (34px height, only on map tab to protect secondary tab folds) */}
        {activeTab === 'map' && (
          <MacroInsightsBanner
            dataset={activeDataset}
            selectedQuarter={selectedQuarter}
            onSelectTab={handleSelectTab}
            onSelectCountry={(code) => setSelectedCountry(code)}
            onSetContagionEpicenter={(code) => {
              setContagionConfig({ epicenter: code, haircut: 35, deleveraging: 1.8, dollarSqueeze: 15 });
            }}
          />
        )}

        {/* v3.5 First-Screen Top Dynamic Verdict Strip (Compact ~38px bar, expands into 3-stage reasoning deck) */}
        <ExecutiveVerdictBanner
          activeTab={activeTab}
          onSelectTab={handleSelectTab}
          context={liveVerdictContext}
          isBeginnerMode={isBeginnerMode}
          onToggleBeginnerMode={handleToggleBeginnerMode}
        />

        <ErrorBoundary fallbackTitle="当前主视图分析模块">
          <Suspense fallback={<LoadingFallback />}>
          {activeTab === 'map' && (
            <CapitalFlowMap
              dataset={activeDataset}
              selectedQuarter={selectedQuarter}
              onSelectQuarter={(q) => setSelectedQuarter(q)}
              selectedCountry={selectedCountry}
              onSelectCountry={(code) => setSelectedCountry(code)}
              selectedCurrency={selectedCurrency}
              onOpenAppendix={() => setIsAppendixOpen(true)}
              externalMapConfig={externalMapConfig}
            />
          )}

          {activeTab === 'network' && (
            <NetworkTopology
              dataset={activeDataset}
              selectedQuarter={selectedQuarter}
              selectedCountry={selectedCountry}
              onSelectCountry={(code) => setSelectedCountry(code)}
              onOpenAppendix={() => setIsAppendixOpen(true)}
            />
          )}

          {activeTab === 'ews' && (
            <ErrorBoundary fallbackTitle="巴塞尔危机早期预警系统 (EWS) 模块">
              <EarlyWarningSystem
                dataset={activeDataset}
                selectedQuarter={selectedQuarter}
                onSelectQuarter={(q) => setSelectedQuarter(q)}
                onSelectCountry={(code) => setSelectedCountry(code)}
                onOpenAppendix={() => setIsAppendixOpen(true)}
              />
            </ErrorBoundary>
          )}

          {activeTab === 'gsib' && (
            <GsibMonitor
              dataset={activeDataset}
              selectedQuarter={selectedQuarter}
              onSelectCountry={(code) => setSelectedCountry(code)}
              selectedCurrency={selectedCurrency}
              onOpenAppendix={() => setIsAppendixOpen(true)}
            />
          )}

          {activeTab === 'fragmentation' && (
            <FinancialFragmentation
              dataset={activeDataset}
              selectedQuarter={selectedQuarter}
              onSelectCountry={(code) => setSelectedCountry(code)}
              onOpenAppendix={() => setIsAppendixOpen(true)}
            />
          )}

          {activeTab === 'routing' && (
            <BilateralRoutingMatrix
              dataset={activeDataset}
              selectedQuarter={selectedQuarter}
              onSelectCountry={(code) => setSelectedCountry(code)}
              onOpenAppendix={() => setIsAppendixOpen(true)}
            />
          )}

          {activeTab === 'shadow' && (
            <ShadowBankingMonitor
              dataset={activeDataset}
              selectedQuarter={selectedQuarter}
              onSelectCountry={(code) => setSelectedCountry(code)}
              onOpenAppendix={() => setIsAppendixOpen(true)}
            />
          )}

          {activeTab === 'contagion' && (
            <NetworkContagionSimulator
              dataset={activeDataset}
              selectedQuarter={selectedQuarter}
              onSelectCountry={(code) => setSelectedCountry(code)}
              contagionConfig={contagionConfig}
              onOpenAppendix={() => setIsAppendixOpen(true)}
              onOpenChartCard={() => setIsChartCardOpen(true)}
              onMapToPortfolio={handleMapContagionToPortfolio}
              onClearingResultChange={setLiveClearingResult}
            />
          )}

          {activeTab === 'portfolio' && (
            <PortfolioStressOverlay
              dataset={activeDataset}
              selectedQuarter={selectedQuarter}
              selectedCurrency={selectedCurrency}
              onOpenChartCard={() => setIsChartCardOpen(true)}
              onOpenContagion={() => handleSelectTab('contagion')}
              onOpenPitchDeck={() => setIsPitchDeckOpen(true)}
              liveClearingShockMap={liveClearingShockMap}
              onPortfolioResultChange={setLivePortfolioResult}
              externalPortfolio={activeCustomPortfolio}
            />
          )}

          {activeTab === 'maturity' && (
            <MaturityRolloverMonitor
              dataset={activeDataset}
              selectedQuarter={selectedQuarter}
              onSelectCountry={(code) => setSelectedCountry(code)}
              onOpenAppendix={() => setIsAppendixOpen(true)}
            />
          )}

          {activeTab === 'swaps' && (
            <CentralBankSwapLines
              dataset={activeDataset}
              selectedQuarter={selectedQuarter}
              onSelectCountry={(code) => setSelectedCountry(code)}
              onOpenAppendix={() => setIsAppendixOpen(true)}
            />
          )}

          {activeTab === 'usd' && (
            <UsdFundingMonitor
              dataset={activeDataset}
              selectedQuarter={selectedQuarter}
              onSelectCountry={(code) => setSelectedCountry(code)}
              onOpenAppendix={() => setIsAppendixOpen(true)}
            />
          )}

          {activeTab === 'currency' && (
            <CurrencyHegemonyTracker
              dataset={activeDataset}
              selectedQuarter={selectedQuarter}
              onSelectCountry={(code) => setSelectedCountry(code)}
              onOpenAppendix={() => setIsAppendixOpen(true)}
            />
          )}

          {activeTab === 'risk' && (
            <CountryRiskMatrix
              dataset={activeDataset}
              selectedQuarter={selectedQuarter}
              selectedCountry={selectedCountry}
              onSelectCountry={(code) => setSelectedCountry(code)}
              onOpenAppendix={() => setIsAppendixOpen(true)}
            />
          )}

          {activeTab === 'compare' && (
            <MultiCountryCompare
              dataset={activeDataset}
              selectedQuarter={selectedQuarter}
              onSelectCountry={(code) => setSelectedCountry(code)}
              onOpenAppendix={() => setIsAppendixOpen(true)}
            />
          )}

          {activeTab === 'gravity' && (
            <GravityEconometrics
              dataset={activeDataset}
              selectedQuarter={selectedQuarter}
              onSelectCountry={(code) => setSelectedCountry(code)}
              onOpenAppendix={() => setIsAppendixOpen(true)}
            />
          )}

          {activeTab === 'comparison' && (
            <RegimeComparison
              dataset={activeDataset}
              onSelectCountry={(code) => setSelectedCountry(code)}
              onOpenAppendix={() => setIsAppendixOpen(true)}
            />
          )}

          {activeTab === 'playbook' && (
            <CrisisPlaybook
              dataset={activeDataset}
              selectedQuarter={selectedQuarter}
              onSelectQuarter={(q) => setSelectedQuarter(q)}
              onSelectCountry={(code) => setSelectedCountry(code)}
              onSelectTab={handleSelectTab}
              onSetContagionConfig={setContagionConfig}
            />
          )}

          {activeTab === 'dossier' && (
            <ResearchDossier
              dataset={activeDataset}
              selectedQuarter={selectedQuarter}
              onOpenAppendix={() => setIsAppendixOpen(true)}
            />
          )}
        </Suspense>
        </ErrorBoundary>

        {/* Collapsible Deep Intelligence Briefing: 宏观态势速览与研判依据 (位于主图下方，不抢占首屏) */}
        <MacroIntelligenceBriefing
          dataset={activeDataset}
          selectedQuarter={selectedQuarter}
          selectedCurrency={selectedCurrency}
          onOpenAppendix={() => setIsAppendixOpen(true)}
          onOpenCodeExporter={() => setIsCodeExporterOpen(true)}
        />
      </main>

      {/* Sovereign 360° Detailed Profile Drawer (Overlay) */}
      {selectedCountry && isCountryDrawerOpen && (
        <CountryDrawer
          dataset={activeDataset}
          countryCode={selectedCountry}
          selectedQuarter={selectedQuarter}
          onClose={() => setIsCountryDrawerOpen(false)}
          onSelectTab={setActiveTab}
          onSelectQuarter={setSelectedQuarter}
          onSelectCountry={setSelectedCountry}
          onSetContagionEpicenter={(code) => {
            setContagionConfig({ epicenter: code, haircut: 35, deleveraging: 1.8, dollarSqueeze: 15 });
          }}
        />
      )}

      {/* BIS Atlas Project Brief & Institutional Onboarding Modal */}
      <ProjectIntroModal
        isOpen={isIntroOpen}
        onClose={() => setIsIntroOpen(false)}
        onExploreFeature={(tab) => {
          handleSelectTab(tab);
          setIsIntroOpen(false);
        }}
        onSelectPersona={(persona) => {
          handleSelectPersona(persona);
          setIsIntroOpen(false);
        }}
      />

      {/* Econometrics Code Exporter Modal */}
      <EconometricsCodeExporter
        isOpen={isCodeExporterOpen}
        onClose={() => setIsCodeExporterOpen(false)}
        selectedQuarter={selectedQuarter}
        countries={activeDataset.countries}
      />

      {/* Macro Shock Sandbox Modal */}
      <MacroShockSandbox
        isOpen={isShockSandboxOpen}
        onClose={() => setIsShockSandboxOpen(false)}
        dataset={activeDataset}
        selectedQuarter={selectedQuarter}
        onApplyShock={(shock) => {
          setContagionConfig(shock);
          handleSelectTab('contagion');
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
      {isCustomDataOpen && (
        <Suspense fallback={null}>
          <CustomDataImporter
            isOpen={isCustomDataOpen}
            onClose={() => setIsCustomDataOpen(false)}
            onApplyCustomData={(matrix, fName) => {
              setCustomMatrix(matrix);
              setCustomFileName(fName);
              setDatasetRevision(r => r + 1);
            }}
            onResetToOfficial={() => {
              setCustomMatrix(null);
              setCustomFileName(null);
              setDatasetRevision(r => r + 1);
            }}
          />
        </Suspense>
      )}

      {/* BIS Macro AI Copilot Modal Window */}
      <MacroAiCopilot
        isOpen={isMacroAiOpen}
        onClose={() => setIsMacroAiOpen(false)}
        dataset={activeDataset}
        selectedQuarter={selectedQuarter}
        onSelectQuarter={setSelectedQuarter}
        onSelectTab={handleSelectTab}
        onSelectCountry={setSelectedCountry}
        activeTab={activeTab}
      />

      {/* Command Palette Modal */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        countries={activeDataset.countries}
        quarters={quarters}
        selectedQuarter={selectedQuarter}
        onSelectQuarter={(q) => {
          setSelectedQuarter(q);
          setIsPlaying(false);
        }}
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
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
        onOpenAppendix={() => {
          setIsCommandPaletteOpen(false);
          setIsAppendixOpen(true);
        }}
        onCopyDeepLink={() => {
          setIsCommandPaletteOpen(false);
          handleCopyDeepLink();
        }}
      />

      {/* Methodology & Data Appendix Modal */}
      <Suspense fallback={null}>
        <MethodologyAppendixModal
          isOpen={isAppendixOpen}
          onClose={() => setIsAppendixOpen(false)}
        />
      </Suspense>

      {/* Release Evolution Changelog Modal */}
      {isChangelogOpen && (
        <Suspense fallback={null}>
          <ChangelogModal
            isOpen={isChangelogOpen}
            onClose={() => setIsChangelogOpen(false)}
          />
        </Suspense>
      )}

      {/* Publication-Ready Institutional Chart Card Modal */}
      {isChartCardOpen && (
        <Suspense fallback={null}>
          <InstitutionalChartCardModal
            isOpen={isChartCardOpen}
            onClose={() => setIsChartCardOpen(false)}
            dataset={activeDataset}
            selectedQuarter={selectedQuarter}
            selectedCurrency={selectedCurrency}
          />
        </Suspense>
      )}

      {/* v5.0 Institutional Local Workspace Modal */}
      {isWorkspaceOpen && (
        <Suspense fallback={null}>
          <InstitutionalWorkspaceModal
            isOpen={isWorkspaceOpen}
            onClose={() => setIsWorkspaceOpen(false)}
            dataset={activeDataset}
            selectedQuarter={selectedQuarter}
            countries={activeDataset.countries}
            onSelectQuarter={setSelectedQuarter}
            onSelectTab={handleSelectTab}
            onSelectCountry={setSelectedCountry}
            liveClearingResult={liveClearingResult}
            livePortfolioResult={livePortfolioResult}
            onApplyScenario={(sc) => {
              setContagionConfig({
                epicenter: sc.epicenter || 'TR',
                haircut: sc.haircut || 35,
                bufferMultiplier: sc.bufferMultiplier || 1.5,
                deleveraging: 1.8,
                dollarSqueeze: 15
              });
              if (sc.accountingBasis) {
                setExternalMapConfig(prev => ({ ...(prev || {}), accountingBasis: sc.accountingBasis }));
              }
              handleSelectTab('contagion');
              setToastMessage(`🎯 已加载学术情景: ${sc.epicenter} (Haircut ${sc.haircut}%)`);
              setTimeout(() => setToastMessage(null), 3000);
            }}
            onApplyPortfolio={(p) => {
              setActiveCustomPortfolio(p);
              handleSelectTab('portfolio');
              setToastMessage(`💼 已载入投资专户: ${p.name}`);
              setTimeout(() => setToastMessage(null), 3000);
            }}
          />
        </Suspense>
      )}

      {/* v6.0 Institutional Investment Committee (IC) PitchDeck Presentation Modal */}
      {isPitchDeckOpen && (
        <Suspense fallback={null}>
          <IcPitchDeckModal
            isOpen={isPitchDeckOpen}
            onClose={() => setIsPitchDeckOpen(false)}
            dataset={activeDataset}
            selectedQuarter={selectedQuarter}
            portfolioStressResult={livePortfolioResult}
            activePortfolio={activeCustomPortfolio}
            clearingResult={liveClearingResult}
            epicenter={contagionConfig?.epicenter || 'TR'}
            haircut={contagionConfig?.haircut || 25}
            bufferMultiplier={contagionConfig?.bufferMultiplier || 1.5}
          />
        </Suspense>
      )}

      {/* Floating Deep Link Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl bg-slate-900/95 border border-emerald-500/50 text-emerald-300 text-xs font-mono shadow-[0_0_20px_rgba(16,185,129,0.35)] backdrop-blur-md flex items-center gap-2 animate-bounce-subtle">
          <span>{toastMessage}</span>
        </div>
      )}

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
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold cursor-pointer"
              >
                我知道了 (OK)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Institutional Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-4 px-6 text-xs text-slate-500 text-center">
        <div className="max-w-[1780px] mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 text-slate-400">
            <span className="font-medium text-slate-300">EUGENE FINANCE Global Capital Flow Atlas</span>
            <span className="text-slate-600">·</span>
            <span>EUGENE FINANCE Quantitative Macro Research</span>
          </div>

          {/* User Requested Data Statement with Methodology Link & Dynamic Provenance */}
          <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] font-mono text-slate-400 bg-slate-900/60 px-3 py-1.5 rounded-lg border border-slate-800/60">
            <span className={`inline-block w-1.5 h-1.5 rounded-full ${quarterStatusLabel.dotColor} animate-pulse`} />
            <span className={`px-1.5 py-0.5 rounded border text-[11px] ${quarterStatusLabel.badgeColor}`}>
              {quarterStatusLabel.badge}
            </span>
            <span>
              {selectedQuarter} · {quarterStatusLabel.text} · 国别/双边走廊由 RAS 模型重构分配 · 
            </span>
            <button
              onClick={() => setIsAppendixOpen(true)}
              className="text-sky-400 hover:text-sky-300 underline underline-offset-2 transition-colors cursor-pointer"
            >
              方法论见附录 →
            </button>
          </div>

          <div className="flex items-center gap-2.5 text-[11px] font-mono text-slate-500">
            <button
              onClick={() => setIsChangelogOpen(true)}
              className="text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 cursor-pointer transition-colors bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/30"
              title="查看平台版本迭代记录与演进架构"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>v6.0.0 日志</span>
            </button>
            <span>·</span>
            <span>官方序列截至 2026Q1 ($47.62T)</span>
            <span>·</span>
            <span>36 季度跨国网络</span>
            <span>·</span>
            <a
              href="https://github.com/hantrleko/global-capital-flow-atlas"
              target="_blank"
              rel="noreferrer"
              className="hover:text-slate-300 transition-colors"
            >
              GitHub 源码
            </a>
          </div>
        </div>
      </footer>

      {/* v2.5 Floating Guided Investigation HUD */}
      <GuidedInvestigationHUD
        activeTrack={activeInvestigationTrack}
        currentStepIndex={currentInvestigationStepIndex}
        onNextStep={handleNextInvestigationStep}
        onPrevStep={handlePrevInvestigationStep}
        onExitTrack={handleExitInvestigationTrack}
      />

      {/* v2.5 Guided Investigation Playbooks Modal */}
      <InvestigationTracksModal
        isOpen={isInvestigationModalOpen}
        onClose={() => setIsInvestigationModalOpen(false)}
        onStartTrack={handleStartInvestigationTrack}
      />
    </div>
  );
}
