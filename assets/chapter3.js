// 章節三：台北市各年齡層借什麼。
// view() 只負責「頁面要顯示什麼」，不碰畫面，所以可以在 Node 裡測試（tests/chapter3.test.mjs）；
// 後半段才把結果畫到頁面上。
(function () {
  const categoryUrl = (name) => `category.html?category=${encodeURIComponent(name)}`;
  const ageUrl = (age) => `age.html?age=${encodeURIComponent(age)}`;
  const ageLabel = (age) => (age.endsWith('+') ? `${age.slice(0, -1)} 歲以上` : `${age.replace('-', '–')} 歲`);

  /** 比所有讀者多借 2 成以上，才算這一代「特別愛借」的類別 */
  const STANDOUT_RATIO = 1.2;

  /** @param {object} data window.LIBRARY_DATA */
  function view(data) {
    const age = data.age;
    const shareOf = (summary, name) => summary.categories.find((c) => c.name === name).share;

    const groups = age.groups.map((g) => ({
      age: g.age,
      label: ageLabel(g.age),
      isYoung: g.age === age.youngGroup,
      loans: g.all.loans,
      share: g.all.loans / age.totalLoans,
      top: [...g.all.categories].sort((a, b) => b.loans - a.loans).slice(0, 3),
    }));

    const youngGroup = age.groups.find((g) => g.age === age.youngGroup);
    const young = groups.find((g) => g.isYoung);
    const teens = groups.find((g) => g.age === '12-17');
    const peak = groups.reduce((a, b) => (b.loans > a.loans ? b : a));
    const readers = groups.filter((g) => g.age !== '0-5'); // 6 歲以上：自己會讀書的年紀

    const compare = age.categories
      .map((name) => {
        const y = shareOf(youngGroup.all, name);
        const o = shareOf(age.overall, name);
        return { name, young: y, overall: o, ratio: y / o };
      })
      .sort((a, b) => b.young - a.young);

    return {
      year: age.year,
      rocYear: age.rocYear,
      totalLoans: age.totalLoans,
      groups,
      peak,
      teens,
      young: {
        ...young,
        leastAmongReaders: readers.every((g) => g === young || g.loans > young.loans),
        vsTeens: young.loans / teens.loans,
        vsPeak: peak.loans / young.loans,
        female: youngGroup.female.loans,
        male: youngGroup.male.loans,
      },
      compare,
      standouts: compare.filter((c) => c.ratio >= STANDOUT_RATIO).sort((a, b) => b.ratio - a.ratio),
    };
  }

  window.Chapter3Page = { view, categoryUrl, ageUrl, ageLabel };

  if (typeof document === 'undefined' || !window.Site) return; // Node 測試，或數據檔沒載入：保留 HTML 的備用文字

  const v = view(window.Site.data);
  const pct = (n) => (n * 100).toFixed(1) + '%';
  const wan = (n) => (n / 1e4).toFixed(1) + ' 萬';
  const $ = (id) => document.getElementById(id);

  window.Site.fillStats({
    ageYear: () => v.year,
    ageRocYear: () => v.rocYear,
    youngLoans: () => wan(v.young.loans),
    youngShare: () => pct(v.young.share),
    youngVsPeak: () => Math.round(v.young.vsPeak),
    peakLabel: () => v.peak.label,
    peakLoans: () => wan(v.peak.loans),
    teensLoans: () => wan(v.teens.loans),
    youngPerBook: () => Math.floor(1 / v.young.share), // 每 N 本裡還不到 1 本是 18–24 歲借的
    standoutNames: () => v.standouts.map((c) => c.name).join('和'),
    standoutDetail: () =>
      v.standouts.map((c) => `${c.name}占 ${pct(c.young)}（所有讀者是 ${pct(c.overall)}）`).join('；'),
  });

  // ---------- 圖一：各年齡層借了多少冊 ----------
  const maxLoans = v.peak.loans;
  $('age-bars').innerHTML = v.groups
    .map(
      (g) => `<li class="${g.isYoung ? 'is-young' : ''}">
        <a class="rank-bars__name" href="${ageUrl(g.age)}">${g.label}</a>
        <span class="rank-bars__track"><span class="rank-bars__bar" style="width:${((g.loans / maxLoans) * 100).toFixed(1)}%"></span></span>
        <span class="rank-bars__value">${wan(g.loans)}${g.isYoung ? '<span class="rank-bars__note">年輕世代</span>' : ''}</span>
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

  // ---------- 各年齡層最常借的前三類 ----------
  $('age-tops').innerHTML = v.groups
    .map(
      (g) => `<li class="age-top${g.isYoung ? ' is-young' : ''}">
        <a class="age-top__label" href="${ageUrl(g.age)}">${g.label}${g.isYoung ? '<small>年輕世代</small>' : ''}</a>
        <ol>${g.top.map((c) => `<li><a href="${categoryUrl(c.name)}">${c.name}</a> <span>${pct(c.share)}</span></li>`).join('')}</ol>
      </li>`,
    )
    .join('');
})();
