// 結語頁：三個發現、大數字、對應章節和整體答案（不碰畫面）。
// 直接載入網站用的 assets/data.js、assets/chapter3.js（結語沿用章節三的計算）和 assets/ending.js。
//
// 手算（數字查 tools/raw/ 的原始年報，跟 data.test.mjs、county.test.mjs 核對過的同一批）：
// - 2021 年全國紙本 71,252,495 冊 ÷ 人口 23,375,315 人 ≈ 3.05 → 3.0 本
// - 2025 年全國紙本 135,251,757 冊 ÷ 人口 23,299,132 人 ≈ 5.81 → 5.8 本；
//   其他年最高是 2024 年 128,108,040 ÷ 23,400,220 ≈ 5.47，所以 2025 年是 2014–2025 最高
// - 2025 年新北紙本 35,301,750 冊 ÷ 人口 4,044,831 人 ≈ 8.73 → 8.7 本，22 縣市第 1 名（見 county.test.mjs）
// - 2025 年臺北紙本 13,413,178 冊 ÷ 人口 2,439,507 人 ≈ 5.50 → 5.5 本；
//   排在它前面的是新北 8.73、高雄 19,651,175 ÷ 2,718,545 ≈ 7.23、臺南 11,801,492 ÷ 1,852,477 ≈ 6.37、
//   臺中 17,897,588 ÷ 2,868,465 ≈ 6.24，所以臺北第 5 名
// - 北市圖 2024 年 18–24 歲借了 317,624 冊，比 6–11、12–17（630,391）…65 歲以上每一組都少（見 chapter3.test.mjs）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function load() {
  const window = {};
  for (const file of ['data.js', 'chapter3.js', 'ending.js']) {
    const text = await readFile(new URL(`../assets/${file}`, import.meta.url), 'utf8');
    new Function('window', text)(window);
  }
  return window;
}
const window = await load();
const v = window.EndingPage.view(window.LIBRARY_DATA);
const [trend, where, us] = v.findings;

test('結語有三個發現，依序連回章節一、二、三', () => {
  assert.equal(v.findings.length, 3);
  assert.deepEqual(v.findings.map((f) => f.url), ['chapter1.html', 'chapter2.html', 'chapter3.html']);
  for (const f of v.findings) {
    assert.ok(f.title.length > 0, '沒有標題');
    assert.ok(f.value.length > 0, `${f.title} 沒有大數字`);
    assert.ok(f.text.length > 0, `${f.title} 沒有說明`);
  }
});

test('三個發現在目前的數據下都成立', () => {
  for (const f of v.findings) assert.equal(f.holds, true, `${f.title} 不成立`);
});

test('發現一：借書沒有退流行，2021 年 3.0 本 → 2025 年 5.8 本、十年新高', () => {
  assert.equal(trend.title, '借書沒有退流行');
  assert.equal(trend.value, '5.8');
  assert.match(trend.text, /2021 年.*3\.0 本/);
  assert.match(trend.text, /2025 年.*5\.8 本/);
  assert.match(trend.text, /十年新高/);
});

test('發現二：愛借書的不一定是台北，新北第一約 8.7 本、台北約 5.5 本', () => {
  assert.equal(where.title, '愛借書的不一定是台北');
  assert.equal(where.value, '8.7');
  assert.match(where.text, /新北市/);
  assert.match(where.text, /第 1 名/);
  assert.match(where.text, /臺北市約 5\.5 本/);
  assert.match(where.text, /第 5 名/);
});

test('發現三：我們這一代借得最少，註明年齡資料只有台北', () => {
  assert.equal(us.title, '我們這一代借得最少');
  assert.match(us.text, /18–24 歲/);
  assert.match(us.text, /6 歲以上/);
  assert.match(us.text, /只有台北/);
});

test('有一句整體答案', () => {
  assert.equal(typeof v.answer, 'string');
  assert.ok(v.answer.length > 0);
});

test('數據改變、發現不再成立時，會標成不成立', () => {
  const data = structuredClone(window.LIBRARY_DATA);
  // 讓 2024 年比 2025 年多：2025 不再是十年新高
  data.national.find((r) => r.year === 2024).printPerCapita = 9;
  // 讓臺北市 2025 年變成 10 本：超過新北，新北不再是第一名
  data.counties.find((c) => c.name === '臺北市').years.find((y) => y.year === 2025).perCapita = 10;
  // 讓 18–24 歲借得比 65 歲以上還多：不再是 6 歲以上最少
  data.age.groups.find((g) => g.age === '18-24').all.loans = 1e9;
  const changed = window.EndingPage.view(data);
  assert.deepEqual(changed.findings.map((f) => f.holds), [false, false, false]);
});

test('JavaScript 沒載入時，HTML 的備用文字跟算出來的一樣（三個發現和答案都完整）', async () => {
  const html = await readFile(new URL('../ending.html', import.meta.url), 'utf8');
  for (const f of v.findings) {
    for (const part of ['title', 'value', 'unit', 'caption', 'text', 'linkText']) {
      assert.ok(html.includes(`data-part="${part}">${f[part]}<`), `${f.title} 的 ${part} 備用文字跟數據不一樣：${f[part]}`);
    }
    assert.ok(html.includes(`<a href="${f.url}" data-part="linkText">`), `${f.title} 沒有連到 ${f.url}`);
  }
  assert.ok(html.includes(`data-ending-answer>${v.answer}<`), '整體答案的備用文字跟程式不一樣');
});
