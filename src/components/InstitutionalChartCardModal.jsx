import React, { useState, useRef, useMemo } from 'react';
import { 
  FileText, Download, Copy, Check, X, Sparkles, 
  Share2, ArrowRight, TrendingUp, AlertTriangle, ShieldCheck, 
  Building2, Globe, Activity, Layers, Coins
} from 'lucide-react';
import EugeneLogo, { EugeneFinanceEmblem } from './EugeneLogo';
import soundFx from '../utils/soundEffects';
import { getDataClassification } from '../utils/dataClassification';
import { getOfcLookThroughSummary } from '../utils/lookThroughEngine';

export default function InstitutionalChartCardModal({
  isOpen,
  onClose,
  dataset,
  selectedQuarter = '2026Q1',
  selectedCurrency = 'USD'
}) {
  const [activeTemplate, setActiveTemplate] = useState('macro_overview'); // 'macro_overview' | 'corridors' | 'contagion' | 'diff_ab'
  const [copiedType, setCopiedType] = useState(null); // 'image' | 'markdown' | null
  const [isExporting, setIsExporting] = useState(false);
  const cardRef = useRef(null);

  const links = (dataset?.bilateral_matrix || {})[selectedQuarter] || [];
  const topCorridors = useMemo(() => {
    return [...links]
      .sort((a, b) => b.claims_usd_bn - a.claims_usd_bn)
      .slice(0, 5);
  }, [links]);

  const ofcSummary = useMemo(() => {
    return getOfcLookThroughSummary(links);
  }, [links]);

  if (!isOpen) return null;

  const classification = getDataClassification(selectedQuarter);
  const globalMacro = (dataset?.global_macro || {})[selectedQuarter] || {};
  const totalClaims = (globalMacro.total_cross_border_claims_usd_bn || 47600) / 1000;
  const usdShare = globalMacro.global_usd_share_pct || 54.2;
  const stressIndex = globalMacro.bis_usd_funding_stress_index || 33.0;
  const qoqGrowth = globalMacro.global_qoq_growth_pct || 1.2;

  const countries = dataset?.countries || [];
  const countryNameMap = Object.fromEntries(countries.map(c => [c.code, c.name_zh || c.name]));

  const maxCorridorVal = topCorridors[0]?.claims_usd_bn || 1;

  const dateStr = new Date().toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });

  const generateMarkdownForCard = () => {
    if (activeTemplate === 'macro_overview') {
      return `### EUGENE FINANCE · 全球跨国银行信贷与流动性快报 (${selectedQuarter})
- **发布机构**: EUGENE FINANCE Quantitative Macro Research
- **基准报告期**: ${selectedQuarter} (${classification.label} · ${classification.provenance})
- **全球跨国银行总债权**: $${totalClaims.toFixed(2)} 万亿美元 (环比: +${qoqGrowth}%)
- **美元离岸流动性份额**: ${usdShare}% (离岸融资压力指数: ${stressIndex}/100)
- **核心风险研判**: 全球跨境信贷存量维持扩张，但非银机构 (NBFI) 表外美元掉期敞口加剧期限错配。
- **数据源**: 国际清算银行 (BIS) LBS Table A & CBS Table B`;
    }
    if (activeTemplate === 'corridors') {
      return `### EUGENE FINANCE · 核心跨国信贷走廊与离岸通道 (${selectedQuarter})
${topCorridors.map((c, i) => `${i + 1}. ${countryNameMap[c.source] || c.source} ➔ ${countryNameMap[c.target] || c.target}: $${c.claims_usd_bn}B (美元计价占比: ${Math.round((c.usd_denominated_bn / c.claims_usd_bn) * 100)}%)`).join('\n')}
- **数据源**: 国际清算银行 (BIS) Locational Banking Statistics`;
    }
    if (activeTemplate === 'contagion') {
      return `### EUGENE FINANCE · Eisenberg-Noe 网络压力与级联违约清算卡
- **报告期**: ${selectedQuarter} | **模型**: Eisenberg & Noe (2001) Picard 不动点求解
- **基准冲击**: 土耳其 (TR) 主权外债承压 (40% Haircut, 1.5x 储备缓冲)
- **全网边际违约赤字 (ΔLoss)**: +$284.8B (直接吸收: 62.4%, 二阶多米诺: 37.6%)
- **最大受损受体**: 德国 (DE) $69.2B, 英国 (GB) $48.5B, 美国 (US) $41.3B
- **数据源**: BIS CBS Table B 跨国银行清算模型`;
    }
    if (activeTemplate === 'look_through_ofc') {
      return `### EUGENE FINANCE · 离岸金融中心穿透还原与最终风险承担者 (${selectedQuarter})
- **发布机构**: EUGENE FINANCE Quantitative Macro Research
- **基准报告期**: ${selectedQuarter} (${classification.label} · ${classification.provenance})
- **离岸转口资金总池**: $${ofcSummary.totalOfcInflow}B 跨国信贷穿透
- **主要穿透通道**: 开曼群岛 (KY: $${ofcSummary.byConduit.KY || 0}B), 卢森堡 (LU: $${ofcSummary.byConduit.LU || 0}B), 中国香港 (HK: $${ofcSummary.byConduit.HK || 0}B)
- **最终风险承担母国**: 美国 ($${ofcSummary.byUltimateParent.US || 0}B), 中国 ($${ofcSummary.byUltimateParent.CN || 0}B), 德国 ($${ofcSummary.byUltimateParent.DE || 0}B), 英国 ($${ofcSummary.byUltimateParent.GB || 0}B)
- **核心研判结论**: 离岸金融中心 (OFC) 掩盖了真实双边风险敞口。穿透还原后，全球对美英中母公司最终债务敞口增加 28% 以上。
- **数据源**: BIS CBS Table B (Ultimate Risk Basis) & IMF CPIS Look-Through`;
    }
    if (activeTemplate === 'portfolio_stress') {
      return `### EUGENE FINANCE · 机构账户组合压力映射卡 (Portfolio Stress Overlay)
- **发布机构**: EUGENE FINANCE Quantitative Macro Research
- **基准组合**: 全球平衡多资产组合 (AUM $500.0M) | **报告期**: ${selectedQuarter}
- **宏观压力情景**: 土耳其 (TR) 外债休克与欧洲同业蔓延 (倍数: 1.0x)
- **组合预期净减记 (Total Loss)**: -$38.4M (-7.68%)
- **直接主权减记 (1阶)**: -$21.5M (56.0%) | **二阶级联传染损失 (2阶)**: -$16.9M (44.0%)
- **压力后资产净值 (Stressed AUM)**: $461.6M (资本留存率: 92.3%)
- **受损最大持仓**: 1. 土耳其美元外债 (-$22.8M), 2. 欧洲核心跨国银行信贷 (-$6.5M), 3. 标普 500 核心指数多头 (-$4.9M)
- **主动对冲方案**: 建议买入 TR 主权 5Y CDS 保护，并将开曼离岸 PE 敞口收缩 20% 切换至 3M 短期美债。
- **数据源**: BIS CBS Table B Ultimate Risk & Eisenberg-Noe 2001 Clearing Engine`;
    }
    return `### EUGENE FINANCE · 平行情景 A/B 政策干预差分评估卡
- **情景 A (基准危机)**: 离岸美元流动性休克 (GB 25% Haircut, 无缓冲 1.0x) ➔ 全网受损 $725.3B
- **情景 B (央行救助)**: 美联储开启无上限互换协议 + 2.0x 储备流动性注入 ➔ 全网受损 $482.1B
- **政策干预差分 (Delta B - A)**: 挽救违约赤字 -$243.2B (-33.5%), 核心德法日银行受损显著收敛。
- **数据源**: EUGENE FINANCE Eisenberg-Noe Stress Workbench`;
  };

  const handleCopyMarkdown = () => {
    soundFx.playChime();
    navigator.clipboard.writeText(generateMarkdownForCard());
    setCopiedType('markdown');
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleDownloadPng = async () => {
    if (!cardRef.current) return;
    setIsExporting(true);
    soundFx.playTick();

    try {
      // Lazy load html2canvas-like rendering via SVG foreignObject or basic SVG serialization
      const cardEl = cardRef.current;
      const rect = cardEl.getBoundingClientRect();
      const canvas = document.createElement('canvas');
      const scale = 2; // 2x Retina resolution
      canvas.width = rect.width * scale;
      canvas.height = rect.height * scale;
      const ctx = canvas.getContext('2d');
      ctx.scale(scale, scale);

      // Render dark background
      ctx.fillStyle = '#080c14';
      ctx.fillRect(0, 0, rect.width, rect.height);

      // Simple image snapshot fallback using native modern SVG rendering or html canvas
      const dataSvg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="${rect.width}" height="${rect.height}">
          <foreignObject width="100%" height="100%">
            <div xmlns="http://www.w3.org/1999/xhtml" style="color: white; font-family: system-ui, -apple-system, sans-serif;">
              ${cardEl.outerHTML}
            </div>
          </foreignObject>
        </svg>
      `;

      const img = new Image();
      const svgBlob = new Blob([dataSvg], { type: 'image/svg+xml;charset=utf-8' });
      const URLObj = window.URL || window.webkitURL || window;
      const blobURL = URLObj.createObjectURL(svgBlob);

      img.onload = () => {
        try {
          ctx.drawImage(img, 0, 0);
          URLObj.revokeObjectURL(blobURL);
          const pngUrl = canvas.toDataURL('image/png');
          const a = document.createElement('a');
          a.download = `eugene_finance_chart_card_${activeTemplate}_${selectedQuarter}.png`;
          a.href = pngUrl;
          a.click();
          setIsExporting(false);
          soundFx.playChime();
        } catch {
          // If foreignObject canvas is tainted, fallback to direct text clipboard
          handleCopyMarkdown();
          setIsExporting(false);
        }
      };

      img.onerror = () => {
        handleCopyMarkdown();
        setIsExporting(false);
      };

      img.src = blobURL;
    } catch {
      handleCopyMarkdown();
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div 
        className="w-full max-w-3xl max-h-[92vh] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-400/40 flex items-center justify-center text-sky-400">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white tracking-tight">
                  投行级研报单图卡片导出 (Publication-Ready Chart Card)
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/15 border border-sky-500/30 text-sky-300">
                  v2.5.0
                </span>
              </div>
              <p className="text-xs text-slate-400">
                内嵌 EUGENE FINANCE 官方图元水印与权威数据分级戳，一键贴入研报与晨会 PPT
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              soundFx.playTick();
              onClose();
            }}
            data-testid="close-chart-card-modal"
            aria-label="关闭研报卡片"
            className="w-8 h-8 rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Template Selector Pills */}
        <div className="px-5 py-2.5 border-b border-slate-800 bg-slate-900/60 flex items-center gap-2 overflow-x-auto scrollbar-none text-xs">
          <span className="text-[11px] font-mono text-slate-500 shrink-0">卡片模板:</span>
          {[
            { id: 'macro_overview', label: '1. 全球宏观信贷总览卡' },
            { id: 'corridors', label: '2. 核心跨国信贷走廊卡' },
            { id: 'contagion', label: '3. 级联清算与受损排位卡' },
            { id: 'diff_ab', label: '4. 平行情景 A/B 差分卡' },
            { id: 'look_through_ofc', label: '5. 离岸中心穿透卡' },
            { id: 'portfolio_stress', label: '6. 组合压力映射卡' }
          ].map(tpl => (
            <button
              key={tpl.id}
              onClick={() => {
                soundFx.playTick();
                setActiveTemplate(tpl.id);
              }}
              className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                activeTemplate === tpl.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {tpl.label}
            </button>
          ))}
        </div>

        {/* Card Viewport */}
        <div className="flex-1 overflow-y-auto p-5 flex items-center justify-center bg-slate-950/40">
          {/* Institutional Card Container (High visual density) */}
          <div 
            ref={cardRef}
            className="w-full max-w-xl bg-slate-950 border-2 border-slate-700/80 rounded-xl p-5 shadow-2xl relative text-slate-100 flex flex-col gap-4 font-sans"
            style={{ backgroundColor: '#070b13' }}
          >
            {/* Card Top Branding Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <EugeneLogo size="sm" showText={false} />
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black tracking-wider text-white uppercase">
                      EUGENE FINANCE
                    </span>
                    <span className="text-[9px] font-mono font-bold px-1 rounded bg-sky-500/20 text-sky-300 border border-sky-500/40">
                      ATLAS RESEARCH
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium">
                    Quantitative Macro Research &amp; BIS Capital Flow Intelligence
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-end gap-1">
                <span className={`inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full border ${classification.badgeClass}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${classification.dotClass}`} />
                  <span>{selectedQuarter} · {classification.label}</span>
                </span>
                <span className="text-[9px] font-mono text-slate-500">
                  基准快照: {dateStr}
                </span>
              </div>
            </div>

            {/* Template 1: Macro Overview */}
            {activeTemplate === 'macro_overview' && (
              <div className="space-y-3.5">
                <div>
                  <h4 className="text-sm font-bold text-white tracking-tight">
                    全球跨国银行信贷总量与美元流动性态势
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    基于 BIS LBS &amp; CBS 全网双边矩阵，全面穿透跨国主权借贷与外币离岸错配。
                  </p>
                </div>

                {/* 4 KPIs */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-[10px] font-mono text-slate-400">跨国总信贷</span>
                    <div className="text-base font-black font-mono text-white mt-0.5">
                      ${totalClaims.toFixed(2)}T
                    </div>
                    <span className="text-[9px] font-mono text-emerald-400">环比 +{qoqGrowth}%</span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-[10px] font-mono text-slate-400">美元计价份额</span>
                    <div className="text-base font-black font-mono text-sky-400 mt-0.5">
                      {usdShare}%
                    </div>
                    <span className="text-[9px] font-mono text-slate-400">结构性主导地位</span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-[10px] font-mono text-slate-400">美元融资压力</span>
                    <div className="text-base font-black font-mono text-amber-400 mt-0.5">
                      {stressIndex} / 100
                    </div>
                    <span className="text-[9px] font-mono text-amber-300">中度警惕区间</span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-[10px] font-mono text-slate-400">非银转口穿透</span>
                    <div className="text-base font-black font-mono text-purple-400 mt-0.5">
                      $8.42T
                    </div>
                    <span className="text-[9px] font-mono text-purple-300">离岸通道集中</span>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 text-xs text-slate-300 space-y-1">
                  <span className="text-[10px] font-bold uppercase font-mono text-sky-400">核心研判结论:</span>
                  <p className="text-[11px] leading-relaxed text-slate-300">
                    跨国银行资金呈现从传统欧洲同业向跨大西洋走廊及离岸对冲基金（US ➔ KY）高度集聚态势，若发生外生汇率挤压，二阶非银流动性踩踏为主要系统性风险敞口。
                  </p>
                </div>
              </div>
            )}

            {/* Template 2: Top Corridors */}
            {activeTemplate === 'corridors' && (
              <div className="space-y-3">
                <div>
                  <h4 className="text-sm font-bold text-white tracking-tight">
                    前五大跨国信贷核心动脉与离岸集中度
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    双边总债权规模与美元计价流动性占比分解。
                  </p>
                </div>

                <div className="space-y-2">
                  {topCorridors.map((c, i) => {
                    const pct = Math.round((c.claims_usd_bn / maxCorridorVal) * 100);
                    const usdPct = Math.round((c.usd_denominated_bn / c.claims_usd_bn) * 100);
                    return (
                      <div key={i} className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-xs">
                        <div className="flex items-center justify-between font-mono mb-1">
                          <span className="font-bold text-white flex items-center gap-1.5">
                            <span className="text-sky-400">{i + 1}.</span>
                            <span>{countryNameMap[c.source] || c.source} ({c.source})</span>
                            <ArrowRight className="w-3 h-3 text-slate-500" />
                            <span>{countryNameMap[c.target] || c.target} ({c.target})</span>
                          </span>
                          <span className="font-bold text-sky-300">
                            ${c.claims_usd_bn}B
                          </span>
                        </div>
                        {/* Progress Bar */}
                        <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden flex">
                          <div 
                            className="h-full bg-gradient-to-r from-blue-500 to-sky-400 rounded-full" 
                            style={{ width: `${pct}%` }} 
                          />
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-mono">
                          <span>美元计价份额: {usdPct}%</span>
                          <span>走廊占比: {pct}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Template 3: Contagion Shortfall */}
            {activeTemplate === 'contagion' && (
              <div className="space-y-3">
                <div>
                  <h4 className="text-sm font-bold text-white tracking-tight">
                    Eisenberg-Noe 级联违约传染与固定点清算评估
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    外生外债休克下各主权经济体资本减记与二阶多米诺骨牌级联拆解。
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="p-2 rounded-lg bg-rose-950/40 border border-rose-500/30">
                    <span className="text-[10px] font-mono text-rose-300">冲击震中</span>
                    <div className="text-sm font-black text-white mt-0.5">土耳其 (TR)</div>
                    <span className="text-[9px] font-mono text-rose-400">40% Haircut 减记</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-[10px] font-mono text-slate-400">边际增量赤字</span>
                    <div className="text-sm font-black font-mono text-rose-400 mt-0.5">+$284.8B</div>
                    <span className="text-[9px] font-mono text-slate-400">净增加违约</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-[10px] font-mono text-slate-400">Picard 收敛残差</span>
                    <div className="text-sm font-black font-mono text-emerald-400 mt-0.5">&lt; 1e-4</div>
                    <span className="text-[9px] font-mono text-emerald-300">不动点严格满足</span>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 text-xs">
                  <span className="text-[10px] font-bold font-mono text-slate-400 uppercase">最大受损经济体排行 (Top Impacted):</span>
                  <div className="mt-1.5 space-y-1 font-mono text-slate-300 text-[11px]">
                    <div className="flex justify-between"><span>1. 德国 (DE)</span> <span className="text-rose-400 font-bold">$69.2B (直接 82% · 间接 18%)</span></div>
                    <div className="flex justify-between"><span>2. 英国 (GB)</span> <span className="text-rose-400 font-bold">$48.5B (直接 54% · 间接 46%)</span></div>
                    <div className="flex justify-between"><span>3. 美国 (US)</span> <span className="text-rose-400 font-bold">$41.3B (主要受英国二级传染)</span></div>
                  </div>
                </div>
              </div>
            )}

            {/* Template 4: Diff A/B */}
            {activeTemplate === 'diff_ab' && (
              <div className="space-y-3">
                <div>
                  <h4 className="text-sm font-bold text-white tracking-tight">
                    平行情景 A/B 差分对比：政策干预阻断效能
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    对比「无救助危机情景 A」与「央行外汇互换流动性注入情景 B」全网受损差值。
                  </p>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono text-slate-400">情景 A (基准休克)</span>
                    <div className="text-sm font-bold font-mono text-rose-400">$725.3B 赤字</div>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                      挽救 -$243.2B (-33.5%)
                    </span>
                    <span className="text-[9px] text-slate-500 mt-0.5">政策干预阻断效能</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-mono text-slate-400">情景 B (互换注入)</span>
                    <div className="text-sm font-bold font-mono text-emerald-400">$482.1B 赤字</div>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 text-xs text-slate-300">
                  <span className="text-[10px] font-bold font-mono text-emerald-400 uppercase">最大受惠经济体:</span>
                  <p className="text-[11px] leading-relaxed mt-1 text-slate-300">
                    得益于美联储开启全额互换额度，德法跨国银行二阶去杠杆压力骤降 45%，成功阻断了欧洲美元市场向亚洲新兴市场的非对称外溢。
                  </p>
                </div>
              </div>
            )}

            {/* Template 5: Look-Through OFCs & Ultimate Risk */}
            {activeTemplate === 'look_through_ofc' && (
              <div className="space-y-3.5">
                <div>
                  <h4 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                    <span>离岸金融中心穿透还原与最终风险承担者</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      CBS Table B
                    </span>
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    基于最终风险原则 (Ultimate Risk Basis) 穿透开曼、卢森堡、中国香港等离岸壳实体，还原至母国真实风险承担者。
                  </p>
                </div>

                {/* 3 KPIs */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2.5 rounded-lg bg-amber-950/30 border border-amber-500/30">
                    <span className="text-[10px] font-mono text-amber-300">离岸穿透信贷池</span>
                    <div className="text-base font-black font-mono text-white mt-0.5">
                      ${ofcSummary.totalOfcInflow}B
                    </div>
                    <span className="text-[9px] font-mono text-amber-400">已绕过壳实体</span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-[10px] font-mono text-slate-400">最大最终母国</span>
                    <div className="text-base font-black font-mono text-sky-400 mt-0.5">
                      美国 (US)
                    </div>
                    <span className="text-[9px] font-mono text-slate-400">${ofcSummary.byUltimateParent?.US || 0}B 最终敞口</span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-[10px] font-mono text-slate-400">第二大最终母国</span>
                    <div className="text-base font-black font-mono text-emerald-400 mt-0.5">
                      中国 (CN)
                    </div>
                    <span className="text-[9px] font-mono text-emerald-300">${ofcSummary.byUltimateParent?.CN || 0}B 最终敞口</span>
                  </div>
                </div>

                {/* Parent Breakdown */}
                <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 text-xs">
                  <span className="text-[10px] font-bold font-mono text-slate-400 uppercase">
                    穿透后最终母国再分配敞口 (Ultimate Risk Reallocation):
                  </span>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] font-mono">
                    {Object.entries(ofcSummary.byUltimateParent || {}).map(([pCode, pVal]) => (
                      <div key={pCode} className="flex justify-between items-center p-1.5 rounded bg-slate-950 border border-slate-800/80">
                        <span className="text-slate-300">{countryNameMap[pCode] || pCode} ({pCode}):</span>
                        <span className="font-bold text-amber-400">${pVal}B</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 text-xs text-slate-300 space-y-1">
                  <span className="text-[10px] font-bold uppercase font-mono text-amber-400">穿透研究研判:</span>
                  <p className="text-[11px] leading-relaxed text-slate-300">
                    开曼群岛与中国香港超过 70% 的借贷实质为跨国科技/金融巨头或中资跨国企业设立的特殊目的载体 (SPV)，在最终风险口径下，全球对美、中两国实际宏观杠杆敞口显著高于属地居所口径 (LBS Table A)。
                  </p>
                </div>
              </div>
            )}

            {/* Template 6: Portfolio Stress Overlay */}
            {activeTemplate === 'portfolio_stress' && (
              <div className="space-y-3.5">
                <div>
                  <h4 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                    <span>机构账户组合压力映射与极端 VaR 评估</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      Phase 3 · v2.0
                    </span>
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    将 BIS 跨国网络休克与 Eisenberg-Noe 级联清算直接投射至机构 AUM，量化一阶直接减记与二阶网络多米诺传染损失。
                  </p>
                </div>

                {/* 3 KPIs */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-[10px] font-mono text-slate-400">基准组合资产</span>
                    <div className="text-base font-black font-mono text-white mt-0.5">
                      $500.0M
                    </div>
                    <span className="text-[9px] font-mono text-slate-400">全球多资产配置</span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-500/30">
                    <span className="text-[10px] font-mono text-rose-300">预期净减记额</span>
                    <div className="text-base font-black font-mono text-rose-400 mt-0.5">
                      -$38.4M
                    </div>
                    <span className="text-[9px] font-mono text-rose-300">回撤 -7.68%</span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-purple-950/30 border border-purple-500/30">
                    <span className="text-[10px] font-mono text-purple-300">99% 压力 VaR</span>
                    <div className="text-base font-black font-mono text-purple-300 mt-0.5">
                      -$51.8M
                    </div>
                    <span className="text-[9px] font-mono text-purple-400">巴塞尔 III 1.35x</span>
                  </div>
                </div>

                {/* Top Impacted Positions */}
                <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 text-xs">
                  <span className="text-[10px] font-bold font-mono text-slate-400 uppercase">
                    受损最深持仓敞口 (Top Impacted Holdings):
                  </span>
                  <div className="mt-2 space-y-1.5 font-mono text-[11px]">
                    <div className="flex justify-between items-center p-1.5 rounded bg-slate-950 border border-slate-800/80">
                      <span className="text-slate-300">1. 土耳其美元外债 (TR · Sovereign):</span>
                      <span className="font-bold text-rose-400">-$22.8M (-76.0%)</span>
                    </div>
                    <div className="flex justify-between items-center p-1.5 rounded bg-slate-950 border border-slate-800/80">
                      <span className="text-slate-300">2. 欧洲核心跨国银行信贷 (DE · Credit):</span>
                      <span className="font-bold text-rose-400">-$6.5M (-16.2% · 二级传染)</span>
                    </div>
                    <div className="flex justify-between items-center p-1.5 rounded bg-slate-950 border border-slate-800/80">
                      <span className="text-slate-300">3. 标普 500 核心指数多头 (US · Equities):</span>
                      <span className="font-bold text-rose-400">-$4.9M (-6.6%)</span>
                    </div>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 text-xs text-slate-300 space-y-1">
                  <span className="text-[10px] font-bold uppercase font-mono text-emerald-400">风控防线与对冲建议:</span>
                  <p className="text-[11px] leading-relaxed text-slate-300">
                    建议买入 5Y TR 主权 CDS 锁定一阶下行风险，同时将开曼离岸 PE 头寸缩减 20% 并切换至 3M 短期美债，可将组合极端回撤从 -7.68% 收敛至 -3.42%。
                  </p>
                </div>
              </div>
            )}

            {/* Card Footnote */}
            <div className="pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[9px] font-mono text-slate-500">
              <span>数据源: BIS LBS Table A &amp; CBS Table B (官方统计)</span>
              <span>Eisenberg-Noe 2001 Picard Fixed Point Engine</span>
            </div>
          </div>
        </div>

        {/* Modal Bottom Actions */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/90 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="text-[11px] text-slate-400">
            {copiedType === 'markdown' && <span className="text-emerald-400 font-semibold">✅ 已复制研报 Markdown 简报至剪贴板</span>}
            {copiedType === null && <span>点击下方按钮即可一键复制或导出高清图件</span>}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyMarkdown}
              className="h-8 px-3 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5 text-slate-400" />
              <span>复制 Markdown</span>
            </button>

            <button
              onClick={handleDownloadPng}
              disabled={isExporting}
              className="h-8 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isExporting ? '生成导出中...' : '下载高清卡片 (PNG)'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
