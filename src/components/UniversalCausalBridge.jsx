import React from 'react';
import soundFx from '../utils/soundEffects';
import { getTabTaskMeta } from '../utils/navigationConfig';
import { MODULE_VERDICTS } from '../utils/causalIntelligence';

const SECONDARY_CAUSAL_DIAGNOSIS = {
  network: '核心-外围度中心度集中，中枢收缩将顺网击穿外围通道',
  routing: '离岸转口走廊规模庞大，通道断流将直接放大同业挤兑',
  ews: '高外债经济体 DSR 与信贷缺口亮红灯，亟待测试违约溢出',
  gsib: '头部 G-SIB 表外集中度高企，需串联清算沙盘测算二阶受损',
  maturity: '一年内跨境短债展期墙叠加美元荒，触发主权再融资警报',
  usd: '美元计价主导且非美缺口倒挂，强美元自动触发被动缩表',
  currency: '贸易本币化与金融美元端错配并存，衍生品风险仍系美元',
  swaps: 'G10 享有互换护城河，外围 CIP 基差走阔持续承压',
  fragmentation: '跨阵营信贷流速放缓，地缘割裂重塑全球再融资路径',
  risk: '外债偿付缓冲跌破安全线，建议立即核查主权违约传染',
  compare: '高风险经济体落入三维度预警象限，需映射专户防线',
  gravity: '离岸壳溢价扭曲距离引力，须穿透至最终风险母国清算',
  comparison: '长周期高利率推升再融资成本，结构性脆弱度超越前周期',
  playbook: '历史风暴均发端于离岸隐性杠杆断裂，可即刻注入沙盘复测',
  dossier: 'SDMX 定量底稿已就绪，支持一键串联清算引擎与投委会路演'
};

export default function UniversalCausalBridge({
  activeTab,
  selectedQuarter = '2026Q1',
  selectedCountry = null,
  onInjectContagion,
  onMapToPortfolio,
  onOpenSovereignDrawer,
  onOpenPitchDeck
}) {
  if (['map', 'shadow', 'contagion', 'portfolio'].includes(activeTab)) {
    return null;
  }

  const tabMeta = getTabTaskMeta(activeTab);
  const verdictFallback = MODULE_VERDICTS[activeTab]?.observation;
  const diagnosisText =
    SECONDARY_CAUSAL_DIAGNOSIS[activeTab] ||
    verdictFallback ||
    '联动清算引擎、专户 CVaR 与主权 360° 穿透核查当前宏观风险外溢';

  const targetCountry = selectedCountry || 'TR';

  return (
    <section
      data-testid="universal-causal-bridge"
      aria-label="19 模块全域因果行动跳板"
      className="w-full px-2.5 py-0.5 rounded-xl bg-[#0d1321]/95 border border-indigo-500/30 shadow-sm flex flex-wrap lg:flex-nowrap items-center justify-between gap-1.5 backdrop-blur-md animate-fade-in"
    >
      {/* Left: Active Module + Quarter Causal Diagnosis Badge */}
      <div className="flex items-center gap-1.5 min-w-0 flex-1">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-500/15 border border-indigo-400/35 text-indigo-200 text-[11px] font-semibold whitespace-nowrap shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
          <span>因果跳板 · {tabMeta.label}</span>
          <span className="font-mono text-sky-300">· {selectedQuarter}</span>
        </span>
        <span
          className="text-[11px] text-slate-300 truncate"
          title={`${tabMeta.label} (${selectedQuarter}): ${diagnosisText}`}
        >
          {diagnosisText}
        </span>
      </div>

      {/* Right: 4 One-Click Cross-Module Causal Action Buttons */}
      <div className="flex items-center gap-1 flex-wrap lg:flex-nowrap shrink-0">
        <button
          type="button"
          data-testid="bridge-to-contagion-btn"
          onClick={() => {
            soundFx.playChime();
            if (onInjectContagion) {
              onInjectContagion({
                epicenter: targetCountry,
                haircut: 30,
                deleveraging: 1.8,
                dollarSqueeze: 15
              });
            }
          }}
          className="h-6 px-2 rounded-md bg-rose-500/15 hover:bg-rose-500/25 border border-rose-400/40 text-rose-200 hover:text-white text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap"
          title={`将 ${targetCountry} (30% 减记) 注入 Eisenberg-Noe 级联清算沙盘`}
        >
          <span>⚡ 注入级联清算沙盘</span>
        </button>

        <button
          type="button"
          data-testid="bridge-to-portfolio-btn"
          onClick={() => {
            soundFx.playTick();
            if (onMapToPortfolio) {
              onMapToPortfolio();
            }
          }}
          className="h-6 px-2 rounded-md bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-400/40 text-indigo-200 hover:text-white text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap"
          title="跳转专户压力映射与 500 次蒙特卡洛 99% CVaR 引擎"
        >
          <span>🛡️ 映射至专户压力与 99% CVaR</span>
        </button>

        <button
          type="button"
          data-testid="bridge-to-drawer-btn"
          onClick={() => {
            soundFx.playTick();
            if (onOpenSovereignDrawer) {
              onOpenSovereignDrawer(targetCountry);
            }
          }}
          className="h-6 px-2 rounded-md bg-sky-500/15 hover:bg-sky-500/25 border border-sky-400/40 text-sky-200 hover:text-white text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap"
          title={`打开 ${targetCountry} 主权 360° 穿透风险与专户预演抽屉`}
        >
          <span>🔍 检视头号高危主权 360° 抽屉</span>
        </button>

        <button
          type="button"
          data-testid="bridge-to-pitchdeck-btn"
          onClick={() => {
            soundFx.playChime();
            if (onOpenPitchDeck) {
              onOpenPitchDeck();
            }
          }}
          className="h-6 px-2 rounded-md bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/40 text-amber-200 hover:text-white text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap"
          title="汇入投委会 4 幕决策路演幻灯片 (IC PitchDeck)"
        >
          <span>📊 汇入投委会 4 幕路演</span>
        </button>
      </div>
    </section>
  );
}
