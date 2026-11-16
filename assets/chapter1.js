// 章節一：全國紙本借閱趨勢圖、電子書借閱圖
(function () {
  const { data, formatBig } = window.Site;
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

  function lineChart(canvasId, values, lineColor, label, labels) {
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

  lineChart(
    'print-chart',
    data.national.map((r) => r.printLoans),
    color('--chart-print'),
    '紙本借閱冊數',
    [
      { year: 2021, text: '2021 疫情谷底', below: true },
      { year: 2025, text: '2025 新高' },
    ],
  );

  lineChart(
    'ebook-chart',
    data.national.map((r) => r.ebookLoans),
    color('--chart-ebook'),
    '電子書借閱冊數',
    [
      { year: 2024, text: '2024 高峰' },
    ],
  );
})();
