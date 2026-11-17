// 章節二地圖上的縣市標籤（docs/spec-polish.md 使用者故事 42、43）：標哪幾個縣市由數據決定，標籤不能互相重疊、不能蓋住小縣市。
// 直接載入網站用的 assets/data.js、assets/taiwan-map.js 和 assets/chapter2.js，在 Node 裡呼叫計算的那一半。
//
// 手算（2025 年紙本借閱冊數 ÷ 服務轄區人口，見 county.test.mjs、ending.test.mjs）：
// - 第 1 名：新北 35,301,750 ÷ 4,044,831 ≈ 8.73 → 8.7 本
// - 台北 13,413,178 ÷ 2,439,507 ≈ 5.50 → 5.5 本，第 5 名（前面是新北、高雄 7.23、台南 6.37、台中 6.24）
// - 最後一名：連江縣約 1.67 本（嘉義縣、花蓮縣約 1.69，略高一點）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const window = {};
for (const file of ['data.js', 'taiwan-map.js', 'chapter2.js']) {
  const text = await readFile(new URL(`../assets/${file}`, import.meta.url), 'utf8');
  new Function('window', text)(window);
}
const map = window.TAIWAN_MAP;
const labelsFor = (data) => window.Chapter2Page.mapLabels(data, map, 2025);
const labels = labelsFor(window.LIBRARY_DATA);

test('地圖標出第一名、台北市、最後一名三個縣市', () => {
  assert.deepEqual(labels.map((l) => l.name), ['新北市', '台北市', '連江縣']);
  assert.deepEqual(labels.map((l) => l.lines), [
    ['新北市', '第 1 名・8.7 本'],
    ['台北市', '第 5 名・5.5 本'],
    ['連江縣', '最後一名・1.7 本'],
  ]);
});

test('標哪幾個縣市跟著數據變：台北變第一名時只標兩個', () => {
  const data = structuredClone(window.LIBRARY_DATA);
  data.counties.find((c) => c.name === '台北市').years.find((y) => y.year === 2025).perCapita = 10;
  const changed = labelsFor(data);
  assert.deepEqual(changed.map((l) => l.name), ['台北市', '連江縣']);
  assert.equal(changed[0].lines[1], '第 1 名・10.0 本');
});

// 從 path 的「M x,y L x,y … Z」取出每個縣市的外框
const bbox = (d) => {
  const pts = d.match(/-?\d+(\.\d+)?,-?\d+(\.\d+)?/g).map((p) => p.split(',').map(Number));
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
};
const overlaps = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

test('標籤都在地圖範圍內，彼此不重疊', () => {
  for (const l of labels) {
    assert.ok(l.box.x >= 0 && l.box.y >= 0, l.name);
    assert.ok(l.box.x + l.box.w <= map.width && l.box.y + l.box.h <= map.height, l.name);
  }
  for (let i = 0; i < labels.length; i++) {
    for (let j = i + 1; j < labels.length; j++) {
      assert.ok(!overlaps(labels[i].box, labels[j].box), `${labels[i].name} 和 ${labels[j].name} 重疊`);
    }
  }
});

test('標籤不蓋住小縣市（台北、基隆、新竹市、嘉義市、澎湖）和離島小框', () => {
  const small = ['台北市', '基隆市', '新竹市', '嘉義市', '澎湖縣'].map((name) => ({ name, box: bbox(map.counties.find((c) => c.name === name).d) }));
  const insets = map.counties.filter((c) => c.inset).map((c) => ({ name: c.name, box: { x: c.inset[0], y: c.inset[1], w: c.inset[2], h: c.inset[3] } }));
  for (const l of labels) {
    for (const c of [...small, ...insets]) assert.ok(!overlaps(l.box, c.box), `${l.name} 的標籤蓋住 ${c.name}`);
  }
});

test('指線從標籤邊上畫到縣市裡面', () => {
  for (const l of labels) {
    const onEdge = l.line[0] >= l.box.x && l.line[0] <= l.box.x + l.box.w && l.line[1] >= l.box.y && l.line[1] <= l.box.y + l.box.h;
    assert.ok(onEdge, `${l.name} 的指線不在標籤邊上`);
  }
});
