// 簡單的站內爬蟲：讀 HTML、找出 href / src，跟著站內連結走。
// 網址參數（?county=…）和錨點（#…）會先拿掉，只檢查檔案存不存在。
// 「怎麼讀檔」由 reader 決定：localSite 讀本機資料夾，onlineSite 讀上線的網站。
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = fileURLToPath(new URL('../', import.meta.url));

function localTargets(html) {
  const refs = [...html.matchAll(/\b(?:href|src)="([^"]+)"/g)].map((m) => m[1]);
  return refs
    .filter((r) => !/^(https?:|mailto:|tel:|#|data:|javascript:)/.test(r))
    .map((r) => r.split(/[?#]/)[0])
    .filter(Boolean);
}

/**
 * 讀本機資料夾，規則比照 GitHub Pages：
 * - 檔名大小寫要完全一致才算存在（Windows 不分大小寫，但 GitHub Pages 分）
 * - 連到資料夾時，讀資料夾裡的 index.html
 * @returns {(file: string) => Promise<string | null>} 找不到檔案時回傳 null
 */
export function localSite(root = ROOT) {
  return async (file) => {
    let dir = root;
    for (const part of file.split('/').filter(Boolean)) {
      let names;
      try {
        names = readdirSync(dir);
      } catch {
        return null;
      }
      if (!names.includes(part)) return null;
      dir = path.join(dir, part);
    }
    try {
      return readFileSync(dir, 'utf8');
    } catch {
      // 是資料夾：比照 GitHub Pages 改讀 index.html（大小寫一樣要一致）
      return readdirSync(dir).includes('index.html') ? readFileSync(path.join(dir, 'index.html'), 'utf8') : null;
    }
  };
}

/**
 * 讀上線的網站：每個檔案都要回應 200 才算存在；連不上也算不存在。
 * 只有網頁會下載內容，圖片、樣式等只問「在不在」。
 * @param {string} baseUrl 作品連結，例如 https://帳號.github.io/still-borrowing-books/
 */
export function onlineSite(baseUrl) {
  const base = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  return async (file) => {
    const isPage = file.endsWith('.html') || file.endsWith('/');
    try {
      const res = await fetch(new URL(file, base), { method: isPage ? 'GET' : 'HEAD' });
      if (!res.ok) return null;
      return isPage ? res.text() : '';
    } catch {
      return null;
    }
  };
}

/**
 * @param {string} start 起點頁，例如 'index.html'
 * @param {(file: string) => Promise<string | null>} read
 * @returns {Promise<{ pages: Map<string, string[]>, html: Map<string, string>, broken: string[] }>}
 *   pages：每個 HTML 頁面 → 它連出去的站內檔案
 *   broken：「來源頁 → 目標」形式的壞連結清單
 */
export async function crawlSite(start, read = localSite()) {
  const pages = new Map();
  const html = new Map();
  const checked = new Map(); // 檔案 → 存不存在，每個檔案只讀一次
  const broken = [];
  const queue = [start];

  // 讀一次並記下結果；讀到的是網頁就順便留下內容，之後要從裡面找連結
  const reachable = async (file) => {
    if (!checked.has(file)) {
      const text = await read(file);
      checked.set(file, text !== null);
      if (text !== null && file.endsWith('.html')) html.set(file, text);
    }
    return checked.get(file);
  };

  if (!(await reachable(start))) return { pages, html, broken: [`（起點）→ ${start}`] };

  while (queue.length) {
    const page = queue.shift();
    if (pages.has(page)) continue;
    const dir = path.posix.dirname(page);
    const targets = localTargets(html.get(page)).map((t) => path.posix.normalize(path.posix.join(dir, t)));
    pages.set(page, targets);

    for (const target of targets) {
      if (!(await reachable(target))) broken.push(`${page} → ${target}`);
      else if (target.endsWith('.html') && !pages.has(target)) queue.push(target);
    }
  }
  return { pages, html, broken: [...new Set(broken)] };
}
