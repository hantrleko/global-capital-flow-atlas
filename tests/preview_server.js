import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIST_DIR = path.resolve(__dirname, '../dist');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml'
};

export function createPreviewServer(port = 4173) {
  return http.createServer((req, res) => {
    let cleanUrl = (req.url || '/').split('?')[0];

    // Handle trailing slash redirect for subpath
    if (cleanUrl === '/global-capital-flow-atlas') {
      res.writeHead(301, { Location: '/global-capital-flow-atlas/' });
      res.end();
      return;
    }

    // Strip subpath prefix
    if (cleanUrl.startsWith('/global-capital-flow-atlas/')) {
      cleanUrl = cleanUrl.slice('/global-capital-flow-atlas'.length);
    }

    if (cleanUrl === '/' || cleanUrl === '') {
      cleanUrl = '/index.html';
    }

    const filePath = path.join(DIST_DIR, cleanUrl);

    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath);
      res.writeHead(200, {
        'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
        'Cache-Control': 'no-cache'
      });
      fs.createReadStream(filePath).pipe(res);
    } else {
      // SPA Fallback for HTML
      const indexPath = path.join(DIST_DIR, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.writeHead(200, {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-cache'
        });
        fs.createReadStream(indexPath).pipe(res);
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
      }
    }
  });
}

// Standalone execution
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT) || 4173;
  const server = createPreviewServer(port);
  server.listen(port, () => {
    console.log(`✓ Atlas Preview Server running on http://localhost:${port}/ and http://localhost:${port}/global-capital-flow-atlas/`);
  });
}
