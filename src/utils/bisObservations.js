import snapshot from '../data/bis_observations.json' with { type: 'json' };

export const PILOT_CORRIDORS = [['JP', 'US'], ['GB', 'US'], ['DE', 'US'], ['US', 'GB'], ['GB', 'JP']];
export const BIS_DATAFLOW = 'BIS:WS_LBS_D_PUB(1.0)';
export const BIS_TABLE = 'https://data.bis.org/topics/LBS/tables-and-dashboards/BIS,LBS_A6_2,1.0';
export const bisSnapshot = snapshot;

export function bisObservation(quarter, measure, reporter = '5A', counterparty = '5J') {
  const key = `Q.${measure}.C.A.TO1.A.5J.A.${reporter}.A.${counterparty}.N`;
  const item = snapshot.series[key]?.[quarter];
  return {
    quarter,
    key,
    source: `https://data.bis.org/topics/LBS/BIS,WS_LBS_D_PUB,1.0/${key}`,
    valueMn: item?.value_mn ?? null,
    state: item?.state ?? 'missing',
    status: item?.obs_status ?? '',
    confidentiality: item?.obs_conf ?? ''
  };
}

export function previousQuarter(quarter) {
  const year = Number(quarter.slice(0, 4));
  const period = Number(quarter.at(-1));
  return period === 1 ? `${year - 1}Q4` : `${year}Q${period - 1}`;
}

export function bisResearchMetrics(quarter, reporter, counterparty) {
  const stock = bisObservation(quarter, 'S', reporter, counterparty);
  const prior = bisObservation(previousQuarter(quarter), 'S', reporter, counterparty);
  const adjusted = bisObservation(quarter, 'F', reporter, counterparty);
  const stockChangeMn = stock.valueMn === null || prior.valueMn === null
    ? null
    : Math.round((stock.valueMn - prior.valueMn) * 1000) / 1000;
  return { stock, prior, adjusted, stockChangeMn };
}

export function formatBisAmount(valueMn) {
  return valueMn === null ? '未取得' : amountFormatter.format(valueMn / 1000);
}

const amountFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 3 });

export function bisResearchRows(quarter) {
  return [['5A', '5J'], ...PILOT_CORRIDORS].flatMap(([reporter, counterparty]) => {
    const { stock, prior, adjusted, stockChangeMn } = bisResearchMetrics(quarter, reporter, counterparty);
    return [
      [stock, 'stock', stock.valueMn],
      [prior, 'previous_stock', prior.valueMn],
      [stock, 'stock_difference', stockChangeMn],
      [adjusted, 'fx_break_adjusted_change', adjusted.valueMn]
    ].map(([observation, metric, value]) => ({
      report_quarter: quarter,
      observation_quarter: observation.quarter,
      reporting_location: reporter,
      counterparty_location: counterparty,
      metric,
      value_usd_million: value,
      data_state: value !== null && metric === 'stock_difference' ? 'derived' : value !== null
        ? observation.state : metric === 'stock_difference' ? 'missing' : observation.state,
      bis_obs_status: metric === 'stock_difference' ? '' : observation.status,
      bis_obs_conf: metric === 'stock_difference' ? '' : observation.confidentiality,
      sdmx_dataflow: BIS_DATAFLOW,
      sdmx_key: observation.key,
      source_url: observation.source,
      snapshot_version: snapshot.version,
      fetched_at_utc: snapshot.fetched_at
    }));
  });
}
