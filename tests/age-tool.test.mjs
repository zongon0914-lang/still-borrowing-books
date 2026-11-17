// 檢查點二・年齡工具結果頁：9 個年齡層 × 不分性別／女／男，每一種組合都有結果；網址不對時顯示友善訊息。
// 直接載入網站用的 assets/data.js 和 assets/age.js，用「網址參數」呼叫頁面，看頁面要顯示什麼。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const window = {};
for (const file of ['data.js', 'chapter3.js', 'category.js', 'age.js']) {
  const text = await readFile(new URL(`../assets/${file}`, import.meta.url), 'utf8');
  new Function('window', text)(window);
}
const page = (search) => window.AgePage.view(window.LIBRARY_DATA, search);
// 用章節三實際產生連結的函式，確保兩邊對得起來
const fromChapter3 = (age) => window.Chapter3Page.ageUrl(age).replace('age.html', '');

// 北市圖的 9 個年齡層（獨立寫一份，不從資料讀）
const AGES = ['0-5', '6-11', '12-17', '18-24', '25-34', '35-44', '45-54', '55-64', '65+'];
const SEXES = ['all', 'female', 'male'];

test('9 個年齡層 × 3 種性別，每一種組合都有 10 個類別的排行', () => {
  for (const age of AGES) {
    for (const sex of SEXES) {
      const v = page(window.AgePage.resultUrl(age, sex).replace('age.html', ''));
      assert.equal(v.found, true, `${age} ${sex} 找不到`);
      assert.equal(v.age, age);
      assert.equal(v.sex, sex);
      assert.equal(v.ranking.length, 10, `${age} ${sex}`);
      for (let i = 1; i < 10; i++) assert.ok(v.ranking[i - 1].loans >= v.ranking[i].loans, `${age} ${sex} 沒有照多到少排`);
    }
  }
});

test('章節三的 9 個年齡連結都接得上，不分性別', () => {
  for (const age of AGES) {
    const v = page(fromChapter3(age));
    assert.equal(v.found, true, `${age} 找不到`);
    assert.equal(v.age, age);
    assert.equal(v.sex, 'all');
  }
});

test('標題寫出年齡和性別；合計冊數跟原表一樣（18–24 歲女 179,054 冊）', () => {
  const v = page('?age=18-24&sex=female');
  assert.equal(v.label, '18–24 歲女性');
  assert.equal(v.loans, 179_054);
  assert.equal(page('?age=65%2B').label, '65 歲以上');
  assert.equal(page('?age=0-5&sex=male').label, '0–5 歲男性');
});

test('還沒選年齡時，只顯示選單，不算錯誤', () => {
  for (const search of ['', '?age=', '?sex=female']) {
    const v = page(search);
    assert.equal(v.found, false, `「${search}」`);
    assert.equal(v.message, '', `「${search}」不該有錯誤訊息`);
  }
});

test('年齡或性別不對時，顯示友善訊息', () => {
  for (const search of ['?age=30', '?age=18-24&sex=x', '?age=%E0%A4%A', '?age=__proto__', '?age=18-24&sex=__proto__']) {
    const v = page(search);
    assert.equal(v.found, false, `「${search}」不應該找得到`);
    assert.ok(v.message.length > 0, `「${search}」沒有訊息`);
  }
  assert.match(page('?age=30').message, /30/);
});

test('年齡多打了空白、「歲」或用了長破折號也找得到', () => {
  assert.equal(page('?age=%2018-24%20').age, '18-24');
  assert.equal(page(`?age=${encodeURIComponent('18–24歲')}`).age, '18-24');
  assert.equal(page(`?age=${encodeURIComponent('65歲以上')}`).age, '65+');
});

test('每個類別都連得到 06 的類別細節頁', () => {
  for (const c of page('?age=45-54&sex=male').ranking) {
    const target = window.CategoryPage.view(window.LIBRARY_DATA, c.url.replace('category.html', ''));
    assert.equal(target.found, true, `${c.name} 的連結打不開`);
    assert.equal(target.name, c.name);
  }
});

// 原表裡 27 種組合的第一名都是語言文學（0–5 歲的繪本也歸在這一類）
test('「最常借」：每個年齡層都是語言文學', () => {
  for (const age of AGES) assert.equal(page(`?age=${encodeURIComponent(age)}`).top.name, '語言文學', age);
});

