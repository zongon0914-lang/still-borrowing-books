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

/** 網站列出的 22 縣市（由北到南、本島到離島） */
export const COUNTIES = [
  '基隆市', '臺北市', '新北市', '桃園市', '新竹市', '新竹縣', '苗栗縣', '臺中市',
  '彰化縣', '南投縣', '雲林縣', '嘉義市', '嘉義縣', '臺南市', '高雄市', '屏東縣',
  '宜蘭縣', '花蓮縣', '臺東縣', '澎湖縣', '金門縣', '連江縣',
];

/** 這三個縣市的原始資料把轄區內的國立館算進去，人均借閱一律改用「不含國立館」那一列 */
export const EXCLUDE_NATIONAL_LIBRARY = ['新北市', '臺中市', '南投縣'];

export function buildCleanData(rawByYear) {
  const years = Object.keys(rawByYear)
    .map(Number)
    .sort((a, b) => a - b);

  const national = years.map((year) => {
    const row = pickRow(rawByYear[year], '全國', year);
    const printLoans = toNumber(row['全年圖書資訊借閱冊數']);
    const population = toNumber(row['服務轄區人口數']);
    return {
      year,
      printLoans,
      printVisits: toNumber(row['全年圖書資訊借閱人次']),
      ebookLoans: toNumber(row['年度電子書刊借閱冊數']),
      population,
      printPerCapita: printLoans / population, // 人均借閱 = 紙本借閱冊數 ÷ 服務轄區人口
    };
  });

  const counties = COUNTIES.map((name) => {
    const excludesNationalLibrary = EXCLUDE_NATIONAL_LIBRARY.includes(name);
    const rowName = excludesNationalLibrary ? `${name}(不含國立館)` : name;
    return {
      name,
      excludesNationalLibrary,
      years: years.map((year) => {
        const row = pickRow(rawByYear[year], rowName, year);
        const printLoans = toNumber(row['全年圖書資訊借閱冊數']);
        const population = toNumber(row['服務轄區人口數']);
        return { year, printLoans, population, perCapita: printLoans / population };
      }),
    };
  });

  return { national, counties };
}
