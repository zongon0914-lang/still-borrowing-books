// 檢查點一・成績單全部掃一遍：22 縣市 × 9 年齡層 × 0–999 本（加上 4 個估算範圍），每一種組合都算一次，
// 網頁和圖片上的文字都不能出現怪說法。手挑的例子抓不到「剛好接近平均」這類情況（曾經漏掉「還差 0.0 本」），
// 所以這裡不比對答案，只檢查整類不該出現的字。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const window = {};
for (const file of ['data.js', 'chapter3.js', 'scorecard.js', 'scorecard-image.js']) {
  const text = await readFile(new URL(`../assets/${file}`, import.meta.url), 'utf8');
  new Function('window', text)(window);
}
const data = window.LIBRARY_DATA;
const { compute, RANGES } = window.Scorecard;
const { content } = window.ScorecardImage;
const book = { title: '如何閱讀一本書', author: '莫提默．艾德勒', category: '總類' };

// 不該出現的說法（前面不能接數字或小數點，避免把「10.0 本」「11.00 倍」誤判成問題）
const BAD = [
  [/差 0(\.0+)? 本/, '「還差 0.0 本」這類差距是 0 的說法'],
  [/(^|[^\d.])0(\.0+)? 倍/, '「0 倍」'],
  [/(^|[^\d.])1\.00 倍/, '其實是打平的「1.00 倍」'],
  [/NaN|undefined|Infinity|null/, '程式的錯誤值'],
];

function inputs() {
  const list = [];
  for (const county of data.counties.map((c) => c.name)) {
    for (const age of data.age.groups.map((g) => g.age)) {
      for (let books = 0; books <= 999; books++) list.push({ county, age, books });
      for (const r of RANGES) list.push({ county, age, range: r.value });
    }
  }
  return list;
}

// 只看讀者會讀到的句子；推薦書清單和網址不在檢查範圍（書名本身可能含數字）
const pageTexts = (c) => [
  c.county.compare.text,
  c.national.compare.text,
  c.peer?.compare.text,
  c.title.name,
  c.title.line,
];
const imageTexts = (c) => {
  const img = content(c, book);
  return [img.booksValue, img.estimate, img.title, img.line, ...img.rows.map((r) => r.text)];
};

test('22 縣市 × 9 年齡層 × 0–999 本和 4 個範圍：網頁和圖片都沒有怪說法', () => {
  const problems = [];
  for (const input of inputs()) {
    const c = compute(data, input);
    assert.equal(c.ok, true, `應該算得出成績單：${JSON.stringify(input)}`);
    for (const text of [...pageTexts(c), ...imageTexts(c)]) {
      if (text == null) continue;
      for (const [pattern, why] of BAD) {
        if (pattern.test(text)) problems.push(`${JSON.stringify(input)} → 「${text}」（${why}）`);
      }
    }
    if (problems.length >= 10) break;
  }
  assert.deepEqual(problems, [], `出現怪說法：\n${problems.join('\n')}`);
});
