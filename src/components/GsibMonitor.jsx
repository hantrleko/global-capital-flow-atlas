import React, { useState, useMemo } from 'react';
import { 
  Building2, ShieldCheck, AlertTriangle, ArrowRight, Search, 
  Filter, Layers, TrendingDown, DollarSign, Activity, Zap,
  CheckCircle2, Globe, Sparkles
} from 'lucide-react';
import { GSIB_BANKS, GSIB_BUCKETS } from '../data/gsibData';
import { formatValueInCurrency } from '../utils/currencyConversion';
import soundFx from '../utils/soundEffects';
import MethodologyFootnote from './MethodologyFootnote';
import DataClassificationBadge from './DataClassificationBadge';

export default function GsibMonitor({
  dataset,
  selectedQuarter,
  onSelectCountry,
  selectedCurrency = 'USD',
  onOpenAppendix
}) {
  const [selectedBucket, setSelectedBucket] = useState('ALL');
  const [selectedCountryFilter, setSelectedCountryFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeBankId, setActiveBankId] = useState(GSIB_BANKS[0].id);
  const [stressShockPct, setStressShockPct] = useState(15);

  const countries = dataset.countries || [];
  const countryNameMap = useMemo(() => {
    return Object.fromEntries(countries.map(c => [c.code, c.name_zh || c.name]));
  }, [countries]);

  const allCountriesWithGsibs = useMemo(() => {
    return ['ALL', ...Array.from(new Set(GSIB_BANKS.map(b => b.country)))];
  }, []);

  const filteredBanks = useMemo(() => {
    return GSIB_BANKS.filter(b => {
      if (selectedBucket !== 'ALL' && b.bucket.toString() !== selectedBucket) return false;
      if (selectedCountryFilter !== 'ALL' && b.country !== selectedCountryFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          b.name.toLowerCase().includes(q) ||
          b.name_zh.toLowerCase().includes(q) ||
          b.id.toLowerCase().includes(q) ||
          b.country.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [selectedBucket, selectedCountryFilter, searchQuery]);

  const activeBank = useMemo(() => {
    return GSIB_BANKS.find(b => b.id === activeBankId) || filteredBanks[0] || GSIB_BANKS[0];
  }, [activeBankId, filteredBanks]);

  // Simulated bank stress impact
  const stressImpact = useMemo(() => {
    if (!activeBank) return null;
    const directContractionBn = Math.round(activeBank.cross_border_claims_bn * (stressShockPct / 100));
    const affectedCountries = activeBank.primary_jurisdictions.map(code => {
      const share = 1 / activeBank.primary_jurisdictions.length;
      return {
        code,
        name: countryNameMap[code] || code,
        estimatedLossBn: Math.round(directContractionBn * share)
      };
    });
    return {
      directContractionBn,
      affectedCountries
    };
  }, [activeBank, stressShockPct, countryNameMap]);

  return (
    <div className="space-y-3">
      {/* Header Bar */}
      <div className="glass-panel rounded-xl px-3.5 py-2 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-400/25 flex items-center justify-center text-purple-400 shrink-0">
            <Building2 className="w-4 h-4 text-purple-300" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm font-semibold text-white tracking-wide">
                G-SIB 全球系统重要性银行穿透透镜
              </h2>
              <span className="text-[11px] font-mono bg-purple-500/10 text-purple-300 border border-purple-500/30 px-2 py-0.2 rounded-full">
                {selectedQuarter}
              </span>
              <DataClassificationBadge
                classification={selectedQuarter > '2026Q2' ? 'NOWCAST_PREDICTION' : 'OFFICIAL_OBSERVED'}
                quarter={selectedQuarter}
                sourceText="FSB & Basel Committee G-SIB Registry"
                methodText="巴塞尔监管资本加计与跨国银行穿透"
                onOpenAppendix={onOpenAppendix}
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              从主权宏观信用下沉至跨国巨头银行资产负债表 · 资本充足率、跨境债权与中介走廊穿透
            </p>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700/80 rounded-lg px-2 h-7 text-xs">
            <Search className="w-3 h-3 text-slate-400" />
            <input
              type="text"
              placeholder="搜索银行..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent text-white placeholder-slate-500 focus:outline-none w-28 text-xs"
            />
          </div>

          <div className="flex items-center bg-slate-900 border border-slate-700/80 rounded-lg p-0.5 text-xs">
            {['ALL', '4', '3', '2', '1'].map(b => (
              <button
                key={b}
                onClick={() => {
                  soundFx.playTick();
                  setSelectedBucket(b);
                }}
                className={`px-2 py-0.5 rounded text-xs font-mono transition-all cursor-pointer ${
                  selectedBucket === b
                    ? 'bg-purple-600 text-white font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {b === 'ALL' ? '全桶' : `B${b}`}
              </button>
            ))}
          </div>

          <div className="flex items-center bg-slate-900 border border-slate-700/80 rounded-lg px-2 h-7 text-xs">
            <span className="text-slate-400 mr-1 text-[11px] font-mono">母国:</span>
            <select
              value={selectedCountryFilter}
              onChange={(e) => setSelectedCountryFilter(e.target.value)}
              className="bg-transparent text-white font-mono focus:outline-none cursor-pointer text-xs"
            >
              {allCountriesWithGsibs.map(c => (
                <option key={c} value={c} className="bg-slate-900 text-white">
                  {c === 'ALL' ? '全部母国' : `${countryNameMap[c] || c} (${c})`}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Content Grid: Bank Cards on Left, Detailed Balance Sheet & Stress Tester on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* Left Column: Bank Cards List (7 cols) */}
        <div className="lg:col-span-7 space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-[calc(100vh-320px)] min-h-[350px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-700">
            {filteredBanks.map(bank => {
              const isSelected = bank.id === activeBank.id;
              const bucketMeta = GSIB_BUCKETS[bank.bucket] || GSIB_BUCKETS[1];
              const isHighBucket = bank.bucket >= 3;

              return (
                <div
                  key={bank.id}
                  onClick={() => {
                    soundFx.playTick();
                    setActiveBankId(bank.id);
                  }}
                  className={`rounded-xl p-4 border transition-all cursor-pointer relative flex flex-col justify-between ${
                    isSelected
                      ? 'bg-gradient-to-b from-purple-950/60 to-slate-900 border-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.3)] scale-[1.01]'
                      : 'bg-slate-900/80 hover:bg-slate-800/80 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div>
                    {/* Top row */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">{bank.name_zh}</span>
                        <span className="text-xs text-slate-400 font-mono">({bank.id})</span>
                      </div>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                        isHighBucket
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                      }`}>
                        Bucket {bank.bucket} (+{bucketMeta.surcharge})
                      </span>
                    </div>

                    <div className="text-xs text-slate-300 font-medium mb-3">
                      {bank.name} &bull; <span className="font-mono text-sky-400">{countryNameMap[bank.country] || bank.country}</span>
                    </div>

                    {/* Metrics grid */}
                    <div className="grid grid-cols-3 gap-2 bg-slate-950/60 rounded-lg p-2.5 text-xs font-mono border border-slate-800/70 mb-3">
                      <div>
                        <span className="text-[10px] text-slate-500 block">总资产</span>
                        <span className="font-bold text-white">
                          {formatValueInCurrency(bank.assets_usd_bn, selectedCurrency, selectedQuarter)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">CET1 充足率</span>
                        <span className="font-bold text-emerald-400">{bank.cet1_ratio}%</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">跨境信贷</span>
                        <span className="font-bold text-sky-400">
                          {formatValueInCurrency(bank.cross_border_claims_bn, selectedCurrency, selectedQuarter)}
                        </span>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                      {bank.desc}
                    </p>
                  </div>

                  {/* Connected Jurisdictions Pills */}
                  <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between">
                    <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
                      {bank.primary_jurisdictions.map(c => (
                        <span key={c} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          {c}
                        </span>
                      ))}
                    </div>
                    <span className="text-[11px] text-purple-400 font-medium ml-2 shrink-0">
                      穿透详情 &rarr;
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Detailed Balance Sheet & Stress Tester (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Active Bank Detail Card */}
          <div className="glass-panel rounded-2xl p-5 border border-purple-500/30 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white">{activeBank.name_zh}</h3>
                  <span className="text-xs text-sky-400 font-mono">({activeBank.id})</span>
                </div>
                <div className="text-xs text-slate-400 mt-0.5">{activeBank.name}</div>
              </div>
              <button
                onClick={() => onSelectCountry?.(activeBank.country)}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-300 text-xs font-mono border border-slate-700 flex items-center gap-1 cursor-pointer"
              >
                <Globe className="w-3.5 h-3.5 text-sky-400" />
                <span>母国: {activeBank.country}</span>
              </button>
            </div>

            {/* Regulatory Capital Gauges */}
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-400">核心一级资本率 (CET1 Ratio)</span>
                  <span className="font-mono font-bold text-emerald-400">{activeBank.cet1_ratio}% (法定底线 7.0% + Surcharge)</span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-sky-500 rounded-full"
                    style={{ width: `${Math.min(100, (activeBank.cet1_ratio / 18) * 100)}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-400">杠杆率 (Leverage Ratio)</span>
                  <span className="font-mono font-bold text-sky-400">{activeBank.leverage_ratio}% (法定底线 3.0%)</span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-sky-500 to-indigo-500 rounded-full"
                    style={{ width: `${Math.min(100, (activeBank.leverage_ratio / 10) * 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Interactive Bank-Level Stress Simulator */}
            <div className="pt-3 border-t border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-amber-400" />
                  单体银行信贷骤缩压力测试 (Micro Shock)
                </span>
                <span className="text-xs font-mono font-bold text-rose-400">
                  -{stressShockPct}%
                </span>
              </div>

              <input
                type="range"
                min={5}
                max={40}
                step={5}
                value={stressShockPct}
                onChange={(e) => setStressShockPct(parseInt(e.target.value, 10))}
                className="w-full accent-amber-500 bg-slate-800 h-2 rounded-lg cursor-pointer"
              />

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
                <div className="text-xs text-slate-400">
                  预计该行跨境信贷收缩规模: <strong className="text-rose-400 font-mono">
                    {formatValueInCurrency(stressImpact.directContractionBn, selectedCurrency, selectedQuarter)}
                  </strong>
                </div>

                <div className="text-[11px] text-slate-400 font-mono">
                  直接波及的主要借款主权地区与预计抽资额度:
                </div>
                <div className="space-y-1.5">
                  {stressImpact.affectedCountries.map(c => (
                    <div key={c.code} className="flex items-center justify-between text-xs p-1.5 rounded bg-slate-900 border border-slate-800/80">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-white">{c.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">({c.code})</span>
                      </div>
                      <span className="font-mono text-rose-400 font-semibold">
                        -{formatValueInCurrency(c.estimatedLossBn, selectedCurrency, selectedQuarter)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Academic Methodology Footnote */}
      <MethodologyFootnote
        source="FSB G-SIB 2025/2026 Assessment & Basel III Pillar 3 Disclosures"
        accounting="最高并表母行原则 (Consolidated Parent Group Basis)"
        model="微观资产负债表信贷传导测算 (Micro Stress Test)"
        isSimulation={true}
        onOpenAppendix={onOpenAppendix}
      />
    </div>
  );
}
