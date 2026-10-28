/**
 * EUGENE FINANCE Global Capital Flow Atlas - Phase 2 Engine
 * Look-Through Offshore Financial Centers (OFCs) & Multi-Dimensional Slicing
 * 
 * Standards & Methodological Basis:
 * - BIS Locational Banking Statistics (LBS) Table A: Residence / Immediate Counterparty Basis
 * - BIS Consolidated Banking Statistics (CBS) Table B: Ultimate Risk / Nationality Basis
 * - IMF Coordinated Portfolio Investment Survey (CPIS) & Damgaard, Elkjaer & Johannesen (2019)
 *   "What Is Real and What Is Not in the Global FDI & Financial Network"
 */

// Key Offshore Financial Centers (OFCs) & Conduits in the Atlas
export const OFC_JURISDICTIONS = {
  KY: { code: 'KY', name_zh: '开曼群岛', type: 'hedge_fund_conduit', label: '对冲基金与PE离岸通道' },
  LU: { code: 'LU', name_zh: '卢森堡', type: 'fund_center', label: '泛欧投资基金枢纽' },
  HK: { code: 'HK', name_zh: '中国香港', type: 'gateway_conduit', label: '离岸中资与外资转口枢纽' },
  SG: { code: 'SG', name_zh: '新加坡', type: 'wealth_treasury', label: '跨国司库与财富管理枢纽' },
  NL: { code: 'NL', name_zh: '荷兰', type: 'corporate_conduit', label: '跨国实体法人通道' },
  CH: { code: 'CH', name_zh: '瑞士', type: 'private_banking', label: '全球私人银行与财富枢纽' }
};

// Empirical Parent Nationality Reallocation Matrix (Ultimate Risk Parent Distribution)
// Source: BIS CBS Table B + IMF CPIS Look-Through Weights
export const OFC_LOOK_THROUGH_WEIGHTS = {
  KY: [
    { parent: 'US', share: 0.62, label: '美国对冲基金/PE资产' },
    { parent: 'GB', share: 0.16, label: '英国伦敦离岸资管' },
    { parent: 'CN', share: 0.12, label: '中资科技VIE离岸架构' },
    { parent: 'DE', share: 0.05, label: '欧系机构离岸SPV' },
    { parent: 'JP', share: 0.05, label: '日系境外专户' }
  ],
  LU: [
    { parent: 'DE', share: 0.28, label: '德国核心主权资管' },
    { parent: 'FR', share: 0.24, label: '法国UCITS基金管理人' },
    { parent: 'US', share: 0.30, label: '美资欧洲通道' },
    { parent: 'GB', share: 0.12, label: '英国对冲基金欧陆分支' },
    { parent: 'IT', share: 0.06, label: '意大利跨国保险' }
  ],
  HK: [
    { parent: 'CN', share: 0.68, label: '中资央国企/科技巨头海外发债' },
    { parent: 'US', share: 0.16, label: '美资跨国银行亚太司库' },
    { parent: 'GB', share: 0.10, label: '英系老牌外资总行' },
    { parent: 'JP', share: 0.06, label: '日资综合商社' }
  ],
  SG: [
    { parent: 'CN', share: 0.36, label: '中资东南亚出海司库' },
    { parent: 'US', share: 0.30, label: '美资区域资金池' },
    { parent: 'JP', share: 0.18, label: '日元离岸外币借贷' },
    { parent: 'GB', share: 0.16, label: '英资大宗商品贸易融资' }
  ]
};

// Sector Slicing Profiles (Average BIS CBS Sectoral Composition)
export const SECTOR_SLICING_PROFILES = {
  all: { id: 'all', name_zh: '全部交易部门', share: 1.0, color: '#38bdf8' },
  banks: { id: 'banks', name_zh: '跨国银行同业 (Interbank)', share: 0.38, color: '#60a5fa' },
  nbfi: { id: 'nbfi', name_zh: '非银金融机构 (NBFI / 影子银行)', share: 0.32, color: '#c084fc' },
  sovereign: { id: 'sovereign', name_zh: '主权与公共部门 (Sovereign)', share: 0.16, color: '#34d399' },
  non_financial: { id: 'non_financial', name_zh: '非金融实体企业 (Corporates)', share: 0.14, color: '#fbbf24' }
};

// Instrument Slicing Profiles (BIS CBS Table B Instrument Split)
export const INSTRUMENT_SLICING_PROFILES = {
  all: { id: 'all', name_zh: '全部金融工具', share: 1.0 },
  loans: { id: 'loans', name_zh: '跨境贷款与存款 (Loans & Deposits)', share: 0.46 },
  securities: { id: 'securities', name_zh: '国际债务证券 (Debt Securities)', share: 0.36 },
  derivatives: { id: 'derivatives', name_zh: '衍生品与外汇掉期 (FX Swaps & Derivatives)', share: 0.18 }
};

/**
 * Check if a jurisdiction is a key offshore conduit
 */
export function isOffshoreConduit(code) {
  return Boolean(OFC_JURISDICTIONS[code]);
}

/**
 * Transform Residence-based bilateral links into Ultimate Risk (Look-Through OFCs) links.
 * Corridors targeting an OFC (e.g. US -> KY or GB -> HK) are unpacked and redirected to the parent nationality.
 */
