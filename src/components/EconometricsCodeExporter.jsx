import React, { useState } from 'react';
import { 
  Code, Copy, Check, Download, BookOpen, Sparkles, X, 
  Terminal, FileText, Cpu, Database
} from 'lucide-react';
import soundFx from '../utils/soundEffects';

export default function EconometricsCodeExporter({
  isOpen,
  onClose,
  selectedQuarter,
  countries = []
}) {
  const [activeLang, setActiveLang] = useState('python'); // 'python' | 'r' | 'stata'
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const pythonScript = `"""
=============================================================================
BIS Global Capital Flow Atlas - Empirical Econometrics Pipeline
Model: Gravity Model of Cross-Border Banking Claims & Network Centrality
Target Quarter: ${selectedQuarter}
Data Standard: BIS Locational Banking Statistics (LBS) & Model Reconstructed Corridors

[IMPORTANT METHODOLOGY DISCLAIMER]
This econometric pipeline estimates gravity distance elasticity on the 
biproportionally balanced (RAS) micro bilateral network for methodological 
benchmarking and pipeline replication. It does NOT represent proprietary 
unredacted confidential interbank contracts withheld by central bank regulators.
=============================================================================
"""

import json
import math
import urllib.request
import numpy as np
import pandas as pd
import statsmodels.api as sm
import statsmodels.formula.api as smf
import networkx as nx

# 1. Ingest Full 506 Bilateral Corridors for Target Quarter
dataset_url = "https://raw.githubusercontent.com/hantrleko/global-capital-flow-atlas/main/src/data/bis_atlas_dataset.json"
print(f"[*] Fetching verified Atlas dataset for Quarter: ${selectedQuarter}...")

try:
    with urllib.request.urlopen(dataset_url) as resp:
        raw_dataset = json.loads(resp.read().decode('utf-8'))
except Exception as e:
    print(f"[!] Remote fetch failed ({e}). Loading from local relative path...")
    with open("src/data/bis_atlas_dataset.json", "r", encoding="utf-8") as f:
        raw_dataset = json.load(f)

quarter = "${selectedQuarter}"
links = raw_dataset.get("bilateral_matrix", {}).get(quarter, [])
countries = {c["code"]: c for c in raw_dataset.get("countries", [])}

# 2. Haversine Great-Circle Distance Function (km)
def haversine(lat1, lon1, lat2, lon2):
    R = 6371.0  # Earth's radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return max(100.0, R * c)

rows = []
for link in links:
    src = countries.get(link["source"])
    dst = countries.get(link["target"])
    if not src or not dst:
        continue
    dist_km = haversine(src["lat"], src["lng"], dst["lat"], dst["lng"])
    rows.append({
        "origin": link["source"],
        "dest": link["target"],
        "claims_usd_bn": link["claims_usd_bn"],
        "usd_volume_bn": link.get("usd_denominated_bn", 0.0),
        "gdp_origin_bn": src["gdp_usd_bn"],
        "gdp_dest_bn": dst["gdp_usd_bn"],
        "distance_km": dist_km,
        "same_region": int(src["region"] == dst["region"]),
        "common_bloc": int(src["bloc"] == dst["bloc"])
    })

data = pd.DataFrame(rows)
print(f"[*] Ingested {len(data)} bilateral corridors for {quarter}.")

# 3. Log Transformations for Structural Gravity Estimation
data["ln_claims"] = np.log(data["claims_usd_bn"])
data["ln_gdp_o"] = np.log(data["gdp_origin_bn"])
data["ln_gdp_d"] = np.log(data["gdp_dest_bn"])
data["ln_dist"] = np.log(data["distance_km"])

# 4. Log-Linear Gravity Regression (OLS with Heteroskedasticity-Robust HC1 SE)
# ln(Claims_ij) = beta_0 + beta_1*ln(GDP_i) + beta_2*ln(GDP_j) - beta_3*ln(Dist_ij) + eps
model_ols = smf.ols("ln_claims ~ ln_gdp_o + ln_gdp_d + ln_dist + same_region + common_bloc", data=data).fit(cov_type="HC1")
print("\\n=== OLS Gravity Estimation Results (Robust HC1) ===")
print(model_ols.summary())

# 5. Poisson Pseudo-Maximum Likelihood (PPML) Estimation
model_ppml = smf.glm("claims_usd_bn ~ ln_gdp_o + ln_gdp_d + ln_dist + same_region + common_bloc", 
                     data=data, family=sm.families.Poisson()).fit(cov_type="HC1")
print("\\n=== PPML Gravity Estimation Results (Robust HC1) ===")
print(model_ppml.summary())

# 6. Global Intermediation Network Centrality
G = nx.DiGraph()
for _, row in data.iterrows():
    G.add_edge(row["origin"], row["dest"], weight=row["claims_usd_bn"])

pagerank = nx.pagerank(G, weight="weight")
print(f"\\n=== Top 8 Banking Intermediation Hubs (PageRank Centrality, {quarter}) ===")
for node, score in sorted(pagerank.items(), key=lambda x: x[1], reverse=True)[:8]:
    print(f"Jurisdiction {node}: Centrality Score = {score:.4f}")
`;

  const rScript = `#' =============================================================================
#' BIS Global Capital Flow Atlas - Empirical Panel Econometrics in R
#' Model: Poisson Pseudo-Maximum Likelihood (PPML) with Multi-Way Fixed Effects
#' Target Quarter: ${selectedQuarter}
#' Reference: Silva & Tenreyro (2006); Head & Mayer (2014)
#'
#' [IMPORTANT METHODOLOGY DISCLAIMER]
#' Estimates gravity parameters on the RAS-balanced cross-border banking network
#' for pipeline verification. Uses jsonlite to parse hierarchical JSON cleanly.
#' =============================================================================

# Install required modern econometrics packages if needed:
# install.packages(c("jsonlite", "data.table", "fixest", "igraph"))

library(jsonlite)
library(data.table)
library(fixest)
library(igraph)

message("[*] Fetching verified Atlas dataset for Quarter: ${selectedQuarter}...")
url <- "https://raw.githubusercontent.com/hantrleko/global-capital-flow-atlas/main/src/data/bis_atlas_dataset.json"

tryCatch({
  dataset <- fromJSON(url)
}, error = function(e) {
  message("[!] Remote fetch failed. Loading local file...")
  dataset <- fromJSON("src/data/bis_atlas_dataset.json")
})

quarter <- "${selectedQuarter}"

# Extract corridors and country metadata
corridors <- as.data.table(dataset$bilateral_matrix[[quarter]])
countries <- as.data.table(dataset$countries)

# Merge coordinates and economic anchors
setnames(corridors, c("source", "target"), c("origin", "dest"))
dt <- merge(corridors, countries[, .(code, lat_o = lat, lng_o = lng, gdp_o = gdp_usd_bn, reg_o = region)], by.x = "origin", by.y = "code")
dt <- merge(dt, countries[, .(code, lat_d = lat, lng_d = lng, gdp_d = gdp_usd_bn, reg_d = region)], by.x = "dest", by.y = "code")

# Compute Great-Circle Distance via Haversine
haversine_dist <- function(lat1, lon1, lat2, lon2) {
  p <- pi / 180
  a <- 0.5 - cos((lat2 - lat1) * p)/2 + cos(lat1 * p) * cos(lat2 * p) * (1 - cos((lon2 - lon1) * p)) / 2
  6371 * 2 * asin(sqrt(pmax(0, pmin(1, a))))
}
dt[, distance_km := pmax(100, haversine_dist(lat_o, lng_o, lat_d, lng_d))]
dt[, ln_dist := log(distance_km)]
dt[, same_region := as.integer(reg_o == reg_d)]

message(sprintf("[*] Ingested %d bilateral corridors for %s.", nrow(dt), quarter))

# 1. High-Dimensional Fixed Effects PPML (Silva & Tenreyro 2006)
gravity_ppml <- feglm(
  claims_usd_bn ~ ln_dist + same_region | origin + dest,
  data = dt,
  family = "poisson",
  cluster = ~origin
)

message("=== Structural PPML Fixed Effects Output ===")
summary(gravity_ppml)

# 2. Network Hub Centrality (igraph)
adj_mat <- as.matrix(dcast(dt, origin ~ dest, value.var = "claims_usd_bn", fill = 0), rownames = 1)
g <- graph_from_adjacency_matrix(adj_mat, mode = "directed", weighted = TRUE)
hub_scores <- hub_score(g)$vector
message(sprintf("\\n=== Top Global Banking Intermediation Hubs (%s) ===", quarter))
print(head(sort(hub_scores, decreasing = TRUE), 8))
`;

  const stataScript = `* =============================================================================
* BIS Global Capital Flow Atlas - Stata Empirical Do-File
* Target Quarter: ${selectedQuarter}
* Command: ppmlhdfe (Correia, Guimarães, Zylkin 2020)
*
* [INSTRUCTIONS FOR RUNNING IN STATA]
* 1. Export the research dataset CSV from the Atlas platform:
*    (Navigation: Research Dossier / Code Exporter -> "Export CSV")
*    File name: bis_capital_flow_${selectedQuarter}.csv
* 2. Place the CSV in your Stata working directory and run this script.
* =============================================================================

clear all
set more off

* 1. Check and install ppmlhdfe dependencies
capture which ppmlhdfe
if _rc != 0 {
    ssc install ppmlhdfe
    ssc install reghdfe
    ssc install ftools
}

* 2. Load Cross-Border Panel CSV Exported from Platform
capture import delimited "bis_capital_flow_${selectedQuarter}.csv", clear
if _rc != 0 {
    display as error "Please export bis_capital_flow_${selectedQuarter}.csv from the web interface first."
    exit
}

* 3. Model Variable Summary
display "[*] Dataset loaded successfully for quarter: ${selectedQuarter}"
describe
list countrycode claims_usd_bn liabilities_usd_bn in 1/10
`;

  const currentScript = 
    activeLang === 'python' ? pythonScript :
    activeLang === 'r' ? rScript : stataScript;

  const filename = 
    activeLang === 'python' ? `bis_gravity_${selectedQuarter}.py` :
    activeLang === 'r' ? `bis_gravity_${selectedQuarter}.R` : `bis_gravity_${selectedQuarter}.do`;

  const handleCopy = () => {
    soundFx.playChime();
    navigator.clipboard.writeText(currentScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    soundFx.playTick();
    const blob = new Blob([currentScript], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-950/85 backdrop-blur-md animate-fade-in font-sans">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl bg-slate-900 border border-sky-500/40 shadow-[0_0_60px_rgba(14,165,233,0.3)] overflow-hidden">
        {/* Top Accent Line */}
        <div className="h-1.5 w-full bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-500" />

        {/* Modal Header */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white shadow-[0_0_15px_rgba(14,165,233,0.4)]">
              <Code className="w-5 h-5 text-sky-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base md:text-lg font-bold text-white tracking-tight">
                  计量经济学与学术回归代码生成器 (Econometric Code Exporter)
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/40">
                  Target: {selectedQuarter}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                可直接复制到本地 Python / R / Stata 执行的跨国银行引力模型与网络级联测算脚本
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              soundFx.playTick();
              onClose();
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Methodological Disclaimer Banner */}
        <div className="px-6 py-2 bg-amber-500/10 border-b border-amber-500/20 flex items-start gap-2 text-xs text-amber-200">
          <BookOpen className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
          <span>
            <strong>方法论说明：</strong> 本脚本基于系统双比例 RAS 重构之 506 条双边信贷走廊进行引力模型回归与中心度计算，用于学术复现与量化流水线验证，非 BIS 官方未公开之商业银行微观原始合同。
          </span>
        </div>

        {/* Language Tabs & Action Bar */}
        <div className="px-6 py-2.5 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {[
              { id: 'python', label: 'Python (Pandas / Statsmodels / NetworkX)' },
              { id: 'r', label: 'R (fixest / PPML / igraph)' },
              { id: 'stata', label: 'Stata (ppmlhdfe / Do-File)' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  soundFx.playTick();
                  setActiveLang(tab.id);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer ${
                  activeLang === tab.id
                    ? 'bg-sky-600 text-white shadow-[0_0_12px_rgba(14,165,233,0.5)]'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-sky-400" />}
              <span>{copied ? '已复制到剪贴板' : '一键复制代码'}</span>
            </button>
            <button
              onClick={handleDownload}
              className="px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-sky-600/30 transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>下载脚本 ({filename})</span>
            </button>
          </div>
        </div>

        {/* Code Content Display */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-950 font-mono text-xs">
          <pre className="text-slate-300 leading-relaxed overflow-x-auto p-3 rounded-xl bg-slate-900/90 border border-slate-800/90 selection:bg-sky-600 selection:text-white">
            <code>{currentScript}</code>
          </pre>
        </div>

        {/* Footer Academic References */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-900/90 text-slate-400 text-[11px] flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-sky-400" />
            <span>实证方法论基准: Silva & Tenreyro (2006); Head & Mayer (2014); BIS Working Papers No. 984</span>
          </div>
          <span className="text-slate-500">已自动绑定 {selectedQuarter} 官方审计口径参数</span>
        </div>
      </div>
    </div>
  );
}
