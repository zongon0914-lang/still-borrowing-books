// 檢查點一・數據對不對
// 期望值來自規格書（docs/spec.md）和人工核對過的事實，不是用程式重算出來的。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadRaw, buildCleanData, buildSiteData } from '../tools/clean-data.mjs';

const data = buildCleanData(loadRaw());

test('全國資料涵蓋 2014–2025 每一年', () => {
  assert.deepEqual(
    data.national.map((r) => r.year),
    [2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025],
  );
});

// 注意：規格書原本寫「2014–2025 最低的是 2021 年」，但實際數據中 2014 年（約 6,487 萬冊）
// 比 2021 年（約 7,125 萬冊）還低。疫情谷底的正確說法是「唯一一次大跌」，所以這裡改驗證這件事。
const byYear = (year) => data.national.find((r) => r.year === year);
const change = (year) => byYear(year).printLoans / byYear(year - 1).printLoans - 1;

test('疫情谷底：2021 年是 2015–2025 年中唯一比前一年少 5% 以上的一年', () => {
  const bigDrops = data.national
    .filter((r) => r.year > 2014 && change(r.year) < -0.05)
    .map((r) => r.year);
  assert.deepEqual(bigDrops, [2021]);
});

test('2021 年全國紙本借閱比 2020 年少約 13%', () => {
  assert.ok(change(2021) < -0.12 && change(2021) > -0.14, `實際是 ${change(2021)}`);
});

test('2025 年全國紙本借閱是 2014–2025 年中最高的一年', () => {
  const highest = data.national.reduce((a, b) => (b.printLoans > a.printLoans ? b : a));
  assert.equal(highest.year, 2025);
});

test('電子書借閱 2024 年約 1,980 萬冊', () => {
  const ebook2024 = byYear(2024).ebookLoans;
  assert.ok(ebook2024 > 19_700_000 && ebook2024 < 19_900_000, `實際是 ${ebook2024}`);
});

test('電子書借閱 2025 年比 2024 年少', () => {
  assert.ok(byYear(2025).ebookLoans < byYear(2024).ebookLoans);
});

test('2025 年全國紙本人均借閱約 5.8 本（135,251,757 冊 ÷ 23,299,132 人）', () => {
  assert.equal(byYear(2025).printPerCapita.toFixed(1), '5.8');
});

test('網站讀的 assets/data.js 就是最新的整理結果（改了資料要記得跑 npm.cmd run build-data）', async () => {
  const { readFile } = await import('node:fs/promises');
  const text = await readFile(new URL('../assets/data.js', import.meta.url), 'utf8');
  const sandbox = {};
  new Function('window', text)(sandbox);
  assert.deepEqual(sandbox.LIBRARY_DATA, buildSiteData());
});

test('每一年都有紙本借閱人次和服務人口，而且人次少於冊數', () => {
  for (const r of data.national) {
    assert.ok(r.population > 20_000_000, `${r.year} 人口 ${r.population}`);
    assert.ok(r.printVisits > 0 && r.printVisits < r.printLoans, `${r.year} 人次 ${r.printVisits}`);
  }
});

// ---------- 章節二：22 縣市 ----------
const COUNTY_NAMES = [
  '基隆市', '台北市', '新北市', '桃園市', '新竹縣', '新竹市', '苗栗縣', '台中市',
  '彰化縣', '南投縣', '雲林縣', '嘉義縣', '嘉義市', '台南市', '高雄市', '屏東縣',
  '宜蘭縣', '花蓮縣', '台東縣', '澎湖縣', '金門縣', '連江縣',
];

test('22 個縣市都在，一個不少，也沒有重複', () => {
  const names = data.counties.map((c) => c.name);
  assert.equal(names.length, 22);
  assert.deepEqual([...names].sort(), [...COUNTY_NAMES].sort());
});

const county = (name) => data.counties.find((c) => c.name === name);
const perCapita2025 = (name) => county(name).years.find((y) => y.year === 2025).perCapita;

test('每個縣市都有 2014–2025 每一年的人均借閱', () => {
  for (const c of data.counties) {
    assert.deepEqual(c.years.map((y) => y.year), data.national.map((r) => r.year), c.name);
    for (const y of c.years) assert.ok(y.perCapita > 0 && y.perCapita < 30, `${c.name} ${y.year}：${y.perCapita}`);
  }
});

test('2025 年人均借閱：新北第一（約 8.7）、高雄第二（約 7.2）、台北約 5.5', () => {
  const ranked = [...data.counties].sort((a, b) => perCapita2025(b.name) - perCapita2025(a.name));
  assert.deepEqual(ranked.slice(0, 2).map((c) => c.name), ['新北市', '高雄市']);
  assert.equal(perCapita2025('新北市').toFixed(1), '8.7');
  assert.equal(perCapita2025('高雄市').toFixed(1), '7.2');
  assert.equal(perCapita2025('台北市').toFixed(1), '5.5');
});

test('新北、台中、南投標明用的是「不含國立館」的數字，其他縣市沒有', () => {
  const marked = data.counties.filter((c) => c.excludesNationalLibrary).map((c) => c.name);
  assert.deepEqual(marked.sort(), ['南投縣', '新北市', '台中市'].sort());
  // 期望值是人工對照 2025 年原始資料「不含國立館」那一列算出來的（冊數 ÷ 服務轄區人口）；
  // 如果誤用含國立館那一列，會變成 新北 8.9、台中 7.0、南投 2.6
  assert.equal(perCapita2025('台中市').toFixed(1), '6.2');
  assert.equal(perCapita2025('南投縣').toFixed(1), '2.1');
});

test('地圖上的 22 塊縣市形狀，和數據的 22 個縣市一一對得上', async () => {
  const { readFile } = await import('node:fs/promises');
  const text = await readFile(new URL('../assets/taiwan-map.js', import.meta.url), 'utf8');
  const sandbox = {};
  new Function('window', text)(sandbox);
  const shapes = sandbox.TAIWAN_MAP.counties;
  assert.deepEqual(shapes.map((s) => s.name).sort(), [...COUNTY_NAMES].sort());
  for (const s of shapes) assert.match(s.d, /^M[\d.,LMZ-]+$/, `${s.name} 的形狀是空的或格式不對`);
});
