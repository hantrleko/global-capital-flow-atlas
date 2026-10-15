import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as echarts from 'echarts';
import { computeNetworkCentrality } from '../utils/macroScenarios';
import { 
  Share2, CircleDot, Activity, Award, BarChart3, 
  Shuffle, Download, Sparkles, Zap, Layers 
} from 'lucide-react';

export default function NetworkTopology({
  dataset,
  selectedQuarter,
  selectedCountry,
  onSelectCountry
}) {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  const [layoutType, setLayoutType] = useState('force'); // 'force', 'circular'
  const [minEdgeWeight, setMinEdgeWeight] = useState(80); // filter links < minEdgeWeight Bn

  const countries = dataset.countries || [];
  const currentLinks = (dataset.bilateral_matrix || {})[selectedQuarter] || [];

  // Compute graph theory centrality metrics
  const centralityMetrics = useMemo(() => {
    return computeNetworkCentrality(countries, currentLinks);
  }, [countries, currentLinks]);

  // Top intermediaries / hubs
  const topIntermediaries = useMemo(() => {
    return [...centralityMetrics]
      .sort((a, b) => b.intermediationScore - a.intermediationScore)
      .slice(0, 5);
  }, [centralityMetrics]);

  // Top creditors
  const topCreditors = useMemo(() => {
    return [...centralityMetrics]
      .sort((a, b) => b.outVolume - a.outVolume)
      .slice(0, 5);
  }, [centralityMetrics]);

  useEffect(() => {
    if (!chartRef.current) return;

    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current, 'dark', {
        renderer: 'canvas'
      });

      chartInstance.current.on('click', (params) => {
        if (params.dataType === 'node' && params.data && params.data.countryCode) {
          onSelectCountry(params.data.countryCode);
        }
      });

      let resizeTimer;
      const handleResize = () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
          chartInstance.current?.resize();
        }, 120);
      };
      window.addEventListener('resize', handleResize);
      return () => {
        window.removeEventListener('resize', handleResize);
        clearTimeout(resizeTimer);
        chartInstance.current?.dispose();
        chartInstance.current = null;
      };
    }
  }, []);

  useEffect(() => {
    if (!chartInstance.current) return;

    const filteredLinks = currentLinks.filter(l => l.claims_usd_bn >= minEdgeWeight);

    // Prepare graph nodes with luxury concentric styling
    const nodes = countries.map(c => {
      const metric = centralityMetrics.find(m => m.code === c.code) || {};
      const isSelected = selectedCountry === c.code;

      let catIndex = 0;
      let nodeThemeColor = '#38bdf8'; // Sky blue
      if (c.tier === 1) {
        catIndex = 0;
        nodeThemeColor = '#38bdf8';
      } else if (c.type === 'offshore_conduit' || c.type === 'interbank_hub') {
        catIndex = 1;
        nodeThemeColor = '#fbbf24'; // Champagne gold
      } else {
        catIndex = 2;
        nodeThemeColor = '#34d399'; // Emerald mint
      }

      // Proportional, balanced circle radius
      const radius = isSelected 
        ? Math.max(22, Math.sqrt(metric.totalVolume || 100) * 0.75) + 6 
        : Math.max(14, Math.sqrt(metric.totalVolume || 100) * 0.65);

      return {
        id: c.code,
        name: c.name_zh,
        countryCode: c.code,
        category: catIndex,
        symbolSize: radius,
        value: metric.totalVolume,
        outVol: metric.outVolume,
        inVol: metric.inVolume,
        interScore: metric.intermediationScore,
        tier: c.tier,
        desc: c.desc,
        itemStyle: {
          color: isSelected ? nodeThemeColor : 'rgba(15, 23, 42, 0.85)',
          borderColor: nodeThemeColor,
          borderWidth: isSelected ? 2.5 : 1.2,
          shadowBlur: isSelected ? 20 : 6,
          shadowColor: nodeThemeColor
        },
        label: {
          show: c.tier === 1 || isSelected || radius > 18,
          position: 'right',
          distance: 6,
          fontSize: 10,
          fontFamily: 'system-ui, -apple-system, sans-serif',
          color: isSelected ? '#ffffff' : '#94a3b8'
        }
      };
    });

    // Prepare edges: delicate filaments with directional curvature
    const edges = filteredLinks.map(l => {
      const isMajor = l.claims_usd_bn >= 300;
      const filamentColor = isMajor ? '#38bdf8' : 'rgba(148, 163, 184, 0.35)';

      return {
        id: `${l.source}->${l.target}`,
        source: l.source,
        target: l.target,
        value: l.claims_usd_bn,
        usdVol: l.usd_denominated_bn,
        lineStyle: {
          color: filamentColor,
          width: isMajor ? 1.8 : 1.0,
          opacity: isMajor ? 0.6 : 0.25,
          curveness: layoutType === 'circular' ? 0.3 : 0.15
        }
      };
    });

    const categories = [
      { name: '全球储备核心 (Global Core)', itemStyle: { color: '#38bdf8', borderColor: '#38bdf8' } },
      { name: '离岸/转口中枢 (Conduits & Hubs)', itemStyle: { color: '#fbbf24', borderColor: '#fbbf24' } },
      { name: '区域借贷实体 (Borrowers & Periphery)', itemStyle: { color: '#34d399', borderColor: '#34d399' } }
    ];

    const option = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(8, 12, 22, 0.92)',
        borderColor: 'rgba(255, 255, 255, 0.12)',
        borderWidth: 1,
        padding: [10, 14],
        extraCssText: 'backdrop-filter: blur(16px); box-shadow: 0 16px 36px -6px rgba(0,0,0,0.7); border-radius: 12px;',
        textStyle: { color: '#f8fafc', fontSize: 12 },
        formatter: (params) => {
          if (params.dataType === 'node') {
            const d = params.data;
            return `
              <div class="font-sans min-w-[210px]">
                <div class="flex items-center justify-between border-b border-white/10 pb-1.5 mb-2">
                  <span class="font-bold text-white">${d.name}</span>
                  <span class="font-mono text-xs text-sky-400 font-semibold">[${d.countryCode}]</span>
                </div>
                <div class="space-y-1 text-xs font-mono">
                  <div class="flex justify-between font-sans">
                    <span class="text-slate-400">总资金流转吞吐:</span>
                    <span class="font-bold text-white">$${d.value} 亿</span>
                  </div>
                  <div class="flex justify-between font-sans">
                    <span class="text-slate-400">对外总债权 (Outflow):</span>
                    <span class="text-emerald-400 font-semibold">$${d.outVol} 亿</span>
                  </div>
                  <div class="flex justify-between font-sans">
                    <span class="text-slate-400">对内受资 (Inflow):</span>
                    <span class="text-rose-400 font-semibold">$${d.inVol} 亿</span>
                  </div>
                  <div class="flex justify-between font-sans border-t border-white/5 pt-1 mt-1">
                    <span class="text-slate-400">网络中介度得分:</span>
                    <span class="text-amber-400 font-bold">${d.interScore} / 100</span>
                  </div>
                </div>
              </div>
            `;
          } else if (params.dataType === 'edge') {
            const e = params.data;
            return `
              <div class="font-sans text-xs min-w-[180px]">
                <div class="font-semibold text-white border-b border-white/10 pb-1 mb-1.5 flex items-center justify-between">
                  <span>${e.source} → ${e.target}</span>
                  <span class="text-[10px] text-sky-400 font-mono">有向信贷走廊</span>
                </div>
                <div class="grid grid-cols-2 gap-x-3 gap-y-1 font-mono">
                  <span class="text-slate-400 font-sans">双边规模:</span>
                  <span class="text-right text-white font-bold">$${e.value} 亿</span>
                  <span class="text-slate-400 font-sans">美元计价额:</span>
                  <span class="text-right text-emerald-400 font-semibold">$${e.usdVol} 亿</span>
                </div>
              </div>
            `;
          }
        }
      },
      legend: {
        data: categories.map(c => c.name),
        top: 8,
        textStyle: { color: '#94a3b8', fontSize: 11 }
      },
      animation: true,
      animationDuration: 600,
      animationDurationUpdate: 600,
      animationEasingUpdate: 'cubicOut',
      series: [
        {
          name: 'Global Financial Network',
          type: 'graph',
          layout: layoutType,
          circular: { rotateLabel: true },
          force: {
            repulsion: 420,
            gravity: 0.15,
            edgeLength: [80, 200],
            friction: 0.65
          },
          data: nodes,
          links: edges,
          categories: categories,
          roam: true,
          edgeSymbol: ['none', 'arrow'],
          edgeSymbolSize: [0, 5],
          emphasis: {
            focus: 'adjacency',
            lineStyle: {
              width: 3,
              opacity: 0.95,
              color: '#38bdf8'
            }
          }
        }
      ]
    };

    chartInstance.current.setOption(option, {
      notMerge: false,
      lazyUpdate: true
    });
  }, [currentLinks, countries, centralityMetrics, layoutType, minEdgeWeight, selectedCountry]);

  const handleExportPng = () => {
    if (!chartInstance.current) return;
    const url = chartInstance.current.getDataURL({
      type: 'png',
      pixelRatio: 2,
      backgroundColor: '#070a12'
    });
    const a = document.createElement('a');
    a.href = url;
    a.download = `BIS_Network_Topology_${selectedQuarter}.png`;
    a.click();
  };

  return (
    <div className="space-y-4">
      {/* Top Glass Command Bar */}
      <div className="glass-panel rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-400/25 flex items-center justify-center text-indigo-400">
            <Share2 className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm md:text-base font-semibold text-white tracking-wide">
                全球银行间跨境金融网络拓扑与中心度剖析
              </h2>
              <span className="text-[11px] font-mono bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full">
                {selectedQuarter}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              基于复杂网络图论 (Graph Centrality) 测算各司法管辖区的信贷中介度 (Brokerage) 与网络集聚度
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Layout Toggle */}
          <div className="flex items-center bg-slate-900/90 border border-slate-700/60 rounded-xl p-1 text-xs">
            <button
              onClick={() => setLayoutType('force')}
              className={`px-3 py-1.5 rounded-lg transition-all text-xs font-medium flex items-center gap-1.5 ${
                layoutType === 'force'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Shuffle className="w-3.5 h-3.5" /> 力导向布局 (Force)
            </button>
            <button
              onClick={() => setLayoutType('circular')}
              className={`px-3 py-1.5 rounded-lg transition-all text-xs font-medium flex items-center gap-1.5 ${
                layoutType === 'circular'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <CircleDot className="w-3.5 h-3.5" /> 环形层级布局 (Circular)
            </button>
          </div>

          {/* Min Edge Weight Filter Slider */}
          <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-700/60 rounded-xl px-3 py-1.5 text-xs">
            <span className="text-slate-400">门槛过滤:</span>
            <input
              type="range"
              min={20}
              max={300}
              step={10}
              value={minEdgeWeight}
              onChange={(e) => setMinEdgeWeight(parseInt(e.target.value, 10))}
              className="w-24 accent-sky-400 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
            />
            <span className="font-mono text-sky-400 font-semibold min-w-[50px]">&ge; ${minEdgeWeight}B</span>
          </div>

          {/* PNG Export */}
          <button
            onClick={handleExportPng}
            className="p-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-300 hover:text-white transition-colors"
            title="导出拓扑图 PNG"
          >
            <Download className="w-4 h-4 text-indigo-400" />
          </button>
        </div>
      </div>

      {/* Main Grid: Chart + Analytics Sidebars */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Left Network Graph Canvas */}
        <div className="lg:col-span-3 glass-panel rounded-2xl p-2 relative overflow-hidden shadow-2xl border border-white/[0.06] min-h-[580px] flex flex-col">
          <div 
            ref={chartRef} 
            className="w-full h-[580px] bg-[#070a12] cursor-grab active:cursor-grabbing" 
          />
        </div>

        {/* Right Analytics Sidebar: Top Centrality Leaders */}
        <div className="space-y-4 flex flex-col">
          {/* Top Brokerage Intermediaries */}
          <div className="glass-panel rounded-2xl p-4 flex-1">
            <div className="flex items-center gap-2 border-b border-white/5 pb-2 mb-3">
              <Award className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
                资金转口中介度排名前五 (Brokerage)
              </h3>
            </div>
            <div className="space-y-2">
              {topIntermediaries.map((item, idx) => (
                <div
                  key={item.code}
                  onClick={() => onSelectCountry?.(item.code)}
                  className="p-2.5 rounded-xl bg-slate-900/60 border border-white/5 hover:border-amber-400/40 hover:bg-slate-800/60 transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-amber-500/15 text-amber-300 font-mono text-[10px] font-bold flex items-center justify-center border border-amber-500/25">
                        {idx + 1}
                      </span>
                      <span className="font-medium text-white text-xs group-hover:text-amber-300 transition-colors">
                        {item.name_zh}
                      </span>
                      <span className="font-mono text-[10px] text-slate-500">[{item.code}]</span>
                    </div>
                    <span className="font-mono text-xs font-semibold text-amber-400">
                      {item.intermediationScore} 分
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-center justify-between text-[11px] font-mono text-slate-400">
                    <span className="font-sans">双向吞吐:</span>
                    <span className="text-white font-medium">${item.totalVolume} 亿</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Gross Creditors */}
          <div className="glass-panel rounded-2xl p-4 flex-1">
            <div className="flex items-center gap-2 border-b border-white/5 pb-2 mb-3">
              <Zap className="w-4 h-4 text-sky-400" />
              <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
                对外跨国净供给排名前五 (Creditors)
              </h3>
            </div>
            <div className="space-y-2">
              {topCreditors.map((item, idx) => (
                <div
                  key={item.code}
                  onClick={() => onSelectCountry?.(item.code)}
                  className="p-2.5 rounded-xl bg-slate-900/60 border border-white/5 hover:border-sky-400/40 hover:bg-slate-800/60 transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-sky-500/15 text-sky-300 font-mono text-[10px] font-bold flex items-center justify-center border border-sky-500/25">
                        {idx + 1}
                      </span>
                      <span className="font-medium text-white text-xs group-hover:text-sky-300 transition-colors">
                        {item.name_zh}
                      </span>
                      <span className="font-mono text-[10px] text-slate-500">[{item.code}]</span>
                    </div>
                    <span className="font-mono text-xs font-semibold text-sky-400">
                      ${item.outVolume} 亿
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-center justify-between text-[11px] font-mono text-slate-400">
                    <span className="font-sans">中介出度比:</span>
                    <span className="text-emerald-400 font-medium">
                      {Math.round((item.outVolume / (item.totalVolume || 1)) * 100)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
