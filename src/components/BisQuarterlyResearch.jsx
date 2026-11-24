import React, { useState } from 'react';
import { ArrowRight, Download, ExternalLink } from 'lucide-react';
import {
  bisResearchMetrics, bisResearchRows, bisSnapshot, BIS_TABLE, formatBisAmount, PILOT_CORRIDORS
} from '../utils/bisObservations';

function downloadQuarter(quarter) {
  const rows = bisResearchRows(quarter);
  const lines = [Object.keys(rows[0]).join(','), ...rows.map(row =>
    Object.values(row).map(value => '"' + String(value ?? '').replaceAll('"', '""') + '"').join(',')
  )];
  const url = URL.createObjectURL(new Blob([lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `Atlas-BIS-LBS-${quarter}-${bisSnapshot.version}.csv`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function SourceLink({ observation, children }) {
  return (
    <a href={observation.source} target="_blank" rel="noreferrer"
      className="inline-flex items-center gap-1 text-sky-300 hover:underline focus-visible:underline">
      {children}<ExternalLink className="h-3 w-3" aria-hidden="true" />
    </a>
  );
}

function amount(observation) {
  return observation.state === 'confidential' ? '保密' : formatBisAmount(observation.valueMn);
}

export default function BisQuarterlyResearch({ quarter, countries, onStress }) {
  const [selected, setSelected] = useState(null);
  const [showAll, setShowAll] = useState(false);
  const { stock, adjusted, stockChangeMn } = bisResearchMetrics(quarter);
  const names = Object.fromEntries(countries.map(country => [country.code, country.name_zh]));
  const corridors = PILOT_CORRIDORS.map(([reporter, counterparty]) => ({
    id: `${reporter}-${counterparty}`, reporter, counterparty,
    ...bisResearchMetrics(quarter, reporter, counterparty)
  })).filter(row => row.stock.valueMn !== null || row.adjusted.valueMn !== null)
    .sort((a, b) => (b.adjusted.valueMn === null ? -1 : Math.abs(b.adjusted.valueMn))
      - (a.adjusted.valueMn === null ? -1 : Math.abs(a.adjusted.valueMn)));
  const detail = corridors.find(row => row.id === selected);
  const marketName = code => names[code] || code;

  return (
    <section aria-labelledby="bis-quarterly-title" className="my-2 rounded-xl border border-sky-900/70 bg-[#101b29] p-3 text-slate-100 sm:p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-mono text-xs text-sky-300">
            BIS LBS · {quarter} · 十亿美元
            <span className="ml-2 hidden text-slate-400 lg:inline">快照 {bisSnapshot.version}</span>
          </p>
          <h2 className="mt-1 text-base font-semibold" id="bis-quarterly-title">跨境银行债权季度观察</h2>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <a className="text-sky-300 hover:underline" href={BIS_TABLE} target="_blank" rel="noreferrer">BIS A6.2 原表</a>
          <button type="button" onClick={() => downloadQuarter(quarter)} className="inline-flex items-center gap-1 rounded border border-sky-700/70 px-2 py-1.5">
            <Download className="h-3.5 w-3.5" aria-hidden="true" /> 下载季度 CSV
          </button>
        </div>
      </div>
      <div className="mt-2 lg:grid lg:grid-cols-[minmax(370px,2fr)_minmax(580px,3fr)] lg:gap-4">
        <dl className="mb-3 grid grid-cols-3 gap-1.5 sm:gap-2 lg:mb-0">
          <div className="rounded border border-slate-700/70 px-1.5 py-2 sm:px-3">
            <dt className="text-xs"><SourceLink observation={stock}>期末债权余额</SourceLink></dt>
            <dd className="mt-1 font-mono text-sm sm:text-lg">{amount(stock)}</dd>
          </div>
          <div className="rounded border border-slate-700/70 px-1.5 py-2 sm:px-3">
            <dt className="text-xs text-slate-300">余额较上季变化</dt>
            <dd className="mt-1 font-mono text-sm sm:text-lg">{formatBisAmount(stockChangeMn)}</dd>
          </div>
          <div className="rounded border border-slate-700/70 px-1.5 py-2 sm:px-3">
            <dt className="text-xs"><SourceLink observation={adjusted}>汇率及统计断点调整后变动</SourceLink></dt>
            <dd className="mt-1 font-mono text-sm sm:text-lg">{amount(adjusted)}</dd>
          </div>
        </dl>
        <div>
          <div className="flex flex-wrap items-baseline justify-between gap-1">
            <h3 className="text-sm font-semibold">公开双边序列 · 五条试点走廊</h3>
            <p className="text-xs text-slate-300">按调整后变动的绝对值排序</p>
          </div>
          {corridors.length > 0 ? (
            <ul id="bis-corridors" className="mt-2 grid gap-1 md:grid-cols-5">
              {corridors.map((row, index) => (
                <li key={row.id} className={index >= 3 && !showAll && detail?.id !== row.id ? 'hidden md:block' : ''}>
                  <button type="button" aria-expanded={detail?.id === row.id} aria-controls="bis-corridor-detail"
                    onClick={() => setSelected(detail?.id === row.id ? null : row.id)}
                  className="flex min-h-10 w-full items-center justify-between gap-1 rounded border border-slate-700/70 px-2 py-2 text-left text-xs hover:border-sky-400 aria-expanded:border-sky-400 lg:flex-col lg:items-start">
                  <span className="flex items-center gap-1 whitespace-nowrap">
                      {marketName(row.reporter)} <ArrowRight className="h-3 w-3" aria-hidden="true" /> {marketName(row.counterparty)}
                    </span>
                    <span className="font-mono">{amount(row.adjusted)}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : <p className="mt-2 text-xs text-slate-300">当前快照在本季度暂无试点走廊数据。</p>}
          {corridors.length > 3 && (
            <button type="button" aria-expanded={showAll} aria-controls="bis-corridors"
              onClick={() => setShowAll(value => !value)} className="min-h-8 text-xs text-sky-300 md:hidden">
              {showAll ? '只显示前三条' : '查看全部五条'}
            </button>
          )}
          {detail && (
            <div id="bis-corridor-detail" className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 rounded border border-sky-800 p-2 text-xs">
              <strong>{marketName(detail.reporter)} → {marketName(detail.counterparty)}</strong>
              <span>{detail.stock.quarter} 期末 {amount(detail.stock)}</span>
              <span>{detail.prior.quarter} 期末 {amount(detail.prior)}</span>
              <span>余额差 {formatBisAmount(detail.stockChangeMn)}</span>
              <span>调整后变动 {amount(detail.adjusted)}</span>
              <SourceLink observation={detail.stock}>存量序列</SourceLink>
              <SourceLink observation={detail.adjusted}>调整序列</SourceLink>
              <button type="button" onClick={() => onStress(detail.counterparty)}
                className="rounded border border-sky-700 px-2 py-1 hover:border-sky-400">以对手方为震中运行压力情景</button>
            </div>
          )}
        </div>
      </div>
      <p className="mt-2 text-xs text-slate-400 lg:hidden">
        BIS 快照 {bisSnapshot.version} · 截至 {bisSnapshot.latest_stock_quarter} · 试点走廊仅覆盖所列报告地与对手方。
      </p>
    </section>
  );
}
