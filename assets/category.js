// 類別細節頁：一個頁面範本，靠網址參數 ?category=類別名稱 決定顯示哪一類的熱門書單。
// view() 只負責「這個網址要顯示什麼」，不碰畫面，所以可以在 Node 裡測試（tests/category.test.mjs）；
// 後半段才把結果畫到頁面上。
(function () {
  /** 書名「主標題：副標題」拆開，副標題用小字排 */
  function splitTitle(title) {
    const i = title.indexOf('：');
    return i < 0 ? { main: title, sub: '' } : { main: title.slice(0, i), sub: title.slice(i + 1) };
  }

  /** 標題用的名稱：「哲學」→「哲學類」；「總類」本來就有「類」；「學齡前」→「學齡前圖書」 */
  function labelOf(name) {
    if (name.endsWith('類')) return name;
    if (name === '學齡前') return '學齡前圖書';
    return `${name}類`;
  }

  /**
   * @param {object} data window.LIBRARY_DATA
   * @param {string} search 網址的 ?… 部分，例如 location.search
   */
  function view(data, search) {
    const raw = (new URLSearchParams(search).get('category') || '').trim();
    if (!raw) {
      return { found: false, message: '網址裡沒有指定類別。請從章節三的圖表選一個類別。' };
    }
    const all = data.books.categories;
    // 「哲學類」「學齡前類」「學齡前圖書」也找得到
    const category = all.find((c) => [c.name, `${c.name}類`, labelOf(c.name)].includes(raw));
    if (!category) {
      return { found: false, message: `找不到「${raw}」這個類別。請從章節三的圖表重新選一個類別。` };
    }

    const shareIn = (summary) => summary.categories.find((c) => c.name === category.name).share;
    const young = data.age.groups.find((g) => g.age === data.age.youngGroup);
    const books = category.books.map((b) => ({ ...b, ...splitTitle(b.title) }));

    return {
      found: true,
      name: category.name,
      label: labelOf(category.name),
      table: category.table,
      page: category.page,
      note: category.note || '',
      books,
      longSellers: books.filter((b) => b.longSeller).length,
      share: { young: shareIn(young.all), overall: shareIn(data.age.overall) },
      youngLabel: `${young.age.replace('-', '–')} 歲`,
      others: all.map((c) => c.name).filter((n) => n !== category.name),
    };
  }

  window.CategoryPage = { view };

  if (typeof document === 'undefined') return; // 在 Node 測試裡：到這裡就好

  // ---------- 畫到頁面上 ----------
  const $ = (id) => document.getElementById(id);
  if (!window.Site) {
    // 數據檔沒載入：至少把網址裡的類別名稱顯示出來（用 textContent，網址內容不會被當成 HTML）
    const raw = new URLSearchParams(location.search).get('category');
    if (raw) {
      $('category-title').textContent = raw;
      $('crumb-category').textContent = raw;
    }
    return;
  }
  const { data } = window.Site;
  const v = view(data, location.search);

  if (!v.found) {
    $('category-title').textContent = '找不到這個類別';
    $('crumb-category').textContent = '找不到類別';
    document.title = '找不到類別｜我們這一代，還借書嗎？';
    $('category-message').textContent = v.message;
    $('category-missing').hidden = false;
    $('category-content').hidden = true;
    return;
  }

  const esc = (s) => s.replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]);
  const pct = (n) => (n * 100).toFixed(1) + '%';
  const { books: src } = data;
  const { label } = v;
  const categoryUrl = (name) => `category.html?category=${encodeURIComponent(name)}`;

  $('category-title').textContent = `${label}熱門書單`;
  $('crumb-category').textContent = label;
  document.title = `${label}熱門書單｜我們這一代，還借書嗎？`;
  document.querySelector('meta[name="description"]')
    ?.setAttribute('content', `${src.rocYear} 年（${src.year} 年）全國公共圖書館${label}借閱前 ${v.books.length} 名。`);

  $('category-lead').innerHTML =
    `在台北，${v.youngLabel}借的書有 <strong>${pct(v.share.young)}</strong> 是${esc(label)}` +
    `（所有讀者是 ${pct(v.share.overall)}）。` +
    `下面是 ${src.rocYear} 年全國公共圖書館這一類借最多的 ${v.books.length} 本書` +
    (v.longSellers ? `，其中 ${v.longSellers} 本是多年上榜的長銷書。` : '。');

  $('category-note').innerHTML = v.note ? `<p class="note">${esc(v.note)}</p>` : '';

  $('book-list').innerHTML = v.books
    .map((b) => {
      const tags = [
        b.longSeller ? `<span class="book-tag is-long">長銷・${esc(b.longSeller)}</span>` : '',
        b.taipei ? `<span class="book-tag">台北・${esc(b.taipei)}</span>` : '',
      ].join('');
      return `<li class="book${b.longSeller ? ' is-long' : ''}">
        <span class="book__rank">${b.rank}</span>
        <div class="book__body">
          <p class="book__title">${esc(b.main)}${b.sub ? `<span class="book__sub">${esc(b.sub)}</span>` : ''}</p>
          <p class="book__author">${esc(b.author)}</p>
          ${tags ? `<p class="book__tags">${tags}</p>` : ''}
        </div>
      </li>`;
    })
    .join('');

  $('book-source').innerHTML =
    `資料來源：國家圖書館《${esc(src.source.title)}》${esc(v.table)}（報告第 ${v.page} 頁），` +
    `${esc(src.source.scope)}，取前 ${v.books.length} 名。` +
    `「長銷」照抄報告內文的說法；「台北」是${esc(src.taipeiSource.publisher)}《${esc(src.taipeiSource.title)}》也點名的書。` +
    `占比來自${esc(data.age.source.publisher)} ${data.age.rocYear} 年度年刊，只有台北市。`;

  $('category-others').innerHTML = v.others
    .map((n) => `<li><a href="${categoryUrl(n)}">${esc(n)}</a></li>`)
    .join('');
})();
