// 檢查點二・類別細節頁：10 個類別的網址都顯示得出書單；網址不對時顯示友善訊息。
// 直接載入網站用的 assets/data.js 和 assets/category.js，用「網址參數」呼叫頁面，看頁面要顯示什麼。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const window = {};
for (const file of ['data.js', 'chapter3.js', 'category.js']) {
  const text = await readFile(new URL(`../assets/${file}`, import.meta.url), 'utf8');
  new Function('window', text)(window);
}
const page = (search) => window.CategoryPage.view(window.LIBRARY_DATA, search);
// 用章節三實際產生連結的函式，確保兩邊對得起來
const urlFor = (name) => window.Chapter3Page.categoryUrl(name).replace('category.html', '');

// 章節三的 10 個類別（獨立寫一份，不從資料讀）
const CATEGORIES = ['學齡前', '總類', '哲學', '宗教', '自然科學', '應用科學', '社會科學', '史地', '語言文學', '藝術'];

test('章節三的 10 個類別連結都顯示得出 10 本書', () => {
  for (const name of CATEGORIES) {
    const v = page(urlFor(name));
    assert.equal(v.found, true, `${name} 找不到`);
    assert.equal(v.name, name);
    assert.equal(v.books.length, 10, name);
  }
});

test('標題名稱不會變成「總類類」或「學齡前類」', () => {
  assert.equal(page(urlFor('哲學')).label, '哲學類');
  assert.equal(page(urlFor('總類')).label, '總類');
  assert.equal(page(urlFor('學齡前')).label, '學齡前圖書');
});

test('書名拆成主標題和副標題，方便排版', () => {
  const v = page(urlFor('哲學'));
  assert.equal(v.books[0].main, '原子習慣');
  assert.equal(v.books[0].sub, '細微改變帶來巨大成就的實證法則');
  assert.equal(v.books[8].main, '孝子');
  assert.equal(v.books[8].sub, '');
});

test('列出這一類在台北 18–24 歲和所有讀者的借閱占比，連到章節三的數字', () => {
  const v = page(urlFor('語言文學'));
  assert.ok(v.share.young > 0.3 && v.share.young < 0.5, `18–24 歲 ${v.share.young}`);
  assert.equal(v.youngLabel, '18–24 歲');
  assert.ok(v.share.overall > 0.3 && v.share.overall < 0.5, `所有讀者 ${v.share.overall}`);
});

test('長銷書和北市圖也點名的書會被數出來', () => {
  const v = page(urlFor('哲學'));
  assert.equal(v.longSellers, 3);
  assert.equal(v.books.filter((b) => b.taipei).length, 4);
});

test('有其他類別可以切換（不含自己）', () => {
  const v = page(urlFor('藝術'));
  assert.equal(v.others.length, 9);
  assert.ok(!v.others.includes('藝術'));
});

test('網址沒有類別、或類別名稱不對時，顯示友善訊息', () => {
  for (const search of ['', '?category=', '?category=漫畫', '?cat=哲學', '?category=%E0%A4%A']) {
    const v = page(search);
    assert.equal(v.found, false, `「${search}」不應該找得到`);
    assert.ok(v.message.length > 0, `「${search}」沒有訊息`);
  }
  assert.match(page('?category=漫畫').message, /漫畫/);
});

test('類別名稱前後多了空白或「類」字也找得到', () => {
  assert.equal(page('?category=%20哲學%20').name, '哲學');
  assert.equal(page(`?category=${encodeURIComponent('哲學類')}`).name, '哲學');
  assert.equal(page(`?category=${encodeURIComponent('學齡前類')}`).name, '學齡前');
  assert.equal(page(`?category=${encodeURIComponent('學齡前圖書')}`).name, '學齡前');
});
