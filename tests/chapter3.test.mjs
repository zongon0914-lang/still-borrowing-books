// 章節三「我們這一代借什麼？」：頁面要顯示的內容（不碰畫面）。
// 直接載入網站用的 assets/data.js 和 assets/chapter3.js。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const window = {};
for (const file of ['data.js', 'chapter3.js']) {
  const text = await readFile(new URL(`../assets/${file}`, import.meta.url), 'utf8');
  new Function('window', text)(window);
}
const v = window.Chapter3Page.view(window.LIBRARY_DATA);

test('9 個年齡層都會畫出來，只有 18–24 歲標成年輕世代', () => {
  assert.deepEqual(v.groups.map((g) => g.label), [
    '0–5 歲', '6–11 歲', '12–17 歲', '18–24 歲', '25–34 歲', '35–44 歲', '45–54 歲', '55–64 歲', '65 歲以上',
  ]);
  assert.deepEqual(v.groups.filter((g) => g.isYoung).map((g) => g.age), ['18-24']);
});

test('資料範圍：只有台北市，北市圖 113 年度（2024 年）', () => {
  assert.equal(v.year, 2024);
  assert.equal(v.rocYear, 113);
});

// 人均借閱手算（北市圖年刊各年齡層紙本借閱冊數 ÷ 內政部 2024 年底台北該年齡層人口）：
//   0–5 歲   276,267 ÷  97,752 ≈ 2.83
//   6–11 歲 1,524,251 ÷ 136,839 ≈ 11.14
//   12–17 歲  630,391 ÷ 129,544 ≈ 4.87
//   18–24 歲  317,624 ÷ 145,692 ≈ 2.18
//   25–34 歲  860,149 ÷ 284,291 ≈ 3.03
//   35–44 歲 3,270,426 ÷ 367,072 ≈ 8.91
//   45–54 歲 2,964,414 ÷ 384,065 ≈ 7.72
//   55–64 歲 1,435,375 ÷ 371,156 ≈ 3.87
//   65 歲以上 1,592,714 ÷ 574,458 ≈ 2.77
test('每個年齡層都有人均借閱，跟手算一樣', () => {
  const expected = { '0-5': '2.8', '6-11': '11.1', '12-17': '4.9', '18-24': '2.2', '25-34': '3.0', '35-44': '8.9', '45-54': '7.7', '55-64': '3.9', '65+': '2.8' };
  for (const g of v.groups) assert.equal(g.perCapita.toFixed(1), expected[g.age], g.age);
});

test('18–24 歲人均 2.2 本，是所有年齡層（包含 0–5 歲）最低的', () => {
  assert.equal(v.young.perCapita.toFixed(2), '2.18');
  assert.equal(v.young.leastOfAll, true);
});

test('跟 18 歲以上人均最高的 35–44 歲比：8.91 ÷ 2.18 ≈ 4.09，約 1／4；不跟 6–11 歲比', () => {
  assert.equal(v.peak.age, '35-44');
  assert.equal(v.young.vsPeak.toFixed(1), '4.1');
  assert.equal(v.young.vsPeakRounded, 4);
  assert.equal(v.top.age, '6-11'); // 所有年齡層最高的是國小學童，只拿來描述，不拿來比
});

test('生活感換算：12 個月 ÷ 2.18 本 ≈ 5.50 個月 → 「大約每 5 個半月才借 1 本」', () => {
  assert.equal(v.young.monthsPerBook, '5 個半月');
  assert.equal(v.young.everyLine, '台北 18–24 歲平均大約每 5 個半月才借 1 本');
});

test('換算四捨五入到半個月：人均 3 本 → 每 4 個月；人均 2.4 本 → 每 5 個月；人均 24 本 → 每半個月', () => {
  const at = (perCapita) => {
    const data = structuredClone(window.LIBRARY_DATA);
    data.age.groups.find((g) => g.age === '18-24').perCapita = perCapita;
    return window.Chapter3Page.view(data).young.monthsPerBook;
  };
  assert.equal(at(3), '4 個月'); // 12 ÷ 3 = 4
  assert.equal(at(2.4), '5 個月'); // 12 ÷ 2.4 = 5
  assert.equal(at(24), '半個月'); // 12 ÷ 24 = 0.5
});

