/**
 * EUGENE FINANCE · Global Capital Flow Atlas
 * Phase 12 · Granular CSV Holdings Importer & Duration/OAS Stress Mapper
 *
 * Parses institutional buy-side security-level CSV holdings (ticker, issuer/name,
 * jurisdiction ISO-2, asset class, notional $M, modified duration, OAS bps),
 * normalizes them into portfolioStressEngine-compatible positions, and estimates
 * parallel rate + credit-spread mark-to-market shocks.
 */

export const VALID_ASSET_CLASSES = [
  'sovereign_debt',
  'corporate_credit',
  'equities',
  'interbank_loans',
  'fx_derivatives',
  'cash_hqla'
];

export const SAMPLE_GRANULAR_CSV = [
  'ticker,name,country,assetClass,amountMn,durationYears,oasBps',
  'UST-10Y,US Treasury 4.25% Nov 2034,US,sovereign_debt,180,8.2,12',
  'DBK-AT1,Deutsche Bank 6.75% Perpetual Credit,DE,corporate_credit,95,4.6,285',
  'HSBC-UK,HSBC Holdings 5.40% Senior London Interbank,GB,interbank_loans,110,3.1,135',
  'TURK-32,Republic of Turkey 9.375% USD Eurobond 2032,TR,sovereign_debt,75,5.4,490',
  'CAY-SPV,Cayman Offshore Multi-Strategy Credit SPV,KY,equities,40,0.5,310'
].join('\n');

const ASSET_CLASS_ALIASES = {
  sovereign_debt: 'sovereign_debt',
  sovereign: 'sovereign_debt',
  gov_bond: 'sovereign_debt',
  government_bond: 'sovereign_debt',
  treasury: 'sovereign_debt',
  rates: 'sovereign_debt',
  corporate_credit: 'corporate_credit',
  corporate: 'corporate_credit',
  credit: 'corporate_credit',
  corp_bond: 'corporate_credit',
  hy_credit: 'corporate_credit',
  ig_credit: 'corporate_credit',
  equities: 'equities',
  equity: 'equities',
  stock: 'equities',
  stocks: 'equities',
  pe: 'equities',
  fund: 'equities',
  interbank_loans: 'interbank_loans',
  interbank: 'interbank_loans',
  loan: 'interbank_loans',
  loans: 'interbank_loans',
  bank_loan: 'interbank_loans',
  fx_derivatives: 'fx_derivatives',
  fx: 'fx_derivatives',
  derivatives: 'fx_derivatives',
  fx_swap: 'fx_derivatives',
  swaps: 'fx_derivatives',
  cash_hqla: 'cash_hqla',
  cash: 'cash_hqla',
  hqla: 'cash_hqla',
  tbill: 'cash_hqla',
  money_market: 'cash_hqla'
};

const DEFAULT_DURATION_BY_ASSET_CLASS = {
  sovereign_debt: 6.5,
  corporate_credit: 4.5,
  interbank_loans: 1.5,
  fx_derivatives: 0.5,
  equities: 0.0,
  cash_hqla: 0.25
};

const DEFAULT_OAS_BY_ASSET_CLASS = {
  sovereign_debt: 45,
  corporate_credit: 180,
  interbank_loans: 90,
  fx_derivatives: 120,
  equities: 0,
  cash_hqla: 5
};

const HEADER_ALIASES = {
  ticker: 'ticker',
  symbol: 'ticker',
  cusip: 'ticker',
  isin: 'ticker',
  name: 'name',
  security: 'name',
  issuer: 'name',
  description: 'name',
  country: 'country',
  jurisdiction: 'country',
  iso: 'country',
  iso2: 'country',
  assetclass: 'assetClass',
  asset_class: 'assetClass',
  asset: 'assetClass',
  amountmn: 'amountMn',
  amount_mn: 'amountMn',
  amount: 'amountMn',
  notional: 'amountMn',
  mv_mn: 'amountMn',
  durationyears: 'durationYears',
  duration_years: 'durationYears',
  duration: 'durationYears',
  mod_duration: 'durationYears',
  oasbps: 'oasBps',
  oas_bps: 'oasBps',
  oas: 'oasBps',
  spread_bps: 'oasBps'
};

function roundTo(val, decimals = 2) {
  const factor = 10 ** decimals;
  return Math.round((Number(val) || 0) * factor) / factor;
}

/**
 * Splits a single CSV line while honoring RFC-4180 double-quoted fields.
 */
function splitCsvLine(line) {
  const cells = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      cells.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  cells.push(current.trim());
  return cells;
}

