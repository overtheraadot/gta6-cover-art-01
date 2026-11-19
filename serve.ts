// A tiny static file server for trying the app locally (Node 22, standard
// library only). Run `node serve.ts` and open http://localhost:8080 — it
// serves app/ and nothing else. A development convenience, not a server for
// the open internet.

import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = resolve(fileURLToPath(new URL('./app', import.meta.url)));

const wantedPort = Number(process.argv[process.argv.indexOf('--port') + 1]);
const port = Number.isInteger(wantedPort) && wantedPort > 0 && wantedPort < 65536 ? wantedPort : 8080;

function mediaType(file: string): string {
  switch (extname(file).toLowerCase()) {
    case '.html': return 'text/html; charset=utf-8';
    case '.css': return 'text/css; charset=utf-8';
    case '.js': case '.mjs': return 'text/javascript; charset=utf-8';
    case '.json': return 'application/json; charset=utf-8';
    case '.png': return 'image/png';
    case '.jpg': case '.jpeg': return 'image/jpeg';
    case '.gif': return 'image/gif';
    case '.webp': return 'image/webp';
    case '.svg': return 'image/svg+xml';
    case '.woff': return 'font/woff';
    case '.woff2': return 'font/woff2';
    case '.ttf': return 'font/ttf';
    case '.otf': return 'font/otf';
    case '.txt': return 'text/plain; charset=utf-8';
    case '.wasm': return 'application/wasm';
    default: return 'application/octet-stream';
  }
}

createServer((request, response) => {
  const rawPath = decodeURIComponent(new URL(request.url ?? '/', 'http://127.0.0.1').pathname);
  const wanted = rawPath.endsWith('/') ? `${rawPath}index.html` : rawPath;
  const target = resolve(join(appRoot, wanted));
  if (target !== appRoot && !target.startsWith(appRoot + sep)) {
    response.writeHead(403).end('forbidden');
    return;
  }
  if (!existsSync(target) || !statSync(target).isFile()) {
    response.writeHead(404).end('not found');
    return;
  }
  response.writeHead(200, { 'content-type': mediaType(target), 'cache-control': 'no-store' });
  createReadStream(target).pipe(response);
}).listen(port, '127.0.0.1', () => {
  console.log(`Vice Sunset Split is on http://localhost:${port}`);
});
