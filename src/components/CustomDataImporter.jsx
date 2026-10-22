import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { 
  UploadCloud, FileSpreadsheet, Download, CheckCircle2, 
  AlertCircle, X, Sparkles, Shield, ArrowRight, RefreshCw, AlertTriangle
} from 'lucide-react';
import soundFx from '../utils/soundEffects';
import { normalizeCorridorExposures } from '../utils/eisenbergNoeClearing';

export default function CustomDataImporter({
  isOpen,
  onClose,
  onApplyCustomData,
  onResetToOfficial
}) {
  const [parsedData, setParsedData] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState('');
  const importSeqRef = React.useRef(0);

  if (!isOpen) return null;

  const handleDownloadTemplate = () => {
    soundFx.playTick();
    const templateRows = [
      { source: 'US', target: 'GB', claims_usd_bn: 780.5, usd_denominated_bn: 560.0, sector: 'Bank' },
      { source: 'US', target: 'JP', claims_usd_bn: 620.2, usd_denominated_bn: 420.0, sector: 'Bank' },
      { source: 'GB', target: 'US', claims_usd_bn: 890.4, usd_denominated_bn: 720.0, sector: 'Bank' },
      { source: 'JP', target: 'US', claims_usd_bn: 710.0, usd_denominated_bn: 560.0, sector: 'Bank' },
      { source: 'DE', target: 'FR', claims_usd_bn: 480.2, usd_denominated_bn: 160.0, sector: 'Non-Bank' },
      { source: 'FR', target: 'DE', claims_usd_bn: 450.1, usd_denominated_bn: 140.0, sector: 'Non-Bank' },
      { source: 'CN', target: 'HK', claims_usd_bn: 560.3, usd_denominated_bn: 250.0, sector: 'Sovereign' },
      { source: 'SG', target: 'CN', claims_usd_bn: 310.2, usd_denominated_bn: 260.0, sector: 'Bank' },
      { source: 'CH', target: 'US', claims_usd_bn: 380.5, usd_denominated_bn: 290.0, sector: 'Bank' },
      { source: 'KY', target: 'US', claims_usd_bn: 940.0, usd_denominated_bn: 860.0, sector: 'Offshore' }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Bilateral_Claims');
    XLSX.writeFile(workbook, 'BIS_Custom_Claims_Template.xlsx');
  };

  const processFile = (file) => {
    const currentSeq = ++importSeqRef.current;
    setErrorMsg(null);
    setParsedData(null); // Clear stale candidate state immediately
    setFileName(file.name);
    const reader = new FileReader();

    reader.onload = (e) => {
      // Async race protection: ignore stale read results
      if (currentSeq !== importSeqRef.current) return;
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json(worksheet);

        if (!json || json.length === 0) {
          setParsedData(null);
          setErrorMsg('上传的文件为空或未能识别有效数据行。');
          return;
        }

        // Validate structure & normalize exposures
        const validated = [];

        json.forEach((row, idx) => {
          const src = (row.source || row.Source || row.origin || '').toString().trim().toUpperCase();
          const dst = (row.target || row.Target || row.dest || '').toString().trim().toUpperCase();
          const claims = parseFloat(row.claims_usd_bn || row.Claims || row.claims || 0);
          const usdVol = parseFloat(row.usd_denominated_bn || row.usd_share || claims * 0.7);
          const id = (row.id || row.Id || row.exposure_id || '').toString().trim();

          if (src && dst && !isNaN(claims) && claims > 0) {
            validated.push({
              id: id || null,
              source: src,
              target: dst,
              claims_usd_bn: claims,
              usd_denominated_bn: usdVol
            });
          }
        });

        // Canonical normalization: deduplicates stable IDs, aggregates multi-tranche exposures, isolates conflicts
        const norm = normalizeCorridorExposures(validated);

        if (norm.normalizedLinks.length === 0) {
          setParsedData(null);
          setErrorMsg('未检测到符合规范的数据列（必须包含 source, target, claims_usd_bn 字段）。');
          return;
        }

        const totalVolume = norm.normalizedLinks.reduce((sum, l) => sum + l.claims_usd_bn, 0);

        soundFx.playChime();
        setParsedData({
          rows: norm.normalizedLinks,
          conflicts: norm.conflicts,
          rawCount: norm.rawCount,
          count: norm.normalizedLinks.length,
          totalVolume: Math.round(totalVolume * 10) / 10
        });
      } catch (err) {
        console.error(err);
        setParsedData(null);
        setErrorMsg('文件解析失败，请确保格式为标准的 .xlsx, .xls 或 .csv 文件。');
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleApply = () => {
    if (!parsedData || parsedData.rows.length === 0) return;
    soundFx.playChime();
    onApplyCustomData?.(parsedData.rows, fileName);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-950/85 backdrop-blur-md animate-fade-in font-sans">
      <div className="relative w-full max-w-2xl max-h-[92vh] flex flex-col rounded-2xl bg-slate-900 border border-emerald-500/40 shadow-[0_0_60px_rgba(16,185,129,0.3)] overflow-hidden">
        {/* Top Accent Gradient Line */}
        <div className="h-1.5 w-full bg-gradient-to-r from-emerald-500 via-teal-400 to-sky-500" />

        {/* Modal Header */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-700 flex items-center justify-center text-white shadow-md">
              <FileSpreadsheet className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base md:text-lg font-bold text-white tracking-tight">
                  机构私有资产敞口导入沙盒 (Custom Data Ingestion)
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  Client-Side Only
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                支持 Excel (.xlsx) 与 CSV · 100% 浏览器内存运行，绝不上传云端
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

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Action Toolbar */}
          <div className="flex items-center justify-between text-xs bg-slate-950 p-3 rounded-xl border border-slate-800">
            <div className="flex items-center gap-2 text-slate-300">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span>数据全程驻留本地内存，满足银行与基金内部合规隔离标准。</span>
            </div>
            <button
              onClick={handleDownloadTemplate}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sky-300 font-semibold flex items-center gap-1.5 transition-all shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-sky-400" />
              <span>下载标准 Excel 模板</span>
            </button>
          </div>

          {/* Drag & Drop Upload Zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
              isDragging
                ? 'border-emerald-400 bg-emerald-950/20'
                : 'border-slate-700 hover:border-slate-500 bg-slate-950/40'
            }`}
            onClick={() => document.getElementById('custom-file-input')?.click()}
          >
            <input
              id="custom-file-input"
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileInput}
              className="hidden"
            />
            <UploadCloud className="w-12 h-12 text-emerald-400 mb-3 animate-bounce-subtle" />
            <h3 className="text-sm font-bold text-white mb-1">
              拖拽 Excel / CSV 文件至此处，或点击浏览选择
            </h3>
            <p className="text-xs text-slate-400">
              支持字段: source (出发地), target (目的地), claims_usd_bn (规模), usd_denominated_bn
            </p>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Parsed Preview Table */}
          {parsedData && (
            <div className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="font-bold text-white">已规范化解析: {fileName}</span>
                </div>
                <span className="text-slate-400 font-mono">
                  {parsedData.rawCount ? `原始 ${parsedData.rawCount} 笔敞口 → 汇总为 ` : ''}{parsedData.count} 条标准走廊 · 总规模 ${(parsedData.totalVolume / 1000).toFixed(2)} 万亿美元
                </span>
              </div>

              {parsedData.conflicts && parsedData.conflicts.length > 0 && (
                <div className="p-2.5 bg-amber-950/40 border border-amber-500/40 rounded-lg text-xs text-amber-200 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <span className="font-bold">检测到 {parsedData.conflicts.length} 条冲突记录已自动隔离（不参与矩阵计算）：</span>
                    <ul className="list-disc pl-4 text-slate-300 text-[11px]">
                      {parsedData.conflicts.slice(0, 3).map((c, i) => (
                        <li key={i}>{c.reason}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              <div className="max-h-48 overflow-y-auto border border-slate-800 rounded-lg text-xs font-mono">
                <table className="w-full text-left">
                  <thead className="bg-slate-900 border-b border-slate-800 text-slate-400">
                    <tr>
                      <th className="p-2">源 (Source)</th>
                      <th className="p-2">宿主 (Target)</th>
                      <th className="p-2 text-right">规模 (Claims $B)</th>
                      <th className="p-2 text-right">美元计价 ($B)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {parsedData.rows.slice(0, 8).map((row, i) => (
                      <tr key={i} className="hover:bg-slate-900/40">
                        <td className="p-2 text-sky-400 font-bold">{row.source}</td>
                        <td className="p-2 text-white font-bold">{row.target}</td>
                        <td className="p-2 text-right text-emerald-400">${row.claims_usd_bn}B</td>
                        <td className="p-2 text-right text-slate-300">${row.usd_denominated_bn}B</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parsedData.rows.length > 8 && (
                <div className="text-[11px] text-slate-500 text-center font-mono">
                  ... 仅预览前 8 条，全部 {parsedData.count} 条走廊将一并载入
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer Bar */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between gap-3">
          <button
            onClick={() => {
              soundFx.playTick();
              onResetToOfficial?.();
              onClose();
            }}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
            <span>恢复 BIS 官方审计基准</span>
          </button>

          <button
            onClick={handleApply}
            disabled={!parsedData}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-30 disabled:cursor-not-allowed text-white text-xs font-bold shadow-lg shadow-emerald-600/30 flex items-center gap-1.5 transition-all hover:scale-[1.02] cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>装载并应用至全景网络</span>
          </button>
        </div>
      </div>
    </div>
  );
}
