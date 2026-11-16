// 把台灣 22 縣市界線（TopoJSON）轉成網站用的 SVG 路徑，寫進 assets/taiwan-map.js。
// 用法：npm.cmd run build-map（只有地圖來源改了才需要跑）
// 來源：taiwan-atlas 1.0.0（MIT 授權）的 counties-10t.json，界線資料出自內政部國土測繪中心。
// 金門、連江離本島太遠，搬到左上角的小框裡顯示。
import { readFileSync, writeFileSync } from 'node:fs';

const topo = JSON.parse(readFileSync(new URL('./geo/counties-10t.json', import.meta.url), 'utf8'));

const WIDTH = 400; // viewBox 寬度
const COS_LAT = Math.cos((23.7 * Math.PI) / 180); // 讓經度和緯度的比例接近實際
const MIN_AREA = 2; // 面積小於這個（viewBox 單位平方）的小島略過，但每個縣市至少保留最大的一塊
const TOLERANCE = 0.5; // 簡化界線：偏離小於這個距離的點拿掉（viewBox 單位）

// 地圖範圍：本島加澎湖
const LON_MIN = 119.25, LON_MAX = 122.05, LAT_MAX = 25.35, LAT_MIN = 21.85;
const SCALE = WIDTH / ((LON_MAX - LON_MIN) * COS_LAT);
const HEIGHT = Math.round((LAT_MAX - LAT_MIN) * SCALE);

// 離島小框：只留主島附近的島（金門的烏坵太遠，略過），縮放到剛好放進框裡
const INSETS = {
  連江縣: { box: [8, 8, 92, 72] },
  金門縣: { box: [8, 88, 92, 72] },
};
const INSET_RADIUS = 100; // 離主島中心超過這個距離（viewBox 單位）的島不放進小框
const INSET_PADDING = 8;

const project = ([lon, lat]) => [(lon - LON_MIN) * COS_LAT * SCALE, (LAT_MAX - lat) * SCALE];

/** Douglas–Peucker 簡化：保留兩端點，拿掉偏離直線很小的中間點 */
function simplify(pts) {
  if (pts.length < 3) return pts;
  const [ax, ay] = pts[0], [bx, by] = pts[pts.length - 1];
  const len = Math.hypot(bx - ax, by - ay);
  let far = 0, at = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const [x, y] = pts[i];
    const dist = len ? Math.abs((bx - ax) * (ay - y) - (ax - x) * (by - ay)) / len : Math.hypot(x - ax, y - ay);
    if (dist > far) { far = dist; at = i; }
  }
  if (far <= TOLERANCE) return [pts[0], pts[pts.length - 1]];
  return [...simplify(pts.slice(0, at + 1)).slice(0, -1), ...simplify(pts.slice(at))];
}

// TopoJSON 的弧線是「差分＋量化」儲存的，先還原成經緯度、投影，再簡化。
// 相鄰縣市共用同一條弧線，所以簡化後邊界仍然對得上。
const { scale, translate } = topo.transform;
const arcs = topo.arcs.map((arc) => {
  let x = 0, y = 0;
  return simplify(arc.map(([dx, dy]) => {
    x += dx; y += dy;
    return project([x * scale[0] + translate[0], y * scale[1] + translate[1]]);
  }));
});
const arcPoints = (i) => (i >= 0 ? arcs[i] : [...arcs[~i]].reverse());
const ring = (indexes) => indexes.flatMap((i, n) => arcPoints(i).slice(n ? 1 : 0));

const area = (pts) =>
  Math.abs(pts.reduce((s, [x, y], i) => {
    const [nx, ny] = pts[(i + 1) % pts.length];
    return s + x * ny - nx * y;
  }, 0)) / 2;

const toPath = (pts) => {
  const out = [];
  for (const [x, y] of pts) {
    const p = `${x.toFixed(1)},${y.toFixed(1)}`;
    if (out[out.length - 1] !== p) out.push(p);
  }
  return `M${out.join('L')}Z`;
};

const counties = topo.objects.counties.geometries.map((g) => {
  const name = g.properties.COUNTYNAME.replace(/^台/, '臺');
  const polygons = (g.type === 'Polygon' ? [g.arcs] : g.arcs).map((rings) => rings.map(ring));

  let shapes = polygons.map((rings) => ({ rings, size: area(rings[0]) }));
  const largest = Math.max(...shapes.map((s) => s.size));
  shapes = shapes.filter((s) => s.size >= MIN_AREA || s.size === largest);

  const inset = INSETS[name];
  if (inset) {
    const center = (pts) => {
      const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
      return [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2];
    };
    const [mx, my] = center(shapes.find((s) => s.size === largest).rings[0]);
    shapes = shapes.filter((s) => {
      const [x, y] = center(s.rings[0]);
      return Math.hypot(x - mx, y - my) <= INSET_RADIUS;
    });
    const all = shapes.flatMap((s) => s.rings[0]);
    const xs = all.map((p) => p[0]), ys = all.map((p) => p[1]);
    const [cx, cy] = center(all);
    const [bx, by, bw, bh] = inset.box;
    const zoom = Math.min(
      (bw - 2 * INSET_PADDING) / (Math.max(...xs) - Math.min(...xs)),
      (bh - 2 * INSET_PADDING - 10) / (Math.max(...ys) - Math.min(...ys)), // 下方留位置寫縣市名
    );
    const move = ([x, y]) => [bx + bw / 2 + (x - cx) * zoom, by + (bh - 10) / 2 + (y - cy) * zoom];
    shapes = shapes.map((s) => ({ ...s, rings: s.rings.map((r) => r.map(move)) }));
  }

  const d = shapes.flatMap((s) => s.rings.map(toPath)).join('');
  // 標籤位置：最大那一塊的外框中心
  const main = shapes.reduce((a, b) => (b.size > a.size ? b : a)).rings[0];
  const xs = main.map((p) => p[0]), ys = main.map((p) => p[1]);
  const label = [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2].map((v) => +v.toFixed(1));
  return { name, d, label, inset: inset ? inset.box : null };
});

const out = new URL('../assets/taiwan-map.js', import.meta.url);
const header =
  '// 這個檔案由 tools/build-map.mjs 自動產生，請不要手動修改。\n' +
  '// 縣市界線：taiwan-atlas（MIT 授權），原始資料為內政部國土測繪中心。\n';
writeFileSync(out, `${header}window.TAIWAN_MAP = ${JSON.stringify({ width: WIDTH, height: HEIGHT, counties })};\n`, 'utf8');
console.log(`已寫入 assets/taiwan-map.js（${counties.length} 個縣市，寬 ${WIDTH}×高 ${HEIGHT}）`);
