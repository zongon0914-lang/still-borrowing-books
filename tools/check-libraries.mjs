// 檢查 22 縣市圖書館的借書連結還打得開（npm.cmd run check-online 會順便跑）。
// 連結來源是 tools/raw/county-libraries.json；成績單的「到〇〇圖書館借這本 →」就是這些網址。
//
// 判斷方式：
//   打得開（ok）   ：最後回 2xx（中間轉址沒關係）
//   被擋（warn）   ：回 401、403、429。有些政府網站會擋程式，但人用瀏覽器打得開，所以只警告、不算失敗
//   壞掉（fail）   ：其他狀態碼（例如 404、500）、逾時、連不上。卡住或連不上會先重試一次再下結論
import { readFileSync } from 'node:fs';

const BLOCKED = new Set([401, 403, 429]);
export const TEST_TITLE = '原子習慣';

/** 成績單實際會用的網址：有書名格式就帶入書名，沒有就是館藏查詢頁 */
export function libraryUrl(entry, title = TEST_TITLE) {
  return entry.titleUrl ? entry.titleUrl.replace('{title}', encodeURIComponent(title)) : entry.searchUrl;
}

/** 讀取 tools/raw/county-libraries.json 的 22 筆資料 */
export function loadCounties(file = new URL('./raw/county-libraries.json', import.meta.url)) {
  return JSON.parse(readFileSync(file, 'utf8')).counties;
}

async function checkOne(entry, { timeoutMs, retries, title }) {
  const url = libraryUrl(entry, title);
  let detail;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs), redirect: 'follow' });
      await res.body?.cancel();
      if (res.ok) return { county: entry.county, url, verdict: 'ok', detail: `${res.status}` };
      if (BLOCKED.has(res.status)) return { county: entry.county, url, verdict: 'warn', detail: `${res.status}（網站擋程式，請用瀏覽器打開確認）` };
      return { county: entry.county, url, verdict: 'fail', detail: `${res.status}` };
    } catch (err) {
      detail = err.name === 'TimeoutError' ? `${timeoutMs / 1000} 秒沒有回應` : `連不上（${err.cause?.code ?? err.message}）`;
    }
  }
  return { county: entry.county, url, verdict: 'fail', detail };
}

/**
 * 同時檢查每一筆圖書館連結。
 * @returns {Promise<{county: string, url: string, verdict: 'ok'|'warn'|'fail', detail: string}[]>}
 */
export function checkLibraryLinks(counties, { timeoutMs = 20000, retries = 1, title = TEST_TITLE } = {}) {
  return Promise.all(counties.map((entry) => checkOne(entry, { timeoutMs, retries, title })));
}

/** 印出結果；回傳 true 代表沒有壞掉的連結（被擋的只警告） */
export function report(results, log = console.log) {
  const ok = results.filter((r) => r.verdict === 'ok');
  const warn = results.filter((r) => r.verdict === 'warn');
  const fail = results.filter((r) => r.verdict === 'fail');
  log(`圖書館借書連結：${results.length} 個裡面 ${ok.length} 個打得開、${warn.length} 個被擋（只警告）、${fail.length} 個壞掉`);
  for (const r of warn) log(`  ⚠ ${r.county}：${r.detail}\n    ${r.url}`);
  for (const r of fail) log(`  ✖ ${r.county}：${r.detail}\n    ${r.url}`);
  if (fail.length) log('  壞掉的連結：用瀏覽器打開確認；真的壞了就改 tools/raw/county-libraries.json，再跑 npm.cmd run build-data。');
  return fail.length === 0;
}
