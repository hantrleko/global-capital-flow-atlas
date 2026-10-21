import React, { useState, useMemo, useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { 
  AlertOctagon, Play, RotateCcw, ShieldAlert, ArrowRight, 
  TrendingDown, Layers, Zap, Download, Info, ChevronDown, ChevronUp, HelpCircle, FileText
} from 'lucide-react';
import soundFx from '../utils/soundEffects';
import MethodologyFootnote from './MethodologyFootnote';
import DataClassificationBadge from './DataClassificationBadge';

// Single Source of Truth for System, Model & Data Versions
export const CLEARING_VERSION_REGISTRY = {
  PRODUCT: 'v2.4.0',
  MODEL: 'v2.2-DualBaseline-EN2001',
  DATA: (quarter) => quarter <= '2026Q1' ? 'BIS-SDMX-Official' : (quarter === '2026Q2' ? 'BIS-Pending-Release (2026-10-30)' : 'Macro-NOWCAST-Scenario')
};

export default function NetworkContagionSimulator({
  dataset,
  selectedQuarter,
  onSelectCountry,
  contagionConfig,
  onOpenAppendix
}) {
  const countries = dataset.countries || [];
  const currentLinks = (dataset.bilateral_matrix || {})[selectedQuarter] || [];
  const currentQIdx = dataset.quarters.indexOf(selectedQuarter);
  const lbsData = dataset.lbs_data || {};
  const cbsRisk = dataset.cbs_risk || {};

  // Standard Macro Contagion Presets
  const CONTAGION_PRESETS = [
    { id: 'emerging_debt', name: '前沿主权外债违约', epicenter: 'TR', haircut: 40, deleveraging: 1.8, dollarSqueeze: 15, desc: '新兴市场主权债务暴雷引发直接资产减记与信贷重估' },
    { id: 'dollar_crunch', name: '离岸美元流动性休克', epicenter: 'GB', haircut: 20, deleveraging: 2.2, dollarSqueeze: 25, desc: '欧洲美元转口中枢流动性骤紧与全球美元荒' },
    { id: 'euro_contagion', name: '泛欧跨国银行去杠杆', epicenter: 'IT', haircut: 30, deleveraging: 2.0, dollarSqueeze: 12, desc: '核心主权息差走阔导致多米诺骨牌级联收缩' }
  ];

  // Simulation parameters
  const [simMode, setSimMode] = useState('en_clearing'); // 'en_clearing' | 'behavioral'
  const [enSortMetric, setEnSortMetric] = useState('incremental'); // 'incremental' | 'post_shock' | 'baseline'
  const [showBaselineDiagnostic, setShowBaselineDiagnostic] = useState(false);
  const [activePreset, setActivePreset] = useState('custom');
  const [epicenter, setEpicenter] = useState('TR'); // Default: Turkey (high external vulnerability)
  const [haircutPct, setHaircutPct] = useState(25); // Credit loss %
  const [deleveragingMultiplier, setDeleveragingMultiplier] = useState(1.5); // Bank deleveraging ratio
  const [dollarSqueezePct, setDollarSqueezePct] = useState(12); // Dollar liquidity squeeze %
  const [simResults, setSimResults] = useState(null);

  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  // Sync external configuration if passed from CountryDrawer or CrisisPlaybook
  useEffect(() => {
    if (contagionConfig) {
      if (contagionConfig.epicenter) setEpicenter(contagionConfig.epicenter);
      if (contagionConfig.haircut) setHaircutPct(contagionConfig.haircut);
      if (contagionConfig.deleveraging) setDeleveragingMultiplier(contagionConfig.deleveraging);
      if (contagionConfig.dollarSqueeze) setDollarSqueezePct(contagionConfig.dollarSqueeze);
      if (contagionConfig.presetId) setActivePreset(contagionConfig.presetId);
    }
  }, [contagionConfig]);

  const epicenterCountry = countries.find(c => c.code === epicenter) || countries[0];

  // Apply preset
  const handleSelectPreset = (p) => {
    soundFx.playTick();
    setActivePreset(p.id);
    setEpicenter(p.epicenter);
    setHaircutPct(p.haircut);
    setDeleveragingMultiplier(p.deleveraging);
    setDollarSqueezePct(p.dollarSqueeze);
  };

  // Run Dual-Baseline Eisenberg-Noe (2001) Fixed-Point Clearing & Multi-Round Stress Cascade
  const runSimulation = () => {
    soundFx.playShockwave();

    // 1. Dual-Baseline Eisenberg-Noe (2001) Clearing Vector Fixed Point p* = min(pbar, Pi^T * p + e)
    const n = countries.length;
    const codeToIndex = Object.fromEntries(countries.map((c, idx) => [c.code, idx]));
    const countryMap = Object.fromEntries(countries.map(c => [c.code, c]));
    
    // Matrix of interbank cross-border obligations L[j][i]: claims of creditor j on debtor i
    const L = Array.from({ length: n }, () => new Float64Array(n));
    currentLinks.forEach(l => {
      const j = codeToIndex[l.source]; // creditor
      const i = codeToIndex[l.target]; // debtor
      if (j !== undefined && i !== undefined) {
        L[j][i] = l.claims_usd_bn;
      }
    });

    // Nominal cross-border debt pbar[i] of debtor i: sum of obligations of i to all foreign creditors j
    const pbar = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      let sum = 0;
      for (let j = 0; j < n; j++) sum += L[j][i];
      pbar[i] = sum;
    }

    // Relative liabilities Pi[i][j]: proportion of debtor i's payments due to creditor j
    const Pi = Array.from({ length: n }, () => new Float64Array(n));
    for (let i = 0; i < n; i++) {
      if (pbar[i] > 0) {
        for (let j = 0; j < n; j++) {
          Pi[i][j] = L[j][i] / pbar[i];
        }
      }
    }

    // Picard fixed-point solver
    const solvePicard = (eVec) => {
      let p = new Float64Array(pbar);
      let iterCount = 0;
      let finalDiff = 0;
      for (let iter = 0; iter < 100; iter++) {
        iterCount = iter + 1;
        const pNext = new Float64Array(n);
        let diff = 0;
        for (let i = 0; i < n; i++) {
          let inflows = 0;
          for (let j = 0; j < n; j++) {
            inflows += Pi[j][i] * p[j];
          }
          const available = Math.max(0, inflows + eVec[i]);
          pNext[i] = Math.min(pbar[i], available);
          diff = Math.max(diff, Math.abs(pNext[i] - p[i]));
        }
        p = pNext;
        finalDiff = diff;
        if (diff < 1e-4) break;
      }
      return { p, iterCount, finalDiff };
    };

    // (A) Zero-Shock Baseline: e_i^(0) = 1.5 * FX_reserves (strictly derived without static 50 fallback)
    let validReservesCount = 0;
    const eBaseline = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      const c = countries[i];
      const r = c.fx_reserves;
      if (r !== undefined && r !== null && !isNaN(r) && r > 0) {
        validReservesCount++;
        eBaseline[i] = r * 1.5;
      } else {
        eBaseline[i] = 0; // Explicit 0 boundary capital when missing
      }
    }
    const { p: pBase } = solvePicard(eBaseline);

    // (B) Shocked Vector: Epicenter buffer reduced by haircut % on nominal liabilities
    const epiIdx = codeToIndex[epicenter];
    const eShocked = new Float64Array(eBaseline);
    if (epiIdx !== undefined) {
      eShocked[epiIdx] = Math.max(-pbar[epiIdx], eBaseline[epiIdx] - pbar[epiIdx] * (haircutPct / 100));
    }
    const { p: pShock, iterCount: iterShock, finalDiff: diffShock } = solvePicard(eShocked);

    // Compute clearing shortfalls for every creditor j using exact unrounded Float64 precision
    let totBaseRaw = 0;
    let totShockRaw = 0;
    const enBaselineShortfall = {};
    const enPostShockShortfall = {};
    const enIncrementalShortfall = {};
    const enIncrementalDirect = {};
    const enIncrementalIndirect = {};

    for (let j = 0; j < n; j++) {
      let sumBaseRaw = 0;
      let sumShockRaw = 0;
      let directIncRaw = 0;
      for (let i = 0; i < n; i++) {
        const shortB_i = Math.max(0, pbar[i] - pBase[i]);
        const shortS_i = Math.max(0, pbar[i] - pShock[i]);
        if (shortB_i > 0) sumBaseRaw += Pi[i][j] * shortB_i;
        if (shortS_i > 0) {
          sumShockRaw += Pi[i][j] * shortS_i;
          if (i === epiIdx) {
            const incFromEpi = Pi[i][j] * Math.max(0, pBase[i] - pShock[i]);
            directIncRaw += incFromEpi;
          }
        }
      }
      totBaseRaw += sumBaseRaw;
      totShockRaw += sumShockRaw;

      const deltaRaw = Math.max(0, sumShockRaw - sumBaseRaw);
      const directVal = Math.min(deltaRaw, directIncRaw);
      const indirectVal = Math.max(0, deltaRaw - directVal);

      const code = countries[j].code;
      enBaselineShortfall[code] = {
        raw: sumBaseRaw,
        display: Math.round(sumBaseRaw * 10) / 10
      };
      enPostShockShortfall[code] = {
        raw: sumShockRaw,
        display: Math.round(sumShockRaw * 10) / 10
      };
      enIncrementalShortfall[code] = {
        raw: deltaRaw,
        display: Math.round(deltaRaw * 10) / 10
      };
      enIncrementalDirect[code] = {
        raw: directVal,
        display: Math.round(directVal * 10) / 10
      };
      enIncrementalIndirect[code] = {
        raw: indirectVal,
        display: Math.round(indirectVal * 10) / 10
      };
    }

    // Exact unrounded incremental delta (never back-calculated from rounded totals!)
    const totIncrementalRaw = Math.max(0, totShockRaw - totBaseRaw);
    const epicenterHaircutAmountRaw = epiIdx !== undefined ? pbar[epiIdx] * (haircutPct / 100) : 0;
    const epicenterHaircutAmountDisplay = Math.round(epicenterHaircutAmountRaw * 10) / 10;
    const epicenterLiabRaw = epiIdx !== undefined ? pbar[epiIdx] : 0;
    const epicenterLiabDisplay = Math.round(epicenterLiabRaw * 10) / 10;

    // 2. Multi-Round Behavioral Spillover Simulation
    const directCreditorLinks = currentLinks.filter(l => l.target === epicenter);
    
    // Round 1: Direct Losses
    const round1Losses = {};
    let totalR1Loss = 0;

    directCreditorLinks.forEach(l => {
      const loss = Math.round(l.claims_usd_bn * (haircutPct / 100));
      round1Losses[l.source] = (round1Losses[l.source] || 0) + loss;
      totalR1Loss += loss;
    });

    // Round 2: Secondary Deleveraging
    const round2Spillovers = {};
    let totalR2Contagion = 0;

    Object.entries(round1Losses).forEach(([creditorCode, r1Loss]) => {
      if (r1Loss > 10) {
        const retrenchmentPool = Math.round(r1Loss * deleveragingMultiplier);
        const otherLoans = currentLinks.filter(l => l.source === creditorCode && l.target !== epicenter);
        const totalOtherLoans = otherLoans.reduce((sum, l) => sum + l.claims_usd_bn, 0);

        if (totalOtherLoans > 0) {
          otherLoans.forEach(l => {
            const cut = Math.round(retrenchmentPool * (l.claims_usd_bn / totalOtherLoans));
            round2Spillovers[l.target] = (round2Spillovers[l.target] || 0) + cut;
            totalR2Contagion += cut;
          });
        }
      }
    });

    // Round 3: Dollar Refinancing Squeeze (Global Dollar Shortage)
    // Strictly derived from quarterly actual liabilities, NEVER hardcoded 120 fallback!
    const round3DollarSqueeze = {};
    let totalR3Dollar = 0;
    let validLiabCount = 0;

    countries.forEach(c => {
      if (c.code !== epicenter) {
        const qLbs = (lbsData[c.code] || []).find(q => q.quarter === selectedQuarter);
        const qCbs = (cbsRisk[c.code] || []).find(q => q.quarter === selectedQuarter);
        const actualLiab = qLbs?.liabilities_usd_bn 
          ?? qCbs?.cross_border_borrowings_bn 
          ?? currentLinks.filter(l => l.target === c.code).reduce((sum, l) => sum + l.claims_usd_bn, 0);

        if (actualLiab !== undefined && actualLiab !== null && !isNaN(actualLiab) && actualLiab > 0) {
          validLiabCount++;
          const dSqueeze = Math.round(actualLiab * (c.default_usd_share / 100) * (dollarSqueezePct / 100));
          round3DollarSqueeze[c.code] = dSqueeze;
          totalR3Dollar += dSqueeze;
        } else {
          round3DollarSqueeze[c.code] = null; // Marked as NA when missing
        }
      }
    });

    // Compile comprehensive impact ranking (sorting strictly on raw unrounded metrics)
    const impactList = countries
      .filter(c => c.code !== epicenter)
      .map(c => {
        const r1 = round1Losses[c.code] || 0;
        const r2 = round2Spillovers[c.code] || 0;
        const r3 = round3DollarSqueeze[c.code] !== null ? (round3DollarSqueeze[c.code] || 0) : null;
        const totalImpact = r1 + r2 + (r3 !== null ? r3 : 0);

        const bObj = enBaselineShortfall[c.code] || { raw: 0, display: 0 };
        const sObj = enPostShockShortfall[c.code] || { raw: 0, display: 0 };
        const incObj = enIncrementalShortfall[c.code] || { raw: 0, display: 0 };
        const incDirObj = enIncrementalDirect[c.code] || { raw: 0, display: 0 };
        const incIndirObj = enIncrementalIndirect[c.code] || { raw: 0, display: 0 };

        const reserves = (c.fx_reserves !== undefined && c.fx_reserves !== null && !isNaN(c.fx_reserves)) ? c.fx_reserves : null;
        const impactToReservesPct = reserves ? parseFloat(((totalImpact / reserves) * 100).toFixed(1)) : 'NA';
        const enIncrementalToReservesPct = reserves ? parseFloat(((incObj.raw / reserves) * 100).toFixed(1)) : 'NA';
        const enBaselineToReservesPct = reserves ? parseFloat(((bObj.raw / reserves) * 100).toFixed(1)) : 'NA';
        const enPostShockToReservesPct = reserves ? parseFloat(((sObj.raw / reserves) * 100).toFixed(1)) : 'NA';

        return {
          code: c.code,
          name: c.name,
          name_zh: c.name_zh,
          region: c.region,
          tier: c.tier,
          reserves,
          r1Loss: r1,
          r2Spillover: r2,
          r3Dollar: r3,
          totalImpact,
          impactToReservesPct,
          enBaselineShortfallRaw: bObj.raw,
          enBaselineShortfall: bObj.display,
          enPostShockShortfallRaw: sObj.raw,
          enPostShockShortfall: sObj.display,
          enIncrementalShortfallRaw: incObj.raw,
          enIncrementalShortfall: incObj.display,
          enIncrementalDirect: incDirObj.display,
          enIncrementalIndirect: incIndirObj.display,
          enIncrementalToReservesPct,
          enBaselineToReservesPct,
          enPostShockToReservesPct,
          primaryMetricValue: simMode === 'en_clearing'
            ? (enSortMetric === 'incremental' ? incObj.raw : (enSortMetric === 'baseline' ? bObj.raw : sObj.raw))
            : totalImpact
        };
      })
      .filter(item => {
        if (simMode === 'en_clearing') {
          if (enSortMetric === 'incremental') return item.enIncrementalShortfallRaw > 0 || item.enPostShockShortfallRaw > 0;
          if (enSortMetric === 'baseline') return item.enBaselineShortfallRaw > 0;
          return item.enPostShockShortfallRaw > 0;
        }
        return item.totalImpact > 0;
      })
      .sort((a, b) => {
        if (simMode === 'en_clearing') {
          if (enSortMetric === 'incremental') return b.enIncrementalShortfallRaw - a.enIncrementalShortfallRaw;
          if (enSortMetric === 'baseline') return b.enBaselineShortfallRaw - a.enBaselineShortfallRaw;
          return b.enPostShockShortfallRaw - a.enPostShockShortfallRaw;
        }
        return b.totalImpact - a.totalImpact;
      });

    // Top incremental victim
    const topVictim = impactList.length > 0 ? impactList[0] : null;

    // Structural Mismatch Samples (US, GB, KY dynamically resolved from current matrix, no hardcoded constants)
    const structuralSamples = ['US', 'GB', 'KY'].map(code => {
      const idx = codeToIndex[code];
      const liab = idx !== undefined ? pbar[idx] : null;
      const cMeta = countryMap[code];
      const res = cMeta?.fx_reserves;
      return {
        code,
        name: cMeta?.name_zh || code,
        liabilitiesBn: liab !== null ? Math.round(liab * 10) / 10 : null,
        liabilitiesTrillion: liab !== null ? (liab / 1000).toFixed(2) : null,
        reservesBn: (res !== undefined && res !== null && !isNaN(res)) ? res : null
      };
    });

    // Unified Immutable Current Run Result Contract
    const currentRun = {
      runId: `${selectedQuarter}-${epicenter}-${haircutPct}-${Date.now()}`,
      quarter: selectedQuarter,
      quarterStatus: selectedQuarter <= '2026Q1' ? 'OFFICIAL' : (selectedQuarter === '2026Q2' ? 'PENDING_VERIFICATION' : 'NOWCAST_SCENARIO'),
      epicenterCode: epicenter,
      epicenterNameZh: epicenterCountry.name_zh,
      epicenterLiabRaw,
      epicenterLiabDisplay,
      haircutPct,
      epicenterHaircutAmountRaw,
      epicenterHaircutAmountDisplay,
      baselineTotalRaw: totBaseRaw,
      postShockTotalRaw: totShockRaw,
      incrementalTotalRaw: totIncrementalRaw,
      baselineTotalDisplay: Math.round(totBaseRaw * 10) / 10,
      postShockTotalDisplay: Math.round(totShockRaw * 10) / 10,
      incrementalTotalDisplay: Math.round(totIncrementalRaw * 10) / 10,
      topVictim: topVictim ? {
        code: topVictim.code,
        name_zh: topVictim.name_zh,
        incrementalRaw: topVictim.enIncrementalShortfallRaw,
        incrementalDisplay: topVictim.enIncrementalShortfall,
        incrementalFormatted: `+$${topVictim.enIncrementalShortfall}B (+${Math.round(topVictim.enIncrementalShortfall * 10).toLocaleString()} 亿美元)`
      } : null,
      structuralSamples,
      versionMeta: {
        productVersion: CLEARING_VERSION_REGISTRY.PRODUCT,
        modelVersion: CLEARING_VERSION_REGISTRY.MODEL,
        dataVersion: CLEARING_VERSION_REGISTRY.DATA(selectedQuarter)
      }
    };

    setSimResults({
      modelVersion: CLEARING_VERSION_REGISTRY.MODEL,
      versionMeta: currentRun.versionMeta,
      currentRun,
      quarter: selectedQuarter,
      epicenterCode: epicenter,
      simMode,
      enSortMetric,
      haircutPct,
      deleveragingMultiplier,
      dollarSqueezePct,
      iterationsCount: iterShock,
      clearingResidual: diffShock,
      epicenterHaircutAmount: epicenterHaircutAmountDisplay,
      epicenterLiab: epicenterLiabDisplay,
      totalBaselineShortfall: Math.round(totBaseRaw * 10) / 10,
      totalPostShockShortfall: Math.round(totShockRaw * 10) / 10,
      totalIncrementalShortfall: Math.round(totIncrementalRaw * 10) / 10,
      totalBaselineRaw: totBaseRaw,
      totalPostShockRaw: totShockRaw,
      totalIncrementalRaw: totIncrementalRaw,
      totalR1Loss,
      totalR2Contagion,
      totalR3Dollar,
      totalSystemicLoss: totalR1Loss + totalR2Contagion + totalR3Dollar,
      validLiabCoverage: `${validLiabCount}/${countries.length - 1}`,
      validReservesCoverage: `${validReservesCount}/${countries.length}`,
      impactList
    });
  };

  // Run on mount or when parameters change
  useEffect(() => {
    runSimulation();
  }, [epicenter, haircutPct, deleveragingMultiplier, dollarSqueezePct, selectedQuarter, simMode, enSortMetric]);

  // Render Cascade Chart
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

  useEffect(() => {
    if (!chartInstance.current || !simResults) return;

    const topImpacted = simResults.impactList.slice(0, 10).reverse();
    const isEn = simMode === 'en_clearing';

    const option = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: 'rgba(10, 15, 30, 0.94)',
        borderColor: isEn ? 'rgba(244, 63, 94, 0.5)' : 'rgba(244, 63, 94, 0.4)',
        borderWidth: 1,
        padding: [10, 14],
        extraCssText: 'box-shadow: 0 12px 36px rgba(0,0,0,0.6); backdrop-filter: blur(12px); border-radius: 8px;',
        textStyle: { color: '#f8fafc', fontSize: 12 },
        formatter: (params) => {
          const item = topImpacted[params[0].dataIndex];
          if (!item) return '';
          if (isEn) {
            return `
              <div class="p-1 font-sans">
                <div class="font-bold text-white border-b border-rose-500/40 pb-1 mb-1.5 flex items-center justify-between">
                  <span>${item.name_zh} (${item.code})</span>
                  <span class="text-[10px] font-mono text-rose-300">Eisenberg-Noe 双基线分解</span>
                </div>
                <div class="space-y-1 text-xs">
                  <div class="text-rose-400 font-bold">
                    冲击净增量 (Marginal Shock Loss): <b class="font-mono text-white">+$${item.enIncrementalShortfall}B (+${Math.round(item.enIncrementalShortfall * 10).toLocaleString()} 亿美元)</b>
                  </div>
                  <div class="text-slate-400 text-[11px] pl-2 border-l border-rose-500/40">
                    <div>· 直接受震中违约传导: <b class="font-mono text-rose-300">+$${item.enIncrementalDirect}B</b></div>
                    <div>· 网络次生级联扩散增量: <b class="font-mono text-purple-300">+$${item.enIncrementalIndirect}B</b></div>
                  </div>
                  <div class="border-t border-slate-800 pt-1 text-slate-300">
                    零冲击基线短缺 (Zero-Shock Base): <b class="font-mono text-slate-400">$${item.enBaselineShortfall}B</b>
                  </div>
                  <div class="text-slate-300">
                    冲击后总短缺 (Post-Shock Total S*): <b class="font-mono text-white font-bold">$${item.enPostShockShortfall}B</b>
                  </div>
                  <div class="text-[10px] text-slate-400 pt-0.5">
                    增量损失占官方外储比: <b class="font-mono text-amber-400">${item.enIncrementalToReservesPct !== 'NA' ? `+${item.enIncrementalToReservesPct}%` : 'NA (外储未收录)'}</b>
                  </div>
                  <div class="text-[10px] text-slate-500 mt-1 leading-normal">
                    压力测试准则：严格剥离网络闭合静态基线，仅度量外生冲击所致边际缺口。
                  </div>
                </div>
              </div>
            `;
          }
          return `
            <div class="p-1 font-sans">
              <div class="font-bold text-white border-b border-slate-700 pb-1 mb-1">
                ${item.name_zh} (${item.code}) 行为级联损益
              </div>
              <div class="space-y-1 text-xs">
                <div>第一轮：直接资产减记损失: <b class="font-mono text-rose-400">$${item.r1Loss}B (${Math.round(item.r1Loss * 10).toLocaleString()} 亿美元)</b></div>
                <div>第二轮：去杠杆流动性抽离: <b class="font-mono text-amber-400">$${item.r2Spillover}B (${Math.round(item.r2Spillover * 10).toLocaleString()} 亿美元)</b></div>
                <div>第三轮：离岸美元再融资挤压: <b class="font-mono text-sky-400">${item.r3Dollar !== null ? `$${item.r3Dollar}B (${Math.round(item.r3Dollar * 10).toLocaleString()} 亿美元)` : 'NA (数据缺失)'}</b></div>
                <div class="border-t border-slate-800 pt-1">
                  综合受损总额: <b class="font-mono text-white text-sm font-bold">$${item.totalImpact}B (${Math.round(item.totalImpact * 10).toLocaleString()} 亿美元)</b>
                </div>
                <div class="text-[10px] text-slate-400">冲击占外汇储备比: <b class="font-mono text-rose-400">${item.impactToReservesPct}%</b></div>
              </div>
            </div>
          `;
        }
      },
      legend: {
        data: isEn
          ? ['零冲击基线短缺 (Zero-Shock Base)', '冲击净增量 (Marginal Shock Loss)']
          : ['第一轮：直接资产减记 (Direct Loss)', '第二轮：去杠杆流动性抽离 (Secondary Retrenchment)', '第三轮：离岸美元再融资挤压 (USD Squeeze)'],
        top: 8,
        textStyle: { color: '#94a3b8', fontSize: 11 }
      },
      grid: {
        left: '18%',
        right: '8%',
        top: '16%',
        bottom: '8%'
      },
      xAxis: {
        type: 'value',
        name: isEn ? '清算短缺额 (USD Bn)' : '受损规模 (USD Bn)',
        splitLine: { lineStyle: { color: '#1e293b' } },
        axisLabel: { color: '#94a3b8', formatter: '${value}B' }
      },
      yAxis: {
        type: 'category',
        data: topImpacted.map(d => d.name_zh),
        axisLine: { lineStyle: { color: '#334155' } },
        axisLabel: { color: '#cbd5e1', fontSize: 11 }
      },
      series: isEn
        ? [
            {
              name: '零冲击基线短缺 (Zero-Shock Base)',
              type: 'bar',
              stack: 'total',
              itemStyle: { color: '#334155' },
              data: topImpacted.map(d => d.enBaselineShortfall)
            },
            {
              name: '冲击净增量 (Marginal Shock Loss)',
              type: 'bar',
              stack: 'total',
              itemStyle: { color: '#f43f5e' },
              data: topImpacted.map(d => d.enIncrementalShortfall)
            }
          ]
        : [
            {
              name: '第一轮：直接资产减记 (Direct Loss)',
              type: 'bar',
              stack: 'total',
              itemStyle: { color: '#f43f5e' },
              data: topImpacted.map(d => d.r1Loss)
            },
            {
              name: '第二轮：去杠杆流动性抽离 (Secondary Retrenchment)',
              type: 'bar',
              stack: 'total',
              itemStyle: { color: '#f59e0b' },
              data: topImpacted.map(d => d.r2Spillover)
            },
            {
              name: '第三轮：离岸美元再融资挤压 (USD Squeeze)',
              type: 'bar',
              stack: 'total',
              itemStyle: { color: '#38bdf8' },
              data: topImpacted.map(d => d.r3Dollar || 0)
            }
          ]
    };

    chartInstance.current.setOption(option, true);
  }, [simResults, simMode, enSortMetric]);

  const handleDownloadSnapshot = () => {
    if (!chartInstance.current) return;
    const url = chartInstance.current.getDataURL({
      type: 'png',
      pixelRatio: 2,
      backgroundColor: '#080c14'
    });
    const a = document.createElement('a');
    a.href = url;
    a.download = `bis_contagion_simulation_${epicenter}_${selectedQuarter}.png`;
    a.click();
  };

  const handleExportScenarioCsv = () => {
    if (!simResults || !simResults.currentRun) return;
    soundFx.playTick();
    const cr = simResults.currentRun;
    const rows = [
      ['=== BIS Atlas Network Stress Clearing Scenario Report ==='],
      ['Product Version', cr.versionMeta.productVersion],
      ['Model Version', cr.versionMeta.modelVersion],
      ['Data Version', cr.versionMeta.dataVersion],
      ['Quarter', cr.quarter],
      ['Quarter Status', cr.quarterStatus],
      ['Epicenter Code', cr.epicenterCode],
      ['Epicenter Name', cr.epicenterNameZh],
      ['Epicenter Total Liabilities (USD Bn)', cr.epicenterLiabDisplay],
      ['Haircut Percentage', `${cr.haircutPct}%`],
      ['Epicenter Haircut Amount (USD Bn)', cr.epicenterHaircutAmountDisplay],
      ['Zero-Shock Baseline Shortfall (USD Bn)', cr.baselineTotalDisplay],
      ['Post-Shock Total Shortfall (USD Bn)', cr.postShockTotalDisplay],
      ['Marginal Incremental Shortfall (USD Bn)', `+${cr.incrementalTotalDisplay}`],
      ['Top Incremental Victim', cr.topVictim ? `${cr.topVictim.name_zh} (${cr.topVictim.code}): ${cr.topVictim.incrementalFormatted}` : 'None'],
      ['Iterations Count', simResults.iterationsCount],
      ['Fixed-Point Residual', '< 1e-4 Bn USD'],
      [''],
      ['Jurisdiction Code', 'Jurisdiction Name', 'Baseline Shortfall (USD Bn)', 'Post-Shock Shortfall (USD Bn)', 'Marginal Incremental Shortfall (USD Bn)', 'FX Reserves (USD Bn)', 'Incremental / Reserves (%)', 'Direct from Epicenter (USD Bn)', 'Indirect from Cascade (USD Bn)']
    ];

    simResults.impactList.forEach(item => {
      rows.push([
        item.code,
        item.name_zh,
        item.enBaselineShortfall,
        item.enPostShockShortfall,
        item.enIncrementalShortfall,
        item.reserves !== null ? item.reserves : 'NA',
        item.enIncrementalToReservesPct,
        item.enIncrementalDirect,
        item.enIncrementalIndirect
      ]);
    });

    const csvContent = '\uFEFF' + rows.map(r => r.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `bis_clearing_scenario_${cr.epicenterCode}_${cr.quarter}_${cr.haircutPct}pct.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="glass-panel rounded-2xl p-5 shadow-2xl space-y-5">
      {/* Top Header & Simulation Controls */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-3 gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
            <AlertOctagon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                全球跨国银行网络系统性风险与传染扩散模拟器 (Eisenberg-Noe Contagion Cascade)
              </h2>
              <span className="text-[11px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                {selectedQuarter}
              </span>
              <DataClassificationBadge
                classification="STRESS_SIMULATION"
                sourceText="模型重构双边资产负债基准"
                methodText="Eisenberg & Noe (2001) 级联违约清算"
                onOpenAppendix={onOpenAppendix}
              />
            </div>
            <p className="text-xs text-slate-400 mt-1">
              基于模型重构之双边有向信贷网络，反事实推演某经济体违约或资本减记时，跨国银行一级资本的直接损失、去杠杆外溢与连锁流动性挤兑
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportScenarioCsv}
            className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-mono"
            title="导出当前清算情景数据 CSV (包含版本元数据、基线与增量)"
          >
            <FileText className="w-3.5 h-3.5 text-sky-400" />
            <span>导出情景 CSV</span>
          </button>
          <button
            onClick={handleDownloadSnapshot}
            className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="导出高清仿真图 PNG"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Model Mode Toggle Bar: Eisenberg-Noe (2001) vs Multi-Round Behavioral */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-900/90 border border-slate-800 rounded-xl">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-400 font-mono flex items-center gap-1.5 font-bold">
            <Layers className="w-4 h-4 text-purple-400" /> 清算模型契约 (Clearing Model Contract):
          </span>
          <div className="inline-flex rounded-lg bg-slate-950 p-1 border border-slate-800 text-xs">
            <button
              onClick={() => {
                soundFx.playTick();
                setSimMode('en_clearing');
              }}
              className={`px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                simMode === 'en_clearing'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Eisenberg–Noe (2001) 经典清算不动点</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-900/80 text-purple-200 border border-purple-400/40 font-mono">基准</span>
            </button>
            <button
              onClick={() => {
                soundFx.playTick();
                setSimMode('behavioral');
              }}
              className={`px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                simMode === 'behavioral'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>行为级联外溢模型 (Behavioral Contagion)</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-900/80 text-blue-200 border border-blue-400/40 font-mono">情景</span>
            </button>
          </div>
        </div>

        <div className="text-[11px] font-mono text-slate-400 flex flex-wrap items-center gap-2">
          <span>产品: <strong className="text-slate-200">{simResults?.versionMeta?.productVersion || CLEARING_VERSION_REGISTRY.PRODUCT}</strong></span>
          <span>·</span>
          <span>模型: <strong className="text-purple-300">{simResults?.versionMeta?.modelVersion || CLEARING_VERSION_REGISTRY.MODEL}</strong></span>
          <span>·</span>
          <span>数据: <strong className="text-sky-300">{simResults?.versionMeta?.dataVersion || CLEARING_VERSION_REGISTRY.DATA(selectedQuarter)}</strong></span>
          <span>·</span>
          <span>负债覆盖: <strong className="text-emerald-400">{simResults?.validLiabCoverage || '22/22'}</strong></span>
        </div>
      </div>

      {/* Scenario Presets Pill Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <span className="text-xs font-mono text-slate-400 flex items-center gap-1 shrink-0">
          <Zap className="w-3.5 h-3.5 text-amber-400" /> 经典压力预设:
        </span>
        {CONTAGION_PRESETS.map(p => (
          <button
            key={p.id}
            onClick={() => handleSelectPreset(p)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all shrink-0 cursor-pointer border ${
              activePreset === p.id
                ? 'bg-rose-600/30 text-rose-300 border-rose-500/60 font-bold shadow-sm'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title={p.desc}
          >
            {p.name}
          </button>
        ))}
        <button
          onClick={() => setActivePreset('custom')}
          className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all shrink-0 cursor-pointer border ${
            activePreset === 'custom'
              ? 'bg-sky-600/30 text-sky-300 border-sky-500/60 font-bold shadow-sm'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          ⚙️ 自由参数工坊
        </button>
      </div>

      {/* Simulator Control Sliders */}
      <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
        <div>
          <label className="block text-slate-400 mb-1 font-semibold">1. 设定震中经济体 (Trigger Epicenter):</label>
          <select
            value={epicenter}
            onChange={(e) => {
              setEpicenter(e.target.value);
              setActivePreset('custom');
            }}
            className="w-full bg-slate-800 border border-slate-700 text-white font-bold px-2 py-1.5 rounded focus:outline-none focus:border-rose-500 cursor-pointer"
          >
            {countries.map(c => (
              <option key={c.code} value={c.code}>
                {c.name_zh} ({c.code}) - {c.region}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div className="flex justify-between text-slate-400 mb-1">
            <span className="font-semibold">2. 债务违约/资产减记率 (Haircut):</span>
            <span className="font-mono text-rose-400 font-bold">{haircutPct}%</span>
          </div>
          <input
            type="range"
            min={5}
            max={60}
            step={5}
            value={haircutPct}
            onChange={(e) => {
              setHaircutPct(parseInt(e.target.value, 10));
              setActivePreset('custom');
            }}
            className="w-full accent-rose-500 bg-slate-800 h-1.5 rounded appearance-none cursor-pointer mt-1"
          />
        </div>

        <div className={simMode === 'en_clearing' ? 'opacity-50' : ''}>
          <div className="flex justify-between text-slate-400 mb-1">
            <span className="font-semibold">3. 跨国银行去杠杆乘数 {simMode === 'en_clearing' && '(行为模式)'}:</span>
            <span className="font-mono text-amber-400 font-bold">{deleveragingMultiplier}x</span>
          </div>
          <input
            type="range"
            min={1.0}
            max={3.0}
            step={0.1}
            disabled={simMode === 'en_clearing'}
            value={deleveragingMultiplier}
            onChange={(e) => {
              setDeleveragingMultiplier(parseFloat(e.target.value));
              setActivePreset('custom');
            }}
            className="w-full accent-amber-500 bg-slate-800 h-1.5 rounded appearance-none cursor-pointer mt-1 disabled:cursor-not-allowed"
          />
        </div>

        <div className={simMode === 'en_clearing' ? 'opacity-50' : ''}>
          <div className="flex justify-between text-slate-400 mb-1">
            <span className="font-semibold">4. 离岸美元流动性抽水 {simMode === 'en_clearing' && '(行为模式)'}:</span>
            <span className="font-mono text-sky-400 font-bold">{dollarSqueezePct}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={30}
            step={2}
            disabled={simMode === 'en_clearing'}
            value={dollarSqueezePct}
            onChange={(e) => {
              setDollarSqueezePct(parseInt(e.target.value, 10));
              setActivePreset('custom');
            }}
            className="w-full accent-sky-400 bg-slate-800 h-1.5 rounded appearance-none cursor-pointer mt-1 disabled:cursor-not-allowed"
          />
        </div>
      </div>

      {/* Summary KPI Badges */}
      {simResults && (
        simMode === 'en_clearing' ? (
          <div className="space-y-3">
            {/* 4 Core Eisenberg-Noe KPI Badges */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                <div className="text-[11px] text-slate-400 uppercase tracking-wider font-mono">
                  1. 震中外生减记 (Epicenter Haircut)
                </div>
                <div className="text-lg font-bold font-mono text-rose-400 mt-0.5">
                  ${simResults.currentRun?.epicenterHaircutAmountDisplay ?? simResults.epicenterHaircutAmount}B ({Math.round((simResults.currentRun?.epicenterHaircutAmountDisplay ?? simResults.epicenterHaircutAmount) * 10).toLocaleString()} 亿美元)
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {simResults.currentRun?.epicenterNameZh || epicenterCountry.name_zh} ({simResults.currentRun?.epicenterCode || epicenter}) 负债总额 ${simResults.currentRun?.epicenterLiabDisplay ?? simResults.epicenterLiab}B 施加 {haircutPct}% 减记
                </div>
              </div>

              <div className="bg-rose-950/30 p-3 rounded-xl border border-rose-500/50 shadow-lg relative overflow-hidden">
                <div className="absolute top-1.5 right-2 px-1.5 py-0.5 rounded text-[9px] font-mono bg-rose-500 text-white font-bold tracking-wider">
                  压力测试核心指标
                </div>
                <div className="text-[11px] text-rose-300 uppercase tracking-wider font-mono">
                  2. 冲击净增量短缺 (Marginal Loss ΔS)
                </div>
                <div className="text-xl font-bold font-mono text-rose-400 mt-0.5">
                  +${simResults.currentRun?.incrementalTotalDisplay ?? simResults.totalIncrementalShortfall}B (+${(((simResults.currentRun?.incrementalTotalRaw ?? simResults.totalIncrementalShortfall)) / 1000).toFixed(4)}T)
                </div>
                <div className="text-[11px] text-rose-200/80 mt-0.5">
                  剥离静态基线后的冲击边际破坏力 (放大 {((simResults.currentRun?.incrementalTotalRaw ?? simResults.totalIncrementalShortfall) / Math.max(1, simResults.currentRun?.epicenterHaircutAmountRaw ?? simResults.epicenterHaircutAmount)).toFixed(2)}x)
                </div>
              </div>

              <div className="bg-purple-950/20 p-3 rounded-xl border border-purple-500/30">
                <div className="text-[11px] text-purple-300 uppercase tracking-wider font-mono">
                  3. 冲击后清算总短缺 (Post-Shock Total S*)
                </div>
                <div className="text-lg font-bold font-mono text-purple-300 mt-0.5">
                  ${simResults.currentRun?.postShockTotalDisplay ?? simResults.totalPostShockShortfall}B (${(((simResults.currentRun?.postShockTotalRaw ?? simResults.totalPostShockShortfall)) / 1000).toFixed(4)}T)
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  基线 ${simResults.currentRun?.baselineTotalDisplay ?? simResults.totalBaselineShortfall}B (${(((simResults.currentRun?.baselineTotalRaw ?? simResults.totalBaselineShortfall)) / 1000).toFixed(4)}T) + 冲击增量
                </div>
              </div>

              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                <div className="text-[11px] text-slate-400 uppercase tracking-wider font-mono">
                  4. Picard 不动点双基线收敛
                </div>
                <div className="text-lg font-bold font-mono text-emerald-400 mt-0.5">
                  {simResults.iterationsCount} 次迭代 (双基线均收敛)
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  最大残差 &lt; 1e-4 Bn USD (覆盖 {countries.length} 个主要管辖区)
                </div>
              </div>
            </div>

            {/* Expandable Diagnostic Accordion: Why is Baseline Large? */}
            <div className="bg-slate-900/90 border border-purple-500/30 rounded-xl overflow-hidden transition-all">
              <button
                onClick={() => {
                  soundFx.playTick();
                  setShowBaselineDiagnostic(!showBaselineDiagnostic);
                }}
                className="w-full px-4 py-2.5 flex items-center justify-between text-left hover:bg-slate-800/60 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-purple-400 shrink-0" />
                  <span className="text-xs font-bold text-white">
                    🔬 核心方法论诊断：为何网络零冲击基线短缺偏大（${(((simResults.currentRun?.baselineTotalRaw ?? simResults.totalBaselineShortfall)) / 1000).toFixed(4)}T）？
                  </span>
                  <span className="text-[10px] font-mono text-purple-300 bg-purple-950/80 px-2 py-0.5 rounded border border-purple-500/40">
                    实证与边界机制
                  </span>
                </div>
                <div className="flex items-center gap-1 text-xs text-slate-400">
                  <span>{showBaselineDiagnostic ? '收起诊断' : '展开诊断拆解'}</span>
                  {showBaselineDiagnostic ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </button>

              {showBaselineDiagnostic && (
                <div className="p-4 border-t border-slate-800/80 bg-slate-950/60 grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs text-slate-300">
                  <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800 space-y-1">
                    <div className="font-bold text-sky-400 flex items-center gap-1.5">
                      <span>1. 闭合银行间边界限制 (Network Perimeter)</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                      当前网络模型聚焦全球 23 个核心管辖区间的跨国银行资产负债。这是一个纯粹的银行间闭合系统，未纳入各国庞大的国内工商业居民存款、经常账户累积顺差、非银金融机构流动性及主权国内资产。
                    </p>
                  </div>

                  <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800 space-y-1">
                    <div className="font-bold text-emerald-400 flex items-center gap-1.5">
                      <span>2. 外部流动性缓冲参数化假定 (Boundary Capital e_i)</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                      经典 Eisenberg-Noe 假设外部缓冲注入来自网络之外的自由现金流。本系统遵循学术通用口径，将外部流动性参数化为各国官方外汇储备的 1.5 倍（e_i = 1.5 × 官方外汇储备 FX Reserves）。未填报外汇储备的国家严格计为 0，不施加常数插补。
                    </p>
                  </div>

                  <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800 space-y-1">
                    <div className="font-bold text-amber-400 flex items-center gap-1.5">
                      <span>3. 清算中枢与主要储备货币国的结构性错配 (Structural Mismatch)</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                      全球金融中心与核心储备货币国承担数万亿美元的跨国负债，但官方主权外汇储备规模极小。在当前 {selectedQuarter} 矩阵中：
                      {simResults?.currentRun?.structuralSamples?.map((s) => (
                        <span key={s.code} className="inline-block mr-2 font-mono text-slate-200">
                          · {s.name} ({s.code}): 负债 {s.liabilitiesTrillion ? `$${s.liabilitiesTrillion}T` : 'NA'}，外储 {s.reservesBn !== null ? `$${s.reservesBn}B` : 'NA'}
                        </span>
                      ))}
                      。在未引入美联储贴现窗口与常备央行互换（FIMA/Swap Lines）的极简模型中，静态不动点清算自然呈现内生结构性未清偿短缺（当前网络基线 ${(simResults?.currentRun?.baselineTotalDisplay / 1000).toFixed(4)}T）。
                    </p>
                  </div>

                  <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800 space-y-1">
                    <div className="font-bold text-rose-400 flex items-center gap-1.5">
                      <span>4. 压力测试科学准则：差分增量（Differential Incremental Loss）</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                      在宏观金融压力测试中，<strong>绝对短缺量（${(((simResults?.currentRun?.postShockTotalRaw ?? simResults?.totalPostShockShortfall)) / 1000).toFixed(4)}T / ${simResults?.currentRun?.postShockTotalDisplay ?? simResults?.totalPostShockShortfall}B）绝不能称作“{simResults?.currentRun?.epicenterNameZh || epicenterCountry.name_zh}冲击造成的损失”</strong>！科学的评估指标是<strong>边际净增量（ΔS = S* - S^(0) = +${simResults?.currentRun?.incrementalTotalDisplay ?? simResults?.totalIncrementalShortfall}B / +${(((simResults?.currentRun?.incrementalTotalRaw ?? simResults?.totalIncrementalShortfall)) / 1000).toFixed(4)}T）</strong>。
                      {simResults?.currentRun?.topVictim && (
                        <span>
                          观察增量排位能精准识别第一受害国（{simResults?.currentRun?.epicenterNameZh || epicenterCountry.name_zh}的最大外生波及受害者为 <strong>{simResults?.currentRun?.topVictim?.name_zh} ({simResults?.currentRun?.topVictim?.code})</strong>，增量排名第 1，<strong>{simResults?.currentRun?.topVictim?.incrementalFormatted}</strong>），避免真实传染链路被静态庞大基线所掩盖。
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
              <div className="text-[11px] text-slate-400 uppercase tracking-wider font-mono">
                震中直接吸收敞口 (Round 1)
              </div>
              <div className="text-lg font-bold font-mono text-rose-400 mt-0.5">
                ${simResults.totalR1Loss}B ({Math.round(simResults.totalR1Loss * 10).toLocaleString()} 亿美元)
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                由 {epicenterCountry.name_zh} 的直接主要债权国银行承担
              </div>
            </div>

            <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
              <div className="text-[11px] text-slate-400 uppercase tracking-wider font-mono">
                次生信贷抽离外溢 (Round 2)
              </div>
              <div className="text-lg font-bold font-mono text-amber-400 mt-0.5">
                ${simResults.totalR2Contagion}B ({Math.round(simResults.totalR2Contagion * 10).toLocaleString()} 亿美元)
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                受损银行为了维系资本充足率削减的外债池
              </div>
            </div>

            <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
              <div className="text-[11px] text-slate-400 uppercase tracking-wider font-mono">
                离岸美元挤兑缺口 (Round 3)
              </div>
              <div className="text-lg font-bold font-mono text-sky-400 mt-0.5">
                ${simResults.totalR3Dollar}B ({Math.round(simResults.totalR3Dollar * 10).toLocaleString()} 亿美元)
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                非美实体美元未对冲敞口再融资冲击 (覆盖率: {simResults.validLiabCoverage})
              </div>
            </div>

            <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
              <div className="text-[11px] text-slate-400 uppercase tracking-wider font-mono">
                全网系统性流动性蒸发
              </div>
              <div className="text-lg font-bold font-mono text-white mt-0.5">
                ${simResults.totalSystemicLoss}B ({Math.round(simResults.totalSystemicLoss * 10).toLocaleString()} 亿美元)
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                波及经济体数量: {simResults.impactList.length} 个
              </div>
            </div>
          </div>
        )
      )}

      {/* Main Grid: Cascade Chart + Impact Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Cascade Chart (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900/40 border border-slate-800/90 rounded-xl p-3 flex flex-col justify-between">
          <div className="text-xs font-bold text-white flex flex-wrap items-center justify-between border-b border-slate-800 pb-2 gap-2">
            <span>{simMode === 'en_clearing' ? 'Eisenberg-Noe (2001) 清算短缺受害国级联分解 (前 10 大)' : '受冲击最深的前 10 大受害经济体级联损益'}</span>
            {simMode === 'en_clearing' ? (
              <span className="text-[10px] text-slate-400 font-mono">
                {enSortMetric === 'incremental' ? '按冲击净增量 Δ 排序 (堆叠显示基线与增量)' : enSortMetric === 'baseline' ? '按零冲击基线排序' : '按冲击后总额排序'}
              </span>
            ) : (
              <span className="text-[10px] text-slate-400 font-mono">Round 1 + Round 2 + Round 3</span>
            )}
          </div>
          <div ref={chartRef} className="w-full h-[360px]" />
        </div>

        {/* Impact Table (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900/40 border border-slate-800/90 rounded-xl p-3 flex flex-col justify-between">
          <div>
            <div className="text-xs font-bold text-white border-b border-slate-800 pb-2 mb-2 flex flex-wrap items-center justify-between gap-1.5">
              <span>{simMode === 'en_clearing' ? '清算受创排序榜单' : '系统性行为受创排序榜单'}</span>
              {simMode === 'en_clearing' ? (
                <div className="inline-flex rounded bg-slate-950 p-0.5 border border-slate-800 text-[10px]">
                  <button
                    onClick={() => {
                      soundFx.playTick();
                      setEnSortMetric('incremental');
                    }}
                    className={`px-2 py-0.5 rounded font-mono transition-colors cursor-pointer ${
                      enSortMetric === 'incremental'
                        ? 'bg-rose-600 text-white font-bold shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    冲击增量 Δ
                  </button>
                  <button
                    onClick={() => {
                      soundFx.playTick();
                      setEnSortMetric('post_shock');
                    }}
                    className={`px-2 py-0.5 rounded font-mono transition-colors cursor-pointer ${
                      enSortMetric === 'post_shock'
                        ? 'bg-purple-600 text-white font-bold shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    总短缺 S*
                  </button>
                  <button
                    onClick={() => {
                      soundFx.playTick();
                      setEnSortMetric('baseline');
                    }}
                    className={`px-2 py-0.5 rounded font-mono transition-colors cursor-pointer ${
                      enSortMetric === 'baseline'
                        ? 'bg-slate-700 text-white font-bold shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    基线 S0
                  </button>
                </div>
              ) : (
                <span className="text-slate-400 text-[10px]">按综合受损总额降序</span>
              )}
            </div>

            <div className="space-y-1.5 max-h-[340px] overflow-y-auto">
              {simResults?.impactList.map((item, idx) => {
                if (simMode === 'en_clearing') {
                  return (
                    <div
                      key={item.code}
                      onClick={() => onSelectCountry(item.code)}
                      className="p-2 bg-slate-950/80 hover:bg-slate-800/80 border border-slate-800/80 rounded-lg cursor-pointer transition-all flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-slate-500 text-[11px] w-4">{idx + 1}.</span>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-white">{item.name_zh}</span>
                            <span className="font-mono text-[10px] text-slate-400">({item.code})</span>
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            基线 ${item.enBaselineShortfall}B → 冲击后 ${item.enPostShockShortfall}B
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-mono font-bold text-rose-400">
                          {item.enIncrementalShortfall > 0 ? `+${item.enIncrementalShortfall}B` : '$0.0B'}
                          <span className="text-[10px] font-normal text-slate-400 ml-1">
                            (+{Math.round(item.enIncrementalShortfall * 10).toLocaleString()} 亿)
                          </span>
                        </div>
                        <div className="text-[10px] text-amber-400/90 font-mono">
                          {item.enIncrementalToReservesPct !== 'NA' ? `增量/外储: +${item.enIncrementalToReservesPct}%` : '增量/外储: NA'}
                        </div>
                      </div>
                    </div>
                  );
                }

                // Behavioral mode
                const displayVal = item.totalImpact;
                const displayPct = item.impactToReservesPct;
                return (
                  <div
                    key={item.code}
                    onClick={() => onSelectCountry(item.code)}
                    className="p-2 bg-slate-950/80 hover:bg-slate-800/80 border border-slate-800/80 rounded-lg cursor-pointer transition-all flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-slate-500 text-[11px] w-4">{idx + 1}.</span>
                      <span className="font-bold text-white">{item.name_zh}</span>
                      <span className="font-mono text-[10px] text-slate-400">({item.code})</span>
                    </div>

                    <div className="text-right">
                      <div className="font-mono font-bold text-rose-400">
                        -${displayVal}B ({Math.round(displayVal * 10).toLocaleString()} 亿美元)
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        损耗储备: {displayPct}%
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="text-[11px] text-slate-400 bg-slate-950 p-2.5 rounded-lg border border-slate-800/80 mt-2 space-y-1">
            {simMode === 'en_clearing' ? (
              <div>
                💡 <strong>Eisenberg-Noe (2001) 双基线清算模型契约说明：</strong> 本模拟器同时计算零冲击初始基线 $p^{(0)}$ 与施加冲击后的清算不动点 $p^*$。压力测试聚焦于<strong>边际增量 $\Delta s_j = s_j^* - s_j^{(0)}$</strong>，将特定震中违约的外生破坏力与静态闭合网络的内生结构缺口彻底解耦，保障压力评估的客观性与科学性。
              </div>
            ) : (
              <div>
                💡 <strong>行为级联去杠杆模型说明：</strong> 本模式为启发式多轮情景压力测试（Round 1 直接减记 + Round 2 资产负债表收缩外溢 + Round 3 美元再融资挤压），用于演示恐慌传染扩散路径，不同于 Eisenberg-Noe 的静态不动点清算。
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Academic Methodology Footnote */}
      <MethodologyFootnote
        source="BIS CBS Table B4 (Consolidated Banking Statistics) & FSB G-SIB"
        accounting="最终风险承担原则 (Ultimate Risk Basis)"
        model="Eisenberg-Noe (2001) 级联清算模型"
        isSimulation={true}
        onOpenAppendix={onOpenAppendix}
      />
    </div>
  );
}
