// 每一頁共用的小工具：數字格式化，以及把 data-stat 欄位填上真實數據。
(function () {
  const data = window.LIBRARY_DATA;

  /** 13525 萬 → 「1.35 億」；1980 萬 → 「1,980 萬」 */
  function formatBig(n) {
    if (n >= 1e8) return (n / 1e8).toFixed(2) + ' 億';
    if (n >= 1e4) return Math.round(n / 1e4).toLocaleString('zh-TW') + ' 萬';
    return n.toLocaleString('zh-TW');
  }

  function byYear(year) {
    return data.national.find((r) => r.year === year);
  }

  const latest = data.national[data.national.length - 1];
  const first = data.national[0];
  const pct = (a, b) => Math.round((a / b - 1) * 100);

  // 頁面上寫 <span data-stat="名稱"></span>，這裡負責填數字。
  // 填不到數字時保留 HTML 裡原本寫的文字，確保 JS 失敗時頁面也看得懂。
  const stats = {
    latestYear: () => latest.year,
    firstYear: () => first.year,
    latestPrint: () => formatBig(latest.printLoans),
    latestPerCapita: () => (latest.printLoans / latest.population).toFixed(1),
    firstPerCapita: () => (first.printLoans / first.population).toFixed(1),
    printGrowthTimes: () => (latest.printLoans / first.printLoans).toFixed(1),
    covidDropPct: () => Math.abs(pct(byYear(2021).printLoans, byYear(2020).printLoans)),
    covidPrint: () => formatBig(byYear(2021).printLoans),
    ebook2024: () => formatBig(byYear(2024).ebookLoans),
    ebookLatest: () => formatBig(latest.ebookLoans),
    ebookGrowthTimes: () => Math.round(byYear(2024).ebookLoans / first.ebookLoans),
    ebookLatestDropPct: () => Math.abs((latest.ebookLoans / byYear(2024).ebookLoans - 1) * 100).toFixed(1),
  };

  window.Site = { data, formatBig, byYear };

  document.querySelectorAll('[data-stat]').forEach((el) => {
    const fn = stats[el.dataset.stat];
    if (fn) el.textContent = fn();
  });
})();
