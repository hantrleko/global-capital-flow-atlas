import React, { useState, useMemo, useRef, useEffect } from 'react';
import * as echarts from 'echarts';
import { 
  Split, ShieldCheck, Globe, TrendingUp, AlertTriangle, 
  Layers, ArrowRight, ShieldAlert, Sparkles, Filter, Sliders,
  HelpCircle, Compass
} from 'lucide-react';

export default function FinancialFragmentation({
  dataset,
  selectedQuarter,
  onSelectCountry
}) {
  const [activeSubTab, setActiveSubTab] = useState('evolution'); // 'evolution' | 'blocs' | 'sanctions_sim'
  const [sanctionsSeverity, setSanctionsSeverity] = useState(40); // 0% to 100%
  const [currencyDecouplingShare, setCurrencyDecouplingShare] = useState(25); // 0% to 60%

  const trendChartRef = useRef(null);
  const trendChartInstance = useRef(null);

  const countries = dataset.countries || [];
  const bilateralMatrix = dataset.bilateral_matrix || {};
  const fragSeries = dataset.fragmentation_series || [];
  const currentMacro = (dataset.global_macro || []).find(m => m.quarter === selectedQuarter) || {};
  const currentFrag = fragSeries.find(f => f.quarter === selectedQuarter) || fragSeries[fragSeries.length - 1] || {};

  // Group countries by geopolitical bloc
  const blocSummary = useMemo(() => {
    const blocs = {
      G7_Allies: {
        name: 'G7 核心盟国体系',
        desc: '以美欧日为主导的传统储备货币与金融霸权中枢',
        color: '#3b82f6',
        countries: []
      },
      BRICS_Plus: {
        name: '金砖国家与伙伴联盟 (BRICS+)',
        desc: '新兴经济体代表，推行本币结算与双边多边替代融资',
        color: '#ef4444',
        countries: []
      },
      Offshore_Conduit: {
        name: '离岸中继管道与中立枢纽',
        desc: '开曼群岛、瑞士、新加坡、中国香港、卢森堡等跨阵营资本中继站',
        color: '#10b981',
        countries: []
      },
      Regional_Emerging: {
        name: '区域关键新兴市场',
        desc: '韩国、墨西哥、土耳其等产业链近岸外包 (Nearshoring) 承接地',
        color: '#f59e0b',
        countries: []
      }
    };

    countries.forEach(c => {
      const bKey = c.bloc || 'Regional_Emerging';
      if (blocs[bKey]) {
        blocs[bKey].countries.push(c);
      }
    });

    return blocs;
  }, [countries]);

  // Current quarter bilateral links
  const currentLinks = bilateralMatrix[selectedQuarter] || [];

  // Evolution chart (2018Q1 - 2024Q4)
  useEffect(() => {
    if (activeSubTab !== 'evolution' || !trendChartRef.current) return;

    if (!trendChartInstance.current) {
      trendChartInstance.current = echarts.init(trendChartRef.current);
    }

    const quarters = fragSeries.map(f => f.quarter);
    const fragIndexData = fragSeries.map(f => f.fragmentation_index);
    const friendShoringData = fragSeries.map(f => f.friend_shoring_share_pct);
    const g7ToBricsData = fragSeries.map(f => f.g7_to_brics_claims_bn);
    const conduitData = fragSeries.map(f => f.conduit_routed_claims_bn);

    const option = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        borderColor: '#334155',
        textStyle: { color: '#f8fafc', fontSize: 12 },
        axisPointer: { type: 'cross', lineStyle: { color: '#64748b' } }
      },
      legend: {
        data: ['地缘金融分裂指数 (0-100)', '友岸外包放贷占比 (%)', 'G7 -> BRICS 直接信贷 ($B)', '离岸管道中继放贷 ($B)'],
        textStyle: { color: '#94a3b8', fontSize: 11 },
        top: 0
      },
      grid: {
        left: '4%',
        right: '4%',
        top: '14%',
        bottom: '10%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: quarters,
        axisLine: { lineStyle: { color: '#334155' } },
        axisLabel: { color: '#94a3b8', fontSize: 10 }
      },
      yAxis: [
        {
          type: 'value',
          name: '指数 / 占比',
          position: 'left',
          axisLine: { lineStyle: { color: '#334155' } },
          splitLine: { lineStyle: { color: 'rgba(51, 65, 85, 0.3)', type: 'dashed' } },
          axisLabel: { color: '#94a3b8', formatter: '{value}' }
        },
        {
          type: 'value',
          name: '信贷规模 (USD 十亿美元)',
          position: 'right',
          axisLine: { lineStyle: { color: '#334155' } },
          splitLine: { show: false },
          axisLabel: { color: '#94a3b8', formatter: '${value}B' }
        }
      ],
      series: [
        {
          name: '地缘金融分裂指数 (0-100)',
          type: 'line',
          yAxisIndex: 0,
          data: fragIndexData,
          smooth: true,
          symbolSize: 6,
          lineStyle: { width: 3, color: '#f43f5e' },
          itemStyle: { color: '#f43f5e' },
          markPoint: {
            data: [
              { name: '俄乌冲突与金融制裁', coord: ['2022Q1', 68.5], value: '制裁升级' }
            ],
            itemStyle: { color: '#f43f5e' }
          }
        },
        {
          name: '友岸外包放贷占比 (%)',
          type: 'line',
          yAxisIndex: 0,
          data: friendShoringData,
          smooth: true,
          symbolSize: 5,
          lineStyle: { width: 2.5, color: '#38bdf8', type: 'dashed' },
          itemStyle: { color: '#38bdf8' }
        },
        {
          name: 'G7 -> BRICS 直接信贷 ($B)',
          type: 'bar',
          yAxisIndex: 1,
          data: g7ToBricsData,
          itemStyle: { color: 'rgba(239, 68, 68, 0.45)', borderRadius: [4, 4, 0, 0] }
        },
        {
          name: '离岸管道中继放贷 ($B)',
          type: 'line',
          yAxisIndex: 1,
          data: conduitData,
          smooth: true,
          lineStyle: { width: 2, color: '#10b981' },
          itemStyle: { color: '#10b981' }
        }
      ]
    };

    trendChartInstance.current.setOption(option, { notMerge: false, lazyUpdate: true });

    const handleResize = () => trendChartInstance.current?.resize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [activeSubTab, fragSeries]);

  // Simulation calculations
  const totalG7BricsDirect = currentFrag.g7_to_brics_claims_bn + currentFrag.brics_to_g7_claims_bn || 450;
  const strandedCapital = Math.round(totalG7BricsDirect * (sanctionsSeverity / 100) * 10) / 10;
  const reroutedViaOffshore = Math.round(strandedCapital * 0.58 * 10) / 10;
  const netLiquidityDislocation = Math.round((strandedCapital - reroutedViaOffshore) * 10) / 10;
  const alternativeSettlementVolume = Math.round(strandedCapital * (currencyDecouplingShare / 100) * 10) / 10;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 md:p-6 backdrop-blur-md shadow-xl relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-64 h-64 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-3xl">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400">
                <Split className="w-5 h-5" />
              </span>
              <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
                全球金融碎片化与地缘阵营追踪 (Financial Fragmentation)
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-mono border border-rose-400/40">
                  BIS 2024 Special Focus · {selectedQuarter}
                </span>
              </h2>
            </div>
            <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
              根据 BIS 年度经济报告与 IMF 资本流动前沿研究：追踪全球跨境信贷在
              <strong className="text-white"> G7核心盟国</strong>、
              <strong className="text-white"> 金砖国家体系 (BRICS+)</strong> 与
              <strong className="text-white"> 离岸中立管道 (Offshore Conduits)</strong> 之间的结构性分流，量化
              “友岸外包 (Friend-Shoring)” 对全球流动性割裂的深远影响。
            </p>
          </div>

          {/* Key KPIs */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 text-center min-w-[130px]">
              <div className="text-[10px] uppercase font-mono text-slate-400">
                地缘金融分裂指数
              </div>
              <div className="text-2xl font-bold font-mono text-rose-400 mt-0.5">
                {currentFrag.fragmentation_index || 0}
                <span className="text-xs font-normal text-slate-500 ml-1">/ 100</span>
              </div>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 text-center min-w-[130px]">
              <div className="text-[10px] uppercase font-mono text-slate-400">
                友岸外包放贷占比
              </div>
              <div className="text-2xl font-bold font-mono text-sky-400 mt-0.5">
                {currentFrag.friend_shoring_share_pct || 0}%
              </div>
            </div>
          </div>
        </div>

        {/* View Switcher */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {[
              { id: 'evolution', label: '📈 碎片化历史演化趋势 (2018-2024)', icon: TrendingUp },
              { id: 'blocs', label: '🌐 四大地缘金融阵营架构', icon: Globe },
              { id: 'sanctions_sim', label: '⚡ 制裁切断与脱钩压力测试', icon: Sliders }
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveSubTab(tab.id)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    activeSubTab === tab.id
                      ? 'bg-rose-600 text-white shadow-[0_0_12px_rgba(244,63,94,0.5)]'
                      : 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="text-[11px] font-mono text-slate-400">
            样本覆盖: 23个系统重要性主权与离岸中心
          </div>
        </div>
      </div>

      {/* Subtab 1: Evolution Chart */}
      {activeSubTab === 'evolution' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-rose-400" />
                全球资本流动的分道扬镳：友岸外包激增与跨阵营信贷萎缩
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                2022年后，受地缘政治摩擦、制裁风险与供应链脱钩影响，跨阵营直接信贷明显回撤，离岸枢纽中继作用加速凸显。
              </p>
            </div>
          </div>

          <div ref={trendChartRef} className="w-full h-[500px]" />
        </div>
      )}

      {/* Subtab 2: Blocs Breakdown */}
      {activeSubTab === 'blocs' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {Object.entries(blocSummary).map(([bKey, bData]) => (
            <div
              key={bKey}
              className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4"
              style={{ borderTop: `3px solid ${bData.color}` }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: bData.color }} />
                    {bData.name}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">{bData.desc}</p>
                </div>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                  {bData.countries.length} 个经济体
                </span>
              </div>

              {/* Country pills */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {bData.countries.map(c => (
                  <div
                    key={c.code}
                    onClick={() => onSelectCountry?.(c.code)}
                    className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 cursor-pointer transition-all group"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono font-bold text-sky-400">{c.code}</span>
                      <span className="text-[10px] text-slate-500 font-mono">${c.gdp_usd_bn}B</span>
                    </div>
                    <div className="font-medium text-white text-xs mt-1 truncate">
                      {c.name_zh}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                      美元占比: {c.default_usd_share}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Subtab 3: Sanctions & Decoupling Stress Tester */}
      {activeSubTab === 'sanctions_sim' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 md:p-6 shadow-xl space-y-6">
          <div className="border-b border-slate-800 pb-5">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Sliders className="w-5 h-5 text-rose-400" />
              极端地缘金融制裁与跨境借贷通道切断压力测试器
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              模拟当 G7 核心与 BRICS+ 之间的直接银行信贷通道遭遇全面制裁或次级制裁打击时，滞留资产规模、离岸管道吸收承载力以及替代货币结算需求。
            </p>
          </div>

          {/* Interactive Sliders */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-slate-300 font-medium">跨阵营直接信贷冻结/阻断强度:</span>
                <span className="font-mono font-bold text-rose-400 text-sm">{sanctionsSeverity}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={sanctionsSeverity}
                onChange={(e) => setSanctionsSeverity(parseInt(e.target.value))}
                className="w-full accent-rose-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                <span>0% (无阻断)</span>
                <span>50% (中度制裁)</span>
                <span>100% (全面金融脱钩)</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-slate-300 font-medium">替代货币结算通道承接比例 (本币/黄金/mBridge):</span>
                <span className="font-mono font-bold text-emerald-400 text-sm">{currencyDecouplingShare}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="60"
                step="5"
                value={currencyDecouplingShare}
                onChange={(e) => setCurrencyDecouplingShare(parseInt(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                <span>0% (零替代)</span>
                <span>30% (部分本币互换)</span>
                <span>60% (全链路非美元通道)</span>
              </div>
            </div>
          </div>

          {/* Stress Results Display */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-950/80 border border-rose-500/30 rounded-xl p-4">
              <div className="text-[10px] font-mono text-rose-300 uppercase">
                受制裁直接受阻资本规模
              </div>
              <div className="text-2xl font-bold font-mono text-rose-400 mt-1">
                ${strandedCapital}
                <span className="text-xs font-normal text-slate-400 ml-1">十亿美元</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                G7 与 BRICS+ 间即时受限的银行债权与商业授信总额。
              </p>
            </div>

            <div className="bg-slate-950/80 border border-emerald-500/30 rounded-xl p-4">
              <div className="text-[10px] font-mono text-emerald-300 uppercase">
                离岸中立管道重定向吸收量
              </div>
              <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
                ${reroutedViaOffshore}
                <span className="text-xs font-normal text-slate-400 ml-1">十亿美元</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                经由开曼、瑞士、新加坡、香港等中继节点转接的流动性（约占58%）。
              </p>
            </div>

            <div className="bg-slate-950/80 border border-amber-500/30 rounded-xl p-4">
              <div className="text-[10px] font-mono text-amber-300 uppercase">
                净流动性缺口与展期断裂
              </div>
              <div className="text-2xl font-bold font-mono text-amber-400 mt-1">
                ${netLiquidityDislocation}
                <span className="text-xs font-normal text-slate-400 ml-1">十亿美元</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                无法迅速转接的中断头寸，将直接诱发跨国再融资挤兑风险。
              </p>
            </div>

            <div className="bg-slate-950/80 border border-sky-500/30 rounded-xl p-4">
              <div className="text-[10px] font-mono text-sky-300 uppercase">
                非美元/多边结算承载量
              </div>
              <div className="text-2xl font-bold font-mono text-sky-400 mt-1">
                ${alternativeSettlementVolume}
                <span className="text-xs font-normal text-slate-400 ml-1">十亿美元</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                由央行双边本币互换与替代跨境清算系统吸收的贸易信贷。
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
