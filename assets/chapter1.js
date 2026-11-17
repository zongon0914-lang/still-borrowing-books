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
      under: `你猜少了 ${gap} 本，台灣人其實比你想的更常借書。`,
    }[kind];
    return { year: latest.year, answer: (answerTenths / 10).toFixed(1), kind, sentence };
  }

  /**
   * 折線圖縱軸的刻度：同一張圖用同一種單位，不會從「萬」跳到「億」。
   * 6,000 萬 → 「0.6 億」；1.4 億 → 「1.4 億」；1,500 萬（用「萬」時）→ 「1,500 萬」。最多兩位小數，去掉多餘的 0。
   * @param {number} n 刻度的值（冊）
   * @param {'億'|'萬'} unit 這張圖用的單位
   */
  function axisTick(n, unit) {
    if (n === 0) return '0';
    if (unit === '億') return `${Number((n / 1e8).toFixed(2))} 億`;
    return `${Math.round(n / 1e4).toLocaleString('en-US')} 萬`;
  }
  /** 整張圖最大值過 1 億就整張用「億」，不然用「萬」 */
  const axisUnit = (values) => (Math.max(...values) >= 1e8 ? '億' : '萬');

  window.Chapter1Page = { guess, axisTick, axisUnit };

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
    const answer = document.getElementById('guess-answer');
    const sentence = document.getElementById('guess-sentence');
    const revealButton = document.getElementById('guess-reveal');
    const again = document.getElementById('guess-again');

    // 開場白和數字卡裡的平均本數會洩漏答案：揭曉前藏起來（數字卡換成「？ 本」），揭曉後一直顯示。
    // 沒有 JavaScript 時不會跑到這裡，讀者照樣看到完整內容。
    const spoilers = document.querySelectorAll('.guess-spoiler');
    const placeholders = document.querySelectorAll('.guess-placeholder');
    const showSpoilers = (shown) => {
      spoilers.forEach((el) => { el.hidden = !shown; });
      placeholders.forEach((el) => { el.hidden = shown; });
    };

    const showValue = () => { value.textContent = `${range.value} 本`; };
    range.addEventListener('input', showValue);

    revealButton.addEventListener('click', () => {
      const revealed = window.Chapter1Page.guess(data, Number(range.value));
      answer.textContent = revealed.answer;
      sentence.textContent = revealed.sentence;
      result.hidden = false;
      again.hidden = false;
      revealButton.hidden = true;
      range.disabled = true;
      showSpoilers(true);
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
    showSpoilers(false);
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

  // 從左到右畫出線：每個點一開始就在正確位置（所以畫的途中滑到任何一年都有提示框），
  // 只是把畫線的範圍從左邊慢慢打開。提示框在這之後才畫，不會被遮住。
  const DRAW_MS = 1600;
  const revealLeftToRight = () => {
    let start = null;
    return {
      id: 'revealLeftToRight',
      beforeDatasetsDraw(chart) {
        start ??= performance.now();
        const progress = Math.min((performance.now() - start) / DRAW_MS, 1);
        const { left, width } = chart.chartArea;
        const { ctx } = chart;
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, left + width * progress + 8, chart.height); // +8：最右邊的點不被切一半
        ctx.clip();
        if (progress < 1) requestAnimationFrame(() => chart.draw());
      },
      afterDatasetsDraw(chart) {
        chart.ctx.restore();
      },
    };
  };

  // reveal：給 true 就從左到右畫出來（只有紙本折線圖會，其他圖直接顯示）
  function lineChart(canvasId, values, lineColor, label, labels, reveal) {
    const marked = labels.map((l) => l.year);
    const unit = window.Chapter1Page.axisUnit(values);
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
        animation: false,
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
            ticks: { callback: (v) => window.Chapter1Page.axisTick(v, unit) },
            grid: { color: color('--rule') },
          },
        },
      },
      // 年份標註排在 reveal 前面：它也在打開的範圍裡畫，線畫到那一年才出現
      plugins: reveal ? [yearLabels(labels), revealLeftToRight()] : [yearLabels(labels)],
    });
  }

  const printChart = (reveal) => lineChart(
    'print-chart',
    data.national.map((r) => r.printLoans),
    color('--chart-print'),
    '紙本借閱冊數',
    [
      { year: COVID_YEAR, text: `${COVID_YEAR} 疫情谷底`, below: true },
      { year: latest.year, text: `${latest.year} 新高` },
    ],
    reveal,
  );
  // 捲到才建圖：之前畫布是空的，捲到時線從 2014 畫到 2025；開了減少動態效果就直接建好完整的圖
  drawWhenSeen(
    document.getElementById('print-chart'),
    () => printChart(true),
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
