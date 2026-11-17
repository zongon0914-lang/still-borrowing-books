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

/**
 * 縣市名稱一律寫「台」（GLOSSARY.md「台（用字）」）：政府資料寫「臺北市」，網站寫「台北市」。
 * 只用在縣市名稱；圖書館、書、報告的正式名稱照原文，不經過這裡。
 */
export const countyName = (name) => name.replace(/臺/g, '台');

/** 原始列的「縣市別」長這樣：「2025-全國」「2025-新北市(不含國立館)」，回傳時縣市名稱已轉成「台」 */
function areaName(row) {
  return countyName(row['縣市別'].replace(/^\d{4}-/, ''));
}

function pickRow(rows, name, year) {
  const row = rows.find((r) => areaName(r) === name);
  if (!row) throw new Error(`${year} 年找不到「${name}」`);
  return row;
}

/** 網站列出的 22 縣市（由北到南、本島到離島） */
export const COUNTIES = [
  '基隆市', '台北市', '新北市', '桃園市', '新竹市', '新竹縣', '苗栗縣', '台中市',
  '彰化縣', '南投縣', '雲林縣', '嘉義市', '嘉義縣', '台南市', '高雄市', '屏東縣',
  '宜蘭縣', '花蓮縣', '台東縣', '澎湖縣', '金門縣', '連江縣',
];

/** 這三個縣市的原始資料把轄區內的國立館算進去，人均借閱一律改用「不含國立館」那一列 */
export const EXCLUDE_NATIONAL_LIBRARY = ['新北市', '台中市', '南投縣'];

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

// ---------- 借書成績單：台北各年齡層人口（同齡人人均借閱） ----------

const POPULATION_RAW_FILE = fileURLToPath(new URL('./raw/taipei-pop-2024.json', import.meta.url));

/** 讀取 tools/fetch-population.mjs 產生的臺北市每一歲人口 */
export function loadPopulationRaw(file = POPULATION_RAW_FILE) {
  return JSON.parse(readFileSync(file, 'utf8'));
}

/** 北市圖的年齡層「18-24」「65+」→ 包含哪些歲（「100+」算在 65+ 裡） */
function agesIn(group, ages) {
  const [from, to] = group.endsWith('+') ? [Number(group.slice(0, -1)), Infinity] : group.split('-').map(Number);
  return ages.filter((a) => {
    const n = Number(a.replace('+', ''));
    return n >= from && n <= to;
  });
}

/**
 * 把台北每一歲人口依北市圖年齡層加總，給每個年齡層加上 population 和 perCapita（借閱冊數 ÷ 人口）。
 * 核對：每一歲都剛好落在一個年齡層，各歲加起來等於各里「人口數合計」的加總。
 */
export function addPopulation(age, pop) {
  if (pop.year !== age.year) throw new Error(`人口是 ${pop.year} 年、借閱是 ${age.year} 年，年份要一樣`);
  const byAge = new Map(pop.ages.map((a, i) => [a, pop.male[i] + pop.female[i]]));
  const used = age.groups.flatMap((g) => agesIn(g.age, pop.ages));
  if (used.length !== pop.ages.length || new Set(used).size !== used.length) {
    throw new Error('年齡層沒有剛好涵蓋每一歲（有漏掉或重複）');
  }
  const total = sum([...byAge.values()]);
  if (total !== pop.total) throw new Error(`各歲人口加起來是 ${total}，各里合計是 ${pop.total}，請重新下載`);

  return {
    ...age,
    population: { source: pop.source, year: pop.year, city: countyName(pop.city), total },
    groups: age.groups.map((g) => {
      const population = sum(agesIn(g.age, pop.ages).map((a) => byAge.get(a)));
      return { ...g, population, perCapita: g.all.loans / population };
    }),
  };
}

// ---------- 類別細節頁：各類熱門書單 ----------

const BOOKS_RAW_FILE = fileURLToPath(new URL('./raw/ncl-books-2024.json', import.meta.url));
const BOOKS_PER_CATEGORY = 10;

/** 讀取人工抄寫的國圖各類別借閱排行 */
export function loadBooksRaw(file = BOOKS_RAW_FILE) {
  return JSON.parse(readFileSync(file, 'utf8'));
}

