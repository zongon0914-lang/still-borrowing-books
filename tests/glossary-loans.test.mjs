// 名詞表規則（GLOSSARY.md「借閱冊數」）：作品中寫到「借閱冊數」時，一律說清楚是紙本、電子書，還是合計。
// 掃過每一頁 HTML 和畫面用的 JS，含「借閱冊數」的每一段（HTML 的一個段落、標題、表格格子；JS 的一個字串），
// 都要在同一段裡寫出紙本、電子書或合計。在說明這個名詞本身時（寫成「借閱冊數」加引號，或名詞解釋的 <dt>），不用註明。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const KIND = /紙本|電子書|合計/;

async function siteFiles() {
  const html = (await readdir(root)).filter((f) => f.endsWith('.html'));
  // data.js 是整理好的數據，不是給讀者看的句子
  const js = (await readdir(new URL('assets/', root)))
    .filter((f) => f.endsWith('.js') && f !== 'data.js')
    .map((f) => `assets/${f}`);
  return [...html, ...js];
}

// 行內標籤（span、a、strong…）不切段；其他標籤和 JS 的字串引號才是段落邊界。換行不算（一段話常跨行）
const INLINE = /<\/?(span|a|strong|em|b|i|small|abbr|code)\b[^>]*>/g;
function blocks(text) {
  return text
    .replace(/<dt>借閱冊數<\/dt>/g, '')
    .replace(INLINE, '')
    .replace(/<[^>]+>/g, '\u0000')
    .replace(/\s*\n\s*/g, '')
    .split(/[\u0000'`"]/)
    .map((s) => s.trim())
    .filter((s) => s.includes('借閱冊數'));
}

test('寫到「借閱冊數」的每一段，都說清楚是紙本、電子書還是合計', async () => {
  const problems = [];
  for (const file of await siteFiles()) {
    const text = await readFile(new URL(file, root), 'utf8');
    for (const s of blocks(text)) {
      const withoutTerm = s.replace(/「借閱冊數」/g, '');
      if (withoutTerm.includes('借閱冊數') && !KIND.test(s)) problems.push(`${file}：${s}`);
    }
  }
  assert.deepEqual(problems, [], `沒寫清楚是紙本、電子書還是合計：\n${problems.join('\n')}`);
});
