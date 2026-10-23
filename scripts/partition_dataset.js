import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, '../src/data');
const PARTITIONS_DIR = path.resolve(DATA_DIR, 'partitions');
const FULL_DATASET_PATH = path.resolve(DATA_DIR, 'bis_atlas_dataset.json');

if (!fs.existsSync(PARTITIONS_DIR)) {
  fs.mkdirSync(PARTITIONS_DIR, { recursive: true });
}

if (!fs.existsSync(FULL_DATASET_PATH)) {
  console.error('❌ bis_atlas_dataset.json not found in', DATA_DIR);
  process.exit(1);
}

console.log('📦 Partitioning BIS Atlas Dataset for Optimal Cold-Start Performance...');
const fullData = JSON.parse(fs.readFileSync(FULL_DATASET_PATH, 'utf8'));

// Default initial quarters needed for instant map paint on cold start (latest official release: 2026Q1 and baseline 2025Q4)
const DEFAULT_CORE_QUARTERS = ['2025Q4', '2026Q1'];
const coreBilateral = {};
const histRecentBilateral = {}; // 2022Q1 - 2026Q4 (excluding core)
const histPastBilateral = {};   // 2018Q1 - 2021Q4

for (const [q, links] of Object.entries(fullData.bilateral_matrix || {})) {
  if (DEFAULT_CORE_QUARTERS.includes(q)) {
    coreBilateral[q] = links;
  } else if (q >= '2022Q1') {
    histRecentBilateral[q] = links;
  } else {
    histPastBilateral[q] = links;
  }
}

// 1. Core dataset for instant landing page mount (< 45KB gzip)
const coreData = {
  metadata: fullData.metadata,
  quarters: fullData.quarters,
  countries: fullData.countries,
  global_macro: fullData.global_macro,
  lbs_data: fullData.lbs_data,
  bilateral_matrix: coreBilateral,
  fragmentation_series: fullData.fragmentation_series,
  central_bank_swap_network: fullData.central_bank_swap_network
};

const corePath = path.resolve(DATA_DIR, 'core_atlas_dataset.json');
fs.writeFileSync(corePath, JSON.stringify(coreData));
console.log(`  ✓ Core dataset written: ${corePath} (${(fs.statSync(corePath).size / 1024).toFixed(1)} KB)`);

// 2. Historical bilateral matrix partitions
const histRecentPath = path.resolve(PARTITIONS_DIR, 'historical_bilateral_2022_2026.json');
fs.writeFileSync(histRecentPath, JSON.stringify(histRecentBilateral));
console.log(`  ✓ Historical recent partition (2022-2026): ${histRecentPath} (${(fs.statSync(histRecentPath).size / 1024).toFixed(1)} KB)`);

const histPastPath = path.resolve(PARTITIONS_DIR, 'historical_bilateral_2018_2021.json');
fs.writeFileSync(histPastPath, JSON.stringify(histPastBilateral));
console.log(`  ✓ Historical past partition (2018-2021): ${histPastPath} (${(fs.statSync(histPastPath).size / 1024).toFixed(1)} KB)`);

// 3. CBS Risk profile partition
const cbsPath = path.resolve(PARTITIONS_DIR, 'cbs_risk.json');
fs.writeFileSync(cbsPath, JSON.stringify(fullData.cbs_risk || {}));
console.log(`  ✓ CBS risk partition written: ${cbsPath} (${(fs.statSync(cbsPath).size / 1024).toFixed(1)} KB)`);

console.log('✅ Dataset partitioning completed successfully.');
