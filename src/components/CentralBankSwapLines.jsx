import React, { useState, useMemo, useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { 
  Repeat, DollarSign, ShieldCheck, Activity, Globe,
  AlertCircle, ArrowRightLeft, Building2, Flame, Layers
} from 'lucide-react';

export default function CentralBankSwapLines({
  dataset,
  selectedQuarter,
  onSelectCountry
}) {
  const basisChartRef = useRef(null);
  const swapDrawChartRef = useRef(null);
  const basisChartInst = useRef(null);
  const swapDrawChartInst = useRef(null);

  const [activeNetworkTab, setActiveNetworkTab] = useState('fed'); // 'fed' | 'pboc'

  const quarters = dataset.quarters || [];
  const globalMacro = dataset.global_macro || [];
  const swapNetwork = dataset.central_bank_swap_network || {};

  const currentMacro = useMemo(() => {
    return globalMacro.find(m => m.quarter === selectedQuarter) || {};
  }, [globalMacro, selectedQuarter]);

  const currentBasis = currentMacro.cross_currency_basis || {
    eur_usd_3m_bps: -28,
    jpy_usd_3m_bps: -42,
    cny_usd_3m_bps: -18
  };

  // ECharts 1: Cross-Currency Basis Spreads Timeline (2018 - 2024)
  useEffect(() => {
    if (!basisChartRef.current) return;
    if (!basisChartInst.current) {
      basisChartInst.current = echarts.init(basisChartRef.current, 'dark');
    }

    const eurData = globalMacro.map(m => m.cross_currency_basis?.eur_usd_3m_bps || -20);
    const jpyData = globalMacro.map(m => m.cross_currency_basis?.jpy_usd_3m_bps || -30);
    const cnyData = globalMacro.map(m => m.cross_currency_basis?.cny_usd_3m_bps || -15);

    const option = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        formatter: (params) => {
          let s = `<div style="font-family:monospace; font-size:12px;"><b>${params[0].name} 3M 交叉货币基差 (Bps)</b><br/>`;
          params.forEach(p => {
            s += `<span style="color:${p.color}">●</span> ${p.seriesName}: <b>${p.value} bps</b><br/>`;
          });
          s += `<span style="color:#64748b; font-size:10px;">(基差越负表明离岸美元流动性越紧缩)</span></div>`;
          return s;
        }
      },
      legend: {
        data: ['EUR/USD 3M Basis', 'JPY/USD 3M Basis', 'CNY/USD 3M Basis'],
        top: 6,
        textStyle: { color: '#94a3b8', fontSize: 11 }
      },
      grid: { left: '3%', right: '4%', bottom: '8%', top: '16%', containLabel: true },
      xAxis: {
        type: 'category',
        data: quarters,
        axisLabel: { color: '#94a3b8', fontSize: 10, interval: 3 },
        axisLine: { lineStyle: { color: '#334155' } }
      },
      yAxis: {
        type: 'value',
        name: '基差基点 (bps, 负值表示美元溢价)',
        nameTextStyle: { color: '#64748b', fontSize: 10 },
        axisLabel: { color: '#94a3b8', formatter: '{value} bps' },
        splitLine: { lineStyle: { color: '#1e293b' } }
      },
      series: [
        {
          name: 'EUR/USD 3M Basis',
          type: 'line',
          smooth: true,
          data: eurData,
          itemStyle: { color: '#3b82f6' },
          lineStyle: { width: 2.5 },
          markArea: {
            itemStyle: { color: 'rgba(239, 68, 68, 0.1)' },
            data: [
              [
                { name: '2020Q1 现金抢购潮', xAxis: '2020Q1' },
                { xAxis: '2020Q2' }
              ],
              [
                { name: '2023Q1 硅谷/瑞信风暴', xAxis: '2023Q1' },
                { xAxis: '2023Q2' }
              ]
            ]
          }
        },
        {
          name: 'JPY/USD 3M Basis',
          type: 'line',
          smooth: true,
          data: jpyData,
          itemStyle: { color: '#f59e0b' },
          lineStyle: { width: 2.5 }
        },
        {
          name: 'CNY/USD 3M Basis',
          type: 'line',
          smooth: true,
          data: cnyData,
          itemStyle: { color: '#10b981' },
          lineStyle: { width: 2 }
        }
      ]
    };

    basisChartInst.current.setOption(option, true);
    const handleResize = () => basisChartInst.current?.resize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [quarters, globalMacro]);

  // ECharts 2: Fed Swap Draws vs PBOC Bilateral Lines
  useEffect(() => {
    if (!swapDrawChartRef.current) return;
    if (!swapDrawChartInst.current) {
      swapDrawChartInst.current = echarts.init(swapDrawChartRef.current, 'dark');
    }

    const fedDraws = globalMacro.map(m => m.fed_swap_draws_usd_bn || 0);
    const pbocLines = globalMacro.map(m => m.pboc_swap_active_lines_bn || 0);

    const option = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' },
        formatter: (params) => {
          let s = `<div style="font-family:monospace; font-size:12px;"><b>${params[0].name} 央行互换额度</b><br/>`;
          params.forEach(p => {
            s += `<span style="color:${p.color}">●</span> ${p.seriesName}: <b>$${p.value >= 1000 ? `${(p.value / 1000).toFixed(2)}T` : `${p.value}B`} (${(p.value * 10).toLocaleString()} 亿美元)</b><br/>`;
          });
          return s + '</div>';
        }
      },
      legend: {
        data: ['美联储流动性互换动用余额 (USD Draws)', '中国央行人民币双边互换协议规模 (PBOC Bilateral)'],
        top: 6,
        textStyle: { color: '#94a3b8', fontSize: 11 }
      },
      grid: { left: '3%', right: '4%', bottom: '8%', top: '16%', containLabel: true },
      xAxis: {
        type: 'category',
        data: quarters,
        axisLabel: { color: '#94a3b8', fontSize: 10, interval: 3 },
        axisLine: { lineStyle: { color: '#334155' } }
      },
      yAxis: [
        {
          type: 'value',
          name: '美联储动用余额 ($B)',
          nameTextStyle: { color: '#64748b', fontSize: 10 },
          axisLabel: { color: '#94a3b8', formatter: '${value}B' },
          splitLine: { lineStyle: { color: '#1e293b' } }
        },
        {
          type: 'value',
          name: '人民银行互换规模 ($B)',
          nameTextStyle: { color: '#64748b', fontSize: 10 },
          axisLabel: { color: '#94a3b8', formatter: '${value}B' },
          splitLine: { show: false }
        }
      ],
      series: [
        {
          name: '美联储流动性互换动用余额 (USD Draws)',
          type: 'bar',
          data: fedDraws,
          itemStyle: { color: '#ef4444' }
        },
        {
          name: '中国央行人民币双边互换协议规模 (PBOC Bilateral)',
          type: 'line',
          yAxisIndex: 1,
          smooth: true,
          data: pbocLines,
          itemStyle: { color: '#10b981' },
          lineStyle: { width: 3 }
        }
      ]
    };

    swapDrawChartInst.current.setOption(option, true);
    const handleResize = () => swapDrawChartInst.current?.resize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [quarters, globalMacro]);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="glass-panel rounded-2xl p-5 shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">
                  全球央行流动性互换线网络与交叉货币基差监控 (Central Bank Swap Lines &amp; FX Basis)
                </h2>
                <span className="text-[11px] font-mono bg-emerald-950/80 text-emerald-300 border border-emerald-600/40 px-2 py-0.5 rounded">
                  {selectedQuarter}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                追踪 BIS 官方重点关注的离岸美元基差溢价 (Cross-Currency Basis)、美联储常备互换 (C5) 及人民银行人民币本币互换网络
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* KPI 1: EUR/USD Basis */}
            <div className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 min-w-[125px]">
              <div className="text-[10px] text-slate-400 uppercase font-mono">EUR/USD 3M 基差</div>
              <div className={`text-base font-bold font-mono ${
                currentBasis.eur_usd_3m_bps < -50 ? 'text-rose-400' : 'text-blue-400'
              }`}>
                {currentBasis.eur_usd_3m_bps} bps
              </div>
            </div>

            {/* KPI 2: JPY/USD Basis */}
            <div className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 min-w-[125px]">
              <div className="text-[10px] text-slate-400 uppercase font-mono">JPY/USD 3M 基差</div>
              <div className={`text-base font-bold font-mono ${
                currentBasis.jpy_usd_3m_bps < -70 ? 'text-rose-400' : 'text-amber-400'
              }`}>
                {currentBasis.jpy_usd_3m_bps} bps
              </div>
            </div>

            {/* KPI 3: Fed Swap Draws */}
            <div className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 min-w-[130px]">
              <div className="text-[10px] text-slate-400 uppercase font-mono">美联储互换动用额</div>
              <div className="text-base font-bold text-rose-400 font-mono">
                ${currentMacro.fed_swap_draws_usd_bn || 0}B
              </div>
            </div>

            {/* KPI 4: PBOC Active Lines */}
            <div className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 min-w-[130px]">
              <div className="text-[10px] text-slate-400 uppercase font-mono">人行双边互换额</div>
              <div className="text-base font-bold text-emerald-400 font-mono">
                ${currentMacro.pboc_swap_active_lines_bn || 0}B
              </div>
            </div>
          </div>
        </div>

        {/* Conceptual Context Banner */}
        <div className="mt-4 p-3.5 bg-blue-950/30 border border-blue-900/40 rounded-lg flex items-start gap-3 text-xs text-slate-300">
          <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-semibold text-blue-300">BIS 宏观经济学视角：</span>
            当交叉货币基差 (Cross-Currency Basis) 显著为负时，说明由于外汇掉期市场 (FX Swaps) 资产负债表约束，非美银行需支付高额惩罚性溢价方能借入美元。美联储流动性互换网络 (Standing Swap Lines) 是全球离岸美元体系的最终贷款人 (Lender of Last Resort)，在 2020 年疫情危机与 2023 年硅谷/瑞信风暴中发挥了决定性兜底作用。
          </div>
        </div>
      </div>

      {/* Two Macro Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basis Spreads */}
        <div className="glass-panel rounded-2xl p-5 shadow-2xl flex flex-col">
          <div className="pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-amber-400" /> 3个月期交叉货币基差历史走势 (2018 - 2024)
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              基差跌至深负区间往往与全球美元短缺、套息交易解包及避险潮高度同步
            </p>
          </div>
          <div ref={basisChartRef} className="w-full h-[360px] mt-2" />
        </div>

        {/* Swap Line Drawings */}
        <div className="glass-panel rounded-2xl p-5 shadow-2xl flex flex-col">
          <div className="pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Repeat className="w-4 h-4 text-rose-400" /> 美联储紧急互换动用 vs 人民银行双边互换网络拓展
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              柱状: 美联储危机期美元拆借峰值 (2020Q1 突破 $4400 亿) · 曲线: 人民币双边互换常态化稳步增长
            </p>
          </div>
          <div ref={swapDrawChartRef} className="w-full h-[360px] mt-2" />
        </div>
      </div>

      {/* Central Bank Network Catalog & Accordion */}
      <div className="glass-panel rounded-2xl p-5 shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-400" /> 国际官方央行流动性安全网架构清单
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              对比美联储常备外汇互换与人民银行本币互换的双轨运行机制
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg p-1 text-xs">
            <button
              onClick={() => setActiveNetworkTab('fed')}
              className={`px-3 py-1.5 rounded transition-all font-medium ${
                activeNetworkTab === 'fed'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🇺🇸 美联储 C5 常备互换与 FIMA
            </button>
            <button
              onClick={() => setActiveNetworkTab('pboc')}
              className={`px-3 py-1.5 rounded transition-all font-medium ${
                activeNetworkTab === 'pboc'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🇨🇳 人民银行 (PBOC) 双边本币互换网
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeNetworkTab === 'fed' ? (
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {(swapNetwork.fed_standing_lines || []).map((line, idx) => (
                <div key={idx} className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-lg">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-white">{line.partner}</span>
                    <span className="text-[10px] font-mono bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded border border-blue-500/30">
                      {line.status}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-2 font-mono flex items-center justify-between">
                    <span>互换货币对:</span>
                    <span className="text-emerald-400 font-bold">{line.currency}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1 font-mono flex items-center justify-between">
                    <span>信贷额度:</span>
                    <span className="text-amber-400 font-bold">{line.limit}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* FIMA facility card */}
            <div className="p-4 bg-gradient-to-r from-blue-950/30 to-slate-900 border border-blue-800/40 rounded-lg">
              <div className="text-xs font-bold text-blue-300 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-400" />
                <span>{swapNetwork.fed_temporary_and_fima?.facility_name}</span>
              </div>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                面向全球约 60 家外国中央银行，允许其以持有的美国国债直接向美联储换取美元隔夜流动性，避免在离岸美元流动性枯竭时被迫抛售美债冲击现券市场。
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {(swapNetwork.pboc_bilateral_lines || []).map((line, idx) => (
                <div key={idx} className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-lg">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-white">{line.partner}</span>
                    <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30">
                      {line.status}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-2 font-mono flex items-center justify-between">
                    <span>本币协议规模:</span>
                    <span className="text-emerald-400 font-bold">¥{Math.round(line.amount_cny_bn * 10).toLocaleString()} 亿元 RMB</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1 font-mono flex items-center justify-between">
                    <span>折合美元当量:</span>
                    <span className="text-slate-200 font-bold">${line.amount_usd_bn}B ({Math.round(line.amount_usd_bn * 10).toLocaleString()} 亿美元)</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 bg-gradient-to-r from-emerald-950/30 to-slate-900 border border-emerald-800/40 rounded-lg">
              <div className="text-xs font-bold text-emerald-300 flex items-center gap-2">
                <Globe className="w-4 h-4 text-emerald-400" />
                <span>人民币国际化安全垫与南方国家流动性兜底</span>
              </div>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                人民银行已同全球 40 多个国家和地区央行签署总计超 4 万亿元人民币的双边本币互换协议。在阿根廷、俄罗斯等面临外部美元结算阻碍或汇率危机的场景中，本币互换有力支持了双边贸易清算并缓解了短期外汇流动性危机。
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
