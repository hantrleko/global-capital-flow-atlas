import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as echarts from 'echarts';
import { 
  X, Globe2, TrendingUp, DollarSign, Shield, Building2, 
  ArrowUpRight, ArrowDownLeft, Layers, Percent, AlertTriangle,
  Zap, ArrowRight, ShieldAlert, CheckCircle2, Sliders, ExternalLink,
  ShieldCheck, RefreshCw
} from 'lucide-react';
import soundFx from '../utils/soundEffects';

export default function CountryDrawer({
  dataset,
  countryCode,
  selectedQuarter,
  onClose,
  onSelectTab,
  onSelectCountry,
  onSetContagionEpicenter
}) {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'basel_ews' | 'piercing'
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

  // EWS metrics
  const ews = currentCbs.early_warning_system || {
    credit_to_gdp_pct: 120.0,
    credit_to_gdp_gap: 0.0,
    ccyb_buffer_pct: 0.0,
    dsr_pct: 12.0,
    dsr_gap: 0.0,
    traffic_light: 'GREEN',
    signal_zh: '正常平稳'
  };

  // Greenspan-Guidotti Rule Metric: FX Reserves / Estimated Short-term External Debt
  // Healthy threshold >= 1.0 (100% coverage)
  const shortTermDebtEst = Math.round((currentLbs.liabilities_usd_bn || 100) * 0.42); // estimated ~42% short-term
  const guidottiRatio = country?.fx_reserves && shortTermDebtEst > 0 
    ? (country.fx_reserves / shortTermDebtEst).toFixed(2)
    : '1.20';
  const isGuidottiAdequate = parseFloat(guidottiRatio) >= 1.0;

  // Mini Historical Trend Chart
  useEffect(() => {
    if (activeTab !== 'overview' || !trendChartRef.current || !country) return;
    const chart = echarts.init(trendChartRef.current, 'dark');

    const claimsData = countryLbsList.map(item => item.claims_usd_bn);
    const liabData = countryLbsList.map(item => item.liabilities_usd_bn);

    const option = {
      backgroundColor: '#0a0f1d',
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
        axisLabel: { color: '#64748b', fontSize: 9, interval: 4 }
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
  }, [activeTab, country, countryLbsList, quarters, selectedQuarter]);

  if (!country) return null;

  const currency = currentLbs.currency_breakdown || {};
  const sector = currentLbs.sector_breakdown || {};
  const netSign = (currentLbs.net_position_usd_bn || 0) >= 0 ? '+' : '';

  // Offshore Piercing metrics
  const isOffshoreConduit = ['KY', 'LU', 'CH', 'HK', 'SG'].includes(countryCode);
  const conduitRetention = countryCode === 'KY' ? 12 : countryCode === 'LU' ? 25 : countryCode === 'CH' ? 65 : 55;
  const piercedReallocationShare = 100 - conduitRetention;

  // Actions
  const handleTriggerContagion = () => {
    soundFx.playShockwave();
    if (onSetContagionEpicenter) {
      onSetContagionEpicenter(countryCode);
    }
    if (onSelectTab) {
      onSelectTab('contagion');
    }
    onClose();
  };

  const handleTriggerRiskMatrix = () => {
    soundFx.playChime();
    if (onSelectTab) {
      onSelectTab('risk');
    }
    onClose();
  };

  const handleTriggerMultiCompare = () => {
    soundFx.playTick();
    if (onSelectTab) {
      onSelectTab('compare');
    }
    onClose();
  };

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-full max-w-lg bg-slate-950/95 border-l border-slate-800 shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-y-auto flex flex-col justify-between p-5 backdrop-blur-2xl animate-fade-in font-sans">
      <div>
        {/* Header with Close */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600/30 to-indigo-600/30 border border-blue-400/50 flex items-center justify-center text-blue-400 font-mono font-bold text-base shadow-[0_0_15px_rgba(59,130,246,0.3)]">
              {country.code}
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                {country.name_zh}
                <span className="text-xs font-normal text-slate-400 font-mono">({country.name})</span>
              </h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[11px] text-slate-400 font-medium">{country.region}</span>
                <span className="text-slate-600">·</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-sky-300 font-mono border border-slate-700">
                  {country.bloc || country.type}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={() => {
              soundFx.playTick();
              onClose();
            }}
            className="p-1.5 rounded-lg bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Multi-Tab Switcher */}
        <div className="flex border-b border-slate-800 bg-slate-900/60 p-1 rounded-xl gap-1 mb-4">
          <button
            onClick={() => {
              soundFx.playTick();
              setActiveTab('overview');
            }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'overview'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            资产负债与流向
          </button>
          <button
            onClick={() => {
              soundFx.playTick();
              setActiveTab('basel_ews');
            }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'basel_ews'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            巴塞尔预警与外储
          </button>
          <button
            onClick={() => {
              soundFx.playTick();
              setActiveTab('piercing');
            }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'piercing'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            最终风险穿透
          </button>
        </div>

        {/* TAB 1: OVERVIEW & ARTERIES */}
        {activeTab === 'overview' && (
          <div className="space-y-4 animate-fade-in">
            {/* Narrative Description */}
            <p className="text-xs text-slate-300 bg-slate-900/80 p-3 rounded-xl border border-slate-800/80 leading-relaxed">
              {country.desc}
            </p>

            {/* Current Quarter Key Metrics */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">本季跨境总债权</div>
                <div className="text-base font-bold text-blue-400 font-mono mt-0.5">
                  ${currentLbs.claims_usd_bn || 0}B
                </div>
              </div>
              <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">本季跨境总负债</div>
                <div className="text-base font-bold text-rose-400 font-mono mt-0.5">
                  ${currentLbs.liabilities_usd_bn || 0}B
                </div>
              </div>
              <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">净外部银行头寸</div>
                <div className={`text-base font-bold font-mono mt-0.5 ${(currentLbs.net_position_usd_bn || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {netSign}${currentLbs.net_position_usd_bn || 0}B
                </div>
              </div>
              <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">官方外汇储备</div>
                <div className="text-base font-bold text-amber-400 font-mono mt-0.5">
                  ${country.fx_reserves || 0}B
                </div>
              </div>
            </div>

            {/* 2018-2024 Historical Quarterly Time Series */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3">
              <div className="text-xs font-bold text-white mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-blue-400" /> 跨境债权/负债历史轨迹 (2018-2024)
                </span>
                <span className="text-[10px] text-slate-400 font-mono">{selectedQuarter}</span>
              </div>
              <div ref={trendChartRef} className="w-full h-[150px]" />
            </div>

            {/* Currency Composition Bar */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3">
              <div className="text-xs font-bold text-white mb-2 flex items-center gap-1.5">
                <Percent className="w-3.5 h-3.5 text-emerald-400" /> 币种敞口配置 (LBS Currency Shares)
              </div>
              <div className="h-2.5 w-full rounded-full overflow-hidden flex bg-slate-800">
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
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3">
              <div className="text-xs font-bold text-white mb-2 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-amber-400" /> 主要双边信贷动脉 ({selectedQuarter})
              </div>

              <div className="space-y-2 text-xs">
                {outboundLinks.length > 0 && (
                  <div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-1 mb-1 font-semibold">
                      <ArrowUpRight className="w-3 h-3 text-emerald-400" /> 主要对外出资目标地 (Top Assets):
                    </div>
                    <div className="space-y-1">
                      {outboundLinks.slice(0, 4).map(l => (
                        <div key={l.target} className="flex justify-between bg-slate-950/70 p-1.5 rounded-lg text-[11px]">
                          <span className="text-slate-300">→ {l.target} ({countries.find(c => c.code === l.target)?.name_zh})</span>
                          <span className="font-mono text-emerald-400 font-bold">${l.claims_usd_bn}B</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {inboundLinks.length > 0 && (
                  <div className="pt-2 border-t border-slate-800">
                    <div className="text-[11px] text-slate-400 flex items-center gap-1 mb-1 font-semibold">
                      <ArrowDownLeft className="w-3 h-3 text-rose-400" /> 主要债权行所在地 (Top Liabilities):
                    </div>
                    <div className="space-y-1">
                      {inboundLinks.slice(0, 4).map(l => (
                        <div key={l.source} className="flex justify-between bg-slate-950/70 p-1.5 rounded-lg text-[11px]">
                          <span className="text-slate-300">← {l.source} ({countries.find(c => c.code === l.source)?.name_zh})</span>
                          <span className="font-mono text-rose-400 font-bold">${l.claims_usd_bn}B</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: BASEL EWS & FX RESERVES ADEQUACY */}
        {activeTab === 'basel_ews' && (
          <div className="space-y-4 animate-fade-in">
            {/* Basel Traffic Light Card */}
            <div className={`p-4 rounded-xl border ${
              ews.traffic_light === 'RED' ? 'bg-rose-950/20 border-rose-500/40' :
              ews.traffic_light === 'AMBER' ? 'bg-amber-950/20 border-amber-500/40' :
              'bg-emerald-950/20 border-emerald-500/40'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-400" />
                  巴塞尔协议早期预警信号 (Basel EWS)
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold font-mono ${
                  ews.traffic_light === 'RED' ? 'bg-rose-500 text-white shadow-[0_0_12px_rgba(244,63,94,0.4)]' :
                  ews.traffic_light === 'AMBER' ? 'bg-amber-500 text-slate-950 font-bold' :
                  'bg-emerald-500/30 text-emerald-300 border border-emerald-500/40'
                }`}>
                  {ews.signal_zh || ews.traffic_light}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-3 text-xs">
                <div className="bg-slate-900/80 p-2.5 rounded-lg">
                  <div className="text-[10px] text-slate-400">信贷/GDP 缺口 (Credit Gap)</div>
                  <div className="text-sm font-bold font-mono text-white mt-0.5">
                    {ews.credit_to_gdp_gap > 0 ? '+' : ''}{ews.credit_to_gdp_gap}%
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">阈值: &gt;10% 预警</div>
                </div>
                <div className="bg-slate-900/80 p-2.5 rounded-lg">
                  <div className="text-[10px] text-slate-400">逆周期缓冲 (CCyB) 建议</div>
                  <div className="text-sm font-bold font-mono text-amber-400 mt-0.5">
                    {ews.ccyb_buffer_pct}%
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">占风险加权资产比例</div>
                </div>
                <div className="bg-slate-900/80 p-2.5 rounded-lg">
                  <div className="text-[10px] text-slate-400">偿债比率 (DSR)</div>
                  <div className="text-sm font-bold font-mono text-white mt-0.5">
                    {ews.dsr_pct}%
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">DSR Gap: {ews.dsr_gap}%</div>
                </div>
                <div className="bg-slate-900/80 p-2.5 rounded-lg">
                  <div className="text-[10px] text-slate-400">跨境借贷/GDP 占比</div>
                  <div className="text-sm font-bold font-mono text-sky-400 mt-0.5">
                    {ews.xb_borrowing_gdp_pct || 25}%
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">外部依赖程度</div>
                </div>
              </div>
            </div>

            {/* Greenspan-Guidotti Rule Metric Card */}
            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <CheckCircle2 className={`w-4 h-4 ${isGuidottiAdequate ? 'text-emerald-400' : 'text-rose-400'}`} />
                  格林斯潘-古多蒂外储安全比率 (Greenspan-Guidotti)
                </span>
                <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold ${
                  isGuidottiAdequate ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                }`}>
                  {guidottiRatio}x
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-normal">
                国际清算银行与 IMF 核心主权流动性准则：官方外汇储备需能 100% 覆盖未来 12 个月内到期的短期跨境债务（阈值 &ge; 1.0x）。
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-800">
                <div>
                  <span className="text-slate-400 text-[10px]">官方储备总额:</span>
                  <div className="font-mono font-bold text-amber-400">${country.fx_reserves}B</div>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px]">估算短期外债:</span>
                  <div className="font-mono font-bold text-rose-400">${shortTermDebtEst}B</div>
                </div>
              </div>
            </div>

            {/* CBS Vulnerability Rating */}
            {currentCbs.vulnerability_score && (
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5">
                <div className="text-xs font-bold text-white mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-rose-400" /> CBS 综合风险脆弱度评估
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
                  <div className="flex justify-between bg-slate-950/60 p-2 rounded">
                    <span className="text-slate-400">外债/外储比率:</span>
                    <span className="font-mono font-bold text-white">{currentCbs.debt_to_reserves_ratio}x</span>
                  </div>
                  <div className="flex justify-between bg-slate-950/60 p-2 rounded">
                    <span className="text-slate-400">脆弱性得分:</span>
                    <span className="font-mono font-bold text-amber-400">{currentCbs.vulnerability_score}/100</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: ULTIMATE RISK PIERCING */}
        {activeTab === 'piercing' && (
          <div className="space-y-4 animate-fade-in">
            <div className="p-4 rounded-xl bg-blue-950/20 border border-blue-500/30 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-blue-300">
                <Zap className="w-4 h-4 text-sky-400" />
                BIS 最终风险穿透原则 (Ultimate Risk Piercer)
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {isOffshoreConduit ? (
                  `经济体 ${country.name_zh} (${country.code}) 属于典型的全球离岸中继避税港/管道中枢。在即期借款人 (Immediate Counterparty) 统计下显现巨额名义头寸，但实质上其中约 ${piercedReallocationShare}% 的资产负债由美、欧、中等跨国母行与母公司进行终极承保。`
                ) : (
                  `经济体 ${country.name_zh} (${country.code}) 属于最终风险承接主权。一旦穿透开曼、卢森堡等离岸中继管道，其跨国跨集团母行的真实对外信贷与担保敞口将显著高于即期借款人统计。`
                )}
              </p>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="text-xs font-bold text-white flex items-center justify-between">
                <span>穿透前后敞口对比</span>
                <span className="text-[10px] text-slate-400 font-mono">{selectedQuarter}</span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between p-2 rounded-lg bg-slate-950/60">
                  <span className="text-slate-400">即期借款人原则 (名义头寸):</span>
                  <span className="font-mono font-bold text-white">${currentLbs.claims_usd_bn || 0}B</span>
                </div>
                <div className="flex justify-between p-2 rounded-lg bg-slate-950/60">
                  <span className="text-slate-400">
                    {isOffshoreConduit ? '离岸壳实体剔除后留存:' : '包含离岸子公司担保穿透后:'}
                  </span>
                  <span className="font-mono font-bold text-emerald-400">
                    ${isOffshoreConduit ? Math.round((currentLbs.claims_usd_bn || 0) * (conduitRetention / 100)) : Math.round((currentLbs.claims_usd_bn || 0) * 1.35)}B
                  </span>
                </div>
                <div className="flex justify-between p-2 rounded-lg bg-slate-950/60">
                  <span className="text-slate-400">穿透再分配调整比例:</span>
                  <span className="font-mono font-bold text-amber-400">
                    {isOffshoreConduit ? `-${piercedReallocationShare}% (剥除)` : '+35% (真实担保承保)'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Action Shortcuts: Instant Cross-Module Triggers */}
      <div className="pt-4 mt-4 border-t border-slate-800/80 space-y-2">
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">
          一键跨模块智能联动推演
        </div>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={handleTriggerContagion}
            className="p-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-300 text-[11px] font-semibold flex flex-col items-center justify-center gap-1 transition-all group"
            title="将该国设为主权外债违约起点，在传染模拟器中运行三轮清算"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400 group-hover:scale-110 transition-transform" />
            <span>设为传染震中</span>
          </button>
          <button
            onClick={handleTriggerRiskMatrix}
            className="p-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-[11px] font-semibold flex flex-col items-center justify-center gap-1 transition-all group"
            title="前往国家风险矩阵开启穿透模式查看该国"
          >
            <Shield className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
            <span>主权穿透审查</span>
          </button>
          <button
            onClick={handleTriggerMultiCompare}
            className="p-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 text-[11px] font-semibold flex flex-col items-center justify-center gap-1 transition-all group"
            title="加入多国宏观雷达对照矩阵"
          >
            <Layers className="w-3.5 h-3.5 text-blue-400 group-hover:scale-110 transition-transform" />
            <span>多国雷达对照</span>
          </button>
        </div>

        <button
          onClick={() => {
            soundFx.playTick();
            onClose();
          }}
          className="w-full mt-2 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          收起主权档案
        </button>
      </div>
    </div>
  );
}
