import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { DollarSign, PieChart, TrendingDown, Layers, HelpCircle, AlertCircle, Download } from 'lucide-react';

export default function UsdFundingMonitor({
  dataset,
  selectedQuarter,
  onSelectCountry
}) {
  const lineChartRef = useRef(null);
  const barChartRef = useRef(null);
  const sectorChartRef = useRef(null);

  const quarters = dataset.quarters || [];
  const globalMacro = dataset.global_macro || [];
  const countries = dataset.countries || [];
  const lbsData = dataset.lbs_data || {};
  const currentQIdx = quarters.indexOf(selectedQuarter);

  // 1. Time-Series Chart: Global Dollar Credit & Stress
  useEffect(() => {
    if (!lineChartRef.current) return;
    const chart = echarts.init(lineChartRef.current, 'dark');

    const option = {
      backgroundColor: '#080c14',
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#0f172a',
        borderColor: '#334155',
        textStyle: { color: '#f8fafc', fontSize: 12 }
      },
      legend: {
        data: ['跨境美元信贷总量 ($Bn)', '非美元币种信贷 ($Bn)', 'BIS 美元融资压力指数'],
        textStyle: { color: '#94a3b8', fontSize: 11 },
        top: 8
      },
      grid: {
        left: '4%',
        right: '4%',
        bottom: '8%',
        top: '18%',
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
          name: '信贷规模 ($ 10亿)',
          nameTextStyle: { color: '#94a3b8' },
          splitLine: { lineStyle: { color: '#1e293b' } },
          axisLabel: { color: '#94a3b8', fontSize: 10 }
        },
        {
          type: 'value',
          name: '压力指数 (0-100)',
          nameTextStyle: { color: '#f59e0b' },
          min: 0,
          max: 100,
          splitLine: { show: false },
          axisLabel: { color: '#f59e0b', fontSize: 10 }
        }
      ],
      series: [
        {
          name: '跨境美元信贷总量 ($Bn)',
          type: 'line',
          smooth: true,
          data: globalMacro.map(m => m.total_usd_cross_border_bn),
          itemStyle: { color: '#38bdf8' },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(56, 189, 248, 0.4)' },
              { offset: 1, color: 'rgba(56, 189, 248, 0.02)' }
            ])
          },
          markLine: {
            data: [
              { xAxis: selectedQuarter, lineStyle: { color: '#ffffff', type: 'dashed', width: 2 }, label: { formatter: `当前选择: ${selectedQuarter}`, color: '#fff' } }
            ]
          }
        },
        {
          name: '非美元币种信贷 ($Bn)',
          type: 'line',
          smooth: true,
          data: globalMacro.map(m => m.total_cross_border_claims_usd_bn - m.total_usd_cross_border_bn),
          itemStyle: { color: '#818cf8' }
        },
        {
          name: 'BIS 美元融资压力指数',
          type: 'line',
          yAxisIndex: 1,
          smooth: true,
          data: globalMacro.map(m => m.bis_usd_funding_stress_index),
          itemStyle: { color: '#f59e0b' },
          lineStyle: { width: 2.5 }
        }
      ]
    };

    chart.setOption(option);
    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      chart.dispose();
    };
  }, [selectedQuarter, globalMacro, quarters]);

  // 2. Bar Chart: Currency breakdown across major hubs
  useEffect(() => {
    if (!barChartRef.current) return;
    const chart = echarts.init(barChartRef.current, 'dark');

    // Selected key hubs to display
    const sampleCodes = ['US', 'GB', 'JP', 'KY', 'SG', 'HK', 'DE', 'CH', 'CN', 'KR', 'BR'];
    const hubData = sampleCodes.map(code => {
      const c = countries.find(item => item.code === code);
      const qData = (lbsData[code] || [])[currentQIdx] || {};
      const cb = qData.currency_breakdown || {};
      return {
        name: c?.name_zh || code,
        code,
        USD: cb.USD || 0,
        EUR: cb.EUR || 0,
        JPY: cb.JPY || 0,
        GBP: cb.GBP || 0,
        OTH: cb.OTH || 0
      };
    });

    const option = {
      backgroundColor: '#080c14',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: '#0f172a',
        borderColor: '#334155',
        textStyle: { color: '#f8fafc', fontSize: 12 },
        formatter: (params) => {
          let str = `<div class="font-bold text-white mb-1">${params[0].name} (${params[0].axisValue}) 币种配比:</div>`;
          params.forEach(p => {
            str += `<div class="flex justify-between gap-4 text-xs">
              <span style="color:${p.color}">${p.seriesName}:</span>
              <span class="font-mono font-bold">${p.value}%</span>
            </div>`;
          });
          return str;
        }
      },
      legend: {
        data: ['USD (美元)', 'EUR (欧元)', 'JPY (日元)', 'GBP (英镑)', 'OTH (其他/本币)'],
        textStyle: { color: '#94a3b8', fontSize: 11 },
        top: 6
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '8%',
        top: '18%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: hubData.map(h => h.name),
        axisLine: { lineStyle: { color: '#334155' } },
        axisLabel: { color: '#cbd5e1', fontSize: 11 }
      },
      yAxis: {
        type: 'value',
        max: 100,
        name: '占比 (%)',
        splitLine: { lineStyle: { color: '#1e293b' } },
        axisLabel: { color: '#94a3b8', fontSize: 10 }
      },
      series: [
        { name: 'USD (美元)', type: 'bar', stack: 'total', data: hubData.map(h => h.USD), itemStyle: { color: '#38bdf8' } },
        { name: 'EUR (欧元)', type: 'bar', stack: 'total', data: hubData.map(h => h.EUR), itemStyle: { color: '#6366f1' } },
        { name: 'JPY (日元)', type: 'bar', stack: 'total', data: hubData.map(h => h.JPY), itemStyle: { color: '#ec4899' } },
        { name: 'GBP (英镑)', type: 'bar', stack: 'total', data: hubData.map(h => h.GBP), itemStyle: { color: '#f59e0b' } },
        { name: 'OTH (其他/本币)', type: 'bar', stack: 'total', data: hubData.map(h => h.OTH), itemStyle: { color: '#10b981' } }
      ]
    };

    chart.setOption(option);
    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      chart.dispose();
    };
  }, [selectedQuarter, currentQIdx, lbsData, countries]);

  // 3. Sector breakdown chart
  useEffect(() => {
    if (!sectorChartRef.current) return;
    const chart = echarts.init(sectorChartRef.current, 'dark');

    // Aggregate sector breakdown in the current quarter
    let totBank = 0, totNbFin = 0, totNbCorp = 0, totGovt = 0;
    countries.forEach(c => {
      const qData = (lbsData[c.code] || [])[currentQIdx] || {};
      const claims = qData.claims_usd_bn || c.base_claims;
      const s = qData.sector_breakdown || {};
      totBank += claims * ((s.banks || 45) / 100);
      totNbFin += claims * ((s.non_bank_fin || 20) / 100);
      totNbCorp += claims * ((s.non_bank_corp || 25) / 100);
      totGovt += claims * ((s.official_govt || 10) / 100);
    });

    const option = {
      backgroundColor: '#080c14',
      tooltip: {
        trigger: 'item',
        backgroundColor: '#0f172a',
        borderColor: '#334155',
        textStyle: { color: '#f8fafc', fontSize: 12 },
        formatter: (params) => `${params.name}: <b>$${params.value >= 1000 ? `${(params.value / 1000).toFixed(2)}T` : `${params.value}B`}</b> (${params.percent}%)`
      },
      legend: {
        orient: 'vertical',
        right: '4%',
        top: 'center',
        textStyle: { color: '#94a3b8', fontSize: 11 }
      },
      series: [
        {
          name: 'Sector Breakdown',
          type: 'pie',
          radius: ['45%', '72%'],
          center: ['38%', '50%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 6,
            borderColor: '#080c14',
            borderWidth: 2
          },
          label: {
            show: false,
            position: 'center'
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 14,
              fontWeight: 'bold',
              color: '#ffffff',
              formatter: (params) => `${params.name}\n$${params.value >= 1000 ? `${(params.value / 1000).toFixed(2)}T` : `${params.value}B`}`
            }
          },
          data: [
            { value: Math.round(totBank), name: '跨国银行间借贷 (Interbank)', itemStyle: { color: '#3b82f6' } },
            { value: Math.round(totNbFin), name: '非银金融机构 (NBFIs 影子银行)', itemStyle: { color: '#f59e0b' } },
            { value: Math.round(totNbCorp), name: '非金融私人企业 (Corporates)', itemStyle: { color: '#10b981' } },
            { value: Math.round(totGovt), name: '官方及主权机构 (Official/Govt)', itemStyle: { color: '#a855f7' } }
          ]
        }
      ]
    };

    chart.setOption(option);
    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      chart.dispose();
    };
  }, [selectedQuarter, currentQIdx, lbsData, countries]);

  return (
    <div className="space-y-4">
      {/* Top Chart: Global Dollar Credit Timeline */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 shadow-xl">
        <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-3 mb-2 gap-2">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              全球美元信贷演进与流动性压力周期 (Global Dollar Credit & Stress Horizon)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              基于 BIS 季度官方统计 (Quarterly Frequency) · 跟踪 2018-2024 年美元跨境信贷与加息周期收缩规律
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-xs text-slate-400 font-mono bg-slate-900 px-2.5 py-1 rounded border border-slate-800">
              时序覆盖: 2018Q1 - 2024Q4 (28 季度完整官方序列)
            </div>
            <button
              onClick={() => {
                const chart = echarts.getInstanceByDom(lineChartRef.current);
                if (!chart) return;
                const url = chart.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: '#080c14' });
                const a = document.createElement('a');
                a.href = url;
                a.download = `bis_usd_credit_cycle_${selectedQuarter}.png`;
                a.click();
              }}
              className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded text-slate-300 hover:text-white transition-colors"
              title="导出高清时序图 PNG"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <div ref={lineChartRef} className="w-full h-[320px]" />
      </div>

      {/* Bottom Row: Hub Breakdown & Sector Splits */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Hub Bar Chart (7 cols) */}
        <div className="lg:col-span-7 bg-slate-950 border border-slate-800 rounded-xl p-4 shadow-xl">
          <div className="border-b border-slate-800 pb-2 mb-2">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-sky-400" />
              主要经济体及离岸中心币种敞口结构 ({selectedQuarter})
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              开曼群岛、英国、新加坡等离岸转口中心对美元呈现极高度依赖
            </p>
          </div>
          <div ref={barChartRef} className="w-full h-[300px]" />
        </div>

        {/* Sector Pie Chart (5 cols) */}
        <div className="lg:col-span-5 bg-slate-950 border border-slate-800 rounded-xl p-4 shadow-xl">
          <div className="border-b border-slate-800 pb-2 mb-2">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <PieChart className="w-4 h-4 text-amber-400" />
              全球跨境借款借受方部门构成 ({selectedQuarter})
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              非银金融机构 (NBFIs) 份额在后疫情时代突破 30%，成为系统性脆弱点
            </p>
          </div>
          <div ref={sectorChartRef} className="w-full h-[300px]" />
        </div>
      </div>
    </div>
  );
}
