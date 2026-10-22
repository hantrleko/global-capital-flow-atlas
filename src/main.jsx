import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';

// Global error catcher to eliminate silent black screens
window.addEventListener('error', (event) => {
  console.error('[Global Uncaught Error]', event.error || event.message);
  const rootEl = document.getElementById('root');
  if (rootEl && rootEl.children.length === 0) {
    rootEl.innerHTML = `
      <div style="min-height: 100vh; background: #0a0e17; color: #f87171; display: flex; flex-direction: column; align-items: center; justify-content: center; font-family: sans-serif; padding: 20px; text-align: center;">
        <h2 style="font-size: 1.25rem; font-weight: bold; margin-bottom: 8px;">系统启动异常 (Startup Initialization Error)</h2>
        <p style="color: #94a3b8; font-size: 0.875rem; max-width: 600px; margin-bottom: 16px;">${event.message || '未知脚本错误'}</p>
        <button onclick="window.location.reload()" style="background: #2563eb; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 0.875rem;">重新加载工作台</button>
      </div>
    `;
  }
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary fallbackTitle="全球资本流动图谱工作台根实例">
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