// 「特別愛借」= 這個年齡（和性別）借某類的占比 − 同性別所有讀者借該類的占比，差最多、而且不是第一名的那一類。
// 下面的預期值用 Python 直接讀 tools/raw/tpml-age-2024.json 原表算的（不經過網站程式）：
//   不分性別 18–24 歲：社會科學 39,078 ÷ 317,624 = 12.3%，所有讀者 9.9%，多 2.38 個百分點（哲學多 2.33，第二）
//   不分性別 0–5 歲：學齡前 11.9%，所有讀者 2.7%，多 9.25 個百分點
//   女 18–24 歲：哲學 14,900 ÷ 179,054 = 8.32%，所有女性 427,143 ÷ 7,647,591 = 5.59%，多 2.74 個百分點（社會科學多 2.38，第二）
//   男 18–24 歲：社會科學 18,613 ÷ 138,570 = 13.43%，所有男性 11.20%，多 2.23 個百分點（哲學多 1.88，第二）
//   男 65 歲以上：史地 92,276 ÷ 778,076 = 11.86%，所有男性 9.79%，多 2.07 個百分點
test('「特別愛借」：不分性別 18–24 歲是社會科學，0–5 歲是學齡前', () => {
  assert.equal(page('?age=18-24').standout.name, '社會科學');
  assert.equal(page('?age=0-5').standout.name, '學齡前');
  for (const age of AGES) {
    for (const sex of SEXES) {
      const v = page(window.AgePage.resultUrl(age, sex).replace('age.html', ''));
      assert.ok(v.standout.share > v.standout.overall, `${age} ${sex}`);
      assert.notEqual(v.standout.name, v.top.name, `${age} ${sex} 跟第一名重複`);
    }
  }
});

test('選了性別時，「特別愛借」跟同性別所有讀者比：女 18–24 歲是哲學、男 18–24 歲是社會科學、男 65 歲以上是史地', () => {
  assert.equal(page('?age=18-24&sex=female').standout.name, '哲學');
  assert.equal(page('?age=18-24&sex=male').standout.name, '社會科學');
  assert.equal(page('?age=65%2B&sex=male').standout.name, '史地');
});

test('熱門書單跟著「特別愛借」那一類：前 5 本，連到該類的類別細節頁', () => {
  const books = (name) => window.LIBRARY_DATA.books.categories.find((c) => c.name === name).books.slice(0, 5);
  for (const [search, name] of [['?age=18-24', '社會科學'], ['?age=18-24&sex=female', '哲學'], ['?age=0-5', '學齡前']]) {
    const v = page(search);
    assert.equal(v.books.length, 5, search);
    assert.deepEqual(v.books, books(name), search);
    const target = window.CategoryPage.view(window.LIBRARY_DATA, v.standout.url.replace('category.html', ''));
    assert.equal(target.name, name, search);
  }
});

test('換年齡時書單跟著換：18–24 歲和 0–5 歲、25–34 歲的書單都不一樣', () => {
  const titles = (search) => page(search).books.map((b) => b.title).join('|');
  assert.notEqual(titles('?age=18-24'), titles('?age=0-5'));
  assert.notEqual(titles('?age=18-24'), titles('?age=25-34')); // 25–34 歲特別愛借哲學
});

test('頁面用一句話解釋「特別愛借」，並寫出比較的數字', () => {
  const v = page('?age=18-24&sex=female');
  assert.equal(
    v.standoutMeaning,
    '「特別愛借」是指：跟台北所有女性讀者比，這一類在 18–24 歲女性借的書裡占的比例高出最多（最常借的語言文學除外），不一定是借最多的。',
  );
  assert.equal(v.standoutLine, '18–24 歲女性借的書裡，哲學占 8.3%，台北所有女性讀者是 5.6%，多了 2.7 個百分點。');
});

test('每個類別也列出所有讀者的占比，方便比較', () => {
  const v = page('?age=18-24');
  const phil = v.ranking.find((c) => c.name === '哲學');
  // 章節三：哲學 18–24 歲占 7.4%，所有讀者 5.1%
  assert.equal((phil.share * 100).toFixed(1), '7.4');
  assert.equal((phil.overall * 100).toFixed(1), '5.1');
});

test('選了女或男時，跟同性別的所有讀者比（原表小計：女性共 7,647,591 冊，哲學 427,143 冊）', () => {
  const v = page('?age=18-24&sex=female');
  assert.equal(v.compareLabel, '台北所有女性讀者');
  const phil = v.ranking.find((c) => c.name === '哲學');
  assert.equal((phil.overall * 100).toFixed(2), (427_143 / 7_647_591 * 100).toFixed(2));
  assert.equal(page('?age=18-24').compareLabel, '台北所有讀者');
  // 男女合計時照舊跟所有讀者比
  assert.equal((page('?age=18-24').ranking.find((c) => c.name === '哲學').overall * 100).toFixed(1), '5.1');
});
