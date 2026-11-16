// 每一頁共用的小工具：數字格式化，以及把 data-stat 欄位填上真實數據。
// 只放每一頁都可能用到的數字；章節專用的數字放在各章節自己的 js。
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

  /**
   * 頁面上寫 <span data-stat="名稱">備用文字</span>，這裡依 stats 的同名函式填數字。
   * 填不到時保留 HTML 原本的文字，確保 JS 失敗時頁面也看得懂。
   */
  function fillStats(stats) {
    document.querySelectorAll('[data-stat]').forEach((el) => {
      const fn = stats[el.dataset.stat];
      if (fn) el.textContent = fn();
    });
  }

  const latest = data.national[data.national.length - 1];
  const first = data.national[0];

  window.Site = { data, formatBig, byYear, fillStats, latest, first };

  fillStats({
    latestYear: () => latest.year,
    firstYear: () => first.year,
    latestPrint: () => formatBig(latest.printLoans),
    latestPerCapita: () => latest.printPerCapita.toFixed(1),
    firstPerCapita: () => first.printPerCapita.toFixed(1),
  });
})();
