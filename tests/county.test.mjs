// 檢查點二・縣市細節頁：22 個縣市的網址都顯示得出內容；網址不對時顯示友善訊息。
// 直接載入網站用的 assets/data.js 和 assets/county.js，用「網址參數」呼叫頁面，看頁面要顯示什麼。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const window = {};
for (const file of ['data.js', 'county.js']) {
  const text = await readFile(new URL(`../assets/${file}`, import.meta.url), 'utf8');
  new Function('window', text)(window);
}
const page = (search) => window.CountyPage.view(window.LIBRARY_DATA, search);
const urlFor = (name) => `?county=${encodeURIComponent(name)}`;

// 規格書上的 22 縣市（獨立寫一份，不從資料讀）
const COUNTIES = [
  '基隆市', '臺北市', '新北市', '桃園市', '新竹市', '新竹縣',
  '苗栗縣', '臺中市', '彰化縣', '南投縣', '雲林縣',
  '嘉義市', '嘉義縣', '臺南市', '高雄市', '屏東縣',
  '宜蘭縣', '花蓮縣', '臺東縣',
  '澎湖縣', '金門縣', '連江縣',
];

test('22 個縣市的細節頁都有內容：名稱、2014–2025 每年的人均借閱和全國平均', () => {
  for (const name of COUNTIES) {
    const v = page(urlFor(name));
    assert.equal(v.found, true, `${name} 找不到`);
    assert.equal(v.name, name);
    assert.deepEqual(v.years.map((y) => y.year), [2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025], name);
    for (const y of v.years) {
      assert.ok(Number.isFinite(y.perCapita) && y.perCapita > 0, `${name} ${y.year} 人均 ${y.perCapita}`);
      assert.ok(Number.isFinite(y.national) && y.national > 0, `${name} ${y.year} 全國 ${y.national}`);
    }
  }
});

test('22 個縣市的名次剛好是 1 到 22', () => {
  const ranks = COUNTIES.map((name) => page(urlFor(name)).rank).sort((a, b) => a - b);
  assert.deepEqual(ranks, Array.from({ length: 22 }, (_, i) => i + 1));
});

test('新北市 2025 年約 8.7 本、第 1 名，全國平均約 5.8；臺北市約 5.5 本、低於全國平均', () => {
  const ntpc = page(urlFor('新北市'));
  assert.equal(ntpc.latest.perCapita.toFixed(1), '8.7');
  assert.equal(ntpc.latest.national.toFixed(1), '5.8');
  assert.equal(ntpc.rank, 1);
  const tpe = page(urlFor('臺北市'));
  assert.equal(tpe.latest.perCapita.toFixed(1), '5.5');
  assert.ok(tpe.latest.perCapita < tpe.latest.national);
});

test('只有新北、臺中、南投註明已扣除國立館', () => {
  const marked = COUNTIES.filter((name) => page(urlFor(name)).notes.some((n) => n.includes('國立館')));
  assert.deepEqual(marked, ['新北市', '臺中市', '南投縣']);
});

test('只有新北加上成長原因的中性註解', () => {
  const NOTE = '成長幅度明顯，原因可能包含政策推動與評比制度，本作品未深入查證';
  const marked = COUNTIES.filter((name) => page(urlFor(name)).notes.some((n) => n.includes(NOTE)));
  assert.deepEqual(marked, ['新北市']);
});

test('網址寫「台」或「臺」都找得到同一個縣市', () => {
  assert.equal(page(urlFor('台北市')).name, '臺北市');
  assert.equal(page(urlFor('台東縣')).name, '臺東縣');
});

test('網址沒有縣市、或縣市名稱不對時，顯示友善訊息', () => {
  for (const search of ['', '?county=', '?county=火星市', '?city=臺北市', '?county=%E0%A4%A']) {
    const v = page(search);
    assert.equal(v.found, false, `「${search}」不應該找得到`);
    assert.ok(v.message.length > 0, `「${search}」沒有訊息`);
  }
  assert.match(page('?county=火星市').message, /火星市/);
});
