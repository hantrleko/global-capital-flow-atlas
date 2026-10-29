import React, { useState } from 'react';
import { 
  Globe, Shield, BookOpen, Layers, Zap, Bot, ArrowRight, 
  CheckCircle2, Sparkles, X, Activity, DollarSign, Split, Compass, Check
} from 'lucide-react';
import soundFx from '../utils/soundEffects';
import { USER_PERSONAS, CAUSAL_WORKFLOW_STEPS } from '../utils/financialGlossary';
import ConceptTooltip from './ConceptTooltip';

export default function ProjectIntroModal({
  isOpen,
  onClose,
  onExploreFeature,
  onSelectPersona
}) {
  const [selectedPersonaId, setSelectedPersonaId] = useState('curious_explorer');
  const [activeTab, setActiveTab] = useState('personas'); // 'personas' | 'methodology' | 'shortcuts'
  const [dontShowAgain, setDontShowAgain] = useState(false);

  if (!isOpen) return null;

  const handleClose = () => {
    soundFx.playTick();
    if (dontShowAgain) {
      localStorage.setItem('bis_atlas_intro_seen', 'true');
    }
    onClose();
  };

  const handleApplyPersona = (persona) => {
    soundFx.playChime();
    if (dontShowAgain) {
      localStorage.setItem('bis_atlas_intro_seen', 'true');
    }
    if (onSelectPersona) {
      onSelectPersona(persona);
    } else if (onExploreFeature) {
      onExploreFeature(persona.recommendedTab);
    }
  };

  return (
    <div
      data-testid="project-intro-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-950/85 backdrop-blur-md animate-fade-in font-sans"
    >
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl bg-gradient-to-b from-[#0d1321] via-[#090d18] to-[#070a12] border border-indigo-500/35 shadow-[0_0_60px_rgba(30,58,138,0.35)] overflow-hidden">
        {/* Top Decorative Gradient Accent */}
        <div className="h-1.5 w-full bg-gradient-to-r from-indigo-500 via-sky-400 to-emerald-400" />

        {/* Modal Header */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-white/[0.08] bg-[#0d1321]/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-600 flex items-center justify-center text-white shadow-[0_0_15px_rgba(99,102,241,0.35)]">
              <Compass className="w-5 h-5 text-indigo-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base md:text-lg font-bold text-white tracking-tight">
                  EUGENE FINANCE · 全球资本流动全景导览与认知破壁
                </h2>
                <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/35">
                  v4.0.0
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                把 47 万亿美元跨国银行网络与复杂的离岸表外黑箱翻译为直觉认知
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 pt-3 pb-1 border-b border-white/[0.06] flex items-center gap-2 bg-[#0a0f1c]">
          {[
            { id: 'personas', label: '🧭 30秒按角色极速启程', icon: Compass },
            { id: 'pipeline', label: '⛓️ 四步因果全景推演图', icon: Layers },
            { id: 'methodology', label: '🏛️ BIS 三大统计支柱 (LBS/CBS/EWS)', icon: Shield }
          ].map(t => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => {
                  soundFx.playTick();
                  setActiveTab(t.id);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
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

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-slate-300">
          {/* TAB 1: 30-Second Role-Based Personas */}
          {activeTab === 'personas' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                    <span>30 秒极速就绪：选择您的探索身份（自动配置专属工作台）</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    平台已全面适配「白话人话透镜」与「量化宽客专家视角」，任何时候可在顶栏自由切换。
                  </p>
                </div>
              </div>

              {/* 3 Persona Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                {USER_PERSONAS.map(p => {
                  const isSelected = selectedPersonaId === p.id;
                  return (
                    <div
                      key={p.id}
                      onClick={() => handleApplyPersona(p)}
                      data-testid={`persona-card-${p.id}`}
                      className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'bg-[#131b2e] border-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.25)] ring-1 ring-indigo-400/50'
                          : 'bg-[#0d1321]/90 border-white/[0.08] hover:border-white/[0.2] hover:bg-[#131b2e]/60'
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-2xl">{p.icon}</span>
                          <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full border ${
                            isSelected
                              ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40 font-bold'
                              : 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}>
                            {p.subtitle.split(' · ')[0]}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-white">{p.title}</h4>
                        <div className="text-[11px] text-indigo-300 font-mono">
                          {p.subtitle.split(' · ')[1]}
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed pt-1">
                          {p.desc}
                        </p>
                      </div>

                      <div className="pt-4 border-t border-white/[0.06] mt-4 flex items-center justify-between">
                        <span className="text-[11px] text-slate-400 font-mono">
                          起步模块: <strong className="text-white">{p.recommendedTab}</strong>
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleApplyPersona(p);
                          }}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                            isSelected
                              ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                          }`}
                        >
                          <span>一键以此模式进入</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Core Significance Banner */}
              <div className="p-3.5 rounded-xl bg-gradient-to-r from-indigo-950/40 to-slate-900 border border-indigo-500/25 space-y-1.5 text-xs">
                <div className="font-bold text-white flex items-center gap-1.5">
                  <span>💡</span> <span>为什么这个项目能帮你省下数千小时的研究精力？</span>
                </div>
                <p className="text-slate-300 leading-relaxed">
                  过去 20 年的每一次金融海啸（2008 次贷危机、2011 欧债危机、2020 离岸美元荒、2023 瑞信倒闭），根源从来不在海关港口的货物进出口，而在跨国银行隐匿在离岸外汇掉期中的 <strong>85 万亿美元总资产负债表与多米诺骨牌传导</strong>。本项目将 BIS 晦涩的万行 SDMX 矩阵，转化为人人都可自主推演的因果闭环沙盘。
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: 4-Step Causal Pipeline */}
          {activeTab === 'pipeline' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white">
                  全景四步因果推演工作流（从宏观风暴到自营持仓防线）
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  沿着这条因果链条，您可以在 3 分钟内走完对冲基金投委会的核心推演流程：
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {CAUSAL_WORKFLOW_STEPS.map(st => (
                  <div
                    key={st.id}
                    className="p-4 rounded-xl bg-[#0d1321] border border-white/[0.08] hover:border-indigo-400/40 transition-colors space-y-2.5"
                  >
                    <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/35 flex items-center justify-center font-mono font-bold text-xs">
                          {st.step}
                        </span>
                        <strong className="text-sm text-white">{st.label}</strong>
                      </div>
                      <span className="text-[11px] font-mono text-indigo-300 bg-[#131b2e] px-2 py-0.5 rounded border border-white/[0.06]">
                        {st.shortTitle}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="text-xs font-semibold text-amber-300">
                        ❓ 核心解决的问题: {st.question}
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {st.purpose}
                      </p>
                    </div>

                    <div className="pt-2 flex justify-between items-center border-t border-white/[0.05]">
                      <span className="text-[11px] font-mono text-slate-400">
                        下游链条: ➔ {st.nextTab}
                      </span>
                      <button
                        onClick={() => {
                          soundFx.playChime();
                          onExploreFeature && onExploreFeature(st.id);
                          onClose();
                        }}
                        className="px-2.5 py-1 rounded bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-400/30 text-indigo-200 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <span>直接体验此环节</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: BIS Methodological Pillars */}
          {activeTab === 'methodology' && (
            <div className="space-y-4 text-xs">
              <div>
                <h3 className="text-sm font-bold text-white">
                  国际清算银行 (BIS) 三大底层统计支柱（带白话词典）
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  鼠标悬停带虚线下划线的专业术语，可随时查看人话比喻与判读规则：
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                <div className="p-3.5 rounded-xl bg-[#0d1321] border border-white/[0.08] space-y-2">
                  <div className="text-xs font-bold text-sky-300 flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-sky-400" />
                    <ConceptTooltip termKey="lbs" showIcon={true} />
                  </div>
                  <div className="text-[11px] font-mono text-slate-400">Residence Basis · 资金地理血管</div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    记录资金物理上从哪个辖区借出、流向哪里。用来观察开曼、卢森堡等
                    <ConceptTooltip termKey="offshore_conduits" className="mx-1" />
                    的汇聚规模与全球 <ConceptTooltip termKey="cip_basis" className="mx-1" /> 美元主导度。
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-[#0d1321] border border-white/[0.08] space-y-2">
                  <div className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-emerald-400" />
                    <ConceptTooltip termKey="cbs" showIcon={true} />
                  </div>
                  <div className="text-[11px] font-mono text-slate-400">Ultimate Risk · 穿透真实母国</div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    通过 <ConceptTooltip termKey="look_through" className="mx-1" /> 算法穿透避税壳公司，
                    将名义债务按母公司国籍重定向。穿透后对美欧中的真实债务暴露增加 28% 以上。
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-[#0d1321] border border-white/[0.08] space-y-2">
                  <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-amber-400" />
                    <ConceptTooltip termKey="ccyb" showIcon={true} /> 与预警
                  </div>
                  <div className="text-[11px] font-mono text-slate-400">Basel III EWS · 危机雷达</div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    监测各经济体的 <ConceptTooltip termKey="credit_to_gdp_gap" className="mx-1" /> 与
                    <ConceptTooltip termKey="dsr" className="mx-1" />，
                    提前 1-2 年预警主权外债踩踏与还本付息危机。
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Bar */}
        <div className="px-6 py-3.5 border-t border-white/[0.08] bg-[#0d1321]/95 flex flex-wrap items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none hover:text-slate-200">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="w-3.5 h-3.5 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-0 cursor-pointer"
            />
            <span>下次进入不再自动弹出 (可随时在顶部点击“🧭 新手导览”重新打开)</span>
          </label>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const persona = USER_PERSONAS.find(p => p.id === selectedPersonaId) || USER_PERSONAS[0];
                handleApplyPersona(persona);
              }}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 flex items-center gap-1.5 transition-all hover:scale-[1.02] cursor-pointer"
            >
              <span>以【{USER_PERSONAS.find(p => p.id === selectedPersonaId)?.title}】启程</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
