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
  assert.equal(c.county.compare.text, '1.03 倍');
  assert.equal(c.national.perCapita.toFixed(2), '5.81');
  assert.equal(c.national.compare.text, '1.55 倍');
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
  assert.equal(c.county.compare.text, '還差 8.7 本');
  assert.equal(c.national.compare.times, null);
  assert.equal(c.national.compare.text, '還差 5.8 本');
  assert.doesNotMatch(JSON.stringify(c), /0(\.0+)? 倍/);
  assert.equal(c.rank.position, 23);
  assert.deepEqual(c.rank.beaten, []);
});

// 稱號表（規格使用者故事 22），一句話裡的數字手算：
// 全國人均 5.81 本：1 本差 4.8 → 再借 5 本；5 本差 0.8 → 再借 1 本
// 24 本 ÷ 12 個月 = 2；51 ÷ 12 = 4.25 → 4
// 52 ÷ 5.81 ≈ 8.96 → 抵 9 個台灣人；999 ÷ 5.81 ≈ 172.1 → 抵 172 個
test('稱號和一句話在每個邊界都正確，一句話裡的數字依輸入算出', () => {
  const expected = {
    0: ['還沒開卡的讀者', '第一本最難，我們幫你挑好了'],
    1: ['偶爾路過圖書館', '再多借 5 本，就追上全台平均'],
    5: ['偶爾路過圖書館', '再多借 1 本，就追上全台平均'],
    6: ['超越全台平均', '你比大部分台灣人都愛借書'],
    8: ['超越全台平均', '你比大部分台灣人都愛借書'],
    9: ['比冠軍新北還能借', '全台沒有一個縣市追得上你'],
    23: ['比冠軍新北還能借', '全台沒有一個縣市追得上你'],
    24: ['圖書館常駐居民', '平均每個月借 2 本以上'],
    51: ['圖書館常駐居民', '平均每個月借 4 本以上'],
    52: ['每週一本俱樂部', '你一個人抵 9 個台灣人'],
    999: ['每週一本俱樂部', '你一個人抵 172 個台灣人'],
  };
  for (const [books, [name, line]] of Object.entries(expected)) {
    const c = exact('臺中市', Number(books));
    assert.equal(c.title.name, name, `${books} 本`);
    assert.equal(c.title.line, line, `${books} 本`);
  }
});

// 2025 年人均高於 5 本的縣市（手數）：臺北 5.50、新北 8.73、桃園 5.42、臺中 6.24、臺南 6.37、高雄 7.23，共 6 個
// 人均最低的 4 個：連江 1.67、花蓮 1.69、嘉義縣 1.69、宜蘭 1.79；第 5 低是基隆 2.58
test('名次：剛好等於某縣市人均時，不算贏也不算輸', () => {
  // 把雲林（4.93）改成剛好 5 本，其他照舊
  const data = structuredClone(window.LIBRARY_DATA);
  data.counties.find((c) => c.name === '雲林縣').years.find((y) => y.year === 2025).perCapita = 5;
  const c = card({ county: '雲林縣', age: '18-24', books: 5 }, data);
  assert.equal(c.rank.position, 7);
  assert.equal(c.rank.beaten.length, 15); // 22 − 6 個比你高 − 雲林平手
  assert.ok(!c.rank.beaten.includes('雲林縣'));
  assert.equal(c.county.compare.text, '1.00 倍');
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
  assert.equal(c.county.compare.text, '1.03 倍');
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