/**
 * 核對書單抄寫，並整理成跟年齡表同樣的類別順序。
 * @param {object} raw tools/raw/ncl-books-2024.json
 * @param {string[]} categories 北市圖年齡表的類別名稱（章節三用的就是這一組）
 */
export function buildBooksData(raw, categories) {
  const ranks = Array.from({ length: BOOKS_PER_CATEGORY }, (_, i) => i + 1);
  const result = categories.map((name) => {
    const c = raw.categories.find((x) => x.name === name);
    if (!c) throw new Error(`書單少了「${name}」這一類，章節三的連結會點不到`);
    if (c.books.map((b) => b.rank).join() !== ranks.join()) {
      throw new Error(`「${name}」的名次應該是 1 到 ${BOOKS_PER_CATEGORY}，現在是 ${c.books.map((b) => b.rank).join('、')}`);
    }
    for (const b of c.books) {
      if (!b.title?.trim()) throw new Error(`「${name}」第 ${b.rank} 名沒有書名`);
      if (!b.author?.trim()) throw new Error(`「${name}」第 ${b.rank} 名沒有作者`);
    }
    return c;
  });
  const extra = raw.categories.filter((c) => !categories.includes(c.name)).map((c) => c.name);
  if (extra.length) throw new Error(`書單有年齡表沒有的類別：${extra.join('、')}`);

  return {
    year: raw.year,
    rocYear: raw.rocYear,
    source: raw.source,
    taipeiSource: raw.taipeiSource,
    categories: result,
  };
}

// ---------- 借書成績單：各縣市圖書館借書連結 ----------

const LIBRARIES_RAW_FILE = fileURLToPath(new URL('./raw/county-libraries.json', import.meta.url));

/** 讀取人工整理的 22 縣市圖書館館藏查詢網址 */
export function loadLibrariesRaw(file = LIBRARIES_RAW_FILE) {
  return JSON.parse(readFileSync(file, 'utf8'));
}

/**
 * 核對 22 縣市都剛好一筆、名稱照網站的縣市寫法、網址都是 https，
 * 而且每一筆只有「書名網址格式（含一個 {title}）」或「館藏查詢頁」其中一種。
 */
export function buildLibrariesData(raw) {
  const counties = COUNTIES.map((county) => {
    const rows = raw.counties.filter((r) => countyName(r.county) === county);
    if (rows.length !== 1) throw new Error(`「${county}」的圖書館應該剛好一筆，現在有 ${rows.length} 筆`);
    const { name, titleUrl, searchUrl } = rows[0];
    if (!name?.trim()) throw new Error(`「${county}」沒有圖書館名稱`);
    if (Boolean(titleUrl) === Boolean(searchUrl)) throw new Error(`「${county}」要有 titleUrl 或 searchUrl 其中一個`);
    const url = titleUrl || searchUrl;
    if (!url.startsWith('https://')) throw new Error(`「${county}」的網址不是 https：${url}`);
    if (titleUrl && titleUrl.split('{title}').length !== 2) throw new Error(`「${county}」的 titleUrl 要剛好有一個 {title}`);
    if (searchUrl?.includes('{title}')) throw new Error(`「${county}」的 searchUrl 不該有 {title}`);
    return titleUrl ? { county, name, titleUrl } : { county, name, searchUrl };
  });
  const extra = raw.counties.filter((r) => !COUNTIES.includes(countyName(r.county))).map((r) => r.county);
  if (extra.length) throw new Error(`圖書館資料有網站沒有的縣市：${extra.join('、')}`);
  return { source: raw.source, counties };
}

/** 網站用的全部乾淨數據：全國、縣市、年齡（含台北各年齡層人口）、書單、各縣市圖書館借書連結 */
export function buildSiteData() {
  const age = addPopulation(buildAgeData(loadAgeRaw()), loadPopulationRaw());
  return {
    ...buildCleanData(loadRaw()),
    age,
    books: buildBooksData(loadBooksRaw(), age.categories),
    libraries: buildLibrariesData(loadLibrariesRaw()),
  };
}
