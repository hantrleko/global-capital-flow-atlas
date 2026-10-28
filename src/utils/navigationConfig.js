/**
 * Canonical Navigation and Module Configuration for BIS Global Capital Flow Atlas
 * Centralizes domain definitions, sub-modules, and dynamic task-name resolution.
 */

export const NAVIGATION_DOMAINS = [
  {
    id: 'flows',
    title: '🌐 资本网络与流向',
    short: '流向拓扑',
    tabs: [
      { id: 'map', label: '信贷流向地图', desc: 'Bilateral Claims & Positions' },
      { id: 'network', label: '金融网络拓扑', desc: 'Centrality & Core-Periphery' },
      { id: 'routing', label: '资本路由矩阵', desc: 'Sankey Routing & NxN Heatmap' }
    ]
  },
  {
    id: 'vulnerability',
    title: '⚡ 早期预警与传染',
    short: '系统性风险',
    tabs: [
      { id: 'ews', label: '巴塞尔早期预警 (EWS)', desc: 'Credit Gap & CCyB Buffer' },
      { id: 'gsib', label: 'G-SIB 顶级银行透镜', desc: 'Top 30 Systemic Banks' },
      { id: 'contagion', label: '银行级联传染模拟', desc: 'Eisenberg-Noe Contagion' },
      { id: 'shadow', label: '影子银行与非银透视', desc: 'Offshore NBFIs & FX Swaps' },
      { id: 'maturity', label: '期限结构与转期挤兑', desc: 'CBS Residual Maturity' },
      { id: 'portfolio', label: '组合压力映射', desc: 'Portfolio Stress Overlay & Custom VaR' }
    ]
  },
  {
    id: 'currency',
    title: '💵 美元与货币格局',
    short: '货币格局',
    tabs: [
      { id: 'usd', label: '美元融资与部门信贷', desc: 'Global Dollar Credit' },
      { id: 'currency', label: '多极货币竞争与错配', desc: 'Currency Hegemony & CMI' },
      { id: 'swaps', label: '央行互换线与基差', desc: 'Central Bank Swaps & Basis' },
      { id: 'fragmentation', label: '地缘金融碎片与阵营', desc: 'Geopolitical Blocs' }
    ]
  },
  {
    id: 'sovereign',
    title: '🛡️ 主权风险与实证',
    short: '主权与模型',
    tabs: [
      { id: 'risk', label: '国家风险与外债敞口', desc: 'CBS Exposure & Stress Testing' },
      { id: 'compare', label: '多国宏观雷达对照', desc: 'Multi-Jurisdiction Benchmark' },
      { id: 'gravity', label: '实证引力模型探索', desc: 'Empirical Banking Gravity' }
    ]
  },
  {
    id: 'intelligence',
    title: '📑 研报与历史复盘',
    short: '历史研报',
    tabs: [
      { id: 'comparison', label: '跨周期宏观对比', desc: 'Macro Regime Diff Engine' },
      { id: 'playbook', label: '历史风暴情景剧场', desc: 'Crisis Case Studies & Swaps' },
      { id: 'dossier', label: '宏观研报与数据导出', desc: 'Research Memo & BIS SDMX' }
    ]
  }
];

/**
 * Dynamically resolves task name and core-task path from the canonical module configuration.
 * Prevents stale defaults (e.g. EWS displaying "全球资本流向全景").
 *
 * @param {string} activeTab
 * @returns {{ id: string, label: string, desc: string, domainId: string, domainTitle: string, domainShort: string, coreTask: 'overview'|'compare'|'stress', taskName: string }}
 */
export function getTabTaskMeta(activeTab) {
  for (const dom of NAVIGATION_DOMAINS) {
    const tab = dom.tabs.find(t => t.id === activeTab);
    if (tab) {
      let coreTask = 'overview'; // 1. 看全局
      if (['compare', 'risk', 'comparison', 'gravity'].includes(tab.id)) {
        coreTask = 'compare'; // 2. 比差异
      } else if (['contagion', 'ews', 'gsib', 'shadow', 'maturity', 'swaps', 'portfolio'].includes(tab.id)) {
        coreTask = 'stress'; // 3. 测压力
      }
      return {
        id: tab.id,
        label: tab.label,
        desc: tab.desc,
        domainId: dom.id,
        domainTitle: dom.title,
        domainShort: dom.short,
        coreTask,
        taskName: `${dom.short} · ${tab.label}`
      };
    }
  }
  return {
    id: activeTab,
    label: activeTab,
    desc: '分析工作台',
    domainId: 'flows',
    domainTitle: '🌐 资本网络与流向',
    domainShort: '流向拓扑',
    coreTask: 'overview',
    taskName: activeTab
  };
}
