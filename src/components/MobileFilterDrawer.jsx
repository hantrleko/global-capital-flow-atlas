import React from 'react';
import { X, Sliders, Check, Download, Layers, Zap, Target } from 'lucide-react';
import soundFx from '../utils/soundEffects';

/**
 * MobileFilterDrawer
 * Bottom-sheet drawer optimized for 375px/390px mobile screens.
 * Ensures touch targets >= 44x44px and eliminates horizontal overflow on narrow viewports.
 */
export default function MobileFilterDrawer({
  isOpen,
  onClose,
  mapProjection,
  setMapProjection,
  corridorDensity,
  setCorridorDensity,
  focusCountry,
  setFocusCountry,
  countries = [],
  metricView,
  setMetricView,
  showLabels,
  setShowLabels,
  onExportPng
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/70 backdrop-blur-sm animate-fade-in md:hidden">
      {/* Click outside to close */}
      <div className="flex-1" onClick={onClose} />

      {/* Drawer Container */}
      <div 
        data-testid="mobile-filter-drawer"
        className="bg-slate-950 border-t border-slate-800 rounded-t-3xl p-5 max-h-[85vh] overflow-y-auto space-y-4 shadow-2xl animate-slide-up"
      >
        {/* Handle bar & Title */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-400/30 flex items-center justify-center text-sky-400">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">进阶视图与筛选设置</h3>
              <p className="text-xs text-slate-400">触控定制可视化密度与投影口径</p>
            </div>
          </div>
          <button
            onClick={onClose}
            data-testid="close-mobile-filter-drawer"
            className="w-11 h-11 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white cursor-pointer"
            aria-label="关闭筛选"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. 投影维度 (2D vs 3D) */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-400">地图投影空间</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                soundFx.playTick();
                setMapProjection('2d');
              }}
              className={`min-h-[44px] px-3 rounded-xl border text-sm font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                mapProjection === '2d'
                  ? 'bg-blue-600 border-blue-500 text-white shadow-md'
                  : 'bg-slate-900 border-slate-800 text-slate-300'
              }`}
            >
              <span>🗺️ 2D 平面投影</span>
              {mapProjection === '2d' && <Check className="w-4 h-4" />}
            </button>
            <button
              onClick={() => {
                soundFx.playChime();
                setMapProjection('3d');
              }}
              className={`min-h-[44px] px-3 rounded-xl border text-sm font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                mapProjection === '3d'
                  ? 'bg-blue-600 border-blue-500 text-white shadow-md'
                  : 'bg-slate-900 border-slate-800 text-slate-300'
              }`}
            >
              <span>🌐 3D 拟真态</span>
              {mapProjection === '3d' && <Check className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* 2. 走廊密度过滤 */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-400">走廊显示密度</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'backbone', label: '骨干网络' },
              { id: 'usd_dominant', label: '美元走廊' },
              { id: 'all', label: '全量走廊' }
            ].map(d => (
              <button
                key={d.id}
                onClick={() => {
                  soundFx.playTick();
                  setCorridorDensity(d.id);
                }}
                className={`min-h-[44px] px-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                  corridorDensity === d.id
                    ? 'bg-sky-600 border-sky-500 text-white shadow-md'
                    : 'bg-slate-900 border-slate-800 text-slate-300'
                }`}
              >
                <span>{d.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 3. 聚焦国家 */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-400">聚焦穿透国家</label>
          <div className="flex items-center gap-2 min-h-[44px] bg-slate-900 border border-slate-800 rounded-xl px-3">
            <Target className="w-4 h-4 text-sky-400 shrink-0" />
            <select
              value={focusCountry}
              onChange={(e) => setFocusCountry(e.target.value)}
              className="w-full bg-transparent text-white font-medium focus:outline-none cursor-pointer text-sm min-h-[40px]"
            >
              <option value="ALL" className="bg-slate-900">🌐 全局穿透视角</option>
              {countries.map(c => (
                <option key={c.code} value={c.code} className="bg-slate-900">
                  {c.name_zh} ({c.code})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 4. 节点口径 */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-400">节点气泡尺寸口径</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'claims', label: '总债权' },
              { id: 'liab', label: '总负债' },
              { id: 'net', label: '净头寸' }
            ].map(m => (
              <button
                key={m.id}
                onClick={() => {
                  soundFx.playTick();
                  setMetricView(m.id);
                }}
                className={`min-h-[44px] px-2 rounded-xl border text-xs font-semibold flex items-center justify-center transition-all cursor-pointer ${
                  metricView === m.id
                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-md'
                    : 'bg-slate-900 border-slate-800 text-slate-300'
                }`}
              >
                <span>{m.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 5. 标签显示与 PNG 导出 */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80">
          <button
            onClick={() => {
              soundFx.playTick();
              setShowLabels(!showLabels);
            }}
            className={`min-h-[44px] px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              showLabels
                ? 'bg-slate-800 border-slate-700 text-white'
                : 'bg-slate-900 border-slate-800 text-slate-400'
            }`}
          >
            <span>{showLabels ? '地名标签: 开启' : '地名标签: 极简'}</span>
          </button>

          <button
            onClick={() => {
              onExportPng && onExportPng();
              onClose();
            }}
            className="min-h-[44px] px-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-sky-400 font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>导出高清 PNG</span>
          </button>
        </div>

        {/* Done Button */}
        <button
          onClick={onClose}
          className="w-full min-h-[44px] rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-sm shadow-lg flex items-center justify-center cursor-pointer mt-3"
        >
          完成并应用
        </button>
      </div>
    </div>
  );
}
