// 縣市細節頁：一個頁面範本，靠網址參數 ?county=縣市名稱 決定顯示哪個縣市。
// view() 只負責「這個網址要顯示什麼」，不碰畫面，所以可以在 Node 裡測試（tests/county.test.mjs）；
// render() 才把結果畫到頁面上。
(function () {
  const NTPC_NOTE = '成長幅度明顯，原因可能包含政策推動與評比制度，本作品未深入查證。';
  const NATIONAL_LIBRARY_NOTE =
    '已扣除國立館：這個縣市境內有國立的公共圖書館，服務的是全國讀者，所以這裡的數字一律用「不含國立館」計算。';

  /**
   * @param {object} data window.LIBRARY_DATA
   * @param {string} search 網址的 ?… 部分，例如 location.search
   */
  function view(data, search) {
    const raw = (new URLSearchParams(search).get('county') || '').trim();
    if (!raw) {
      return { found: false, message: '網址裡沒有指定縣市。請從章節二的地圖或排行選一個縣市。' };
    }
    const name = raw.replace(/\u81fa/g, '台'); // 縣市名稱一律寫「台」；舊網址用的舊字（U+81FA）也換成「台」，以前分享的連結照樣打得開
    const county = data.counties.find((c) => c.name === name);
    if (!county) {
      return { found: false, message: `找不到「${raw}」這個縣市。請從章節二的地圖或排行重新選一個縣市。` };
    }

    const nationalOf = (year) => data.national.find((r) => r.year === year).printPerCapita;
    const years = county.years.map((y) => ({ year: y.year, perCapita: y.perCapita, national: nationalOf(y.year) }));
    const latest = years[years.length - 1];
    const first = years[0];
    const latestOf = (c) => c.years.find((y) => y.year === latest.year).perCapita;
    const rank = data.counties.filter((c) => latestOf(c) > latest.perCapita).length + 1;

    const notes = [];
    if (county.excludesNationalLibrary) notes.push(NATIONAL_LIBRARY_NOTE);
    if (county.name === '新北市') notes.push(NTPC_NOTE);

    return { found: true, name: county.name, years, latest, first, rank, total: data.counties.length, notes };
  }

  window.CountyPage = { view };

  if (typeof document === 'undefined') return; // 在 Node 測試裡：到這裡就好

  // ---------- 畫到頁面上 ----------
  if (!window.Site) {
    // 數據檔沒載入：至少把網址裡的縣市名稱顯示出來（用 textContent，網址內容不會被當成 HTML）
    const raw = new URLSearchParams(location.search).get('county');
    if (raw) {
      document.getElementById('county-title').textContent = raw;
      document.getElementById('crumb-county').textContent = raw;
    }
    return;
  }
  const { data } = window.Site;
  const v = view(data, location.search);
  const fmt = (n) => n.toFixed(1);
  const $ = (id) => document.getElementById(id);

  if (!v.found) {
    $('county-title').textContent = '找不到這個縣市';
    $('crumb-county').textContent = '找不到縣市';
    document.title = '找不到縣市｜我們這一代，還借書嗎？';
    $('county-message').textContent = v.message;
    $('county-missing').hidden = false;
    $('county-content').hidden = true;
    return;
  }

  const { name, latest, first, rank, total, years } = v;
  $('county-title').textContent = name;
  $('crumb-county').textContent = name;
  document.title = `${name}｜我們這一代，還借書嗎？`;
  document.querySelector('meta[name="description"]')
    ?.setAttribute('content', `${name} ${first.year}–${latest.year} 年公共圖書館人均借閱變化，以及跟全國平均的比較。`);

  const diff = latest.perCapita - latest.national;
  const compare =
    Math.abs(diff) < 0.05
      ? '跟全國平均差不多'
      : `比全國平均（${fmt(latest.national)} 本）${diff > 0 ? '多' : '少'} ${fmt(Math.abs(diff))} 本`;
  const growth = latest.perCapita / first.perCapita;
  const trend =
    growth >= 1.05
      ? `是 ${first.year} 年（${fmt(first.perCapita)} 本）的 ${growth.toFixed(1)} 倍`
      : growth <= 0.95
        ? `比 ${first.year} 年（${fmt(first.perCapita)} 本）少了 ${Math.round((1 - growth) * 100)}%`
        : `跟 ${first.year} 年（${fmt(first.perCapita)} 本）差不多`;

  $('county-lead').innerHTML =
    `${latest.year} 年，${name}平均每人借了 <strong>${fmt(latest.perCapita)} 本</strong>紙本書，` +
    `${compare}，在 ${total} 縣市中排第 ${rank} 名；${trend}。`;

  $('county-stats').innerHTML = [
    [`${fmt(latest.perCapita)} 本`, `${latest.year} 年每人借閱（紙本）`],
    [`第 ${rank} 名`, `全台 ${total} 縣市中`],
    [`${fmt(latest.national)} 本`, `${latest.year} 年全國平均（紙本）`],
  ]
    .map(([value, label]) => `<p class="stat"><span class="stat__value">${value}</span><span class="stat__label">${label}</span></p>`)
    .join('');

  $('county-notes').innerHTML = v.notes.map((n) => `<p class="note">${n}</p>`).join('');
  document.querySelectorAll('[data-county-name]').forEach((el) => (el.textContent = name));

  // 「看數字」表格：圖表套件沒載入時也看得到
  $('county-table').querySelector('tbody').innerHTML = years
    .map((y) => `<tr><td>${y.year}</td><td>${fmt(y.perCapita)}</td><td>${fmt(y.national)}</td></tr>`)
    .join('');

  if (!window.Chart) return; // CDN 沒載入：只顯示表格

  const css = getComputedStyle(document.documentElement);
  const color = (prop) => css.getPropertyValue(prop).trim();
  Chart.defaults.font.family = color('--sans');
  Chart.defaults.color = color('--ink-soft');

  new Chart($('county-chart'), {
    type: 'line',
    data: {
      labels: years.map((y) => String(y.year)),
      datasets: [
        {
          label: name,
          data: years.map((y) => y.perCapita),
          borderColor: color('--chart-print'),
          backgroundColor: color('--chart-print'),
          borderWidth: 3,
          tension: 0.25,
          pointRadius: 3,
          pointHoverRadius: 6,
        },
        {
          label: '全國平均',
          data: years.map((y) => y.national),
          borderColor: color('--accent'),
          backgroundColor: color('--accent'),
          borderWidth: 2,
          borderDash: [5, 4],
          tension: 0.25,
          pointRadius: 0,
          pointHoverRadius: 5,
        },
      ],
    },
    options: {
      maintainAspectRatio: false,
      animation: false, // 只有章節一紙本折線圖和章節二排行長條有動畫
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { position: 'top', align: 'start', labels: { boxWidth: 16, boxHeight: 2 } },
        tooltip: {
          callbacks: {
            title: (items) => `${items[0].label} 年`,
            label: (item) => `${item.dataset.label}：每人 ${fmt(item.parsed.y)} 本`,
          },
        },
      },
      scales: {
        x: { grid: { display: false } },
        y: {
          beginAtZero: true,
          ticks: { callback: (n) => `${n} 本` },
          grid: { color: color('--rule') },
        },
      },
    },
  });
})();
