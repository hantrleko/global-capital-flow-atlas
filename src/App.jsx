import React, { useState, useEffect, useMemo } from 'react';
import bisDataset from './data/bis_atlas_dataset.json';
import Header from './components/Header';
import CapitalFlowMap from './components/CapitalFlowMap';
import NetworkTopology from './components/NetworkTopology';
import EarlyWarningSystem from './components/EarlyWarningSystem';
import FinancialFragmentation from './components/FinancialFragmentation';
import BilateralRoutingMatrix from './components/BilateralRoutingMatrix';
import ShadowBankingMonitor from './components/ShadowBankingMonitor';
import NetworkContagionSimulator from './components/NetworkContagionSimulator';
import MaturityRolloverMonitor from './components/MaturityRolloverMonitor';
import CentralBankSwapLines from './components/CentralBankSwapLines';
import UsdFundingMonitor from './components/UsdFundingMonitor';
import CurrencyHegemonyTracker from './components/CurrencyHegemonyTracker';
import CountryRiskMatrix from './components/CountryRiskMatrix';
import MultiCountryCompare from './components/MultiCountryCompare';
import GravityEconometrics from './components/GravityEconometrics';
import RegimeComparison from './components/RegimeComparison';
import CrisisPlaybook from './components/CrisisPlaybook';
import ResearchDossier from './components/ResearchDossier';
import CountryDrawer from './components/CountryDrawer';
import CommandPalette from './components/CommandPalette';
import { Keyboard, X } from 'lucide-react';

export default function App() {
  const quarters = bisDataset.quarters || [];
  // Default to the latest quarter 2024Q4
  const [selectedQuarter, setSelectedQuarter] = useState(quarters[quarters.length - 1] || '2024Q4');
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState(1);
  const [activeTab, setActiveTab] = useState('map');
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('bis_atlas_theme') || 'dark';
  });

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
        setIsPlaying(prev => !prev);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setSelectedQuarter(prev => {
          const curIdx = quarters.indexOf(prev);
          return curIdx > 0 ? quarters[curIdx - 1] : prev;
        });
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setSelectedQuarter(prev => {
          const curIdx = quarters.indexOf(prev);
          return curIdx < quarters.length - 1 ? quarters[curIdx + 1] : prev;
        });
      } else if (e.key === 'Escape') {
        setIsCommandPaletteOpen(false);
        setIsShortcutsOpen(false);
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
      />

      {/* Main Analysis Viewport */}
      <main className="flex-1 max-w-[1780px] w-full mx-auto p-4 md:p-6 space-y-6">
        {activeTab === 'map' && (
          <CapitalFlowMap
            dataset={bisDataset}
            selectedQuarter={selectedQuarter}
            onSelectQuarter={(q) => setSelectedQuarter(q)}
            selectedCountry={selectedCountry}
            onSelectCountry={(code) => setSelectedCountry(code)}
          />
        )}

        {activeTab === 'network' && (
          <NetworkTopology
            dataset={bisDataset}
            selectedQuarter={selectedQuarter}
            selectedCountry={selectedCountry}
            onSelectCountry={(code) => setSelectedCountry(code)}
          />
        )}

        {activeTab === 'ews' && (
          <EarlyWarningSystem
            dataset={bisDataset}
            selectedQuarter={selectedQuarter}
            onSelectQuarter={(q) => setSelectedQuarter(q)}
            onSelectCountry={(code) => setSelectedCountry(code)}
          />
        )}

        {activeTab === 'fragmentation' && (
          <FinancialFragmentation
            dataset={bisDataset}
            selectedQuarter={selectedQuarter}
            onSelectCountry={(code) => setSelectedCountry(code)}
          />
        )}

        {activeTab === 'routing' && (
          <BilateralRoutingMatrix
            dataset={bisDataset}
            selectedQuarter={selectedQuarter}
            onSelectCountry={(code) => setSelectedCountry(code)}
          />
        )}

        {activeTab === 'shadow' && (
          <ShadowBankingMonitor
            dataset={bisDataset}
            selectedQuarter={selectedQuarter}
            onSelectCountry={(code) => setSelectedCountry(code)}
          />
        )}

        {activeTab === 'contagion' && (
          <NetworkContagionSimulator
            dataset={bisDataset}
            selectedQuarter={selectedQuarter}
            onSelectCountry={(code) => setSelectedCountry(code)}
          />
        )}

        {activeTab === 'maturity' && (
          <MaturityRolloverMonitor
            dataset={bisDataset}
            selectedQuarter={selectedQuarter}
            onSelectCountry={(code) => setSelectedCountry(code)}
          />
        )}

        {activeTab === 'swaps' && (
          <CentralBankSwapLines
            dataset={bisDataset}
            selectedQuarter={selectedQuarter}
            onSelectCountry={(code) => setSelectedCountry(code)}
          />
        )}

        {activeTab === 'usd' && (
          <UsdFundingMonitor
            dataset={bisDataset}
            selectedQuarter={selectedQuarter}
            onSelectCountry={(code) => setSelectedCountry(code)}
          />
        )}

        {activeTab === 'currency' && (
          <CurrencyHegemonyTracker
            dataset={bisDataset}
            selectedQuarter={selectedQuarter}
            onSelectCountry={(code) => setSelectedCountry(code)}
          />
        )}

        {activeTab === 'risk' && (
          <CountryRiskMatrix
            dataset={bisDataset}
            selectedQuarter={selectedQuarter}
            selectedCountry={selectedCountry}
            onSelectCountry={(code) => setSelectedCountry(code)}
          />
        )}

        {activeTab === 'compare' && (
          <MultiCountryCompare
            dataset={bisDataset}
            selectedQuarter={selectedQuarter}
            onSelectCountry={(code) => setSelectedCountry(code)}
          />
        )}

        {activeTab === 'gravity' && (
          <GravityEconometrics
            dataset={bisDataset}
            selectedQuarter={selectedQuarter}
            onSelectCountry={(code) => setSelectedCountry(code)}
          />
        )}

        {activeTab === 'comparison' && (
          <RegimeComparison
            dataset={bisDataset}
            onSelectCountry={(code) => setSelectedCountry(code)}
          />
        )}

        {activeTab === 'playbook' && (
          <CrisisPlaybook
            dataset={bisDataset}
            selectedQuarter={selectedQuarter}
            onSelectQuarter={(q) => setSelectedQuarter(q)}
            onSelectCountry={(code) => setSelectedCountry(code)}
          />
        )}

        {activeTab === 'dossier' && (
          <ResearchDossier
            dataset={bisDataset}
            selectedQuarter={selectedQuarter}
          />
        )}
      </main>

      {/* Country Detailed Drawer (Overlay) */}
      {selectedCountry && (
        <CountryDrawer
          dataset={bisDataset}
          countryCode={selectedCountry}
          selectedQuarter={selectedQuarter}
          onClose={() => setSelectedCountry(null)}
        />
      )}

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
                { key: '← / → (方向键)', desc: '步退 / 步进一个季度 (2018Q1 - 2024Q4)' },
                { key: 'Esc', desc: '关闭弹窗 / 退出经济体抽屉' },
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
            <span>数据源: BIS LBS &amp; CBS 官方季度系列</span>
            <span>频率: 原始季度 (Zero Fabricated Daily Flows)</span>
            <span>覆盖: 2018Q1 - 2024Q4</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
