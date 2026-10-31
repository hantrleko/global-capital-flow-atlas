/**
 * EUGENE FINANCE · Global Capital Flow Atlas
 * Scenario Reproducibility Engine (v4.5 & v5.0)
 * 
 * Provides deterministic hashing, compact serialization, and one-click
 * restoration for macro stress scenarios, ensuring auditability and citation parity.
 */

export function generateScenarioHash(config = {}) {
  const {
    quarter = '2026Q1',
    tab = 'map',
    country = null,
    accountingBasis = 'residence',
    epicenter = 'TR',
    haircut = 35,
    bufferMultiplier = 1.5,
    scenarioId = 'tr_sovereign_crisis'
  } = config;

  const raw = `${quarter}|${tab}|${country || 'ALL'}|${accountingBasis}|${epicenter}|${haircut}|${bufferMultiplier}|${scenarioId}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).toUpperCase().padStart(8, '0');
  return hex;
}

export function encodeReproducibilityCode(config = {}) {
  const quarter = config.quarter || '2026Q1';
  const tab = config.tab || config.activeTab || 'contagion';
  const country = config.country || null;
  const accountingBasis = config.accountingBasis || 'residence';
  const epicenter = config.epicenter || 'TR';
  const haircut = config.haircut !== undefined ? config.haircut : (config.haircutPct !== undefined ? config.haircutPct : 35);
  const bufferMultiplier = config.bufferMultiplier !== undefined ? config.bufferMultiplier : 1.5;
  const scenarioId = config.scenarioId || 'tr_sovereign_crisis';

  const normalizedConfig = { quarter, tab, country, accountingBasis, epicenter, haircut, bufferMultiplier, scenarioId };
  const hash = generateScenarioHash(normalizedConfig);
  const basisCode = accountingBasis === 'ultimate_risk' ? 'CBS' : 'LBS';
  const buf = Math.round(bufferMultiplier * 10);

  // Example: ATLAS-2026Q1-CONTAGION-TR25-B15-LBS-72E1BAC6
  return `ATLAS-${quarter}-${tab.toUpperCase()}-${epicenter}${haircut}-B${buf}-${basisCode}-${hash}`;
}

export function decodeReproducibilityCode(codeStr) {
  if (!codeStr || typeof codeStr !== 'string') return null;
  const clean = codeStr.trim().toUpperCase();

  // Pattern match: ATLAS-{quarter}-{tab}-{epicenter}{haircut}-B{buf}-{basis}-{hash}
  const match = clean.match(/^ATLAS-([0-9]{4}Q[1-4])-([A-Z_]+)-([A-Z]{2})([0-9]{1,3})-B([0-9]{2})-([A-Z]{3})-([0-9A-F]{8})$/);
  if (!match) return null;

  const [, quarter, tabRaw, epicenter, haircutStr, bufStr, basisCode, hash] = match;
  const haircutVal = parseInt(haircutStr, 10);
  const tabVal = tabRaw.toLowerCase();
  const bufferVal = parseInt(bufStr, 10) / 10;
  const basisVal = basisCode === 'CBS' ? 'ultimate_risk' : 'residence';

  // Verify hash integrity against configuration
  const expectedHash = generateScenarioHash({
    quarter,
    tab: tabVal,
    country: null,
    accountingBasis: basisVal,
    epicenter,
    haircut: haircutVal,
    bufferMultiplier: bufferVal
  });

  if (expectedHash !== hash) {
    return null; // Checksum integrity mismatch
  }

  return {
    isValid: true,
    quarter,
    tab: tabVal,
    activeTab: tabVal,
    epicenter,
    haircut: haircutVal,
    haircutPct: haircutVal,
    bufferMultiplier: bufferVal,
    accountingBasis: basisVal,
    hash,
    code: clean
  };
}

export function buildDeepLinkWithCode(codeStr, baseUrl = '') {
  const origin = baseUrl || (typeof window !== 'undefined' ? window.location.origin + window.location.pathname : '');
  return `${origin}?rep=${encodeURIComponent(codeStr)}`;
}
