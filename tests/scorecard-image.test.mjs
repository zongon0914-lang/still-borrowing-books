// 借書成績單圖片（1080×1920，IG 限動）：圖片上寫什麼字、字有沒有排在圖片裡面。
// 載入網站用的 assets/scorecard-image.js，在 Node 裡呼叫不碰畫布的那一半；真正畫到畫布上的樣子用瀏覽器檢查。
// 量字寬用一把保守的假尺：中文字 1 個字寬 = 字級，英數 0.6 個字級（比真的 Noto 字型寬一點）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const window = {};
for (const file of ['data.js', 'chapter3.js', 'scorecard.js', 'scorecard-image.js']) {
  const text = await readFile(new URL(`../assets/${file}`, import.meta.url), 'utf8');
  new Function('window', text)(window);
}
const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
const { content, wrap, layout, WIDTH, HEIGHT } = window.ScorecardImage;

const card = (input) => window.Scorecard.compute(window.LIBRARY_DATA, { age: '18-24', ...input });
const book = { title: '如何閱讀一本書', author: '莫提默．艾德勒', category: '總類' };
const measure = (text, size) => [...text].reduce((w, ch) => w + (ch.charCodeAt(0) < 0x2e80 ? 0.6 : 1) * size, 0);
const allText = (c) => JSON.stringify(c);

test('圖片是 1080×1920 的直式（IG 限動）', () => {
  assert.equal(WIDTH, 1080);
  assert.equal(HEIGHT, 1920);
});

test('新北、9 本：圖片寫著借書量、縣市和全國比較、名次、稱號、推薦書和作品網址', () => {
  const c = content(card({ county: '新北市', books: 9 }), book);
  assert.equal(c.booksValue, '9 本');
  assert.equal(c.estimate, null);
  assert.equal(c.title, '比冠軍新北還能借');
  assert.equal(c.line, '全台沒有一個縣市追得上你');
  const rows = Object.fromEntries(c.rows.map((r) => [r.label, r.text]));
  assert.match(rows['跟新北市比'], /8\.7 本/);
  assert.match(rows['跟新北市比'], /1\.03 倍/);
  assert.match(rows['跟全國比'], /5\.8 本/);
  assert.match(rows['跟全國比'], /1\.55 倍/);
  assert.match(rows['跟台北同齡人比'], /18–24 歲/);
  assert.match(rows['如果我是一個縣市'], /第 1 名/);
  assert.equal(c.bookTitle, '如何閱讀一本書');
  assert.match(c.bookMeta, /莫提默．艾德勒/);
  // 作品網址就是 package.json 的 homepage（不寫 https://，比較短好抄）
  assert.equal(`https://${c.url}/`, pkg.homepage);
});

test('0 本：圖片上都是「還差幾本」，沒有「0 倍」', () => {
  const c = content(card({ county: '新北市', books: 0 }), book);
  assert.equal(c.booksValue, '0 本');
  assert.equal(c.title, '還沒開卡的讀者');
  assert.doesNotMatch(allText(c), /0(\.0+)? 倍/);
  assert.match(c.rows[0].text, /還差 8\.7 本/);
  assert.match(c.rows[3].text, /第 23 名/);
});

test('選了範圍：圖片註明「依我選的範圍估算」', () => {
  const c = content(card({ county: '台東縣', range: '6-12' }), book);
  assert.equal(c.booksValue, '9 本');
  assert.match(c.estimate, /依我選的範圍「6–12 本」估算/);
});

test('換一本：圖片用的是傳進來的那本書', () => {
  const other = { title: '晶片戰爭', author: '克里斯．米勒', category: '社會科學' };
  const c = content(card({ county: '新北市', books: 9 }), other);
  assert.equal(c.bookTitle, '晶片戰爭');
  assert.match(c.bookMeta, /社會科學/);
});

