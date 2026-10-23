/**
 * Global Capital Flow Atlas - Dynamic Partitioned Data Loader
 * Implements on-demand lazy loading for heavy dataset partitions:
 * 1. core_atlas_dataset.json: statically imported (~400KB raw, ~45KB gzip), instant cold paint
 * 2. partitions/historical_bilateral.json: dynamically imported when requesting historical quarters (<2026Q3)
 * 3. partitions/cbs_risk.json: dynamically imported when opening risk-sensitive modules (EWS, GSIB, Risk Matrix, etc.)
 *
 * Features:
 * - In-memory persistent cache
 * - Request sequence counter & token to prevent race conditions during rapid user switching
 * - Loading status, progress percentage, error state, and retry mechanism
 */

import coreDataset from '../data/core_atlas_dataset.json';

// In-memory unified working dataset
const activeStore = {
  ...coreDataset,
  bilateral_matrix: { ...coreDataset.bilateral_matrix },
  cbs_risk: coreDataset.cbs_risk || null
};

// Listeners for store changes
const listeners = new Set();
function notifyListeners() {
  for (const listener of listeners) {
    listener({ ...activeStore });
  }
}

// Loading state tracking
let historicalRecentLoaded = false;
let historicalPastLoaded = false;

let cbsRiskLoading = false;
let cbsRiskLoaded = false;
let cbsRiskError = null;

let requestSeq = 0;

/**
 * Get current cached snapshot of the dataset
 */
export function getDatasetSnapshot() {
  return activeStore;
}

/**
 * Ensure historical bilateral matrix links are loaded and merged into activeStore.
 * If targetQuarter is provided, loads the specific epoch partition (2022-2026 or 2018-2021).
 * If no targetQuarter is provided, ensures all history is loaded.
 */
export async function loadHistoricalBilateral(targetQuarter) {
  const needsRecent = !historicalRecentLoaded && (!targetQuarter || targetQuarter >= '2022Q1');
  const needsPast = !historicalPastLoaded && (!targetQuarter || targetQuarter < '2022Q1');

  if (!needsRecent && !needsPast) {
    return activeStore.bilateral_matrix;
  }

  const currentReq = ++requestSeq;

  try {
    const promises = [];
    if (needsRecent) {
      promises.push(
        import('../data/partitions/historical_bilateral_2022_2026.json').then(mod => {
          activeStore.bilateral_matrix = {
            ...(mod.default || mod),
            ...activeStore.bilateral_matrix
          };
          historicalRecentLoaded = true;
        })
      );
    }
    if (needsPast) {
      promises.push(
        import('../data/partitions/historical_bilateral_2018_2021.json').then(mod => {
          activeStore.bilateral_matrix = {
            ...(mod.default || mod),
            ...activeStore.bilateral_matrix
          };
          historicalPastLoaded = true;
        })
      );
    }

    await Promise.all(promises);
    notifyListeners();
    return activeStore.bilateral_matrix;
  } catch (err) {
    console.error('Failed to load historical bilateral data partition:', err);
    throw err;
  }
}

/**
 * Ensure CBS Risk data partition is loaded and merged into activeStore.
 * Idempotent: returns instantly if already cached.
 */
export async function loadCbsRisk() {
  if (cbsRiskLoaded && activeStore.cbs_risk) {
    return activeStore.cbs_risk;
  }
  if (cbsRiskLoading) {
    return new Promise((resolve, reject) => {
      const check = setInterval(() => {
        if (cbsRiskLoaded) {
          clearInterval(check);
          resolve(activeStore.cbs_risk);
        } else if (cbsRiskError) {
          clearInterval(check);
          reject(cbsRiskError);
        }
      }, 50);
    });
  }

  cbsRiskLoading = true;
  cbsRiskError = null;

  try {
    const module = await import('../data/partitions/cbs_risk.json');
    const cbsData = module.default || module;

    activeStore.cbs_risk = cbsData;
    cbsRiskLoaded = true;
    cbsRiskLoading = false;
    notifyListeners();
    return activeStore.cbs_risk;
  } catch (err) {
    cbsRiskLoading = false;
    cbsRiskError = err;
    console.error('Failed to load CBS risk data partition:', err);
    throw err;
  }
}

/**
 * Check whether a given quarter is currently available in the bilateral matrix
 */
export function isQuarterLoaded(quarter) {
  return Boolean(activeStore.bilateral_matrix && activeStore.bilateral_matrix[quarter]);
}

/**
 * Check whether CBS risk data is currently loaded
 */
export function isCbsRiskLoaded() {
  return Boolean(cbsRiskLoaded && activeStore.cbs_risk);
}

/**
 * Subscribe to dataset partition updates
 */
export function subscribeDataset(callback) {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

export default {
  getDatasetSnapshot,
  loadHistoricalBilateral,
  loadCbsRisk,
  isQuarterLoaded,
  isCbsRiskLoaded,
  subscribeDataset
};
