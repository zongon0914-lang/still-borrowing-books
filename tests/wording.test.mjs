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
