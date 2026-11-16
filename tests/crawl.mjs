// 簡單的站內爬蟲：讀 HTML 檔、找出 href / src，跟著站內連結走。
// 網址參數（?county=…）和錨點（#…）會先拿掉，只檢查檔案存不存在。
import { readFileSync, existsSync } from 'node:fs';
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
 * @returns {{ pages: Map<string, string[]>, html: Map<string, string>, broken: string[] }}
 *   pages：每個 HTML 頁面 → 它連出去的站內檔案
 *   broken：「來源頁 → 目標」形式的壞連結清單
 */
export function crawlSite(start) {
  const pages = new Map();
  const html = new Map();
  const broken = [];
  const queue = [start];

  while (queue.length) {
    const page = queue.shift();
    if (pages.has(page)) continue;
    const text = readFileSync(path.join(ROOT, page), 'utf8');
    const dir = path.posix.dirname(page);
    const targets = localTargets(text).map((t) => path.posix.normalize(path.posix.join(dir, t)));
    pages.set(page, targets);
    html.set(page, text);

    for (const target of targets) {
      if (!existsSync(path.join(ROOT, target))) broken.push(`${page} → ${target}`);
      else if (target.endsWith('.html') && !pages.has(target)) queue.push(target);
    }
  }
  return { pages, html, broken: [...new Set(broken)] };
}
