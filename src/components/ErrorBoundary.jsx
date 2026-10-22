import React from 'react';
import { AlertOctagon, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="glass-panel rounded-2xl p-6 border border-rose-500/40 bg-slate-900/90 shadow-2xl my-4 text-slate-200">
          <div className="flex items-center gap-3 border-b border-rose-500/30 pb-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
              <AlertOctagon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                组件渲染发生异常 (Component Render Error)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {this.props.fallbackTitle || '当前分析模块遇到非预期数据格式或图表渲染异常，已启动沙盒隔离保护'}
              </p>
            </div>
          </div>

          <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 font-mono text-xs text-rose-300 overflow-x-auto mb-4">
            <div className="font-bold mb-1">错误信息:</div>
            <div>{this.state.error?.toString()}</div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={this.handleReload}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-md"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>重新尝试挂载</span>
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-semibold transition-all cursor-pointer"
            >
              刷新整个工作台
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
