import React, { useState, useEffect } from 'react';
import {
  Presentation, X, ChevronLeft, ChevronRight, Sparkles,
  ShieldCheck, AlertTriangle, TrendingDown, Layers, Check, Copy, Printer,
  Activity, ArrowRight, ShieldAlert, Award, FileText
} from 'lucide-react';
import soundFx from '../utils/soundEffects';
import { bisResearchMetrics, bisSnapshot, formatBisAmount } from '../utils/bisObservations';
import { transformToUltimateRiskLinks } from '../utils/lookThroughEngine';
import { encodeReproducibilityCode } from '../utils/reproducibilityEngine';
import { solveOptimalHedgePackage } from '../utils/hedgeOptimizer';
import { computePortfolioSafetyCushion, computeHistoricalCrisisReplay } from '../utils/reverseStressSolver';

export default function IcPitchDeckModal({
  isOpen,
  onClose,
  dataset,
  selectedQuarter,
  portfolioStressResult,
  activePortfolio,
  clearingResult,
  epicenter = 'TR',
  haircut = 25,
  bufferMultiplier = 1.5,
  accountingBasis = 'ultimate_risk'
}) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [copiedMemo, setCopiedMemo] = useState(false);

  // Reset slide on open
  useEffect(() => {
    if (isOpen) {
      setCurrentSlide(0);
      setCopiedMemo(false);
    }
  }, [isOpen]);

  // Keyboard navigation (Left / Right / Esc)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        setCurrentSlide(s => Math.min(3, s + 1));
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        setCurrentSlide(s => Math.max(0, s - 1));
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const { stock, adjusted } = bisResearchMetrics(selectedQuarter);
  const matrix = dataset.bilateral_matrix?.[selectedQuarter];
  const bypassedMn = matrix?.length
    ? transformToUltimateRiskLinks(matrix).totalBypassedBn * 1000
    : null;
  const stockText = formatBisAmount(stock.valueMn);
  const adjustedText = formatBisAmount(adjusted.valueMn);
  const bypassedText = formatBisAmount(bypassedMn);
  const lossText = portfolioStressResult?.totalLossMn == null ? '未计算' : `$${portfolioStressResult.totalLossMn}M`;
  const lossPct = portfolioStressResult?.portfolioLossPct == null ? '未计算' : `${portfolioStressResult.portfolioLossPct}%`;
  const varText = portfolioStressResult?.stressVaR99Mn == null ? '未计算' : `$${portfolioStressResult.stressVaR99Mn}M`;
  const repCode = encodeReproducibilityCode({
    quarter: selectedQuarter,
    tab: 'contagion',
    epicenter,
    haircut,
    bufferMultiplier,
    accountingBasis
  });

  const safetyMetrics = computePortfolioSafetyCushion({
    dataset,
    quarter: selectedQuarter,
    epicenter,
    currentHaircut: haircut,
    bufferMultiplier,
    activePortfolio,
    targetLossLimitMn: 50.0
  });

  const crisisReplay = computeHistoricalCrisisReplay({
    dataset,
    activePortfolio,
    currentEpicenter: epicenter,
    currentHaircut: haircut,
    currentBuffer: bufferMultiplier,
    targetLossLimitMn: 50.0
  });

  const hedgeSolution = solveOptimalHedgePackage({
    activePortfolio,
    scenarioId: 'tr_sovereign_crisis',
    maxBudgetBps: 150,
    minProtectionPct: 20.0
  });

  const bestHedge = hedgeSolution.bestRecommendation;

  const handleCopyIcMemo = () => {
    soundFx.playChime();
    const memo = `### EUGENE FINANCE · 投委会 (IC) 宏观流动性与专户压力路演 · 研究草案
- **报告期**: ${selectedQuarter} | **审议专户**: ${activePortfolio?.name || '宏观对冲优选组合'} ($${activePortfolio?.baseAumUsdMn || 500}M)
- **学术复现码**: \`${repCode}\`
- **BIS LBS（十亿美元）**: 期末债权余额 ${stockText}，调整后变动 ${adjustedText}，快照 ${bisSnapshot.version}
- **存量来源**: ${stock.source}
- **调整后变动来源**: ${adjusted.source}
- **模型离岸穿透规模（十亿美元）**: ${bypassedText}
- **情景震中**: ${epicenter} (主权直接减记 ${haircut}%, 外储缓冲倍数 ${bufferMultiplier}x)
- **专户预期减记**: ${lossText} (${lossPct})
- **反向压力破防临界点 (alpha*)**: ${safetyMetrics.criticalHaircutPct}% (安全缓冲垫: ${safetyMetrics.safetyCushionPct > 0 ? '+' : ''}${safetyMetrics.safetyCushionPct}%, 状态: [${safetyMetrics.statusZh}])
- **历史危机穿越对比**: 
${crisisReplay.scenarios.map(s => `  * ${s.labelZh}: 预计损失 -$${s.totalLossMn}M (-${s.lossPct}%), 限额缓冲: ${s.cushionMn >= 0 ? '+' : ''}$${s.cushionMn}M`).join('\n')}
- **候选对冲组合**: 【${bestHedge.name}】
  * 对冲成本: ${bestHedge.costBps} bps ($${bestHedge.hedgeCostMn}M)
  * 挽回减记资本: +$${bestHedge.grossSavedMn}M (净挽回: +$${bestHedge.netSavedMn}M)
  * 防护性价比 (Protection ROI): ${bestHedge.protectionRoi}x
- **状态**: 研究草案 · 待审议`;

    navigator.clipboard.writeText(memo);
    setCopiedMemo(true);
    setTimeout(() => setCopiedMemo(false), 2500);
  };

  const handlePrint = () => {
    soundFx.playTick();
    window.print();
  };

  const slides = [
    {
      step: '01 / 04',
      tag: '宏观底座 · 数据来源',
      title: '全球跨境银行债权与模型穿透',
      subtitle: `${selectedQuarter} · 研究草案 · BIS 快照 ${bisSnapshot.version}`,
      render: () => (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-sky-500/25 bg-slate-900 p-4">
            <h4 className="text-xs text-sky-300">BIS LBS 期末债权余额 · 十亿美元</h4>
            <p className="my-2 text-2xl font-mono text-white">{stockText}</p>
            <p className="text-xs text-slate-300">汇率及统计断点调整后变动 {adjustedText}</p>
            <a className="mt-2 inline-block text-xs text-sky-300 underline" href={stock.source} target="_blank" rel="noreferrer">BIS 存量序列</a>
          </div>
          <div className="rounded-xl border border-amber-500/25 bg-slate-900 p-4">
            <h4 className="text-xs text-amber-300">模型离岸穿透规模 · 十亿美元</h4>
            <p className="my-2 text-2xl font-mono text-white">{bypassedText}</p>
            <p className="text-xs text-slate-300">按当前季度 RAS 矩阵和预设国籍权重计算</p>
          </div>
        </div>
      )
    },
    {
      step: '02 / 04',
      tag: '传导机制 · 级联清算',
      title: 'Eisenberg-Noe 网络清算情景',
      subtitle: `震中 ${epicenter} · 基于 Atlas 银行网络的冲击推演`,
      render: () => (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 text-xs font-mono">
            <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/40">
              <span className="text-[11px] text-rose-300">第0阶: 震中引爆</span>
              <div className="text-base font-bold text-white mt-1">{epicenter} -{haircut}%</div>
              <div className="text-[10px] text-slate-400 mt-0.5">主权违约破产重组</div>
            </div>
            <div className="p-3 rounded-xl bg-[#0d1321] border border-white/[0.08]">
              <span className="text-[11px] text-amber-300">第1阶: 直接债主冲销</span>
              <div className="text-base font-bold text-white mt-1">直接债权人</div>
              <div className="text-[10px] text-slate-400 mt-0.5">资产端直接拨备计提</div>
            </div>
            <div className="p-3 rounded-xl bg-[#0d1321] border border-white/[0.08]">
              <span className="text-[11px] text-indigo-300">第2阶: 同业踩踏外溢</span>
              <div className="text-base font-bold text-white mt-1">同业传导</div>
              <div className="text-[10px] text-slate-400 mt-0.5">削减跨境银行间授信</div>
            </div>
            <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/30">
              <span className="text-[11px] text-emerald-300">第3阶: 专户防线</span>
              <div className="text-base font-bold text-white mt-1">组合压力测试</div>
              <div className="text-[10px] text-slate-400 mt-0.5">拦截极端尾部穿透</div>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-slate-900 p-4 text-xs text-slate-300">
            <p>模型参数复现码 <span className="font-mono text-indigo-300">{repCode}</span></p>
          </div>
        </div>
      )
    },
    {
      step: '03 / 04',
      tag: '专户风控 · 破防求根',
      title: '专户压力受损、安全边际仪表盘与历史危机情景回放',
      subtitle: `专户 AUM $${activePortfolio?.baseAumUsdMn || 500}M · 预期减记 ${lossText} · ${safetyMetrics.statusZh}`,
      render: () => (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-4 rounded-xl bg-[#0d1321] border border-white/[0.08] space-y-1">
              <span className="text-xs text-slate-400 font-mono">当前情景预期净减记</span>
              <div className="text-xl font-bold font-mono text-rose-400">
                {lossText}
              </div>
              <div className="text-[11px] text-slate-400">
                占 AUM 比例 {lossPct} · VaR {varText}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#0d1321] border border-indigo-400/30 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-indigo-300 font-mono">破防临界点 (α*)</span>
                <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${safetyMetrics.badgeColor}`}>
                  {safetyMetrics.statusZh}
                </span>
              </div>
              <div className="text-xl font-bold font-mono text-white">
                {safetyMetrics.criticalHaircutPct}% 减记
              </div>
              <div className="text-[11px] text-slate-400">
                安全缓冲垫: <strong className="text-emerald-400 font-mono">+{safetyMetrics.safetyCushionPct}%</strong>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#0d1321] border border-white/[0.08] space-y-1">
              <span className="text-xs text-slate-400 font-mono">风控容忍限额 (VaR Limit)</span>
              <div className="text-xl font-bold font-mono text-white">$50.0M</div>
              <div className="text-[11px] text-emerald-400 font-mono">未突破风控阈值红线</div>
            </div>
          </div>

          {/* Breakpoint Thermometer Gauge */}
          <div className="p-3 rounded-xl bg-slate-900/60 border border-white/[0.08] space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="text-slate-400 flex items-center gap-1">
                <span>震中减记强度对比</span>
                <span className="text-white font-bold">当前 α={haircut}%</span>
              </span>
              <span className="text-slate-400">
                破防临界点: <strong className="text-amber-400">α*={safetyMetrics.criticalHaircutPct}%</strong>
                <span className="text-emerald-400 ml-1.5 font-bold">(缓冲 +{safetyMetrics.safetyCushionPct}%)</span>
              </span>
            </div>
            <div className="relative w-full h-2.5 bg-slate-800 rounded-full overflow-hidden border border-white/10">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 via-amber-500 to-rose-600 opacity-80"
                style={{ width: `${Math.min(100, safetyMetrics.criticalHaircutPct)}%` }}
              />
              <div
                className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_6px_#fff]"
                style={{ left: `${Math.min(99, haircut)}%` }}
                title={`当前减记率: ${haircut}%`}
              />
            </div>
            <div className="flex justify-between text-[9px] font-mono text-slate-500">
              <span>0% (无冲击)</span>
              <span>25% (基准情景)</span>
              <span>50% (中度违约)</span>
              <span>100% (全额减记)</span>
            </div>
          </div>

          {/* Historical Crisis Comparison Grid */}
          <div className="p-3.5 rounded-xl bg-[#0d1321]/90 border border-white/[0.08] space-y-2">
            <h4 className="text-xs font-bold text-white flex items-center justify-between">
              <span>历史经典危机平行穿越回测 (Historical Crisis Backtest)</span>
              <span className="text-[11px] text-slate-400 font-mono">统一投射至当前专户持仓</span>
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
              {crisisReplay.scenarios.map(s => {
                const lossRatio = Math.min(100, Math.round((s.totalLossMn / 50.0) * 100));
                return (
                  <div key={s.id} className="p-2.5 rounded-lg bg-[#070a12] border border-white/[0.06] space-y-1">
                    <div className="text-[11px] text-slate-300 font-bold truncate">{s.labelZh}</div>
                    <div className="text-sm font-bold text-rose-400">-${s.totalLossMn}M</div>
                    <div className="text-[10px] text-slate-400">回撤 -{s.lossPct}%</div>
                    <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden mt-1">
                      <div
                        className={`h-full ${lossRatio > 100 ? 'bg-rose-500' : 'bg-amber-400'}`}
                        style={{ width: `${Math.min(100, lossRatio)}%` }}
                      />
                    </div>
                    <div className={`text-[10px] pt-0.5 ${s.cushionMn >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {s.cushionMn >= 0 ? `缓冲 +$${s.cushionMn}M` : `击穿 -$${Math.abs(s.cushionMn)}M`}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )
    },
    {
      step: '04 / 04',
      tag: '候选对冲 · 待审议',
      title: '候选对冲组合与模型结果',
      subtitle: `在对冲成本预算约束内，求解资本保全效率最高 (Protection ROI) 的最优对冲组合`,
      render: () => (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/40 via-indigo-950/30 to-[#0d1321] border border-emerald-500/40 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-400" />
                <h4 className="text-sm font-bold text-white">
                  投委会首选帕累托最优对冲处方 (Optimal Prescription)
                </h4>
              </div>
              <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                ROI: {bestHedge.protectionRoi}x
              </span>
            </div>

            <div className="text-base font-bold text-emerald-300 font-mono">
              {bestHedge.name}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
              <div className="p-2.5 rounded-lg bg-[#070a12]/80 border border-white/[0.06]">
                <span className="text-[10px] text-slate-400">对冲总成本</span>
                <div className="text-sm font-bold text-amber-300">{bestHedge.costBps} bps (${bestHedge.hedgeCostMn}M)</div>
              </div>
              <div className="p-2.5 rounded-lg bg-[#070a12]/80 border border-white/[0.06]">
                <span className="text-[10px] text-slate-400">毛冲销减记</span>
                <div className="text-sm font-bold text-emerald-300">+${bestHedge.grossSavedMn}M</div>
              </div>
              <div className="p-2.5 rounded-lg bg-[#070a12]/80 border border-white/[0.06]">
                <span className="text-[10px] text-slate-400">净保全资本</span>
                <div className="text-sm font-bold text-emerald-400">+${bestHedge.netSavedMn}M</div>
              </div>
              <div className="p-2.5 rounded-lg bg-[#070a12]/80 border border-white/[0.06]">
                <span className="text-[10px] text-slate-400">残余减记敞口</span>
                <div className="text-sm font-bold text-slate-200">-${bestHedge.residualLossMn}M</div>
              </div>
            </div>
          </div>

          {/* Unhedged vs Hedged Comparison */}
          <div className="p-3.5 rounded-xl bg-[#0d1321] border border-white/[0.08] space-y-2">
            <span className="text-[11px] font-bold text-slate-300">
              对冲前后专户资本保全成效对照 (Capital Protection Comparison)
            </span>
            <div className="space-y-2 text-xs font-mono">
              <div className="space-y-1">
                <div className="flex items-center justify-between text-slate-400 text-[10px]">
                  <span>裸头寸情景预期减记 (Unhedged Exposure)</span>
                  <span className="text-rose-400 font-bold">{lossText}</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div className="h-full bg-rose-500 rounded-full" style={{ width: `${portfolioStressResult?.portfolioLossPct ?? 0}%` }} />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-slate-400 text-[10px]">
                  <span>处方配置后净减记 (Hedged Net Loss)</span>
                  <span className="text-emerald-400 font-bold">-${bestHedge.residualLossMn}M (挽回 +${bestHedge.grossSavedMn}M)</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(100, bestHedge.residualLossMn / Math.max(1, hedgeSolution.aumUsdMn ?? activePortfolio?.baseAumUsdMn ?? 500) * 100)}%` }} />
                </div>
              </div>
            </div>
          </div>

          <p className="rounded-xl border border-white/10 bg-slate-900 p-3 text-xs text-slate-300">
            <strong className="text-white">研究草案 · 待审议</strong>　对冲结果取决于所选情景、组合与假设。
          </p>
        </div>
      )
    }
  ];

  const current = slides[currentSlide];

  return (
    <div
      data-testid="ic-pitchdeck-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/90 backdrop-blur-md animate-fade-in font-sans"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl bg-[#0a0f1c] border border-amber-400/35 shadow-[0_25px_70px_rgba(0,0,0,0.9)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="px-5 py-3 border-b border-white/[0.08] bg-[#0d1321]/95 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-600 to-orange-600 flex items-center justify-center text-white shadow-md">
              <Presentation className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">
                  投委会决策路演 (IC PitchDeck)
                </h3>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold">
                  v6.0 · 决策报告模式
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                4 幕交互式推演路演 · 宏观底座 ➔ 骨牌传染 ➔ 专户求根 ➔ 对冲处方
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyIcMemo}
              data-testid="copy-ic-memo-btn"
              className="h-7 px-2.5 rounded-lg border border-white/[0.1] bg-[#131b2e] hover:bg-[#182238] text-slate-200 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer"
              title="复制完整 Markdown 投委会决策备忘录"
            >
              {copiedMemo ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
              <span className="hidden sm:inline">{copiedMemo ? '已复制纪要' : '复制决策纪要'}</span>
            </button>
            <button
              onClick={handlePrint}
              data-testid="print-ic-deck-btn"
              className="h-7 px-2 rounded-lg border border-white/[0.1] bg-[#131b2e] hover:bg-[#182238] text-slate-300 hover:text-white text-xs flex items-center gap-1 cursor-pointer"
              title="打印路演幻灯片"
            >
              <Printer className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onClose}
              data-testid="close-pitchdeck-btn"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Slide Main Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-400/30 font-semibold">
                  {current.tag}
                </span>
                <span className="text-xs font-mono text-slate-400">{current.step}</span>
              </div>
              <h2 className="text-lg font-bold text-white mt-1">
                {current.title}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {current.subtitle}
              </p>
            </div>
          </div>

          {current.render()}
        </div>

        {/* Bottom Slide Controller Bar */}
        <div className="px-6 py-3 border-t border-white/[0.08] bg-[#0d1321]/95 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {[0, 1, 2, 3].map(idx => (
              <button
                key={idx}
                onClick={() => {
                  soundFx.playTick();
                  setCurrentSlide(idx);
                }}
                className={`h-2 rounded-full transition-all cursor-pointer ${
                  currentSlide === idx ? 'w-8 bg-amber-400' : 'w-2 bg-slate-700 hover:bg-slate-500'
                }`}
                title={`跳转至第 ${idx + 1} 幕`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold">
            <button
              onClick={() => {
                soundFx.playTick();
                setCurrentSlide(s => Math.max(0, s - 1));
              }}
              disabled={currentSlide === 0}
              className={`h-8 px-3 rounded-lg border flex items-center gap-1 transition-all ${
                currentSlide === 0
                  ? 'border-white/[0.05] text-slate-600 cursor-not-allowed'
                  : 'border-white/[0.1] bg-[#131b2e] hover:bg-[#182238] text-slate-200 hover:text-white cursor-pointer'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
              <span>上一幕</span>
            </button>

            <button
              onClick={() => {
                soundFx.playTick();
                if (currentSlide < 3) {
                  setCurrentSlide(s => s + 1);
                } else {
                  onClose();
                }
              }}
              data-testid="next-slide-btn"
              className="h-8 px-4 rounded-lg bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
            >
              <span>{currentSlide === 3 ? '完成路演' : '下一幕'}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
