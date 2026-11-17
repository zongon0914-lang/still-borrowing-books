// 檢查點一・借書成績單「到〇〇圖書館借這本 →」：22 縣市都有借書連結、都是 https，
// 能帶入書名的縣市，網址裡有那本書的書名（正確編碼）。
// 直接載入網站用的 assets/data.js 和 assets/scorecard.js，在 Node 裡呼叫產生連結的那一半（不碰畫面）。
// 預期的編碼是另外用 Python urllib.parse.quote(書名, safe='') 算的，再跟手查的 UTF-8 碼對過，不用程式的算法再算一次。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const window = {};
for (const file of ['data.js', 'chapter3.js', 'scorecard.js']) {
  const text = await readFile(new URL(`../assets/${file}`, import.meta.url), 'utf8');
  new Function('window', text)(window);
}
const data = window.LIBRARY_DATA;
const link = (county, title) => window.Scorecard.libraryLink(data, county, title);

const COUNTIES = [
  '基隆市', '臺北市', '新北市', '桃園市', '新竹市', '新竹縣', '苗栗縣', '臺中市',
  '彰化縣', '南投縣', '雲林縣', '嘉義市', '嘉義縣', '臺南市', '高雄市', '屏東縣',
  '宜蘭縣', '花蓮縣', '臺東縣', '澎湖縣', '金門縣', '連江縣',
];
// 只有新北市立圖書館的查詢系統找不到能帶入書名的網址（2026-11-17 核對）
const SEARCH_PAGE_ONLY = ['新北市'];

const ATOMIC = '原子習慣';
const ATOMIC_ENCODED = '%E5%8E%9F%E5%AD%90%E7%BF%92%E6%85%A3';

test('22 縣市都有圖書館名稱和 https 借書連結，標籤是「到〇〇借這本 →」', () => {
  for (const county of COUNTIES) {
    const l = link(county, ATOMIC);
    assert.ok(l, `${county} 沒有借書連結`);
    assert.match(l.name, /圖書館/, `${county} 的圖書館名稱：${l.name}`);
    assert.ok(l.url.startsWith('https://'), `${county} 的連結不是 https：${l.url}`);
    assert.doesNotThrow(() => new URL(l.url), `${county} 的連結不是合法網址`);
    assert.equal(l.label, `到${l.name}借這本 →`);
  }
  assert.equal(data.libraries.counties.length, 22);
});

test('臺北市（新版查詢系統）：一按就是《原子習慣》的查詢結果', () => {
  const l = link('臺北市', ATOMIC);
  assert.equal(l.name, '臺北市立圖書館');
  assert.equal(l.withTitle, true);
  assert.equal(l.url, `https://book.tpml.edu.tw/search?searchField=FullText&searchInput=${ATOMIC_ENCODED}`);
});

test('臺南市（舊版查詢系統）：書名帶在 k0，後面一定有 s0=0&w=0', () => {
  const l = link('臺南市', ATOMIC);
  assert.equal(l.name, '臺南市立圖書館');
  assert.equal(l.withTitle, true);
  assert.equal(l.url, `https://lib.tnml.tn.edu.tw/webpac/search.cfm?m=ss&k0=${ATOMIC_ENCODED}&t0=k&c0=and&s0=0&w=0`);
});

test('新北市只能打開館藏查詢頁，網址裡沒有書名', () => {
  const l = link('新北市', ATOMIC);
  assert.equal(l.name, '新北市立圖書館');
  assert.equal(l.withTitle, false);
  assert.equal(l.url, 'https://webpac.ntpclib.gov.tw/Miracle_rwd/');
});

test('能帶入書名的 21 個縣市：網址裡有正確編碼的書名（全形標點、& ? # / + 都不會弄壞網址）', () => {
  const cases = [
    [ATOMIC, ATOMIC_ENCODED],
    ['被罵了，怎麼辦？', '%E8%A2%AB%E7%BD%B5%E4%BA%86%EF%BC%8C%E6%80%8E%E9%BA%BC%E8%BE%A6%EF%BC%9F'],
    ['A & B?#/+', 'A%20%26%20B%3F%23%2F%2B'],
  ];
  const titled = COUNTIES.filter((c) => !SEARCH_PAGE_ONLY.includes(c));
  assert.equal(titled.length, 21);
  for (const county of titled) {
    for (const [title, encoded] of cases) {
      const l = link(county, title);
      assert.equal(l.withTitle, true, county);
      assert.ok(l.url.includes(`=${encoded}`), `${county}：${l.url}`);
      assert.doesNotMatch(l.url, /\{title\}/, `${county} 的網址還留著 {title}`);
      assert.equal(new URL(l.url).hash, '', `${county} 的書名把 # 當成網址的一部分了`);
    }
  }
});

test('不認得的縣市沒有借書連結（不會連到錯的圖書館）', () => {
  assert.equal(link('火星市', ATOMIC), null);
});
