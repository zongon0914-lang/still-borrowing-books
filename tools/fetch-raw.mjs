// 從「公共圖書館統計」API 下載 2014–2025 每一年的原始資料到 tools/raw/。
// 只有要更新原始資料時才需要跑：npm.cmd run fetch-raw
// 下載完記得再跑 npm.cmd run build-data。
import { writeFileSync } from 'node:fs';
import { FIRST_YEAR, LAST_YEAR } from './clean-data.mjs';

const API = 'https://publibstat.nlpi.edu.tw/api/API/ConsolidationData?Year=';

for (let year = FIRST_YEAR; year <= LAST_YEAR; year++) {
  const res = await fetch(API + year);
  if (!res.ok) throw new Error(`${year} 下載失敗：HTTP ${res.status}`);
  const rows = await res.json();
  if (!Array.isArray(rows)) throw new Error(`${year} 回傳的不是資料表：${JSON.stringify(rows)}`);
  writeFileSync(new URL(`./raw/${year}.json`, import.meta.url), JSON.stringify(rows), 'utf8');
  console.log(`${year}：${rows.length} 列`);
}
