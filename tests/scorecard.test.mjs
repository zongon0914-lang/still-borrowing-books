// 檢查點一・借書成績單計算：給縣市、年齡層、借書量，成績單的數字和文字對不對。
// 直接載入網站用的 assets/data.js 和 assets/scorecard.js，在 Node 裡呼叫計算的那一半（不碰畫面）。
// 預期答案來自手算（2025 年原始數據）和規格 docs/spec-scorecard.md，不用程式的算法再算一次。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const window = {};
for (const file of ['data.js', 'chapter3.js', 'scorecard.js']) {
  const text = await readFile(new URL(`../assets/${file}`, import.meta.url), 'utf8');
  new Function('window', text)(window);
}
const card = (input, data = window.LIBRARY_DATA) => window.Scorecard.compute(data, input);
const exact = (county, books, age = '18-24') => card({ county, age, books });

// 2025 年手算（原始數據）：
// 新北市 35,301,750 冊 ÷ 4,044,831 人 ≈ 8.73 本；全國 135,251,757 冊 ÷ 23,299,132 人 ≈ 5.81 本
// 9 本 ÷ 8.73 ≈ 1.03 倍；9 本 ÷ 5.81 ≈ 1.55 倍
test('新北、9 本：約新北人均的 1.03 倍、全國的 1.55 倍，排第 1 名，稱號「比冠軍新北還能借」', () => {
  const c = exact('新北市', 9);
  assert.equal(c.ok, true);
  assert.equal(c.year, 2025);
  assert.equal(c.county.name, '新北市');
  assert.equal(c.county.perCapita.toFixed(2), '8.73');
  assert.equal(c.county.compare.text, '是它的 1.03 倍');
  assert.equal(c.county.compare.strong, '1.03 倍');
  assert.equal(c.national.perCapita.toFixed(2), '5.81');
  assert.equal(c.national.compare.text, '是它的 1.55 倍');
  assert.equal(c.rank.position, 1);
  assert.equal(c.rank.of, 23); // 22 個縣市加上你
  assert.equal(c.rank.beaten.length, 22); // 9 本 > 新北 8.73 本，22 個縣市全贏
  assert.ok(c.rank.beaten.includes('新北市'));
  assert.equal(c.title.name, '比冠軍新北還能借');
  assert.equal(c.title.line, '全台沒有一個縣市追得上你');
  assert.equal(c.estimated, false);
});

// 0 本：新北人均 8.73 → 還差 8.7 本；全國 5.81 → 還差 5.8 本
test('0 本：稱號「還沒開卡的讀者」，比較都是「還差幾本」，沒有「0 倍」，排最後一名', () => {
  const c = exact('新北市', 0);
  assert.equal(c.title.name, '還沒開卡的讀者');
  assert.equal(c.title.line, '第一本最難，我們幫你挑好了');
  assert.equal(c.county.compare.times, null);
  assert.equal(c.county.compare.text, '還差 8.7 本就追上');
  assert.equal(c.county.compare.strong, '還差 8.7 本');
  assert.equal(c.national.compare.times, null);
  assert.equal(c.national.compare.text, '還差 5.8 本就追上');
  assert.doesNotMatch(JSON.stringify(c), /0(\.0+)? 倍/);
  assert.equal(c.rank.position, 23);
  assert.deepEqual(c.rank.beaten, []);
});

// 稱號表（規格使用者故事 22），一句話裡的數字手算：
// 全國人均 135,251,757 ÷ 23,299,132 ≈ 5.805 本：一句話的數字跟成績單「跟全國比」那一列一樣，不灌水
// 1 本差 4.805 → 4.8；3 本差 2.805 → 2.8；5 本差 0.805 → 0.8（跟列上的「還差 X 本」相同，不無條件進位）
// 24 本 ÷ 12 個月 = 2；51 ÷ 12 = 4.25 → 4
// 52 ÷ 5.805 ≈ 8.96 倍 → 只說「抵 8 個」（說 9 個就灌水了）；999 ÷ 5.805 ≈ 172.09 → 抵 172 個
test('稱號和一句話在每個邊界都正確，一句話裡的數字依輸入算出', () => {
  const expected = {
    0: ['還沒開卡的讀者', '第一本最難，我們幫你挑好了'],
    1: ['偶爾路過圖書館', '再多借 4.8 本，就追上全台平均'],
    3: ['偶爾路過圖書館', '再多借 2.8 本，就追上全台平均'],
    5: ['偶爾路過圖書館', '再多借 0.8 本，就追上全台平均'],
    6: ['超越全台平均', '你比大部分台灣人都愛借書'],
    8: ['超越全台平均', '你比大部分台灣人都愛借書'],
    9: ['比冠軍新北還能借', '全台沒有一個縣市追得上你'],
    23: ['比冠軍新北還能借', '全台沒有一個縣市追得上你'],
    24: ['圖書館常駐居民', '平均每個月借 2 本以上'],
    51: ['圖書館常駐居民', '平均每個月借 4 本以上'],
    52: ['每週一本俱樂部', '你一個人抵 8 個台灣人'],
    999: ['每週一本俱樂部', '你一個人抵 172 個台灣人'],
  };
  for (const [books, [name, line]] of Object.entries(expected)) {
    const c = exact('台中市', Number(books));
    assert.equal(c.title.name, name, `${books} 本`);
    assert.equal(c.title.line, line, `${books} 本`);
  }
});

