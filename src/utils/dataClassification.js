import { bisObservation } from './bisObservations';

export const CLASSIFICATION_TYPES = {
  OFFICIAL: 'OFFICIAL',
  MODEL: 'MODEL',
  SCENARIO: 'SCENARIO',
  MISSING: 'MISSING'
};

const definitions = {
  OFFICIAL: ['官方观测', 'BIS 全球债权余额 · LBS SDMX', 'emerald'],
  MODEL: ['模型估算', 'Atlas 模型校准与重构', 'amber'],
  SCENARIO: ['前瞻情景', 'Atlas 前瞻压力情景', 'purple'],
  MISSING: ['数据缺失', '当前快照暂无官方观测', 'slate']
};

const colors = {
  emerald: ['bg-emerald-500/15 text-emerald-300 border-emerald-500/35', 'bg-emerald-400'],
  amber: ['bg-amber-500/15 text-amber-300 border-amber-500/35', 'bg-amber-400'],
  purple: ['bg-purple-500/15 text-purple-300 border-purple-500/35', 'bg-purple-400'],
  slate: ['bg-slate-500/15 text-slate-300 border-slate-500/35', 'bg-slate-400']
};

export function getDataClassification(quarter, { isScenario = false, scope = 'stock' } = {}) {
  const isOfficial = scope === 'stock' && bisObservation(quarter, 'S').state === 'observed';
  const type = isOfficial ? CLASSIFICATION_TYPES.OFFICIAL
    : isScenario ? CLASSIFICATION_TYPES.SCENARIO
      : scope === 'model' ? CLASSIFICATION_TYPES.MODEL : CLASSIFICATION_TYPES.MISSING;
  const [label, provenance, color] = definitions[type];
  const [badgeClass, dotClass] = colors[color];
  return { type, label, provenance, fullTitle: provenance, badgeClass, dotClass, isOfficial, isScenario: type === 'SCENARIO' };
}