function normalizeAssetClass(rawAssetClass) {
  const normalizedKey = String(rawAssetClass || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
  if (ASSET_CLASS_ALIASES[normalizedKey]) {
    return ASSET_CLASS_ALIASES[normalizedKey];
  }
  return VALID_ASSET_CLASSES.includes(normalizedKey) ? normalizedKey : 'corporate_credit';
}

function parseOptionalNonNegativeNumber(rawValue, fallbackValue) {
  if (rawValue === undefined || rawValue === null) return fallbackValue;
  const cleaned = String(rawValue).trim().replace(/,/g, '');
  if (!cleaned) return fallbackValue;
  const parsed = Number(cleaned);
  if (!Number.isFinite(parsed) || parsed < 0) return fallbackValue;
  return parsed;
}

/**
 * Parses and validates institutional granular CSV holdings text.
 *
 * @param {string} csvText
 * @returns {{
 *   positions: Array<Object>,
 *   errors: Array<string>,
 *   totalAumMn: number,
 *   weightedDurationYears: number,
 *   weightedOasBps: number,
 *   count: number
 * }}
 */
export function parseAndValidateHoldingsCsv(csvText) {
  const emptyResult = (errors = []) => ({
    positions: [],
    errors,
    totalAumMn: 0,
    weightedDurationYears: 0,
    weightedOasBps: 0,
    count: 0
  });

  if (typeof csvText !== 'string' || !csvText.trim()) {
    return emptyResult(['CSV 内容为空，请输入或载入持仓数据']);
  }

  const sanitizedText = csvText.replace(/^\uFEFF/, '');
  const rawLines = sanitizedText
    .split(/\r?\n|\r/)
    .map(line => line.trim())
    .filter(line => line.length > 0);

  if (rawLines.length === 0) {
    return emptyResult(['CSV 内容为空，请输入或载入持仓数据']);
  }

  const headerCells = splitCsvLine(rawLines[0]);
  const colIndexMap = {};
  headerCells.forEach((cell, idx) => {
    const key = cell.toLowerCase().replace(/[\s]+/g, '_');
    const canonical = HEADER_ALIASES[key] || HEADER_ALIASES[key.replace(/_/g, '')];
    if (canonical && colIndexMap[canonical] === undefined) {
      colIndexMap[canonical] = idx;
    }
  });

  const missingRequiredCols = [];
  if (colIndexMap.country === undefined) missingRequiredCols.push('country');
  if (colIndexMap.amountMn === undefined) missingRequiredCols.push('amountMn');
  if (colIndexMap.name === undefined && colIndexMap.ticker === undefined) {
    missingRequiredCols.push('name/ticker');
  }

  if (missingRequiredCols.length > 0) {
    return emptyResult([
      `表头缺少必需列: ${missingRequiredCols.join(', ')}（标准表头: ticker,name,country,assetClass,amountMn,durationYears,oasBps）`
    ]);
  }

  if (rawLines.length < 2) {
    return emptyResult(['仅检测到表头行，未发现有效持仓记录']);
  }

  const errors = [];
  const rawPositions = [];

  for (let lineIdx = 1; lineIdx < rawLines.length; lineIdx += 1) {
    const rowNumber = lineIdx + 1;
    const cells = splitCsvLine(rawLines[lineIdx]);

    const getCell = (field) => {
      const idx = colIndexMap[field];
      return idx !== undefined && idx < cells.length ? cells[idx] : '';
    };

    const rawTicker = getCell('ticker');
    const rawName = getCell('name');
    const rawCountry = getCell('country');
    const rawAssetClass = getCell('assetClass');
    const rawAmount = getCell('amountMn');
    const rawDuration = getCell('durationYears');
    const rawOas = getCell('oasBps');

    const country = String(rawCountry || '').trim().toUpperCase();
    if (!/^[A-Z]{2}$/.test(country)) {
      errors.push(`第 ${rowNumber} 行: 国家/管辖区代码 "${rawCountry}" 无效，须为 2 位 ISO 字母代码`);
      continue;
    }

    const amountNumeric = Number(String(rawAmount || '').trim().replace(/,/g, ''));
    if (!Number.isFinite(amountNumeric) || amountNumeric <= 0) {
      errors.push(`第 ${rowNumber} 行 (${rawTicker || rawName || country}): 持仓规模 amountMn "${rawAmount}" 必须为正数`);
      continue;
    }

    const ticker = String(rawTicker || '').trim() || `SEC-${rawPositions.length + 1}`;
    const name = String(rawName || '').trim() || ticker;
    if (!String(rawTicker || '').trim() && !String(rawName || '').trim()) {
      errors.push(`第 ${rowNumber} 行: 必须提供 ticker 或 name`);
      continue;
    }

    const assetClass = normalizeAssetClass(rawAssetClass);
    const defaultDuration = DEFAULT_DURATION_BY_ASSET_CLASS[assetClass] ?? 4.0;
    const defaultOas = DEFAULT_OAS_BY_ASSET_CLASS[assetClass] ?? 150;

    const durationYears = roundTo(parseOptionalNonNegativeNumber(rawDuration, defaultDuration), 2);
    const oasBps = roundTo(parseOptionalNonNegativeNumber(rawOas, defaultOas), 1);
    const amountMn = roundTo(amountNumeric, 2);

    const safeSlug = ticker.toLowerCase().replace(/[^a-z0-9_-]/g, '') || `row${lineIdx}`;

    rawPositions.push({
      id: `csv-${rawPositions.length + 1}-${safeSlug}`,
      ticker,
      name,
      country,
      assetClass,
      amountMn,
      durationYears,
      oasBps,
      weight: 0
    });
  }

  const totalAumMn = roundTo(
    rawPositions.reduce((sum, pos) => sum + pos.amountMn, 0),
    2
  );

  const positions = rawPositions.map((pos) => ({
    ...pos,
    weight: totalAumMn > 0 ? roundTo(pos.amountMn / totalAumMn, 4) : 0
  }));

  const weightedDurationYears = totalAumMn > 0
    ? roundTo(
      positions.reduce((sum, pos) => sum + pos.amountMn * pos.durationYears, 0) / totalAumMn,
      2
    )
    : 0;

  const weightedOasBps = totalAumMn > 0
    ? roundTo(
      positions.reduce((sum, pos) => sum + pos.amountMn * pos.oasBps, 0) / totalAumMn,
      1
    )
    : 0;

  return {
    positions,
    errors,
    totalAumMn,
    weightedDurationYears,
    weightedOasBps,
    count: positions.length
  };
}

/**
 * Estimates duration-based mark-to-market loss alongside credit-spread widening
 * under a parallel interest rate / macro spread shock.
 *
 * @param {Array<Object>} positions
 * @param {number} shockRateBps
 * @returns {Object}
 */
export function computeGranularBondStress(positions = [], shockRateBps = 150) {
  if (!Array.isArray(positions) || positions.length === 0) {
    return {
      shockRateBps: Number(shockRateBps) || 0,
      totalAumMn: 0,
      weightedDurationYears: 0,
      weightedOasBps: 0,
      durationLossMn: 0,
      spreadStressAdjustmentMn: 0,
      spreadLossMn: 0,
      totalMtMLossMn: 0,
      totalLossMn: 0,
      lossPct: 0,
      positionImpacts: []
    };
  }

  const effectiveShockBps = Math.max(0, Number(shockRateBps) || 0);
  const rateShiftDecimal = effectiveShockBps / 10000;

  let totalAum = 0;
  let weightedDurSum = 0;
  let weightedOasSum = 0;
  let totalDurationLoss = 0;
  let totalSpreadLoss = 0;

  const positionImpacts = positions.map((pos, idx) => {
    const amountMn = Math.max(0, Number(pos.amountMn) || 0);
    const durationYears = Math.max(0, Number(pos.durationYears) || 0);
    const oasBps = Math.max(0, Number(pos.oasBps) || 0);

    // Parallel yield shock MtM loss: Amount * ModifiedDuration * (shockRateBps / 10000)
    const rawDurationLoss = amountMn * (durationYears * rateShiftDecimal);
    const durationLossMn = Math.min(amountMn, rawDurationLoss);

    // Spread stress adjustment: OAS widens proportionally to baseline credit risk under shock
    const spreadWideningBps = oasBps * 0.30 * (effectiveShockBps / 150);
    const rawSpreadLoss = amountMn * durationYears * (spreadWideningBps / 10000);
    const spreadLossMn = Math.min(Math.max(0, amountMn - durationLossMn), rawSpreadLoss);

    const combinedLossMn = Math.min(amountMn, durationLossMn + spreadLossMn);

    totalAum += amountMn;
    weightedDurSum += amountMn * durationYears;
    weightedOasSum += amountMn * oasBps;
    totalDurationLoss += durationLossMn;
    totalSpreadLoss += spreadLossMn;

    return {
      id: pos.id || `pos-${idx + 1}`,
      ticker: pos.ticker || pos.id || `SEC-${idx + 1}`,
      name: pos.name || pos.ticker || `Holding ${idx + 1}`,
      country: pos.country || 'US',
      assetClass: pos.assetClass || 'corporate_credit',
      amountMn: roundTo(amountMn, 2),
      durationYears: roundTo(durationYears, 2),
      oasBps: roundTo(oasBps, 1),
      durationLossMn: roundTo(durationLossMn, 2),
      spreadLossMn: roundTo(spreadLossMn, 2),
      totalLossMn: roundTo(combinedLossMn, 2),
      lossPct: amountMn > 0 ? roundTo((combinedLossMn / amountMn) * 100, 2) : 0
    };
  });

  const totalCombinedLoss = Math.min(totalAum, totalDurationLoss + totalSpreadLoss);

  return {
    shockRateBps: effectiveShockBps,
    totalAumMn: roundTo(totalAum, 2),
    weightedDurationYears: totalAum > 0 ? roundTo(weightedDurSum / totalAum, 2) : 0,
    weightedOasBps: totalAum > 0 ? roundTo(weightedOasSum / totalAum, 1) : 0,
    durationLossMn: roundTo(totalDurationLoss, 2),
    spreadStressAdjustmentMn: roundTo(totalSpreadLoss, 2),
    spreadLossMn: roundTo(totalSpreadLoss, 2),
    totalMtMLossMn: roundTo(totalCombinedLoss, 2),
    totalLossMn: roundTo(totalCombinedLoss, 2),
    lossPct: totalAum > 0 ? roundTo((totalCombinedLoss / totalAum) * 100, 2) : 0,
    positionImpacts
  };
}
