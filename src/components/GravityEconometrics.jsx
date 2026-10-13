import React, { useState, useMemo, useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { 
  Orbit, BarChart2, TrendingUp, Compass, 
  HelpCircle, Download, ArrowUpRight, ArrowDownRight 
} from 'lucide-react';

export default function GravityEconometrics({
  dataset,
  selectedQuarter,
  onSelectCountry
}) {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  const countries = dataset.countries || [];
  const countryMap = Object.fromEntries(countries.map(c => [c.code, c]));
  const currentLinks = (dataset.bilateral_matrix || {})[selectedQuarter] || [];

  // Approximate spherical distance calculation (Great Circle Distance in km)
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return Math.max(100, Math.round(R * c));
  };

  // Compute Gravity model points and OLS regression
  const gravityAnalysis = useMemo(() => {
    const points = [];
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    const n = currentLinks.length;

    currentLinks.forEach(l => {
      const src = countryMap[l.source];
      const dst = countryMap[l.target];
      if (!src || !dst) return;

      const dist = calculateDistance(src.lat, src.lng, dst.lat, dst.lng);
      const logDist = Math.log(dist);
      const logClaims = Math.log(Math.max(1, l.claims_usd_bn));

      sumX += logDist;
      sumY += logClaims;
      sumXY += logDist * logClaims;
      sumX2 += logDist * logDist;

      points.push({
        source: l.source,
        target: l.target,
        srcName: src.name_zh,
        dstName: dst.name_zh,
        dist,
        claims: l.claims_usd_bn,
        logDist: parseFloat(logDist.toFixed(3)),
        logClaims: parseFloat(logClaims.toFixed(3)),
        isOffshore: src.type === 'offshore_conduit' || dst.type === 'offshore_conduit' || src.code === 'KY' || dst.code === 'KY' || src.code === 'GB'
      });
    });

    if (points.length === 0) return { points: [], slope: 0, intercept: 0, r2: 0, outliers: [] };

    // Linear regression: Y = slope * X + intercept
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Compute residuals (actual log claims - predicted log claims)
    const pointsWithResiduals = points.map(p => {
      const predicted = slope * p.logDist + intercept;
      const residual = p.logClaims - predicted;
      return {
        ...p,
        predicted: parseFloat(predicted.toFixed(3)),
        residual: parseFloat(residual.toFixed(3))
      };
    });

    // R-squared
    const yMean = sumY / n;
    let ssTot = 0, ssRes = 0;
    pointsWithResiduals.forEach(p => {
      ssTot += Math.pow(p.logClaims - yMean, 2);
      ssRes += Math.pow(p.logClaims - p.predicted, 2);
    });
    const r2 = Math.max(0, Math.min(1, 1 - (ssRes / (ssTot || 1))));

    // Outliers (highest positive residuals = offshore conduits exceeding normal gravity)
    const sortedResiduals = [...pointsWithResiduals].sort((a, b) => b.residual - a.residual);

    return {
      points: pointsWithResiduals,
      slope: parseFloat(slope.toFixed(3)),
      intercept: parseFloat(intercept.toFixed(3)),
      r2: parseFloat(r2.toFixed(3)),
      outliers: sortedResiduals
    };
  }, [currentLinks, countryMap]);

  // Init chart
  useEffect(() => {
    if (!chartRef.current) return;
    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current, 'dark');
      const handleResize = () => chartInstance.current?.resize();
      window.addEventListener('resize', handleResize);
      return () => {
        window.removeEventListener('resize', handleResize);
        chartInstance.current?.dispose();
        chartInstance.current = null;
      };
    }
  }, []);

  // Update Scatter & Regression line
  useEffect(() => {
    if (!chartInstance.current || gravityAnalysis.points.length === 0) return;

    const normalScatter = gravityAnalysis.points
      .filter(p => !p.isOffshore)
      .map(p => ({
        name: `${p.srcName}→${p.dstName}`,
        value: [p.dist, p.claims],
        extra: p
      }));

    const offshoreScatter = gravityAnalysis.points
      .filter(p => p.isOffshore)
      .map(p => ({
        name: `${p.srcName}→${p.dstName}`,
        value: [p.dist, p.claims],
        extra: p
      }));

    // Regression curve points from min dist to max dist
    const lineData = [
      [300, Math.round(Math.exp(gravityAnalysis.slope * Math.log(300) + gravityAnalysis.intercept))],
      [15000, Math.round(Math.exp(gravityAnalysis.slope * Math.log(15000) + gravityAnalysis.intercept))]
    ];

    const option = {
      backgroundColor: '#080c14',
      tooltip: {
        trigger: 'item',
        backgroundColor: '#0f172a',
        borderColor: '#334155',
        textStyle: { color: '#f8fafc', fontSize: 12 },
        formatter: (params) => {
          if (params.seriesType === 'scatter') {
            const p = params.data.extra;
            return `
              <div class="p-1 font-sans">
                <div class="font-bold text-white border-b border-slate-700 pb-1 mb-1">
                  ${p.srcName} → ${p.dstName} 双边银行信贷
                </div>
                <div class="space-y-1 text-xs">
                  <div>两地大圆距离: <b class="font-mono text-slate-200">${p.dist} 公里</b></div>
                  <div>实际债权存量: <b class="font-mono text-emerald-400 font-bold">$${p.claims} 亿</b></div>
                  <div class="${p.residual >= 0 ? 'text-amber-400' : 'text-slate-400'}">
                    引力模型残差: <b class="font-mono">${p.residual > 0 ? '+' : ''}${p.residual}</b>
                    ${p.isOffshore ? ' <span class="text-rose-400 font-bold">[反常转口溢价]</span>' : ''}
                  </div>
                </div>
              </div>
            `;
          }
          return '';
        }
      },
      legend: {
        data: ['常规主权/经贸走廊', '离岸/转口反常超额走廊 (Offshore Conduits)', 'OLS 国际银行引力拟合曲线'],
        top: 8,
        textStyle: { color: '#94a3b8', fontSize: 11 }
      },
      grid: {
        left: '8%',
        right: '6%',
        top: '16%',
        bottom: '12%',
        containLabel: true
      },
      xAxis: {
        type: 'log',
        name: '双边地理距离 (公里, 对数坐标)',
        nameLocation: 'middle',
        nameGap: 30,
        splitLine: { lineStyle: { color: '#1e293b' } },
        axisLabel: { color: '#94a3b8' }
      },
      yAxis: {
        type: 'log',
        name: '双边银行信贷规模 ($ 10亿, 对数坐标)',
        splitLine: { lineStyle: { color: '#1e293b' } },
        axisLabel: { color: '#94a3b8' }
      },
      series: [
        {
          name: '常规主权/经贸走廊',
          type: 'scatter',
          data: normalScatter,
          symbolSize: 12,
          itemStyle: { color: '#38bdf8', opacity: 0.8 }
        },
        {
          name: '离岸/转口反常超额走廊 (Offshore Conduits)',
          type: 'scatter',
          data: offshoreScatter,
          symbolSize: 16,
          itemStyle: { color: '#f59e0b', borderColor: '#ffffff', borderWidth: 1 }
        },
        {
          name: 'OLS 国际银行引力拟合曲线',
          type: 'line',
          data: lineData,
          showSymbol: false,
          lineStyle: { color: '#ec4899', width: 2.5, type: 'dashed' }
        }
      ]
    };

    chartInstance.current.setOption(option, true);
  }, [gravityAnalysis]);

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 shadow-2xl space-y-5">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-3 gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-pink-500/20 border border-pink-500/40 flex items-center justify-center text-pink-400">
            <Orbit className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              国际银行双边信贷引力模型与反常转口溢价 (Gravity Equation of Banking)
              <span className="text-[11px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                {selectedQuarter}
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              实证检验地理距离对跨国信贷的物理阻尼效应，并识别突破重力的离岸转口中枢溢价
            </p>
          </div>
        </div>

        {/* Regression Diagnostic Badges */}
        <div className="flex items-center gap-3 bg-slate-900 p-2 rounded-lg border border-slate-800 text-xs font-mono">
          <span className="text-slate-400">距离弹性阻尼 (β): <b className="text-pink-400">{gravityAnalysis.slope}</b></span>
          <span className="text-slate-400">拟合优度 (R²): <b className="text-emerald-400">{gravityAnalysis.r2}</b></span>
        </div>
      </div>

      {/* Main Grid: Scatter + Econometric Residuals */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Scatter & OLS Curve (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900/40 border border-slate-800/90 rounded-xl p-3 flex flex-col justify-between">
          <div className="text-xs font-bold text-white flex items-center justify-between border-b border-slate-800 pb-2">
            <span>双边地理距离与信贷规模对数散点图 (Log Distance vs Log Claims)</span>
            <span className="text-[10px] text-slate-400 font-mono">双对数空间 OLS 回归</span>
          </div>
          <div ref={chartRef} className="w-full h-[380px]" />
          <div className="text-[11px] text-slate-400 bg-slate-950 p-2.5 rounded border border-slate-800/80 leading-normal">
            💡 <strong>引力模型洞察：</strong> 在常规经贸关系中，信贷规模随地理与制度距离递减；但开曼群岛、英国、新加坡等离岸走廊（橙色高亮散点）呈现巨大的**正引力残差**，证明其具备极其强大的非生产性资金过桥属性。
          </div>
        </div>

        {/* Residual Outlier Leaderboard (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900/40 border border-slate-800/90 rounded-xl p-3 flex flex-col justify-between">
          <div>
            <div className="text-xs font-bold text-white border-b border-slate-800 pb-2 mb-2 flex items-center justify-between">
              <span>引力模型反常正残差排行榜 (超额转口通道)</span>
              <span className="text-amber-400 text-[10px] font-mono">Positive Residual Outliers</span>
            </div>

            <div className="space-y-1.5 max-h-[360px] overflow-y-auto">
              {gravityAnalysis.outliers.slice(0, 8).map((item, idx) => (
                <div
                  key={`${item.source}->${item.target}`}
                  className="p-2 bg-slate-950/80 border border-slate-800/80 rounded-lg flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-bold text-white flex items-center gap-1.5">
                      <span className="text-[10px] font-mono text-slate-500">{idx + 1}.</span>
                      <span>{item.srcName} → {item.dstName}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                      信贷: ${item.claims}B · 距离: {item.dist}km
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-mono font-bold text-amber-400 text-xs">
                      +{item.residual} 残差
                    </div>
                    <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono">
                      超额转口
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="text-[11px] text-slate-400 bg-slate-950 p-2 rounded border border-slate-800/80 mt-2">
            参考学术文献：Buch (2005) <em>Distance and International Banking</em>; Okawa & van Wincoop (2012) <em>Gravity in International Finance</em>.
          </div>
        </div>
      </div>
    </div>
  );
}
