// 本機預覽伺服器：把專案根目錄當成網站，跟 GitHub Pages 一樣直接送出檔案。
// 跟 `python -m http.server` 不同的兩點：
//   1. 每個回應都帶 Cache-Control: no-store，改完程式重新整理就是新版，不會拿到快取的舊 assets/*.js。
//   2. port 可以選：
//        npm.cmd run serve            → 8123；被佔用就往後找空的（8124、8125…），印出實際網址
//        npm.cmd run serve -- 8123    → 一定要 8123，被佔用就直接失敗（.claude/launch.json 用這個，預覽分頁才對得上）
//        npm.cmd run serve -- 0       → 讓系統挑一個空的 port（小幫手同時開預覽時用）
import { createServer } from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DEFAULT_PORT = 8123;
const TRIES = 20;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
};

/** 網址路徑 → 專案裡的檔案；跑出專案資料夾或找不到就回傳 null。資料夾會找裡面的 index.html。 */
function fileFor(urlPath) {
  let path;
  try {
    path = normalize(join(ROOT, decodeURIComponent(urlPath.split('?')[0])));
  } catch {
    return null;
  }
  if (!path.startsWith(ROOT)) return null;
  try {
    let stat = statSync(path);
    if (stat.isDirectory()) {
      path = join(path, 'index.html');
      stat = statSync(path);
    }
    return stat.isFile() ? path : null;
  } catch {
    return null;
  }
}

const server = createServer((req, res) => {
  const file = fileFor(req.url);
  if (!file) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end('404 找不到這個檔案');
    return;
  }
  res.writeHead(200, {
    'Content-Type': TYPES[extname(file).toLowerCase()] || 'application/octet-stream',
    'Cache-Control': 'no-store',
  });
  createReadStream(file).pipe(res);
});

const arg = process.argv[2];
const fixed = arg !== undefined; // 有指定 port（含 0）就不自動往後找
let port = fixed ? Number(arg) : DEFAULT_PORT;
let tries = 0;

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE' && !fixed && ++tries < TRIES) {
    port += 1;
    server.listen(port);
    return;
  }
  console.error(err.code === 'EADDRINUSE' ? `port ${port} 已經被佔用了。` : err.message);
  process.exit(1);
});

server.on('listening', () => {
  const actual = server.address().port;
  console.log(`本機預覽：http://localhost:${actual}/`);
  console.log('按 Ctrl + C 停止。');
});

server.listen(port);
