/**
 * Global Systemically Important Banks (G-SIBs) Dataset
 * Calibrated against Financial Stability Board (FSB) 2025/2026 assessments & Basel Committee metrics.
 */

export const GSIB_BUCKETS = {
  4: { surcharge: '2.5%', color: 'rose', label: '最高系统性影响层 (Bucket 4)' },
  3: { surcharge: '2.0%', color: 'amber', label: '高系统性影响层 (Bucket 3)' },
  2: { surcharge: '1.5%', color: 'purple', label: '中高系统性影响层 (Bucket 2)' },
  1: { surcharge: '1.0%', color: 'blue', label: '基础系统性影响层 (Bucket 1)' }
};

export const GSIB_BANKS = [
  // Bucket 4
  {
    id: 'JPM',
    name: 'JPMorgan Chase',
    name_zh: '摩根大通',
    country: 'US',
    bucket: 4,
    assets_usd_bn: 4120,
    cet1_ratio: 15.3,
    leverage_ratio: 6.1,
    cross_border_claims_bn: 1280,
    primary_jurisdictions: ['GB', 'JP', 'DE', 'FR', 'SG'],
    desc: '全球资产规模最大的跨国投行与商业银行，离岸美元清算核心骨干枢纽。'
  },

  // Bucket 3
  {
    id: 'CITI',
    name: 'Citigroup',
    name_zh: '花旗集团',
    country: 'US',
    bucket: 3,
    assets_usd_bn: 2430,
    cet1_ratio: 13.8,
    leverage_ratio: 5.8,
    cross_border_claims_bn: 950,
    primary_jurisdictions: ['GB', 'SG', 'HK', 'MX', 'JP'],
    desc: '全球跨国企业现金管理与新兴市场跨境银行网络最广阔的美资巨头。'
  },
  {
    id: 'HSBC',
    name: 'HSBC Holdings',
    name_zh: '汇丰控股',
    country: 'GB',
    bucket: 3,
    assets_usd_bn: 3040,
    cet1_ratio: 15.1,
    leverage_ratio: 5.4,
    cross_border_claims_bn: 1120,
    primary_jurisdictions: ['HK', 'CN', 'US', 'SG', 'AE'],
    desc: '连接欧洲与亚太资本流动的首要跨国银行动脉，港币发钞行之一。'
  },
  {
    id: 'BAC',
    name: 'Bank of America',
    name_zh: '美国银行',
    country: 'US',
    bucket: 3,
    assets_usd_bn: 3280,
    cet1_ratio: 14.2,
    leverage_ratio: 6.0,
    cross_border_claims_bn: 820,
    primary_jurisdictions: ['GB', 'DE', 'JP', 'CA', 'FR'],
    desc: '全美核心存款与全球跨国银团贷款重头做市商。'
  },

  // Bucket 2
  {
    id: 'BNP',
    name: 'BNP Paribas',
    name_zh: '法国巴黎银行',
    country: 'FR',
    bucket: 2,
    assets_usd_bn: 2890,
    cet1_ratio: 13.6,
    leverage_ratio: 4.6,
    cross_border_claims_bn: 890,
    primary_jurisdictions: ['DE', 'IT', 'US', 'GB', 'ES'],
    desc: '欧元区第一大银行集团，泛欧银行间同业拆借与跨国债券主要承销商。'
  },
  {
    id: 'BARC',
    name: 'Barclays',
    name_zh: '巴克莱银行',
    country: 'GB',
    bucket: 2,
    assets_usd_bn: 1980,
    cet1_ratio: 13.9,
    leverage_ratio: 5.2,
    cross_border_claims_bn: 740,
    primary_jurisdictions: ['US', 'DE', 'FR', 'JP', 'IE'],
    desc: '英镑及跨大西洋英美金融走廊核心承销机构与大宗商品衍生品中介。'
  },
  {
    id: 'ICBC',
    name: 'Industrial and Commercial Bank of China',
    name_zh: '中国工商银行',
    country: 'CN',
    bucket: 2,
    assets_usd_bn: 6380,
    cet1_ratio: 14.1,
    leverage_ratio: 8.2,
    cross_border_claims_bn: 650,
    primary_jurisdictions: ['HK', 'SG', 'US', 'GB', 'AE'],
    desc: '全球总资产第一大银行，中资企业“走出去”与跨境人民币清算首要枢纽。'
  },
  {
    id: 'MUFG',
    name: 'Mitsubishi UFJ Financial Group',
    name_zh: '三菱日联金融集团',
    country: 'JP',
    bucket: 2,
    assets_usd_bn: 2980,
    cet1_ratio: 12.8,
    leverage_ratio: 5.0,
    cross_border_claims_bn: 860,
    primary_jurisdictions: ['US', 'AU', 'SG', 'TH', 'GB'],
    desc: '日本最大的综合金融控股集团，日元境外借贷与跨太平洋套息核心玩家。'
  },
  {
    id: 'DB',
    name: 'Deutsche Bank',
    name_zh: '德意志银行',
    country: 'DE',
    bucket: 2,
    assets_usd_bn: 1480,
    cet1_ratio: 13.7,
    leverage_ratio: 4.9,
    cross_border_claims_bn: 620,
    primary_jurisdictions: ['US', 'GB', 'FR', 'IT', 'SG'],
    desc: '德国最大银行，全球外汇交易（FX）与固定收益做市龙头之一。'
  },
  {
    id: 'GS',
    name: 'Goldman Sachs',
    name_zh: '高盛集团',
    country: 'US',
    bucket: 2,
    assets_usd_bn: 1640,
    cet1_ratio: 14.9,
    leverage_ratio: 5.4,
    cross_border_claims_bn: 680,
    primary_jurisdictions: ['GB', 'JP', 'HK', 'DE', 'CH'],
    desc: '全球顶级投资银行，离岸衍生品做市与跨国并购杠杆融资核心渠道。'
  },
  {
    id: 'UBS',
    name: 'UBS Group',
    name_zh: '瑞银集团',
    country: 'CH',
    bucket: 2,
    assets_usd_bn: 1720,
    cet1_ratio: 14.8,
    leverage_ratio: 5.1,
    cross_border_claims_bn: 790,
    primary_jurisdictions: ['US', 'GB', 'SG', 'HK', 'DE'],
    desc: '并购瑞信后的瑞士超级银行，全球私人财富管理第一霸主与离岸中介。'
  },

  // Bucket 1 (Representative top players)
  {
    id: 'BOC',
    name: 'Bank of China',
    name_zh: '中国银行',
    country: 'CN',
    bucket: 1,
    assets_usd_bn: 4620,
    cet1_ratio: 13.5,
    leverage_ratio: 7.6,
    cross_border_claims_bn: 580,
    primary_jurisdictions: ['HK', 'SG', 'GB', 'US', 'FR'],
    desc: '中国国际化程度最高的国有大行，港币与澳门币发钞行，全球离岸人民币清算主力。'
  },
  {
    id: 'CCB',
    name: 'China Construction Bank',
    name_zh: '中国建设银行',
    country: 'CN',
    bucket: 1,
    assets_usd_bn: 5410,
    cet1_ratio: 13.9,
    leverage_ratio: 7.9,
    cross_border_claims_bn: 490,
    primary_jurisdictions: ['HK', 'SG', 'GB', 'US', 'AU'],
    desc: '大型基建与跨国基础设施银团贷款重要出资方。'
  },
  {
    id: 'MS',
    name: 'Morgan Stanley',
    name_zh: '摩根士丹利',
    country: 'US',
    bucket: 1,
    assets_usd_bn: 1220,
    cet1_ratio: 15.6,
    leverage_ratio: 5.7,
    cross_border_claims_bn: 460,
    primary_jurisdictions: ['GB', 'JP', 'HK', 'DE', 'AU'],
    desc: '财富管理与机构股票做市巨头，与日本三菱日联结成深厚跨境战略联盟。'
  },
  {
    id: 'SAN',
    name: 'Banco Santander',
    name_zh: '西班牙桑坦德银行',
    country: 'ES',
    bucket: 1,
    assets_usd_bn: 1910,
    cet1_ratio: 13.2,
    leverage_ratio: 4.8,
    cross_border_claims_bn: 540,
    primary_jurisdictions: ['BR', 'GB', 'MX', 'US', 'CL'],
    desc: '连接欧洲与拉丁美洲跨国信贷市场的首要金融枢纽。'
  },
  {
    id: 'SMFG',
    name: 'Sumitomo Mitsui Financial Group',
    name_zh: '三井住友金融集团',
    country: 'JP',
    bucket: 1,
    assets_usd_bn: 2040,
    cet1_ratio: 12.6,
    leverage_ratio: 5.1,
    cross_border_claims_bn: 610,
    primary_jurisdictions: ['US', 'SG', 'GB', 'ID', 'IN'],
    desc: '日本三大行之一，在东南亚与北美项目融资领域占据主要份额。'
  },
  {
    id: 'STAN',
    name: 'Standard Chartered',
    name_zh: '渣打银行',
    country: 'GB',
    bucket: 1,
    assets_usd_bn: 840,
    cet1_ratio: 14.1,
    leverage_ratio: 5.0,
    cross_border_claims_bn: 480,
    primary_jurisdictions: ['HK', 'SG', 'AE', 'IN', 'KE'],
    desc: '深耕亚洲、非洲与中东贸易走廊的跨国英资银行，港币发钞行之一。'
  }
];
