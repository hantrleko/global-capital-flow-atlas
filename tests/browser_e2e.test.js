/**
 * Real Browser E2E Test Suite for Global Capital Flow Atlas
 * Uses native Chrome/Edge headless automation via Chrome DevTools Protocol (CDP) WebSocket.
 * Validates:
 * 1. 1280px viewport navigation width and layout
 * 2. EWS Scatter chart canvas rendering on initial mount
 * 3. EWS Scatter chart unmount when switching to Matrix subtab
 * 4. EWS Scatter chart remount (canvas re-initialization with no empty void)
 * 5. EWS Heatmap canvas mounting and rendering
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIST_DIR = path.resolve(__dirname, '../dist');

// Find browser binary (Edge or Chrome on Windows/Linux)
const POTENTIAL_BROWSERS = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium',
  process.env.CHROME_BIN,
  process.env.EDGE_BIN
].filter(Boolean);

let browserPath = null;
for (const p of POTENTIAL_BROWSERS) {
  if (fs.existsSync(p)) {
    browserPath = p;
    break;
  }
}

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml'
};

function startStaticServer(port = 4173) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let reqPath = req.url.split('?')[0];
      if (reqPath.startsWith('/global-capital-flow-atlas/')) {
        reqPath = reqPath.replace('/global-capital-flow-atlas/', '/');
      }
      if (reqPath === '/' || reqPath === '') reqPath = '/index.html';

      const filePath = path.join(DIST_DIR, reqPath);
      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath);
        res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
        fs.createReadStream(filePath).pipe(res);
      } else {
        const indexPath = path.join(DIST_DIR, 'index.html');
        res.writeHead(200, { 'Content-Type': 'text/html' });
        fs.createReadStream(indexPath).pipe(res);
      }
    });

    server.listen(port, () => {
      resolve(server);
    });
  });
}

async function runBrowserE2E() {
  console.log('\n===============================================================');
  console.log('🌐 RUNNING REAL BROWSER E2E TEST (HEADLESS CHROMIUM)');
  console.log('===============================================================');

  if (!fs.existsSync(path.join(DIST_DIR, 'index.html'))) {
    console.error('❌ dist/index.html not found! Please run npm run build first.');
    process.exit(1);
  }

  if (!browserPath) {
    console.warn('⚠️ No local Edge/Chrome browser executable found. Skipping real browser E2E.');
    process.exit(0);
  }

  console.log(`✓ Browser detected: ${browserPath}`);
  const port = 4173;
  const server = await startStaticServer(port);
  console.log(`✓ Ephemeral static server listening on http://localhost:${port}/`);

  const debuggingPort = 9222;
  const browserProc = spawn(browserPath, [
    '--headless=new',
    `--remote-debugging-port=${debuggingPort}`,
    '--window-size=1280,800',
    '--disable-gpu',
    '--disable-extensions',
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--no-first-run',
    '--no-default-browser-check',
    '--user-data-dir=' + path.resolve(__dirname, '../.tmp-browser-profile'),
    `http://localhost:${port}/`
  ]);

  const cleanup = () => {
    try { browserProc.kill(); } catch {}
    try { server.close(); } catch {}
  };

  process.on('exit', cleanup);
  process.on('SIGINT', cleanup);

  // Poll for CDP endpoint
  let wsUrl = null;
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 300));
    try {
      const res = await fetch(`http://127.0.0.1:${debuggingPort}/json/list`);
      const list = await res.json();
      if (list && list.length > 0 && list[0].webSocketDebuggerUrl) {
        wsUrl = list[0].webSocketDebuggerUrl;
        break;
      }
    } catch {}
  }

  if (!wsUrl) {
    console.error('❌ Failed to connect to browser CDP port 9222');
    cleanup();
    process.exit(1);
  }

  console.log('✓ Connected to Browser via Chrome DevTools Protocol (CDP)');

  const ws = new WebSocket(wsUrl);
  let msgId = 1;
  const pendingRequests = new Map();

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.method === 'Runtime.consoleAPICalled') {
      const text = data.params.args.map(a => a.value || a.description).join(' ');
      console.log(`[Browser Console ${data.params.type}]`, text);
    }
    if (data.method === 'Runtime.exceptionThrown') {
      console.error('[Browser Exception]', data.params.exceptionDetails);
    }
    if (data.id && pendingRequests.has(data.id)) {
      const { resolve, reject } = pendingRequests.get(data.id);
      pendingRequests.delete(data.id);
      if (data.error) reject(data.error);
      else resolve(data.result);
    }
  };

  if (ws.readyState !== 1 /* WebSocket.OPEN */) {
    await new Promise((resolve) => {
      ws.addEventListener('open', resolve, { once: true });
    });
  }

  function sendCommand(method, params = {}, timeoutMs = 8000) {
    return new Promise((resolve, reject) => {
      const id = msgId++;
      const timer = setTimeout(() => {
        pendingRequests.delete(id);
        reject(new Error(`CDP command ${method} timed out after ${timeoutMs}ms`));
      }, timeoutMs);
      pendingRequests.set(id, {
        resolve: (val) => { clearTimeout(timer); resolve(val); },
        reject: (err) => { clearTimeout(timer); reject(err); }
      });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async function evalExpression(expr) {
    const res = await sendCommand('Runtime.evaluate', {
      expression: expr,
      returnByValue: true
    });
    return res.result?.value;
  }

  try {
    await sendCommand('Runtime.enable');
    await sendCommand('Page.enable');

    // Explicitly navigate the page under CDP control
    await sendCommand('Page.navigate', { url: `http://localhost:${port}/` });

    // Wait for page to finish loading and React hydration
    await new Promise((r) => setTimeout(r, 3000));

    // Assertion 1: App mounted and root element active
    const isAppMounted = await evalExpression(`Boolean(document.getElementById('root') && document.getElementById('main-viewport'))`);
    if (!isAppMounted) throw new Error('React app failed to mount root or main-viewport');
    console.log('  ✓ React SPA mounted successfully with main viewport');

    // Assertion 2: Verify 1280px module bar layout width
    const navDimensions = await evalExpression(`(() => {
      const el = document.querySelector('nav .overflow-x-auto');
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      return { width: Math.round(rect.width), scrollWidth: el.scrollWidth };
    })()`);
    console.log(`  ✓ 1280px Viewport Module Bar Width: ${navDimensions?.width}px (scrollWidth: ${navDimensions?.scrollWidth}px)`);
    if (!navDimensions || navDimensions.width < 500) {
      throw new Error(`Module bar is too narrow (<500px, got ${navDimensions?.width}px)`);
    }

    // Assertion 3: Switch to Vulnerability Domain and EWS Tab
    console.log('\nTesting EWS Tab and Chart Unmount/Remount Lifecycle in Real DOM:');
    await evalExpression(`(() => {
      const domBtns = Array.from(document.querySelectorAll('button'));
      const vulnDom = domBtns.find(b => b.textContent.includes('早期预警与传染'));
      if (vulnDom) vulnDom.click();
    })()`);
    await new Promise((r) => setTimeout(r, 600));

    await evalExpression(`(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const ewsBtn = buttons.find(b => b.textContent.includes('巴塞尔早期预警') || b.textContent.includes('EWS'));
      if (ewsBtn) ewsBtn.click();
    })()`);
    await new Promise((r) => setTimeout(r, 2000));

    // Assertion 4: Click Quadrant Scatter Subtab
    await evalExpression(`(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const quadBtn = buttons.find(b => b.textContent.includes('双维象限散点图') || b.textContent.includes('Gap vs DSR'));
      if (quadBtn) quadBtn.click();
    })()`);
    await new Promise((r) => setTimeout(r, 1500));

    const scatterCanvasCount1 = await evalExpression(`document.querySelectorAll('canvas').length`);
    console.log(`  ✓ Initial Quadrant Scatter canvas count: ${scatterCanvasCount1}`);
    if (!scatterCanvasCount1 || scatterCanvasCount1 < 1) throw new Error('Scatter chart canvas failed to render on initial quadrant subtab mount');

    // Assertion 5: Click Matrix Subtab (Unmounting Quadrant DOM)
    await evalExpression(`(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const matrixBtn = buttons.find(b => b.textContent.includes('早期预警矩阵清单'));
      if (matrixBtn) matrixBtn.click();
    })()`);
    await new Promise((r) => setTimeout(r, 1000));

    const matrixTableFound = await evalExpression(`Boolean(document.querySelector('table'))`);
    const scatterCanvasCountAfterUnmount = await evalExpression(`document.querySelectorAll('canvas').length`);
    console.log(`  ✓ Switched to Matrix: Table present (${matrixTableFound}), old scatter canvas unmounted (${scatterCanvasCountAfterUnmount === 0})`);
    if (!matrixTableFound || scatterCanvasCountAfterUnmount !== 0) {
      throw new Error('Matrix table not mounted or old scatter canvas not cleanly unmounted');
    }

    // Assertion 6: Click Quadrant Scatter Subtab AGAIN (Round-trip verification)
    await evalExpression(`(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const quadBtn = buttons.find(b => b.textContent.includes('双维象限散点图') || b.textContent.includes('Gap vs DSR'));
      if (quadBtn) quadBtn.click();
    })()`);
    await new Promise((r) => setTimeout(r, 1500));

    const scatterCanvasCount2 = await evalExpression(`document.querySelectorAll('canvas').length`);
    const canvasDimensions = await evalExpression(`(() => {
      const cv = document.querySelector('canvas');
      return cv ? { width: cv.width, height: cv.height } : null;
    })()`);
    console.log(`  ✓ Round-trip Quadrant Scatter remounted canvas count: ${scatterCanvasCount2} (${canvasDimensions?.width}x${canvasDimensions?.height}px)`);
    if (!scatterCanvasCount2 || scatterCanvasCount2 < 1 || !canvasDimensions || canvasDimensions.width === 0 || canvasDimensions.height === 0) {
      throw new Error('Scatter chart canvas failed to re-initialize on remount (black/blank screen bug reproduced)');
    }

    // Assertion 7: Click 28-Quarter History Heatmap Subtab
    await evalExpression(`(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const heatmapBtn = buttons.find(b => b.textContent.includes('历史演化热力图'));
      if (heatmapBtn) heatmapBtn.click();
    })()`);
    await new Promise((r) => setTimeout(r, 1500));

    const heatmapCanvasCount = await evalExpression(`document.querySelectorAll('canvas').length`);
    console.log(`  ✓ History Heatmap canvas count: ${heatmapCanvasCount}`);
    if (!heatmapCanvasCount || heatmapCanvasCount < 1) throw new Error('Heatmap chart canvas failed to render');

    console.log('\n===============================================================');
    console.log('✅ ALL REAL BROWSER E2E TESTS PASSED (0 REGRESSIONS DETECTED)');
    console.log('===============================================================\n');
  } catch (err) {
    console.error('\n❌ REAL BROWSER E2E TEST FAILED:', err.message);
    cleanup();
    process.exit(1);
  } finally {
    try { ws.close(); } catch {}
    cleanup();
  }
}

runBrowserE2E();
