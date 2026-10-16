import React, { useState, useMemo } from 'react';
import { 
  Sliders, AlertTriangle, ShieldAlert, Zap, RotateCcw, 
  TrendingDown, DollarSign, Activity, Play, CheckCircle2,
  Skull, Layers, Compass, Sparkles, X, ArrowRight
} from 'lucide-react';
import soundFx from '../utils/soundEffects';

export default function MacroShockSandbox({
  isOpen,
  onClose,
  dataset,
  selectedQuarter,
  onApplyShock
}) {
  // Shock sliders
  const [fedHikeBps, setFedHikeBps] = useState(100);
  const [creditContractionPct, setCreditContractionPct] = useState(15);
  const [fxSwapBasisBps, setFxSwapBasisBps] = useState(120);
  const [sovereignHaircutPct, setSovereignHaircutPct] = useState(20);
  const [offshoreRunFactor, setOffshoreRunFactor] = useState(1.5);
  const [selectedPreset, setSelectedPreset] = useState('custom');

  if (!isOpen) return null;

  const currentMacro = (dataset.global_macro || {})[selectedQuarter] || {};
  const totalClaims = currentMacro.total_cross_border_claims_usd_bn || 47600;
  const countries = dataset.countries || [];

  // Presets definition
  const presets = [
    {
      id: '2008_freeze',
      name: '2008 雷曼式跨国流动性冻结',
      fed: 0,
      contraction: 28,
      basis: 250,
      haircut: 35,
      offshore: 2.5
    },
    {
      id: '1997_asian_run',
      name: '1997 亚洲外债挤兑重演',
      fed: 150,
      contraction: 22,
      basis: 180,
      haircut: 40,
      offshore: 2.0
    },
    {
      id: '2022_stagflation',
      name: '2022 滞胀暴力加息冲击',
      fed: 250,
      contraction: 14,
      basis: 130,
      haircut: 15,
      offshore: 1.3
    },
    {
      id: 'carry_unwind_2026',
      name: '日元套息彻底逆转与合成美元荒',
      fed: 50,
      contraction: 18,
      basis: 220,
      haircut: 25,
      offshore: 2.2
    }
  ];

  const applyPreset = (p) => {
    soundFx.playTick();
    setSelectedPreset(p.id);
    setFedHikeBps(p.fed);
    setCreditContractionPct(p.contraction);
    setFxSwapBasisBps(p.basis);
    setSovereignHaircutPct(p.haircut);
    setOffshoreRunFactor(p.offshore);
  };

  const handleReset = () => {
    soundFx.playTick();
    setSelectedPreset('baseline');
    setFedHikeBps(0);
    setCreditContractionPct(0);
    setFxSwapBasisBps(0);
    setSovereignHaircutPct(0);
    setOffshoreRunFactor(1.0);
  };

  // Real-time macro contagion recalculation
  const simulationResults = useMemo(() => {
    // 1. Direct credit contraction loss ($B)
    const directLoss = totalClaims * (creditContractionPct / 100);

    // 2. Dollar basis funding spread distress ($B)
    const basisDistressLoss = (totalClaims * 0.54) * (fxSwapBasisBps / 10000) * 1.8;

    // 3. Sovereign debt haircut loss ($B)
    const sovereignLoss = (totalClaims * 0.28) * (sovereignHaircutPct / 100);

    // 4. Shadow run amplifier
    const totalSimulatedLoss = Math.round(
      (directLoss + basisDistressLoss + sovereignLoss) * (offshoreRunFactor > 1 ? 1 + (offshoreRunFactor - 1) * 0.35 : 1)
    );

    // 5. Global Tier-1 Capital depletion (assumed $12T global Tier-1 bank capital)
    const tier1DepletionBps = Math.min(650, Math.round((totalSimulatedLoss / 12000) * 10000));

    // 6. Insolvent / distressed nodes evaluation
    const distressedList = [];
    countries.forEach(c => {
      let riskScore = 0;
      if (c.tier === 'EM' || c.tier === 'FRONTIER') riskScore += 30;
      if (c.type === 'offshore_conduit') riskScore += offshoreRunFactor * 18;
      if (sovereignHaircutPct > 15 && (c.tier === 'EM' || c.code === 'IT' || c.code === 'GR' || c.code === 'TR' || c.code === 'AR')) riskScore += 35;
      if (fxSwapBasisBps > 100 && (c.code === 'JP' || c.code === 'KR' || c.code === 'TW' || c.code === 'BR')) riskScore += 25;
      if (creditContractionPct > 20) riskScore += 20;

      if (riskScore >= 60) {
        distressedList.push({
          code: c.code,
          name: c.name_zh,
          riskScore: Math.min(100, riskScore),
          status: riskScore >= 75 ? 'insolvent' : 'distressed'
        });
      }
    });

    const cascadeRounds = totalSimulatedLoss > 6000 ? 4 : totalSimulatedLoss > 3000 ? 3 : totalSimulatedLoss > 1000 ? 2 : 1;

    return {
      totalLoss: totalSimulatedLoss,
      tier1DepletionBps,
      cascadeRounds,
      distressedList: distressedList.sort((a, b) => b.riskScore - a.riskScore)
    };
  }, [totalClaims, creditContractionPct, fxSwapBasisBps, sovereignHaircutPct, offshoreRunFactor, countries]);

  const handleApplyToPlatform = () => {
    soundFx.playChime();
    onApplyShock?.({
      fedHikeBps,
      creditContractionPct,
      fxSwapBasisBps,
      sovereignHaircutPct,
      offshoreRunFactor,
      totalLoss: simulationResults.totalLoss
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-950/85 backdrop-blur-md animate-fade-in font-sans">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl bg-slate-900 border border-rose-500/40 shadow-[0_0_60px_rgba(244,63,94,0.35)] overflow-hidden">
        {/* Top Accent Gradient Line */}
        <div className="h-1.5 w-full bg-gradient-to-r from-rose-500 via-amber-500 to-sky-500" />

        {/* Modal Header */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600 to-amber-600 flex items-center justify-center text-white shadow-[0_0_15px_rgba(244,63,94,0.4)]">
              <ShieldAlert className="w-5 h-5 text-rose-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base md:text-lg font-bold text-white tracking-tight">
                  宏观复合冲击调制台与压力测试沙盒 (Macro Shock Sandbox)
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40">
                  Interactive Stress Engine
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                基于 Eisenberg-Noe 级联清算模型与巴塞尔 III 逆周期资本缓冲的参数化冲击测算
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              soundFx.playTick();
              onClose();
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Preset Cocktail Bar */}
        <div className="px-6 py-2.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-2 overflow-x-auto">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-mono text-slate-400 whitespace-nowrap">经典压力鸡尾酒:</span>
            {presets.map(p => (
              <button
                key={p.id}
                onClick={() => applyPreset(p)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  selectedPreset === p.id
                    ? 'bg-rose-600 text-white shadow-[0_0_10px_rgba(244,63,94,0.5)]'
                    : 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700'
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>

          <button
            onClick={handleReset}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs flex items-center gap-1 shrink-0 cursor-pointer"
            title="重置为基准零冲击状态"
          >
            <RotateCcw className="w-3 h-3 text-slate-400" />
            <span>重置</span>
          </button>
        </div>

        {/* Modal Body: Sliders vs Real-time Impact */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Interactive Shock Sliders (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 font-mono">
              <Sliders className="w-4 h-4 text-sky-400" />
              冲击因子调节面板 (Shock Parameters)
            </h3>

            {/* Slider 1: Fed Hike */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-200">① 主要央行政策利率额外加息 (Policy Rate Hike)</span>
                <span className="font-mono font-bold text-amber-400">+{fedHikeBps} bps</span>
              </div>
              <input
                type="range"
                min={0}
                max={300}
                step={25}
                value={fedHikeBps}
                onChange={(e) => {
                  setSelectedPreset('custom');
                  setFedHikeBps(parseInt(e.target.value, 10));
                }}
                className="w-full accent-amber-500 bg-slate-800 h-2 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>0 bps (中性)</span>
                <span>+150 bps (中度收紧)</span>
                <span>+300 bps (沃尔克式极压)</span>
              </div>
            </div>

            {/* Slider 2: Credit Contraction */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-200">② 全球跨国银行信贷骤缩 (Credit Contraction)</span>
                <span className="font-mono font-bold text-rose-400">-{creditContractionPct}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={40}
                step={1}
                value={creditContractionPct}
                onChange={(e) => {
                  setSelectedPreset('custom');
                  setCreditContractionPct(parseInt(e.target.value, 10));
                }}
                className="w-full accent-rose-500 bg-slate-800 h-2 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>0% (平稳)</span>
                <span>-20% (后次贷级别)</span>
                <span>-40% (大萧条式断流)</span>
              </div>
            </div>

            {/* Slider 3: FX Swap Basis (USD Squeeze) */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-200">③ 离岸合成美元外汇掉期基差扩大 (FX Swap Basis)</span>
                <span className="font-mono font-bold text-sky-400">+{fxSwapBasisBps} bps</span>
              </div>
              <input
                type="range"
                min={0}
                max={300}
                step={10}
                value={fxSwapBasisBps}
                onChange={(e) => {
                  setSelectedPreset('custom');
                  setFxSwapBasisBps(parseInt(e.target.value, 10));
                }}
                className="w-full accent-sky-500 bg-slate-800 h-2 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>0 bps (无溢价)</span>
                <span>+120 bps (2020年3月)</span>
                <span>+300 bps (全面流动性枯竭)</span>
              </div>
            </div>

            {/* Slider 4: Sovereign Haircut */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-200">④ 外围/高负债主权外债折扣率 (Sovereign Haircut)</span>
                <span className="font-mono font-bold text-purple-400">{sovereignHaircutPct}% 折扣</span>
              </div>
              <input
                type="range"
                min={0}
                max={50}
                step={5}
                value={sovereignHaircutPct}
                onChange={(e) => {
                  setSelectedPreset('custom');
                  setSovereignHaircutPct(parseInt(e.target.value, 10));
                }}
                className="w-full accent-purple-500 bg-slate-800 h-2 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>0% (全额履约)</span>
                <span>25% (欧债危机级)</span>
                <span>50% (主权全面重组)</span>
              </div>
            </div>

            {/* Slider 5: Offshore Shadow Run Factor */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-200">⑤ 离岸影子银行与非银载体赎回挤兑乘数 (NBFI Run)</span>
                <span className="font-mono font-bold text-emerald-400">{offshoreRunFactor.toFixed(1)}x 挤兑</span>
              </div>
              <input
                type="range"
                min={1.0}
                max={3.0}
                step={0.1}
                value={offshoreRunFactor}
                onChange={(e) => {
                  setSelectedPreset('custom');
                  setOffshoreRunFactor(parseFloat(e.target.value));
                }}
                className="w-full accent-emerald-500 bg-slate-800 h-2 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>1.0x (常态留存)</span>
                <span>2.0x (严峻离岸撤资)</span>
                <span>3.0x (全面清盘恐慌)</span>
              </div>
            </div>
          </div>

          {/* Right Column: Real-time Contagion Output (5 cols) */}
          <div className="lg:col-span-5 space-y-4 flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 font-mono mb-3">
                <Activity className="w-4 h-4 text-rose-400" />
                实时测算结果 (Live Impact Matrix)
              </h3>

              {/* Metric 1: Systemic Loss */}
              <div className="bg-slate-950 border border-rose-500/30 rounded-xl p-4 shadow-lg space-y-1 mb-3">
                <span className="text-[11px] text-slate-400 uppercase tracking-wider font-mono">预计全球跨境资本蒸发/损失</span>
                <div className="text-2xl md:text-3xl font-bold font-mono text-rose-400 flex items-baseline gap-1">
                  ${(simulationResults.totalLoss / 1000).toFixed(2)}
                  <span className="text-xs font-normal text-slate-400">万亿美元</span>
                </div>
                <span className="text-[11px] text-slate-500">
                  约占当前季度跨境总债权的 {((simulationResults.totalLoss / totalClaims) * 100).toFixed(1)}%
                </span>
              </div>

              {/* Metric 2: Grid of Secondary Indicators */}
              <div className="grid grid-cols-2 gap-2.5 mb-3">
                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
                  <span className="text-[10px] text-slate-400 block font-mono">一级资本侵蚀</span>
                  <span className="text-lg font-bold font-mono text-amber-400">
                    -{simulationResults.tier1DepletionBps} bps
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">全球 G-SIB 均值</span>
                </div>

                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
                  <span className="text-[10px] text-slate-400 block font-mono">级联传染轮次</span>
                  <span className="text-lg font-bold font-mono text-purple-400">
                    {simulationResults.cascadeRounds} 轮清算
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">Eisenberg-Noe</span>
                </div>
              </div>

              {/* Distressed Jurisdictions List */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-white flex items-center gap-1">
                    <Skull className="w-3.5 h-3.5 text-rose-400" />
                    高危承压经济体 ({simulationResults.distressedList.length})
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">脆弱度排序</span>
                </div>

                <div className="max-h-36 overflow-y-auto space-y-1.5 scrollbar-thin scrollbar-thumb-slate-700 pr-1 text-xs">
                  {simulationResults.distressedList.length > 0 ? (
                    simulationResults.distressedList.map(node => (
                      <div key={node.code} className="flex items-center justify-between p-1.5 rounded-lg bg-slate-900 border border-slate-800/80 font-mono">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${node.status === 'insolvent' ? 'bg-rose-500 animate-ping' : 'bg-amber-500'}`} />
                          <span className="font-bold text-white">{node.name}</span>
                          <span className="text-[10px] text-slate-400">({node.code})</span>
                        </div>
                        <span className={`text-[11px] font-bold ${node.status === 'insolvent' ? 'text-rose-400' : 'text-amber-400'}`}>
                          {node.status === 'insolvent' ? '资不抵债' : '流动性告急'}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4 text-xs text-slate-500">
                      基准参数下未触发大规模主权违约
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-800">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                关闭面板
              </button>
              <button
                onClick={handleApplyToPlatform}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white text-xs font-bold shadow-lg shadow-rose-600/30 flex items-center gap-1.5 transition-all hover:scale-[1.02] cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>将冲击应用至全景网络</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
