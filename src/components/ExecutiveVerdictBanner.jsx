import React, { useState } from 'react';
import { ChevronDown, ChevronUp, ArrowRight, ArrowLeft, Lightbulb } from 'lucide-react';
import { getModuleVerdict, getModuleCausalLinks } from '../utils/causalIntelligence.js';
import ConceptTooltip from './ConceptTooltip';

const TAB_METAPHORS = {
  map: {
    analogy: '全球跨国借贷网络就像地球的金融血液血管图。从借出方到借入方，追踪每一万亿美元资金的真实走向。',
    takeaway: '重点排查开曼/卢森堡等离岸避税中继站，避免把空壳公司所在国误判为最终债务人。'
  },
  shadow: {
    analogy: '影子银行就像无央行贴现窗的民间借贷社，其巨额表外外汇掉期没有列入资产负债表，是隐藏的暗雷。',
    takeaway: '当离岸借美元成本（CIP 基差）剧烈扩大时，高杠杆非银最容易被追缴保证金引发挤兑。'
  },
  contagion: {
    analogy: '多米诺骨牌连续倒塌实验：一家核心债务人违约，会顺着银行同业拆借网络拉垮债主与债主的债主。',
    takeaway: '不仅要防一阶直接借款人违约，更要防范二阶跨国银行同业踩踏与被动缩表风暴。'
  },
  portfolio: {
    analogy: '你的个人持仓防洪工程：根据宏观网络推演，算清楚你的美股、中资美元债、国债等最坏会亏多少。',
    takeaway: '及时配置主权 CDS 保险或调降重灾区权重，以小额保费对冲 80% 以上硬损失。'
  }
};

const MODULE_CONCEPTS = {
  map: [
    { key: 'lbs', label: 'LBS 居住地' },
    { key: 'cbs', label: 'CBS 穿透' },
    { key: 'look_through', label: '穿透还原' }
  ],
  shadow: [
    { key: 'fx_swaps', label: '外汇掉期' },
    { key: 'nbfis', label: '影子银行' },
    { key: 'cip_basis', label: 'CIP 基差' }
  ],
  contagion: [
    { key: 'eisenberg_noe', label: 'Eisenberg-Noe' },
    { key: 'picard', label: 'Picard 迭代' },
    { key: 'deleveraging', label: '去杠杆踩踏' }
  ],
  portfolio: [
    { key: 'var', label: '压力 VaR' },
    { key: 'cds', label: '主权 CDS' },
    { key: 'direct_loss', label: '一阶损失' }
  ]
};

