import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as echarts from 'echarts';
import { GitCommit, Grid, Layers, Filter, Info, Download, ArrowRight } from 'lucide-react';
import DataClassificationBadge from './DataClassificationBadge';
import { addWatermarkToDataUrl } from '../utils/exportWatermark';

export default function BilateralRoutingMatrix({
  dataset,
  selectedQuarter,
  onSelectCountry,
  onOpenAppendix
}) {
  const [subView, setSubView] = useState('sankey'); // 'sankey', 'heatmap'
  const [currencyFilter, setCurrencyFilter] = useState('all'); // 'all', 'usd_only'
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  const countries = dataset.countries || [];
  const currentLinks = (dataset.bilateral_matrix || {})[selectedQuarter] || [];
  const currentQIdx = dataset.quarters.indexOf(selectedQuarter);
  const lbsData = dataset.lbs_data || {};

  // Build Sankey Data: Creditors -> Conduits -> Sectors/Borrowers
  const sankeyData = useMemo(() => {
    const nodes = [];
    const links = [];
    const nodeSet = new Set();

    const addNode = (name, color, depth) => {
      if (!nodeSet.has(name)) {
        nodeSet.add(name);
        nodes.push({ name, itemStyle: { color }, depth });
      }
    };

    // Level 0: Major Creditors
    const majorCreditors = ['美国 (US)', '日本 (JP)', '德国 (DE)', '法国 (FR)', '英国 (GB)', '瑞士 (CH)'];
    majorCreditors.forEach(c => addNode(c, '#3b82f6', 0));

    // Level 1: Offshore / Intermediary Hubs
    const conduits = ['开曼离岸中心 (KY)', '伦敦离岸美元池 (GB)', '香港跨境门户 (HK)', '新加坡亚洲美元 (SG)', '卢森堡基金中继 (LU)'];
    conduits.forEach(c => addNode(c, '#f59e0b', 1));

    // Level 2: End Sectors & Regional Borrowers
    const borrowers = ['非银影子银行 (NBFIs)', '跨国银行同业 (Interbank)', '实体跨国企业 (Corporates)', '新兴市场与主权 (EM Sovereigns)'];
    borrowers.forEach(b => addNode(b, '#10b981', 2));

    // Generate dynamic links calibrated to selectedQuarter and real bilateral matrix
    const findLinkVal = (src, dst, fallback) => {
      const l = currentLinks.find(item => item.source === src && item.target === dst);
      if (!l) return fallback;
      return currencyFilter === 'usd_only' ? (l.usd_denominated_bn || Math.round(l.claims_usd_bn * 0.8)) : l.claims_usd_bn;
    };

    const stressFactor = (dataset.global_macro[currentQIdx]?.bis_usd_funding_stress_index || 35) / 50.0;
    
    // Tier 1 -> Tier 2 (Anchored to real bilateral matrix)
    links.push({ source: '美国 (US)', target: '开曼离岸中心 (KY)', value: findLinkVal('US', 'KY', 640) });
    links.push({ source: '美国 (US)', target: '伦敦离岸美元池 (GB)', value: findLinkVal('US', 'GB', 890) });
    links.push({ source: '日本 (JP)', target: '伦敦离岸美元池 (GB)', value: findLinkVal('JP', 'GB', 520) });
    links.push({ source: '日本 (JP)', target: '新加坡亚洲美元 (SG)', value: findLinkVal('JP', 'SG', 380) });
    links.push({ source: '英国 (GB)', target: '开曼离岸中心 (KY)', value: findLinkVal('GB', 'KY', 580) });
    links.push({ source: '德国 (DE)', target: '卢森堡基金中继 (LU)', value: findLinkVal('DE', 'LU', 340) });
    links.push({ source: '法国 (FR)', target: '卢森堡基金中继 (LU)', value: findLinkVal('FR', 'LU', 310) });
    links.push({ source: '瑞士 (CH)', target: '伦敦离岸美元池 (GB)', value: findLinkVal('CH', 'GB', 280) });

    // Tier 2 -> Tier 3
    links.push({ source: '开曼离岸中心 (KY)', target: '非银影子银行 (NBFIs)', value: Math.round(findLinkVal('KY', 'US', 780) * 0.7) });
    links.push({ source: '开曼离岸中心 (KY)', target: '实体跨国企业 (Corporates)', value: Math.round(findLinkVal('KY', 'GB', 440) * 0.5) });
    links.push({ source: '伦敦离岸美元池 (GB)', target: '跨国银行同业 (Interbank)', value: Math.round(findLinkVal('GB', 'US', 920) * 0.8) });
    links.push({ source: '伦敦离岸美元池 (GB)', target: '新兴市场与主权 (EM Sovereigns)', value: Math.round((findLinkVal('GB', 'TR', 210) + findLinkVal('GB', 'BR', 200)) / stressFactor) });
    links.push({ source: '新加坡亚洲美元 (SG)', target: '实体跨国企业 (Corporates)', value: Math.round(findLinkVal('SG', 'CN', 260) * 0.7) });
    links.push({ source: '新加坡亚洲美元 (SG)', target: '新兴市场与主权 (EM Sovereigns)', value: Math.round(findLinkVal('SG', 'IN', 120) * 0.8) });
    links.push({ source: '香港跨境门户 (HK)', target: '实体跨国企业 (Corporates)', value: Math.round(findLinkVal('HK', 'CN', 360) * 0.85) });
    links.push({ source: '香港跨境门户 (HK)', target: '跨国银行同业 (Interbank)', value: Math.round(findLinkVal('HK', 'GB', 250) * 0.75) });
    links.push({ source: '卢森堡基金中继 (LU)', target: '非银影子银行 (NBFIs)', value: Math.round(findLinkVal('LU', 'US', 420) * 0.6) });
    links.push({ source: '卢森堡基金中继 (LU)', target: '新兴市场与主权 (EM Sovereigns)', value: Math.round(findLinkVal('LU', 'BR', 230) * 0.5) });

    return { nodes, links };
  }, [currentQIdx, dataset.global_macro, currencyFilter, currentLinks]);

  // Build Heatmap Matrix Data: Creditor (Y) x Debtor (X)
  const heatmapData = useMemo(() => {
    // Select top 12 active jurisdictions
    const topCodes = ['US', 'GB', 'JP', 'DE', 'FR', 'CH', 'KY', 'SG', 'HK', 'CN', 'KR', 'BR'];
    const matrix = [];
    const linkMap = {};

    currentLinks.forEach(l => {
      linkMap[`${l.source}->${l.target}`] = currencyFilter === 'usd_only' ? l.usd_denominated_bn : l.claims_usd_bn;
    });

    topCodes.forEach((src, yIdx) => {
      topCodes.forEach((dst, xIdx) => {
        let val = linkMap[`${src}->${dst}`] || 0;
        matrix.push([xIdx, yIdx, val]);
      });
    });

    return {
      topCodes,
      names: topCodes.map(c => countries.find(item => item.code === c)?.name_zh || c),
      data: matrix
    };
  }, [currentLinks, countries, currencyFilter]);

  // Init chart
  useEffect(() => {
    if (!chartRef.current) return;
    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current, 'dark', { renderer: 'canvas' });
      const handleResize = () => chartInstance.current?.resize();
      window.addEventListener('resize', handleResize);
      return () => {
        window.removeEventListener('resize', handleResize);
        chartInstance.current?.dispose();
        chartInstance.current = null;
      };
    }
  }, []);

  // Update chart option
  useEffect(() => {
    if (!chartInstance.current) return;

    if (subView === 'sankey') {
      const option = {
        backgroundColor: 'transparent',
        tooltip: {
          trigger: 'item',
          triggerOn: 'mousemove',
          backgroundColor: 'rgba(10, 15, 30, 0.94)',
          borderColor: 'rgba(245, 158, 11, 0.4)',
          borderWidth: 1,
          padding: [10, 14],
          extraCssText: 'box-shadow: 0 12px 36px rgba(0,0,0,0.6); backdrop-filter: blur(12px); border-radius: 8px;',
          textStyle: { color: '#f8fafc', fontSize: 12 },
          formatter: (params) => {
            if (params.dataType === 'edge') {
              return `
                <div class="p-1 font-sans">
                  <div class="font-bold text-amber-400 mb-1 border-b border-slate-700/80 pb-1 flex items-center justify-between gap-4">
                    <span>${params.data.source} → ${params.data.target}</span>
                    <span class="text-[10px] text-slate-400 font-mono">资本路由跨度</span>
                  </div>
                  <div class="text-xs font-mono mt-1">
                    信贷路由流转规模: <b class="text-white text-sm">$${params.data.value >= 1000 ? `${(params.data.value / 1000).toFixed(2)}T` : `${params.data.value}B`} (${Math.round(params.data.value * 10).toLocaleString()} 亿美元)</b>
                  </div>
                </div>
              `;
            }
            return `<div class="p-1 font-bold text-white text-sm font-sans">${params.name}</div>`;
          }
        },
        series: [
          {
            type: 'sankey',
            layout: 'none',
            emphasis: { focus: 'adjacency' },
            data: sankeyData.nodes,
            links: sankeyData.links,
            orient: 'horizontal',
            nodeWidth: 16,
            nodeGap: 18,
            left: '5%',
            right: '12%',
            top: '8%',
            bottom: '8%',
            label: {
              color: '#e2e8f0',
              fontSize: 11,
              fontFamily: 'sans-serif'
            },
            lineStyle: {
              color: 'gradient',
              curveness: 0.5,
              opacity: 0.45
            }
          }
        ]
      };
      chartInstance.current.setOption(option, true);
    } else {
      // Heatmap view
      const maxVal = Math.max(...heatmapData.data.map(d => d[2]), 100);
      const option = {
        backgroundColor: 'transparent',
        tooltip: {
          position: 'top',
          backgroundColor: 'rgba(10, 15, 30, 0.94)',
          borderColor: 'rgba(245, 158, 11, 0.4)',
          borderWidth: 1,
          padding: [10, 14],
          extraCssText: 'box-shadow: 0 12px 36px rgba(0,0,0,0.6); backdrop-filter: blur(12px); border-radius: 8px;',
          textStyle: { color: '#f8fafc', fontSize: 12 },
          formatter: (p) => {
            const src = heatmapData.names[p.data[1]];
            const dst = heatmapData.names[p.data[0]];
            const val = p.data[2];
            return `
              <div class="p-1 font-sans">
                <div class="font-bold text-amber-400 border-b border-slate-700 pb-1 mb-1">
                  债权方: ${src} → 借款方: ${dst}
                </div>
                <div class="text-xs">
                  双边银行债权敞口: <b class="font-mono text-white text-sm">$${val >= 1000 ? `${(val / 1000).toFixed(2)}T` : `${val}B`} (${Math.round(val * 10).toLocaleString()} 亿美元)</b>
                </div>
              </div>
            `;
          }
        },
        grid: {
          top: '8%',
          bottom: '15%',
          left: '12%',
          right: '8%'
        },
        xAxis: {
          type: 'category',
          data: heatmapData.names,
          splitArea: { show: true },
          axisLabel: { color: '#94a3b8', fontSize: 10, rotate: 30 },
          axisLine: { lineStyle: { color: '#334155' } },
          name: '债务借受方 (Borrower Counterparty)',
          nameLocation: 'middle',
          nameGap: 38,
          nameTextStyle: { color: '#64748b', fontSize: 11 }
        },
        yAxis: {
          type: 'category',
          data: heatmapData.names,
          splitArea: { show: true },
          axisLabel: { color: '#94a3b8', fontSize: 10 },
          axisLine: { lineStyle: { color: '#334155' } },
          name: '债权出资方 (Creditor Bank)',
          nameTextStyle: { color: '#64748b', fontSize: 11 }
        },
        visualMap: {
          min: 0,
          max: maxVal,
          calculable: true,
          orient: 'horizontal',
          left: 'center',
          bottom: '2%',
          textStyle: { color: '#94a3b8', fontSize: 10 },
          inRange: {
            color: ['#0f172a', '#1e3a8a', '#2563eb', '#06b6d4', '#10b981', '#f59e0b', '#f43f5e']
          }
        },
        series: [
          {
            name: 'Bilateral Claims Matrix',
            type: 'heatmap',
            data: heatmapData.data,
            label: {
              show: true,
              formatter: (p) => p.data[2] > 0 ? `$${p.data[2]}` : '',
              fontSize: 9,
              color: '#ffffff'
            },
            emphasis: {
              itemStyle: {
                shadowBlur: 10,
                shadowColor: 'rgba(0, 0, 0, 0.8)'
              }
            }
          }
        ]
      };
      chartInstance.current.setOption(option, true);
    }
  }, [subView, sankeyData, heatmapData]);

  const handleDownloadSnapshot = async () => {
    if (!chartInstance.current) return;
    const rawUrl = chartInstance.current.getDataURL({
      type: 'png',
      pixelRatio: 2,
      backgroundColor: '#080c14'
    });
    const watermarkedUrl = await addWatermarkToDataUrl(
      rawUrl,
      selectedQuarter,
      subView === 'sankey' ? '资本多级路由桑基图' : '双边借贷敞口热力矩阵'
    );
    const a = document.createElement('a');
    a.href = watermarkedUrl;
    a.download = `bis_capital_routing_${subView}_${selectedQuarter}.png`;
    a.click();
  };

  return (
    <div className="glass-panel rounded-xl p-3.5 sm:p-4 shadow-2xl space-y-3">
      {/* Control Bar */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-2.5 gap-2.5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
            {subView === 'sankey' ? <GitCommit className="w-4 h-4" /> : <Grid className="w-4 h-4" />}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
                {subView === 'sankey' 
                  ? '跨国资本多级路由桑基图 (Multi-Tier Capital Routing)' 
                  : '双边借贷敞口全景热力矩阵 (Bilateral Exposure Matrix)'}
              </h2>
              <span className="text-[11px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                {selectedQuarter}
              </span>
              <DataClassificationBadge
                classification={selectedQuarter > '2026Q2' ? 'NOWCAST_PREDICTION' : 'MODEL_RECONSTRUCTED'}
                quarter={selectedQuarter}
                sourceText="BIS LBS / CBS 矩阵分配"
                methodText="最大熵 RAS 多级穿透分配算法"
                onOpenAppendix={onOpenAppendix}
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              透视「出资母国 → 离岸转口中枢 → 实体借款部门」的资金穿透链路 · 揭示跨辖区多级转口流向
            </p>
          </div>
        </div>

        {/* View Switchers */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="atlas-segmented text-xs">
            <button
              onClick={() => setSubView('sankey')}
              className={`h-7 px-2.5 rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                subView === 'sankey'
                  ? 'atlas-pill-active font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <GitCommit className="w-3.5 h-3.5" />
              <span>多级桑基路由图</span>
            </button>
            <button
              onClick={() => setSubView('heatmap')}
              className={`h-7 px-2.5 rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                subView === 'heatmap'
                  ? 'atlas-pill-active font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>N×N 双边热力矩阵</span>
            </button>
          </div>

          <div className="h-5 w-px bg-slate-800 mx-1 hidden sm:block" />

          {/* Currency Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <Filter className="w-3.5 h-3.5 text-blue-400" />
            <select
              value={currencyFilter}
              onChange={(e) => setCurrencyFilter(e.target.value)}
              className="bg-slate-900 border border-slate-800 text-slate-200 px-2 h-7 rounded text-xs focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="all">全币种计价</option>
              <option value="usd_only">仅追踪美元通道 (USD-Only)</option>
            </select>
          </div>

          <button
            onClick={handleDownloadSnapshot}
            className="h-7 w-7 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors flex items-center justify-center cursor-pointer"
            title="导出高清图表 PNG (自动嵌入官方/情景数据身份水印)"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Chart Canvas with Responsive Height */}
      <div ref={chartRef} className="w-full h-[calc(100vh-340px)] min-h-[350px] max-h-[600px] rounded-lg overflow-hidden" />

      {/* Analytical Footnote */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 text-xs text-slate-400 border-t border-slate-900">
        <div className="p-2.5 bg-slate-900/50 rounded-lg border border-slate-800/80">
          <strong className="text-blue-400">出资母国 (Creditor Tier): </strong>
          美日德法英为全球信贷流动源头，日本与德国提供长期经常账户顺差溢出的低成本资金。
        </div>
        <div className="p-2.5 bg-slate-900/50 rounded-lg border border-slate-800/80">
          <strong className="text-amber-400">离岸转口中枢 (Conduit Tier): </strong>
          开曼群岛与伦敦离岸美元池承接了超 60% 的跨境机构转口借贷，为对冲基金提供表外杠杆。
        </div>
        <div className="p-2.5 bg-slate-900/50 rounded-lg border border-slate-800/80">
          <strong className="text-emerald-400">最终借款部门 (Borrower Tier): </strong>
          非银影子银行 (NBFIs) 成为美元信贷最大的最终净吸收方，也是美联储紧缩周期中最脆弱的一环。
        </div>
      </div>

      <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-800 text-[11px] text-slate-400 flex flex-wrap items-center justify-between gap-2 font-mono">
        <div className="flex items-center gap-1.5 text-slate-300">
          <Info className="w-3.5 h-3.5 text-sky-400 shrink-0" />
          <span>穿透方法释义: 桑基图基于宏观国别资产负债分配与转口中枢权重推演，旨在描绘资本跨境多级路由格局，非微观逐笔清算追踪。</span>
        </div>
        {onOpenAppendix && (
          <button
            onClick={onOpenAppendix}
            className="text-sky-400 hover:text-sky-300 underline underline-offset-2 shrink-0 cursor-pointer"
          >
            查看方法论附录 →
          </button>
        )}
      </div>
    </div>
  );
}
