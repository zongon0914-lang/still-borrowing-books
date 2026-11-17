// 接縫二・先猜再看的揭曉句：讀者猜幾本，揭曉時看到的答案和那一句話對不對。
// 直接載入網站用的 assets/data.js 和 assets/chapter1.js，在 Node 裡呼叫計算的那一半（不碰畫面）。
// 預期答案來自手算和規格 docs/spec-ending.md，不用程式的算法再算一次。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const window = {};
for (const file of ['data.js', 'chapter1.js']) {
  const text = await readFile(new URL(`../assets/${file}`, import.meta.url), 'utf8');
  new Function('window', text)(window);
}
const reveal = (books) => window.Chapter1Page.guess(window.LIBRARY_DATA, books);

// 2025 年手算（原始數據）：全國紙本 135,251,757 冊 ÷ 23,299,132 人 ≈ 5.81 本，頁面上寫 5.8 本。
// 差距都用頁面上的 5.8 本算，讀者才對得起來。
// 猜 0 本：5.8 − 0 = 5.8 → 猜少了 5.8 本
test('猜 0 本：答案 5.8 本，猜少了 5.8 本', () => {
  const r = reveal(0);
  assert.equal(r.year, 2025);
  assert.equal(r.answer, '5.8');
  assert.equal(r.kind, 'under');
  assert.match(r.sentence, /猜少了 5\.8 本/);
});

// 猜 20 本（拉桿最大）：20 − 5.8 = 14.2 → 猜多了 14.2 本
test('猜 20 本：猜多了 14.2 本', () => {
  const r = reveal(20);
  assert.equal(r.kind, 'over');
  assert.match(r.sentence, /猜多了 14\.2 本/);
});

// 猜 5.8 本：差 0 本；猜 5.5 本：5.8 − 5.5 = 0.3 本。都在 0.5 本以內 → 幾乎猜中
test('猜 5.8 本、5.5 本：幾乎猜中，不說猜多猜少', () => {
  for (const books of [5.8, 5.5]) {
    const r = reveal(books);
    assert.equal(r.kind, 'close', `猜 ${books} 本`);
    assert.match(r.sentence, /幾乎猜中/);
    assert.doesNotMatch(r.sentence, /猜多了|猜少了/);
  }
});

// 0.5 本剛好算「以內」：猜 6.3 本 → 6.3 − 5.8 = 0.5；猜 5.3 本 → 5.8 − 5.3 = 0.5（小數相減容易算成 0.4999…）
test('差距剛好 0.5 本（猜 5.3、6.3 本）也算幾乎猜中', () => {
  assert.equal(reveal(5.3).kind, 'close');
  assert.equal(reveal(6.3).kind, 'close');
});

// 拉桿每一格（0、0.5、…、20 本，共 41 格）都揭曉一次，比照成績單全部掃一遍的做法：
// 不比對答案，只檢查整類不該出現的字。
const BAD = [
  [/太少|太多|落後|墊底|不及格|丟臉|可惜|離譜|錯得/, '責備或嘲笑的字眼'],
  [/差 0(\.0+)? 本|了 0(\.0+)? 本/, '差距是 0 的說法'],
  [/NaN|undefined|Infinity|null/, '程式的錯誤值'],
];
test('拉桿 0～20 本每一格：揭曉句友善、沒有怪說法', () => {
  const problems = [];
  for (let tenths = 0; tenths <= 200; tenths += 5) {
    const books = tenths / 10;
    const r = reveal(books);
    assert.equal(r.answer, '5.8');
    assert.ok(r.sentence, `猜 ${books} 本應該有揭曉句`);
    for (const [pattern, why] of BAD) {
      if (pattern.test(r.sentence)) problems.push(`猜 ${books} 本 →「${r.sentence}」（${why}）`);
    }
  }
  assert.deepEqual(problems, []);
});

// 猜 5 本：5.8 − 5 = 0.8，超過 0.5 → 猜少了 0.8 本
test('猜 5 本：猜少了 0.8 本', () => {
  const r = reveal(5);
  assert.equal(r.kind, 'under');
  assert.match(r.sentence, /猜少了 0\.8 本/);
});

test('猜少時說「更常借書」，不說「更常去圖書館」（數據是借閱冊數，不是去圖書館的次數）', () => {
  const r = reveal(0);
  assert.match(r.sentence, /更常借書/);
  assert.doesNotMatch(r.sentence, /圖書館/);
});

// 縱軸刻度：紙本折線圖 2014–2025 從 6,486 萬到 1.35 億冊，整張用「億」；電子書最多 1,980 萬冊，整張用「萬」
test('縱軸刻度同一張圖用同一種單位：6,000 萬寫成 0.6 億、1.4 億寫成 1.4 億', () => {
  const { axisTick, axisUnit } = window.Chapter1Page;
  const print = window.LIBRARY_DATA.national.map((r) => r.printLoans);
  const ebook = window.LIBRARY_DATA.national.map((r) => r.ebookLoans);
  assert.equal(axisUnit(print), '億');
  assert.equal(axisUnit(ebook), '萬');
  assert.deepEqual(
    [0, 2e7, 6e7, 8e7, 1e8, 1.2e8, 1.4e8].map((n) => axisTick(n, '億')),
    ['0', '0.2 億', '0.6 億', '0.8 億', '1 億', '1.2 億', '1.4 億'],
  );
  assert.equal(axisTick(1.25e8, '億'), '1.25 億');
  assert.deepEqual([0, 5e6, 1.5e7, 2e7].map((n) => axisTick(n, '萬')), ['0', '500 萬', '1,500 萬', '2,000 萬']);
});