// 2025 年人均高於 5 本的縣市（手數）：台北 5.50、新北 8.73、桃園 5.42、台中 6.24、台南 6.37、高雄 7.23，共 6 個
// 人均最低的 4 個：連江 1.67、花蓮 1.69、嘉義縣 1.69、宜蘭 1.79；第 5 低是基隆 2.58
test('名次：剛好等於某縣市人均時，不算贏也不算輸', () => {
  // 把雲林（4.93）改成剛好 5 本，其他照舊
  const data = structuredClone(window.LIBRARY_DATA);
  data.counties.find((c) => c.name === '雲林縣').years.find((y) => y.year === 2025).perCapita = 5;
  const c = card({ county: '雲林縣', age: '18-24', books: 5 }, data);
  assert.equal(c.rank.position, 7);
  assert.equal(c.rank.beaten.length, 15); // 22 − 6 個比你高 − 雲林平手
  assert.ok(!c.rank.beaten.includes('雲林縣'));
  assert.equal(c.county.compare.text, '跟它差不多'); // 剛好一樣：不說「1.00 倍」
});

test('名次：比所有縣市都少時排最後一名（第 23 名）；2 本贏過人均最低的 4 個縣市', () => {
  const last = exact('連江縣', 1);
  assert.equal(last.rank.position, 23);
  assert.deepEqual(last.rank.beaten, []);
  const two = exact('連江縣', 2);
  assert.equal(two.rank.position, 19);
  assert.deepEqual([...two.rank.beaten].sort(), ['宜蘭縣', '花蓮縣', '連江縣', '嘉義縣'].sort());
});

// 規格：大概 0 → 0 本、1–5 → 3 本、6–12 → 9 本、13 本以上 → 15 本
test('選「大概的範圍」時用代表值計算，並標示為估算', () => {
  const c = card({ county: '新北市', age: '18-24', range: '6-12' });
  assert.equal(c.ok, true);
  assert.equal(c.books, 9);
  assert.equal(c.estimated, true);
  assert.equal(c.title.name, '比冠軍新北還能借');
  assert.equal(c.county.compare.text, '是它的 1.03 倍');
  assert.equal(card({ county: '新北市', age: '18-24', range: '0' }).books, 0);
  assert.equal(card({ county: '新北市', age: '18-24', range: '1-5' }).books, 3);
  assert.equal(card({ county: '新北市', age: '18-24', range: '13+' }).books, 15);
  assert.equal(exact('新北市', 9).estimated, false);
});

test('輸入有誤：借書量不是 0–999 的整數、縣市或年齡層不存在，都不產生成績單，並說明原因', () => {
  const bad = [
    { county: '新北市', age: '18-24', books: -1 },
    { county: '新北市', age: '18-24', books: 1000 },
    { county: '新北市', age: '18-24', books: 2.5 },
    { county: '新北市', age: '18-24', books: '2.5' },
    { county: '新北市', age: '18-24', books: 'abc' },
    { county: '新北市', age: '18-24', books: '' },
    { county: '新北市', age: '18-24', books: NaN },
    { county: '新北市', age: '18-24' }, // 沒填也沒選範圍
    { county: '新北市', age: '18-24', range: '100+' },
    { county: '台北縣', age: '18-24', books: 9 },
    { county: '', age: '18-24', books: 9 },
    { county: '__proto__', age: '18-24', books: 9 },
    { county: '新北市', age: '30', books: 9 },
    { county: '新北市', age: 'toString', books: 9 },
  ];
  for (const input of bad) {
    const c = card(input);
    assert.equal(c.ok, false, JSON.stringify(input));
    assert.ok(c.message.length > 0, `${JSON.stringify(input)} 沒有說明原因`);
    assert.equal(c.county, undefined, `${JSON.stringify(input)} 不該產生成績單`);
  }
  assert.match(card(bad[1]).message, /999/);
  assert.match(card(bad[9]).message, /台北縣/);
});

