// 首頁章節卡的小數字預告（docs/spec-polish.md 使用者故事 41）：數字用 data-stat 從數據填入，
// 沒有 JavaScript 時 HTML 裡的備用文字也是對的數字。
// 手算（同 ending.test.mjs）：
// - 2025 年全國紙本 135,251,757 冊 ÷ 人口 23,299,132 人 ≈ 5.81 → 5.8 本
// - 2025 年新北紙本 35,301,750 冊 ÷ 人口 4,044,831 人 ≈ 8.73 → 8.7 本，22 縣市第 1 名
// - 2024 年北市圖 18–24 歲 317,624 冊 ÷ 台北 18–24 歲人口 145,692 人 ≈ 2.18 → 2.2 本
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const card = (href) => {
  const m = html.match(new RegExp(`<a class="question-card[^"]*" href="${href}">([\\s\\S]*?)</a>`));
  assert.ok(m, `首頁找不到 ${href} 的卡片`);
  return m[1];
};
const stat = (text, name) => text.match(new RegExp(`data-stat="${name}">([^<]*)<`))?.[1];

test('章節一卡片：5.8 本（2025 年全國人均借閱）', () => {
  const c = card('chapter1.html');
  assert.equal(stat(c, 'latestPerCapita'), '5.8');
  assert.equal(stat(c, 'latestYear'), '2025');
});

test('章節二卡片：新北 8.7 本（人均借閱第一名）', () => {
  const c = card('chapter2.html');
  assert.equal(stat(c, 'topCountyShort'), '新北');
  assert.equal(stat(c, 'topCountyPerCapita'), '8.7');
});

test('章節三卡片：2.2 本（台北 18–24 歲人均借閱），不用占比', () => {
  const c = card('chapter3.html');
  assert.equal(stat(c, 'youngPerCapita'), '2.2');
  assert.doesNotMatch(c, /%/);
});

test('卡片上的數字都由 site.js 填入（每個 data-stat 名稱在 site.js 都有）', async () => {
  const site = await readFile(new URL('../assets/site.js', import.meta.url), 'utf8');
  for (const name of new Set([...html.matchAll(/data-stat="([^"]+)"/g)].map((m) => m[1]))) {
    assert.match(site, new RegExp(`\\b${name}: \\(\\) =>`), `site.js 沒有填 ${name}`);
  }
});
