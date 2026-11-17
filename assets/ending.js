// 結語：把三章的發現合起來，回答標題「我們這一代，還借書嗎？」。
// view() 只負責「頁面要顯示什麼」，不碰畫面，所以可以在 Node 裡測試（tests/ending.test.mjs）；
// 後半段才把結果填到頁面上。要先載入 chapter3.js（第三個發現沿用章節三的計算）。
(function () {
  /** 整體答案：參賽者要改寫時只改這裡 */
  const ANSWER = '還借，只是我們借得比誰都少。';

  const fmt = (n) => n.toFixed(1);
  const wan = (n) => (n / 1e4).toFixed(1) + ' 萬';
  const pct = (n) => (n * 100).toFixed(1);

  /** @param {object} data window.LIBRARY_DATA */
  function view(data) {
    // ---------- 發現一：全國人均借閱（章節一） ----------
    const national = data.national;
    const latest = national[national.length - 1];
    const covid = national.find((r) => r.year === 2021);
    const isRecord = national.every((r) => r === latest || r.printPerCapita < latest.printPerCapita);

    // ---------- 發現二：縣市排名（章節二，名次算法跟縣市細節頁一樣：比它多的縣市數 + 1） ----------
    const perCapitaOf = (name) =>
      data.counties.find((c) => c.name === name).years.find((y) => y.year === latest.year).perCapita;
    const rankOf = (name) => data.counties.filter((c) => perCapitaOf(c.name) > perCapitaOf(name)).length + 1;
    const ntpc = { perCapita: perCapitaOf('新北市'), rank: rankOf('新北市') };
    const tpe = { perCapita: perCapitaOf('臺北市'), rank: rankOf('臺北市') };

    // ---------- 發現三：台北各年齡層（章節三） ----------
    const ch3 = window.Chapter3Page.view(data);

    const findings = [
      {
        title: '借書沒有退流行',
        value: fmt(latest.printPerCapita),
        unit: '本',
        caption: `${latest.year} 年全國平均每人借的紙本書`,
        text:
          `疫情那年（${covid.year} 年）跌到平均每人 ${fmt(covid.printPerCapita)} 本紙本書，` +
          `${latest.year} 年回升到 ${fmt(latest.printPerCapita)} 本，是十年新高。`,
        url: 'chapter1.html',
        linkText: '回去看章節一：台灣人一年借幾本書？',
        holds: isRecord && covid.printPerCapita < latest.printPerCapita,
      },
      {
        title: '愛借書的不一定是台北',
        value: fmt(ntpc.perCapita),
        unit: '本',
        caption: `${latest.year} 年新北市平均每人借的紙本書`,
        text:
          `${latest.year} 年人均借閱第 1 名是新北市，平均每人 ${fmt(ntpc.perCapita)} 本紙本書；` +
          `臺北市約 ${fmt(tpe.perCapita)} 本，在 ${data.counties.length} 縣市中排第 ${tpe.rank} 名。`,
        url: 'chapter2.html',
        linkText: '回去看章節二：哪裡的人最愛借書？',
        holds: ntpc.rank === 1 && tpe.rank > 1,
      },
      {
        title: '我們這一代借得最少',
        value: pct(ch3.young.share),
        unit: '%',
        caption: `${ch3.year} 年北市圖的紙本借閱裡，18–24 歲借的比例`,
        text:
          `${ch3.year} 年在台北，18–24 歲一年借了 ${wan(ch3.young.loans)}冊紙本書，只占全部的 ${pct(ch3.young.share)}%，` +
          `是 6 歲以上借得最少的一群。（年齡資料只有台北市）`,
        url: 'chapter3.html',
        linkText: '回去看章節三：我們這一代借什麼？',
        holds: ch3.young.leastAmongReaders,
      },
    ];

    return { findings, answer: ANSWER };
  }

  window.EndingPage = { view };

  if (typeof document === 'undefined' || !window.Site || !window.Chapter3Page) return; // Node 測試，或程式沒載入：保留 HTML 的備用文字

  // ---------- 填到頁面上 ----------
  const v = view(window.Site.data);
  document.querySelectorAll('[data-finding]').forEach((el) => {
    const f = v.findings[Number(el.dataset.finding)];
    el.querySelectorAll('[data-part]').forEach((part) => (part.textContent = f[part.dataset.part]));
    const link = el.querySelector('a');
    if (link) link.href = f.url;
  });
  document.querySelectorAll('[data-ending-answer]').forEach((el) => (el.textContent = v.answer));
})();
