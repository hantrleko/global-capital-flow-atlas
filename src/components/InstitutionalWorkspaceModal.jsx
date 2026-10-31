import React, { useState, useMemo } from 'react';
import {
  Briefcase, X, Check, Copy, AlertTriangle, Sparkles,
  Sliders, Star, Trash2, ArrowRight, ShieldCheck, Bookmark,
  Layers, Bell, RefreshCw, ExternalLink, Activity
} from 'lucide-react';
import soundFx from '../utils/soundEffects';
import {
  getWorkspace,
  saveWorkspace,
  togglePinnedCountry,
  evaluateWorkspaceAlerts
} from '../utils/workspaceStorage';
import { computeQuarterlyDiffDigest } from '../utils/quarterlyDiffDigest';
import {
  encodeReproducibilityCode,
  decodeReproducibilityCode
} from '../utils/reproducibilityEngine';

export default function InstitutionalWorkspaceModal({
  isOpen,
  onClose,
  dataset,
  selectedQuarter = '2026Q1',
  countries = [],
  onSelectQuarter,
  onSelectTab,
  onSelectCountry,
  onApplyScenario,
  onApplyPortfolio
}) {
  const [activeTab, setActiveTab] = useState('digest'); // 'digest' | 'portfolio' | 'scenarios' | 'alerts'
  const [workspace, setWorkspace] = useState(() => getWorkspace());
  const [inputRepCode, setInputRepCode] = useState('');
  const [repCodeError, setRepCodeError] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  if (!isOpen) return null;

  const quarterlyEvents = useMemo(() => {
    return computeQuarterlyDiffDigest(dataset, selectedQuarter);
  }, [dataset, selectedQuarter]);

  const triggeredAlerts = useMemo(() => {
    return evaluateWorkspaceAlerts({
      incrementalLoss: 165, // Sample live context or connected value
      cipBasis: -48,
      stressVaR: 64.4
    });
  }, []);

  const handleToggleCountry = (code) => {
    soundFx.playTick();
    const nextList = togglePinnedCountry(code);
    setWorkspace(prev => ({ ...prev, pinnedWatchlist: nextList }));
  };

  const handleToggleAlert = (ruleId) => {
    soundFx.playTick();
    const nextRules = (workspace.alertRules || []).map(r =>
      r.id === ruleId ? { ...r, enabled: !r.enabled } : r
    );
    const nextWs = { ...workspace, alertRules: nextRules };
    saveWorkspace(nextWs);
    setWorkspace(nextWs);
  };

  const handleApplyRepCode = () => {
    const decoded = decodeReproducibilityCode(inputRepCode);
    if (!decoded || !decoded.isValid) {
      soundFx.playTick();
      setRepCodeError('无效的学术复现码格式，请检查后重试（示例: ATLAS-2026Q1-CONTAGION-TR35-B15-CBS-8F2B1A04）');
      return;
    }
    soundFx.playChime();
    setRepCodeError(null);

    if (onSelectQuarter && decoded.quarter) onSelectQuarter(decoded.quarter);
    if (onSelectTab && decoded.tab) onSelectTab(decoded.tab);
    if (onApplyScenario) {
      onApplyScenario({
        epicenter: decoded.epicenter,
        haircut: decoded.haircut,
        bufferMultiplier: decoded.bufferMultiplier,
        accountingBasis: decoded.accountingBasis
      });
    }
    onClose();
  };

  const handleCopyCode = (id, code) => {
    soundFx.playTick();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(code);
    }
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <div
      data-testid="institutional-workspace-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md animate-fade-in font-sans"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl bg-[#0a0f1c] border border-indigo-400/30 shadow-[0_25px_60px_rgba(0,0,0,0.85)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 py-3.5 flex items-center justify-between border-b border-white/[0.08] bg-[#0d1321]/95">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-sky-600 flex items-center justify-center text-white shadow-md">
              <Briefcase className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">
                  机构投研工作区 (Institutional Workspace)
                </h3>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-400/30 font-semibold">
                  v5.0 · 本地安全就绪
                </span>
                {triggeredAlerts.length > 0 && (
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold flex items-center gap-1 animate-pulse">
                    <span>{triggeredAlerts.length} 项预警触发</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                零后端私密存储 · 关注主权池 · 本季 3 件事 · 确定性学术复现码
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            data-testid="close-workspace-modal"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="px-5 pt-2 pb-1 border-b border-white/[0.06] flex items-center gap-2 bg-[#0d1321]/80 text-xs overflow-x-auto scrollbar-none">
          {[
            { id: 'digest', label: '📊 风险总览与本季 3 件事', icon: Activity },
            { id: 'portfolio', label: '💼 自定义专户管理', icon: Briefcase },
            { id: 'scenarios', label: '🔖 收藏情景与复现码', icon: Bookmark },
            { id: 'alerts', label: '🔔 阈值预警规则', icon: Bell }
          ].map(t => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => {
                  soundFx.playTick();
                  setActiveTab(t.id);
                }}
                className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === t.id
                    ? 'atlas-pill-active text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-slate-300 text-xs">
          {/* TAB 1: Digest & Watchlist */}
          {activeTab === 'digest' && (
            <div className="space-y-4">
              {/* Triggered Alerts Bar if any */}
              {triggeredAlerts.length > 0 && (
                <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/35 space-y-2">
                  <div className="flex items-center gap-2 text-rose-300 font-bold text-xs">
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                    <span>当前触发的风控阈值预警 (Active Threshold Alerts)</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {triggeredAlerts.map(a => (
                      <div key={a.id} className="p-2.5 rounded-lg bg-[#0d1321] border border-rose-500/25 space-y-1">
                        <div className="flex items-center justify-between text-slate-200 font-semibold">
                          <span>{a.name}</span>
                          <span className="font-mono text-rose-400 font-bold">
                            当前: {a.currentValue}{a.unit} (阈值 {a.threshold}{a.unit})
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 leading-tight">
                          {a.desc}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quarterly 3 Events Cards */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                    <span>本季 3 件事 (Quarterly 3 Key Macro Events · {selectedQuarter} vs 前期)</span>
                  </h4>
                  <span className="text-[11px] text-slate-400 font-mono">
                    由双边信贷矩阵差分引擎自动提炼
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                  {quarterlyEvents.map((ev, i) => (
                    <div
                      key={ev.id}
                      className="p-3 rounded-xl bg-[#0d1321]/95 border border-white/[0.08] flex flex-col justify-between space-y-2"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-1">
                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${ev.badgeColor}`}>
                            {ev.tag}
                          </span>
                          <span className="text-[11px] font-mono text-slate-500">#{i + 1}</span>
                        </div>
                        <h5 className="font-bold text-white text-xs leading-snug">
                          {ev.title}
                        </h5>
                        <p className="text-[11px] text-slate-300 leading-relaxed">
                          {ev.summary}
                        </p>
                      </div>
                      <div className="pt-2 border-t border-white/[0.06] text-[10px] text-indigo-300 leading-snug">
                        💡 启示: {ev.takeaway}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pinned Sovereign Watchlist */}
              <div className="space-y-2 pt-2 border-t border-white/[0.06]">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                    <span>重点关注主权经济体 (Pinned Watchlist: {workspace.pinnedWatchlist?.length || 0} 个)</span>
                  </h4>
                  <span className="text-[11px] text-slate-400">点击进入主权专属推演</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                  {countries.map(c => {
                    const isPinned = (workspace.pinnedWatchlist || []).includes(c.code);
                    return (
                      <button
                        key={c.code}
                        onClick={() => {
                          if (onSelectCountry) onSelectCountry(c.code);
                          onClose();
                        }}
                        className={`p-2 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between ${
                          isPinned
                            ? 'bg-indigo-950/30 border-indigo-500/40 hover:bg-indigo-900/40 text-white'
                            : 'bg-[#0d1321] border-white/[0.06] text-slate-400 hover:text-white hover:bg-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold">{c.name_zh}</span>
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleCountry(c.code);
                            }}
                            className="text-amber-400 hover:scale-110 transition-transform cursor-pointer"
                            title={isPinned ? '取消置顶' : '置顶关注'}
                          >
                            <Star className={`w-3 h-3 ${isPinned ? 'fill-amber-400' : ''}`} />
                          </span>
                        </div>
                        <span className="font-mono text-[10px] text-indigo-300 mt-1">{c.code}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Custom Portfolios */}
          {activeTab === 'portfolio' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white">我的自营投资专户资产配置</h4>
                  <p className="text-[11px] text-slate-400">在本地定义专户多资产头寸，一键投射至宏观网络计算极端在险价值 (VaR)</p>
                </div>
              </div>

              <div className="space-y-2">
                {(workspace.savedPortfolios || []).map(p => (
                  <div key={p.id} className="p-3.5 rounded-xl bg-[#0d1321] border border-white/[0.08] space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-bold text-white text-sm flex items-center gap-2">
                          <span>{p.name}</span>
                          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 font-semibold">
                            ${p.baseAumUsdMn}M AUM
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          更新日期: {p.updatedAt} · 持仓头寸数量: {p.positions?.length || 0}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          soundFx.playChime();
                          if (onApplyPortfolio) onApplyPortfolio(p);
                          if (onSelectTab) onSelectTab('portfolio');
                          onClose();
                        }}
                        className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
                      >
                        <span>载入专户压力映射</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-5 gap-1.5 text-[11px] font-mono pt-2 border-t border-white/[0.06]">
                      {p.positions?.map(pos => (
                        <div key={pos.id} className="p-1.5 rounded bg-slate-900 border border-white/[0.04]">
                          <div className="text-slate-300 font-bold truncate">{pos.name.split(' ')[0]}</div>
                          <div className="text-slate-400 text-[10px]">{pos.country} · {Math.round(pos.weight * 100)}% (${pos.amountMn}M)</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: Saved Scenarios & Reproducibility Codes */}
          {activeTab === 'scenarios' && (
            <div className="space-y-3.5">
              {/* Import with Code Box */}
              <div className="p-3 rounded-xl bg-[#0d1321] border border-indigo-400/25 space-y-2">
                <div className="font-bold text-white text-xs flex items-center gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5 text-sky-400" />
                  <span>输入学术复现码立即还原推演情景 (Restore by Reproducibility Code)</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={inputRepCode}
                    onChange={(e) => setInputRepCode(e.target.value)}
                    placeholder="粘贴复现码，例如: ATLAS-2026Q1-CONTAGION-TR35-B15-CBS-8F2B1A04"
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 font-mono outline-none focus:border-indigo-400"
                  />
                  <button
                    onClick={handleApplyRepCode}
                    className="px-4 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold transition-all cursor-pointer whitespace-nowrap shadow-md"
                  >
                    还原推演
                  </button>
                </div>
                {repCodeError && (
                  <p className="text-[11px] text-rose-400 font-mono">{repCodeError}</p>
                )}
              </div>

              {/* Bookmarked Scenarios */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-white">已收藏的宏观情景推演清单</h4>
                {(workspace.savedScenarios || []).map(sc => (
                  <div key={sc.id} className="p-3 rounded-xl bg-[#0d1321] border border-white/[0.08] flex items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="font-bold text-white text-xs">{sc.title}</div>
                      <div className="text-[11px] font-mono text-indigo-300 bg-slate-900 px-2 py-0.5 rounded border border-white/[0.06] inline-block">
                        {sc.reproducibilityCode}
                      </div>
                      <div className="text-[10px] text-slate-400">{sc.notes}</div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleCopyCode(sc.id, sc.reproducibilityCode)}
                        className="px-2.5 py-1 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white flex items-center gap-1 cursor-pointer font-mono text-[11px]"
                      >
                        {copiedId === sc.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedId === sc.id ? '已复制' : '复制复现码'}</span>
                      </button>
                      <button
                        onClick={() => {
                          setInputRepCode(sc.reproducibilityCode);
                          handleApplyRepCode();
                        }}
                        className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center gap-1 cursor-pointer text-xs shadow-md"
                      >
                        <span>载入推演</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: Alert Rules */}
          {activeTab === 'alerts' && (
            <div className="space-y-3">
              <div>
                <h4 className="text-xs font-bold text-white">审慎风控自动化阈值规则配置</h4>
                <p className="text-[11px] text-slate-400">当宏观指标或网络推演结果触及设定阈值时，自动在顶栏与工作区标红预警</p>
              </div>

              <div className="space-y-2">
                {(workspace.alertRules || []).map(r => (
                  <div key={r.id} className="p-3 rounded-xl bg-[#0d1321] border border-white/[0.08] flex items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">{r.name}</span>
                        <span className="font-mono text-[11px] text-amber-300 px-1.5 py-0.2 rounded bg-amber-500/10 border border-amber-500/30">
                          阈值: {r.threshold}{r.unit}
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded border font-mono ${
                          r.severity === 'CRITICAL' ? 'bg-rose-950 text-rose-300 border-rose-500/30' : 'bg-amber-950 text-amber-300 border-amber-500/30'
                        }`}>
                          {r.severity}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-tight">{r.desc}</p>
                    </div>

                    <button
                      onClick={() => handleToggleAlert(r.id)}
                      className={`px-3 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                        r.enabled
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-400'
                      }`}
                    >
                      {r.enabled ? '已启用监控' : '已暂停'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
