# Global Capital Flow Atlas (全球资本流动图谱)
### 国际清算银行 (BIS) 统计宏观金融图谱与跨国风险敞口监测平台

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![BIS SDMX Standard](https://img.shields.io/badge/BIS%20SDMX-LBS%20Observations-emerald.svg)](https://stats.bis.org)
[![Time Coverage](https://img.shields.io/badge/Coverage-36%20Quarters%20(2018Q1--2026Q4)-blueviolet.svg)](#-时间跨度与数据分层架构)
[![Online Deployment](https://img.shields.io/badge/Live%20Demo-GitHub%20Pages-sky.svg)](https://hantrleko.github.io/global-capital-flow-atlas/)

> **🌐 在线生产环境 (Live Demo)**: [https://hantrleko.github.io/global-capital-flow-atlas/](https://hantrleko.github.io/global-capital-flow-atlas/)  
> **📦 官方代码仓库 (GitHub)**: [https://github.com/hantrleko/global-capital-flow-atlas](https://github.com/hantrleko/global-capital-flow-atlas)

以**国际清算银行 (Bank for International Settlements, BIS)** 国际银行统计 (IBS) 与**金融稳定委员会 (FSB)** 全球系统重要性银行 (G-SIBs) 监管框架为基石，专门面向宏观量化研究团队、主权财富基金分析师及中央银行宏观审慎部门打造的高维交互式金融基础设施。

---

## 🏛️ 时间跨度与数据分层架构 (Data Architecture & Provenance)

首页的季度观察使用 BIS 发布的跨境银行债权序列。模型分析以单独的校准快照为基础。

| 数据 | 内容 | 来源 |
| --- | --- | --- |
| BIS 全球债权 | 从 2018Q1 起，显示期末余额、相邻季度余额差，以及汇率和统计断点调整后的变动。 | BIS LBS SDMX 序列，首页提供原始序列链接。 |
| BIS 试点走廊 | 首批五条公开双边走廊，展示报告地、交易对手所在地、报告期和数据状态。 | BIS LBS A6.2 季度观测，快照随 CSV 和 Excel 发布。 |
| Atlas 双边模型 | 按预设国别边际和双比例平衡法重构完整网络，用于模型地图和压力测试。 | 仓库的 Atlas 校准快照。 |
| Atlas 前瞻情景 | 按预设参数展示未来季度的网络情景。 | Atlas 模型设定。 |

---

## 🔬 两大 BIS 统计支柱的学理互补

1. **LBS (居住地银行统计, Locational Banking Statistics - Table A6.2)**：
   - **核心原则：常住地原则 (Residence Principle)**。无论银行母国法人归属，凡在伦敦、纽约、新加坡或开曼群岛设立的物理分支机构均计入所在国。
   - **核心价值：**追踪跨国货币流动、离岸欧洲美元 (Eurodollar) 资金池运转、跨境清算路由与外汇掉期币种错配。
2. **CBS (综合银行统计, Consolidated Banking Statistics - Table B4)**：
   - **核心原则：最终风险承担原则 (Ultimate Risk Basis)**。穿透避税天堂及开曼/卢森堡 SPV，根据母国母行或主权担保人的实际法定住所核算风险。
   - **核心价值：**真实评估各国商业银行体系资产负债表受损程度，为国家风险矩阵与巴塞尔早期预警系统 (EWS) 提供坚实依托。

---

## 🚀 系统核心功能矩阵 (5 大主域 / 15 大量化模块)

### 1. 🌐 资本网络与流向分析域
- **信贷流向地图 (Capital Flow Map)**：WebGL 粒子流向拓扑，支持 23 个系统重要性经济体聚焦模式、多国走廊穿透与 36 季度完整时间轴擦洗联动。
- **金融网络拓扑 (Network Topology)**：加权有向网络建模，实时计算各经济体网络中心度 (Degree/Betweenness Centrality) 与出入度不对称度。
- **资本路由矩阵 (Bilateral Routing & Sankey)**：四级桑基路由，透视「出资国 → 离岸通道 (开曼/香港/卢森堡) → 借款部门 (银行同业/非银影子银行/实体企业)」完整资金再循环链路。

### 2. ⚡ 早期预警与传染测试域
- **巴塞尔早期预警系统 (Early Warning System, EWS)**：依照巴塞尔委员会 (BCBS) 逆周期资本缓冲指引，解算信贷/GDP 缺口 (HP Filter, $\lambda=400,000$)、DSR 偿债比率缺口与红黄绿三色信号灯。
- **Top 30 G-SIBs 顶级银行微观透镜 (GsibMonitor)**：穿透 FSB Bucket 1 至 Bucket 4 全球 30 家系统重要性银行（摩根大通、工行、法巴、汇丰、三菱日联等）的 CET1 充足率、杠杆率与单家银行信贷骤缩微观压力测试。
- **跨国银行级联传染模拟器 (Eisenberg-Noe Contagion Simulator)**：模拟任意主权或震中违约时，经由资产直接减记与去杠杆乘数向全球扩散的多米诺骨牌级联效应。
- **影子银行与非银透视 (Shadow Banking & Offshore NBFIs)**：穿透开曼群岛、爱尔兰、卢森堡非银金融机构资金池，依据 Borio et al. (BIS WP) 模型核算表外外汇掉期隐性负债。
- **期限结构与转期挤兑 (Maturity Rollover Monitor)**：CBS 剩余期限拆解与格林斯潘-古多蒂规则 (Greenspan-Guidotti Rule) 动态达标监控。

### 3. 💵 美元与多极货币格局域
- **全球多币种计价实时折算引擎**：支持以 **USD ($)**、**EUR (€)**、**RMB (¥)**、**JPY (¥)** 及 **国际黄金 (🪙 oz)** 实时重估全站资产与走廊流量。
- **央行流动性互换网络与 CIP 基差**：监测美联储五大常设常备互换线、FIMA Repo 机制、中国央行双边互换协议及 3 个月期 Cross-Currency Basis 轨迹。
- **地缘金融碎片化指数 (Geopolitical Fragmentation Tracker)**：监测 G7 与 BRICS+ 阵营内部及跨境直接融通占比，衡量友岸外包 (Friend-Shoring) 与阵营分化。

### 4. 🛡️ 主权风险与实证计量域
- **国家风险与外债敞口 (CBS Risk Matrix)**：外债存量 vs 官方外汇储备象限图，结合自建宏观压力沙盒。
- **多国宏观雷达对照 (Multi-Jurisdiction Benchmark)**：五维正规化极坐标雷达，对比任意 2-5 个主权的宏观韧性。
- **国际银行实证引力模型 (Empirical Banking Gravity)**：双对数 OLS/PPML 引力回归模型，定量识别离岸中介中心超额正残差 (Offshore Conduit Premium)。

### 5. 📑 机构交付与数据沙盒
- **机构私有资产 Excel / CSV 本地私密沙盒 (Custom Ingestion Sandbox)**：100% 浏览器客户端内存解析分析师私有资产组合，绝不产生网络或服务端外泄，即时覆盖全局 15 个分析维度。
- **A4 投委会宏观研报导出器**：支持一键生成投研备忘录并排版打印 / 另存为 PDF。
- **Python / R / Stata 计量代码直出**：一键导出包含 `pandas`, `networkx`, `statsmodels` 的可复现量化分析脚本。
- **方法论与数据附录 (Methodology Appendix)**：严谨记录 SDMX API 规范、矩阵平衡公式与标准 BibTeX 学术引用。
- **深度快照链接 (URL Deep Linking)**：支持以 `?q=2020Q1&tab=contagion&country=US` 等 URL 参数无损分享特定分析场景。

---

## 🛠️ 本地开发与全自动 CI/CD

### 1. 本地启动
```bash
git clone https://github.com/hantrleko/global-capital-flow-atlas.git
cd global-capital-flow-atlas
npm install
npm run dev
```
本地服务将在 `http://localhost:5173/` 启动。

### 2. 更新 BIS 公开观测

```bash
python -m unittest discover -s tests -p 'test_bis_observations.py'
python scripts/update_bis_observations.py
```

首页和季度导出读取 `src/data/bis_observations.json`。快照记录 BIS LBS 存量和汇率及统计断点调整后变动的序列键、状态和版本。试点走廊包含报告地与交易对手所在地。可通过 `--csv-dir` 从归档的 `stocks.csv`、`adjusted.csv` 和 `pilot.csv` 重建快照。自动更新会在数据缺失、序列不匹配或单位变化时退出并保留上一版本。

压力测试使用独立的 Atlas 校准矩阵。矩阵维护入口为 `scripts/fetch_bis_data.py`。

### 3. 生产打包
```bash
npm run build
npm run preview
```

### 4. GitHub Actions 自动化管道
仓库集成了 [`.github/workflows/update-bis-data.yml`](.github/workflows/update-bis-data.yml)，每周自动探测并拉取 BIS 官方 SDMX 最细数据发布，校验通过后自动执行重新构建并部署至 GitHub Pages。

---

## 📜 学术引用规范 (BibTeX)

如果您在学术论文、央行工作论文、政策简报或量化投研报告中引用了本图谱，请使用以下规范：

```bibtex
@software{GlobalCapitalFlowAtlas2026,
  author = {EF Lab Quantitative Macro Research},
  title = {BIS Global Capital Flow Atlas: Multi-Dimensional Cross-Border Banking & Macroprudential Surveillance Platform},
  year = {2026},
  url = {https://hantrleko.github.io/global-capital-flow-atlas/},
  note = {Based on BIS Locational Banking Statistics (LBS Table A6.2) & Consolidated Banking Statistics (CBS Table B4) with Stylized Matrix Balancing}
}
```

---

## ⚖️ 知识产权与免责声明

本项目基于国际清算银行 (BIS) 及金融稳定委员会 (FSB) 公开统计方法论开发，供国际金融研究、学术交流与量化宏观研判使用。数据中的微观银行间负债网络为示意性结构模型测算，并非监管保密对账明细。
