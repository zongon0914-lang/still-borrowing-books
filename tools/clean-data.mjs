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

// ---------- 章節三：台北市各年齡層借閱類別 ----------

const AGE_RAW_FILE = fileURLToPath(new URL('./raw/tpml-age-2024.json', import.meta.url));

/** 讀取人工抄寫的北市圖年齡 × 性別 × 類別表 */
export function loadAgeRaw(file = AGE_RAW_FILE) {
  return JSON.parse(readFileSync(file, 'utf8'));
}

const sum = (ns) => ns.reduce((a, b) => a + b, 0);

/** 比對兩組數字，不一樣就丟出錯誤，訊息說明是哪一格 */
function expectSame(actual, expected, where) {
  actual.forEach((n, i) => {
    if (n !== expected[i]) throw new Error(`${where}第 ${i + 1} 欄對不上：算出 ${n}，原表寫 ${expected[i]}，請回頭核對抄寫`);
  });
}

/**
 * 整理成網站用的形狀，順便用原表的小計、總計核對每一格有沒有抄錯。
 * 每個年齡層有 all（不分性別）、female、male 三組，每組都是 { loans, categories: [{ name, loans, share }] }。
 */
export function buildAgeData(raw) {
  const { categories, rows } = raw;
  const ages = [...new Set(rows.map((r) => r.age))];

  // 核對一：每一列加起來等於原表的「小計」欄
  for (const r of rows) {
    if (r.counts.length !== categories.length) throw new Error(`${r.sex} ${r.age} 歲應該有 ${categories.length} 格`);
    if (sum(r.counts) !== r.subtotal) {
      throw new Error(`${r.sex} ${r.age} 歲這一列加起來是 ${sum(r.counts)}，原表小計是 ${r.subtotal}，請回頭核對抄寫`);
    }
  }
  // 核對二：每個性別的各年齡層加起來等於原表該性別的「小計」列
  const columnSums = (rs) => [...categories.map((_, i) => sum(rs.map((r) => r.counts[i]))), sum(rs.map((r) => r.subtotal))];
  for (const sex of ['女', '男']) {
    expectSame(columnSums(rows.filter((r) => r.sex === sex)), raw.sexSubtotals[sex], `${sex}性小計`);
  }
  // 核對三：兩個性別加起來等於原表的「類別總計」列
  expectSame(columnSums(rows), raw.grandTotal, '類別總計');

  const summarize = (rs) => {
    const loans = sum(rs.map((r) => r.subtotal));
    return {
      loans,
      categories: categories.map((name, i) => {
        const n = sum(rs.map((r) => r.counts[i]));
        return { name, loans: n, share: n / loans };
      }),
    };
  };

  return {
    year: raw.year,
    rocYear: raw.rocYear,
    source: raw.source,
    categories,
    youngGroup: '18-24', // 年輕世代
    totalLoans: raw.grandTotal[categories.length],
    overall: summarize(rows),
    groups: ages.map((age) => {
      const rs = rows.filter((r) => r.age === age);
      return {
        age,
        all: summarize(rs),
        female: summarize(rs.filter((r) => r.sex === '女')),
        male: summarize(rs.filter((r) => r.sex === '男')),
      };
    }),
  };
}

/** 網站用的全部乾淨數據：全國、縣市、年齡 */
export function buildSiteData() {
  return { ...buildCleanData(loadRaw()), age: buildAgeData(loadAgeRaw()) };
}