test('18–24 歲人均比其他某一組高時，就不算最少', () => {
  const data = structuredClone(window.LIBRARY_DATA);
  data.age.groups.find((g) => g.age === '18-24').perCapita = 3; // 比 0–5 歲 2.83、65 歲以上 2.77 高
  assert.equal(window.Chapter3Page.view(data).young.leastOfAll, false);
});

test('不再輸出用總冊數算的占比和「十分之一」那類比較', () => {
  assert.equal('share' in v.young, false);
  assert.equal('vsTeens' in v.young, false);
});

test('18–24 歲跟所有讀者比，10 個類別都有占比；比所有讀者明顯多借的是哲學和社會科學', () => {
  assert.equal(v.compare.length, 10);
  for (const c of v.compare) assert.ok(c.young > 0 && c.overall > 0, c.name);
  assert.deepEqual(v.standouts.map((c) => c.name), ['哲學', '社會科學']);
});

test('類別和年齡連結都帶網址參數', () => {
  assert.equal(window.Chapter3Page.categoryUrl('語言文學'), 'category.html?category=%E8%AA%9E%E8%A8%80%E6%96%87%E5%AD%B8');
  assert.equal(window.Chapter3Page.ageUrl('65+'), 'age.html?age=65%2B');
});

// 顏色深淺表：照原表 18–24 歲那一列（不分性別）
//   語言文學 124,861 ÷ 317,624 ≈ 39.3% → 20% 以上（4 級）
//   社會科學  39,078 ÷ 317,624 ≈ 12.3% → 10–20%（3 級）
//   哲學      23,611 ÷ 317,624 ≈  7.4% → 6–10%（2 級）
//   宗教       4,695 ÷ 317,624 ≈  1.5% → 3% 以下（0 級）
// 0–5 歲總類 8,249 ÷ 276,267 ≈ 2.99%：格子寫 3.0%，所以算 3–6%（1 級），不會被塗成「3% 以下」
test('顏色深淺表：9 列年齡 × 10 欄類別，18–24 歲那一列標出來', () => {
  assert.equal(v.heat.rows.length, 9);
  assert.equal(v.heat.categories.length, 10);
  for (const r of v.heat.rows) assert.equal(r.cells.length, 10, r.age);
  assert.deepEqual(v.heat.rows.filter((r) => r.isYoung).map((r) => r.age), ['18-24']);
  assert.equal(v.heat.legend.length, 5);
});

test('顏色深淺表的格子：占比和深淺級距跟手算一樣', () => {
  const cell = (age, name) => v.heat.rows.find((r) => r.age === age).cells.find((c) => c.name === name);
  assert.deepEqual([cell('18-24', '語言文學').text, cell('18-24', '語言文學').level], ['39.3%', 4]);
  assert.deepEqual([cell('18-24', '社會科學').text, cell('18-24', '社會科學').level], ['12.3%', 3]);
  assert.deepEqual([cell('18-24', '哲學').text, cell('18-24', '哲學').level], ['7.4%', 2]);
  assert.deepEqual([cell('18-24', '宗教').text, cell('18-24', '宗教').level], ['1.5%', 0]);
  assert.deepEqual([cell('0-5', '總類').text, cell('0-5', '總類').level], ['3.0%', 1]);
});

test('顏色深淺表的欄標題連到類別細節頁', () => {
  for (const c of v.heat.categories) assert.equal(c.url, window.Chapter3Page.categoryUrl(c.name));
});

test('JavaScript 沒載入時，章節三的表格備用文字跟算出來的一樣', async () => {
  const html = await readFile(new URL('../chapter3.html', import.meta.url), 'utf8');
  assert.match(html, /<table class="heat-table"/);
  for (const r of v.heat.rows) {
    for (const c of r.cells) {
      assert.ok(
        html.includes(`<td class="heat-table__cell is-level-${c.level}" data-heat="${r.age}|${c.name}">${c.text}</td>`),
        `${r.age} ${c.name} 的備用文字跟數據不一樣`,
      );
    }
  }
  assert.ok(html.includes(v.young.everyLine), '生活感換算的備用文字跟數據不一樣');
});
