// 資料整理模組：把「公共圖書館統計」開放資料整理成網站用的乾淨數據。
// 只在開發時執行；網站本身不即時抓 API。
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const FIRST_YEAR = 2014;
export const LAST_YEAR = 2025;

const RAW_DIR = fileURLToPath(new URL('./raw/', import.meta.url));

/** 讀取 tools/raw/ 裡每一年的原始 JSON，回傳 { 年份: 原始列陣列 } */
export function loadRaw(dir = RAW_DIR) {
  const raw = {};
  for (let year = FIRST_YEAR; year <= LAST_YEAR; year++) {
    raw[year] = JSON.parse(readFileSync(`${dir}${year}.json`, 'utf8'));
  }
  return raw;
}

/** 原始資料的數字是 "64,865,830" 這種字串 */
function toNumber(text) {
  const n = Number(String(text).replaceAll(',', ''));
  if (!Number.isFinite(n)) throw new Error(`不是數字：${text}`);
  return n;
}

/** 原始列的「縣市別」長這樣：「2025-全國」「2025-新北市(不含國立館)」 */
function areaName(row) {
  return row['縣市別'].replace(/^\d{4}-/, '');
}

function pickRow(rows, name, year) {
  const row = rows.find((r) => areaName(r) === name);
  if (!row) throw new Error(`${year} 年找不到「${name}」`);
  return row;
}

export function buildCleanData(rawByYear) {
  const national = Object.keys(rawByYear)
    .map(Number)
    .sort((a, b) => a - b)
    .map((year) => {
      const row = pickRow(rawByYear[year], '全國', year);
      return {
        year,
        printLoans: toNumber(row['全年圖書資訊借閱冊數']),
        printVisits: toNumber(row['全年圖書資訊借閱人次']),
        ebookLoans: toNumber(row['年度電子書刊借閱冊數']),
        population: toNumber(row['服務轄區人口數']),
      };
    });

  return { national };
}
