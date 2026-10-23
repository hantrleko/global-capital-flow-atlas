/**
 * Unified BIS Data Classification Standard
 * Canonical classifications:
 * 1. 官方观测 (OFFICIAL): <= 2026Q1 (SDMX 2.1 Audited IBS Release)
 * 2. 待公布估算 (PENDING_ESTIMATE): === 2026Q2 (Pre-release estimate scheduled for 2026-10-30)
 * 3. 前瞻情景 (SCENARIO): >= 2026Q3 (Dynamic Gravity Nowcast / Scenario Projection)
 */

export const CLASSIFICATION_TYPES = {
  OFFICIAL: 'OFFICIAL',
  PENDING_ESTIMATE: 'PENDING_ESTIMATE',
  SCENARIO: 'SCENARIO'
};

export function getDataClassification(quarter) {
  if (!quarter || quarter <= '2026Q1') {
    return {
      type: CLASSIFICATION_TYPES.OFFICIAL,
      label: '官方观测',
      fullTitle: 'BIS 官方观测核定',
      provenance: 'BIS SDMX 2.1 官方统计入库',
      badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35',
      dotClass: 'bg-emerald-400',
      isOfficial: true,
      isScenario: false
    };
  }
  if (quarter === '2026Q2') {
    return {
      type: CLASSIFICATION_TYPES.PENDING_ESTIMATE,
      label: '待公布估算',
      fullTitle: '待公布估算基准',
      provenance: '待 2026-10-30 官方公布入库',
      badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/35',
      dotClass: 'bg-amber-400',
      isOfficial: false,
      isScenario: false
    };
  }
  return {
    type: CLASSIFICATION_TYPES.SCENARIO,
    label: '前瞻情景',
    fullTitle: '前瞻计量情景推演',
    provenance: '动态引力模型前瞻推演 (非官方统计)',
    badgeClass: 'bg-purple-500/15 text-purple-300 border-purple-500/35',
    dotClass: 'bg-purple-400',
    isOfficial: false,
    isScenario: true
  };
}

export default {
  CLASSIFICATION_TYPES,
  getDataClassification
};
