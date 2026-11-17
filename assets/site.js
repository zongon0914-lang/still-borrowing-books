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

  /**
   * 捲動動畫（只給章節一紙本折線圖、章節二排行長條用）：el 捲進畫面時呼叫 play()，只播一次。
   * 讀者開了「減少動態效果」、瀏覽器沒有 IntersectionObserver、或觀察器設定失敗時，改呼叫 still()，直接顯示完整的圖。
   * 還沒捲到就列印時（例如分頁一直在背景，觀察器沒觸發）也改呼叫 still()，不讓圖停在空白。
   * play() 和 still() 加起來只會呼叫一次。
   */
  function drawWhenSeen(el, play, still) {
    let observer = null;
    let done = false;
    const showAllBeforePrint = () => finish(still);
    function finish(draw) {
      if (done) return;
      done = true;
      if (observer) observer.disconnect();
      window.removeEventListener('beforeprint', showAllBeforePrint);
      draw();
    }

    const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || !('IntersectionObserver' in window)) {
      finish(still);
      return;
    }
    try {
      observer = new IntersectionObserver((entries) => {
        if (entries.some((e) => e.isIntersecting)) finish(play);
      }, { threshold: 0.15 });
      observer.observe(el);
      window.addEventListener('beforeprint', showAllBeforePrint);
    } catch (err) {
      finish(still);
    }
  }

  /**
   * 手機上點了、選了之後，結果出現在畫面外時，把畫面捲到結果（章節二點縣市、年齡工具選年齡）。
   * 只在手機寬度、而且結果不在畫面裡時才捲；桌機或已經看得到就不動。
   * 開了「減少動態效果」就直接跳過去，不慢慢滑。
   */
  function revealOnMobile(el) {
    if (!el || !window.matchMedia || !matchMedia('(max-width: 767px)').matches) return;
    const rect = el.getBoundingClientRect();
    const visible = rect.top >= 0 && rect.top < window.innerHeight * 0.85;
    if (visible) return;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    // nearest：結果比畫面小（地圖下的數字）就捲到剛好露出來，地圖還看得到；比畫面大（年齡結果）就對齊上緣
    el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'nearest' });
  }

  const latest = data.national[data.national.length - 1];
  const first = data.national[0];

  /**
   * 首頁章節卡的小數字（計算的那一半：只吃數據，Node 裡可測，見 tests/home.test.mjs）。
   * 章節二卡片：最新一年人均借閱第一名的縣市；章節三卡片：台北 18–24 歲的人均借閱。
   */
  function homeTeasers(d) {
    const year = d.national[d.national.length - 1].year;
    const perCapitaIn = (county) => county.years.find((y) => y.year === year).perCapita;
    const top = d.counties.reduce((a, b) => (perCapitaIn(b) > perCapitaIn(a) ? b : a));
    const young = d.age.groups.find((g) => g.age === d.age.youngGroup);
    return {
      topCountyShort: top.name.replace(/[市縣]$/, ''),
      topCountyPerCapita: perCapitaIn(top).toFixed(1),
      youngPerCapita: young.perCapita.toFixed(1),
    };
  }

  window.Site = { data, formatBig, byYear, fillStats, drawWhenSeen, revealOnMobile, homeTeasers, latest, first };

  if (typeof document === 'undefined') return; // Node 測試：到這裡就好

  const teasers = homeTeasers(data);
  fillStats({
    topCountyShort: () => teasers.topCountyShort,
    topCountyPerCapita: () => teasers.topCountyPerCapita,
    youngPerCapita: () => teasers.youngPerCapita,
    ageYear: () => data.age.year,
    latestYear: () => latest.year,
    firstYear: () => first.year,
    latestPrint: () => formatBig(latest.printLoans),
    latestPerCapita: () => latest.printPerCapita.toFixed(1),
    firstPerCapita: () => first.printPerCapita.toFixed(1),
  });
})();
