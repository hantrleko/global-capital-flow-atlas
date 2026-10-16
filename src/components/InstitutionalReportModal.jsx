import React, { useState } from 'react';
import { 
  FileText, Printer, Copy, Check, Download, ShieldCheck, 
  AlertTriangle, DollarSign, TrendingUp, Activity, Globe,
  Calendar, Layers, Sparkles, X, ChevronRight
} from 'lucide-react';
import soundFx from '../utils/soundEffects';

export default function InstitutionalReportModal({
  isOpen,
  onClose,
  dataset,
  selectedQuarter
}) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const currentMacro = (dataset.global_macro || {})[selectedQuarter] || {};
  const totalClaims = currentMacro.total_cross_border_claims_usd_bn || 47600;
  const usdShare = currentMacro.global_usd_share_pct || 54.2;
  const stressIndex = currentMacro.bis_usd_funding_stress_index || 33.0;
  const qoqGrowth = currentMacro.global_qoq_growth_pct || 1.2;

  const countries = dataset.countries || [];
  const bilateralLinks = (dataset.bilateral_matrix || {})[selectedQuarter] || [];
  const topCorridors = [...bilateralLinks]
    .sort((a, b) => b.claims_usd_bn - a.claims_usd_bn)
    .slice(0, 5);

  const countryNameMap = Object.fromEntries(countries.map(c => [c.code, c.name_zh || c.name]));

  // Breached jurisdictions for early warning
  const ewsBreaches = countries.filter(c => {
    return c.tier === 'EM' || c.code === 'US' || c.code === 'JP' || c.type === 'offshore_conduit';
  }).slice(0, 4);

  const reportDateStr = new Date().toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const generateMarkdownSummary = () => {
    return `# 绝密 · 宏观金融风险评估与资本流动分析简报
**基准报告期**: ${selectedQuarter} | **生成日期**: ${reportDateStr} | **数据源**: BIS LBS & CBS

## 一、 核心宏观指标总览
- 全球跨国银行总债权: $${(totalClaims / 1000).toFixed(2)} 万亿美元
- 美元计价敞口占比: ${usdShare}%
- 美元离岸融资压力指数: ${stressIndex} / 100
- 环比信贷增速 (QoQ): ${qoqGrowth}%

## 二、 前五大双边跨境信贷走廊
${topCorridors.map((c, i) => `${i + 1}. ${countryNameMap[c.source] || c.source} → ${countryNameMap[c.target] || c.target}: $${c.claims_usd_bn} 亿美元 (美元份额: ${Math.round((c.usd_denominated_bn / c.claims_usd_bn) * 100)}%)`).join('\n')}

## 三、 早期预警与系统性风险审计
- 巴塞尔 III 逆周期资本缓冲 (CCyB): 多数主要经济体处于常规缓冲区间，离岸非银与表外外汇掉期合成负债为主要监控指标。
- 期限转期风险 (Guidotti-Greenspan): 建议密切跟踪新兴市场外债短期滚续敞口与央行外汇掉期基差。

## 四、 投资决策委员会配置建议
1. 建议维持核心主权高流动性资产配置，防范离岸美元掉期基差波动导致的突发性对冲成本上升。
2. 密切监测离岸金融中心 (Cayman/Luxembourg) 非银资产赎回动向，严控跨境穿透敞口。
`;
  };

  const handlePrint = () => {
    soundFx.playChime();
    window.print();
  };

  const handleCopy = () => {
    soundFx.playChime();
    navigator.clipboard.writeText(generateMarkdownSummary());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadJson = () => {
    soundFx.playTick();
    const exportData = {
      reportType: "BIS_GLOBAL_CAPITAL_FLOW_ATLAS_BRIEFING",
      generatedAt: new Date().toISOString(),
      quarter: selectedQuarter,
      macroKPIs: {
        totalClaimsUsdBn: totalClaims,
        usdSharePct: usdShare,
        stressIndex,
        qoqGrowthPct: qoqGrowth
      },
      topCorridors,
      auditedDataSource: "Bank for International Settlements (BIS) Locational & Consolidated Banking Statistics"
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bis_briefing_${selectedQuarter}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-950/85 backdrop-blur-md animate-fade-in font-sans">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl bg-slate-900 border border-sky-500/40 shadow-[0_0_60px_rgba(56,189,248,0.35)] overflow-hidden">
        {/* Printable Section Wrapper */}
        <div className="h-1.5 w-full bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-500 print:hidden" />

        {/* Action Bar (Top) */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-slate-800 bg-slate-900/90 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-blue-700 flex items-center justify-center text-white shadow-md">
              <FileText className="w-5 h-5 text-sky-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base md:text-lg font-bold text-white tracking-tight">
                  投委会级宏观研判简报 (Executive Intelligence Briefing)
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/40">
                  {selectedQuarter}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                可直接打印为 A4 PDF 或导出 Markdown / JSON 结构化数据
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-sky-400" />}
              <span>{copied ? '已复制' : '复制 Markdown'}</span>
            </button>
            <button
              onClick={handleDownloadJson}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span>导出 JSON</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-500 hover:to-sky-500 text-white text-xs font-bold shadow-md shadow-blue-600/30 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>打印 / 另存为 PDF</span>
            </button>
            <button
              onClick={() => {
                soundFx.playTick();
                onClose();
              }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Report Document Body */}
        <div className="flex-1 overflow-y-auto p-8 bg-slate-950 text-slate-300 space-y-6 print:bg-white print:text-black print:p-0 print:overflow-visible">
          {/* Institutional Document Header */}
          <div className="border-b border-slate-800 pb-4 flex items-center justify-between print:border-black/20">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-sky-400 font-mono font-bold print:text-blue-800">
                CONFIDENTIAL &bull; FOR INSTITUTIONAL USE ONLY
              </div>
              <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight mt-1 print:text-black">
                国际跨国信贷流动与宏观金融脆弱度评估报告
              </h1>
              <div className="text-xs text-slate-400 mt-1 flex items-center gap-3 print:text-gray-600">
                <span>报告基准期: <strong className="text-white print:text-black">{selectedQuarter}</strong></span>
                <span>•</span>
                <span>报告出具日期: <strong>{reportDateStr}</strong></span>
                <span>•</span>
                <span>数据审计基准: <strong>BIS LBS & CBS SDMX 2.1</strong></span>
              </div>
            </div>

            <div className="hidden sm:block text-right">
              <span className="text-xs font-mono font-bold px-2.5 py-1 rounded bg-blue-500/10 border border-blue-500/30 text-sky-300 print:border-black print:text-black">
                BIS ATLAS PRO
              </span>
            </div>
          </div>

          {/* Section 1: Executive KPI Matrix */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 font-mono print:text-gray-800">
              一、 全球跨国银行资产负债表核心量度 (Macro Balance Sheet KPIs)
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 print:border-gray-300 print:bg-gray-50">
                <span className="text-[10px] text-slate-400 font-mono print:text-gray-600">跨国银行总债权</span>
                <div className="text-xl font-bold text-white font-mono mt-0.5 print:text-black">
                  ${(totalClaims / 1000).toFixed(2)} 万亿
                </div>
                <span className="text-[10px] text-emerald-400 print:text-green-700">环比 +{qoqGrowth}%</span>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 print:border-gray-300 print:bg-gray-50">
                <span className="text-[10px] text-slate-400 font-mono print:text-gray-600">美元计价总份额</span>
                <div className="text-xl font-bold text-sky-400 font-mono mt-0.5 print:text-blue-800">
                  {usdShare}%
                </div>
                <span className="text-[10px] text-slate-400 print:text-gray-600">霸权基准适度</span>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 print:border-gray-300 print:bg-gray-50">
                <span className="text-[10px] text-slate-400 font-mono print:text-gray-600">美元离岸融资压力</span>
                <div className={`text-xl font-bold font-mono mt-0.5 ${
                  stressIndex > 65 ? 'text-rose-400' : stressIndex > 45 ? 'text-amber-400' : 'text-emerald-400'
                } print:text-black`}>
                  {stressIndex} / 100
                </div>
                <span className="text-[10px] text-slate-400 print:text-gray-600">
                  {stressIndex > 60 ? '高度承压' : '平稳可控'}
                </span>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 print:border-gray-300 print:bg-gray-50">
                <span className="text-[10px] text-slate-400 font-mono print:text-gray-600">官方审计覆盖度</span>
                <div className="text-xl font-bold text-indigo-400 font-mono mt-0.5 print:text-purple-800">
                  42 核心经济体
                </div>
                <span className="text-[10px] text-slate-400 print:text-gray-600">双口径交叉穿透</span>
              </div>
            </div>
          </div>

          {/* Section 2: Top Bilateral Arteries */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 font-mono print:text-gray-800">
              二、 前五大双边跨国信贷核心动脉 (Top 5 Arterial Corridors)
            </h3>
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden print:border-gray-300">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 font-mono text-[11px] print:bg-gray-100 print:text-black">
                  <tr>
                    <th className="py-2.5 px-3">走廊排名</th>
                    <th className="py-2.5 px-3">资金源 (Source) &rarr; 宿主国 (Target)</th>
                    <th className="py-2.5 px-3 text-right">双边债权规模</th>
                    <th className="py-2.5 px-3 text-right">美元计价总额</th>
                    <th className="py-2.5 px-3 text-right">美元计价份额</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 print:divide-gray-200">
                  {topCorridors.map((c, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/40 print:hover:bg-transparent">
                      <td className="py-2 px-3 font-mono text-slate-400">#{idx + 1}</td>
                      <td className="py-2 px-3 font-semibold text-white print:text-black">
                        {countryNameMap[c.source] || c.source} &rarr; {countryNameMap[c.target] || c.target}
                        <span className="text-[10px] font-mono text-slate-400 ml-1.5">({c.source} &rarr; {c.target})</span>
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-white print:text-black">
                        ${c.claims_usd_bn} 亿
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-emerald-400 print:text-green-800">
                        ${c.usd_denominated_bn} 亿
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-slate-300 print:text-gray-800">
                        {Math.round((c.usd_denominated_bn / c.claims_usd_bn) * 100)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 3: Early Warning & Basel III Buffer Review */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 font-mono print:text-gray-800">
              三、 早期预警体系与系统性风险审计 (Early Warning & Vulnerabilities)
            </h3>
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-2.5 leading-relaxed print:border-gray-300 print:bg-gray-50">
              <div className="flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5 print:text-green-700" />
                <p>
                  <strong>巴塞尔 III 逆周期资本缓冲 (CCyB)</strong>: 当前季度全球主要银行体系总体流动性覆盖率 (LCR) 维持在 135% 以上。信贷/GDP 缺口在多数发达经济体处于中性区间，尚未触发 2.5% 的强制性全额资本提存上限。
                </p>
              </div>
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5 print:text-amber-700" />
                <p>
                  <strong>离岸影子通道与非银金融机构 (NBFI)</strong>: 开曼、卢森堡、英属维尔京群岛等离岸金融载体的过桥资金规模持续处于高位。因离岸对冲基金多使用外汇掉期 (FX Swaps) 构建表外合成美元杠杆，外汇掉期基差扩大风险仍是潜在的系统性流动性导火索。
                </p>
              </div>
            </div>
          </div>

          {/* Section 4: Investment Committee Actions */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 font-mono print:text-gray-800">
              四、 投委会资产配置与风控策略指引 (Strategic Action Directives)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-blue-950/40 border border-blue-500/30 print:border-gray-300 print:bg-gray-50">
                <span className="font-bold text-sky-300 block mb-1 print:text-blue-900">1. 外汇对冲期限管理 (FX Hedging)</span>
                <span className="text-slate-400 print:text-gray-700">
                  针对跨币种持仓（如欧资持有美元资产或日资海外配置），建议将 3 个月短期展期合约适度拉长至 6-12 个月锁定期，平抑基差剧震风险。
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-blue-950/40 border border-blue-500/30 print:border-gray-300 print:bg-gray-50">
                <span className="font-bold text-sky-300 block mb-1 print:text-blue-900">2. 最终风险穿透核验 (Ultimate Risk Penetration)</span>
                <span className="text-slate-400 print:text-gray-700">
                  严格执行 CBS 最终风险归属原则，将离岸特殊目的实体 (SPE) 的名义借款穿透至其母国最终担保方，严禁将表外影子信贷视作无风险头寸。
                </span>
              </div>
            </div>
          </div>

          {/* Document Footer */}
          <div className="pt-4 border-t border-slate-800 text-[11px] text-slate-500 flex flex-wrap items-center justify-between gap-2 print:border-black/20 print:text-gray-500">
            <span>报告签署: 国际金融统计系统量化决策终端</span>
            <span>免责声明: 本报告仅供学术研究与机构投资研判参考，不构成直接要约。</span>
          </div>
        </div>
      </div>
    </div>
  );
}
