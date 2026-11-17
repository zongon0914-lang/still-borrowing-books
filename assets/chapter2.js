// 章節二：22 縣市人均借閱地圖、排行長條
(function () {
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
    ntpcTimes: () => Math.round(valueOf(byName('新北市')) / valueOf(byName('新北市'), first.year)),
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

  box.replaceChildren(svg);
})();
