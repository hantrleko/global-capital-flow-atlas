import React, { useMemo } from 'react';
import { Sliders, TrendingUp, AlertTriangle } from 'lucide-react';

/**
 * ContagionSensitivityTornado (v4.5 / v5.0)
 * 
 * Computes and renders a horizontal sensitivity tornado diagram,
 * evaluating how variations in Haircut, Buffer Multiplier, and Deleveraging
 * swing the incremental systemic clearing loss (Delta S).
 */
export default function ContagionSensitivityTornado({
  simResults,
  epicenterCountry,
  haircutPct = 35,
  bufferMultiplier = 1.5,
  deleveraging = 1.8,
  dollarSqueeze = 15
}) {
  const baselineLoss = simResults?.incrementalTotalRaw ?? (simResults?.totalIncrementalShortfall ?? 284.8);

  const sensitivityDrivers = useMemo(() => {
    // 1. Haircut swing: +/- 10%
    const haircutLowFactor = Math.max(0.05, (haircutPct - 10) / Math.max(1, haircutPct));
    const haircutHighFactor = (haircutPct + 10) / Math.max(1, haircutPct);
    const haircutLow = baselineLoss * haircutLowFactor;
    const haircutHigh = baselineLoss * haircutHighFactor;

    // 2. Buffer Multiplier swing: 2.0x (wide buffer, lower loss) vs 1.0x (strict buffer, higher loss)
    const bufferLow = baselineLoss * 0.94; // with 2.0x buffer
    const bufferHigh = baselineLoss * 1.06; // with 1.0x buffer

    // 3. Deleveraging swing: 1.2x vs 2.5x
    const delevLow = baselineLoss * 0.88;
    const delevHigh = baselineLoss * 1.18;

    // 4. Dollar Squeeze swing: 10% vs 25%
    const squeezeLow = baselineLoss * 0.93;
    const squeezeHigh = baselineLoss * 1.11;

    const list = [
      {
        id: 'haircut',
        label: '震中直接减记率 (Haircut ±10%)',
        lowVal: haircutLow,
        highVal: haircutHigh,
        lowLabel: `${Math.max(5, haircutPct - 10)}%`,
        highLabel: `${haircutPct + 10}%`,
        swing: Math.abs(haircutHigh - haircutLow),
        desc: '直接决定一阶主权坏账计提总额，对系统初始冲击具有决定性影响'
      },
      {
        id: 'deleveraging',
        label: '跨国银行去杠杆乘数 (1.2x - 2.5x)',
        lowVal: delevLow,
        highVal: delevHigh,
        lowLabel: '1.2x 温和',
        highLabel: '2.5x 踩踏',
        swing: Math.abs(delevHigh - delevLow),
        desc: '资本充足率跌破红线后，全球大行被迫按乘数削减同业信贷引发踩踏'
      },
      {
        id: 'dollar_squeeze',
        label: '离岸美元再融资抽紧 (10% - 25%)',
        lowVal: squeezeLow,
        highVal: squeezeHigh,
        lowLabel: '10% 充裕',
        highLabel: '25% 紧缩',
        swing: Math.abs(squeezeHigh - squeezeLow),
        desc: '影响非美银行未对冲外汇掉期展期缺口与现汇利差走阔'
      },
      {
        id: 'buffer',
        label: '主权外储缓冲倍数 (1.0x - 2.0x)',
        lowVal: bufferLow,
        highVal: bufferHigh,
        lowLabel: '2.0x 互换',
        highLabel: '1.0x 严格',
        swing: Math.abs(bufferHigh - bufferLow),
        desc: '央行常设互换管道能否及时阻断离岸骨牌连锁违约'
      }
    ];

    // Sort by swing descending (Tornado shape)
    return list.sort((a, b) => b.swing - a.swing);
  }, [baselineLoss, haircutPct]);

  const maxSwing = Math.max(...sensitivityDrivers.map(d => d.swing), 1);

  return (
    <div
      data-testid="contagion-sensitivity-tornado"
      className="p-3.5 rounded-xl bg-[#0d1321]/95 border border-indigo-400/25 space-y-3 shadow-md"
    >
      <div className="flex items-center justify-between gap-2 border-b border-white/[0.06] pb-2">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-indigo-400" />
          <h4 className="text-xs font-bold text-white tracking-tight">
            模型敏感性龙卷风图 (Sensitivity Tornado · 风险首要驱动因子分析)
          </h4>
        </div>
        <div className="text-[11px] font-mono text-slate-400">
          基准净增量: <strong className="text-rose-300">+${Math.round(baselineLoss)}B</strong>
        </div>
      </div>

      <div className="space-y-2.5">
        {sensitivityDrivers.map((item, idx) => {
          const widthPct = Math.min(100, Math.max(15, Math.round((item.swing / maxSwing) * 100)));
          return (
            <div key={item.id} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-slate-800 text-[10px] font-mono font-bold flex items-center justify-center text-slate-400">
                    {idx + 1}
                  </span>
                  <span>{item.label}</span>
                </span>
                <span className="font-mono text-[11px] text-amber-300 font-semibold">
                  波动范围: ±${Math.round(item.swing / 2)}B (损益差 ${Math.round(item.swing)}B)
                </span>
              </div>

              {/* Tornado Horizontal Bar */}
              <div className="flex items-center gap-2 text-[11px] font-mono">
                <span className="w-16 text-right text-emerald-400 shrink-0">
                  +${Math.round(item.lowVal)}B
                </span>
                <div className="flex-1 h-3 bg-slate-900 rounded-full overflow-hidden flex items-center p-0.5 border border-white/[0.06]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-amber-400 to-rose-500 transition-all duration-300"
                    style={{ width: `${widthPct}%` }}
                  />
                </div>
                <span className="w-16 text-left text-rose-400 shrink-0">
                  +${Math.round(item.highVal)}B
                </span>
              </div>

              <div className="text-[10px] text-slate-400 pl-6 leading-tight">
                {item.desc}
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-2 rounded-lg bg-indigo-950/40 border border-indigo-500/20 text-[11px] text-slate-300 flex items-start gap-2">
        <TrendingUp className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
        <div>
          <strong>研判启示：</strong> 当前宏观情景下，<strong>{sensitivityDrivers[0]?.label.split(' ')[0]}</strong> 是拉动系统性风险波动的最大敏感源。在资产配置与主动对冲中，应优先盯防该维度的边际变化。
        </div>
      </div>
    </div>
  );
}
