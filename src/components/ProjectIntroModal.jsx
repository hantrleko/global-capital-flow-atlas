import React, { useState } from 'react';
import { 
  Globe, Shield, BookOpen, Layers, Zap, Bot, ArrowRight, 
  CheckCircle2, Sparkles, X, Activity, DollarSign, Split, Compass
} from 'lucide-react';
import soundFx from '../utils/soundEffects';

export default function ProjectIntroModal({
  isOpen,
  onClose,
  onExploreFeature
}) {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  if (!isOpen) return null;

  const handleClose = () => {
    soundFx.playTick();
    if (dontShowAgain) {
      localStorage.setItem('bis_atlas_intro_seen', 'true');
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-950/85 backdrop-blur-md animate-fade-in font-sans">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 border border-blue-500/40 shadow-[0_0_60px_rgba(30,58,138,0.4)] overflow-hidden">
        {/* Top Decorative Gradient Accent */}
        <div className="h-1.5 w-full bg-gradient-to-r from-blue-500 via-sky-400 to-indigo-500" />

        {/* Modal Header */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-[0_0_15px_rgba(59,130,246,0.4)]">
              <Globe className="w-5 h-5 text-sky-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base md:text-lg font-bold text-white tracking-tight">
                  BIS Global Capital Flow Atlas · 全球资本流动图谱
                </h2>
                <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30">
                  Platform Brief
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                项目核心宗旨、学术底座与投行级宏观研判导览
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-slate-300">
          {/* Section 1: The Core "Why" (现实意义与项目初衷) */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-blue-950/40 to-indigo-950/30 border border-blue-500/30 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-sky-300 uppercase tracking-wider font-mono">
              <Compass className="w-4 h-4 text-sky-400" />
              1. 为什么这个项目至关重要？（Core Significance）
            </div>
            <h3 className="text-sm md:text-base font-bold text-white">
              从“商品贸易小视角”跃迁至“47.8 万亿美元跨国银行总资产负债表与美元金融流动”
            </h3>
            <p className="text-xs leading-relaxed text-slate-300">
              全球金融危机的历史（从 2008 年次贷危机、2011 欧债危机、2020 年疫情美元荒到 2023 年硅谷银行与百年瑞信破产）深刻揭示了一个规律：<b>决定现代世界金融稳定的，从来不只是海关口岸的货物贸易差额，而是以跨国银行为中枢的「总资产与总负债流动 (Gross Financial Flows)」以及离岸美元流动性！</b>
            </p>
            <p className="text-xs leading-relaxed text-slate-300">
              国际清算银行（BIS，央行的央行）汇聚了全球最权威的跨国金融数据，但长期以来因数据维度极其繁复、专业术语门槛极高，沦为少数专业量化学者的黑箱。本项目旨在构建一个<b>对标 Bloomberg Terminal 与 BlackRock Aladdin 的透明化、可交互、具备自主推演能力的下一代全球资本情报系统</b>。
            </p>
          </div>

          {/* Section 2: Three Academic Pillars (三大核心数据基石) */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">
              <Layers className="w-4 h-4 text-blue-400" />
              2. 国际清算银行的三大底层统计支柱 (Three Methodological Pillars)
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1.5 hover:border-slate-700 transition-colors">
                <div className="text-xs font-bold text-sky-300 flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-sky-400" />
                  LBS 居住地银行统计
                </div>
                <div className="text-[11px] font-mono text-slate-500">Residence Principle · 资金地理血管</div>
                <p className="text-[11px] text-slate-400 leading-normal">
                  记录资金从“哪个地理辖区”流向“哪个国家”。透视离岸中心跨国中继、货币计价敞口（美元主导度）以及非银行机构在金融网络中的崛起。
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1.5 hover:border-slate-700 transition-colors">
                <div className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-emerald-400" />
                  CBS 最终风险穿透原则
                </div>
                <div className="text-[11px] font-mono text-slate-500">Ultimate Risk Basis · 剥离避税壳实体</div>
                <p className="text-[11px] text-slate-400 leading-normal">
                  开创性穿透开曼、卢森堡等避税地的“名义资产”，将母行提供担保的跨国债务还原给真实母国（美、中、德等），揭开真实主权资产负债。
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1.5 hover:border-slate-700 transition-colors">
                <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-amber-400" />
                  巴塞尔协议 EWS 与安全垫
                </div>
                <div className="text-[11px] font-mono text-slate-500">Basel III CCyB &amp; Guidotti Rule · 危机雷达</div>
                <p className="text-[11px] text-slate-400 leading-normal">
                  监测各国信贷/GDP 缺口、逆周期资本缓冲 (CCyB)、偿债比率 (DSR)，以及外汇储备覆盖短期外债倍数，提前 1-2 年预警主权债务挤兑。
                </p>
              </div>
            </div>
          </div>

          {/* Section 3: Target Audiences & Use Cases (能用来做什么) */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              3. 针对不同机构的核心实务价值 (Who It's For &amp; Value)
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-1">
                <span className="text-[11px] font-bold text-indigo-300">🏛️ 中央银行与金融监管局</span>
                <p className="text-[11px] text-slate-400 leading-normal">
                  掌握交叉货币掉期基差 (CIP Basis)、离岸美元荒程度与双边常备互换协议 (Swap Lines) 的救市传导链条。
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-1">
                <span className="text-[11px] font-bold text-sky-300">💼 全球宏观对冲基金与资产配置</span>
                <p className="text-[11px] text-slate-400 leading-normal">
                  在多因素传染模拟器中运行主权违约压力测试，识别日元套息平仓、地缘阵营分裂对跨境资产组合的系统冲击。
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-1">
                <span className="text-[11px] font-bold text-amber-300">🎓 宏观经济学家与高校智库</span>
                <p className="text-[11px] text-slate-400 leading-normal">
                  一键调用实证银行引力模型回归、NetworkX 复杂网络中心度度量，并一键生成可复现的 Python 量化研报包。
                </p>
              </div>
            </div>
          </div>

          {/* Section 4: 1-Minute Quick Navigation (1分钟快速上手指引) */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
            <div className="text-xs font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-yellow-400" />
              1 分钟上手秘籍 (How to Explore)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
              <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800">
                <span className="text-sky-400 font-bold block mb-0.5">① 时间轴穿梭</span>
                <span className="text-[11px] text-slate-400">滑动顶部时间轴，查阅 2018Q1 至 2026Q4 共 36 个季度的演变。</span>
              </div>
              <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800">
                <span className="text-amber-400 font-bold block mb-0.5">② 5 大分析域</span>
                <span className="text-[11px] text-slate-400">顶部可快速切换：网络流向、早期预警、美元格局、主权实证、研报复盘。</span>
              </div>
              <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800">
                <span className="text-emerald-400 font-bold block mb-0.5">③ 宏观 AI 大脑</span>
                <span className="text-[11px] text-slate-400">点击右下角胶囊，自动扫描 2.5σ 异常流向走廊并输出投委会速记。</span>
              </div>
              <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800">
                <span className="text-rose-400 font-bold block mb-0.5">④ 彭博快捷键</span>
                <span className="text-[11px] text-slate-400">按 空格键 播放、方向键 步进、Ctrl+K 全局搜索、? 调出快捷键。</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Bar */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-900/90 flex flex-wrap items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none hover:text-slate-200">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="w-3.5 h-3.5 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-0 cursor-pointer"
            />
            <span>下次进入不再自动弹出 (可随时在顶部点击“平台导读”重新打开)</span>
          </label>

          <button
            onClick={handleClose}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 flex items-center gap-1.5 transition-all hover:scale-[1.02] cursor-pointer"
          >
            <span>进入全景终端探索</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
