// 檢查點一・熱門書單對不對（類別細節頁）
// 原始表：國圖《113年臺灣閱讀風貌及全民閱讀力年度報告》各類別借閱 TOP20，人工抄進 tools/raw/ncl-books-2024.json。
// 期望值是直接看報告 PDF 寫下來的，不是用程式重算。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadBooksRaw, buildBooksData, loadAgeRaw } from '../tools/clean-data.mjs';

const ageCategories = loadAgeRaw().categories;
const books = buildBooksData(loadBooksRaw(), ageCategories);
const list = (name) => books.categories.find((c) => c.name === name).books;

test('章節三的 10 個類別都有書單，名稱跟北市圖年齡表一模一樣', () => {
  assert.deepEqual(books.categories.map((c) => c.name), ageCategories);
});

test('每個類別都是第 1 到第 10 名，每本書都有書名和作者', () => {
  for (const c of books.categories) {
    assert.deepEqual(c.books.map((b) => b.rank), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], c.name);
    for (const b of c.books) {
      assert.ok(b.title.trim(), `${c.name} 第 ${b.rank} 名沒有書名`);
      assert.ok(b.author.trim(), `${c.name} 第 ${b.rank} 名沒有作者`);
    }
  }
});

test('每個類別都註明出自報告的哪一張表、哪一頁', () => {
  for (const c of books.categories) {
    assert.match(c.table, /^表 \d+　113 年.+TOP20$/, c.name);
    assert.ok(Number.isInteger(c.page), c.name);
  }
  assert.match(books.source.title, /113年臺灣閱讀風貌及全民閱讀力年度報告/);
  assert.equal(books.year, 2024);
});

test('各類榜首照報告原表', () => {
  assert.equal(list('語言文學')[0].title, '不便利的便利店');
  assert.equal(list('哲學')[0].title, '原子習慣：細微改變帶來巨大成就的實證法則');
  assert.equal(list('總類')[0].author, '申克．艾倫斯 (Sönke Ahrens)');
  assert.equal(list('學齡前')[0].title, '小老鼠愛數學');
  assert.equal(list('藝術')[0].title, '放手畫禪繞：頭腦的瑜珈練習');
});

test('長銷書有標記：《原子習慣》、《如何閱讀一本書》', () => {
  const ls = (name, title) => list(name).find((b) => b.title.startsWith(title)).longSeller;
  assert.equal(ls('哲學', '原子習慣'), '連續 4 年蟬聯哲學類冠軍');
  assert.equal(ls('總類', '如何閱讀一本書'), '連續入榜 9 年');
  assert.equal(ls('語言文學', '不便利的便利店'), undefined);
});

test('「學齡前」說明它對應的是報告的嬰幼兒圖書排行', () => {
  const pre = books.categories.find((c) => c.name === '學齡前');
  assert.match(pre.table, /嬰幼兒/);
  assert.match(pre.note, /0-5 歲嬰幼兒圖書/);
});

test('抄寫有缺漏時，資料整理模組會擋下來', () => {
  const raw = loadBooksRaw();
  const missingCategory = { ...raw, categories: raw.categories.slice(1) };
  assert.throws(() => buildBooksData(missingCategory, ageCategories), /學齡前/);

  const skipRank = structuredClone(raw);
  skipRank.categories[2].books.splice(4, 1);
  assert.throws(() => buildBooksData(skipRank, ageCategories), /哲學/);

  const noAuthor = structuredClone(raw);
  noAuthor.categories[0].books[0].author = ' ';
  assert.throws(() => buildBooksData(noAuthor, ageCategories), /作者/);
});
