import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as echarts from 'echarts';
import { Scale, Plus, Trash2, Shield, DollarSign, Layers, Check, Info } from 'lucide-react';

export default function MultiCountryCompare({
  dataset,
  selectedQuarter,
  onSelectCountry
}) {
  const countries = dataset.countries || [];
  const quarters = dataset.quarters || [];
  const currentQIdx = quarters.indexOf(selectedQuarter);
  const lbsData = dataset.lbs_data || {};
  const cbsRisk = dataset.cbs_risk || {};

  // Selected countries for side-by-side comparison (2 to 4 countries)
  const [selectedCodes, setSelectedCodes] = useState(['CN', 'US', 'JP', 'TR']);
  const radarChartRef = useRef(null);
  const radarChartInstance = useRef(null);

  const toggleCountry = (code) => {
    if (selectedCodes.includes(code)) {
      if (selectedCodes.length > 2) {
        setSelectedCodes(selectedCodes.filter(c => c !== code));
      }
    } else {
      if (selectedCodes.length < 5) {
        setSelectedCodes([...selectedCodes, code]);
      }
    }
  };

  // Compare metrics data for selected countries in current quarter
  const comparedData = useMemo(() => {
    return selectedCodes.map(code => {
      const c = countries.find(item => item.code === code) || {};
      const qLbs = (lbsData[code] || [])[currentQIdx] || {};
      const qCbs = (cbsRisk[code] || [])[currentQIdx] || {};

      const claims = qLbs.claims_usd_bn || c.base_claims || 0;
      const liab = qLbs.liabilities_usd_bn || c.base_liab || 0;
      const net = qLbs.net_position_usd_bn || (claims - liab);
      const usdShare = qLbs.currency_breakdown?.USD || c.default_usd_share || 50;
      const debtToReserves = qCbs.debt_to_reserves_ratio || 1.0;
      const vulnerability = qCbs.vulnerability_score || 30;
      const bankShare = qLbs.sector_breakdown?.banks || 45;
      const nbShare = (qLbs.sector_breakdown?.non_bank_fin || 20) + (qLbs.sector_breakdown?.non_bank_corp || 25);

      return {
        code,
        name: c.name,
        name_zh: c.name_zh,
        region: c.region,
        tier: c.tier,
        type: c.type,
        claims,
        liab,
        net,
        reserves: qCbs.fx_reserves_bn || c.fx_reserves,
        usdShare,
        debtToReserves,
        vulnerability,
        bankShare,
        nbShare,
        rating: qCbs.rating || 'MODERATE'
      };
    });
  }, [selectedCodes, currentQIdx, countries, lbsData, cbsRisk]);

  // Init and update Radar Chart
  useEffect(() => {
    if (!radarChartRef.current) return;
    if (!radarChartInstance.current) {
      radarChartInstance.current = echarts.init(radarChartRef.current, 'dark');
      const handleResize = () => radarChartInstance.current?.resize();
      window.addEventListener('resize', handleResize);
      return () => {
        window.removeEventListener('resize', handleResize);
        radarChartInstance.current?.dispose();
        radarChartInstance.current = null;
      };
    }
  }, []);

  useEffect(() => {
    if (!radarChartInstance.current) return;

    const colors = ['#38bdf8', '#f59e0b', '#10b981', '#f43f5e', '#a855f7'];

    const indicators = [
      { name: '美元依赖度 (USD %)', max: 100 },
      { name: '外债/储备倍数 (Debt/FX)', max: 5 },
      { name: '综合脆弱性 (Vulnerability)', max: 100 },
      { name: '非银私营敞口 (NBFI %)', max: 80 },
      { name: '跨境总债权规模 (Claims $Bn)', max: 5000 }
    ];

    const seriesData = comparedData.map((d, idx) => ({
      value: [
        d.usdShare,
        Math.min(5, d.debtToReserves),
        d.vulnerability,
        d.nbShare,
        d.claims
      ],
      name: d.name_zh,
      itemStyle: { color: colors[idx % colors.length] },
      lineStyle: { width: 2.5 }
    }));

    const option = {
      backgroundColor: '#080c14',
      tooltip: {
        trigger: 'item',
        backgroundColor: '#0f172a',
        borderColor: '#334155',
        textStyle: { color: '#f8fafc', fontSize: 12 }
      },
      legend: {
        data: comparedData.map(d => d.name_zh),
        bottom: 8,
        textStyle: { color: '#cbd5e1', fontSize: 11 }
      },
      radar: {
        indicator: indicators,
        shape: 'polygon',
        splitNumber: 4,
        axisName: { color: '#94a3b8', fontSize: 11 },
        splitLine: { lineStyle: { color: '#1e293b' } },
        splitArea: {
          show: true,
          areaStyle: {
            color: ['rgba(15, 23, 42, 0.4)', 'rgba(30, 41, 59, 0.4)']
          }
        },
        axisLine: { lineStyle: { color: '#334155' } }
      },
      series: [
        {
          name: 'Country Macro Risk Profile',
          type: 'radar',
          data: seriesData,
          areaStyle: { opacity: 0.18 }
        }
      ]
    };

    radarChartInstance.current.setOption(option, true);
  }, [comparedData]);

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 shadow-2xl space-y-5">
      {/* Top Header & Country Selector Chips */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-3 gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              多国宏观风险与金融敞口横向对比 (Multi-Jurisdiction Benchmark)
              <span className="text-[11px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                {selectedQuarter}
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              横向对齐多国对外偿债能力、美元敏感度、非银影子银行敞口及官方外汇储备垫
            </p>
          </div>
        </div>

        {/* Selected Country Chips */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs text-slate-400 mr-1">对比国家 (2-5国):</span>
          {countries.map(c => {
            const isSel = selectedCodes.includes(c.code);
            return (
              <button
                key={c.code}
                onClick={() => toggleCountry(c.code)}
                className={`px-2 py-1 rounded text-xs transition-all flex items-center gap-1 ${
                  isSel
                    ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                <span>{c.name_zh}</span>
                {isSel && <Check className="w-3 h-3 text-white" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Grid: Radar Chart + Comparison Scorecards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Radar Chart (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900/40 border border-slate-800/90 rounded-xl p-3 flex flex-col justify-between">
          <div className="text-xs font-bold text-slate-200 flex items-center justify-between border-b border-slate-800 pb-2">
            <span>五维宏观风险特征雷达</span>
            <span className="text-[10px] text-slate-500 font-mono">Normalized Indicators</span>
          </div>
          <div ref={radarChartRef} className="w-full h-[360px]" />
          <div className="text-[11px] text-slate-400 bg-slate-950/80 p-2 rounded border border-slate-800/60 leading-normal">
            💡 维度覆盖：美元敞口占比、外债/外汇储备覆盖倍数、综合脆弱性、非银私人部门杠杆、总跨境债权规模。
          </div>
        </div>

        {/* Comparison Cards & Scorecards (7 cols) */}
        <div className="lg:col-span-7 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {comparedData.map(d => (
              <div 
                key={d.code}
                className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 space-y-2.5 hover:border-slate-700 transition-all"
              >
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-slate-800 text-indigo-300 border border-slate-700">
                      {d.code}
                    </span>
                    <span className="font-bold text-white text-sm">{d.name_zh}</span>
                    <span className="text-[10px] text-slate-400">{d.region}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    d.rating === 'HIGH' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' :
                    d.rating === 'ELEVATED' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                    'bg-emerald-500/20 text-emerald-300'
                  }`}>
                    {d.rating}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400 text-[11px]">跨境总债权:</span>
                    <div className="font-mono font-bold text-blue-400 mt-0.5">
                      {d.claims >= 1000 ? `$${(d.claims / 1000).toFixed(2)}T` : `$${d.claims}B`}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px]">跨境总负债:</span>
                    <div className="font-mono font-bold text-rose-400 mt-0.5">
                      {d.liab >= 1000 ? `$${(d.liab / 1000).toFixed(2)}T` : `$${d.liab}B`}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px]">官方外汇储备:</span>
                    <div className="font-mono font-bold text-amber-400 mt-0.5">
                      {d.reserves >= 1000 ? `$${(d.reserves / 1000).toFixed(2)}T` : `$${d.reserves}B`}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px]">外债/外汇储备:</span>
                    <div className={`font-mono font-bold mt-0.5 ${d.debtToReserves > 2 ? 'text-rose-400' : 'text-slate-200'}`}>
                      {d.debtToReserves}x
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">美元计价比重: <b className="text-emerald-400 font-mono">{d.usdShare}%</b></span>
                  <span className="text-slate-400">脆弱性得分: <b className="text-amber-400 font-mono">{d.vulnerability}/100</b></span>
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 text-xs text-slate-300 leading-relaxed">
            <strong className="text-indigo-400">跨国宏观对照结论：</strong>
            外汇储备雄厚且具备净债权特征的国家（如日本、中国、德国）在美元流动性收缩周期具备强大的系统性免疫力；
            而外债/储备倍数偏高且以短期美元借款为主的脆弱新兴市场（如土耳其、巴西、南非），面临显著的展期利差惩罚。
          </div>
        </div>
      </div>
    </div>
  );
}
