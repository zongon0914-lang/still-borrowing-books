// 章節一：開頭的「先猜再看」、全國紙本借閱趨勢圖、電子書借閱圖
// guess() 只負責「讀者猜幾本，揭曉時顯示什麼」，不碰畫面，所以可以在 Node 裡測試（tests/chapter1-guess.test.mjs）；
// 後半才接拉桿、按鈕和圖表。
(function () {
  /**
   * 先猜再看的揭曉：拿讀者猜的本數跟最新一年的全國人均紙本借閱比。
   * 差距用頁面上寫的一位小數（5.8 本）來算，讀者自己減得出來。
   * @param {object} data window.LIBRARY_DATA
   * @param {number} books 讀者猜的本數（拉桿 0～20，一格 0.5）
   */
  function guess(data, books) {
    const latest = data.national[data.national.length - 1];
    const answerTenths = Math.round(latest.printPerCapita * 10);
    const diffTenths = Math.round(books * 10) - answerTenths; // 用整數（十分之一本）算，避免 5.8 − 5.3 算出 0.4999…
    const gap = (Math.abs(diffTenths) / 10).toFixed(1);
    // 差距在 0.5 本以內（含 0.5）算幾乎猜中；猜多猜少都用友善的話（CODING_STANDARDS 第 4 條）
    const kind = Math.abs(diffTenths) <= 5 ? 'close' : diffTenths > 0 ? 'over' : 'under';
    const sentence = {
      close: '幾乎猜中！你對台灣人借書的印象很準。',
      over: `你猜多了 ${gap} 本，看來你身邊都是愛借書的人。`,
      under: `你猜少了 ${gap} 本，台灣人其實比你想的更常去圖書館。`,
    }[kind];
    return { year: latest.year, answer: (answerTenths / 10).toFixed(1), kind, sentence };
  }

  window.Chapter1Page = { guess };

  if (typeof document === 'undefined' || !window.Site) return; // 在 Node 測試裡：到這裡就好

  const { data, formatBig, byYear, fillStats, drawWhenSeen, latest, first } = window.Site;

  // 故事裡提到的關鍵年份
  const COVID_YEAR = 2021;
  const EBOOK_PEAK_YEAR = 2024;

  const changePct = (now, before) => (now / before - 1) * 100;

  fillStats({
    printGrowthTimes: () => (latest.printLoans / first.printLoans).toFixed(1),
    covidPrint: () => formatBig(byYear(COVID_YEAR).printLoans),
    covidDropPct: () =>
      Math.abs(changePct(byYear(COVID_YEAR).printLoans, byYear(COVID_YEAR - 1).printLoans)).toFixed(0),
    ebook2024: () => formatBig(byYear(EBOOK_PEAK_YEAR).ebookLoans),
    ebookLatest: () => formatBig(latest.ebookLoans),
    ebookGrowthTimes: () => Math.round(byYear(EBOOK_PEAK_YEAR).ebookLoans / first.ebookLoans),
    ebookLatestDropPct: () =>
      Math.abs(changePct(latest.ebookLoans, byYear(EBOOK_PEAK_YEAR).ebookLoans)).toFixed(1),
  });
  setUpGuess();

  // 先猜再看：有 JavaScript 才換成拉桿；答案先藏起來，按「揭曉」才出現。
  // 猜的數字只放在畫面上，不寫進網址、不存、不送出（CODING_STANDARDS 第 5 條）。
  function setUpGuess() {
    const play = document.querySelector('.guess__play');
    if (!play) return;
    const range = document.getElementById('guess-range');
    const value = document.getElementById('guess-value');
    const result = document.getElementById('guess-result');
    const sentence = document.getElementById('guess-sentence');
    const revealButton = document.getElementById('guess-reveal');
    const again = document.getElementById('guess-again');

    const showValue = () => { value.textContent = `${range.value} 本`; };
    range.addEventListener('input', showValue);

    revealButton.addEventListener('click', () => {
      sentence.textContent = window.Chapter1Page.guess(data, Number(range.value)).sentence;
      result.hidden = false;
      again.hidden = false;
      revealButton.hidden = true;
      range.disabled = true;
      again.focus();
    });

    again.addEventListener('click', () => {
      result.hidden = true;
      again.hidden = true;
      revealButton.hidden = false;
      range.disabled = false;
      range.focus();
    });

    play.hidden = false;
    result.hidden = true;
    showValue();
  }

  const css = getComputedStyle(document.documentElement);
  const color = (name) => css.getPropertyValue(name).trim();
  const years = data.national.map((r) => String(r.year));

  // 圖表下方「看數字」表格：圖表套件沒載入時，也看得到確切數字
  function fillTable(id, rows) {
    const tbody = document.querySelector(`#${id} tbody`);
    tbody.innerHTML = rows
      .map(([year, value]) => `<tr><td>${year}</td><td>${value.toLocaleString('zh-TW')}</td></tr>`)
      .join('');
  }
  fillTable('print-table', data.national.map((r) => [r.year, r.printLoans]));
  fillTable('ebook-table', data.national.map((r) => [r.year, r.ebookLoans]));

  if (!window.Chart) return; // CDN 沒載入：只顯示表格

  Chart.defaults.font.family = color('--sans');
  Chart.defaults.color = color('--ink-soft');

  // 在指定年份的點旁邊寫一行字（不另外依賴標註套件）
  const yearLabels = (labels) => ({
    id: 'yearLabels',
    afterDatasetsDraw(chart) {
      const { ctx } = chart;
      const meta = chart.getDatasetMeta(0);
      ctx.save();
      ctx.font = `bold 12px ${color('--sans')}`;
      ctx.fillStyle = color('--accent');
      for (const { year, text, below } of labels) {
        const point = meta.data[years.indexOf(String(year))];
        if (!point) continue;
        const align = point.x > chart.chartArea.right - 60 ? 'right' : 'center';
        ctx.textAlign = align;
        ctx.fillText(text, point.x + (align === 'right' ? 6 : 0), point.y + (below ? 22 : -12));
      }
      ctx.restore();
    },
  });

  const highlight = (highlightYears, base) => (ctx) =>
    highlightYears.includes(Number(years[ctx.dataIndex])) ? color('--accent') : base;
  const highlightRadius = (highlightYears) => (ctx) =>
    highlightYears.includes(Number(years[ctx.dataIndex])) ? 6 : 3;

  // 從左到右一年一年畫出線（Chart.js 官方「progressive line」寫法）：每個點等前一個點畫好才出發
  const DRAW_MS = 1600;
  const step = DRAW_MS / years.length;
  const startOnce = (key) => (ctx) => {
    if (ctx.type !== 'data' || ctx[key]) return 0;
    ctx[key] = true;
    return ctx.index * step;
  };
  const previousY = (ctx) =>
    ctx.index === 0
      ? ctx.chart.scales.y.getPixelForValue(0)
      : ctx.chart.getDatasetMeta(ctx.datasetIndex).data[ctx.index - 1].getProps(['y'], true).y;
  const drawLeftToRight = {
    x: { type: 'number', easing: 'linear', duration: step, from: NaN, delay: startOnce('xStarted') },
    y: { type: 'number', easing: 'linear', duration: step, from: previousY, delay: startOnce('yStarted') },
  };

  // animations：不給就是沒有開場動畫（只有紙本折線圖會畫出來，其他圖直接顯示）
  function lineChart(canvasId, values, lineColor, label, labels, animations) {
    const marked = labels.map((l) => l.year);
    return new Chart(document.getElementById(canvasId), {
      type: 'line',
      data: {
        labels: years,
        datasets: [{
          label,
          data: values,
          borderColor: lineColor,
          backgroundColor: lineColor + '22',
          fill: true,
          tension: 0.25,
          pointBackgroundColor: highlight(marked, lineColor),
          pointBorderColor: highlight(marked, lineColor),
          pointRadius: highlightRadius(marked),
          pointHoverRadius: 7,
        }],
      },
      options: {
        maintainAspectRatio: false,
        animation: animations ? {} : false,
        animations: animations || {},
        interaction: { mode: 'index', intersect: false }, // 滑到（或點到）某一年附近就顯示
        layout: { padding: { top: 24 } },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              title: (items) => `${items[0].label} 年`,
              label: (item) => `${label}：${item.parsed.y.toLocaleString('zh-TW')} 冊`,
            },
          },
        },
        scales: {
          x: { grid: { display: false } },
          y: {
            beginAtZero: true,
            ticks: { callback: (v) => formatBig(v) },
            grid: { color: color('--rule') },
          },
        },
      },
      plugins: [yearLabels(labels)],
    });
  }

  const printChart = (animations) => lineChart(
    'print-chart',
    data.national.map((r) => r.printLoans),
    color('--chart-print'),
    '紙本借閱冊數',
    [
      { year: COVID_YEAR, text: `${COVID_YEAR} 疫情谷底`, below: true },
      { year: latest.year, text: `${latest.year} 新高` },
    ],
    animations,
  );
  // 捲到才建圖：之前畫布是空的，捲到時線從 2014 畫到 2025；開了減少動態效果就直接建好完整的圖
  drawWhenSeen(
    document.getElementById('print-chart'),
    () => printChart(drawLeftToRight),
    () => printChart(),
  );

  lineChart(
    'ebook-chart',
    data.national.map((r) => r.ebookLoans),
    color('--chart-ebook'),
    '電子書借閱冊數',
    [
      { year: EBOOK_PEAK_YEAR, text: `${EBOOK_PEAK_YEAR} 高峰` },
    ],
  );
})();