test('從表單來的文字數字也接受（前後空白不影響）；年齡層和縣市都可用', () => {
  assert.equal(card({ county: '新北市', age: '18-24', books: ' 9 ' }).books, 9);
  assert.equal(card({ county: '新北市', age: '65+', books: '0' }).ok, true);
  const AGES = ['0-5', '6-11', '12-17', '18-24', '25-34', '35-44', '45-54', '55-64', '65+'];
  for (const age of AGES) assert.equal(card({ county: '澎湖縣', age, books: 3 }).ok, true, age);
  assert.equal(card({ county: '新北市', age: '18-24', books: 9 }).ageLabel, '18–24 歲');
});

// 推薦書候選（規格使用者故事 24、28）：各年齡層 2024 年「不分性別」借閱冊數前三類，手查數據排出來：
const TOP3 = {
  '0-5': ['語言文學', '學齡前', '自然科學'],
  '6-11': ['語言文學', '自然科學', '藝術'],
  '12-17': ['語言文學', '藝術', '自然科學'],
  '18-24': ['語言文學', '社會科學', '應用科學'],
  '25-34': ['語言文學', '應用科學', '社會科學'],
  '35-44': ['語言文學', '應用科學', '社會科學'],
  '45-54': ['語言文學', '社會科學', '應用科學'],
  '55-64': ['語言文學', '應用科學', '藝術'],
  '65+': ['語言文學', '應用科學', '藝術'],
};
test('推薦書候選：9 個年齡層都不是空的，每本書都屬於該年齡層最常借的前三類，三類的書單都合進來', () => {
  for (const [age, top3] of Object.entries(TOP3)) {
    const r = card({ county: '新北市', age, books: 3 }).recommend;
    assert.deepEqual(r.categories, top3, age);
    assert.equal(r.books.length, 30, `${age}：三類各 10 本`);
    for (const b of r.books) {
      assert.ok(top3.includes(b.category), `${age}：${b.title} 屬於 ${b.category}`);
      assert.ok(b.title && b.author, `${age}：書名和作者都要有`);
    }
    for (const name of top3) assert.ok(r.books.some((b) => b.category === name), `${age} 缺 ${name}`);
  }
  // 語言文學第一名、學齡前第一名都在 0–5 歲的候選裡（手查書單）
  const little = card({ county: '新北市', age: '0-5', books: 0 }).recommend.books.map((b) => b.title);
  assert.ok(little.includes('小老鼠愛數學'));
});

test('0 本也有推薦書；連到年齡工具的網址帶入讀者的年齡層', () => {
  const zero = card({ county: '連江縣', age: '18-24', books: 0 });
  assert.ok(zero.recommend.books.length > 0);
  assert.equal(zero.recommend.ageUrl, 'age.html?age=18-24');
  assert.equal(card({ county: '新北市', age: '65+', range: '0' }).recommend.ageUrl, 'age.html?age=65%2B');
});

// 跟台北同齡人比（2024 年）。18–24 歲手算：
// 借閱冊數（北市圖年刊年度統計-9）：女 179,054 + 男 138,570 = 317,624 冊
// 人口（內政部 113 年 12 月，台北市 456 里加總）：18 歲 19,201 + 19 歲 18,593 + 20 歲 19,100 + 21 歲 19,551
//   + 22 歲 21,182 + 23 歲 21,749 + 24 歲 26,316 = 145,692 人
// 317,624 ÷ 145,692：145,692 × 2 = 291,384，餘 26,240；26,240 ÷ 145,692 ≈ 0.180 → 約 2.18 本
// 9 本 ÷ 2.18 ≈ 4.13 倍；0 本還差 2.2 本
test('跟台北同齡人比：18–24 歲台北 2024 年平均每人借約 2.18 本，9 本是它的 4.13 倍，0 本還差 2.2 本', () => {
  const c = exact('新北市', 9);
  assert.equal(c.peer.year, 2024);
  assert.equal(c.peer.city, '台北市');
  assert.equal(c.peer.age, '18-24');
  assert.equal(c.peer.loans, 317624);
  assert.equal(c.peer.population, 145692);
  assert.equal(c.peer.perCapita.toFixed(2), '2.18');
  assert.equal(c.peer.compare.text, '是它的 4.13 倍');
  assert.equal(exact('新北市', 0).peer.compare.text, '還差 2.2 本就追上');
});

