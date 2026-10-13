import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as echarts from 'echarts';
import { GitCommit, Grid, Layers, Filter, Info, Download, ArrowRight } from 'lucide-react';

export default function BilateralRoutingMatrix({
  dataset,
  selectedQuarter,
  onSelectCountry
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

    // Generate dynamic links calibrated to selectedQuarter
    const stressFactor = (dataset.global_macro[currentQIdx]?.bis_usd_funding_stress_index || 35) / 50.0;
    
    // Tier 1 -> Tier 2
    links.push({ source: '美国 (US)', target: '开曼离岸中心 (KY)', value: Math.round(640 * (currencyFilter === 'usd_only' ? 0.95 : 1.0)) });
    links.push({ source: '美国 (US)', target: '伦敦离岸美元池 (GB)', value: Math.round(890 * (currencyFilter === 'usd_only' ? 0.9 : 1.0)) });
    links.push({ source: '日本 (JP)', target: '伦敦离岸美元池 (GB)', value: Math.round(520 * (currencyFilter === 'usd_only' ? 0.8 : 1.0)) });
    links.push({ source: '日本 (JP)', target: '新加坡亚洲美元 (SG)', value: Math.round(380 * (currencyFilter === 'usd_only' ? 0.75 : 1.0)) });
    links.push({ source: '英国 (GB)', target: '开曼离岸中心 (KY)', value: Math.round(580 * (currencyFilter === 'usd_only' ? 0.9 : 1.0)) });
    links.push({ source: '德国 (DE)', target: '卢森堡基金中继 (LU)', value: Math.round(340 * (currencyFilter === 'usd_only' ? 0.4 : 1.0)) });
    links.push({ source: '法国 (FR)', target: '卢森堡基金中继 (LU)', value: Math.round(310 * (currencyFilter === 'usd_only' ? 0.45 : 1.0)) });
    links.push({ source: '瑞士 (CH)', target: '伦敦离岸美元池 (GB)', value: Math.round(280 * (currencyFilter === 'usd_only' ? 0.7 : 1.0)) });

    // Tier 2 -> Tier 3
    links.push({ source: '开曼离岸中心 (KY)', target: '非银影子银行 (NBFIs)', value: Math.round(780 * (currencyFilter === 'usd_only' ? 0.92 : 1.0)) });
    links.push({ source: '开曼离岸中心 (KY)', target: '实体跨国企业 (Corporates)', value: Math.round(440 * (currencyFilter === 'usd_only' ? 0.88 : 1.0)) });
    links.push({ source: '伦敦离岸美元池 (GB)', target: '跨国银行同业 (Interbank)', value: Math.round(920 * (currencyFilter === 'usd_only' ? 0.85 : 1.0)) });
    links.push({ source: '伦敦离岸美元池 (GB)', target: '新兴市场与主权 (EM Sovereigns)', value: Math.round(410 * (currencyFilter === 'usd_only' ? 0.82 : 1.0) / stressFactor) });
    links.push({ source: '新加坡亚洲美元 (SG)', target: '实体跨国企业 (Corporates)', value: Math.round(260 * (currencyFilter === 'usd_only' ? 0.78 : 1.0)) });
    links.push({ source: '新加坡亚洲美元 (SG)', target: '新兴市场与主权 (EM Sovereigns)', value: Math.round(120 * (currencyFilter === 'usd_only' ? 0.75 : 1.0)) });
    links.push({ source: '香港跨境门户 (HK)', target: '实体跨国企业 (Corporates)', value: Math.round(360 * (currencyFilter === 'usd_only' ? 0.7 : 1.0)) });
    links.push({ source: '香港跨境门户 (HK)', target: '跨国银行同业 (Interbank)', value: Math.round(250 * (currencyFilter === 'usd_only' ? 0.75 : 1.0)) });
    links.push({ source: '卢森堡基金中继 (LU)', target: '非银影子银行 (NBFIs)', value: Math.round(420 * (currencyFilter === 'usd_only' ? 0.5 : 1.0)) });
    links.push({ source: '卢森堡基金中继 (LU)', target: '新兴市场与主权 (EM Sovereigns)', value: Math.round(230 * (currencyFilter === 'usd_only' ? 0.45 : 1.0)) });

    return { nodes, links };
  }, [currentQIdx, dataset.global_macro, currencyFilter]);

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
                    信贷路由流转规模: <b class="text-white text-sm">$${params.data.value} 亿</b>
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
                  双边银行债权敞口: <b class="font-mono text-white text-sm">$${val} 亿</b>
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

  const handleDownloadSnapshot = () => {
    if (!chartInstance.current) return;
    const url = chartInstance.current.getDataURL({
      type: 'png',
      pixelRatio: 2,
      backgroundColor: '#080c14'
    });
    const a = document.createElement('a');
    a.href = url;
    a.download = `bis_capital_routing_${subView}_${selectedQuarter}.png`;
    a.click();
  };

  return (
    <div className="glass-panel rounded-2xl p-5 shadow-2xl space-y-4">
      {/* Control Bar */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-3 gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
            {subView === 'sankey' ? <GitCommit className="w-5 h-5" /> : <Grid className="w-5 h-5" />}
          </div>
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              {subView === 'sankey' 
                ? '跨国资本多级路由桑基图 (Multi-Tier Capital Routing)' 
                : '双边借贷敞口全景热力矩阵 (Bilateral Exposure Matrix)'}
              <span className="text-[11px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                {selectedQuarter}
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              透视「出资母国 → 离岸转口中枢 → 实体借款部门」的资金穿透链路
            </p>
          </div>
        </div>

        {/* View Switchers */}
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setSubView('sankey')}
              className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
                subView === 'sankey'
                  ? 'bg-amber-600 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <GitCommit className="w-3.5 h-3.5" />
              <span>多级桑基路由图</span>
            </button>
            <button
              onClick={() => setSubView('heatmap')}
              className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
                subView === 'heatmap'
                  ? 'bg-amber-600 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>N×N 双边热力矩阵</span>
            </button>
          </div>

          <div className="h-5 w-px bg-slate-800 mx-1" />

          {/* Currency Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <Filter className="w-3.5 h-3.5 text-blue-400" />
            <select
              value={currencyFilter}
              onChange={(e) => setCurrencyFilter(e.target.value)}
              className="bg-slate-900 border border-slate-800 text-slate-200 px-2 py-1.5 rounded text-xs focus:outline-none focus:border-amber-500"
            >
              <option value="all">全币种计价</option>
              <option value="usd_only">仅追踪美元通道 (USD-Only)</option>
            </select>
          </div>

          <button
            onClick={handleDownloadSnapshot}
            className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
            title="导出高清图表 PNG"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Chart Canvas */}
      <div ref={chartRef} className="w-full h-[540px] rounded-lg overflow-hidden" />

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
    </div>
  );
}