export function transformToUltimateRiskLinks(rawLinks = [], options = {}) {
  const {
    sector = options.selectedSector || 'all',
    instrument = options.selectedInstrument || 'all',
    accountingBasis = 'ultimate_risk'
  } = options;

  const sectorProfile = SECTOR_SLICING_PROFILES[sector] || SECTOR_SLICING_PROFILES.all;
  const instrumentProfile = INSTRUMENT_SLICING_PROFILES[instrument] || INSTRUMENT_SLICING_PROFILES.all;
  const filterMultiplier = sectorProfile.share * instrumentProfile.share;

  let totalBypassedBn = 0;
  let bypassedOfcCount = 0;
  let reallocatedCount = 0;
  const redirectedByParent = {};
  const corridorAccumulator = new Map();

  // Helper to add/accumulate to corridor map
  const addCorridor = (source, target, claims, usdDenominated, isLookThrough = false, ofcOrigin = null) => {
    if (source === target) return; // Discard domestic netting
    const key = `${source}->${target}`;
    const existing = corridorAccumulator.get(key);
    if (existing) {
      existing.claims_usd_bn += claims;
      existing.usd_denominated_bn += usdDenominated;
      if (isLookThrough) existing.isLookThrough = true;
    } else {
      corridorAccumulator.set(key, {
        source,
        target,
        claims_usd_bn: claims,
        usd_denominated_bn: usdDenominated,
        isLookThrough,
        ofcOrigin,
        corridor_category: isLookThrough ? 'Ultimate-Risk-LookThrough' : 'Direct-Bilateral'
      });
    }
  };

  rawLinks.forEach(link => {
    const scaledClaims = link.claims_usd_bn * filterMultiplier;
    const scaledUsd = (link.usd_denominated_bn || (link.claims_usd_bn * 0.5)) * filterMultiplier;

    // Check if target is an OFC conduit that should be looked-through
    if (accountingBasis === 'ultimate_risk' && OFC_LOOK_THROUGH_WEIGHTS[link.target]) {
      const weights = OFC_LOOK_THROUGH_WEIGHTS[link.target];
      totalBypassedBn += scaledClaims;
      bypassedOfcCount++;

      weights.forEach(w => {
        const parentTarget = w.parent;
        const reallocatedClaims = scaledClaims * w.share;
        const reallocatedUsd = scaledUsd * w.share;

        redirectedByParent[parentTarget] = (redirectedByParent[parentTarget] || 0) + reallocatedClaims;
        addCorridor(link.source, parentTarget, reallocatedClaims, reallocatedUsd, true, link.target);
        reallocatedCount++;
      });
    } else {
      // Normal direct bilateral corridor or residence basis
      addCorridor(link.source, link.target, scaledClaims, scaledUsd, false, null);
    }
  });

  const lookThroughLinks = Array.from(corridorAccumulator.values()).map(l => ({
    ...l,
    claims_usd_bn: Math.round(l.claims_usd_bn * 10) / 10,
    usd_denominated_bn: Math.round(l.usd_denominated_bn * 10) / 10
  }));

  return {
    links: lookThroughLinks,
    lookThroughLinks,
    totalBypassedBn: Math.round(totalBypassedBn * 10) / 10,
    bypassedOfcCount,
    reallocatedCount,
    redirectedByParent,
    sectorMultiplier: filterMultiplier,
    sectorLabel: sectorProfile.name_zh,
    instrumentLabel: instrumentProfile.name_zh
  };
}

/**
 * Get aggregated Look-Through OFC intelligence summary metrics
 */
export function getOfcLookThroughSummary(rawLinks = []) {
  let totalOfcInflow = 0;
  const ofcTotals = {};
  const parentInflows = {};

  rawLinks.forEach(l => {
    if (OFC_LOOK_THROUGH_WEIGHTS[l.target]) {
      totalOfcInflow += l.claims_usd_bn;
      ofcTotals[l.target] = (ofcTotals[l.target] || 0) + l.claims_usd_bn;

      OFC_LOOK_THROUGH_WEIGHTS[l.target].forEach(w => {
        parentInflows[w.parent] = (parentInflows[w.parent] || 0) + (l.claims_usd_bn * w.share);
      });
    }
  });

  const topParents = Object.entries(parentInflows)
    .map(([parent, amount]) => ({
      parent,
      amount: Math.round(amount * 10) / 10,
      sharePct: Math.round((amount / Math.max(1, totalOfcInflow)) * 1000) / 10
    }))
    .sort((a, b) => b.amount - a.amount);

  const ofcBreakdown = Object.entries(ofcTotals)
    .map(([code, amount]) => ({
      code,
      name_zh: OFC_JURISDICTIONS[code]?.name_zh || code,
      amount: Math.round(amount * 10) / 10,
      sharePct: Math.round((amount / Math.max(1, totalOfcInflow)) * 1000) / 10
    }))
    .sort((a, b) => b.amount - a.amount);

  const byUltimateParent = {};
  Object.entries(parentInflows).forEach(([k, v]) => {
    byUltimateParent[k] = Math.round(v * 10) / 10;
  });

  const byConduit = {};
  Object.entries(ofcTotals).forEach(([k, v]) => {
    byConduit[k] = Math.round(v * 10) / 10;
  });

  return {
    totalOfcInflow: Math.round(totalOfcInflow * 10) / 10,
    topParents,
    ofcBreakdown,
    byUltimateParent,
    byConduit
  };
}
