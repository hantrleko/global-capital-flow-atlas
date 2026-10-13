import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { 
  X, Globe2, TrendingUp, DollarSign, Shield, Building2, 
  ArrowUpRight, ArrowDownLeft, Layers, Percent 
} from 'lucide-react';

export default function CountryDrawer({
  dataset,
  countryCode,
  selectedQuarter,
  onClose
}) {
  const trendChartRef = useRef(null);

  const countries = dataset.countries || [];
  const country = countries.find(c => c.code === countryCode);
  const quarters = dataset.quarters || [];
  const lbsData = dataset.lbs_data || {};
  const cbsRisk = dataset.cbs_risk || {};
  const currentQIdx = quarters.indexOf(selectedQuarter);

  const countryLbsList = lbsData[countryCode] || [];
  const currentLbs = countryLbsList[currentQIdx] || {};
  const countryCbsList = cbsRisk[countryCode] || [];
  const currentCbs = countryCbsList[currentQIdx] || {};

  // Find bilateral connections for this country in current quarter
  const currentLinks = (dataset.bilateral_matrix || {})[selectedQuarter] || [];
  const outboundLinks = currentLinks.filter(l => l.source === countryCode);
  const inboundLinks = currentLinks.filter(l => l.target === countryCode);

  // Mini Historical Trend Chart
  useEffect(() => {
    if (!trendChartRef.current || !country) return;
    const chart = echarts.init(trendChartRef.current, 'dark');

    const claimsData = countryLbsList.map(item => item.claims_usd_bn);
    const liabData = countryLbsList.map(item => item.liabilities_usd_bn);

    const option = {
      backgroundColor: '#0f172a',
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#1e293b',
        borderColor: '#334155',
        textStyle: { color: '#f8fafc', fontSize: 11 }
      },
      legend: {
        data: ['跨境债权 (Claims)', '跨境负债 (Liab)'],
        textStyle: { color: '#94a3b8', fontSize: 10 },
        top: 2
      },
      grid: {
        left: '2%',
        right: '4%',
        bottom: '8%',
        top: '24%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: quarters,
        axisLine: { lineStyle: { color: '#334155' } },
        axisLabel: { color: '#64748b', fontSize: 9, interval: 3 }
      },
      yAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: '#1e293b' } },
        axisLabel: { color: '#64748b', fontSize: 9 }
      },
      series: [
        {
          name: '跨境债权 (Claims)',
          type: 'line',
          smooth: true,
          data: claimsData,
          itemStyle: { color: '#3b82f6' },
          markLine: {
            data: [
              { xAxis: selectedQuarter, lineStyle: { color: '#ffffff', type: 'dashed' }, label: { show: false } }
            ]
          }
        },
        {
          name: '跨境负债 (Liab)',
          type: 'line',
          smooth: true,
          data: liabData,
          itemStyle: { color: '#f43f5e' }
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
  }, [country, countryLbsList, quarters, selectedQuarter]);

  if (!country) return null;

  const currency = currentLbs.currency_breakdown || {};
  const sector = currentLbs.sector_breakdown || {};
  const netSign = (currentLbs.net_position_usd_bn || 0) >= 0 ? '+' : '';

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-full max-w-md bg-slate-950 border-l border-slate-800 shadow-2xl overflow-y-auto flex flex-col justify-between p-5 backdrop-blur-xl">
      <div>
        {/* Header with Close */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 font-mono font-bold text-sm">
              {country.code}
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                {country.name_zh}
                <span className="text-xs font-normal text-slate-400">({country.name})</span>
              </h3>
              <span className="text-[11px] text-slate-400">{country.region} · {country.type}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Narrative Description */}
        <p className="text-xs text-slate-300 bg-slate-900/80 p-2.5 rounded-lg border border-slate-800/80 mb-4 leading-relaxed">
          {country.desc}
        </p>

        {/* Current Quarter Key Metrics */}
        <div className="grid grid-cols-2 gap-2.5 mb-4">
          <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">本季跨境总债权</div>
            <div className="text-sm font-bold text-blue-400 font-mono mt-0.5">
              ${currentLbs.claims_usd_bn || 0} 亿
            </div>
          </div>
          <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">本季跨境总负债</div>
            <div className="text-sm font-bold text-rose-400 font-mono mt-0.5">
              ${currentLbs.liabilities_usd_bn || 0} 亿
            </div>
          </div>
          <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">净外部银行头寸</div>
            <div className={`text-sm font-bold font-mono mt-0.5 ${(currentLbs.net_position_usd_bn || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {netSign}${currentLbs.net_position_usd_bn || 0} 亿
            </div>
          </div>
          <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">官方外汇储备</div>
            <div className="text-sm font-bold text-amber-400 font-mono mt-0.5">
              ${country.fx_reserves} 亿
            </div>
          </div>
        </div>

        {/* 2018-2024 Historical Quarterly Time Series */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 mb-4">
          <div className="text-xs font-bold text-white mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-blue-400" /> 跨境债权/负债历史轨迹 (2018-2024)
            </span>
            <span className="text-[10px] text-slate-400 font-mono">{selectedQuarter}</span>
          </div>
          <div ref={trendChartRef} className="w-full h-[160px]" />
        </div>

        {/* Currency Composition Bar */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 mb-4">
          <div className="text-xs font-bold text-white mb-2 flex items-center gap-1.5">
            <Percent className="w-3.5 h-3.5 text-emerald-400" /> 币种敞口配置 (LBS Currency Shares)
          </div>
          <div className="h-3 w-full rounded-full overflow-hidden flex bg-slate-800">
            <div style={{ width: `${currency.USD || 0}%` }} className="bg-sky-400" title={`USD: ${currency.USD}%`} />
            <div style={{ width: `${currency.EUR || 0}%` }} className="bg-indigo-500" title={`EUR: ${currency.EUR}%`} />
            <div style={{ width: `${currency.JPY || 0}%` }} className="bg-pink-500" title={`JPY: ${currency.JPY}%`} />
            <div style={{ width: `${currency.GBP || 0}%` }} className="bg-amber-400" title={`GBP: ${currency.GBP}%`} />
            <div style={{ width: `${currency.OTH || 0}%` }} className="bg-emerald-500" title={`OTH: ${currency.OTH}%`} />
          </div>
          <div className="grid grid-cols-5 gap-1 text-[10px] font-mono text-center mt-2 text-slate-300">
            <div>USD: <b className="text-sky-400">{currency.USD}%</b></div>
            <div>EUR: <b className="text-indigo-400">{currency.EUR}%</b></div>
            <div>JPY: <b className="text-pink-400">{currency.JPY}%</b></div>
            <div>GBP: <b className="text-amber-400">{currency.GBP}%</b></div>
            <div>OTH: <b className="text-emerald-400">{currency.OTH}%</b></div>
          </div>
        </div>

        {/* Top Bilateral Corridors */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 mb-4">
          <div className="text-xs font-bold text-white mb-2 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-amber-400" /> 主要双边信贷关联 ({selectedQuarter})
          </div>

          <div className="space-y-2 text-xs">
            {outboundLinks.length > 0 && (
              <div>
                <div className="text-[11px] text-slate-400 flex items-center gap-1 mb-1 font-semibold">
                  <ArrowUpRight className="w-3 h-3 text-emerald-400" /> 主要对外出资目标地:
                </div>
                <div className="space-y-1">
                  {outboundLinks.map(l => (
                    <div key={l.target} className="flex justify-between bg-slate-950/60 p-1.5 rounded text-[11px]">
                      <span className="text-slate-300">→ {l.target} ({dataset.countries.find(c => c.code === l.target)?.name_zh})</span>
                      <span className="font-mono text-emerald-400 font-bold">${l.claims_usd_bn} 亿</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {inboundLinks.length > 0 && (
              <div className="pt-2 border-t border-slate-800">
                <div className="text-[11px] text-slate-400 flex items-center gap-1 mb-1 font-semibold">
                  <ArrowDownLeft className="w-3 h-3 text-rose-400" /> 主要债权行所在地 (受资来源):
                </div>
                <div className="space-y-1">
                  {inboundLinks.map(l => (
                    <div key={l.source} className="flex justify-between bg-slate-950/60 p-1.5 rounded text-[11px]">
                      <span className="text-slate-300">← {l.source} ({dataset.countries.find(c => c.code === l.source)?.name_zh})</span>
                      <span className="font-mono text-rose-400 font-bold">${l.claims_usd_bn} 亿</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* CBS Risk Evaluation */}
        {currentCbs.vulnerability_score && (
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
            <div className="text-xs font-bold text-white mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-rose-400" /> CBS 综合风险评估
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                currentCbs.rating === 'HIGH' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' :
                currentCbs.rating === 'ELEVATED' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                'bg-emerald-500/20 text-emerald-300'
              }`}>
                {currentCbs.rating} 风险
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">外债/外汇储备比:</span>
                <span className="font-mono font-bold text-white">{currentCbs.debt_to_reserves_ratio}x</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">脆弱性得分:</span>
                <span className="font-mono font-bold text-amber-400">{currentCbs.vulnerability_score}/100</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="pt-4 border-t border-slate-800 text-center">
        <button
          onClick={onClose}
          className="w-full py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg text-xs font-semibold text-slate-300 transition-colors"
        >
          关闭档案面板
        </button>
      </div>
    </div>
  );
}