export default function ExecutiveVerdictBanner({
  activeTab,
  onSelectTab,
  context = {},
  isBeginnerMode = true,
  onToggleBeginnerMode
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  const verdict = getModuleVerdict(activeTab, context);
  const causalLinks = getModuleCausalLinks(activeTab);
  const primaryDownstream = causalLinks.downstream?.[0] || null;
  const metaphorData = TAB_METAPHORS[activeTab] || {
    analogy: '将复杂的国际金融高阶数学网络转化为可观测、可归因、可对冲的宏观决策证据链。',
    takeaway: '顺着因果链条依次排查：查资金 ➔ 抓杠杆 ➔ 算骨牌 ➔ 护账户。'
  };

  const cleanCtaText = (cta = '') => cta.replace(/\s*[➔→]+\s*$/, '').trim();

  const getSeverityBadge = (severity) => {
    switch (severity) {
      case 'CRITICAL':
        return (
          <span
            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/35 shrink-0"
            title="Critical Systemic Risk Alert"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            <span>高危预警</span>
          </span>
        );
      case 'WARNING':
        return (
          <span
            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/35 shrink-0"
            title="Elevated Macroprudential Watch"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span>中度关注</span>
          </span>
        );
      default:
        return (
          <span
            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/35 shrink-0"
            title="Macroprudential Intelligence Note"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
            <span>审慎研判</span>
          </span>
        );
    }
  };

  const headlineText = verdict.headline || verdict.observation;

  return (
    <div
      data-testid="executive-verdict-banner"
      className="bg-[#0d1321]/95 border border-white/[0.08] rounded-xl shadow-md backdrop-blur-md overflow-hidden transition-all duration-200"
    >
      {/* Compact Single-Line First-Screen Verdict Strip (~34px) */}
      <div className="min-h-[34px] px-3 py-1 flex items-center justify-between gap-2.5 text-xs">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {getSeverityBadge(verdict.severity)}

          {isBeginnerMode && (
            <span
              data-testid="verdict-beginner-badge"
              className="hidden sm:inline-flex items-center gap-1 text-[11px] font-mono font-medium px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30 shrink-0"
              title="当前处于白话通俗解读模式，已开启低门槛类比与通俗释义"
            >
              <Lightbulb className="w-3 h-3 text-amber-400" />
              <span>白话透视</span>
            </span>
          )}

          <span
            className="font-semibold text-slate-200 shrink-0 hidden sm:inline"
            title="Executive Verdict · 三段式动态研判台"
          >
            实时研判 · <span className="text-indigo-300">{verdict.moduleTitle}</span>
          </span>

          <span className="text-slate-600 hidden md:inline shrink-0">|</span>

          <span
            data-testid="verdict-live-headline"
            className="text-xs text-slate-300 truncate tabular-nums"
            title={headlineText}
          >
            {headlineText}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {primaryDownstream && (
            <button
              onClick={() => onSelectTab(primaryDownstream.tab)}
              className="h-7 px-2.5 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-400/35 hover:border-indigo-400/60 text-indigo-200 hover:text-white transition-all text-[11px] font-semibold flex items-center gap-1 cursor-pointer whitespace-nowrap"
              title={primaryDownstream.outcome}
            >
              <span>{cleanCtaText(primaryDownstream.cta)}</span>
              <ArrowRight className="w-3 h-3 shrink-0" />
            </button>
          )}

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            data-testid="toggle-verdict-details"
            className="h-7 px-2.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-white/[0.08] text-slate-300 hover:text-white transition-colors flex items-center gap-1 text-[11px] font-medium cursor-pointer whitespace-nowrap"
            title={isExpanded ? '收起三段式机理拆解' : '展开现象 ➔ 机理 ➔ 行动三段式研判'}
          >
            <span>{isExpanded ? '收起机理' : '机理拆解'}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Expandable 3-Stage Reasoning Deck */}
      {isExpanded && (
        <div className="px-3.5 pb-3.5 pt-2.5 border-t border-white/[0.06] bg-[#0a0f1c]/90 space-y-3 animate-fade-in">
          {isBeginnerMode && (
            <div
              data-testid="verdict-beginner-deck"
              className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
            >
              <div className="flex items-start sm:items-center gap-2">
                <div className="p-1 rounded bg-amber-500/20 text-amber-300 shrink-0 mt-0.5 sm:mt-0">
                  <Lightbulb className="w-3.5 h-3.5" />
                </div>
                <div className="space-y-0.5">
                  <div className="font-semibold text-amber-200">
                    通俗白话解读: <span className="font-normal text-slate-200">{metaphorData.analogy}</span>
                  </div>
                  <div className="text-[11px] text-amber-300/90">
                    决策启示: <span className="text-slate-300">{metaphorData.takeaway}</span>
                  </div>
                </div>
              </div>
              {onToggleBeginnerMode && (
                <button
                  onClick={onToggleBeginnerMode}
                  className="text-[11px] text-amber-400 hover:text-amber-200 underline whitespace-nowrap self-end sm:self-center cursor-pointer"
                >
                  切换专业学术术语 ➔
                </button>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            {/* Stage 1: Observation */}
            <div className="p-3 rounded-lg bg-[#131b2e]/70 border border-white/[0.07]">
              <div
                className="flex items-center gap-2 mb-1.5 text-xs font-semibold text-sky-300"
                title="Observation · 定量宏观异动现象"
              >
                <span className="w-5 h-5 rounded-full bg-sky-500/15 border border-sky-400/40 flex items-center justify-center text-[11px] text-sky-300 font-bold">
                  1
                </span>
                <span>宏观异动现象</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed tabular-nums">
                {verdict.observation}
              </p>
            </div>

            {/* Stage 2: Mechanism */}
            <div className="p-3 rounded-lg bg-[#131b2e]/70 border border-white/[0.07]">
              <div
                className="flex items-center gap-2 mb-1.5 text-xs font-semibold text-indigo-300"
                title="Mechanism · 跨国资产负债表传导机理"
              >
                <span className="w-5 h-5 rounded-full bg-indigo-500/15 border border-indigo-400/40 flex items-center justify-center text-[11px] text-indigo-300 font-bold">
                  2
                </span>
                <span>深层驱动机理</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed tabular-nums">
                {verdict.mechanism}
              </p>
            </div>

            {/* Stage 3: Verdict & Action */}
            <div className="p-3 rounded-lg bg-emerald-950/25 border border-emerald-500/25">
              <div
                className="flex items-center gap-2 mb-1.5 text-xs font-semibold text-emerald-300"
                title="Verdict & Action · 审慎风控与对冲行动指引"
              >
                <span className="w-5 h-5 rounded-full bg-emerald-500/15 border border-emerald-400/40 flex items-center justify-center text-[11px] text-emerald-300 font-bold">
                  3
                </span>
                <span>研判结论与行动</span>
              </div>
              <p className="text-xs text-emerald-100 font-medium leading-relaxed tabular-nums">
                {verdict.verdict}
              </p>
            </div>
          </div>

          {/* Causal Knowledge Graph Next-Step Bridge */}
          {(causalLinks.upstream?.length > 0 || causalLinks.downstream?.length > 0) && (
            <div className="pt-2 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-2.5 text-xs">
              {/* Upstream links */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] text-slate-400 flex items-center gap-1 font-medium">
                  <ArrowLeft className="w-3 h-3 text-slate-500" />
                  <span>前因溯源:</span>
                </span>
                {causalLinks.upstream && causalLinks.upstream.length > 0 ? (
                  causalLinks.upstream.map((link, idx) => (
                    <button
                      key={idx}
                      onClick={() => onSelectTab(link.tab)}
                      title={link.reason || link.label}
                      className="px-2.5 py-1 rounded-md bg-slate-800/80 hover:bg-slate-700/80 border border-white/[0.08] hover:border-slate-500 text-slate-300 hover:text-white transition-all text-[11px] flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>{link.label}</span>
                    </button>
                  ))
                ) : (
                  <span className="text-[11px] text-slate-500">首端驱动源</span>
                )}
              </div>

              {/* Downstream links */}
              <div className="flex items-center gap-2 flex-wrap ml-auto">
                <span className="text-[11px] text-slate-400 flex items-center gap-1 font-medium">
                  <span>因果下一跳:</span>
                </span>
                {causalLinks.downstream && causalLinks.downstream.length > 0 ? (
                  causalLinks.downstream.map((link, idx) => (
                    <button
                      key={idx}
                      onClick={() => onSelectTab(link.tab)}
                      title={link.outcome || link.label}
                      className="px-2.5 py-1 rounded-md bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-400/35 hover:border-indigo-400/60 text-indigo-200 hover:text-white transition-all text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <span>{cleanCtaText(link.cta)}</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  ))
                ) : (
                  <span className="text-[11px] text-slate-500">终局归宿节点</span>
                )}
              </div>
            </div>
          )}

          {/* Module Key Concepts Quick Lookup Pills */}
          <div className="pt-2 border-t border-white/[0.06] flex items-center gap-2 flex-wrap text-xs">
            <span className="text-[11px] text-slate-400 font-medium">核心概念速查:</span>
            {(MODULE_CONCEPTS[activeTab] || [
              { key: 'lbs', label: 'LBS 居住地' },
              { key: 'cbs', label: 'CBS 最终风险' }
            ]).map(c => (
              <ConceptTooltip key={c.key} termKey={c.key}>
                <span className="px-2 py-0.5 rounded bg-slate-800/90 text-indigo-300 border border-indigo-400/30 text-[11px] font-mono cursor-help hover:border-indigo-400 transition-colors">
                  💡 {c.label}
                </span>
              </ConceptTooltip>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
