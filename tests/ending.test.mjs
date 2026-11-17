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
// - 北市圖 2024 年 18–24 歲借了 317,624 冊 ÷ 台北 18–24 歲人口 145,692 人 ≈ 2.18 → 2.2 本，
//   比 0–5 歲 2.83、65 歲以上 2.77…每一組都低；35–44 歲 3,270,426 ÷ 367,072 ≈ 8.91，8.91 ÷ 2.18 ≈ 4.1 → 1／4（見 chapter3.test.mjs）
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

test('發現一：借書沒有退流行，2021 年 3.0 本 → 2025 年 5.8 本、2014–2025 年最高', () => {
  assert.equal(trend.title, '借書沒有退流行');
  assert.equal(trend.value, '5.8');
  assert.match(trend.text, /2021 年.*3\.0 本/);
  assert.match(trend.text, /2025 年.*5\.8 本/);
  assert.match(trend.text, /2014–2025 年最高/);
  assert.doesNotMatch(trend.text, /十年/);
});

test('發現二：愛借書的不一定是台北，新北第一約 8.7 本、台北約 5.5 本', () => {
  assert.equal(where.title, '愛借書的不一定是台北');
  assert.equal(where.value, '8.7');
  assert.match(where.text, /新北市/);
  assert.match(where.text, /第 1 名/);
  assert.match(where.text, /臺北市約 5\.5 本/);
  assert.match(where.text, /第 5 名/);
});

test('發現三：我們這一代借得最少，用人均借閱 2.2 本、所有年齡層最低、約 35–44 歲的 1／4，註明年齡資料只有台北', () => {
  assert.equal(us.title, '我們這一代借得最少');
  assert.equal(us.value, '2.2');
  assert.equal(us.unit, '本');
  assert.match(us.text, /18–24 歲平均每人一年借 2\.2 本/);
  assert.match(us.text, /所有年齡層裡最少/);
  assert.match(us.text, /35–44 歲（8\.9 本）的 1／4/);
  assert.match(us.text, /只有台北/);
  assert.doesNotMatch(us.text + us.caption, /%|6 歲以上|十分之一/);
});

test('發現三跟章節三的章節結論說法一致：都說「所有年齡層」最少', async () => {
  const html = await readFile(new URL('../chapter3.html', import.meta.url), 'utf8');
  const conclusion = html.slice(html.indexOf('class="conclusion__answer"'));
  assert.match(conclusion.slice(0, 200), /所有年齡層裡借得最少/);
  assert.doesNotMatch(html, /6 歲以上|十分之一|占全部借閱/);
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
  // 讓 18–24 歲人均 3 本：比 0–5 歲 2.83、65 歲以上 2.77 多，不再是所有年齡層最少
  data.age.groups.find((g) => g.age === '18-24').perCapita = 3;
  const changed = window.EndingPage.view(data);
  assert.deepEqual(changed.findings.map((f) => f.holds), [false, false, false]);
});

test('第 1 名換人時，發現二的句子跟著寫新的第 1 名；不是新高時不寫「最高」', () => {
  const data = structuredClone(window.LIBRARY_DATA);
  // 讓臺中市 2025 年變成 9 本：超過新北 8.73，臺中變第 1 名
  data.counties.find((c) => c.name === '臺中市').years.find((y) => y.year === 2025).perCapita = 9;
  // 讓 2024 年變 9 本：2025 年 5.8 本不再是最高
  data.national.find((r) => r.year === 2024).printPerCapita = 9;
  const [changedTrend, changedWhere] = window.EndingPage.view(data).findings;
  assert.equal(changedWhere.value, '9.0');
  assert.match(changedWhere.text, /第 1 名是臺中市，平均每人 9\.0 本/);
  assert.match(changedWhere.caption, /臺中市平均每人/);
  assert.doesNotMatch(changedWhere.text + changedWhere.caption, /新北/);
  assert.doesNotMatch(changedTrend.text, /最高/);
  assert.equal(changedWhere.holds, true); // 臺中第一、臺北不是第一：發現仍成立
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

test('主要按鈕寫「換你回答：你還借書嗎？ →」，連到借書成績單（規格第 12 條）', async () => {
  const html = await readFile(new URL('../ending.html', import.meta.url), 'utf8');
  assert.match(html, /<a class="button button--big" href="scorecard\.html">換你回答：你還借書嗎？ →<\/a>/);
});

test('結語頁順序：標題 → 總答案 → 三個發現 → 換你回答', async () => {
  const html = await readFile(new URL('../ending.html', import.meta.url), 'utf8');
  const at = (needle) => {
    const i = html.indexOf(needle);
    assert.ok(i >= 0, `找不到 ${needle}`);
    return i;
  };
  const order = [at('<h1>'), at('data-ending-answer'), at('data-finding="0"'), at('data-finding="2"'), at('換你回答：你還借書嗎？ →')];
  assert.deepEqual([...order].sort((a, b) => a - b), order);
});

test('首頁大數字下面有同一句總答案，寫在 HTML 裡（不載入結語程式也看得到）', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.ok(html.includes(`data-ending-answer>${v.answer}<`), '首頁的總答案跟結語計算裡的不一樣');
  assert.ok(html.indexOf('data-ending-answer') > html.indexOf('big-number'), '總答案要在大數字下面');
  assert.doesNotMatch(html, /ending\.js/);
});

test('全站只有一句總答案：首頁和結語頁的答案之外，沒有別的「data-ending-answer」', async () => {
  const { readdir } = await import('node:fs/promises');
  const pages = (await readdir(new URL('..', import.meta.url))).filter((f) => f.endsWith('.html'));
  const withAnswer = [];
  for (const page of pages) {
    const html = await readFile(new URL(`../${page}`, import.meta.url), 'utf8');
    if (html.includes('data-ending-answer')) withAnswer.push(page);
  }
  assert.deepEqual(withAnswer.sort(), ['ending.html', 'index.html']);
});
