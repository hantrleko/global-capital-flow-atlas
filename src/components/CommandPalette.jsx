import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Search, Globe, Layers, Calendar, ArrowRight, X, Command, 
  HelpCircle, Moon, Sun, Activity, ShieldAlert, Split, Sliders,
  Code, FileText, BookOpen, History, UploadCloud, Building2
} from 'lucide-react';
import { HISTORICAL_REGIMES } from '../utils/macroScenarios';

export default function CommandPalette({
  isOpen,
  onClose,
  countries = [],
  quarters = [],
  selectedQuarter,
  onSelectQuarter,
  activeTab,
  onSelectTab,
  onSelectCountry,
  theme,
  onToggleTheme,
  onOpenIntro,
  onOpenCodeExporter,
  onOpenShockSandbox,
  onOpenInstitutionalReport,
  onToggleMilestones,
  onOpenCustomData
}) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const tabs = [
    { id: 'map', label: '🌐 跨境信贷流向地图', cat: '核心视图' },
    { id: 'network', label: '🕸️ 全球金融网络拓扑', cat: '核心视图' },
    { id: 'ews', label: '🚦 巴塞尔 III 早期预警 (EWS)', cat: '宏观审慎' },
    { id: 'gsib', label: '🏛️ G-SIB 顶级银行透镜', cat: '微观穿透' },
    { id: 'fragmentation', label: '💔 地缘金融碎片化与阵营', cat: '地缘政治' },
    { id: 'routing', label: '🔀 资本路由与双边矩阵', cat: '结构分析' },
    { id: 'shadow', label: '🏦 离岸影子银行与非银透视', cat: '非银体系' },
    { id: 'contagion', label: '💥 跨国银行级联传染模拟', cat: '压力测试' },
    { id: 'maturity', label: '⏱️ 期限结构与转期挤兑', cat: '流动性风险' },
    { id: 'swaps', label: '🔄 央行互换线与基差', cat: '货币市场' },
    { id: 'usd', label: '💵 美元融资与部门结构', cat: '货币霸权' },
    { id: 'currency', label: '🪙 多极货币竞争与错配', cat: '货币霸权' },
    { id: 'risk', label: '🛡️ 国家风险与外债敞口', cat: '主权信用' },
    { id: 'compare', label: '🎯 多国宏观雷达对照', cat: '比较研究' },
    { id: 'gravity', label: '🪐 实证引力模型探索', cat: '计量经济学' },
    { id: 'comparison', label: '⚖️ 跨周期宏观对比', cat: '周期研究' },
    { id: 'playbook', label: '🎬 历史风暴情景剧场', cat: '案例推演' },
    { id: 'dossier', label: '📑 宏观研报与数据导出', cat: '研究交付' }
  ];

  // Combined search results
  const filteredResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    const results = [];

    // 1. Actions / Themes & Pro Tools
    if (!q || '主题 浅色 暗色 theme light dark 彭博 金融时报'.includes(q)) {
      results.push({
        type: 'action',
        title: theme === 'dark' ? '切换为 FT 浅色纸媒模式' : '切换为彭博终端暗色模式',
        desc: '切换全站视觉主题配色',
        icon: theme === 'dark' ? Sun : Moon,
        action: () => onToggleTheme?.()
      });
    }

    if (!q || '代码 导出 python r stata 计量 引力模型 code export econometrics'.includes(q)) {
      results.push({
        type: 'action',
        title: '💻 生成 Python / R / Stata 计量引力模型代码',
        desc: '生成可直接执行的跨国银行双边引力回归与网络清算脚本',
        icon: Code,
        action: () => onOpenCodeExporter?.()
      });
    }

    if (!q || '冲击 压力测试 沙盒 危机 违约 shock sandbox stress test'.includes(q)) {
      results.push({
        type: 'action',
        title: '⚡ 复合宏观冲击调制台与压力测试沙盒',
        desc: '自由调制加息、信贷收缩、掉期基差与主权违约因子',
        icon: Sliders,
        action: () => onOpenShockSandbox?.()
      });
    }

    if (!q || '简报 报告 打印 pdf 导出 投研 dossier report brief'.includes(q)) {
      results.push({
        type: 'action',
        title: '📑 投委会级 A4 宏观研判与风险评估简报',
        desc: '一键生成高保真双语投研报告，支持另存为 PDF 或导出 Markdown',
        icon: FileText,
        action: () => onOpenInstitutionalReport?.()
      });
    }

    if (!q || '大事件 里程碑 纪元 历史 2018 2026 milestone events history'.includes(q)) {
      results.push({
        type: 'action',
        title: '📜 展开 / 折叠宏观历史大事件纪元轴 (2018-2026)',
        desc: '浏览涵盖 36 季度的关键转折期大事记，点击秒级穿梭',
        icon: History,
        action: () => onToggleMilestones?.()
      });
    }

    if (!q || '导读 简介 背景 意义 intro brief guide onboarding'.includes(q)) {
      results.push({
        type: 'action',
        title: '📖 打开项目创立初衷与平台学术导读',
        desc: '查阅为何总信贷流向优于经常账户贸易、BIS 统计学三大支柱',
        icon: BookOpen,
        action: () => onOpenIntro?.()
      });
    }

    if (!q || '导入 私有 数据 自定义 upload excel csv import custom portfolio'.includes(q)) {
      results.push({
        type: 'action',
        title: '📥 机构私有资产敞口导入沙盒 (Excel / CSV)',
        desc: '上传本地投资组合或银行双边敞口，在本地内存中即刻全景推演',
        icon: UploadCloud,
        action: () => onOpenCustomData?.()
      });
    }

    // 2. Navigation Tabs
    tabs.forEach(t => {
      if (!q || t.label.toLowerCase().includes(q) || t.cat.toLowerCase().includes(q) || t.id.includes(q)) {
        results.push({
          type: 'tab',
          title: t.label,
          desc: `跳转到模块 [${t.cat}]`,
          icon: Layers,
          action: () => onSelectTab(t.id)
        });
      }
    });

    // 3. Countries
    countries.forEach(c => {
      if (!q || c.name_zh.toLowerCase().includes(q) || c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)) {
        results.push({
          type: 'country',
          title: `${c.code} · ${c.name_zh} (${c.name})`,
          desc: `${c.region} · GDP $${c.gdp_usd_bn}B · ${c.desc}`,
          icon: Globe,
          action: () => onSelectCountry(c.code)
        });
      }
    });

    // 4. Regimes
    HISTORICAL_REGIMES.forEach(r => {
      if (!q || r.name.toLowerCase().includes(q) || r.quarter.toLowerCase().includes(q) || r.description.toLowerCase().includes(q)) {
        results.push({
          type: 'regime',
          title: `历史风暴情景: ${r.quarter} · ${r.name}`,
          desc: r.description,
          icon: Calendar,
          action: () => onSelectQuarter(r.quarter)
        });
      }
    });

    return results.slice(0, 16);
  }, [query, countries, theme, tabs]);

  // Key navigation in list
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => (prev + 1) % Math.max(1, filteredResults.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => (prev - 1 + filteredResults.length) % Math.max(1, filteredResults.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = filteredResults[activeIndex];
      if (item) {
        item.action();
        onClose();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 md:pt-24 px-4 bg-slate-950/75 backdrop-blur-md animate-fade-in">
      <div 
        className="w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[75vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="p-3.5 border-b border-slate-800 flex items-center gap-3 bg-slate-950/60">
          <Search className="w-5 h-5 text-sky-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="输入关键词检索经济体、分析模块、历史风暴情景或操作 (按 ↑↓ 选择，Enter 确认)..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={handleKeyDown}
            className="w-full bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
          />
          <button 
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-2 divide-y divide-slate-800/40">
          {filteredResults.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500 font-mono">
              未检索到匹配结果
            </div>
          ) : (
            filteredResults.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === activeIndex;
              return (
                <div
                  key={idx}
                  onMouseEnter={() => setActiveIndex(idx)}
                  onClick={() => {
                    item.action();
                    onClose();
                  }}
                  className={`p-2.5 rounded-xl cursor-pointer flex items-center justify-between gap-3 transition-colors ${
                    isSelected ? 'bg-blue-600/25 border border-blue-500/40 text-white' : 'text-slate-300 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`p-2 rounded-lg shrink-0 ${
                      isSelected ? 'bg-blue-500/30 text-sky-300' : 'bg-slate-800 text-slate-400'
                    }`}>
                      <Icon className="w-4 h-4" />
                    </span>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-white truncate">
                        {item.title}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate mt-0.5">
                        {item.desc}
                      </div>
                    </div>
                  </div>
                  <ArrowRight className={`w-3.5 h-3.5 shrink-0 transition-transform ${isSelected ? 'translate-x-0.5 text-sky-400' : 'opacity-0'}`} />
                </div>
              );
            })
          )}
        </div>

        {/* Keyboard Footer Guide */}
        <div className="p-2.5 px-4 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-400">
          <div className="flex items-center gap-3">
            <span><kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">↑↓</kbd> 导航</span>
            <span><kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">Enter</kbd> 跳转</span>
            <span><kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">Esc</kbd> 关闭</span>
          </div>
          <div className="flex items-center gap-2 text-slate-500">
            <span>快捷键: Space 播放/暂停 · ← → 季度步进</span>
          </div>
        </div>
      </div>
    </div>
  );
}
