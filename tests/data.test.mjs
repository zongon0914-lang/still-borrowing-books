// 檢查點一・數據對不對
// 期望值來自規格書（docs/spec.md）和人工核對過的事實，不是用程式重算出來的。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadRaw, buildCleanData } from '../tools/clean-data.mjs';

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
  assert.deepEqual(sandbox.LIBRARY_DATA, data);
});

test('每一年都有紙本借閱人次和服務人口，而且人次少於冊數', () => {
  for (const r of data.national) {
    assert.ok(r.population > 20_000_000, `${r.year} 人口 ${r.population}`);
    assert.ok(r.printVisits > 0 && r.printVisits < r.printLoans, `${r.year} 人次 ${r.printVisits}`);
  }
});
