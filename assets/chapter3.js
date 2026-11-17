// 章節三：台北市各年齡層借什麼。
// view() 只負責「頁面要顯示什麼」，不碰畫面，所以可以在 Node 裡測試（tests/chapter3.test.mjs）；
// 後半段才把結果畫到頁面上。
(function () {
  const categoryUrl = (name) => `category.html?category=${encodeURIComponent(name)}`;
  const ageUrl = (age) => `age.html?age=${encodeURIComponent(age)}`;
  const ageLabel = (age) => (age.endsWith('+') ? `${age.slice(0, -1)} 歲以上` : `${age.replace('-', '–')} 歲`);

  /** 比所有讀者多借 2 成以上，才算這一代「特別愛借」的類別 */
  const STANDOUT_RATIO = 1.2;

  /**
   * 顏色深淺表的級距（占比）：0 級 3% 以下、1 級 3–6%、2 級 6–10%、3 級 10–20%、4 級 20% 以上。
   * 寫死的數字是為了讓讀者看得懂圖例；用網站既有的 5 階藍（--bin-0 到 --bin-4）。
   */
  const HEAT_BREAKS = [0.03, 0.06, 0.1, 0.2];
  // 用四捨五入到 0.1% 的數字分級，格子裡寫「3.0%」的就不會被塗成「3% 以下」
  const tenths = (share) => Math.round(share * 1000);
  const heatLevel = (share) => HEAT_BREAKS.filter((b) => tenths(share) >= tenths(b)).length;
  const pctText = (n) => (n * 100).toFixed(1) + '%';
  const heatLegend = [
    `${HEAT_BREAKS[0] * 100}% 以下`,
    ...HEAT_BREAKS.slice(1).map((b, i) => `${HEAT_BREAKS[i] * 100}–${b * 100}%`),
    `${HEAT_BREAKS[HEAT_BREAKS.length - 1] * 100}% 以上`,
  ];

  /** 「大約每 N 個月才借 1 本」：12 個月 ÷ 人均借閱，四捨五入到半個月 */
  function monthsPerBook(perCapita) {
    const halves = Math.round((12 / perCapita) * 2);
    const whole = Math.floor(halves / 2);
    if (halves % 2 === 0) return `${whole} 個月`;
    return whole === 0 ? '半個月' : `${whole} 個半月`;
  }

  /** 年齡層從幾歲開始：「18-24」→ 18、「65+」→ 65 */
  const fromAge = (age) => parseInt(age, 10);

  /** @param {object} data window.LIBRARY_DATA */
  function view(data) {
    const age = data.age;
    const shareOf = (summary, name) => summary.categories.find((c) => c.name === name).share;

    const groups = age.groups.map((g) => ({
      age: g.age,
      label: ageLabel(g.age),
      isYoung: g.age === age.youngGroup,
      loans: g.all.loans,
      perCapita: g.perCapita,
      top: [...g.all.categories].sort((a, b) => b.loans - a.loans).slice(0, 3),
    }));

    const youngGroup = age.groups.find((g) => g.age === age.youngGroup);
    const young = groups.find((g) => g.isYoung);
    // 跟「18 歲以上人均借閱最高的那一組」比：小學生有一部分是爸媽代借，跟成年人比比較公平
    const adults = groups.filter((g) => fromAge(g.age) >= 18);
    const peak = adults.reduce((a, b) => (b.perCapita > a.perCapita ? b : a));
    const top = groups.reduce((a, b) => (b.perCapita > a.perCapita ? b : a));
    const vsPeak = peak.perCapita / young.perCapita;

    const compare = age.categories
      .map((name) => {
        const y = shareOf(youngGroup.all, name);
        const o = shareOf(age.overall, name);
        return { name, young: y, overall: o, ratio: y / o };
      })
      .sort((a, b) => b.young - a.young);

    const heat = {
      categories: age.categories.map((name) => ({ name, url: categoryUrl(name) })),
      legend: heatLegend,
      rows: groups.map((g) => ({
        age: g.age,
        label: g.label,
        isYoung: g.isYoung,
        cells: age.categories.map((name) => {
          const share = shareOf(age.groups.find((x) => x.age === g.age).all, name);
          return { name, share, text: pctText(share), level: heatLevel(share) };
        }),
      })),
    };

    return {
      year: age.year,
      rocYear: age.rocYear,
      groups,
      peak,
      top,
      young: {
        ...young,
        leastOfAll: groups.every((g) => g === young || g.perCapita > young.perCapita),
        vsPeak,
        vsPeakRounded: Math.round(vsPeak),
        monthsPerBook: monthsPerBook(young.perCapita),
        everyLine: `台北 ${young.label}平均大約每 ${monthsPerBook(young.perCapita)}才借 1 本`,
        female: youngGroup.female.loans,
        male: youngGroup.male.loans,
      },
      compare,
      standouts: compare.filter((c) => c.ratio >= STANDOUT_RATIO).sort((a, b) => b.ratio - a.ratio),
      heat,
    };
  }

  window.Chapter3Page = { view, categoryUrl, ageUrl, ageLabel };

  if (typeof document === 'undefined' || !window.Site) return; // Node 測試，或數據檔沒載入：保留 HTML 的備用文字
  if (!document.getElementById('age-bars')) return; // 年齡工具頁只借用上面的小工具，不畫章節三的圖

  const v = view(window.Site.data);
  const pct = (n) => (n * 100).toFixed(1) + '%';
  const per = (n) => n.toFixed(1);
  const $ = (id) => document.getElementById(id);

  window.Site.fillStats({
    ageYear: () => v.year,
    ageRocYear: () => v.rocYear,
    youngPerCapita: () => per(v.young.perCapita),
    youngVsPeak: () => v.young.vsPeakRounded,
    youngEvery: () => v.young.everyLine,
    peakLabel: () => v.peak.label,
    peakPerCapita: () => per(v.peak.perCapita),
    topLabel: () => v.top.label,
    topPerCapita: () => per(v.top.perCapita),
    standoutNames: () => v.standouts.map((c) => c.name).join('和'),
    standoutDetail: () =>
      v.standouts.map((c) => `${c.name}占 ${pct(c.young)}（所有讀者是 ${pct(c.overall)}）`).join('；'),
  });

  // ---------- 圖一：各年齡層人均借閱 ----------
  const maxPer = v.top.perCapita;
  $('age-bars').innerHTML = v.groups
    .map(
      (g) => `<li class="${g.isYoung ? 'is-young' : ''}">
        <a class="rank-bars__name" href="${ageUrl(g.age)}">${g.label}</a>
        <span class="rank-bars__track"><span class="rank-bars__bar" style="width:${((g.perCapita / maxPer) * 100).toFixed(1)}%"></span></span>
        <span class="rank-bars__value">${per(g.perCapita)} 本${g.isYoung ? '<span class="rank-bars__note">年輕世代</span>' : ''}</span>
      </li>`,
    )
    .join('');

  // ---------- 圖二：18–24 歲 vs 所有讀者，各類別占比 ----------
  const maxShare = Math.max(...v.compare.flatMap((c) => [c.young, c.overall]));
  const w = (n) => ((n / maxShare) * 100).toFixed(1) + '%';
  $('compare-bars').innerHTML = v.compare
    .map(
      (c) => `<li>
        <a class="pair-bars__name" href="${categoryUrl(c.name)}">${c.name}</a>
        <span class="pair-bars__tracks">
          <span class="pair-bars__bar is-young" style="width:${w(c.young)}"></span>
          <span class="pair-bars__bar is-overall" style="width:${w(c.overall)}"></span>
        </span>
        <span class="pair-bars__value"><strong>${pct(c.young)}</strong><br>${pct(c.overall)}</span>
      </li>`,
    )
    .join('');

  // 顏色深淺表是 HTML 裡寫好的表格（沒有 JavaScript 也看得到），這裡只把數字和深淺換成最新數據
  v.heat.rows.forEach((row) => {
    row.cells.forEach((cell) => {
      const td = document.querySelector(`[data-heat="${row.age}|${cell.name}"]`);
      if (!td) return;
      td.textContent = cell.text;
      td.className = `heat-table__cell is-level-${cell.level}`;
    });
  });
})();