test('換行：每一行都不超過寬度，字一個都沒少', () => {
  const text = 'ChatGPT 指令大全與創新應用：GPT-4 搶先看、串接 API、客服機器人、AI 英文家教，一鍵打造 AI 智慧產品';
  const lines = wrap(text, 400, (t) => measure(t, 40));
  assert.ok(lines.length > 1);
  for (const l of lines) assert.ok(measure(l, 40) <= 400, `「${l}」太寬`);
  assert.equal(lines.join('').replace(/ /g, ''), text.replace(/ /g, ''));
  // 英文單字不從中間切開
  assert.ok(lines.every((l) => !/ChatGP$|^T /.test(l)));
});

test('換行：數字和後面的單位（倍、本、名）不拆到兩行', () => {
  const text = '台北 18–24 歲 2024 年平均每人借 2.2 本，我是它的 4.13 倍';
  // 寬度剛好讓「倍」擠不進第一行
  const width = measure('台北 18–24 歲 2024 年平均每人借 2.2 本，我是它的 4.13', 10);
  const lines = wrap(text, width, (t) => measure(t, 10));
  assert.equal(lines.length, 2);
  assert.equal(lines[1], '4.13 倍');
});

test('換行：最後一行不會只剩一個字', () => {
  const text = '台北 0–5 歲 2024 年平均每人借 2.8 本，我還差 2.8 本就追上';
  const width = measure('台北 0–5 歲 2024 年平均每人借 2.8 本，我還差 2.8 本就追', 10);
  const lines = wrap(text, width, (t) => measure(t, 10));
  assert.equal(lines.length, 2);
  assert.ok([...lines[1]].length >= 2, `最後一行只有「${lines[1]}」`);
  assert.equal(lines.join(''), text.replace(/ (?=追上)/, ''));
});

// 排版：每一段字都在圖片的邊界內、彼此不重疊
function assertInBounds(ops) {
  let bottom = 0;
  for (const op of ops) {
    assert.ok(op.x >= 0 && op.x + op.width <= WIDTH - 72, `「${op.text}」超出左右邊界`);
    assert.ok(op.y >= 72 && op.y + op.size * 1.2 <= HEIGHT - 72, `「${op.text}」超出上下邊界（y=${op.y}）`);
    assert.ok(op.y >= bottom - 0.5, `「${op.text}」跟上一段重疊`);
    bottom = op.y + op.size * 1.2;
  }
}
// 頁尾上面那條線：上面的字都要在線的上方
function assertAboveFooter(ops) {
  const footer = ops.find((op) => op.role === 'footerRule');
  assert.ok(footer, '要有頁尾的線');
  for (const op of ops.filter((o) => o.kind === 'text' && o.role !== 'cta' && o.role !== 'url')) {
    assert.ok(op.y + op.size * 1.2 <= footer.y, `「${op.text}」壓到頁尾`);
  }
}
// 真的 Noto 字型英數字比較窄（約 0.5 個字級），書名會用比較大的字級排成三行，最容易擠到頁尾
const narrow = (text, size) => [...text].reduce((w, ch) => w + (ch.charCodeAt(0) < 0x2e80 ? 0.5 : 1) * size, 0);
const textOps = (c, m = measure) => {
  const ops = layout(c, m);
  assertAboveFooter(ops);
  return ops.filter((op) => op.kind === 'text');
};

