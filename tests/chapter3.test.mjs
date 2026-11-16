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

test('每個年齡層都列出最常借的前 3 類', () => {
  for (const g of v.groups) assert.equal(g.top.length, 3, g.age);
  assert.equal(v.groups.find((g) => g.age === '18-24').top[0].name, '語言文學');
});

test('資料範圍：只有台北市，北市圖 113 年度（2024 年）', () => {
  assert.equal(v.year, 2024);
  assert.equal(v.rocYear, 113);
});

test('結論的數字：18–24 歲借了約 31.8 萬冊，占 2.5%，是 6 歲以上借最少的一群', () => {
  assert.equal(v.young.loans, 317_624);
  assert.equal((v.young.share * 100).toFixed(1), '2.5');
  assert.equal(v.young.leastAmongReaders, true);
  // 原表：12–17 歲 630,391 冊、35–44 歲 3,270,426 冊
  assert.equal(v.young.vsTeens.toFixed(1), '0.5');
  assert.equal(Math.round(v.young.vsPeak), 10);
  assert.equal(v.peak.age, '35-44');
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
