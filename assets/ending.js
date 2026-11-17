// 結語：把三章的發現合起來，回答標題「我們這一代，還借書嗎？」。
// view() 只負責「頁面要顯示什麼」，不碰畫面，所以可以在 Node 裡測試（tests/ending.test.mjs）；
// 後半段才把結果填到頁面上。要先載入 chapter3.js（第三個發現沿用章節三的計算）。
(function () {
  /** 整體答案：參賽者要改寫時只改這裡 */
  const ANSWER = '還借，只是我們借得比誰都少。';

  const fmt = (n) => n.toFixed(1);

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
    const topName = data.counties.map((c) => c.name).find((name) => rankOf(name) === 1);
    const top = { name: topName, perCapita: perCapitaOf(topName) };
    const tpe = { perCapita: perCapitaOf('台北市'), rank: rankOf('台北市') };

    // ---------- 發現三：台北各年齡層（章節三） ----------
    const taipeiAges = window.Chapter3Page.view(data);

    const findings = [
      {
        title: '借書沒有退流行',
        value: fmt(latest.printPerCapita),
        unit: '本',
        caption: `${latest.year} 年全國平均每人借的紙本書`,
        text:
          `疫情那年（${covid.year} 年）跌到平均每人 ${fmt(covid.printPerCapita)} 本紙本書，` +
          `${latest.year} 年回升到 ${fmt(latest.printPerCapita)} 本${isRecord ? `，是 ${national[0].year}–${latest.year} 年最高` : ''}。`,
        url: 'chapter1.html',
        linkText: '回去看章節一：台灣人一年借幾本書？',
        holds: isRecord && covid.printPerCapita < latest.printPerCapita,
      },
      {
        title: '愛借書的不一定是台北',
        value: fmt(top.perCapita),
        unit: '本',
        caption: `${latest.year} 年${top.name}平均每人借的紙本書`,
        text:
          `${latest.year} 年人均借閱第 1 名是${top.name}，平均每人 ${fmt(top.perCapita)} 本紙本書；` +
          `台北市約 ${fmt(tpe.perCapita)} 本，在 ${data.counties.length} 縣市中排第 ${tpe.rank} 名。`,
        url: 'chapter2.html',
        linkText: '回去看章節二：哪裡的人最愛借書？',
        holds: tpe.rank > 1,
      },
      {
        title: '我們這一代借得最少',
        value: fmt(taipeiAges.young.perCapita),
        unit: '本',
        caption: `${taipeiAges.year} 年台北 18–24 歲平均每人借的紙本書`,
        text:
          `${taipeiAges.year} 年在台北，18–24 歲平均每人一年借 ${fmt(taipeiAges.young.perCapita)} 本紙本書，是所有年齡層裡最少的，` +
          `${taipeiAges.young.vsPeakLine}。（年齡資料只有台北市）`,
        url: 'chapter3.html',
        linkText: '回去看章節三：我們這一代借什麼？',
        holds: taipeiAges.young.leastOfAll,
      },
    ];

    return { findings, answer: ANSWER };
  }

  window.EndingPage = { view };

  if (typeof document === 'undefined' || !window.Site || !window.Chapter3Page) return; // Node 測試，或程式沒載入：保留 HTML 的備用文字

  // ---------- 填到頁面上 ----------
  const ending = view(window.Site.data);
  document.querySelectorAll('[data-finding]').forEach((el) => {
    const finding = ending.findings[Number(el.dataset.finding)];
    el.querySelectorAll('[data-part]').forEach((part) => (part.textContent = finding[part.dataset.part]));
    const link = el.querySelector('a');
    if (link) link.href = finding.url;
  });
  document.querySelectorAll('[data-ending-answer]').forEach((el) => (el.textContent = ending.answer));
})();