// 台北 2024 年底各年齡層人口（內政部 113 年 12 月，人工逐歲加總核對過）；65+ 含 100 歲以上 1,125 人。
// 9 組合計 2,490,869 = 台北市 456 里「人口數合計」加總。
const TAIPEI_POPULATION = {
  '0-5': 97752, '6-11': 136839, '12-17': 129544, '18-24': 145692, '25-34': 284291,
  '35-44': 367072, '45-54': 384065, '55-64': 371156, '65+': 574458,
};
test('同齡人人均借閱：9 個年齡層都有，人口跟人工加總一樣，每人平均借閱大於 0', () => {
  let total = 0;
  for (const [age, population] of Object.entries(TAIPEI_POPULATION)) {
    const peer = card({ county: '台北市', age, books: 3 }).peer;
    assert.equal(peer.population, population, age);
    assert.ok(peer.perCapita > 0 && Number.isFinite(peer.perCapita), `${age}：${peer.perCapita}`);
    total += population;
  }
  assert.equal(total, 2490869);
  assert.equal(window.LIBRARY_DATA.age.population.total, 2490869);
});

// 先四捨五入再決定說法：25–34 歲台北 2024 年人均 = （女 604,713 + 男 255,436 =）860,149 冊 ÷ 284,291 人 ≈ 3.026 本（列上顯示 3.0），
// 3 本只差 0.026，四捨五入後是 0.0 本，不能說「還差 0.0 本」；澎湖 2025 年人均 ≈ 3.018 本，3 本也是一樣。
// 反過來，多一點點（例如 5.01 本 vs 5 本 = 1.002 倍）四捨五入是 1.00 倍，也不能說「1.00 倍」。
test('差距四捨五入後是 0 時說「跟它差不多」，不會出現「還差 0.0 本」或「1.00 倍」', () => {
  const c = card({ county: '澎湖縣', age: '25-34', books: 3 });
  assert.equal(c.peer.perCapita.toFixed(1), '3.0');
  assert.equal(c.peer.compare.text, '跟它差不多');
  assert.equal(c.county.compare.text, '跟它差不多');
  assert.equal(card({ county: '台北市', age: '25-34', range: '1-5' }).peer.compare.text, '跟它差不多');
  assert.doesNotMatch(JSON.stringify(c), /0\.0 本|1\.00 倍/);

  const data = structuredClone(window.LIBRARY_DATA);
  data.counties.find((x) => x.name === '雲林縣').years.find((y) => y.year === 2025).perCapita = 4.99;
  assert.equal(card({ county: '雲林縣', age: '18-24', books: 5 }, data).county.compare.text, '跟它差不多');
  // 差 0.05 以上就照常說
  data.counties.find((x) => x.name === '雲林縣').years.find((y) => y.year === 2025).perCapita = 5.1;
  assert.equal(card({ county: '雲林縣', age: '18-24', books: 5 }, data).county.compare.text, '還差 0.1 本就追上');
});

test('名次：一個縣市都還沒贏過時，成績單附上鼓勵的話', () => {
  assert.match(exact('新北市', 0).rank.cheer, /借一本就有機會/);
  assert.equal(exact('新北市', 9).rank.cheer, null);
});

// 稱號門檻是固定的整數，靠的是數據：全國 2025 年人均約 5.805 本、冠軍新北約 8.73 本。
// 數據更新後門檻不再成立時，這個測試會失敗，提醒要改稱號表。
test('稱號門檻跟數據對得上：「超越全台平均」從剛超過全國人均開始，「比冠軍新北還能借」從剛超過新北開始，而且新北是第一名', () => {
  const titleAt = (books) => exact('台中市', books).title.name;
  const firstBooks = (name) => { for (let b = 0; b < 100; b++) if (titleAt(b) === name) return b; return null; };
  const d = window.LIBRARY_DATA;
  const national = d.national.find((r) => r.year === 2025).printPerCapita;
  const per = d.counties.map((c) => ({ name: c.name, v: c.years.find((y) => y.year === 2025).perCapita }));
  const top = per.reduce((a, b) => (b.v > a.v ? b : a));
  assert.equal(top.name, '新北市');

  const aboveNational = firstBooks('超越全台平均');
  assert.ok(aboveNational - 1 < national && national < aboveNational, `全國人均 ${national} 應落在 ${aboveNational - 1}～${aboveNational} 本之間`);
  const aboveTop = firstBooks('比冠軍新北還能借');
  assert.ok(aboveTop - 1 < top.v && top.v < aboveTop, `新北人均 ${top.v} 應落在 ${aboveTop - 1}～${aboveTop} 本之間`);
  assert.equal(exact('台中市', aboveTop).rank.position, 1);
  assert.equal(exact('台中市', aboveTop - 1).rank.position, 2);
});
