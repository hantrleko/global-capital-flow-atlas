/**
 * EUGENE FINANCE · Global Capital Flow Atlas
 * Institutional Local Workspace Storage Engine (v5.0)
 * 
 * Manages zero-backend, privacy-first client-side state for:
 * 1. Pinned Sovereign Watchlists
 * 2. Saved Custom Portfolios
 * 3. Bookmarked Macro Stress Scenarios with Reproducibility Codes
 * 4. User-Defined Risk Alert Thresholds
 */

const WORKSPACE_STORAGE_KEY = 'bis_atlas_institutional_workspace_v5';

export const DEFAULT_ALERT_RULES = [
  {
    id: 'alert-high-loss',
    name: '震中净增量损失超限',
    type: 'incremental_loss',
    metric: 'incremental_loss_bn',
    threshold: 150,
    unit: '$B',
    enabled: true,
    severity: 'CRITICAL',
    desc: '当特定经济体发生主权减记时，全网级联违约净增量 (ΔS) 超过 $150B 时预警'
  },
  {
    id: 'alert-cip-basis',
    name: '离岸美元荒流动性断层',
    type: 'cip_basis',
    metric: 'cip_basis_bp',
    threshold: -45,
    unit: 'bp',
    enabled: true,
    severity: 'WARNING',
    desc: '当非美机构借入美元额外成本 (CIP 基差) 负值深度突破 -45bp 时触发离岸美元荒警报'
  },
  {
    id: 'alert-portfolio-var',
    name: '专户 99% 压力在险价值超限',
    type: 'portfolio_var',
    metric: 'portfolio_var_mn',
    threshold: 50,
    unit: '$M',
    enabled: true,
    severity: 'CRITICAL',
    desc: '当宏观危机冲击下专户潜在在险价值 (99% Stressed VaR) 净损失超过 $50M 时预警'
  },
  {
    id: 'alert-haircut-contagion',
    name: '二级同业去杠杆踩踏预警',
    type: 'haircut_contagion',
    metric: 'victim_nodes_count',
    threshold: 5,
    unit: '国',
    enabled: true,
    severity: 'WARNING',
    desc: '当级联传染波及且发生资产冲销的主权与离岸经济体超过 5 个时预警'
  }
];

export const DEFAULT_WORKSPACE = {
  version: '5.0.0',
  updatedAt: new Date().toISOString(),
  pinnedWatchlist: ['TR', 'GB', 'US', 'KY', 'CN', 'DE', 'JP'],
  savedPortfolios: [
    {
      id: 'inst-balanced-v5',
      name: '宏观对冲优选组合 (Macro Alpha Strategy)',
      baseAumUsdMn: 500,
      updatedAt: '2026-10-29',
      positions: [
        { id: 'p1', name: '美股宽基成长 (US Equities)', country: 'US', assetClass: 'equities', weight: 0.35, amountMn: 175 },
        { id: 'p2', name: '德国十年期国债 (German Bunds)', country: 'DE', assetClass: 'sovereign_debt', weight: 0.25, amountMn: 125 },
        { id: 'p3', name: '英国金融同业 (UK Interbank)', country: 'GB', assetClass: 'interbank_loans', weight: 0.15, amountMn: 75 },
        { id: 'p4', name: '前沿主权外债 (EM External Debt)', country: 'TR', assetClass: 'sovereign_debt', weight: 0.15, amountMn: 75 },
        { id: 'p5', name: '离岸对冲基金 SPV (Offshore Conduit)', country: 'KY', assetClass: 'equities', weight: 0.10, amountMn: 50 }
      ]
    }
  ],
  savedScenarios: [
    {
      id: 'sc-1',
      title: '土耳其前沿债务减记与跨国银行溢出',
      reproducibilityCode: 'ATLAS-2026Q1-CONTAGION-TR35-B15-CBS-8F2B1A04',
      epicenter: 'TR',
      haircut: 35,
      bufferMultiplier: 1.5,
      notes: '重点监测德法跨国银行对土耳其直接敞口及二级去杠杆'
    },
    {
      id: 'sc-2',
      title: '欧洲美元流动性骤紧与非银外汇掉期挤兑',
      reproducibilityCode: 'ATLAS-2026Q1-CONTAGION-GB20-B10-CBS-3C89D4E1',
      epicenter: 'GB',
      haircut: 20,
      bufferMultiplier: 1.0,
      notes: '伦敦离岸中转承压，离岸外汇掉期表外美元负债展期受阻'
    }
  ],
  alertRules: DEFAULT_ALERT_RULES
};

let memoryWorkspace = null;

export function getWorkspace() {
  if (typeof window === 'undefined') {
    return memoryWorkspace ? { ...memoryWorkspace } : { ...DEFAULT_WORKSPACE };
  }
  try {
    const raw = localStorage.getItem(WORKSPACE_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_WORKSPACE };
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_WORKSPACE,
      ...parsed,
      alertRules: parsed.alertRules || DEFAULT_ALERT_RULES
    };
  } catch (err) {
    console.warn('Failed to load workspace from localStorage, using defaults', err);
    return { ...DEFAULT_WORKSPACE };
  }
}

export function saveWorkspace(workspace) {
  const payload = {
    ...workspace,
    updatedAt: new Date().toISOString()
  };
  if (typeof window === 'undefined') {
    memoryWorkspace = payload;
    return;
  }
  try {
    localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(payload));
  } catch (err) {
    console.error('Failed to save workspace', err);
  }
}

export function togglePinnedCountry(code) {
  const ws = getWorkspace();
  const list = ws.pinnedWatchlist || [];
  const exists = list.includes(code);
  const nextList = exists ? list.filter(c => c !== code) : [...list, code];
  saveWorkspace({ ...ws, pinnedWatchlist: nextList });
  return nextList;
}

export function evaluateWorkspaceAlerts(context = {}) {
  const ws = getWorkspace();
  const rules = ws.alertRules || [];
  const triggered = [];

  const { incrementalLoss = 0, cipBasis = -32, stressVaR = 0, victimCount = 0 } = context;

  rules.forEach(rule => {
    if (!rule.enabled) return;
    if (rule.type === 'incremental_loss' && incrementalLoss >= rule.threshold) {
      triggered.push({
        ...rule,
        currentValue: incrementalLoss,
        diff: incrementalLoss - rule.threshold
      });
    } else if (rule.type === 'cip_basis' && cipBasis <= rule.threshold) {
      triggered.push({
        ...rule,
        currentValue: cipBasis,
        diff: rule.threshold - cipBasis
      });
    } else if (rule.type === 'portfolio_var' && stressVaR >= rule.threshold) {
      triggered.push({
        ...rule,
        currentValue: stressVaR,
        diff: stressVaR - rule.threshold
      });
    } else if (rule.type === 'haircut_contagion' && victimCount >= rule.threshold) {
      triggered.push({
        ...rule,
        currentValue: victimCount,
        diff: victimCount - rule.threshold
      });
    }
  });

  return triggered;
}
