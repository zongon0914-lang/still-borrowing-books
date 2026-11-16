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
test('第一名類別附上熱門書單：每個年齡層都是語言文學', () => {
  for (const age of AGES) assert.equal(page(`?age=${encodeURIComponent(age)}`).top.name, '語言文學', age);
  const young = page('?age=18-24');
  assert.equal(young.books.length, 5);
  assert.ok(young.books.every((b) => b.title && b.author));
});

test('第一名都一樣，所以另外標出「比所有讀者多借最多」的類別：18–24 歲是社會科學，0–5 歲是學齡前', () => {
  // 章節三：社會科學 12.3%（所有讀者 9.9%，多 2.4 個百分點），略多於哲學 7.4%（5.1%，多 2.3 個百分點）
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
