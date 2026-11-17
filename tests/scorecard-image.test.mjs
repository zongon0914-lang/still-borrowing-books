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

// 排版：每一段字（和長條）都在圖片的邊界內、彼此不重疊。
// 長條圖那幾列的名稱、橫條、本數排在同一列，所以用「方框有沒有相交」來檢查，不是只看上下順序
const rectOf = (op) => (op.kind === 'bar'
  ? { x: op.x, y: op.y, w: op.track, h: op.height, name: `${op.role} 長條` }
  : { x: op.x, y: op.y, w: op.width, h: op.size * 1.2, name: `「${op.text}」` });
function assertInBounds(ops) {
  const rects = ops.filter((op) => op.kind !== 'rule').map(rectOf);
  for (const r of rects) {
    assert.ok(r.x >= 0 && r.x + r.w <= WIDTH - 72, `${r.name}超出左右邊界`);
    assert.ok(r.y >= 72 && r.y + r.h <= HEIGHT - 72, `${r.name}超出上下邊界（y=${r.y}）`);
  }
  for (let i = 0; i < rects.length; i++) {
    for (let j = i + 1; j < rects.length; j++) {
      const a = rects[i], b = rects[j];
      const hit = a.x < b.x + b.w - 0.5 && b.x < a.x + a.w - 0.5 && a.y < b.y + b.h - 0.5 && b.y < a.y + a.h - 0.5;
      assert.ok(!hit, `${a.name}和${b.name}重疊`);
    }
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
  return ops.filter((op) => op.kind !== 'rule');
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
      const drawn = ops.filter((op) => op.kind === 'text').map((op) => op.text).join('');
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

// 現在的內容每段都有行數上限；這裡把每一段都撐到上限（估算、稱號說明、四列比較句都兩行，書名和作者最長），
// 模擬最擠的情況：推薦書縮成一行加「…」，比較句和稱號說明照樣兩行、不截短（規格使用者故事 49），也不壓到頁尾
test('排版的保險：每一段都撐到最多行時，只有推薦書縮短，比較句不截短，也不會壓到頁尾', () => {
  const c = content(card({ county: '花蓮縣', age: '65+', range: '13+' }), longest);
  const twoLines = '這是一段剛好排成兩行的說明文字，用來模擬比較句最長的情況，再多加幾個字讓它撐滿';
  c.estimate = twoLines;
  c.line = twoLines;
  for (const row of c.rows) row.text = twoLines;
  const ops = textOps(c);
  assertInBounds(ops);
  // 每一段字都完整畫出來（字可以縮小，但不能少字）
  const drawnOf = (role) => ops.filter((op) => op.role === role).map((op) => op.text).join('');
  assert.equal(drawnOf('line'), twoLines);
  assert.equal(drawnOf('estimate'), twoLines);
  assert.equal(drawnOf('rowText'), twoLines.repeat(c.rows.length));
  assert.equal(ops.filter((op) => op.role === 'barValue').length, 4, '長條圖四根都要在');
  const titleOps = ops.filter((op) => op.role === 'bookTitle');
  assert.ok(titleOps.length >= 1, '書名還是要畫出來');
});

// ---------- 長條圖（docs/spec-polish.md 使用者故事 44–49） ----------
// 手算：新北 2025 年 35,301,750 ÷ 4,044,831 ≈ 8.73 → 8.7 本；全國 135,251,757 ÷ 23,299,132 ≈ 5.81 → 5.8 本；
// 台北 18–24 歲 2024 年 317,624 ÷ 145,692 ≈ 2.18 → 2.2 本
const barOps = (c, m = measure) => layout(c, m).filter((op) => op.kind === 'bar');
const barTexts = (c, m = measure) => layout(c, m).filter((op) => op.role === 'barLabel' || op.role === 'barValue').map((op) => op.text);

test('長條圖有四根：我、我的縣市、全國、台北同齡人，每根都標本數', () => {
  const c = content(card({ county: '新北市', books: 3 }), book);
  assert.deepEqual(c.bars.map((b) => [b.label, b.text]), [
    ['我', '3 本'],
    ['新北市', '8.7 本'],
    ['全國', '5.8 本'],
    ['台北 18–24 歲', '2.2 本'],
  ]);
  assert.equal(barOps(c).length, 4);
  assert.deepEqual(barTexts(c), ['我', '3 本', '新北市', '8.7 本', '全國', '5.8 本', '台北 18–24 歲', '2.2 本']);
});

test('長條圖的四個數字跟成績單計算一樣（圖片不自己算）', () => {
  const k = card({ county: '台東縣', books: 7, age: '65+' });
  const c = content(k, book);
  assert.deepEqual(c.bars.map((b) => b.value), [k.books, k.county.perCapita, k.national.perCapita, k.peer.perCapita]);
});

test('選了範圍：「我」那一根用成績單的估計值，標「約 15 本」', () => {
  const c = content(card({ county: '新北市', range: '13+' }), book);
  assert.equal(c.bars[0].value, 15);
  assert.equal(c.bars[0].text, '約 15 本');
});

test('以最大的數字為滿格：3 本時新北 8.7 本最長；「我」3 本 ≈ 3 ÷ 8.73 ≈ 34% 長', () => {
  const [me, county, nation, peer] = barOps(content(card({ county: '新北市', books: 3 }), book));
  assert.equal(county.width, county.track);
  assert.ok(Math.abs(me.width / me.track - 3 / 8.73) < 0.01);
  assert.ok(nation.width < county.width && peer.width < nation.width);
});

test('0 本：「我」那一根長度是 0、標「0 本」，其他三根照樣畫', () => {
  const c = content(card({ county: '新北市', books: 0 }), book);
  const [me, ...others] = barOps(c);
  assert.equal(me.width, 0);
  assert.equal(c.bars[0].text, '0 本');
  for (const b of others) assert.ok(b.width > 0);
  // 語氣（CODING_STANDARDS 第 4 條）：長條圖的字只有名稱和本數，沒有責備的字眼
  assert.doesNotMatch(c.barsLabel + c.bars.map((b) => b.label + b.text).join(''), /落後|墊底|太少/);
});

test('120 本、999 本：「我」滿格不爆出圖片，其他三根仍至少看得見一小段（10 像素以上）', () => {
  for (const books of [120, 999]) {
    const [me, ...others] = barOps(content(card({ county: '新北市', books }), book));
    assert.equal(me.width, me.track, `${books} 本`);
    assert.ok(me.x + me.width <= WIDTH - 72, `${books} 本`);
    for (const b of others) assert.ok(b.width >= 10, `${books} 本：其他長條太短`);
  }
});
