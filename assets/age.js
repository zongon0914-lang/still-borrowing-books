// 年齡工具結果頁：一個頁面，靠網址參數 ?age=18-24&sex=female 決定顯示哪個年齡層、哪個性別。
// view() 只負責「這個網址要顯示什麼」，不碰畫面，所以可以在 Node 裡測試（tests/age-tool.test.mjs）；
// 後半段才把結果畫到頁面上。
(function () {
  const SEXES = ['all', 'female', 'male'];
  const SEX_LABEL = { all: '', female: '女性', male: '男性' };
  /** 結果頁只列第一名類別的前 5 本，完整 10 本在類別頁 */
  const BOOKS_SHOWN = 5;

  /** 某個性別的所有讀者，各類別借了多少：把 9 個年齡層加起來（男女合計直接用年刊的總計） */
  function overallOf(age, sex) {
    if (sex === 'all') return age.overall.categories;
    const total = age.groups.reduce((s, g) => s + g[sex].loans, 0);
    return age.categories.map((name) => {
      const loans = age.groups.reduce((s, g) => s + g[sex].categories.find((c) => c.name === name).loans, 0);
      return { name, loans, share: loans / total };
    });
  }

  function resultUrl(age, sex = 'all') {
    const q = `age=${encodeURIComponent(age)}`;
    return `age.html?${q}${sex === 'all' ? '' : `&sex=${sex}`}`;
  }

  /**
   * @param {object} data window.LIBRARY_DATA
   * @param {string} search 網址的 ?… 部分，例如 location.search
   */
  function view(data, search) {
    const params = new URLSearchParams(search);
    const raw = (params.get('age') || '').trim();
    if (!raw) return { found: false, message: '' }; // 還沒選：只顯示選單

    // 「18–24歲」「65歲以上」也找得到
    const age = raw.replace(/[–—~～]/g, '-').replace(/\s/g, '').replace(/歲以上$/, '+').replace(/歲$/, '');
    const group = data.age.groups.find((g) => g.age === age);
    if (!group) {
      return { found: false, message: `北市圖的資料沒有「${raw}」這個年齡層。請從上面選一個年齡層。` };
    }
    const sex = params.get('sex') || 'all';
    if (!SEXES.includes(sex)) {
      return { found: false, message: '性別只能選「不分性別」「女」或「男」。請從上面重新選。' };
    }
    const summary = group[sex];
    const { ageLabel, categoryUrl } = window.Chapter3Page;
    // 比較對象：同性別的所有讀者（選女就跟所有女性比），避免把男女差異誤當成年齡差異
    const compareTo = overallOf(data.age, sex);
    const overallShare = (name) => compareTo.find((c) => c.name === name).share;
    const ranking = [...summary.categories]
      .sort((a, b) => b.loans - a.loans)
      .map((c) => ({ ...c, overall: overallShare(c.name), url: categoryUrl(c.name) }));
    const top = ranking[0];
    const books = data.books.categories.find((c) => c.name === top.name).books.slice(0, BOOKS_SHOWN);
    // 每個年齡層的第一名都是語言文學，所以另外找「占比比所有讀者多最多個百分點」的類別（不含第一名）。
    // 用百分點差、不用倍數：小類別（例如宗教）倍數一放大就很誇張
    const gap = (c) => c.share - c.overall;
    const standout = ranking.slice(1).reduce((a, b) => (gap(b) > gap(a) ? b : a));

    return {
      found: true,
      age,
      sex,
      ageLabel: ageLabel(age),
      label: ageLabel(age) + SEX_LABEL[sex],
      compareLabel: `台北所有${SEX_LABEL[sex]}讀者`,
      loans: summary.loans,
      ranking,
      top,
      books,
      standout,
    };
  }

  window.AgePage = { view, resultUrl, SEXES };

  if (typeof document === 'undefined' || !window.Site) return; // Node 測試，或數據檔沒載入：表單照樣能用

  // ---------- 畫到頁面上 ----------
  const $ = (id) => document.getElementById(id);
  const { data } = window.Site;
  const form = $('age-picker');
  const v = view(data, location.search);

  // 選單：有 JS 時點了就直接換結果，不用再按「看結果」
  const params = new URLSearchParams(location.search);
  const checkAge = v.found ? v.age : null;
  const checkSex = v.found ? v.sex : SEXES.includes(params.get('sex')) ? params.get('sex') : 'all';
  form.querySelectorAll('input').forEach((input) => {
    if (input.name === 'age') input.checked = input.value === checkAge;
    if (input.name === 'sex') input.checked = input.value === checkSex;
  });
  // 用滑鼠或手指點：選了就直接換結果。用鍵盤：方向鍵在選項間移動也會觸發 change，
  // 所以只有「點」才跳頁，鍵盤使用者選好後按「看結果」
  let pointed = false;
  form.addEventListener('pointerdown', () => { pointed = true; });
  form.addEventListener('keydown', () => { pointed = false; });
  form.addEventListener('change', () => {
    if (!pointed) return;
    const age = form.querySelector('input[name="age"]:checked');
    const sex = form.querySelector('input[name="sex"]:checked');
    if (age) location.href = resultUrl(age.value, sex ? sex.value : 'all');
  });

  if (!v.found) {
    if (v.message) {
      $('age-message').textContent = v.message;
      $('age-missing').hidden = false;
      $('age-title').textContent = '找不到這個結果';
      document.title = '找不到結果｜我們這一代，還借書嗎？';
    }
    return;
  }

  const esc = (s) => String(s).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]);
  const pct = (n) => (n * 100).toFixed(1) + '%';
  const wan = (n) => (n >= 1e4 ? (n / 1e4).toFixed(1) + ' 萬' : n.toLocaleString('zh-TW'));
  const who = `台北 ${v.label}`;

  $('age-title').textContent = `${who}最常借什麼？`;
  $('crumb-age').textContent = v.label;
  document.title = `${v.label}最常借什麼｜我們這一代，還借書嗎？`;
  document.querySelector('meta[name="description"]')
    ?.setAttribute('content', `${data.age.year} 年台北 ${v.label}讀者最常借的書類別和熱門書單。`);

  $('age-lead').innerHTML =
    `${data.age.year} 年，${esc(who)}的讀者在北市圖一共借了 <strong>${wan(v.loans)}冊</strong>書，` +
    `最常借的是<strong>${esc(v.top.name)}</strong>，占 <strong>${pct(v.top.share)}</strong>。`;

  $('legend-self').textContent = v.label;
  $('legend-compare').textContent = v.compareLabel;
  $('age-ranking-caption').textContent = `${who}：借的書各類別占多少（${data.age.year} 年，照多到少排）`;
  const maxShare = Math.max(...v.ranking.flatMap((c) => [c.share, c.overall]));
  const w = (n) => ((n / maxShare) * 100).toFixed(1) + '%';
  $('age-ranking').innerHTML = v.ranking
    .map(
      (c) => `<li>
        <a class="pair-bars__name" href="${c.url}">${esc(c.name)}</a>
        <span class="pair-bars__tracks">
          <span class="pair-bars__bar is-young" style="width:${w(c.share)}"></span>
          <span class="pair-bars__bar is-overall" style="width:${w(c.overall)}"></span>
        </span>
        <span class="pair-bars__value"><strong>${pct(c.share)}</strong><br>${pct(c.overall)}</span>
      </li>`,
    )
    .join('');

  const s = v.standout;
  $('age-standout').innerHTML = `<p class="note">
      每個年齡層最常借的都是語言文學。跟${esc(v.compareLabel)}比，${esc(v.label)}特別多借的是
      <a href="${s.url}"><strong>${esc(s.name)}</strong></a>：
      占 ${pct(s.share)}，${esc(v.compareLabel)}是 ${pct(s.overall)}，多了 ${((s.share - s.overall) * 100).toFixed(1)} 個百分點。
    </p>`;

  const src = data.books;
  $('age-books-title').textContent = `最常借的${v.top.name}：全國借最多的 ${v.books.length} 本`;
  $('age-books').innerHTML = v.books
    .map((b) => {
      const i = b.title.indexOf('：');
      const main = i < 0 ? b.title : b.title.slice(0, i);
      const sub = i < 0 ? '' : b.title.slice(i + 1);
      return `<li class="book">
        <span class="book__rank">${b.rank}</span>
        <div class="book__body">
          <p class="book__title">${esc(main)}${sub ? `<span class="book__sub">${esc(sub)}</span>` : ''}</p>
          <p class="book__author">${esc(b.author)}</p>
        </div>
      </li>`;
    })
    .join('');
  $('age-books-source').innerHTML =
    `書單是全國公共圖書館所有年齡的排行，不是只有${esc(v.label)}：國家圖書館《${esc(src.source.title)}》，` +
    `${src.rocYear} 年（${src.year} 年）。<a href="${v.top.url}">看${esc(v.top.name)}完整前 10 名 →</a>`;

  $('age-result').hidden = false;
})();
