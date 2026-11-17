// 全站用字掃描：掃過每一頁 HTML 和畫面用的 JS（不含整理好的數據 data.js、地圖形狀 taiwan-map.js），
// 檢查讀者看得到的文字有沒有違反 GLOSSARY.md 和 docs/spec-polish.md 的用字規則。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';

const root = new URL('../', import.meta.url);

async function siteFiles() {
  const html = (await readdir(root)).filter((f) => f.endsWith('.html'));
  const js = (await readdir(new URL('assets/', root)))
    .filter((f) => f.endsWith('.js') && !['data.js', 'taiwan-map.js'].includes(f))
    .map((f) => `assets/${f}`);
  return [...html, ...js];
}

/** 讀檔；JS 去掉註解（註解是寫給維護的人看的，不是給讀者） */
async function readSite(file) {
  const text = await readFile(new URL(file, root), 'utf8');
  if (!file.endsWith('.js')) return text;
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:\\])\/\/.*$/gm, '$1');
}

// ---------- 「台」（GLOSSARY.md「台（用字）」） ----------
// 專有名稱照原文：機構、報告、資料集名稱（讀者才查得到）
const PROPER_NAMES = [
  /臺北市立圖書館/g,
  /臺中市立圖書館/g,
  /臺南市立圖書館/g,
  /臺東縣立圖書館/g,
  /臺灣閱讀風貌/g,
  /臺北人閱讀偏好大剖析/g,
];

test('敘述和縣市名稱都寫「台」，只有機構、報告名稱照原文寫「臺」', async () => {
  const problems = [];
  for (const file of await siteFiles()) {
    let text = await readSite(file);
    for (const re of PROPER_NAMES) text = text.replace(re, '');
    for (const line of text.split('\n')) if (line.includes('臺')) problems.push(`${file}：${line.trim()}`);
  }
  assert.deepEqual(problems, [], `敘述裡出現「臺」：\n${problems.join('\n')}`);
});

// ---------- 中文標點後面不要有空白 ----------
// HTML 在標點後換行，瀏覽器會把換行畫成一個空白（「借書，  我們」）。行內標籤（span、a、strong…）不算段落邊界，
// 其他標籤和 JS 的字串引號才是；同一段裡標點後面接空白或換行就算一處。
const INLINE = /<\/?(span|a|strong|em|b|i|small|abbr|code|br)\b[^>]*>/g;
// 箭頭（「下一章 →」）和網址前面的空白是刻意的，不算
const PUNCT_SPACE = /[，。、；：！？」』）]\s+(?![→←]|https?:)(?=\S)/;
function textBlocks(text, file) {
  const body = file.endsWith('.html') ? text.slice(text.indexOf('<body')).replace(/<script[\s\S]*?<\/script>/g, '') : text;
  return body
    .replace(/<span class="guess-placeholder"[^>]*>[^<]*<\/span>/g, '') // 章節一猜之前的「？ 本」是刻意的佔位
    .replace(INLINE, '')
    .replace(/<[^>]+>/g, '\u0000')
    .split(file.endsWith('.js') ? /[\u0000'"`]/ : /\u0000/);
}

test('中文標點後面沒有多餘的空白（每一頁 HTML 和畫面用的 JS）', async () => {
  const problems = [];
  for (const file of await siteFiles()) {
    for (const block of textBlocks(await readSite(file), file)) {
      const m = block.match(PUNCT_SPACE);
      if (m) problems.push(`${file}：…${block.slice(Math.max(0, m.index - 12), m.index + 14).replace(/\s+/g, '␣')}…`);
    }
  }
  assert.deepEqual(problems, [], `標點後面有空白（${problems.length} 處）：\n${problems.join('\n')}`);
});

// ---------- 期間說法：2014–2025 寫「2014–2025 年」或「十二年」，不寫「十年」 ----------
test('全站不寫「十年」（含分享介紹和預覽圖版面）', async () => {
  const files = [...(await siteFiles()), 'tools/share-preview.html'];
  const problems = [];
  for (const file of files) {
    const text = await readSite(file);
    for (const line of text.split('\n')) if (/(?<!二)十年/.test(line)) problems.push(`${file}：${line.trim()}`);
  }
  assert.deepEqual(problems, [], `出現「十年」：\n${problems.join('\n')}`);
});
