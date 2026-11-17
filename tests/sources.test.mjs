// 資料來源與 AI 使用說明頁：每一份用到的來源都列出來並附上連結、名詞解釋跟 GLOSSARY.md 一致、AI 分工寫清楚。
// 直接讀 sources.html（這頁是純文字，不靠 JavaScript），跟網站用的 assets/data.js、GLOSSARY.md 對照。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), 'utf8');
const html = await read('sources.html');
const glossary = await read('GLOSSARY.md');
const window = {};
new Function('window', await read('assets/data.js'))(window);
const data = window.LIBRARY_DATA;

// 去掉標籤、合併空白，用來比對「讀者看到的文字」
const text = html.replace(/<[^>]+>/g, '').replace(/\s+/g, '');
const hrefs = new Set([...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1].replace(/&amp;/g, '&')));

test('暫時頁面的「製作中」已經換掉', () => {
  assert.doesNotMatch(text, /製作中/);
});

test('章節一、二用的公共圖書館統計有列出，並附上連結', () => {
  assert.ok(hrefs.has('https://data.gov.tw/dataset/6425'));
  assert.ok(hrefs.has('https://publibstat.nlpi.edu.tw/'));
  assert.match(text, /國立公共資訊圖書館/);
  assert.match(text, /2014–2025/);
});

test('章節三、年齡工具用的北市圖年刊有列出，並附上連結', () => {
  const src = data.age.source;
  assert.ok(text.includes(src.title), src.title);
  assert.ok(text.includes(src.publisher), src.publisher);
  assert.ok(hrefs.has(src.url), '缺北市圖年刊的連結');
});

test('類別頁書單用的國圖閱讀報告有列出，並附上原始連結和備份連結', () => {
  const src = data.books.source;
  assert.ok(text.includes(src.title), src.title);
  assert.ok(text.includes(src.publisher), src.publisher);
  assert.ok(hrefs.has(src.url), '缺國圖報告的連結');
  assert.ok(hrefs.has(src.archiveUrl), '缺國圖報告的備份連結');
});

test('借書成績單同齡人比較用的台北各年齡人口有列出（名稱、發布單位、年份、連結、用在哪裡）', () => {
  const src = data.age.population.source;
  assert.ok(text.includes(src.title), src.title);
  assert.ok(text.includes(src.publisher), src.publisher);
  assert.ok(hrefs.has(src.url), '缺台北人口資料的連結');
  assert.match(text, /113年12月/);
  assert.match(text, /同齡人/);
});

test('地圖的縣市界線來源有列出', () => {
  assert.match(text, /內政部國土測繪中心/);
  assert.match(text, /taiwan-atlas/);
});

// GLOSSARY.md 的格式：「**名詞**：」下一行是解釋
const definitions = new Map(
  [...glossary.matchAll(/^\*\*(.+?)\*\*：\r?\n(.+)$/gm)].map((m) => [m[1], m[2].trim()]),
);

test('名詞解釋跟 GLOSSARY.md 一致（每個名詞的解釋整段照抄）', () => {
  for (const term of ['借閱冊數', '借閱人次', '紙本借閱／電子書借閱', '人均借閱', '年輕世代']) {
    const def = definitions.get(term);
    assert.ok(def, `GLOSSARY.md 找不到 ${term}`);
    assert.ok(text.includes(term), `頁面沒有 ${term}`);
    assert.ok(text.includes(def.replace(/\s+/g, '')), `${term} 的解釋跟 GLOSSARY.md 不一樣：${def}`);
  }
});

test('說明為什麼紙本和電子書分開、為什麼扣除國立館、為什麼年份不同', () => {
  assert.match(text, /紙本和電子書為什麼分開/);
  for (const county of ['新北', '臺中', '南投']) assert.ok(text.includes(county), county);
  assert.match(text, /不含國立館/);
  assert.match(text, /年份為什麼不一樣/);
  assert.ok(text.includes(`${data.age.year}`));
});

test('AI 使用說明寫清楚三點分工', () => {
  assert.match(text, /生成式AI（Claude）協助撰寫/);
  for (const part of ['主題選擇', '故事架構', '視覺方向']) assert.ok(text.includes(part), part);
  assert.match(text, /人工核對/);
  assert.match(text, /不是AI生成的/);
});
