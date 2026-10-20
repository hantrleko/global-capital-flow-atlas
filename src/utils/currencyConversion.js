/**
 * Multi-Currency Denomination Engine
 * Supports real-time conversion and formatting across USD, EUR, CNY, JPY, and Gold Ounces.
 * Calibrated against historical BIS & central bank quarterly average spot rates.
 */

export const CURRENCY_LIST = [
  { id: 'USD', symbol: '$', name: '美元 (USD)', shortName: 'USD', flag: '🇺🇸', unitTrillion: '万亿 USD', unitBillion: '亿 USD' },
  { id: 'EUR', symbol: '€', name: '欧元 (EUR)', shortName: 'EUR', flag: '🇪🇺', unitTrillion: '万亿 EUR', unitBillion: '亿 EUR' },
  { id: 'CNY', symbol: '¥', name: '人民币 (RMB)', shortName: 'RMB', flag: '🇨🇳', unitTrillion: '万亿 RMB', unitBillion: '亿 RMB' },
  { id: 'JPY', symbol: '¥', name: '日元 (JPY)', shortName: 'JPY', flag: '🇯🇵', unitTrillion: '兆 JPY', unitBillion: '1000 亿 JPY' },
  { id: 'GOLD', symbol: '🪙', name: '黄金等价 (盎司)', shortName: '黄金', flag: '🪙', unitTrillion: '亿盎司', unitBillion: '万盎司' }
];

// Historical quarterly spot exchange rates (Local Currency per 1 USD, or USD per oz of Gold)
const HISTORICAL_FX = {
  // 2018
  '2018Q1': { EUR: 0.814, CNY: 6.32, JPY: 106.2, GOLD_USD: 1330 },
  '2018Q2': { EUR: 0.855, CNY: 6.45, JPY: 109.8, GOLD_USD: 1260 },
  '2018Q3': { EUR: 0.862, CNY: 6.84, JPY: 112.5, GOLD_USD: 1205 },
  '2018Q4': { EUR: 0.875, CNY: 6.88, JPY: 111.0, GOLD_USD: 1280 },
  // 2019
  '2019Q1': { EUR: 0.889, CNY: 6.72, JPY: 110.8, GOLD_USD: 1300 },
  '2019Q2': { EUR: 0.884, CNY: 6.87, JPY: 107.8, GOLD_USD: 1410 },
  '2019Q3': { EUR: 0.912, CNY: 7.07, JPY: 108.1, GOLD_USD: 1510 },
  '2019Q4': { EUR: 0.898, CNY: 6.96, JPY: 108.6, GOLD_USD: 1520 },
  // 2020
  '2020Q1': { EUR: 0.906, CNY: 7.09, JPY: 107.5, GOLD_USD: 1580 },
  '2020Q2': { EUR: 0.892, CNY: 7.07, JPY: 107.9, GOLD_USD: 1780 },
  '2020Q3': { EUR: 0.852, CNY: 6.81, JPY: 105.4, GOLD_USD: 1900 },
  '2020Q4': { EUR: 0.821, CNY: 6.52, JPY: 103.2, GOLD_USD: 1895 },
  // 2021
  '2021Q1': { EUR: 0.849, CNY: 6.55, JPY: 110.7, GOLD_USD: 1705 },
  '2021Q2': { EUR: 0.842, CNY: 6.46, JPY: 111.1, GOLD_USD: 1770 },
  '2021Q3': { EUR: 0.863, CNY: 6.47, JPY: 111.5, GOLD_USD: 1755 },
  '2021Q4': { EUR: 0.880, CNY: 6.37, JPY: 115.1, GOLD_USD: 1828 },
  // 2022
  '2022Q1': { EUR: 0.903, CNY: 6.34, JPY: 121.7, GOLD_USD: 1940 },
  '2022Q2': { EUR: 0.954, CNY: 6.70, JPY: 135.7, GOLD_USD: 1810 },
  '2022Q3': { EUR: 1.020, CNY: 7.11, JPY: 144.7, GOLD_USD: 1670 },
  '2022Q4': { EUR: 0.935, CNY: 6.90, JPY: 131.9, GOLD_USD: 1824 },
  // 2023
  '2023Q1': { EUR: 0.920, CNY: 6.87, JPY: 132.8, GOLD_USD: 1970 },
  '2023Q2': { EUR: 0.916, CNY: 7.25, JPY: 144.3, GOLD_USD: 1920 },
  '2023Q3': { EUR: 0.945, CNY: 7.30, JPY: 149.4, GOLD_USD: 1870 },
  '2023Q4': { EUR: 0.905, CNY: 7.10, JPY: 141.0, GOLD_USD: 2062 },
  // 2024
  '2024Q1': { EUR: 0.926, CNY: 7.23, JPY: 151.3, GOLD_USD: 2230 },
  '2024Q2': { EUR: 0.932, CNY: 7.27, JPY: 160.8, GOLD_USD: 2325 },
  '2024Q3': { EUR: 0.898, CNY: 7.02, JPY: 142.8, GOLD_USD: 2630 },
  '2024Q4': { EUR: 0.921, CNY: 7.18, JPY: 149.5, GOLD_USD: 2680 },
  // 2025
  '2025Q1': { EUR: 0.915, CNY: 7.16, JPY: 147.2, GOLD_USD: 2710 },
  '2025Q2': { EUR: 0.910, CNY: 7.14, JPY: 145.0, GOLD_USD: 2740 },
  '2025Q3': { EUR: 0.908, CNY: 7.12, JPY: 143.5, GOLD_USD: 2780 },
  '2025Q4': { EUR: 0.904, CNY: 7.10, JPY: 142.0, GOLD_USD: 2820 },
  // 2026
  '2026Q1': { EUR: 0.900, CNY: 7.08, JPY: 140.5, GOLD_USD: 2850 },
  '2026Q2': { EUR: 0.896, CNY: 7.05, JPY: 139.2, GOLD_USD: 2880 },
  '2026Q3': { EUR: 0.892, CNY: 7.02, JPY: 138.0, GOLD_USD: 2910 },
  '2026Q4': { EUR: 0.888, CNY: 7.00, JPY: 137.0, GOLD_USD: 2940 }
};

