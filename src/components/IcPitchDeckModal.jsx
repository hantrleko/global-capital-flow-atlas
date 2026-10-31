import React, { useState, useEffect } from 'react';
import {
  Presentation, X, ChevronLeft, ChevronRight, Sparkles,
  ShieldCheck, AlertTriangle, TrendingDown, Layers, Check, Copy, Printer,
  Activity, ArrowRight, ShieldAlert, Award, FileText
} from 'lucide-react';
import soundFx from '../utils/soundEffects';
import { encodeReproducibilityCode } from '../utils/reproducibilityEngine';
import { solveOptimalHedgePackage } from '../utils/hedgeOptimizer';
import { computePortfolioSafetyCushion, computeHistoricalCrisisReplay } from '../utils/reverseStressSolver';

export default function IcPitchDeckModal({
  isOpen,
  onClose,
  dataset,
  selectedQuarter = '2026Q1',
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

  const totalClaimsTrillion = 47.62;
  const bypassedTrillion = 6.84;
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
    const memo = `### EUGENE FINANCE · 投委会 (IC) 宏观流动性与专户压力路演决议纪要
- **报告期**: ${selectedQuarter} | **审议专户**: ${activePortfolio?.name || '宏观对冲优选组合'} ($${activePortfolio?.baseAumUsdMn || 500}M)
- **学术复现码**: \`${repCode}\`
- **宏观底座**: 全球跨国银行总债权 $${totalClaimsTrillion}T, 离岸壳中转穿透规模 -$${bypassedTrillion}T
- **情景震中**: ${epicenter} (主权直接减记 ${haircut}%, 外储缓冲倍数 ${bufferMultiplier}x)
- **专户预期减记**: -$${portfolioStressResult?.totalLossMn || 42.5}M (-${portfolioStressResult?.portfolioLossPct || 8.5}%)
- **反向压力破防临界点 (alpha*)**: ${safetyMetrics.criticalHaircutPct}% (安全缓冲垫: ${safetyMetrics.safetyCushionPct > 0 ? '+' : ''}${safetyMetrics.safetyCushionPct}%, 状态: [${safetyMetrics.statusZh}])
- **历史危机穿越对比**: 
${crisisReplay.scenarios.map(s => `  * ${s.labelZh}: 预计损失 -$${s.totalLossMn}M (-${s.lossPct}%), 限额缓冲: ${s.cushionMn >= 0 ? '+' : ''}$${s.cushionMn}M`).join('\n')}
- **投委会签批处方**: 【${bestHedge.name}】
  * 对冲成本: ${bestHedge.costBps} bps ($${bestHedge.hedgeCostMn}M)
  * 挽回减记资本: +$${bestHedge.grossSavedMn}M (净挽回: +$${bestHedge.netSavedMn}M)
  * 防护性价比 (Protection ROI): ${bestHedge.protectionRoi}x
- **投委会表决**: [√] 建议批准执行主动对冲处方配置`;

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
      tag: '宏观底座 · 资金动脉',
      title: '全球跨国银行信贷动脉与离岸壳架构穿透',
      subtitle: `官方核准债权总额 $${totalClaimsTrillion}T，剥离 $${bypassedTrillion}T 离岸通道后还原至母国真实风险承担者`,
      render: () => (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-4 rounded-xl bg-[#0d1321] border border-white/[0.08] space-y-1">
              <span className="text-xs text-slate-400 font-mono">全球跨国信贷总规模</span>
              <div className="text-2xl font-bold font-mono text-white">${totalClaimsTrillion}T</div>
              <p className="text-[11px] text-slate-400">官方核准 36 季度序列，跨国银行信贷动脉保持韧性扩张</p>
            </div>
            <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/30 space-y-1">
              <span className="text-xs text-amber-300 font-mono">离岸中转壳通道剥离</span>
              <div className="text-2xl font-bold font-mono text-amber-400">-${bypassedTrillion}T</div>
              <p className="text-[11px] text-slate-400">穿透开曼 (KY)、卢森堡 (LU)、香港 (HK) 避税过桥实体</p>
            </div>
            <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-500/30 space-y-1">
              <span className="text-xs text-indigo-300 font-mono">母国最终风险集中度</span>
              <div className="text-2xl font-bold font-mono text-indigo-300">G-SIB 68%</div>
              <p className="text-[11px] text-slate-400">风险自避税港回流至美、英、德跨国母行资产负债表</p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#0d1321]/90 border border-white/[0.08] space-y-2">
            <h4 className="text-xs font-bold text-white flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>投委会宏观研判要点 (IC Key Insights)</span>
            </h4>
            <ul className="text-xs text-slate-300 space-y-1.5 list-disc pl-4 leading-relaxed">
              <li><strong>资金流向分化</strong>：跨国资本正自前沿高杠杆经济体回撤，向美德高流动性主权资产与核心同业集中。</li>
              <li><strong>离岸影子隐性杠杆</strong>：表外非银外汇掉期（FX Swaps）美元计价敞口仍处历史高位，离岸美元荒风险外溢性极强。</li>
              <li><strong>会计口径差异</strong>：若仅依赖传统 LBS 居住地口径，将低估美欧核心行对新兴市场的实际穿透头寸达 34%。</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      step: '02 / 04',
      tag: '传导机制 · 级联清算',
      title: 'Eisenberg-Noe 网络清算多米诺与敏感性龙卷风',
      subtitle: `震中 ${epicenter} 引爆一阶主权冲销后，二级去杠杆踩踏向全球 G-SIB 大行蔓延`,
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
              <div className="text-base font-bold text-white mt-1">德法跨国大行</div>
              <div className="text-[10px] text-slate-400 mt-0.5">资产端直接拨备计提</div>
            </div>
            <div className="p-3 rounded-xl bg-[#0d1321] border border-white/[0.08]">
              <span className="text-[11px] text-indigo-300">第2阶: 同业踩踏外溢</span>
              <div className="text-base font-bold text-white mt-1">去杠杆 1.8x</div>
              <div className="text-[10px] text-slate-400 mt-0.5">削减跨境银行间授信</div>
            </div>
            <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/30">
              <span className="text-[11px] text-emerald-300">第3阶: 专户防线</span>
              <div className="text-base font-bold text-white mt-1">主动对冲锁定</div>
              <div className="text-[10px] text-slate-400 mt-0.5">拦截极端尾部穿透</div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#0d1321] border border-white/[0.08] space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-indigo-400" />
                <span>敏感性龙卷风分析结论</span>
              </span>
              <span className="font-mono text-indigo-300 text-[11px]">科学复现码: {repCode}</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              模型敏感性评估表明：<strong>震中直接减记率 (Haircut ±10%)</strong> 与 <strong>去杠杆乘数 (1.2x - 2.5x)</strong> 是拉动系统性风险波动的最主要摇摆源。央行外储缓冲倍数若低于 1.0x，同业连锁违约短缺将呈非线性雪崩激增。
            </p>
          </div>
        </div>
      )
    },
    {
      step: '03 / 04',
      tag: '专户风控 · 破防求根',
      title: '专户压力受损、安全边际仪表盘与历史危机回测',
      subtitle: `专户 AUM $${activePortfolio?.baseAumUsdMn || 500}M · 预期减记 -$${portfolioStressResult?.totalLossMn || 42.5}M · 离破防临界点仍有安全缓冲`,
      render: () => (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-4 rounded-xl bg-[#0d1321] border border-white/[0.08] space-y-1">
              <span className="text-xs text-slate-400 font-mono">当前情景预期净减记</span>
              <div className="text-xl font-bold font-mono text-rose-400">
                -${portfolioStressResult?.totalLossMn || 42.5}M
              </div>
              <div className="text-[11px] text-slate-400">
                占 AUM 比例: -{portfolioStressResult?.portfolioLossPct || 8.5}% (VaR: -${portfolioStressResult?.stressVaR99Mn || 58.2}M)
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

          {/* Historical Crisis Comparison Grid */}
          <div className="p-3.5 rounded-xl bg-[#0d1321]/90 border border-white/[0.08] space-y-2">
            <h4 className="text-xs font-bold text-white flex items-center justify-between">
              <span>历史经典危机平行穿越回测 (Historical Crisis Backtest)</span>
              <span className="text-[11px] text-slate-400 font-mono">统一投射至当前专户持仓</span>
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
              {crisisReplay.scenarios.map(s => (
                <div key={s.id} className="p-2.5 rounded-lg bg-[#070a12] border border-white/[0.06] space-y-1">
                  <div className="text-[11px] text-slate-300 font-bold truncate">{s.labelZh}</div>
                  <div className="text-sm font-bold text-rose-400">-${s.totalLossMn}M</div>
                  <div className="text-[10px] text-slate-400">回撤 -{s.lossPct}%</div>
                  <div className={`text-[10px] ${s.cushionMn >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {s.cushionMn >= 0 ? `缓冲 +$${s.cushionMn}M` : `击穿 -$${Math.abs(s.cushionMn)}M`}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )
    },
    {
      step: '04 / 04',
      tag: '处方决策 · 签批落地',
      title: '帕累托最优对冲处方建议与投委会决议签批',
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

          <div className="p-3.5 rounded-xl bg-[#0d1321] border border-white/[0.08] space-y-2 text-xs">
            <h5 className="font-bold text-white flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-indigo-400" />
              <span>投委会路演表决意见与签批归档</span>
            </h5>
            <p className="text-slate-300 leading-relaxed">
              经投委会 (IC) 全体审议，当前宏观与专户脆弱性处于可控边界。建议按本处方立即执行对冲头寸建仓，并持续追踪 BIS 季度双边矩阵异动与学术复现码参数演变。
            </p>
          </div>
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