const longest = {
  title: '給存股新手的財富翻滾筆記：最適合小資族的「金融股 543 規律」用薪水 4 萬輕鬆打造年收股息 20 萬！',
  author: '達賴喇嘛 (Dalai Lama)、戴斯蒙．屠圖 (Desmond Tutu)、道格拉斯．亞伯拉姆 (Douglas Abrams)',
  category: '社會科學',
};
const cases = {
  '新北、9 本': [{ county: '新北市', books: 9 }, book],
  '0 本': [{ county: '連江縣', books: 0 }, book],
  '999 本': [{ county: '新竹縣', books: 999, age: '65+' }, book],
  '估算': [{ county: '嘉義縣', range: '13+' }, book],
  '最長的書名和作者': [{ county: '花蓮縣', books: 52 }, longest],
  '估算＋最長的書名＋同齡人比較兩行': [{ county: '花蓮縣', age: '65+', range: '13+' }, longest],
  '很長的縣市名（假想）': [{ county: '新北市', books: 3 }, longest],
};
for (const [name, [input, b]] of Object.entries(cases)) {
  for (const [ruler, m] of [['寬尺', measure], ['窄尺', narrow]]) {
    test(`排版不超出邊界、不重疊（${ruler}）：${name}`, () => {
      const c = content(card(input), b);
      if (name.startsWith('很長的縣市名')) c.rows[0].label = '跟一個名字非常非常非常非常非常長的縣市比';
      const ops = textOps(c, m);
      assertInBounds(ops);
      // 重要的字都有畫上去
      const drawn = ops.map((op) => op.text).join('');
      for (const must of [c.booksValue, c.title, c.url]) assert.ok(drawn.includes(must), `沒畫出「${must}」`);
      if (c.estimate) assert.ok(drawn.includes('估算'));
    });
  }
}

test('書名太長時縮小字級、最多三行，放不下才加「…」', () => {
  const c = content(card({ county: '新北市', books: 9 }), longest);
  const titleOps = layout(c, measure).filter((op) => op.role === 'bookTitle');
  assert.ok(titleOps.length >= 1 && titleOps.length <= 3);
  assert.ok(titleOps[0].size < 56, '長書名應該縮小');
  const drawn = titleOps.map((op) => op.text).join('');
  assert.ok(drawn === longest.title.replace(/ /g, '') || drawn.endsWith('…') || drawn.replace(/ /g, '') === longest.title.replace(/ /g, ''));
});

test('0 本排最後一名：圖片上也有跟頁面一樣的鼓勵，不只寫「第 23 名」', () => {
  const c = content(card({ county: '新北市', books: 0 }), book);
  assert.match(c.rows[3].text, /第 23 名/);
  assert.match(c.rows[3].text, /借一本就有機會/);
  // 有贏過縣市時不用鼓勵
  assert.doesNotMatch(content(card({ county: '新北市', books: 9 }), book).rows[3].text, /借一本/);
});

test('比較的說法跟頁面同一個來源：差距四捨五入是 0 時圖片也說「我跟它差不多」', () => {
  // 澎湖 2025 年人均 ≈ 3.018 本、台北 25–34 歲 2024 年 ≈ 3.026 本：3 本都是「差不多」
  const c = content(card({ county: '澎湖縣', age: '25-34', books: 3 }), book);
  assert.match(c.rows[0].text, /我跟它差不多$/);
  assert.match(c.rows[2].text, /我跟它差不多$/);
  assert.doesNotMatch(allText(c), /0\.0 本|1\.00 倍/);
  assert.match(content(card({ county: '新北市', books: 0 }), book).rows[0].text, /我還差 8\.7 本就追上$/);
});

test('程式裡寫死的作品網址（SITE_URL）跟 package.json 的 homepage 一樣', () => {
  assert.equal(`https://${window.ScorecardImage.SITE_URL}/`, pkg.homepage);
});

// 現在的內容每段都有行數上限，最緊的排法一定放得下；這裡多塞一列比較（例如以後加功能），模擬放不下的情況
test('排版的保險：內容多到最緊的排法也放不下時，推薦書縮成一行加「…」，還是不會壓到頁尾', () => {
  const c = content(card({ county: '花蓮縣', age: '65+', range: '13+' }), longest);
  const long = '這是一段很長很長的說明文字，用來把每一列都撐滿兩行，'.repeat(4);
  c.estimate = long;
  c.line = long;
  c.rows.push({ label: '多一列', text: long });
  for (const row of c.rows) row.text = long;
  const ops = textOps(c);
  assertInBounds(ops);
  const titleOps = ops.filter((op) => op.role === 'bookTitle');
  assert.ok(titleOps.length >= 1, '書名還是要畫出來');
  assert.ok(titleOps[titleOps.length - 1].text.endsWith('…'));
});
