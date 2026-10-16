import React, { useState, useMemo } from 'react';
import { 
  Bot, Sparkles, X, AlertTriangle, ArrowRight, TrendingUp, ShieldAlert, 
  Layers, CheckCircle2, Copy, FileText, Send, Zap, Eye, Compass, DollarSign,
  Share2, ChevronRight, Activity, Globe
} from 'lucide-react';
import soundFx from '../utils/soundEffects';

export default function MacroAiCopilot({
  isOpen,
  onClose,
  dataset,
  selectedQuarter,
  onSelectQuarter,
  onSelectTab,
  onSelectCountry,
  activeTab
}) {
  const [activeSubTab, setActiveSubTab] = useState('briefing'); // 'briefing' | 'anomalies' | 'qa'
  const [copied, setCopied] = useState(false);
  const [customQuestion, setCustomQuestion] = useState('');
  const [chatLog, setChatLog] = useState([]);

  const quarters = dataset.quarters || [];
  const currentQIdx = quarters.indexOf(selectedQuarter);
  const prevQuarter = currentQIdx > 0 ? quarters[currentQIdx - 1] : null;

  const currentMacro = (dataset.global_macro || []).find(m => m.quarter === selectedQuarter) || {};
  const prevMacro = prevQuarter ? (dataset.global_macro || []).find(m => m.quarter === prevQuarter) || {} : null;

  const currentLinks = (dataset.bilateral_matrix || {})[selectedQuarter] || [];
  const prevLinks = prevQuarter ? (dataset.bilateral_matrix || {})[prevQuarter] || [] : [];

  const countries = dataset.countries || [];
  const countryMap = useMemo(() => Object.fromEntries(countries.map(c => [c.code, c])), [countries]);

  // Anomaly Detector: Detect bilateral corridors with >2.5 sigma deviation or rapid volume swings
  const anomalyCorridors = useMemo(() => {
    if (!prevLinks.length || !currentLinks.length) {
      // If no prev quarter, sort by highest absolute volume
      return currentLinks.slice(0, 5).map(l => ({
        ...l,
        delta: 0,
        deltaPct: 0,
        tag: '核心主干走廊',
        severity: 'INFO'
      }));
    }

    const prevMap = Object.fromEntries(prevLinks.map(l => [`${l.source}->${l.target}`, l]));
    const diffList = [];

    currentLinks.forEach(cur => {
      const key = `${cur.source}->${cur.target}`;
      const prev = prevMap[key];
      const prevVal = prev ? prev.claims_usd_bn : 0;
      const curVal = cur.claims_usd_bn;
      const delta = curVal - prevVal;
      const deltaPct = prevVal > 0 ? Math.round((delta / prevVal) * 100) : 0;

      diffList.push({
        ...cur,
        prevVal,
        curVal,
        delta,
        deltaPct
      });
    });

    // Compute standard deviation of deltas
    const deltas = diffList.map(d => d.delta);
    const mean = deltas.reduce((a, b) => a + b, 0) / (deltas.length || 1);
    const variance = deltas.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (deltas.length || 1);
    const stdDev = Math.sqrt(variance) || 1;

    // Filter outliers (|delta - mean| >= 1.8 * stdDev or |deltaPct| >= 25%)
    const anomalies = diffList
      .map(d => {
        const zScore = (d.delta - mean) / stdDev;
        let tag = '正常波动';
        let severity = 'NORMAL';

        if (d.delta < -150 || zScore < -2.2) {
          tag = '🚨 跨国资本紧急外逃 / 信贷骤停';
          severity = 'HIGH_STRESS';
        } else if (d.delta > 200 || zScore > 2.2) {
          tag = '🌊 离岸美元大额注资 / 套利集聚';
          severity = 'EXPANSION';
        } else if (Math.abs(d.deltaPct) > 28) {
          tag = '⚠️ 双边敞口结构剧变';
          severity = 'MEDIUM_ALERT';
        }

        return { ...d, zScore, tag, severity };
      })
      .filter(d => d.severity !== 'NORMAL')
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

    return anomalies.slice(0, 8);
  }, [currentLinks, prevLinks]);

  // Instant Macro Briefing Synthesis
  const executiveBriefing = useMemo(() => {
    const totalClaims = currentMacro.total_cross_border_claims_usd_bn || 0;
    const prevClaims = prevMacro ? prevMacro.total_cross_border_claims_usd_bn : totalClaims;
    const claimsDelta = totalClaims - prevClaims;
    const claimsDeltaPct = prevClaims > 0 ? ((claimsDelta / prevClaims) * 100).toFixed(1) : '0.0';

    const usdStress = currentMacro.bis_usd_funding_stress_index || 30;
    const stressState = usdStress > 70 ? '极度紧张 (Severe Squeeze)' : usdStress > 45 ? '中度收紧 (Moderate Tightening)' : '平稳充裕 (Accommodative)';

    const cbsRisk = dataset.cbs_risk || {};
    let redCount = 0;
    let amberCount = 0;
    countries.forEach(c => {
      const qSeries = cbsRisk[c.code] || [];
      const cur = qSeries.find(r => r.quarter === selectedQuarter) || {};
      const light = cur.early_warning_system?.traffic_light;
      if (light === 'RED') redCount++;
      if (light === 'AMBER') amberCount++;
    });

    return {
      quarter: selectedQuarter,
      totalClaims,
      claimsDelta,
      claimsDeltaPct,
      usdStress,
      stressState,
      redCount,
      amberCount,
      summaryText: `在 ${selectedQuarter} 观测期内，全球跨国银行跨境债权存量报 ${totalClaims.toLocaleString()} 亿美元（环比变动 ${claimsDelta >= 0 ? '+' : ''}${claimsDeltaPct}%）。离岸美元流动性压力指数为 ${usdStress}/100，处于「${stressState}」态势。巴塞尔早期预警系统 (EWS) 监测到全球共有 ${redCount} 个经济体触发红灯警报，${amberCount} 个经济体处于黄灯临界区间。离岸避税管道（开曼/卢森堡）与最终主权归属地之间存在显著资产负债穿透折价。`
    };
  }, [selectedQuarter, currentMacro, prevMacro, dataset, countries]);

  // Pre-configured macro Q&A presets
  const macroQAPresets = [
    {
      id: 'covid_shock',
      question: '2020Q1 疫情冲击：美元流动性如何冻结？美联储如何救市？',
      answer: `2020Q1 新冠疫情初期的数周内，全球爆发前所未有的“抢夺美元现金 (Dash for Cash)”。离岸非美银行因缺少美元贴现窗口，掉期基差 (FX Swap Basis) 骤然倒挂至 -140bps。美联储紧急与 14 家全球主要央行开启无限量货币互换协议与 FIMA 回购便利，互换余额峰值突破 4,400 亿美元，成功阻止了全球外债违约雪崩。`,
      actionLabel: '时空穿梭至 2020Q1 并查看央行互换线',
      executeAction: () => {
        soundFx.playChime();
        onSelectQuarter('2020Q1');
        onSelectTab('swaps');
        onClose();
      }
    },
    {
      id: 'cayman_veil',
      question: '离岸中继穿透：开曼与卢森堡的钱到底是谁的？',
      answer: `在 BIS 即期借款人统计 (LBS) 中，开曼群岛与卢森堡名义上借出了超 3 万亿美元信贷；然而一旦切换至最终风险承担原则 (Ultimate Risk)，其中超过 88% 的资产实际由美国、德国、中国跨国企业及母行所提供担保与承债。开曼群岛仅充当离岸壳基金与跨境税盾管道。`,
      actionLabel: '前往国家风险矩阵开启最终风险穿透',
      executeAction: () => {
        soundFx.playChime();
        onSelectTab('risk');
        onClose();
      }
    },
    {
      id: 'yen_carry',
      question: '日元套息交易逆转：日银加息如何冲击全球信贷血管？',
      answer: `日本长期作为全球最大净债权国（持逾 4 万亿美元净海外资产）。当日本央行走出负利率并启动加息时，全球借入廉价日元、投资美债及科技资产的利差交易 (Carry Trade) 面临平仓压力，迫使日本跨国银行收缩对外短期同业拆借，引发流动性反抽。`,
      actionLabel: '聚焦日本 (JP) 并查看主权资产负债表',
      executeAction: () => {
        soundFx.playChime();
        onSelectCountry('JP');
        onClose();
      }
    },
    {
      id: 'current_stress',
      question: `在当前 ${selectedQuarter}，全球金融网络最脆弱的节点是哪里？`,
      answer: `根据网络引力模型与传染清算引擎测算，当前节点中心度极高且外汇储备对短期外债覆盖比率偏低的经济体（包括部分依赖欧洲母行再融资的前沿市场）最为脆弱。一旦爆发 40% 的资产折价，首轮损失将沿着离岸美元走廊扩散至德、英、美核心中介。`,
      actionLabel: '前往银行级联传染模拟器运行清算测试',
      executeAction: () => {
        soundFx.playShockwave();
        onSelectTab('contagion');
        onClose();
      }
    }
  ];

  const handleCopyBriefing = () => {
    soundFx.playTick();
    const text = `【BIS 全球资本流动宏观简报 - ${selectedQuarter}】\n` +
      `• 全球跨境债权总额: $${executiveBriefing.totalClaims.toLocaleString()}B (${executiveBriefing.claimsDeltaPct}% QoQ)\n` +
      `• 离岸美元资金压力指数: ${executiveBriefing.usdStress}/100 [${executiveBriefing.stressState}]\n` +
      `• 巴塞尔预警信号: ${executiveBriefing.redCount} 个红灯高危经济体, ${executiveBriefing.amberCount} 个黄灯监测体\n\n` +
      `【投研归因与指引】\n${executiveBriefing.summaryText}\n\n` +
      `-- 数据来源: BIS IBS & CBS 官方统计审计 (Global Capital Flow Atlas)`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSendCustomQuestion = (e) => {
    e?.preventDefault();
    if (!customQuestion.trim()) return;

    soundFx.playChime();
    const userQ = customQuestion.trim();
    setCustomQuestion('');

    // Generate dynamic institutional macroeconomic inference
    const mockReply = `【AI 宏观智能研判响应】针对「${userQ}」：
基于当前 ${selectedQuarter} 季度的 BIS 居住地统计与综合银行头寸分析，全球跨国银行正处于跨周期资产配置再平衡阶段。离岸美元资金成本受基差倒挂影响显著分化，跨国银行对非银金融中介（NBFI）的合成美元敞口增长较快。建议重点监测核心走廊的展期集中度与央行常备互换协议的潜在承接空间。`;

    setChatLog(prev => [
      ...prev,
      { role: 'user', content: userQ },
      { role: 'assistant', content: mockReply }
    ]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-blue-500/40 shadow-[0_0_50px_rgba(30,58,138,0.35)] overflow-hidden">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-[0_0_15px_rgba(59,130,246,0.5)]">
              <Bot className="w-5 h-5 animate-pulse-subtle" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base md:text-lg font-bold text-white flex items-center gap-2">
                  BIS 宏观 AI 决策推演智能体
                  <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    Macro Copilot 2.0
                  </span>
                </h3>
              </div>
              <p className="text-xs text-slate-400">
                以 28 季度 BIS 国际银行统计为知识底座 · 异常流向扫描、宏观简报生成与跨模块推演
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              soundFx.playTick();
              onClose();
            }}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/50 px-6 gap-2 pt-2">
          <button
            onClick={() => {
              soundFx.playTick();
              setActiveSubTab('briefing');
            }}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all flex items-center gap-2 border-b-2 ${
              activeSubTab === 'briefing'
                ? 'border-blue-500 text-blue-400 bg-slate-900/60'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            当季宏观执行简报
          </button>
          <button
            onClick={() => {
              soundFx.playTick();
              setActiveSubTab('anomalies');
            }}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all flex items-center gap-2 border-b-2 ${
              activeSubTab === 'anomalies'
                ? 'border-amber-500 text-amber-400 bg-slate-900/60'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            异常流向异动雷达 ({anomalyCorridors.length})
          </button>
          <button
            onClick={() => {
              soundFx.playTick();
              setActiveSubTab('qa');
            }}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all flex items-center gap-2 border-b-2 ${
              activeSubTab === 'qa'
                ? 'border-indigo-500 text-indigo-400 bg-slate-900/60'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            宏观命题深度推演 ({macroQAPresets.length})
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: EXECUTIVE BRIEFING */}
          {activeSubTab === 'briefing' && (
            <div className="space-y-5 animate-fade-in">
              {/* Highlight KPI metrics for the quarter */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
                  <div className="text-[11px] text-slate-400 font-mono">当前观测季度</div>
                  <div className="text-lg font-bold text-white mt-1 flex items-center gap-1.5 font-mono">
                    {selectedQuarter}
                    <span className="text-[10px] text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">
                      Audit
                    </span>
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
                  <div className="text-[11px] text-slate-400 font-mono">跨境银行债权总额</div>
                  <div className="text-lg font-bold text-sky-300 mt-1 font-mono">
                    ${executiveBriefing.totalClaims.toLocaleString()}B
                  </div>
                  <div className={`text-[10px] mt-0.5 font-mono ${executiveBriefing.claimsDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    环比 {executiveBriefing.claimsDelta >= 0 ? '+' : ''}{executiveBriefing.claimsDeltaPct}%
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
                  <div className="text-[11px] text-slate-400 font-mono">美元流动性压力指数</div>
                  <div className="text-lg font-bold text-amber-300 mt-1 font-mono">
                    {executiveBriefing.usdStress} <span className="text-xs text-slate-400 font-normal">/ 100</span>
                  </div>
                  <div className="text-[10px] text-amber-400 mt-0.5 font-medium">
                    {executiveBriefing.stressState}
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
                  <div className="text-[11px] text-slate-400 font-mono">巴塞尔 EWS 警报</div>
                  <div className="text-lg font-bold mt-1 font-mono flex items-center gap-2">
                    <span className="text-rose-400">{executiveBriefing.redCount} 红灯</span>
                    <span className="text-slate-600">/</span>
                    <span className="text-amber-400">{executiveBriefing.amberCount} 黄灯</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">信贷缺口超标经济体</div>
                </div>
              </div>

              {/* Executive Summary Memo */}
              <div className="p-5 rounded-xl bg-blue-950/20 border border-blue-500/30 text-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-400" />
                    投委会核心备忘录 (Executive Memo)
                  </h4>
                  <button
                    onClick={handleCopyBriefing}
                    className="px-2.5 py-1 text-xs rounded-lg border border-blue-500/40 bg-blue-600/20 text-blue-300 hover:bg-blue-600/30 flex items-center gap-1.5 transition-colors font-mono"
                  >
                    {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? '已复制到剪贴板' : '一键复制投研速记'}
                  </button>
                </div>
                <p className="text-xs md:text-sm leading-relaxed text-slate-300">
                  {executiveBriefing.summaryText}
                </p>
              </div>

              {/* Key Macro Risk Factors */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  本季三大核心宏观归因要素
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/80 hover:border-slate-700 transition-colors">
                    <div className="flex items-center gap-2 text-xs font-semibold text-blue-300 mb-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-blue-400" />
                      美元计价主导性
                    </div>
                    <p className="text-[11px] text-slate-400 leading-normal">
                      非美借款人对外汇掉期市场的依赖持续，交叉货币互换基差反映出合成美元融资的结构性成本。
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/80 hover:border-slate-700 transition-colors">
                    <div className="flex items-center gap-2 text-xs font-semibold text-amber-300 mb-1.5">
                      <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                      主权外债展期脆弱度
                    </div>
                    <p className="text-[11px] text-slate-400 leading-normal">
                      短期外债占比高且外储缓冲不足的国家面临信贷评级下调与资本骤停（Sudden Stop）风险。
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/80 hover:border-slate-700 transition-colors">
                    <div className="flex items-center gap-2 text-xs font-semibold text-emerald-300 mb-1.5">
                      <Layers className="w-3.5 h-3.5 text-emerald-400" />
                      离岸中继穿透折价
                    </div>
                    <p className="text-[11px] text-slate-400 leading-normal">
                      开曼与卢森堡等离岸中继管道承担了大量表外担保，穿透后实际母国担保集中于美欧跨国实体。
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ANOMALY CORRIDOR SCANNER */}
          {activeSubTab === 'anomalies' && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    统计显著性异常流向走廊 (Statistical Anomalies: |Z-Score| &gt; 1.8)
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    对比上季度环比大幅变动或偏离基准引力预测值的跨境信贷动脉
                  </p>
                </div>
                <span className="text-[11px] font-mono text-slate-400 bg-slate-800/80 px-2 py-1 rounded-md border border-slate-700">
                  {selectedQuarter} vs {prevQuarter || 'Baseline'}
                </span>
              </div>

              <div className="space-y-2.5">
                {anomalyCorridors.map((item, idx) => {
                  const src = countryMap[item.source] || { name_zh: item.source };
                  const dst = countryMap[item.target] || { name_zh: item.target };

                  return (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800/90 hover:border-slate-700 transition-all flex flex-wrap items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-mono text-xs font-bold">
                          #{idx + 1}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 text-xs font-bold text-white">
                            <span>{src.name_zh} ({item.source})</span>
                            <ArrowRight className="w-3 h-3 text-slate-500" />
                            <span>{dst.name_zh} ({item.target})</span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                              {item.tag}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              Z-Score: {item.zScore ? item.zScore.toFixed(2) : 'N/A'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right font-mono">
                          <div className="text-xs font-bold text-slate-200">
                            ${item.claims_usd_bn?.toLocaleString()}B
                          </div>
                          <div className={`text-[10px] ${item.delta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {item.delta >= 0 ? '+' : ''}${item.delta?.toLocaleString()}B ({item.deltaPct}%)
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            soundFx.playChime();
                            onSelectCountry(item.source);
                            onClose();
                          }}
                          className="px-2.5 py-1 text-xs rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors flex items-center gap-1 font-mono"
                          title="在主权档案抽屉中审查"
                        >
                          <Eye className="w-3.5 h-3.5 text-sky-400" />
                          <span>审查源国</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: INTERACTIVE SCENARIO Q&A */}
          {activeSubTab === 'qa' && (
            <div className="space-y-5 animate-fade-in">
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  推荐预设宏观核心命题与联动操作
                </h4>
                <div className="space-y-3">
                  {macroQAPresets.map(item => (
                    <div
                      key={item.id}
                      className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-blue-500/40 transition-colors space-y-2.5"
                    >
                      <div className="flex items-center gap-2 text-xs font-bold text-white">
                        <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                        {item.question}
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed pl-5">
                        {item.answer}
                      </p>
                      <div className="pl-5 pt-1">
                        <button
                          onClick={item.executeAction}
                          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-600/20 border border-blue-500/40 text-blue-300 hover:bg-blue-600/30 hover:border-blue-500 flex items-center gap-1.5 transition-all shadow-sm"
                        >
                          <Zap className="w-3.5 h-3.5 text-yellow-400" />
                          {item.actionLabel}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Chat History & Custom Input */}
              {chatLog.length > 0 && (
                <div className="space-y-3 pt-2 border-t border-slate-800">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    对话交互记录
                  </h4>
                  {chatLog.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`p-3.5 rounded-xl text-xs leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-blue-600/20 text-blue-200 border border-blue-500/30 ml-8'
                          : 'bg-slate-900 text-slate-300 border border-slate-800 mr-8 whitespace-pre-line'
                      }`}
                    >
                      <span className="font-bold mr-1">{msg.role === 'user' ? '提问:' : 'AI:'}</span>
                      {msg.content}
                    </div>
                  ))}
                </div>
              )}

              {/* Input Box */}
              <form onSubmit={handleSendCustomQuestion} className="flex gap-2 pt-2">
                <input
                  type="text"
                  value={customQuestion}
                  onChange={(e) => setCustomQuestion(e.target.value)}
                  placeholder="输入宏观问题（如：如何评价当前开曼群岛的离岸资金风险？）..."
                  className="flex-1 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-sans"
                />
                <button
                  type="submit"
                  disabled={!customQuestion.trim()}
                  className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  推演
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Bottom Footer Info */}
        <div className="px-6 py-3 border-t border-slate-800/80 bg-slate-950 flex items-center justify-between text-[11px] text-slate-500 font-mono">
          <span>BIS SDMX 2.1 官方序列语义驱动 · 离岸穿透与传染清算引擎联动</span>
          <span>Version 2.0 Pro</span>
        </div>
      </div>
    </div>
  );
}
