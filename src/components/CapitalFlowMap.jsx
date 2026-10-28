import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as echarts from 'echarts';
import GlobalFlowGlobe3D from './GlobalFlowGlobe3D';
import MethodologyFootnote from './MethodologyFootnote';
import DataClassificationBadge from './DataClassificationBadge';
import MobileFilterDrawer from './MobileFilterDrawer';
import MobileInspectCard from './MobileInspectCard';
import { addWatermarkToDataUrl } from '../utils/exportWatermark';
import soundFx from '../utils/soundEffects';
import { normalizeCorridorExposures } from '../utils/eisenbergNoeClearing';
import { 
  Layers, Eye, Filter, ArrowUpRight, ArrowDownLeft, 
  Info, Download, Target, Compass, Maximize2, Sparkles,
  Radio, Zap, Shield, Globe2, Sliders, Check, Calendar, TrendingUp,
  X, ArrowRight, DollarSign, Globe, RotateCcw
} from 'lucide-react';

export default function CapitalFlowMap({
  dataset,
  selectedQuarter,
  onSelectQuarter,
  selectedCountry,
  onSelectCountry,
  selectedCurrency = 'USD',
  onOpenAppendix
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
  const [mapProjection, setMapProjection] = useState('2d'); // '2d' | '3d'
  const [corridorDensity, setCorridorDensity] = useState('backbone'); // 'backbone' | 'all' | 'usd_dominant'
  const [flowMode, setFlowMode] = useState('positions'); // 'positions' (期末存量) | 'flows' (季度调整后变动)
  const [metricView, setMetricView] = useState('claims'); // 'claims' | 'net' | 'liab'
  const [focusCountry, setFocusCountry] = useState('ALL'); // 'ALL' or countryCode
  const [geoPreset, setGeoPreset] = useState('global'); // 'global' | 'asia' | 'europe' | 'americas'
  const [showLabels, setShowLabels] = useState(true);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [inspectedEntity, setInspectedEntity] = useState(null);

  const countries = dataset.countries || [];
  const countryMap = useMemo(() => Object.fromEntries(countries.map(c => [c.code, c])), [countries]);
  const lbsQuarter = dataset.lbs_data || {};
  const rawCurrentLinks = (dataset.bilateral_matrix || {})[selectedQuarter] || [];
  const currentLinks = useMemo(() => {
    return normalizeCorridorExposures(rawCurrentLinks).normalizedLinks;
  }, [rawCurrentLinks]);

  // Compute QoQ Flows / Changes relative to prior quarter
  const quarterIdx = dataset.quarters ? dataset.quarters.indexOf(selectedQuarter) : -1;
  const prevQuarter = quarterIdx > 0 ? dataset.quarters[quarterIdx - 1] : null;
  const rawPrevLinks = prevQuarter ? ((dataset.bilateral_matrix || {})[prevQuarter] || []) : [];
  const prevLinks = useMemo(() => {
    return normalizeCorridorExposures(rawPrevLinks).normalizedLinks;
  }, [rawPrevLinks]);
  const prevLinksMap = useMemo(() => {
    return new Map(prevLinks.map(l => [`${l.source}->${l.target}`, l]));
  }, [prevLinks]);

  const linksWithFlow = useMemo(() => {
    return currentLinks.map(l => {
      const prevL = prevLinksMap.get(`${l.source}->${l.target}`);
      const prevClaims = prevL ? prevL.claims_usd_bn : l.claims_usd_bn;
      const netChange = prevL ? Math.round((l.claims_usd_bn - prevClaims) * 10) / 10 : 0;
      const netChangePct = (prevL && prevClaims > 0) ? Math.round(((l.claims_usd_bn - prevClaims) / prevClaims) * 1000) / 10 : 0;
      return {
        ...l,
        prevClaims,
        netChange,
        netChangePct,
        isExpansion: netChange >= 0
      };
    });
  }, [currentLinks, prevLinksMap]);

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
          const cCode = params.data.countryCode;
          const matchedCountry = countryMap[cCode] || {};
          setInspectedEntity({
            type: 'country',
            data: {
              code: cCode,
              name_zh: matchedCountry.name_zh || cCode,
              name: matchedCountry.name || cCode,
              claims: params.data.claims,
              liab: params.data.liab,
              net: params.data.net,
              currency: params.data.currency || {}
            }
          });
          onSelectCountry(cCode);
        } else if (params.seriesType === 'lines' && params.data && params.data.sourceCode) {
          const corr = {
            source: params.data.sourceCode,
            target: params.data.targetCode,
            fromName: params.data.fromName,
            toName: params.data.toName,
            claims_usd_bn: params.data.value,
            usd_denominated_bn: params.data.usdVol,
            usdShare: params.data.value > 0 ? Math.round((params.data.usdVol / params.data.value) * 100) : 0
          };
          setSelectedCorridor(corr);
          setInspectedEntity({
            type: 'corridor',
            data: corr
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

  // Keyboard accessibility: Escape clears active corridor inspection and resets country focus
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (selectedCorridor) {
          setSelectedCorridor(null);
        }
        if (focusCountry !== 'ALL') {
          setFocusCountry('ALL');
        }
        if (selectedCountry && onSelectCountry) {
          onSelectCountry(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCorridor, focusCountry, selectedCountry, onSelectCountry]);

  // Update chart options with elite aesthetic curation
  useEffect(() => {
    if (!chartInstance.current || !mapLoaded) return;

    const quarterIdx = dataset.quarters.indexOf(selectedQuarter);

    // Filter and curate bilateral links
    let filteredLinks = linksWithFlow.filter(l => {
      if (focusCountry !== 'ALL') {
        return l.source === focusCountry || l.target === focusCountry;
      }
      if (flowMode === 'flows') {
        if (corridorDensity === 'backbone') {
          return Math.abs(l.netChange) >= 10;
        }
        if (corridorDensity === 'usd_dominant') {
          return (l.usd_denominated_bn / Math.max(1, l.claims_usd_bn)) >= 0.7;
        }
        return true;
      } else {
        if (corridorDensity === 'backbone') {
          return l.claims_usd_bn >= 160;
        }
        if (corridorDensity === 'usd_dominant') {
          return (l.usd_denominated_bn / Math.max(1, l.claims_usd_bn)) >= 0.7;
        }
        return true;
      }
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

      let strokeColor = '#38bdf8'; // Soft sky cyan
      let strokeWidth = 1.0;
      let strokeOpacity = 0.35;

      if (flowMode === 'flows') {
        // Flows Mode: Color distinguishes between credit expansion (mint) vs contraction/repayment (rose)
        const isExp = l.netChange >= 0;
        strokeColor = isExp ? '#34d399' : '#fb7185';
        const absChg = Math.abs(l.netChange);
        strokeWidth = Math.max(1.1, Math.min(3.4, Math.sqrt(absChg) / 2.8));
        strokeOpacity = isFocused ? 0.9 : absChg >= 25 ? 0.7 : 0.35;
      } else {
        // Positions Mode: Color distinguishes currency / focus
        const isMajor = l.claims_usd_bn >= 400;
        if (isFocused) {
          strokeColor = l.source === focusCountry ? '#34d399' : '#f43f5e';
        } else if (l.usd_denominated_bn / l.claims_usd_bn > 0.75) {
          strokeColor = '#60a5fa';
        } else {
          strokeColor = '#a78bfa';
        }
        strokeWidth = isMajor ? 2.0 : Math.max(0.9, Math.sqrt(l.claims_usd_bn) / 16);
        strokeOpacity = isFocused ? 0.85 : isMajor ? 0.45 : 0.22;
      }

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
        netChange: l.netChange,
        netChangePct: l.netChangePct,
        isExpansion: l.isExpansion,
        prevClaims: l.prevClaims,
        lineStyle: {
          color: strokeColor,
          width: strokeWidth,
          opacity: strokeOpacity,
          curveness: curveness
        }
      };
    }).filter(Boolean);

    // Particle flow data (small pearl photons)
    // In flows mode, if netChange < 0, particles flow in return direction representing deleveraging/repatriation!
    const particleData = linesData
      .filter(l => {
        if (flowMode === 'flows') {
          return focusCountry !== 'ALL' || Math.abs(l.netChange) >= 12;
        }
        return focusCountry !== 'ALL' || l.value >= 240;
      })
      .map(l => {
        const reverseParticle = flowMode === 'flows' && !l.isExpansion;
        return {
          id: `particle-${l.sourceCode}->${l.targetCode}`,
          name: l.name,
          fromName: l.fromName,
          toName: l.toName,
          sourceCode: l.sourceCode,
          targetCode: l.targetCode,
          coords: reverseParticle ? [l.coords[1], l.coords[0]] : l.coords,
          value: l.value,
          usdVol: l.usdVol,
          netChange: l.netChange,
          netChangePct: l.netChangePct,
          isExpansion: l.isExpansion,
          lineStyle: {
            width: 0,
            opacity: 0,
            curveness: reverseParticle ? -l.lineStyle.curveness : l.lineStyle.curveness
          }
        };
      });

    // Prepare node scatter data
    const haloNodes = [];
    const coreNodes = [];
    const rippleNodes = [];

    countries.forEach(c => {
      const qData = (lbsQuarter[c.code] || [])[quarterIdx] || {};
      const claims = qData.claims_usd_bn || 0;
      const liab = qData.liabilities_usd_bn || 0;
      const net = qData.net_position_usd_bn !== undefined ? qData.net_position_usd_bn : (claims - liab);
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

      // In global overview, prioritize key global hubs to prevent European clutter
      const isKeyGlobalHub = ['US', 'GB', 'CN', 'JP', 'DE', 'KY', 'SG', 'HK'].includes(c.code);
      const shouldShowLabel = showLabels && (
        isSelected ||
        focusCountry === c.code ||
        (geoPreset === 'europe' && c.region === 'Europe') ||
        (geoPreset === 'asia' && c.region === 'Asia') ||
        (focusCountry === 'ALL' && isKeyGlobalHub)
      );

      // Position labels away from dense corridor convergences
      let labelPos = 'right';
      if (c.code === 'US') labelPos = 'left';
      else if (c.code === 'GB') labelPos = 'top';
      else if (c.code === 'DE') labelPos = 'bottom';
      else if (c.code === 'JP') labelPos = 'right';
      else if (c.code === 'CN') labelPos = 'top';
      else if (c.code === 'HK') labelPos = 'bottom';
      else if (c.code === 'KY') labelPos = 'bottom';
      else if (c.code === 'SG') labelPos = 'bottom';

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
          show: shouldShowLabel,
          position: labelPos,
          distance: 6,
          formatter: `{b}`,
          fontSize: 11,
          fontWeight: isSelected ? 'bold' : 'normal',
          color: isSelected ? '#ffffff' : '#e2e8f0',
          textBorderColor: '#060a12',
          textBorderWidth: 3,
          fontFamily: 'system-ui, -apple-system, sans-serif'
        },
        labelLayout: {
          hideOverlap: true,
          moveOverlap: 'shiftY'
        }
      });

      // 3. Eased calm ripple: delicate outline stroke (never solid opaque block)
      if (isSelected || (focusCountry === 'ALL' && (c.code === 'US' || c.code === 'GB'))) {
        rippleNodes.push({
          id: `ripple-${c.code}`,
          name: c.name_zh,
          countryCode: c.code,
          value: [c.lng, c.lat, valForSize],
          symbolSize: 8,
          itemStyle: {
            color: isSelected ? '#38bdf8' : themeColor
          }
        });
      }
    });

    // Viewport presets: centered and scaled to eliminate empty voids with mobile responsiveness
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    let geoCenter = isMobile ? [15, 25] : [15, 20];
    let geoZoom = isMobile ? 1.05 : 1.30;
    if (geoPreset === 'asia') {
      geoCenter = [105, 22];
      geoZoom = isMobile ? 1.8 : 2.4;
    } else if (geoPreset === 'europe') {
      geoCenter = [15, 50];
      geoZoom = isMobile ? 2.2 : 2.8;
    } else if (geoPreset === 'americas') {
      geoCenter = [-80, 20];
      geoZoom = isMobile ? 1.6 : 2.0;
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
            if (flowMode === 'flows') {
              const isExp = data.isExpansion;
              const changeSign = data.netChange > 0 ? '+' : data.netChange < 0 ? '-' : '';
              const absChange = Math.abs(data.netChange);
              const pctSign = data.netChangePct > 0 ? '+' : '';
              return `
                <div class="font-sans min-w-[220px]">
                  <div class="flex items-center justify-between border-b border-white/10 pb-1.5 mb-2">
                    <span class="font-semibold text-white">${data.fromName} ⇋ ${data.toName}</span>
                    <span class="text-[10px] ${isExp ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' : 'text-rose-400 bg-rose-500/10 border-rose-500/30'} font-mono px-1.5 py-0.5 rounded border">
                      ${isExp ? '信贷净扩张 (Net Inflow)' : '去杠杆偿还 (Net Outflow)'}
                    </span>
                  </div>
                  <div class="space-y-1.5 text-xs font-mono">
                    <div class="flex justify-between font-sans">
                      <span class="text-slate-400">季度净变动:</span>
                      <span class="font-bold ${isExp ? 'text-emerald-400' : 'text-rose-400'}">
                        ${changeSign}$${absChange}B (${changeSign}${Math.round(absChange * 10).toLocaleString()} 亿美元)
                      </span>
                    </div>
                    <div class="flex justify-between font-sans">
                      <span class="text-slate-400">环比变动率:</span>
                      <span class="text-slate-300 font-semibold">${pctSign}${data.netChangePct}%</span>
                    </div>
                    <div class="flex justify-between font-sans">
                      <span class="text-slate-400">当期未偿存量:</span>
                      <span class="text-white font-bold">
                        ${data.value >= 1000 ? `$${(data.value / 1000).toFixed(2)}T` : `$${data.value}B`}
                        <span class="text-[10px] text-slate-400 font-normal">(${Math.round(data.value * 10).toLocaleString()} 亿美元)</span>
                      </span>
                    </div>
                    <div class="flex justify-between font-sans">
                      <span class="text-slate-400">美元计价份额:</span>
                      <span class="text-slate-300 font-semibold">${Math.round((data.usdVol / Math.max(1, data.value)) * 100)}%</span>
                    </div>
                    <div class="text-[10px] text-slate-500 border-t border-white/5 pt-1 mt-1 font-sans">
                      口径: 相邻季度未调整存量变化 ΔClaims (未剔除汇率与断点)
                    </div>
                  </div>
                </div>
              `;
            }

            return `
              <div class="font-sans min-w-[200px]">
                <div class="flex items-center justify-between border-b border-white/10 pb-1.5 mb-2">
                  <span class="font-semibold text-white">${data.fromName} → ${data.toName}</span>
                  <span class="text-[10px] text-sky-400 bg-sky-500/10 border border-sky-500/30 font-mono px-1.5 py-0.5 rounded">未偿存量</span>
                </div>
                <div class="space-y-1 text-xs font-mono">
                  <div class="flex justify-between font-sans">
                    <span class="text-slate-400">债权存量规模:</span>
                    <span class="text-white font-bold">
                      ${data.value >= 1000 ? `$${(data.value / 1000).toFixed(2)}T` : `$${data.value}B`}
                      <span class="text-[10px] text-slate-400 font-normal">(${Math.round(data.value * 10).toLocaleString()} 亿美元)</span>
                    </span>
                  </div>
                  <div class="flex justify-between font-sans">
                    <span class="text-slate-400">美元计价总额:</span>
                    <span class="text-emerald-400 font-semibold">
                      ${data.usdVol >= 1000 ? `$${(data.usdVol / 1000).toFixed(2)}T` : `$${data.usdVol}B`}
                      <span class="text-[10px] text-slate-400 font-normal">(${Math.round(data.usdVol * 10).toLocaleString()} 亿美元)</span>
                    </span>
                  </div>
                  <div class="flex justify-between font-sans">
                    <span class="text-slate-400">美元计价份额:</span>
                    <span class="text-slate-300 font-semibold">${Math.round((data.usdVol / Math.max(1, data.value)) * 100)}%</span>
                  </div>
                  <div class="text-[10px] text-slate-500 border-t border-white/5 pt-1 mt-1 font-sans">
                    口径: BIS LBS 申报国未偿跨境债权存量资产 (Positions)
                  </div>
                </div>
              </div>
            `;
          } else if (params.seriesType === 'scatter' && params.data.claims) {
            const d = params.data;
            const netSign = d.net > 0 ? '+' : (d.net < 0 ? '-' : '');
            const absNet = Math.abs(d.net);
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
                    <span class="text-white font-bold">
                      ${d.claims >= 1000 ? `$${(d.claims / 1000).toFixed(2)}T` : `$${d.claims}B`}
                      <span class="text-[10px] text-slate-400 font-normal">(${Math.round(d.claims * 10).toLocaleString()} 亿美元)</span>
                    </span>
                  </div>
                  <div class="flex justify-between font-sans">
                    <span class="text-slate-400">跨国银行总负债:</span>
                    <span class="text-white font-bold">
                      ${d.liab >= 1000 ? `$${(d.liab / 1000).toFixed(2)}T` : `$${d.liab}B`}
                      <span class="text-[10px] text-slate-400 font-normal">(${Math.round(d.liab * 10).toLocaleString()} 亿美元)</span>
                    </span>
                  </div>
                  <div class="flex justify-between font-sans">
                    <span class="text-slate-400">净外部头寸 (Net):</span>
                    <span class="font-bold ${d.net >= 0 ? 'text-emerald-400' : 'text-rose-400'}">
                      ${netSign}${absNet >= 1000 ? `$${(absNet / 1000).toFixed(2)}T` : `$${absNet}B`}
                      <span class="text-[10px] font-normal">(${netSign}${Math.round(absNet * 10).toLocaleString()} 亿美元)</span>
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
        scaleLimit: { min: 0.8, max: 6.0 },
        layoutCenter: ['50%', '52%'],
        layoutSize: isMobile ? '98%' : '126%',
        zoom: geoZoom,
        center: geoCenter,
        aspectScale: isMobile ? 0.78 : 0.84,
        itemStyle: {
          // Velvet luxury dark landmass with subtle border definition
          areaColor: '#0c1322',
          borderColor: '#1e293b',
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
            period: flowMode === 'flows' ? 5.2 : 6.0, // Calm, eased glide
            trailLength: 0.16, // Subtle meteor tail
            symbol: 'circle',
            symbolSize: flowMode === 'flows' ? 3.4 : 3.0,
            color: flowMode === 'flows'
              ? (p) => (p && p.data && p.data.isExpansion ? '#34d399' : '#fb7185')
              : 'rgba(255, 255, 255, 0.92)'
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
            scale: 2.8,
            period: 4.5
          },
          data: rippleNodes
        }
      ]
    };

    chartInstance.current.setOption(option, {
      notMerge: true,
      lazyUpdate: true
    });
  }, [selectedQuarter, selectedCountry, corridorDensity, metricView, mapLoaded, focusCountry, geoPreset, showLabels, flowMode, linksWithFlow, dataset?.datasetRevision]);

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

  // Top 5 Bilateral Corridors for the selected quarter (Positions vs Flows)
  const topCorridors = useMemo(() => {
    if (flowMode === 'flows') {
      return [...linksWithFlow]
        .sort((a, b) => Math.abs(b.netChange) - Math.abs(a.netChange))
        .slice(0, 5)
        .map(l => ({
          ...l,
          fromName: countryMap[l.source]?.name_zh || l.source,
          toName: countryMap[l.target]?.name_zh || l.target,
          usdShare: Math.round((l.usd_denominated_bn / Math.max(1, l.claims_usd_bn)) * 100)
        }));
    }
    return [...currentLinks]
      .sort((a, b) => b.claims_usd_bn - a.claims_usd_bn)
      .slice(0, 5)
      .map(l => ({
        ...l,
        fromName: countryMap[l.source]?.name_zh || l.source,
        toName: countryMap[l.target]?.name_zh || l.target,
        usdShare: Math.round((l.usd_denominated_bn / Math.max(1, l.claims_usd_bn)) * 100)
      }));
  }, [flowMode, linksWithFlow, currentLinks, countryMap]);

  // Global net creditor and debtor poles
  const netPositions = useMemo(() => {
    const list = countries.map(c => {
      const qData = (lbsQuarter[c.code] || [])[dataset.quarters.indexOf(selectedQuarter)] || {};
      const claims = qData.claims_usd_bn || 0;
      const liab = qData.liabilities_usd_bn || 0;
      const net = qData.net_position_usd_bn !== undefined ? qData.net_position_usd_bn : (claims - liab);
      return {
        code: c.code,
        name: c.name_zh,
        region: c.region,
        net,
        claims,
        liab
      };
    });
    const creditors = [...list].filter(x => x.net > 0).sort((a, b) => b.net - a.net).slice(0, 3);
    const debtors = [...list].filter(x => x.net < 0).sort((a, b) => a.net - b.net).slice(0, 3);
    return { creditors, debtors };
  }, [countries, lbsQuarter, selectedQuarter, dataset.quarters]);

  // Key Systemic Jurisdictions for quick filtering
  const SYSTEMIC_JURISDICTIONS = ['US', 'CN', 'GB', 'JP', 'DE', 'CH', 'FR', 'SG', 'KY', 'HK'];

  // Pivotal Macro Historical Epochs
  const MACRO_EPOCHS = [
    { label: '联储缩表', quarter: '2018Q4', tag: '加息顶峰' },
    { label: '疫情危机', quarter: '2020Q1', tag: '流动性海啸' },
    { label: '供给再通胀', quarter: '2021Q2', tag: '信贷扩张' },
    { label: '强美元紧缩', quarter: '2022Q3', tag: 'DXY 114' },
    { label: '硅谷银行风暴', quarter: '2023Q1', tag: 'SVB/瑞信' },
    { label: '日元套息巨震', quarter: '2024Q3', tag: 'BOJ加息' },
    { label: '全球降息周期', quarter: '2024Q4', tag: '官方审计' },
    { label: '跨境信贷破46T', quarter: '2025Q4', tag: '基准审计' },
    { label: 'SDMX确证47.6T', quarter: '2026Q1', tag: '官方最新' },
    { label: '预估基准47.8T', quarter: '2026Q2', tag: '待官方发布' },
    { label: '多极情景推演', quarter: '2026Q4', tag: '前瞻推演' }
  ];

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
            <div class="text-xs text-sky-400">总债权: $${cVal >= 1000 ? `${(cVal / 1000).toFixed(2)}T` : `${cVal}B`} (${Math.round(cVal * 10).toLocaleString()} 亿美元)</div>
            <div class="text-xs text-emerald-400">美元计价: $${uVal >= 1000 ? `${(uVal / 1000).toFixed(2)}T` : `${uVal}B`} (${Math.round(uVal * 10).toLocaleString()} 亿美元, ${Math.round((uVal / Math.max(1, cVal)) * 100)}%)</div>
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

  const handleExportPng = async () => {
    if (!chartInstance.current) return;
    const rawUrl = chartInstance.current.getDataURL({
      type: 'png',
      pixelRatio: 2,
      backgroundColor: '#060913'
    });
    const watermarkedUrl = await addWatermarkToDataUrl(rawUrl, selectedQuarter, '全球双边跨国信贷流向图谱');
    const a = document.createElement('a');
    a.href = watermarkedUrl;
    a.download = `EUGENE_FINANCE_Capital_Flow_${selectedQuarter}.png`;
    a.click();
  };

  return (
    <div className="space-y-2.5 scroll-mt-24">
      {/* Top Refined Glass Control Header */}
      <div className="glass-panel rounded-xl px-3.5 py-2 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-400/25 flex items-center justify-center text-sky-400 shrink-0">
            <Radio className="w-4 h-4 animate-pulse text-sky-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm font-bold text-white tracking-wide">
                全球双边跨国信贷流向图谱
              </h2>
              {onOpenAppendix && (
                <button
                  onClick={onOpenAppendix}
                  className="text-[11px] text-sky-400 hover:text-sky-300 font-mono flex items-center gap-0.5 cursor-pointer ml-1"
                >
                  <span>方法论</span>
                  <ArrowUpRight className="w-3 h-3" />
                </button>
              )}
            </div>
            <p className="text-[11px] text-slate-400 flex items-center gap-2 flex-wrap font-sans mt-0.5">
              <span>
                {flowMode === 'positions' 
                  ? '期末未偿存量 (Amounts Outstanding) · 呈现 506 条双边金融走廊与敞口深度' 
                  : '未调整存量变化 (Stock Changes) · 绿为扩张/红为回流'}
              </span>
            </p>
          </div>
        </div>

        {/* Refined Functional Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Mode Switcher */}
          <div className="flex items-center bg-slate-900/90 border border-slate-700/60 rounded-lg p-0.5 text-xs shadow-sm">
            <button
              onClick={() => {
                soundFx.playTick();
                setFlowMode('positions');
              }}
              className={`h-7 px-2.5 rounded-md transition-all text-xs font-semibold cursor-pointer flex items-center gap-1 ${
                flowMode === 'positions'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="BIS LBS 期末未偿信贷存量 (Amounts Outstanding)"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>期末存量规模</span>
            </button>
            <button
              onClick={() => {
                soundFx.playChime();
                setFlowMode('flows');
              }}
              className={`h-7 px-2.5 rounded-md transition-all text-xs font-semibold cursor-pointer flex items-center gap-1 ${
                flowMode === 'flows'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="相邻季度双边存量净增量 (绿色为走廊信贷扩张，红色为资金撤出回流)"
            >
              <Zap className="w-3.5 h-3.5 text-amber-300" />
              <span>边际变化 Δ</span>
            </button>
          </div>

          {/* 2D / 3D Switcher */}
          <div className="flex items-center bg-slate-900/90 border border-slate-700/60 rounded-lg p-0.5 text-xs shadow-sm">
            <button
              onClick={() => {
                soundFx.playTick();
                setMapProjection('2d');
              }}
              className={`h-7 px-2.5 rounded-md transition-all text-xs font-semibold cursor-pointer flex items-center gap-1 ${
                mapProjection === '2d'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>2D 平面</span>
            </button>
            <button
              onClick={() => {
                soundFx.playChime();
                setMapProjection('3d');
              }}
              className={`h-7 px-2.5 rounded-md transition-all text-xs font-semibold cursor-pointer flex items-center gap-1 ${
                mapProjection === '3d'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>3D 拟真</span>
            </button>
          </div>

          {/* Corridor Density Curation Toggle */}
          <div className="hidden sm:flex items-center bg-slate-900/90 border border-slate-700/60 rounded-lg p-0.5 text-xs">
            {[
              { id: 'backbone', label: '骨干网络' },
              { id: 'usd_dominant', label: '美元走廊' },
              { id: 'all', label: '全量走廊' }
            ].map(d => (
              <button
                key={d.id}
                onClick={() => setCorridorDensity(d.id)}
                className={`h-7 px-2 rounded-md transition-all text-xs font-medium cursor-pointer ${
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
          <div className="flex items-center gap-1 bg-slate-900/90 border border-slate-700/60 rounded-lg px-2 py-1 text-xs">
            <Target className="w-3 h-3 text-sky-400" />
            <select
              value={focusCountry}
              onChange={(e) => setFocusCountry(e.target.value)}
              className="bg-transparent text-white font-medium focus:outline-none cursor-pointer text-xs"
            >
              <option value="ALL">🌐 全局视角</option>
              {countries.map(c => (
                <option key={c.code} value={c.code}>
                  {c.name_zh} ({c.code})
                </option>
              ))}
            </select>
          </div>

          {/* Node Size Metric Switcher */}
          <div className="hidden lg:flex items-center bg-slate-900/90 border border-slate-700/60 rounded-lg p-0.5 text-xs">
            {[
              { id: 'claims', label: '总债权' },
              { id: 'liab', label: '总负债' },
              { id: 'net', label: '净头寸' }
            ].map(m => (
              <button
                key={m.id}
                onClick={() => setMetricView(m.id)}
                className={`h-7 px-2 rounded-md transition-all text-xs font-medium cursor-pointer ${
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
            className={`h-7 px-2 rounded-lg border text-xs transition-colors cursor-pointer hidden sm:flex items-center ${
              showLabels
                ? 'bg-slate-800 border-slate-600 text-white'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
            }`}
            title="显示或隐藏节点地名文字"
          >
            {showLabels ? '标签: 开启' : '标签: 关'}
          </button>

          {/* Mobile Filter Drawer Trigger (Mobile-only >= 44px tap target) */}
          <button
            onClick={() => {
              soundFx.playTick();
              setIsMobileFilterOpen(true);
            }}
            data-testid="open-mobile-filter-drawer"
            className="md:hidden min-h-[36px] px-2.5 rounded-lg bg-slate-900 border border-slate-700/80 text-sky-400 hover:text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
            aria-label="打开进阶筛选"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>筛选</span>
          </button>

          {/* Export PNG */}
          <button
            onClick={handleExportPng}
            className="h-7 px-2.5 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-300 hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
            title="导出当前高清无损地图 PNG (自动嵌入 EUGENE FINANCE 品牌与官方/情景数据身份水印)"
          >
            <Download className="w-3.5 h-3.5 text-sky-400" />
            <span className="text-xs hidden sm:inline font-medium">投研快照</span>
          </button>
        </div>
      </div>

      {/* Pro-Analytics Desk (Map + Real-Time Intelligence Dossier) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        {/* Main Map Canvas Column with Viewport-Adaptive Responsive Height */}
        <div className="xl:col-span-8 2xl:col-span-9 glass-panel rounded-2xl relative overflow-hidden shadow-2xl border border-white/[0.06] min-h-[350px] flex flex-col">
          {mapProjection === '3d' ? (
            <GlobalFlowGlobe3D
              countries={countries}
              currentLinks={currentLinks}
              selectedQuarter={selectedQuarter}
              selectedCountry={selectedCountry}
              onSelectCountry={onSelectCountry}
              focusCountry={focusCountry}
              corridorDensity={corridorDensity}
              metricView={metricView}
              onSelectCorridor={setSelectedCorridor}
            />
          ) : (
            <>
              {/* Ocean Background Canvas with adaptive flex-grow height */}
              <div 
                ref={chartRef} 
                className="w-full flex-1 min-h-[580px] xl:min-h-[720px] 2xl:min-h-[760px] bg-[#070a12] cursor-grab active:cursor-grabbing" 
              />

              {/* Floating Return to Global Overview Pill when country is selected */}
              {(focusCountry !== 'ALL' || selectedCountry) && (
                <button
                  onClick={() => {
                    soundFx.playTick();
                    setFocusCountry('ALL');
                    if (onSelectCountry) onSelectCountry(null);
                  }}
                  className="absolute top-4 left-4 z-20 px-3 py-1.5 rounded-lg bg-sky-600/90 hover:bg-sky-500 text-white text-xs font-semibold shadow-xl backdrop-blur-md border border-sky-400/40 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>返回全球全景 (Esc)</span>
                </button>
              )}

              {/* Floating Viewport Preset Pills (Bottom-Left for 2D mode) */}
              <div className="absolute bottom-5 left-5 z-20 hidden sm:flex items-center gap-1.5 bg-slate-950/80 backdrop-blur-md border border-white/10 rounded-xl p-1.5 text-xs shadow-xl">
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
                    className={`px-2.5 py-1 rounded-lg transition-all text-xs font-medium cursor-pointer ${
                      geoPreset === p.id
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Tap-to-Inspect Card on Mobile (Directly beneath canvas) */}
          <MobileInspectCard
            inspectedEntity={inspectedEntity}
            onClose={() => setInspectedEntity(null)}
            onSelectCountry={onSelectCountry}
            selectedQuarter={selectedQuarter}
          />

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
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
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
                  className="flex-1 py-1.5 px-2 rounded-lg bg-sky-600/25 hover:bg-sky-600/40 text-sky-200 border border-sky-500/30 text-[11px] font-medium transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  title={`隔离并只展示 ${activeCorridorStats.fromName} 的全部进出管道`}
                >
                  <Target className="w-3.5 h-3.5" />
                  聚焦 {activeCorridorStats.source}
                </button>
                <button
                  onClick={() => setFocusCountry(activeCorridorStats.target)}
                  className="flex-1 py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-medium transition-colors flex items-center justify-center gap-1 cursor-pointer"
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

        {/* Right Intelligence Dossier Column */}
        <div className="xl:col-span-4 2xl:col-span-3 flex flex-col gap-3.5">
          {/* Card 1: Top 5 Bilateral Arterial Corridors in Current Quarter */}
          <div className="glass-panel rounded-2xl p-4 shadow-xl border border-white/[0.06] flex-1">
            <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-3">
              <div className="flex items-center gap-2">
                <span className={`p-1 rounded-lg ${flowMode === 'flows' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-sky-500/20 text-sky-400'}`}>
                  {flowMode === 'flows' ? <Zap className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
                </span>
                <h4 className="text-xs font-bold text-white tracking-wide">
                  {flowMode === 'flows' ? '当季存量变动走廊 Top 5 (一阶差分)' : '当季核心信贷动脉 Top 5 (存量)'}
                </h4>
              </div>
            </div>

            <div className="space-y-2">
              {topCorridors.map((c, idx) => (
                <div
                  key={`${c.source}->${c.target}`}
                  onClick={() => {
                    setSelectedCorridor({
                      source: c.source,
                      target: c.target,
                      fromName: c.fromName,
                      toName: c.toName,
                      value: c.claims_usd_bn,
                      usdVol: c.usd_denominated_bn
                    });
                  }}
                  className="p-2 rounded-xl bg-slate-900/70 hover:bg-slate-800/90 border border-white/5 hover:border-sky-500/40 cursor-pointer transition-all group"
                  title="点击在地图中高亮透视此走廊"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 font-medium text-slate-200 group-hover:text-white">
                      <span className="text-[10px] font-mono font-bold text-sky-400 w-4">#{idx + 1}</span>
                      <span>{c.fromName}</span>
                      <span className="text-slate-500">→</span>
                      <span>{c.toName}</span>
                    </div>
                    {flowMode === 'flows' ? (
                      <span className={`font-mono font-bold text-xs ${c.netChange >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {c.netChange > 0 ? '+' : (c.netChange < 0 ? '-' : '')}${Math.abs(c.netChange)}B <span className="text-[10px] text-slate-400 font-normal">({c.netChangePct > 0 ? '+' : ''}{c.netChangePct}%)</span>
                      </span>
                    ) : (
                      <span className="font-mono font-bold text-white text-xs">
                        {c.claims_usd_bn >= 1000 ? `$${(c.claims_usd_bn / 1000).toFixed(2)}T` : `$${c.claims_usd_bn}B`}
                        <span className="text-[10px] text-slate-400 font-normal ml-1">({Math.round(c.claims_usd_bn * 10).toLocaleString()} 亿美元)</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-1.5 text-[10px] text-slate-400 font-mono">
                    <span className="flex items-center gap-1">
                      <DollarSign className="w-2.5 h-2.5 text-emerald-400" /> 
                      {flowMode === 'flows' ? `存量基数: $${c.claims_usd_bn >= 1000 ? `${(c.claims_usd_bn / 1000).toFixed(2)}T` : `${c.claims_usd_bn}B`}` : `美元占比: ${c.usdShare}%`}
                    </span>
                    <span className="text-emerald-400 font-semibold">
                      ${c.usd_denominated_bn >= 1000 ? `${(c.usd_denominated_bn / 1000).toFixed(2)}T` : `${c.usd_denominated_bn}B`}
                      <span className="text-[9px] text-slate-500 font-normal ml-0.5">({Math.round(c.usd_denominated_bn * 10).toLocaleString()} 亿)</span>
                    </span>
                  </div>
                  <div className="w-full h-1 bg-slate-800 rounded-full mt-1 overflow-hidden">
                    <div 
                      className={`h-full ${flowMode === 'flows' ? (c.netChange >= 0 ? 'bg-emerald-400' : 'bg-rose-400') : 'bg-gradient-to-r from-sky-500 to-emerald-400'}`} 
                      style={{ width: `${Math.min(100, Math.max(15, c.usdShare))}%` }} 
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Card 2: Global Net Creditors vs Debtors */}
          <div className="glass-panel rounded-2xl p-4 shadow-xl border border-white/[0.06]">
            <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2.5">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded-lg bg-emerald-500/20 text-emerald-400">
                  <TrendingUp className="w-3.5 h-3.5" />
                </span>
                <h4 className="text-xs font-bold text-white tracking-wide">
                  全球对外净头寸极化两极
                </h4>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">LBS 综合</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              {/* Top Creditors */}
              <div className="space-y-1.5 bg-slate-900/60 rounded-xl p-2.5 border border-emerald-500/10">
                <div className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1 font-mono">
                  <span>🟢 净债权巨头</span>
                </div>
                {netPositions.creditors.map(c => (
                  <div key={c.code} className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-300 truncate">{c.name}</span>
                    <span className="font-mono text-emerald-400 font-semibold">
                      +{Math.abs(c.net) >= 1000 ? `$${(c.net / 1000).toFixed(2)}T` : `$${c.net.toFixed(1)}B`}
                    </span>
                  </div>
                ))}
              </div>

              {/* Top Debtors */}
              <div className="space-y-1.5 bg-slate-900/60 rounded-xl p-2.5 border border-rose-500/10">
                <div className="text-[10px] font-semibold text-rose-400 uppercase tracking-wider flex items-center gap-1 font-mono">
                  <span>🔴 净负债巨头</span>
                </div>
                {netPositions.debtors.map(c => (
                  <div key={c.code} className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-300 truncate">{c.name}</span>
                    <span className="font-mono text-rose-400 font-semibold">
                      -{Math.abs(c.net) >= 1000 ? `$${(Math.abs(c.net) / 1000).toFixed(2)}T` : `$${Math.abs(c.net).toFixed(1)}B`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Card 3: Rapid Systemic Jurisdiction Filter */}
          <div className="glass-panel rounded-2xl p-3.5 shadow-xl border border-white/[0.06]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                <Target className="w-3 h-3 text-sky-400" /> 核心主权经济体快选:
              </span>
              {focusCountry !== 'ALL' && (
                <button
                  onClick={() => setFocusCountry('ALL')}
                  className="text-[10px] text-sky-400 hover:text-white underline cursor-pointer"
                >
                  重置全局
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {SYSTEMIC_JURISDICTIONS.map(code => {
                const c = countryMap[code];
                const isActive = focusCountry === code;
                return (
                  <button
                    key={code}
                    onClick={() => setFocusCountry(isActive ? 'ALL' : code)}
                    className={`px-2 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer flex items-center gap-1 border ${
                      isActive
                        ? 'bg-blue-600 text-white font-bold border-blue-400 shadow-sm'
                        : 'bg-slate-900/80 text-slate-300 border-slate-700/60 hover:border-slate-500 hover:text-white'
                    }`}
                  >
                    <span>{code}</span>
                    <span className="text-[10px] text-slate-400 font-sans">{c?.name_zh?.slice(0, 2)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Integrated 36-Quarter Full Historical Scrubber & Macro Trend Panel */}
      <div className="glass-panel rounded-2xl p-4 md:p-5 shadow-xl border border-white/[0.06] space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-white/[0.06] pb-3">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-sky-500/15 border border-sky-500/30 text-sky-400">
              <TrendingUp className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                36 个季度时间序列全息穿透 (2018Q1 - 2026Q4)
                <span className={`text-[11px] font-mono px-2 py-0.5 rounded border ${
                  selectedQuarter > '2026Q2' 
                    ? 'text-purple-300 bg-purple-500/15 border-purple-500/35 shadow-[0_0_8px_rgba(168,85,247,0.25)]' 
                    : selectedQuarter === '2026Q2'
                      ? 'text-amber-300 bg-amber-500/15 border-amber-500/35'
                      : 'text-sky-300 bg-sky-500/10 border-sky-500/30'
                }`}>
                  当前处于: {selectedQuarter} {selectedQuarter > '2026Q2' ? '[NOWCAST 情景推演]' : selectedQuarter === '2026Q2' ? '[待官方发布 · 缓存预估基准]' : '[BIS 官方确证存量 · 模型重构]'}
                </span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                点击折线或柱状图任意季度，地图将动态重算并渲染该季度的双边信贷重构网络
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-slate-400 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800">
            <span>总跨度: 9 年 / 36 季</span>
            <span className="text-slate-600">·</span>
            <span className="text-emerald-400 font-semibold">2026Q1 官方最新: $47.62T</span>
            <span className="text-slate-600">·</span>
            <span className="text-amber-400 font-semibold">2026Q2 待发布预估: $47.82T</span>
            <span className="text-slate-600">·</span>
            <span className="text-purple-400 font-semibold">2026Q4 情景推演: ~$48.60T (范围: $47.90T–$49.30T)</span>
          </div>
        </div>

        {/* Macro Historical Epoch Anchors */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-white/[0.06]">
          <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1 shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-sky-400" /> 历史周期锚点快选:
          </span>
          {MACRO_EPOCHS.map(ep => (
            <button
              key={ep.quarter}
              onClick={() => onSelectQuarter?.(ep.quarter)}
              className={`px-2.5 py-1 rounded-xl text-xs font-mono transition-all flex items-center gap-1.5 shrink-0 border cursor-pointer ${
                selectedQuarter === ep.quarter
                  ? 'bg-blue-600/30 text-sky-300 border-sky-400/60 font-bold shadow-[0_0_10px_rgba(56,189,248,0.3)]'
                  : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-white hover:bg-slate-800'
              }`}
              title={`跳转至 ${ep.quarter} (${ep.tag})`}
            >
              <span className="font-semibold">{ep.label}</span>
              <span className="text-[10px] text-sky-400/80 font-bold">({ep.quarter})</span>
            </button>
          ))}
        </div>

        {/* ECharts Scrubber Chart */}
        <div ref={timelineChartRef} className="w-full h-44" />

        {/* BIS LBS Methodology Positions vs Flows Callout */}
        <div className="bg-slate-900/70 rounded-xl p-3 border border-slate-800 text-[11px] text-slate-400 space-y-1.5 font-mono">
          <div className="flex flex-wrap items-center justify-between gap-2 text-slate-300">
            <span className="font-semibold text-white flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-sky-400" />
              BIS LBS 存量与流量口径释义 (Positions vs Flows Methodology):
            </span>
            <span className="text-slate-500">
              参考规范: <a href="https://data.bis.org/topics/LBS" target="_blank" rel="noreferrer" className="text-sky-400 hover:underline">BIS LBS Guidelines</a>
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[10px] text-slate-400 font-sans">
            <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
              <strong className="text-sky-300 font-mono">📊 期末未偿存量 (Positions / Amounts Outstanding):</strong>
              <p className="mt-0.5 text-slate-400 leading-relaxed">
                代表每季度末申报国跨国银行对对手方的跨境总债权资产余额。反映国际金融网络的总敞口深度与中枢连通度。
              </p>
            </div>
            <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
              <strong className="text-emerald-300 font-mono">📈 未调整存量变化 (Unadjusted Stock Changes):</strong>
              <p className="mt-0.5 text-slate-400 leading-relaxed">
                采用相邻季度存量一阶差分 ΔClaims = Claims(t) - Claims(t-1) 作为头寸扩张/收缩的代理指标。注意：由于当前切片未做多币种汇率波动与统计断点剔除，不可等同于正式的调整后资金流动 (Break- & FX-adjusted Flows)。
              </p>
            </div>
          </div>
        </div>

        {/* Methodology & Data Attribution Footnote */}
        <MethodologyFootnote
          source="BIS LBS Table A6.2 (Locational Banking Statistics by Residence)"
          accounting="常住地即时交易对手原则 (Immediate Counterparty Basis)"
          model={selectedQuarter > '2026Q2' ? "动态空间引力外推 (Gravity Nowcast v2.4)" : "最大熵矩阵平衡 (RAS Entropy Balancing)"}
          onOpenAppendix={onOpenAppendix}
        />
      </div>

      {/* Mobile Drawer for Advanced Settings (Touch targets >= 44px) */}
      <MobileFilterDrawer
        isOpen={isMobileFilterOpen}
        onClose={() => setIsMobileFilterOpen(false)}
        mapProjection={mapProjection}
        setMapProjection={setMapProjection}
        corridorDensity={corridorDensity}
        setCorridorDensity={setCorridorDensity}
        focusCountry={focusCountry}
        setFocusCountry={setFocusCountry}
        countries={countries}
        metricView={metricView}
        setMetricView={setMetricView}
        showLabels={showLabels}
        setShowLabels={setShowLabels}
        onExportPng={handleExportPng}
      />
    </div>
  );
}
