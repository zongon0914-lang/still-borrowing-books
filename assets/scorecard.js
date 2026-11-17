// 借書成績單（「換你回答：你還借書嗎？」）：讀者輸入縣市、年齡層、去年借了幾本書，在同一頁看到成績單。
// compute() 只接收數據和讀者輸入、回傳成績單內容，不碰畫面，所以可以在 Node 裡測試（tests/scorecard.test.mjs）；
// 後半段才把結果畫到頁面上。讀者的輸入只留在瀏覽器裡：不寫進網址、不送出、不儲存。
(function () {
  /** 縣市和全國比較用的年份 */
  const YEAR = 2025;

  /** 讀者比平均多（或一樣）時說「幾倍」；比較少時說「還差幾本」，所以 0 本不會出現「0 倍」 */
  function compare(books, average) {
    if (books < average) {
      const short = average - books;
      return { times: null, short, text: `還差 ${short.toFixed(1)} 本` };
    }
    const times = books / average;
    return { times, short: null, text: `${times.toFixed(2)} 倍` };
  }

  /**
   * 稱號和一句話（規格使用者故事 22）。門檻是固定的整數：6 本超過全國人均（約 5.8），9 本超過冠軍新北（約 8.7）。
   * 語氣是友善的玩笑；一句話裡的數字依讀者的輸入算出來。
   */
  function titleOf(books, national) {
    if (books === 0) return { name: '還沒開卡的讀者', line: '第一本最難，我們幫你挑好了' };
    if (books <= 5) return { name: '偶爾路過圖書館', line: `再多借 ${Math.ceil(national - books)} 本，就追上全台平均` };
    if (books <= 8) return { name: '超越全台平均', line: '你比大部分台灣人都愛借書' };
    if (books <= 23) return { name: '比冠軍新北還能借', line: '全台沒有一個縣市追得上你' };
    if (books <= 51) return { name: '圖書館常駐居民', line: `平均每個月借 ${Math.floor(books / 12)} 本以上` };
    return { name: '每週一本俱樂部', line: `你一個人抵 ${Math.round(books / national)} 個台灣人` };
  }

  /** 記不清楚的讀者改選範圍：每個範圍用一個代表值計算（規格「成績單計算模組」） */
  const RANGES = [
    { value: '0', label: '大概 0 本', books: 0 },
    { value: '1-5', label: '1–5 本', books: 3 },
    { value: '6-12', label: '6–12 本', books: 9 },
    { value: '13+', label: '13 本以上', books: 15 },
  ];

  const MAX_BOOKS = 999;

  /** 借書量：0–999 的整數（表單送來的是文字，所以也接受 " 9 "） */
  function parseBooks(raw) {
    if (typeof raw === 'number') return Number.isInteger(raw) && raw >= 0 && raw <= MAX_BOOKS ? raw : null;
    const text = String(raw ?? '').trim();
    if (!/^\d{1,4}$/.test(text)) return null;
    const n = Number(text);
    return n <= MAX_BOOKS ? n : null;
  }

  const invalid = (message) => ({ ok: false, message });

  /**
   * 推薦書候選（規格使用者故事 24、28）：這個年齡層借最多的前三類，各類熱門書單合在一起。
   * 只給候選清單；「隨機挑一本」和「換一本」在畫面那一半，所以測試結果固定。
   */
  function recommendOf(data, group) {
    const categories = [...group.all.categories].sort((a, b) => b.loans - a.loans).slice(0, 3).map((c) => c.name);
    const books = categories.flatMap((name) =>
      data.books.categories.find((c) => c.name === name).books.map((b) => ({ title: b.title, author: b.author, category: name })));
    return { categories, books, ageUrl: `age.html?age=${encodeURIComponent(group.age)}` };
  }

  /**
   * @param {object} data window.LIBRARY_DATA
   * @param {{county: string, age: string, books?: number|string, range?: string}} input
   *   books 是讀者填的本數；改選範圍時給 range（'0'、'1-5'、'6-12'、'13+'），books 就不看
   * @returns 輸入有誤時 { ok: false, message }；否則成績單內容 { ok: true, … }
   */
  function compute(data, input) {
    const county = data.counties.find((c) => c.name === input.county);
    if (!county) {
      return invalid(input.county ? `找不到「${input.county}」這個縣市，請從清單裡選。` : '請選你住的縣市。');
    }
    const group = data.age.groups.find((g) => g.age === input.age);
    if (!group) return invalid(input.age ? `北市圖的資料沒有「${input.age}」這個年齡層，請從清單裡選。` : '請選你的年齡層。');

    let books;
    let range = null;
    if (input.range !== undefined && input.range !== null && input.range !== '') {
      range = RANGES.find((r) => r.value === input.range);
      if (!range) return invalid('請從「大概 0／1–5／6–12／13 本以上」裡選一個範圍。');
      books = range.books;
    } else {
      if (input.books === undefined || input.books === null || String(input.books).trim() === '') {
        return invalid('請填去年借了幾本書，或選一個大概的範圍。');
      }
      books = parseBooks(input.books);
      if (books === null) return invalid(`借書量請填 0 到 ${MAX_BOOKS} 的整數（例如 0、3、12）。`);
    }
    const estimated = Boolean(range);
    const perCapita = county.years.find((y) => y.year === YEAR).perCapita;
    const national = data.national.find((r) => r.year === YEAR).printPerCapita;
    const others = data.counties.map((c) => ({ name: c.name, perCapita: c.years.find((y) => y.year === YEAR).perCapita }));

    return {
      ok: true,
      year: YEAR,
      books,
      estimated,
      rangeLabel: range ? range.label : null,
      age: group.age,
      ageLabel: window.Chapter3Page.ageLabel(group.age),
      county: { name: county.name, perCapita, compare: compare(books, perCapita) },
      national: { perCapita: national, compare: compare(books, national) },
      rank: {
        position: 1 + others.filter((c) => c.perCapita > books).length,
        of: data.counties.length + 1,
        beaten: others.filter((c) => c.perCapita < books).map((c) => c.name),
      },
      title: titleOf(books, national),
      recommend: recommendOf(data, group),
    };
  }

  window.Scorecard = { compute, RANGES, YEAR };

  if (typeof document === 'undefined' || !window.Site) return; // Node 測試，或數據檔沒載入

  // ---------- 畫到頁面上 ----------
  const $ = (id) => document.getElementById(id);
  const { data } = window.Site;
  const form = $('scorecard-form');
  const countySelect = $('sc-county');
  const booksInput = $('sc-books');

  data.counties.forEach((c) => countySelect.add(new Option(c.name, c.name)));
  form.hidden = false;

  // 填了數字就取消範圍；選了範圍就清掉數字：一次只用一種
  booksInput.addEventListener('input', () => {
    form.querySelectorAll('input[name="range"]').forEach((r) => { r.checked = false; });
  });
  $('sc-ranges').addEventListener('change', () => { booksInput.value = ''; });

  const esc = (s) => String(s).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]);
  const one = (n) => n.toFixed(1);
  const compareHtml = (cmp) =>
    cmp.times === null
      ? `你<strong>還差 ${one(cmp.short)} 本</strong>就追上`
      : `你是它的 <strong>${cmp.times.toFixed(2)} 倍</strong>`;

  // ---------- 推薦書：隨機挑一本、「換一本」 ----------
  let candidates = [];
  let shown = -1;

  /** 隨機挑一本，跟現在這本不同（候選只有一本時就是那本） */
  function pickIndex() {
    if (candidates.length < 2) return 0;
    let i;
    do i = Math.floor(Math.random() * candidates.length); while (i === shown);
    return i;
  }

  /** 把一本推薦書畫上去。之後要加「去借這本」按鈕，就在這裡依 book 更新 #sc-book-actions 裡的連結 */
  function showBook(book) {
    $('sc-book-title').textContent = book.title;
    $('sc-book-meta').textContent = `${book.author}・${book.category}類熱門書`;
  }

  function nextBook() {
    shown = pickIndex();
    showBook(candidates[shown]);
  }

  $('sc-book-next').addEventListener('click', nextBook);

  function renderRecommend(c) {
    candidates = c.recommend.books;
    shown = -1;
    $('sc-book-label').textContent = `推薦你借這本（${c.ageLabel}最常借的前三類：${c.recommend.categories.join('、')}）`;
    $('sc-book-next').hidden = candidates.length < 2;
    $('sc-book-age').href = c.recommend.ageUrl;
    $('sc-book-age').textContent = `看 ${c.ageLabel}完整的類別排行和書單 →`;
    nextBook();
  }

  function render(c) {
    const booksText = `${c.books} 本`;
    $('sc-books-line').innerHTML = c.estimated
      ? `你選了「${esc(c.rangeLabel)}」，用 <strong>${booksText}</strong> 來算（依你選的範圍估算）・${esc(c.ageLabel)}`
      : `你去年借了 <strong>${booksText}</strong>・${esc(c.ageLabel)}`;
    $('sc-title').textContent = c.title.name;
    $('sc-line').textContent = c.title.line;

    $('sc-county-label').textContent = `跟${c.county.name}比`;
    $('sc-county-compare').innerHTML =
      `${esc(c.county.name)} ${c.year} 年人均借閱 ${one(c.county.perCapita)} 本，${compareHtml(c.county.compare)}。`;
    $('sc-national-compare').innerHTML =
      `全國 ${c.year} 年人均借閱 ${one(c.national.perCapita)} 本，${compareHtml(c.national.compare)}。`;

    const all = data.counties.length;
    const beaten = c.rank.beaten;
    let beatText;
    if (beaten.length === all) beatText = `全台 ${all} 個縣市你都贏過。`;
    else if (beaten.length === 0) beatText = '還沒贏過任何一個縣市，借一本就有機會。';
    else beatText = `贏過 ${beaten.length} 個縣市：${beaten.map(esc).join('、')}。`;
    $('sc-rank').innerHTML =
      `你可以排全台<strong>第 ${c.rank.position} 名</strong>（${all} 個縣市加上你，共 ${c.rank.of} 名）。${beatText}`;

    renderRecommend(c);

    $('sc-source').textContent =
      `縣市和全國比較用 ${c.year} 年的數據：公共圖書館紙本書借閱冊數 ÷ 人口。資料來源見「資料來源與 AI 使用說明」。`;

    $('sc-error').hidden = true;
    $('sc-result').hidden = false;
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault(); // 不送出、不改網址：輸入只留在這個頁面
    const age = form.querySelector('input[name="age"]:checked');
    const range = form.querySelector('input[name="range"]:checked');
    const c = compute(data, {
      county: countySelect.value,
      age: age ? age.value : '',
      books: booksInput.value,
      range: range ? range.value : '',
    });
    if (!c.ok) {
      $('sc-error-message').textContent = c.message;
      $('sc-error').hidden = false;
      $('sc-result').hidden = true;
      return;
    }
    render(c);
    $('sc-result').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
})();
