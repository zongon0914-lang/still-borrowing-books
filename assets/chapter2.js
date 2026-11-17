// 章節二：22 縣市人均借閱地圖、排行長條
// mapLabels() 只負責「地圖上標哪幾個縣市、標籤放哪裡」，不碰畫面，所以可以在 Node 裡測試（tests/chapter2.test.mjs）；
// 後半才畫地圖和長條。
(function () {
  // ---------- 地圖標籤：第一名、台北市、最後一名 ----------
  const TAIPEI = '台北市';
  /** 標籤字的大小（viewBox 單位）：地圖寬 400，手機上大約縮成 0.65 倍，第一行約 11px */
  const NAME_SIZE = 17;
  const DETAIL_SIZE = 14;
  const LINE_GAP = 3;
  const PAD = 4; // 標籤外框留白，也是標籤之間最少的距離

  /** 「M1,2L3,4Z M…」→ 每一塊的點 [[x, y], …] */
  const ringsOf = (d) =>
    d.split('M').filter(Boolean).map((part) => part.replace(/Z/g, '').split('L').map((pt) => pt.split(',').map(Number)));
  const bboxOf = (pts) => {
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
  };
  const overlaps = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
  const inside = ([x, y], ring) => {
    let hit = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i], [xj, yj] = ring[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
    }
    return hit;
  };
  /** 字寬估計：中文一個字一格，數字、空白、小數點大約 0.6 格 */
  const textWidth = (text, size) => [...text].reduce((w, ch) => w + (ch.charCodeAt(0) < 256 ? 0.6 : 1) * size, 0);

  /** 縣市裡面離邊界最遠的一點（在格子上找），指線指到這裡，才不會指到隔壁縣市（例如新北包住台北） */
  function innerPoint(rings, others) {
    const area = (r) => bboxOf(r).w * bboxOf(r).h;
    const main = rings.reduce((a, b) => (area(b) > area(a) ? b : a));
    const box = bboxOf(main);
    const all = rings.flat();
    let best = null;
    for (let i = 1; i < 12; i++) {
      for (let j = 1; j < 12; j++) {
        const p = [box.x + (box.w * i) / 12, box.y + (box.h * j) / 12];
        if (!inside(p, main) || others.some((ring) => inside(p, ring))) continue;
        const dist = Math.min(...all.map(([x, y]) => Math.hypot(x - p[0], y - p[1])));
        if (!best || dist > best.dist) best = { p, dist };
      }
    }
    return (best ? best.p : [box.x + box.w / 2, box.y + box.h / 2]).map((v) => +v.toFixed(1));
  }

  /**
   * @param {object} data window.LIBRARY_DATA
   * @param {object} map window.TAIWAN_MAP
   * @param {number} year 用哪一年的人均借閱排名
   * @returns 每個標籤：{ name, rank, value, role, lines, box: {x, y, w, h}, anchor: [x, y], line: [x, y], sizes, pad }
   */
  function mapLabels(data, map, year) {
    const valueOf = (c) => c.years.find((y) => y.year === year).perCapita;
    const ranked = [...data.counties].sort((a, b) => valueOf(b) - valueOf(a));
    const picks = [
      { county: ranked[0], role: '第 1 名' },
      { county: ranked.find((c) => c.name === TAIPEI), role: null },
      { county: ranked[ranked.length - 1], role: '最後一名' },
    ].filter((p, i, all) => p.county && all.findIndex((q) => q.county === p.county) === i);

    const shapes = map.counties.map((c) => ({ ...c, rings: ringsOf(c.d) }));
    const allPoints = shapes.flatMap((c) => c.rings.flat());
    // 不能被標籤蓋住的：離島小框，和面積小的縣市（台北、基隆、新竹市、嘉義市、澎湖…）
    const keepClear = [
      ...shapes.filter((c) => c.inset).map((c) => {
        const [x, y, w, h] = c.inset;
        return { name: c.name, box: { x, y, w, h } };
      }),
      ...shapes
        .filter((c) => !c.inset)
        .map((c) => ({ name: c.name, box: bboxOf(c.rings.flat()) }))
        .filter((c) => c.box.w * c.box.h < 40 * 40),
    ];

    // 離島小框裡的縣市先放（旁邊能放的位置最少），其他照第一名、台北、最後一名的順序
    const order = (p) => (shapes.find((c) => c.name === p.county.name).inset ? 0 : 1);
    const placed = [];
    const labels = [...picks].sort((a, b) => order(a) - order(b)).map(({ county, role }) => {
      const rank = ranked.indexOf(county) + 1;
      const value = valueOf(county).toFixed(1);
      const lines = [county.name, `${role || `第 ${rank} 名`}・${value} 本`];
      const w = Math.max(textWidth(lines[0], NAME_SIZE), textWidth(lines[1], DETAIL_SIZE)) + 2 * PAD;
      const h = NAME_SIZE + DETAIL_SIZE + LINE_GAP + 2 * PAD;
      const shape = shapes.find((c) => c.name === county.name);
      const others = shapes.filter((c) => c !== shape).flatMap((c) => c.rings);
      const anchor = shape.inset
        ? [shape.inset[0] + shape.inset[2] / 2, shape.inset[1] + shape.inset[3] / 2]
        : innerPoint(shape.rings, others);
      const own = shape.inset ? { x: shape.inset[0], y: shape.inset[1], w: shape.inset[2], h: shape.inset[3] } : null;

      // 候選位置：繞著縣市一圈、由近到遠；選「蓋到最少陸地」又最近的那個
      let best = null;
      for (const dist of [24, 40, 56, 72, 90, 110, 130, 150]) {
        for (let k = 0; k < 16; k++) {
          const angle = (Math.PI * 2 * k) / 16;
          const box = { x: anchor[0] + Math.cos(angle) * dist - w / 2, y: anchor[1] + Math.sin(angle) * dist - h / 2, w, h };
          if (box.x < 0 || box.y < 0 || box.x + w > map.width || box.y + h > map.height) continue;
          if (placed.some((b) => overlaps(b, { x: box.x - PAD, y: box.y - PAD, w: w + 2 * PAD, h: h + 2 * PAD }))) continue;
          if (keepClear.some((c) => c.name !== county.name && overlaps(c.box, box))) continue;
          if (own && overlaps(own, box)) continue;
          const land = allPoints.filter(([x, y]) => x > box.x && x < box.x + w && y > box.y && y < box.y + h).length;
          const score = land * 2 + dist;
          if (!best || score < best.score) best = { box, score };
        }
      }
      const box = best ? best.box : { x: anchor[0] - w / 2, y: anchor[1] - h / 2, w, h };
      placed.push(box);
      // 指線從標籤外框上離縣市最近的一點畫到縣市
      const line = [
        Math.min(Math.max(anchor[0], box.x), box.x + box.w),
        Math.min(Math.max(anchor[1], box.y), box.y + box.h),
      ].map((v) => +v.toFixed(1));
      const round = (b) => ({ x: +b.x.toFixed(1), y: +b.y.toFixed(1), w: +b.w.toFixed(1), h: +b.h.toFixed(1) });
      return { name: county.name, rank, value, role, lines, box: round(box), anchor, line, sizes: [NAME_SIZE, DETAIL_SIZE], pad: PAD };
    });
    return picks.map((p) => labels.find((l) => l.name === p.county.name));
  }

  /**
   * 「變成幾倍」的說法：差一點點到整數時說「將近 4 倍」，剛好是整數說「約 4 倍」，其他寫一位小數「約 4.3 倍」。
   * 不會把 4.3 倍說成「將近 4 倍」。
   */
  function timesText(ratio) {
    const n = Math.round(ratio);
    if (n > ratio && n - ratio < 0.15) return `將近 ${n} 倍`;
    if (Math.abs(ratio - n) < 0.05) return `約 ${n} 倍`;
    return `約 ${ratio.toFixed(1)} 倍`;
  }

  window.Chapter2Page = { mapLabels, timesText };

  if (typeof document === 'undefined' || !window.Site) return; // Node 測試，或數據檔沒載入

  const { data, fillStats, drawWhenSeen, revealOnMobile, latest, first } = window.Site;
  const map = window.TAIWAN_MAP;

  const YEAR = latest.year;
  const valueOf = (county, year = YEAR) => county.years.find((y) => y.year === year).perCapita;
  const countyUrl = (name) => `county.html?county=${encodeURIComponent(name)}`;
  const fmt = (v) => v.toFixed(1);

  const ranked = [...data.counties].sort((a, b) => valueOf(b) - valueOf(a));
  const byName = (name) => data.counties.find((c) => c.name === name);
  const rankOf = (name) => ranked.findIndex((c) => c.name === name) + 1;

  fillStats({
    year: () => YEAR,
    firstYear: () => first.year,
    topName: () => ranked[0].name,
    topValue: () => fmt(valueOf(ranked[0])),
    secondName: () => ranked[1].name,
    secondValue: () => fmt(valueOf(ranked[1])),
    taipeiValue: () => fmt(valueOf(byName('台北市'))),
    taipeiRank: () => rankOf('台北市'),
    nationalValue: () => fmt(latest.printPerCapita),
    ntpcFirst: () => fmt(valueOf(byName('新北市'), first.year)),
    ntpcLatest: () => fmt(valueOf(byName('新北市'))),
    ntpcTimes: () => window.Chapter2Page.timesText(valueOf(byName('新北市')) / valueOf(byName('新北市'), first.year)),
  });

  // ---------- 顏色分級：每 2 本一級，地圖和長條圖共用 ----------
  const BINS = [
    { min: 8, label: '8 本以上' },
    { min: 6, label: '6–8 本' },
    { min: 4, label: '4–6 本' },
    { min: 2, label: '2–4 本' },
    { min: 0, label: '2 本以下' },
  ];
  const binOf = (v) => BINS.length - 1 - BINS.findIndex((b) => v >= b.min); // 0 = 最淺，4 = 最深
  const binClass = (v) => `bin-${binOf(v)}`;

  document.getElementById('map-legend').innerHTML = BINS.map(
    (b) => `<li><span class="swatch ${binClass(b.min)}"></span>${b.label}</li>`,
  ).join('');

  // ---------- 排行長條 ----------
  const maxValue = valueOf(ranked[0]);
  const pct = (v) => ((v / maxValue) * 100).toFixed(1);
  const bars = document.getElementById('rank-bars');
  bars.style.setProperty('--avg', `${pct(latest.printPerCapita)}%`);
  bars.innerHTML = ranked
    .map((c) => {
      const v = valueOf(c);
      const note = c.excludesNationalLibrary ? '<span class="rank-bars__note">不含國立館</span>' : '';
      return `<li data-county="${c.name}">
        <a class="rank-bars__name" href="${countyUrl(c.name)}">${c.name}</a>
        <span class="rank-bars__track"><span class="rank-bars__bar ${binClass(v)}" style="width:${pct(v)}%"></span></span>
        <span class="rank-bars__value">${fmt(v)}${note}</span>
      </li>`;
    })
    .join('');

  // 捲動動畫：先把長條縮到 0（is-waiting），捲到時依名次一條一條長出來（is-growing，延遲看 --i）。
  // 減少動態效果、沒有 IntersectionObserver：馬上拿掉 is-waiting，長條直接完整（沒 JS 時本來就完整）。
  bars.querySelectorAll('li').forEach((li, i) => li.style.setProperty('--i', i));
  bars.classList.add('is-waiting');
  drawWhenSeen(
    bars,
    () => bars.classList.replace('is-waiting', 'is-growing'),
    () => bars.classList.remove('is-waiting'),
  );

  // ---------- 地圖 ----------
  const box = document.getElementById('county-map');
  if (!map) return; // 地圖檔沒載入：保留提示文字，下方縣市列表照樣能用

  const SVG = 'http://www.w3.org/2000/svg';
  const ISLANDS = ['澎湖縣', '金門縣', '連江縣']; // 由小島組成，加深外框才看得到
  const el = (tag, attrs = {}) => {
    const node = document.createElementNS(SVG, tag);
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
    return node;
  };

  const svg = el('svg', {
    viewBox: `0 0 ${map.width} ${map.height}`,
    class: 'county-map',
    role: 'group',
    'aria-label': `${YEAR} 年台灣 22 縣市人均借閱地圖，顏色越深代表借得越多`,
  });

  // 離島小框
  for (const c of map.counties) {
    if (!c.inset) continue;
    const [x, y, w, h] = c.inset;
    svg.append(el('rect', { x, y, width: w, height: h, class: 'county-map__inset', rx: 3 }));
    const caption = el('text', { x: x + 4, y: y + h - 5, class: 'county-map__inset-label' });
    caption.textContent = c.name;
    svg.append(caption);
  }

  const readout = document.getElementById('map-readout');
  let selected = null;

  function show(name) {
    const c = byName(name);
    readout.innerHTML =
      `<strong>${name}</strong>：每人 <strong>${fmt(valueOf(c))}</strong> 本（第 ${rankOf(name)} 名）` +
      (c.excludesNationalLibrary ? '<br><small>已扣除國立館</small>' : '') +
      `<br><a href="${countyUrl(name)}">看 ${name} ${first.year}–${YEAR} 年的變化 →</a>`;
    svg.querySelectorAll('.is-active').forEach((n) => n.classList.remove('is-active'));
    svg.querySelector(`[data-county="${name}"]`)?.classList.add('is-active');
    bars.querySelectorAll('.is-active').forEach((n) => n.classList.remove('is-active'));
    bars.querySelector(`[data-county="${name}"]`)?.classList.add('is-active');
  }

  for (const shape of map.counties) {
    const c = byName(shape.name);
    if (!c) continue;
    const v = valueOf(c);
    const link = el('a', {
      href: countyUrl(c.name),
      'data-county': c.name,
      class: `county-map__county${ISLANDS.includes(c.name) ? ' is-island' : ''}`,
      'aria-label': `${c.name}，每人 ${fmt(v)} 本，第 ${rankOf(c.name)} 名`,
    });
    const path = el('path', { d: shape.d, class: binClass(v) });
    const title = el('title');
    title.textContent = `${c.name}：${fmt(v)} 本`;
    path.append(title);
    link.append(path);

    link.addEventListener('mouseenter', () => show(c.name));
    link.addEventListener('focus', () => show(c.name));
    // 觸控：第一次點先顯示數字，第二次點才進入細節頁
    link.addEventListener('click', (e) => {
      if (matchMedia('(hover: none)').matches && selected !== c.name) {
        e.preventDefault();
        selected = c.name;
        show(c.name);
        revealOnMobile(readout); // 手機上地圖下面才是數字，點了要捲過去才看得到
      }
    });
    svg.append(link);
  }

  // 標出第一名、台北市、最後一名（標籤不接收點擊，點了會穿過去到下面的縣市）
  const labelLayer = el('g', { class: 'county-map__labels', 'aria-hidden': 'true' });
  for (const l of window.Chapter2Page.mapLabels(data, map, YEAR)) {
    labelLayer.append(el('line', { x1: l.line[0], y1: l.line[1], x2: l.anchor[0], y2: l.anchor[1], class: 'county-map__leader' }));
    labelLayer.append(el('circle', { cx: l.anchor[0], cy: l.anchor[1], r: 2.2, class: 'county-map__dot' }));
    labelLayer.append(el('rect', { x: l.box.x, y: l.box.y, width: l.box.w, height: l.box.h, rx: 3, class: 'county-map__label-bg' }));
    const [nameSize, detailSize] = l.sizes;
    l.lines.forEach((text, i) => {
      const t = el('text', {
        x: l.box.x + l.box.w / 2,
        y: l.box.y + l.pad + (i === 0 ? nameSize * 0.88 : nameSize + 3 + detailSize * 0.88),
        class: i === 0 ? 'county-map__label-name' : 'county-map__label-detail',
        'font-size': i === 0 ? nameSize : detailSize,
      });
      t.textContent = text;
      labelLayer.append(t);
    });
  }
  svg.append(labelLayer);

  box.replaceChildren(svg);
})();
