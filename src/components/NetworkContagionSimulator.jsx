import React, { useState, useMemo, useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { 
  AlertOctagon, Play, RotateCcw, ShieldAlert, ArrowRight, 
  TrendingDown, Layers, Zap, Download, Info 
} from 'lucide-react';

export default function NetworkContagionSimulator({
  dataset,
  selectedQuarter,
  onSelectCountry
}) {
  const countries = dataset.countries || [];
  const currentLinks = (dataset.bilateral_matrix || {})[selectedQuarter] || [];
  const currentQIdx = dataset.quarters.indexOf(selectedQuarter);
  const lbsData = dataset.lbs_data || {};
  const cbsRisk = dataset.cbs_risk || {};

  // Standard Macro Contagion Presets
  const CONTAGION_PRESETS = [
    { id: 'emerging_debt', name: '前沿主权外债违约', epicenter: 'TR', haircut: 40, deleveraging: 1.8, dollarSqueeze: 15, desc: '新兴市场主权债务暴雷引发直接资产减记与信贷重估' },
    { id: 'dollar_crunch', name: '离岸美元流动性休克', epicenter: 'GB', haircut: 20, deleveraging: 2.2, dollarSqueeze: 25, desc: '欧洲美元转口中枢流动性骤紧与全球美元荒' },
    { id: 'euro_contagion', name: '泛欧跨国银行去杠杆', epicenter: 'IT', haircut: 30, deleveraging: 2.0, dollarSqueeze: 12, desc: '核心主权息差走阔导致多米诺骨牌级联收缩' }
  ];

  // Simulation parameters
  const [activePreset, setActivePreset] = useState('custom');
  const [epicenter, setEpicenter] = useState('TR'); // Default: Turkey (high external vulnerability)
  const [haircutPct, setHaircutPct] = useState(25); // Credit loss %
  const [deleveragingMultiplier, setDeleveragingMultiplier] = useState(1.5); // Bank deleveraging ratio
  const [dollarSqueezePct, setDollarSqueezePct] = useState(12); // Dollar liquidity squeeze %
  const [simResults, setSimResults] = useState(null);

  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  const epicenterCountry = countries.find(c => c.code === epicenter) || countries[0];

  // Apply preset
  const handleSelectPreset = (p) => {
    setActivePreset(p.id);
    setEpicenter(p.epicenter);
    setHaircutPct(p.haircut);
    setDeleveragingMultiplier(p.deleveraging);
    setDollarSqueezePct(p.dollarSqueeze);
  };

  // Run Multi-Round Contagion Simulation (Eisenberg-Noe / Upper-Worms network cascade model)
  const runSimulation = () => {
    // 1. Direct creditors to epicenter
    const directCreditorLinks = currentLinks.filter(l => l.target === epicenter);
    
    // Round 1: Direct Losses
    const round1Losses = {};
    let totalR1Loss = 0;

    directCreditorLinks.forEach(l => {
      const loss = Math.round(l.claims_usd_bn * (haircutPct / 100));
      round1Losses[l.source] = (round1Losses[l.source] || 0) + loss;
      totalR1Loss += loss;
    });

    // Round 2: Secondary Deleveraging
    const round2Spillovers = {};
    let totalR2Contagion = 0;

    Object.entries(round1Losses).forEach(([creditorCode, r1Loss]) => {
      if (r1Loss > 10) {
        const retrenchmentPool = Math.round(r1Loss * deleveragingMultiplier);
        const otherLoans = currentLinks.filter(l => l.source === creditorCode && l.target !== epicenter);
        const totalOtherLoans = otherLoans.reduce((sum, l) => sum + l.claims_usd_bn, 0);

        if (totalOtherLoans > 0) {
          otherLoans.forEach(l => {
            const cut = Math.round(retrenchmentPool * (l.claims_usd_bn / totalOtherLoans));
            round2Spillovers[l.target] = (round2Spillovers[l.target] || 0) + cut;
            totalR2Contagion += cut;
          });
        }
      }
    });

    // Round 3: Dollar Refinancing Squeeze (Global Dollar Shortage)
    const round3DollarSqueeze = {};
    let totalR3Dollar = 0;

    countries.forEach(c => {
      if (c.code !== epicenter) {
        const dSqueeze = Math.round((c.base_liab || 120) * (c.default_usd_share / 100) * (dollarSqueezePct / 100));
        round3DollarSqueeze[c.code] = dSqueeze;
        totalR3Dollar += dSqueeze;
      }
    });

    // Compile comprehensive impact ranking
    const impactList = countries
      .filter(c => c.code !== epicenter)
      .map(c => {
        const r1 = round1Losses[c.code] || 0;
        const r2 = round2Spillovers[c.code] || 0;
        const r3 = round3DollarSqueeze[c.code] || 0;
        const totalImpact = r1 + r2 + r3;
        const reserves = c.fx_reserves || 1;
        const impactToReservesPct = parseFloat(((totalImpact / reserves) * 100).toFixed(1));

        return {
          code: c.code,
          name: c.name,
          name_zh: c.name_zh,
          region: c.region,
          tier: c.tier,
          r1Loss: r1,
          r2Spillover: r2,
          r3Dollar: r3,
          totalImpact,
          impactToReservesPct
        };
      })
      .filter(item => item.totalImpact > 0)
      .sort((a, b) => b.totalImpact - a.totalImpact);

    setSimResults({
      epicenterCode: epicenter,
      haircutPct,
      deleveragingMultiplier,
      dollarSqueezePct,
      totalR1Loss,
      totalR2Contagion,
      totalR3Dollar,
      totalSystemicLoss: totalR1Loss + totalR2Contagion + totalR3Dollar,
      impactList
    });
  };

  // Run on mount or when parameters change
  useEffect(() => {
    runSimulation();
  }, [epicenter, haircutPct, deleveragingMultiplier, dollarSqueezePct, selectedQuarter]);

  // Render Cascade Chart
  useEffect(() => {
    if (!chartRef.current) return;
    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current, 'dark');
      const handleResize = () => chartInstance.current?.resize();
      window.addEventListener('resize', handleResize);
      return () => {
        window.removeEventListener('resize', handleResize);
        chartInstance.current?.dispose();
        chartInstance.current = null;
      };
    }
  }, []);

  useEffect(() => {
    if (!chartInstance.current || !simResults) return;

    const topImpacted = simResults.impactList.slice(0, 10).reverse();

    const option = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: 'rgba(10, 15, 30, 0.94)',
        borderColor: 'rgba(244, 63, 94, 0.4)',
        borderWidth: 1,
        padding: [10, 14],
        extraCssText: 'box-shadow: 0 12px 36px rgba(0,0,0,0.6); backdrop-filter: blur(12px); border-radius: 8px;',
        textStyle: { color: '#f8fafc', fontSize: 12 },
        formatter: (params) => {
          const item = topImpacted[params[0].dataIndex];
          return `
            <div class="p-1 font-sans">
              <div class="font-bold text-white border-b border-slate-700 pb-1 mb-1">
                ${item.name_zh} (${item.code}) 传染冲击损益
              </div>
              <div class="space-y-1 text-xs">
                <div>第一轮：直接资产减记损失: <b class="font-mono text-rose-400">$${item.r1Loss} 亿</b></div>
                <div>第二轮：去杠杆流动性抽离: <b class="font-mono text-amber-400">$${item.r2Spillover} 亿</b></div>
                <div>第三轮：离岸美元再融资挤压: <b class="font-mono text-sky-400">$${item.r3Dollar} 亿</b></div>
                <div class="border-t border-slate-800 pt-1">
                  综合受损总额: <b class="font-mono text-white text-sm font-bold">$${item.totalImpact} 亿</b>
                </div>
                <div class="text-[10px] text-slate-400">冲击占外汇储备比: <b class="font-mono text-rose-400">${item.impactToReservesPct}%</b></div>
              </div>
            </div>
          `;
        }
      },
      legend: {
        data: ['第一轮：直接资产减记 (Direct Loss)', '第二轮：去杠杆流动性抽离 (Secondary Retrenchment)', '第三轮：离岸美元再融资挤压 (USD Squeeze)'],
        top: 8,
        textStyle: { color: '#94a3b8', fontSize: 11 }
      },
      grid: {
        left: '18%',
        right: '8%',
        top: '16%',
        bottom: '8%'
      },
      xAxis: {
        type: 'value',
        name: '受损规模 ($ 10亿)',
        splitLine: { lineStyle: { color: '#1e293b' } },
        axisLabel: { color: '#94a3b8' }
      },
      yAxis: {
        type: 'category',
        data: topImpacted.map(d => d.name_zh),
        axisLine: { lineStyle: { color: '#334155' } },
        axisLabel: { color: '#cbd5e1', fontSize: 11 }
      },
      series: [
        {
          name: '第一轮：直接资产减记 (Direct Loss)',
          type: 'bar',
          stack: 'total',
          itemStyle: { color: '#f43f5e' },
          data: topImpacted.map(d => d.r1Loss)
        },
        {
          name: '第二轮：去杠杆流动性抽离 (Secondary Retrenchment)',
          type: 'bar',
          stack: 'total',
          itemStyle: { color: '#f59e0b' },
          data: topImpacted.map(d => d.r2Spillover)
        },
        {
          name: '第三轮：离岸美元再融资挤压 (USD Squeeze)',
          type: 'bar',
          stack: 'total',
          itemStyle: { color: '#38bdf8' },
          data: topImpacted.map(d => d.r3Dollar)
        }
      ]
    };

    chartInstance.current.setOption(option, true);
  }, [simResults]);

  const handleDownloadSnapshot = () => {
    if (!chartInstance.current) return;
    const url = chartInstance.current.getDataURL({
      type: 'png',
      pixelRatio: 2,
      backgroundColor: '#080c14'
    });
    const a = document.createElement('a');
    a.href = url;
    a.download = `bis_contagion_simulation_${epicenter}_${selectedQuarter}.png`;
    a.click();
  };

  return (
    <div className="glass-panel rounded-2xl p-5 shadow-2xl space-y-5">
      {/* Top Header & Simulation Controls */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-3 gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
            <AlertOctagon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              全球跨国银行网络系统性风险与传染扩散模拟器 (Eisenberg-Noe Contagion Cascade)
              <span className="text-[11px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                {selectedQuarter}
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              基于 BIS 官方双边有向网络，推演某经济体违约或资本减记时，跨国银行一级资本的直接损失、去杠杆外溢与美元流动性短缺
            </p>
          </div>
        </div>

        <button
          onClick={handleDownloadSnapshot}
          className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
          title="导出高清仿真图 PNG"
        >
          <Download className="w-4 h-4" />
        </button>
      </div>

      {/* Scenario Presets Pill Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <span className="text-xs font-mono text-slate-400 flex items-center gap-1 shrink-0">
          <Zap className="w-3.5 h-3.5 text-amber-400" /> 经典压力预设:
        </span>
        {CONTAGION_PRESETS.map(p => (
          <button
            key={p.id}
            onClick={() => handleSelectPreset(p)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all shrink-0 cursor-pointer border ${
              activePreset === p.id
                ? 'bg-rose-600/30 text-rose-300 border-rose-500/60 font-bold shadow-sm'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title={p.desc}
          >
            {p.name}
          </button>
        ))}
        <button
          onClick={() => setActivePreset('custom')}
          className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all shrink-0 cursor-pointer border ${
            activePreset === 'custom'
              ? 'bg-sky-600/30 text-sky-300 border-sky-500/60 font-bold shadow-sm'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          ⚙️ 自由参数工坊
        </button>
      </div>

      {/* Simulator Control Sliders */}
      <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
        <div>
          <label className="block text-slate-400 mb-1 font-semibold">1. 设定震中经济体 (Trigger Epicenter):</label>
          <select
            value={epicenter}
            onChange={(e) => {
              setEpicenter(e.target.value);
              setActivePreset('custom');
            }}
            className="w-full bg-slate-800 border border-slate-700 text-white font-bold px-2 py-1.5 rounded focus:outline-none focus:border-rose-500 cursor-pointer"
          >
            {countries.map(c => (
              <option key={c.code} value={c.code}>
                {c.name_zh} ({c.code}) - {c.region}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div className="flex justify-between text-slate-400 mb-1">
            <span className="font-semibold">2. 债务违约/资产减记率:</span>
            <span className="font-mono text-rose-400 font-bold">{haircutPct}%</span>
          </div>
          <input
            type="range"
            min={5}
            max={60}
            step={5}
            value={haircutPct}
            onChange={(e) => {
              setHaircutPct(parseInt(e.target.value, 10));
              setActivePreset('custom');
            }}
            className="w-full accent-rose-500 bg-slate-800 h-1.5 rounded appearance-none cursor-pointer mt-1"
          />
        </div>

        <div>
          <div className="flex justify-between text-slate-400 mb-1">
            <span className="font-semibold">3. 跨国银行去杠杆乘数:</span>
            <span className="font-mono text-amber-400 font-bold">{deleveragingMultiplier}x</span>
          </div>
          <input
            type="range"
            min={1.0}
            max={3.0}
            step={0.1}
            value={deleveragingMultiplier}
            onChange={(e) => {
              setDeleveragingMultiplier(parseFloat(e.target.value));
              setActivePreset('custom');
            }}
            className="w-full accent-amber-500 bg-slate-800 h-1.5 rounded appearance-none cursor-pointer mt-1"
          />
        </div>

        <div>
          <div className="flex justify-between text-slate-400 mb-1">
            <span className="font-semibold">4. 离岸美元流动性抽水:</span>
            <span className="font-mono text-sky-400 font-bold">{dollarSqueezePct}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={30}
            step={2}
            value={dollarSqueezePct}
            onChange={(e) => {
              setDollarSqueezePct(parseInt(e.target.value, 10));
              setActivePreset('custom');
            }}
            className="w-full accent-sky-400 bg-slate-800 h-1.5 rounded appearance-none cursor-pointer mt-1"
          />
        </div>
      </div>

      {/* Summary KPI Badges */}
      {simResults && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
            <div className="text-[11px] text-slate-400 uppercase tracking-wider font-mono">
              震中直接吸收敞口 (Round 1)
            </div>
            <div className="text-lg font-bold font-mono text-rose-400 mt-0.5">
              ${simResults.totalR1Loss} 亿
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              由 {epicenterCountry.name_zh} 的直接主要债权国银行承担
            </div>
          </div>

          <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
            <div className="text-[11px] text-slate-400 uppercase tracking-wider font-mono">
              次生信贷抽离外溢 (Round 2)
            </div>
            <div className="text-lg font-bold font-mono text-amber-400 mt-0.5">
              ${simResults.totalR2Contagion} 亿
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              受损银行为了维系资本充足率削减的外债池
            </div>
          </div>

          <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
            <div className="text-[11px] text-slate-400 uppercase tracking-wider font-mono">
              离岸美元挤兑缺口 (Round 3)
            </div>
            <div className="text-lg font-bold font-mono text-sky-400 mt-0.5">
              ${simResults.totalR3Dollar} 亿
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              非美实体美元未对冲敞口再融资冲击
            </div>
          </div>

          <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
            <div className="text-[11px] text-slate-400 uppercase tracking-wider font-mono">
              全网系统性流动性蒸发
            </div>
            <div className="text-lg font-bold font-mono text-white mt-0.5">
              ${simResults.totalSystemicLoss} 亿
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              波及经济体数量: {simResults.impactList.length} 个
            </div>
          </div>
        </div>
      )}

      {/* Main Grid: Cascade Chart + Impact Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Cascade Chart (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900/40 border border-slate-800/90 rounded-xl p-3 flex flex-col justify-between">
          <div className="text-xs font-bold text-white flex items-center justify-between border-b border-slate-800 pb-2">
            <span>受冲击最深的前 10 大受害经济体级联损益</span>
            <span className="text-[10px] text-slate-400 font-mono">Round 1 + Round 2</span>
          </div>
          <div ref={chartRef} className="w-full h-[360px]" />
        </div>

        {/* Impact Table (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900/40 border border-slate-800/90 rounded-xl p-3 flex flex-col justify-between">
          <div>
            <div className="text-xs font-bold text-white border-b border-slate-800 pb-2 mb-2 flex items-center justify-between">
              <span>系统性受创排序榜单</span>
              <span className="text-slate-400 text-[10px]">点击可展开档案</span>
            </div>

            <div className="space-y-1.5 max-h-[340px] overflow-y-auto">
              {simResults?.impactList.map((item, idx) => (
                <div
                  key={item.code}
                  onClick={() => onSelectCountry(item.code)}
                  className="p-2 bg-slate-950/80 hover:bg-slate-800/80 border border-slate-800/80 rounded-lg cursor-pointer transition-all flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-slate-500 text-[11px] w-4">{idx + 1}.</span>
                    <span className="font-bold text-white">{item.name_zh}</span>
                    <span className="font-mono text-[10px] text-slate-400">({item.code})</span>
                  </div>

                  <div className="text-right">
                    <div className="font-mono font-bold text-rose-400">
                      -${item.totalImpact} 亿
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      损耗储备: {item.impactToReservesPct}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="text-[11px] text-slate-400 bg-slate-950 p-2 rounded border border-slate-800/80 mt-2">
            💡 <strong>金融网络学理论提示：</strong> 该模拟基于国际金融经典网络传导模型（Eisenberg & Noe 2001, Upper & Worms 2004）。如果震中位于具备高借款集中度的中心，英、美、法、西等大型跨国母行的一级资本首当其冲。
          </div>
        </div>
      </div>
    </div>
  );
}
