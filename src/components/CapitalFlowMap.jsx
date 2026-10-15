import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as echarts from 'echarts';
import { 
  Layers, Eye, Filter, ArrowUpRight, ArrowDownLeft, 
  Info, Download, Target, Compass, Maximize2, Sparkles,
  Radio, Zap, Shield, Globe2, Sliders, Check, Calendar, TrendingUp,
  X, ArrowRight, DollarSign
} from 'lucide-react';

export default function CapitalFlowMap({
  dataset,
  selectedQuarter,
  onSelectQuarter,
  selectedCountry,
  onSelectCountry
}) {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const timelineChartRef = useRef(null);
  const timelineChartInstance = useRef(null);
  const corridorSparklineRef = useRef(null);
  const corridorSparklineInstance = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [selectedCorridor, setSelectedCorridor] = useState(null);

  // Density & View controls
  const [corridorDensity, setCorridorDensity] = useState('backbone'); // 'backbone' | 'all' | 'usd_dominant'
  const [metricView, setMetricView] = useState('claims'); // 'claims' | 'net' | 'liab'
  const [focusCountry, setFocusCountry] = useState('ALL'); // 'ALL' or countryCode
  const [geoPreset, setGeoPreset] = useState('global'); // 'global' | 'asia' | 'europe' | 'americas'
  const [showLabels, setShowLabels] = useState(true);

  const countries = dataset.countries || [];
  const countryMap = useMemo(() => Object.fromEntries(countries.map(c => [c.code, c])), [countries]);
  const lbsQuarter = dataset.lbs_data || {};
  const currentLinks = (dataset.bilateral_matrix || {})[selectedQuarter] || [];

  // Register world map
  useEffect(() => {
    const mapUrl = `${import.meta.env.BASE_URL}world.json`.replace('//', '/');
    fetch(mapUrl)
      .then(res => res.json())
      .then(geoJson => {
        echarts.registerMap('world', geoJson);
        setMapLoaded(true);
      })
      .catch(err => {
        console.error('Failed to load world.json:', err);
      });
  }, []);

  // Initialize ECharts instance
  useEffect(() => {
    if (!chartRef.current) return;

    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current, 'dark', {
        renderer: 'canvas'
      });

      chartInstance.current.on('click', (params) => {
        if (params.data && params.data.countryCode) {
          onSelectCountry(params.data.countryCode);
        } else if (params.seriesType === 'lines' && params.data && params.data.sourceCode) {
          setSelectedCorridor({
            source: params.data.sourceCode,
            target: params.data.targetCode,
            fromName: params.data.fromName,
            toName: params.data.toName,
            value: params.data.value,
            usdVol: params.data.usdVol
          });
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

  // Update chart options with elite aesthetic curation
  useEffect(() => {
    if (!chartInstance.current || !mapLoaded) return;

    const quarterIdx = dataset.quarters.indexOf(selectedQuarter);

    // Filter and curate bilateral links
    let filteredLinks = currentLinks.filter(l => {
      if (focusCountry !== 'ALL') {
        return l.source === focusCountry || l.target === focusCountry;
      }
      if (corridorDensity === 'backbone') {
        // High-aesthetic curated backbone (claims >= $160B)
        return l.claims_usd_bn >= 160;
      }
      if (corridorDensity === 'usd_dominant') {
        return (l.usd_denominated_bn / l.claims_usd_bn) >= 0.7;
      }
      return true; // 'all'
    });

    // Helper: calculate distance and directional curvature so round-trip lines don't collide
    const getCurveness = (srcCode, dstCode, srcLng, srcLat, dstLng, dstLat) => {
      const dx = srcLng - dstLng;
      const dy = srcLat - dstLat;
      const dist = Math.sqrt(dx * dx + dy * dy);
      // Gentle curve for short distances, graceful arc for transatlantic/transpacific
      const baseCurve = Math.min(0.28, Math.max(0.12, dist * 0.0028));
      // Invert sign based on alphabetical order so A->B and B->A curve into an elegant ellipse
      return srcCode < dstCode ? baseCurve : -baseCurve;
    };

    // Prepare line strokes
    const linesData = filteredLinks.map(l => {
      const src = countryMap[l.source];
      const dst = countryMap[l.target];
      if (!src || !dst) return null;

      const curveness = getCurveness(l.source, l.target, src.lng, src.lat, dst.lng, dst.lat);
      const isFocused = focusCountry !== 'ALL';
      const isMajor = l.claims_usd_bn >= 400;

      // Color scheme: refined luminous tones
      let strokeColor = '#38bdf8'; // Soft sky cyan
      if (isFocused) {
        strokeColor = l.source === focusCountry ? '#34d399' : '#f43f5e'; // Mint green outflow, soft rose inflow
      } else if (l.usd_denominated_bn / l.claims_usd_bn > 0.75) {
        strokeColor = '#60a5fa'; // Dollar blue
      } else {
        strokeColor = '#a78bfa'; // Soft iris purple
      }

      const strokeWidth = isMajor ? 2.0 : Math.max(0.9, Math.sqrt(l.claims_usd_bn) / 16);
      const strokeOpacity = isFocused ? 0.85 : isMajor ? 0.45 : 0.22;

      return {
        id: `${l.source}->${l.target}`,
        name: `${src.name_zh} → ${dst.name_zh}`,
        fromName: src.name_zh,
        toName: dst.name_zh,
        sourceCode: l.source,
        targetCode: l.target,
        coords: [
          [src.lng, src.lat],
          [dst.lng, dst.lat]
        ],
        value: l.claims_usd_bn,
        usdVol: l.usd_denominated_bn,
        lineStyle: {
          color: strokeColor,
          width: strokeWidth,
          opacity: strokeOpacity,
          curveness: curveness
        }
      };
    }).filter(Boolean);

    // Particle flow data (small pearl photons) - only animate primary arterial corridors to maximize rendering performance
    const particleData = linesData
      .filter(l => focusCountry !== 'ALL' || l.value >= 240)
      .map(l => ({
        id: `particle-${l.sourceCode}->${l.targetCode}`,
        name: l.name,
        fromName: l.fromName,
        toName: l.toName,
        sourceCode: l.sourceCode,
        targetCode: l.targetCode,
        coords: l.coords,
        value: l.value,
        usdVol: l.usdVol,
        lineStyle: {
          width: 0,
          opacity: 0,
          curveness: l.lineStyle.curveness
        }
      }));

    // Prepare node scatter data
    const haloNodes = [];
    const coreNodes = [];
    const rippleNodes = [];

    countries.forEach(c => {
      const qData = (lbsQuarter[c.code] || [])[quarterIdx] || {};
      const claims = qData.claims_usd_bn || c.base_claims;
      const liab = qData.liabilities_usd_bn || c.base_liab;
      const net = qData.net_position_usd_bn || (claims - liab);
      const isSelected = selectedCountry === c.code || focusCountry === c.code;

      let valForSize = claims;
      if (metricView === 'net') valForSize = Math.abs(net);
      else if (metricView === 'liab') valForSize = liab;

      // Refined color palette (quiet luxury tones)
      let themeColor = '#38bdf8'; // Core cyan
      if (c.type === 'offshore_conduit') {
        themeColor = '#fbbf24'; // Champagne gold
      } else if (net > 250) {
        themeColor = '#34d399'; // Emerald mint
      } else if (net < -250) {
        themeColor = '#fb7185'; // Soft rose
      }

      const haloSize = isSelected 
        ? Math.max(22, Math.sqrt(valForSize) * 0.75) + 10 
        : Math.max(12, Math.sqrt(valForSize) * 0.55);

      const coreSize = isSelected ? 8 : Math.max(4, Math.min(7, Math.sqrt(valForSize) * 0.15));

      // 1. Outer translucent halo ring
      haloNodes.push({
        id: `halo-${c.code}`,
        name: c.name_zh,
        countryCode: c.code,
        value: [c.lng, c.lat, valForSize],
        claims,
        liab,
        net,
        currency: qData.currency_breakdown || {},
        countryType: c.type,
        region: c.region,
        desc: c.desc,
        symbolSize: haloSize,
        itemStyle: {
          color: isSelected ? 'rgba(255, 255, 255, 0.25)' : 'rgba(15, 23, 42, 0.6)',
          borderColor: themeColor,
          borderWidth: isSelected ? 2.5 : 1.2,
          shadowBlur: isSelected ? 16 : 6,
          shadowColor: themeColor,
          opacity: isSelected ? 0.98 : 0.72
        }
      });

      // 2. Inner bright pearl center dot
      coreNodes.push({
        id: `core-${c.code}`,
        name: c.name_zh,
        countryCode: c.code,
        value: [c.lng, c.lat, valForSize],
        symbolSize: coreSize,
        itemStyle: {
          color: isSelected ? '#ffffff' : themeColor,
          shadowBlur: isSelected ? 16 : 8,
          shadowColor: isSelected ? '#ffffff' : themeColor
        },
        label: {
          show: showLabels && (c.tier === 1 || isSelected || focusCountry === c.code || haloSize > 18),
          position: 'right',
          distance: 6,
          formatter: `{b}`,
          fontSize: 10,
          fontWeight: isSelected ? 'bold' : 'normal',
          color: isSelected ? '#ffffff' : '#cbd5e1',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }
      });

      // 3. Eased calm ripple: ONLY for selected country or top global core (US/GB)
      if (isSelected || (focusCountry === 'ALL' && (c.code === 'US' || c.code === 'GB'))) {
        rippleNodes.push({
          id: `ripple-${c.code}`,
          name: c.name_zh,
          countryCode: c.code,
          value: [c.lng, c.lat, valForSize],
          symbolSize: haloSize * 0.8,
          itemStyle: {
            color: themeColor
          }
        });
      }
    });

    // Viewport presets
    let geoCenter = [15, 22];
    let geoZoom = 1.15;
    if (geoPreset === 'asia') {
      geoCenter = [105, 22];
      geoZoom = 2.2;
    } else if (geoPreset === 'europe') {
      geoCenter = [15, 50];
      geoZoom = 2.6;
    } else if (geoPreset === 'americas') {
      geoCenter = [-80, 20];
      geoZoom = 1.8;
    }

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
          if (params.seriesType === 'lines') {
            const data = params.data;
            return `
              <div class="font-sans min-w-[200px]">
                <div class="flex items-center justify-between border-b border-white/10 pb-1.5 mb-2">
                  <span class="font-semibold text-white">${data.fromName} → ${data.toName}</span>
                  <span class="text-[10px] text-sky-400 font-mono">双边信贷</span>
                </div>
                <div class="space-y-1 text-xs font-mono">
                  <div class="flex justify-between font-sans">
                    <span class="text-slate-400">债权规模:</span>
                    <span class="text-white font-bold">$${data.value} 亿</span>
                  </div>
                  <div class="flex justify-between font-sans">
                    <span class="text-slate-400">美元计价总额:</span>
                    <span class="text-emerald-400 font-semibold">$${data.usdVol} 亿</span>
                  </div>
                  <div class="flex justify-between font-sans">
                    <span class="text-slate-400">美元计价份额:</span>
                    <span class="text-slate-300 font-semibold">${Math.round((data.usdVol / data.value) * 100)}%</span>
                  </div>
                </div>
              </div>
            `;
          } else if (params.seriesType === 'scatter' && params.data.claims) {
            const d = params.data;
            const netSign = d.net >= 0 ? '+' : '';
            return `
              <div class="font-sans min-w-[230px]">
                <div class="flex items-center justify-between border-b border-white/10 pb-1.5 mb-2">
                  <span class="font-bold text-white text-sm">${d.name} <span class="text-xs text-sky-400 font-mono">(${d.countryCode})</span></span>
                  <span class="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-slate-300 font-mono">${d.region}</span>
                </div>
                <div class="text-[11px] text-slate-400 mb-2 leading-relaxed font-sans">${d.desc}</div>
                <div class="space-y-1 text-xs border-t border-white/5 pt-1.5 font-mono">
                  <div class="flex justify-between font-sans">
                    <span class="text-slate-400">跨国银行总债权:</span>
                    <span class="text-white font-bold">$${d.claims} 亿</span>
                  </div>
                  <div class="flex justify-between font-sans">
                    <span class="text-slate-400">跨国银行总负债:</span>
                    <span class="text-white font-bold">$${d.liab} 亿</span>
                  </div>
                  <div class="flex justify-between font-sans">
                    <span class="text-slate-400">净外部头寸 (Net):</span>
                    <span class="font-bold ${d.net >= 0 ? 'text-emerald-400' : 'text-rose-400'}">
                      ${netSign}$${d.net} 亿
                    </span>
                  </div>
                  <div class="flex justify-between font-sans">
                    <span class="text-slate-400">美元计价份额:</span>
                    <span class="text-emerald-400 font-semibold">${d.currency.USD || 0}%</span>
                  </div>
                </div>
              </div>
            `;
          }
          return '';
        }
      },
      animation: true,
      animationDuration: 600,
      animationDurationUpdate: 600,
      animationEasingUpdate: 'cubicOut',
      geo: {
        map: 'world',
        roam: true,
        zoom: geoZoom,
        center: geoCenter,
        aspectScale: 0.85,
        itemStyle: {
          // Velvet luxury dark landmass
          areaColor: '#0a101d',
          borderColor: '#19243a',
          borderWidth: 0.8
        },
        emphasis: {
          itemStyle: {
            areaColor: '#121b2f',
            borderColor: '#38bdf8',
            borderWidth: 1.2
          },
          label: { show: false }
        }
      },
      series: [
        // 1. Refined Luminous Geodesic Filaments (Interactive Canvas Layer 1)
        {
          name: 'Filaments',
          type: 'lines',
          coordinateSystem: 'geo',
          zlevel: 1,
          silent: false,
          emphasis: {
            focus: 'self',
            lineStyle: {
              width: 3.2,
              opacity: 0.95,
              shadowBlur: 12,
              shadowColor: '#38bdf8'
            }
          },
          data: linesData
        },
        // 2. Concentric Halo Rings (Static Canvas Layer 1 - Never repainted on tick)
        {
          name: 'Halos',
          type: 'scatter',
          coordinateSystem: 'geo',
          zlevel: 1,
          data: haloNodes,
          silent: true
        },
        // 3. Crisp Pearl Core Nodes & Typography (Static Canvas Layer 1 - Never repainted on tick)
        {
          name: 'Cores',
          type: 'scatter',
          coordinateSystem: 'geo',
          zlevel: 1,
          data: coreNodes,
          emphasis: {
            scale: 1.4
          }
        },
        // 4. Photon Eased Particles (Isolated Animated Canvas Layer 2)
        {
          name: 'Photons',
          type: 'lines',
          coordinateSystem: 'geo',
          zlevel: 2,
          silent: true,
          effect: {
            show: true,
            period: 6.0, // Calm, eased glide
            trailLength: 0.16, // Subtle meteor tail
            symbol: 'circle',
            symbolSize: 3.0,
            color: 'rgba(255, 255, 255, 0.92)'
          },
          lineStyle: {
            width: 0,
            opacity: 0
          },
          data: particleData
        },
        // 5. Eased Calm Radar Pulse (Isolated Animated Canvas Layer 2)
        {
          name: 'Calm Pulse',
          type: 'effectScatter',
          coordinateSystem: 'geo',
          zlevel: 2,
          silent: true,
          rippleEffect: {
            brushType: 'stroke',
            scale: 2.2,
            period: 5.0
          },
          data: rippleNodes
        }
      ]
    };

    chartInstance.current.setOption(option, {
      notMerge: false,
      lazyUpdate: true
    });
  }, [selectedQuarter, selectedCountry, corridorDensity, metricView, mapLoaded, focusCountry, geoPreset, showLabels]);

  // Full 28-Quarter Macro Historical Scrubber Chart (2018Q1 - 2024Q4)
  useEffect(() => {
    if (!timelineChartRef.current) return;
    if (!timelineChartInstance.current) {
      timelineChartInstance.current = echarts.init(timelineChartRef.current, 'dark');
      timelineChartInstance.current.on('click', (params) => {
        if (params.name && onSelectQuarter) {
          onSelectQuarter(params.name);
        }
      });
    }

    const quarters = dataset.quarters || [];
    const macroList = dataset.global_macro || [];
    const claimsData = macroList.map(m => parseFloat(((m.total_cross_border_claims_usd_bn || 0) / 1000).toFixed(2)));
    const usdCreditData = macroList.map(m => parseFloat(((m.total_usd_cross_border_bn || 0) / 1000).toFixed(2)));
    const stressData = macroList.map(m => m.bis_usd_funding_stress_index || 0);

    const option = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        borderColor: '#334155',
        textStyle: { color: '#f8fafc', fontSize: 12 },
        axisPointer: { type: 'cross', lineStyle: { color: '#64748b' } },
        formatter: (params) => {
          const q = params[0].name;
          const m = macroList.find(x => x.quarter === q) || {};
          return `
            <div class="font-bold text-white mb-1">${q} (点击直接加载该季度)</div>
            <div class="text-xs text-sky-300">全球跨境总债权: <span class="font-mono font-bold">$${((m.total_cross_border_claims_usd_bn || 0) / 1000).toFixed(2)}T</span></div>
            <div class="text-xs text-emerald-300">美元计价总额: <span class="font-mono font-bold">$${((m.total_usd_cross_border_bn || 0) / 1000).toFixed(2)}T (${m.global_usd_share_pct || 0}%)</span></div>
            <div class="text-xs text-amber-300">美元融资压力: <span class="font-mono font-bold">${m.bis_usd_funding_stress_index || 0}</span></div>
            <div class="text-[10px] text-slate-400 mt-1">环比增速: ${m.global_qoq_growth_pct || 0}%</div>
          `;
        }
      },
      legend: {
        data: ['全球跨境总债权 ($T)', '美元计价跨境信贷 ($T)', '美元融资压力指数'],
        textStyle: { color: '#94a3b8', fontSize: 11 },
        top: 0
      },
      grid: {
        left: '2%',
        right: '2%',
        top: '18%',
        bottom: '8%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: quarters,
        axisLine: { lineStyle: { color: '#334155' } },
        axisLabel: { 
          color: (val) => val === selectedQuarter ? '#38bdf8' : '#64748b',
          fontWeight: (val) => val === selectedQuarter ? 'bold' : 'normal',
          fontSize: 10
        }
      },
      yAxis: [
        {
          type: 'value',
          name: '万亿美元 (USD Trillion)',
          position: 'left',
          min: 24,
          axisLine: { lineStyle: { color: '#334155' } },
          splitLine: { lineStyle: { color: 'rgba(51, 65, 85, 0.25)', type: 'dashed' } },
          axisLabel: { color: '#94a3b8', formatter: '${value}T' }
        },
        {
          type: 'value',
          name: '融资压力 (0-100)',
          position: 'right',
          max: 100,
          axisLine: { lineStyle: { color: '#334155' } },
          splitLine: { show: false },
          axisLabel: { color: '#f59e0b', formatter: '{value}' }
        }
      ],
      series: [
        {
          name: '全球跨境总债权 ($T)',
          type: 'line',
          yAxisIndex: 0,
          data: claimsData,
          smooth: true,
          symbolSize: 6,
          lineStyle: { width: 3, color: '#38bdf8' },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(56, 189, 248, 0.25)' },
              { offset: 1, color: 'rgba(56, 189, 248, 0.0)' }
            ])
          },
          markLine: {
            silent: true,
            symbol: 'none',
            lineStyle: { color: '#ffffff', width: 2, type: 'solid' },
            data: [
              { xAxis: selectedQuarter, label: { show: true, formatter: '当前季度: {b}', position: 'start', color: '#ffffff', fontSize: 10, backgroundColor: '#0284c7', padding: [2, 6], borderRadius: 4 } }
            ]
          }
        },
        {
          name: '美元计价跨境信贷 ($T)',
          type: 'line',
          yAxisIndex: 0,
          data: usdCreditData,
          smooth: true,
          symbolSize: 4,
          lineStyle: { width: 2, color: '#10b981', type: 'dashed' }
        },
        {
          name: '美元融资压力指数',
          type: 'bar',
          yAxisIndex: 1,
          data: stressData,
          itemStyle: {
            color: (params) => params.value > 65 ? '#ef4444' : params.value > 45 ? '#f59e0b' : '#334155',
            opacity: 0.55,
            borderRadius: [4, 4, 0, 0]
          }
        }
      ]
    };

    timelineChartInstance.current.setOption(option, { notMerge: false, lazyUpdate: true });

    const handleResize = () => timelineChartInstance.current?.resize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [selectedQuarter, dataset, onSelectQuarter]);

  // Corridor 28-Quarter History Sparkline
  const corridorHistory = useMemo(() => {
    if (!selectedCorridor) return [];
    const quarters = dataset.quarters || [];
    const bMatrix = dataset.bilateral_matrix || {};
    return quarters.map(q => {
      const links = bMatrix[q] || [];
      const link = links.find(l => l.source === selectedCorridor.source && l.target === selectedCorridor.target);
      return {
        quarter: q,
        claims: link ? link.claims_usd_bn : 0,
        usdVol: link ? link.usd_denominated_bn : 0
      };
    });
  }, [selectedCorridor, dataset]);

  // Current active corridor stats dynamically synchronized with selectedQuarter
  const activeCorridorStats = useMemo(() => {
    if (!selectedCorridor) return null;
    const link = currentLinks.find(l => l.source === selectedCorridor.source && l.target === selectedCorridor.target);
    return {
      ...selectedCorridor,
      value: link ? link.claims_usd_bn : selectedCorridor.value,
      usdVol: link ? link.usd_denominated_bn : selectedCorridor.usdVol
    };
  }, [selectedCorridor, currentLinks]);

  useEffect(() => {
    if (!selectedCorridor) {
      if (corridorSparklineInstance.current) {
        corridorSparklineInstance.current.dispose();
        corridorSparklineInstance.current = null;
      }
      return;
    }
    if (!corridorSparklineRef.current) return;
    if (!corridorSparklineInstance.current) {
      corridorSparklineInstance.current = echarts.init(corridorSparklineRef.current, 'dark');
    }

    const quarters = corridorHistory.map(h => h.quarter);
    const claims = corridorHistory.map(h => h.claims);
    const usd = corridorHistory.map(h => h.usdVol);

    const option = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        borderColor: '#334155',
        textStyle: { color: '#f8fafc', fontSize: 11 },
        formatter: (params) => {
          const q = params[0].name;
          const cVal = params[0].value;
          const uVal = params[1]?.value || 0;
          return `
            <div class="font-bold text-white mb-1">${q}</div>
            <div class="text-xs text-sky-400">总债权: $${cVal} 亿</div>
            <div class="text-xs text-emerald-400">美元计价: $${uVal} 亿 (${Math.round((uVal / Math.max(1, cVal)) * 100)}%)</div>
          `;
        }
      },
      grid: { left: '2%', right: '2%', top: '8%', bottom: '14%', containLabel: true },
      xAxis: {
        type: 'category',
        data: quarters,
        axisLine: { lineStyle: { color: '#334155' } },
        axisLabel: { color: '#64748b', fontSize: 9, interval: 4 }
      },
      yAxis: {
        type: 'value',
        axisLine: { lineStyle: { color: '#334155' } },
        splitLine: { lineStyle: { color: 'rgba(51, 65, 85, 0.25)', type: 'dashed' } },
        axisLabel: { color: '#64748b', fontSize: 9, formatter: '${value}B' }
      },
      series: [
        {
          name: '双边总债权',
          type: 'line',
          smooth: true,
          data: claims,
          itemStyle: { color: '#38bdf8' },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(56, 189, 248, 0.35)' },
              { offset: 1, color: 'rgba(56, 189, 248, 0.0)' }
            ])
          },
          markLine: {
            silent: true,
            symbol: 'none',
            data: [{ xAxis: selectedQuarter, lineStyle: { color: '#ffffff', type: 'dashed' } }]
          }
        },
        {
          name: '美元计价额',
          type: 'line',
          smooth: true,
          data: usd,
          itemStyle: { color: '#10b981' }
        }
      ]
    };

    corridorSparklineInstance.current.setOption(option);
    setTimeout(() => {
      corridorSparklineInstance.current?.resize();
    }, 40);

    const handleResize = () => corridorSparklineInstance.current?.resize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [selectedCorridor, corridorHistory, selectedQuarter]);

  const handleExportPng = () => {
    if (!chartInstance.current) return;
    const url = chartInstance.current.getDataURL({
      type: 'png',
      pixelRatio: 2,
      backgroundColor: '#060913'
    });
    const a = document.createElement('a');
    a.href = url;
    a.download = `BIS_Global_Capital_Flow_Map_${selectedQuarter}.png`;
    a.click();
  };

  return (
    <div className="space-y-4">
      {/* Top Refined Glass Control Header */}
      <div className="glass-panel rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-400/25 flex items-center justify-center text-sky-400">
            <Radio className="w-4 h-4 animate-pulse text-sky-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm md:text-base font-semibold text-white tracking-wide">
                全球双边跨国信贷流向图谱
              </h2>
              <span className="text-[11px] font-mono bg-sky-500/10 text-sky-300 border border-sky-500/30 px-2 py-0.5 rounded-full">
                {selectedQuarter}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              光子速率与测地线弧宽映射 BIS 官方居住地统计 (LBS) · 优雅双向曲率杜绝重叠乱线
            </p>
          </div>
        </div>

        {/* Refined Functional Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Corridor Density Curation Toggle */}
          <div className="flex items-center bg-slate-900/90 border border-slate-700/60 rounded-xl p-1 text-xs">
            {[
              { id: 'backbone', label: '骨干网络 (Top 16)' },
              { id: 'usd_dominant', label: '美元主导走廊' },
              { id: 'all', label: '全量走廊 (40对)' }
            ].map(d => (
              <button
                key={d.id}
                onClick={() => setCorridorDensity(d.id)}
                className={`px-2.5 py-1 rounded-lg transition-all text-xs font-medium ${
                  corridorDensity === d.id
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>

          {/* Focus Country Isolation */}
          <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-700/60 rounded-xl px-2.5 py-1.5 text-xs">
            <Target className="w-3.5 h-3.5 text-sky-400" />
            <select
              value={focusCountry}
              onChange={(e) => setFocusCountry(e.target.value)}
              className="bg-transparent text-white font-medium focus:outline-none cursor-pointer"
            >
              <option value="ALL">🌐 全局穿透视角</option>
              {countries.map(c => (
                <option key={c.code} value={c.code}>
                  {c.name_zh} ({c.code})
                </option>
              ))}
            </select>
          </div>

          {/* Node Size Metric Switcher */}
          <div className="flex items-center bg-slate-900/90 border border-slate-700/60 rounded-xl p-1 text-xs">
            {[
              { id: 'claims', label: '总债权' },
              { id: 'liab', label: '总负债' },
              { id: 'net', label: '净头寸' }
            ].map(m => (
              <button
                key={m.id}
                onClick={() => setMetricView(m.id)}
                className={`px-2.5 py-1 rounded-lg transition-all text-xs font-medium ${
                  metricView === m.id
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Toggle Labels */}
          <button
            onClick={() => setShowLabels(!showLabels)}
            className={`px-2.5 py-1.5 rounded-xl border text-xs transition-colors ${
              showLabels
                ? 'bg-slate-800 border-slate-600 text-white'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
            }`}
            title="显示或隐藏节点地名文字"
          >
            {showLabels ? '标签: 开启' : '标签: 极简'}
          </button>

          {/* Export PNG */}
          <button
            onClick={handleExportPng}
            className="p-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-300 hover:text-white transition-colors"
            title="导出当前高清无损地图 PNG"
          >
            <Download className="w-4 h-4 text-sky-400" />
          </button>
        </div>
      </div>

      {/* Main Map Canvas */}
      <div className="glass-panel rounded-2xl relative overflow-hidden shadow-2xl border border-white/[0.06] min-h-[640px] flex flex-col">
        {/* Ocean Background Canvas with deep velvet atmosphere */}
        <div 
          ref={chartRef} 
          className="w-full h-[640px] bg-[#070a12] cursor-grab active:cursor-grabbing" 
        />

        {/* Floating Viewport Preset Pills (Bottom-Left) */}
        <div className="absolute bottom-5 left-5 z-20 flex items-center gap-1.5 bg-slate-950/80 backdrop-blur-md border border-white/10 rounded-xl p-1.5 text-xs shadow-xl">
          <span className="text-[11px] text-slate-400 px-2 flex items-center gap-1">
            <Compass className="w-3.5 h-3.5 text-sky-400" /> 区域聚焦:
          </span>
          {[
            { id: 'global', label: '全球轨道' },
            { id: 'asia', label: '亚太环' },
            { id: 'europe', label: '泛欧网络' },
            { id: 'americas', label: '美洲中枢' }
          ].map(p => (
            <button
              key={p.id}
              onClick={() => setGeoPreset(p.id)}
              className={`px-2.5 py-1 rounded-lg transition-all text-xs font-medium ${
                geoPreset === p.id
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Floating Focus Mode Banner (Top-Left) */}
        {focusCountry !== 'ALL' && (
          <div className="absolute top-4 left-4 z-20 flex items-center gap-2.5 bg-slate-950/90 backdrop-blur-md border border-sky-500/40 px-3.5 py-1.5 rounded-xl shadow-2xl animate-in fade-in slide-in-from-top-1 duration-200">
            <Target className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
            <span className="text-xs text-white">
              已隔离该国双边管道: <strong className="text-sky-300 font-mono">{countryMap[focusCountry]?.name_zh || focusCountry} ({focusCountry})</strong>
            </span>
            <button
              onClick={() => setFocusCountry('ALL')}
              className="text-[11px] text-sky-400 hover:text-white underline ml-1 cursor-pointer font-medium"
            >
              重置全网视角
            </button>
          </div>
        )}

        {/* Floating Corridor Deep-Dive Inspector HUD Card (Top-Right) */}
        {activeCorridorStats && (
          <div className="absolute top-4 right-4 z-30 w-80 sm:w-96 bg-slate-950/92 backdrop-blur-xl border border-sky-500/35 rounded-2xl p-4 shadow-[0_20px_50px_rgba(0,0,0,0.85)] animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5 mb-3">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded-lg bg-sky-500/20 text-sky-400">
                  <ArrowRight className="w-4 h-4" />
                </span>
                <div>
                  <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                    <span>{activeCorridorStats.fromName}</span>
                    <span className="text-slate-400">→</span>
                    <span>{activeCorridorStats.toName}</span>
                  </div>
                  <div className="text-[10px] font-mono text-sky-400">
                    {activeCorridorStats.source} → {activeCorridorStats.target} 跨境信贷走廊
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedCorridor(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                title="关闭该走廊透视卡片"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Metric Cards */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="bg-slate-900/80 rounded-xl p-2.5 border border-white/5">
                <div className="text-[10px] text-slate-400">{selectedQuarter} 跨国债权</div>
                <div className="text-sm font-bold text-white font-mono mt-0.5">
                  ${activeCorridorStats.value} <span className="text-[10px] font-normal text-slate-400">亿 USD</span>
                </div>
              </div>
              <div className="bg-slate-900/80 rounded-xl p-2.5 border border-white/5">
                <div className="text-[10px] text-slate-400">美元计价总额</div>
                <div className="text-sm font-bold text-emerald-400 font-mono mt-0.5">
                  ${activeCorridorStats.usdVol} <span className="text-[10px] font-normal text-slate-400">亿 ({Math.round((activeCorridorStats.usdVol / Math.max(1, activeCorridorStats.value)) * 100)}%)</span>
                </div>
              </div>
            </div>

            {/* Sparkline Header */}
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="text-slate-300 font-medium flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-sky-400" /> 28 季度双边信贷走廊演进趋势
              </span>
              <span className="text-[10px] font-mono text-slate-400">2018Q1 - 2024Q4</span>
            </div>

            {/* Sparkline Canvas */}
            <div ref={corridorSparklineRef} className="w-full h-32 bg-slate-900/50 rounded-xl border border-white/5" />

            {/* Quick Actions */}
            <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-white/5">
              <button
                onClick={() => setFocusCountry(activeCorridorStats.source)}
                className="flex-1 py-1.5 px-2 rounded-lg bg-sky-600/25 hover:bg-sky-600/40 text-sky-200 border border-sky-500/30 text-[11px] font-medium transition-colors flex items-center justify-center gap-1"
                title={`隔离并只展示 ${activeCorridorStats.fromName} 的全部进出管道`}
              >
                <Target className="w-3.5 h-3.5" />
                聚焦 {activeCorridorStats.source}
              </button>
              <button
                onClick={() => setFocusCountry(activeCorridorStats.target)}
                className="flex-1 py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-medium transition-colors flex items-center justify-center gap-1"
                title={`隔离并只展示 ${activeCorridorStats.toName} 的全部进出管道`}
              >
                <Target className="w-3.5 h-3.5" />
                聚焦 {activeCorridorStats.target}
              </button>
            </div>
          </div>
        )}

        {/* Floating Minimalist Legend (Bottom-Right) */}
        <div className="absolute bottom-5 right-5 z-20 bg-slate-950/80 backdrop-blur-md border border-white/10 rounded-xl p-3 text-xs shadow-xl space-y-1.5 hidden md:block">
          <div className="text-[10px] font-mono uppercase text-slate-400 mb-1 tracking-wider border-b border-white/5 pb-1">
            图谱符号体系 (Symbology)
          </div>
          <div className="flex items-center gap-2 text-[11px]">
            <span className="w-2.5 h-2.5 rounded-full border border-sky-400 bg-sky-400/20" />
            <span className="text-slate-300">储备货币核心 (Global Core)</span>
          </div>
          <div className="flex items-center gap-2 text-[11px]">
            <span className="w-2.5 h-2.5 rounded-full border border-amber-400 bg-amber-400/20" />
            <span className="text-slate-300">离岸转口中介 (Offshore Conduit)</span>
          </div>
          <div className="flex items-center gap-2 text-[11px]">
            <span className="w-2.5 h-2.5 rounded-full border border-emerald-400 bg-emerald-400/20" />
            <span className="text-slate-300">对外净债权国 (Net Creditor &gt; $250B)</span>
          </div>
          <div className="flex items-center gap-2 text-[11px]">
            <span className="w-2.5 h-2.5 rounded-full border border-rose-400 bg-rose-400/20" />
            <span className="text-slate-300">对外净负债国 (Net Debtor &lt; -$250B)</span>
          </div>
        </div>
      </div>

      {/* Integrated 28-Quarter Full Historical Scrubber & Macro Trend Panel */}
      <div className="glass-panel rounded-2xl p-4 md:p-5 shadow-xl border border-white/[0.06] space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-white/[0.06] pb-3">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-sky-500/15 border border-sky-500/30 text-sky-400">
              <TrendingUp className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                28 个季度官方时间序列全息穿透 (2018Q1 - 2024Q4)
                <span className="text-[11px] font-mono text-sky-300 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/30">
                  当前处于: {selectedQuarter}
                </span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                点击折线或柱状图任意季度，地图将以 60 FPS 动态重算并变形为该季度的真实双边信贷网络
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs font-mono text-slate-400 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800">
            <span>总跨度: 7 年 / 28 季</span>
            <span className="text-slate-600">·</span>
            <span>最新总量: $37.13 万亿</span>
          </div>
        </div>

        {/* ECharts Scrubber Chart */}
        <div ref={timelineChartRef} className="w-full h-44" />
      </div>
    </div>
  );
}