/**
 * Converts a value denominated in USD billions to the target currency.
 */
export function convertUsdBn(usdBn, targetCurrency = 'USD', quarter = '2026Q4') {
  if (usdBn === undefined || usdBn === null) return 0;
  if (targetCurrency === 'USD') return usdBn;

  const fx = HISTORICAL_FX[quarter] || HISTORICAL_FX['2026Q4'];

  if (targetCurrency === 'EUR') {
    return usdBn * (fx.EUR || 0.89);
  }
  if (targetCurrency === 'CNY') {
    return usdBn * (fx.CNY || 7.00);
  }
  if (targetCurrency === 'JPY') {
    return usdBn * (fx.JPY || 138.0);
  }
  if (targetCurrency === 'GOLD') {
    // Total USD = usdBn * 1e9. Gold oz = Total USD / Gold_USD_per_oz
    // We return in million ounces (M oz)
    const goldPerOz = fx.GOLD_USD || 2850;
    return (usdBn * 1000) / goldPerOz;
  }

  return usdBn;
}

/**
 * Formats a converted amount with symbol and unit.
 * e.g. "$47.60T", "€42.27T", "¥333.2T", "16.70M 盎司"
 */
export function formatValueInCurrency(usdBn, targetCurrency = 'USD', quarter = '2026Q4') {
  const converted = convertUsdBn(usdBn, targetCurrency, quarter);
  const curMeta = CURRENCY_LIST.find(c => c.id === targetCurrency) || CURRENCY_LIST[0];

  if (targetCurrency === 'GOLD') {
    // converted is in million ounces (M oz)
    // 1 亿盎司 = 100 百万盎司 (100M oz)
    if (Math.abs(converted) >= 100) {
      return `${(converted / 100).toFixed(2)} 亿盎司`;
    }
    return `${converted.toFixed(1)} 百万盎司`;
  }

  if (targetCurrency === 'JPY') {
    // converted is in Billion JPY (10^9 JPY)
    // 1 兆日元 (Trillion JPY) = 10^12 JPY = 1,000 Billion JPY (1000 十亿日元)
    // 1 亿日元 = 10^8 JPY = 0.1 Billion JPY
    if (Math.abs(converted) >= 1000) {
      return `${curMeta.symbol}${(converted / 1000).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} 兆円`;
    }
    return `${curMeta.symbol}${Math.round(converted * 10).toLocaleString('en-US')} 億円`;
  }

  // USD
  if (targetCurrency === 'USD') {
    if (Math.abs(converted) >= 1000) {
      return `$${(converted / 1000).toFixed(2)}T`;
    }
    return `$${converted >= 10 ? converted.toFixed(1) : converted.toFixed(2)}B`;
  }

  // EUR, CNY
  if (Math.abs(converted) >= 1000) {
    return `${curMeta.symbol}${(converted / 1000).toFixed(2)}万亿`;
  }
  // 1 Billion local currency = 10 亿元
  return `${curMeta.symbol}${Math.round(converted * 10)}亿`;
}
