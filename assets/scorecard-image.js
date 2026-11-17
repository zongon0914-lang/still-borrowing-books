// 借書成績單圖片：1080×1920（IG 限動）的直式 PNG，在讀者的瀏覽器裡畫，不上傳到任何地方。
// 前半段不碰畫布：content() 決定圖片上寫什麼字，layout() 決定每段字放在哪裡、多大，
// 所以可以在 Node 裡測試（tests/scorecard-image.test.mjs）。後半段才畫到畫布上、接「存成圖片」和「分享」按鈕。
(function () {
  const WIDTH = 1080;
  const HEIGHT = 1920;
  const MARGIN = 96; // 字跟圖片邊緣的距離
  const TEXT_WIDTH = WIDTH - MARGIN * 2;
  /** 作品網址（package.json 的 homepage，不寫 https:// 比較短好抄） */
  const SITE_URL = 'zongon0914-lang.github.io/still-borrowing-books';

  // 比較的說法由 Scorecard.compute() 決定（頁面也用同一句），圖片只加上主詞「我」
  const perCapitaText = (n) => window.Scorecard.perCapitaText(n);
  const compareText = (cmp) => `我${cmp.text}`;

  /**
   * 圖片上寫的字。用第一人稱「我」，因為圖片是讀者自己分享出去的。
   * @param card Scorecard.compute() 的結果（ok: true）
   * @param book 現在顯示的推薦書 { title, author, category }
   */
  function content(card, book) {
    return {
      header: '我們這一代，還借書嗎？',
      heading: '我的借書成績單',
      booksLead: '我去年借了',
      booksValue: `${card.books} 本`,
      who: `住${card.county.name}・${card.ageLabel}`,
      estimate: card.estimated ? `依我選的範圍「${card.rangeLabel}」估算` : null,
      title: card.title.name,
      line: card.title.line,
      rows: [
        { label: `跟${card.county.name}比`, text: `${card.county.name} ${card.year} 年人均借閱 ${perCapitaText(card.county.perCapita)} 本，${compareText(card.county.compare)}` },
        { label: '跟全國比', text: `全國 ${card.year} 年人均借閱 ${perCapitaText(card.national.perCapita)} 本，${compareText(card.national.compare)}` },
        { label: '跟台北同齡人比', text: `台北 ${card.ageLabel} ${card.peer.year} 年平均每人借 ${perCapitaText(card.peer.perCapita)} 本，${compareText(card.peer.compare)}` },
        { label: '如果我是一個縣市', text: `我可以排全台第 ${card.rank.position} 名（共 ${card.rank.of} 名）${card.rank.cheer ? `，${card.rank.cheer.replace(/。$/, '')}` : ''}` },
      ],
      // 四根橫條：數字全部照抄 compute() 的結果，圖片不自己算；選範圍時「我」用同一個估計值，標「約」
      barsLabel: '一年借幾本（紙本）',
      bars: [
        { label: '我', value: card.books, text: `${card.estimated ? '約 ' : ''}${card.books} 本`, isMe: true },
        { label: card.county.name, value: card.county.perCapita, text: `${perCapitaText(card.county.perCapita)} 本` },
        { label: '全國', value: card.national.perCapita, text: `${perCapitaText(card.national.perCapita)} 本` },
        { label: `台北 ${card.ageLabel}`, value: card.peer.perCapita, text: `${perCapitaText(card.peer.perCapita)} 本` },
      ],
      bookLabel: '推薦我借這本',
      bookTitle: book.title,
      bookMeta: `${book.author}・${book.category}類熱門書`,
      cta: '換你回答：你還借書嗎？',
      url: SITE_URL,
    };
  }

  // ---------- 換行 ----------
  /** 英數字連在一起的當成一個字，不從中間切開（數字連同後面的單位，例如「4.13 倍」）；其他字一個一個算 */
  const tokensOf = (text) => text.match(/[A-Za-z0-9.,'’\-–()&/:+#%]+(?: [本倍名歲年])?| +|./gu) || [];
  /** 不能放在行首的標點：遇到時把上一行最後一個字一起帶下來 */
  const NO_LINE_START = /^[，。、：；！？）」』》〉…%]/u;

  /**
   * 把一段字依寬度切成好幾行。
   * @param measure (text) => 寬度（像素）
   */
  function wrap(text, maxWidth, measure) {
    const lines = [];
    let line = '';
    const push = () => { if (line.trim()) lines.push(line.trim()); line = ''; };
    for (const token of tokensOf(text)) {
      if (measure(line + token) <= maxWidth) { line += token; continue; }
      if (/^ +$/.test(token)) { push(); continue; }
      if (NO_LINE_START.test(token) && line.length > 1) {
        const chars = [...line];
        const carry = chars.pop();
        line = chars.join('');
        push();
        line = carry + token;
        continue;
      }
      push();
      if (measure(token) <= maxWidth) { line = token; continue; }
      for (const ch of token) { // 一個英數字串比一整行還寬，只好切開
        if (line && measure(line + ch) > maxWidth) push();
        line += ch;
      }
    }
    push();
    // 最後一行只剩一個字（例如「上」）不好看：從上一行帶一個字下來
    const n = lines.length;
    if (n >= 2 && [...lines[n - 1]].length === 1 && !/[ \x00-\x7f]$/.test(lines[n - 2])) {
      const prev = [...lines[n - 2]];
      const carry = prev.pop();
      lines[n - 2] = prev.join('').trimEnd();
      lines[n - 1] = carry + lines[n - 1];
    }
    return lines;
  }

  /**
   * 找最大的字級，讓這段字在 maxLines 行內放得下；最小的字級還放不下，就截斷並加「…」。
   * @param measure (text, size) => 寬度
   */
  function fit(text, sizes, maxWidth, maxLines, measure) {
    for (const size of sizes) {
      const lines = wrap(text, maxWidth, (t) => measure(t, size));
      if (lines.length <= maxLines) return { size, lines };
    }
    const size = sizes[sizes.length - 1];
    const lines = wrap(text, maxWidth, (t) => measure(t, size)).slice(0, maxLines);
    let last = [...lines[maxLines - 1]];
    while (last.length && measure(`${last.join('')}…`, size) > maxWidth) last.pop();
    lines[maxLines - 1] = `${last.join('').trimEnd()}…`;
    return { size, lines };
  }

  // ---------- 排版 ----------
  /**
   * 每段字要畫在哪裡：回傳由上到下的清單。
   * 字：{ kind: 'text', role, text, x, y（字的上緣）, size, family: 'serif'|'sans', weight, color, width }
   * 線：{ kind: 'rule', x, y, width }
   * @param measure (text, size, family, weight) => 寬度（瀏覽器用畫布量，測試用假尺）
   */
  function layout(c, measure) {
    // 先用寬鬆的排法；內容太多（長書名、估算、比較排成兩行）擠到頁尾時，改用比較緊的排法。
    // 最後一種是保險：書名和作者各縮成一行、放不下就加「…」，不會讓字疊在一起
    let ops;
    for (const density of DENSITIES) {
      ops = layoutWith(c, measure, density);
      if (ops.fits) break;
    }
    return ops.list;
  }

  /** 由鬆到緊的排法：間距、推薦書書名的字級和行數、作者行數 */
  const DENSITIES = [
    { gap: 1, bookTitle: [56, 48, 42, 36], titleLines: 3, metaLines: 2 },
    { gap: 0.75, bookTitle: [44, 40, 36], titleLines: 3, metaLines: 2 },
    { gap: 0.5, bookTitle: [38, 34, 30], titleLines: 3, metaLines: 1 },
    { gap: 0.5, bookTitle: [30], titleLines: 1, metaLines: 1 },
    // 最後的保險：字再縮小一號、長條圖排密一點。稱號、比較句、長條圖、網址都不截短（規格使用者故事 49），只有推薦書會縮成一行
    { gap: 0.5, bookTitle: [30], titleLines: 1, metaLines: 1, barRow: 38, small: true },
  ];
  // 長條圖每一列的高度、名稱和本數欄的寬度、橫條的粗細和最短長度
  const BAR_ROW = 50;
  const BAR_LABEL_WIDTH = 240;
  const BAR_VALUE_WIDTH = 170;
  const BAR_HEIGHT = 22;
  const BAR_MIN = 10;
  const FOOTER_TOP = HEIGHT - MARGIN - 32 * 1.3 - 30 * 1.5; // 頁尾兩行（邀請、網址）的上緣
  const FOOTER_RULE = FOOTER_TOP - 28;

  function layoutWith(c, measure, density) {
    const ops = [];
    let y = MARGIN + 24;
    const text = (role, str, size, family, weight, color, lineHeight = 1.3) => {
      const width = measure(str, size, family, weight);
      ops.push({ kind: 'text', role, text: str, x: MARGIN, y, size, family, weight, color, width });
      y += size * lineHeight;
    };
    const block = (role, str, sizes, maxLines, family, weight, color, lineHeight = 1.3) => {
      const m = (t, size) => measure(t, size, family, weight);
      const { size, lines } = fit(str, sizes, TEXT_WIDTH, maxLines, m);
      lines.forEach((l) => text(role, l, size, family, weight, color, lineHeight));
    };
    const gap = (h) => { y += h * density.gap; };
    const rule = () => { ops.push({ kind: 'rule', role: 'rule', x: MARGIN, y, width: TEXT_WIDTH }); };

    /**
     * 長條圖：每一列「名稱｜橫條｜本數」。四個數字裡最大的那個是滿格；
     * 不是 0 的至少畫 BAR_MIN 寬，「我」借很多時其他三根也還看得見一小段。0 本就是 0 寬，只寫「0 本」。
     */
    const bars = (content) => {
      block('barsLabel', content.barsLabel, [30, 26], 1, 'sans', 700, 'ink', 1.45);
      const max = Math.max(...content.bars.map((b) => b.value));
      const trackX = MARGIN + BAR_LABEL_WIDTH + 16;
      const trackWidth = WIDTH - MARGIN - BAR_VALUE_WIDTH - 16 - trackX;
      const row = density.barRow || BAR_ROW;
      for (const b of content.bars) {
        const color = b.isMe ? 'accent' : 'inkSoft';
        const weight = b.isMe ? 700 : 400;
        const label = fit(b.label, [28, 24, 20], BAR_LABEL_WIDTH, 1, (t, size) => measure(t, size, 'sans', weight));
        const value = fit(b.text, [30, 26], BAR_VALUE_WIDTH, 1, (t, size) => measure(t, size, 'sans', 700));
        const valueWidth = measure(value.lines[0], value.size, 'sans', 700);
        const width = b.value <= 0 || max <= 0 ? 0 : Math.max(BAR_MIN, (trackWidth * b.value) / max);
        ops.push({ kind: 'text', role: 'barLabel', text: label.lines[0], x: MARGIN, y: y + (row - label.size * 1.2) / 2, size: label.size, family: 'sans', weight, color, width: measure(label.lines[0], label.size, 'sans', weight) });
        ops.push({ kind: 'bar', role: b.isMe ? 'barMe' : 'bar', x: trackX, y: y + (row - BAR_HEIGHT) / 2, width, height: BAR_HEIGHT, track: trackWidth, color });
        ops.push({ kind: 'text', role: 'barValue', text: value.lines[0], x: WIDTH - MARGIN - valueWidth, y: y + (row - value.size * 1.2) / 2, size: value.size, family: 'sans', weight: 700, color, width: valueWidth });
        y += row;
      }
    };

    // 最緊的排法：每段字改用比較小的那幾個字級（先試大的，放不下再小）
    const sizes = (normal, small) => (density.small ? small : normal);
    text('header', c.header, 30, 'sans', 400, 'inkSoft', 1.5);
    text('heading', c.heading, 48, 'serif', 700, 'ink');
    gap(40);
    text('booksLead', c.booksLead, 34, 'sans', 400, 'inkSoft', 1.3);
    block('booksValue', c.booksValue, sizes([150, 120, 96], [96, 80]), 1, 'serif', 700, 'accent', 1.2);
    block('who', c.who, sizes([32, 28], [28, 24]), 1, 'sans', 400, 'ink', 1.5);
    if (c.estimate) block('estimate', c.estimate, sizes([30, 26], [26, 22]), 2, 'sans', 700, 'accent', 1.5);
    gap(20);
    rule();
    gap(44);
    block('title', c.title, sizes([76, 64, 54], [54, 46]), 1, 'serif', 700, 'accent', 1.3);
    block('line', c.line, sizes([40, 34], [32, 28]), 2, 'serif', 400, 'ink', 1.45);
    gap(24);
    rule();
    gap(32);
    bars(c);
    gap(28);
    rule();
    gap(32);
    for (const row of c.rows) {
      block('rowLabel', row.label, sizes([30, 26], [26, 22]), 1, 'sans', 700, 'ink', 1.45);
      block('rowText', row.text, sizes([34, 30], [28, 24]), 2, 'serif', 400, 'ink', 1.45);
      gap(22);
    }
    rule();
    gap(32);
    block('bookLabel', c.bookLabel, [30], 1, 'sans', 700, 'accent', 1.45);
    block('bookTitle', c.bookTitle, density.bookTitle, density.titleLines, 'serif', 700, 'ink', 1.3);
    block('bookMeta', c.bookMeta, [28, 24], density.metaLines, 'sans', 400, 'inkSoft', 1.45);
    // 最後一行字的下緣（跟測試一樣用 1.2 倍字級算）要在頁尾的線上方，留一點空
    const last = ops[ops.length - 1];
    const fits = last.y + last.size * 1.2 <= FOOTER_RULE - 12;

    // 頁尾固定貼在下面：作品網址
    ops.push({ kind: 'rule', role: 'footerRule', x: MARGIN, y: FOOTER_RULE, width: TEXT_WIDTH });
    y = FOOTER_TOP;
    text('cta', c.cta, 30, 'sans', 400, 'inkSoft', 1.5);
    text('url', c.url, 32, 'sans', 700, 'accent', 1.3);
    return { list: ops, fits };
  }

  window.ScorecardImage = { content, wrap, layout, WIDTH, HEIGHT, SITE_URL };

  if (typeof document === 'undefined' || !window.Scorecard || !window.Scorecard.current) return; // Node 測試

  // ---------- 畫到畫布上 ----------
  const css = getComputedStyle(document.documentElement);
  const token = (name, fallback) => css.getPropertyValue(name).trim() || fallback;
  const COLORS = {
    paper: token('--paper', '#f6f1e6'),
    paperDeep: token('--paper-deep', '#ece4d2'),
    ink: token('--ink', '#2b2620'),
    inkSoft: token('--ink-soft', '#5e554a'),
    rule: token('--rule', '#d6cbb5'),
    accent: token('--accent', '#a2452f'),
  };
  const FAMILIES = { serif: token('--serif', 'serif'), sans: token('--sans', 'sans-serif') };
  const fontOf = (size, family, weight) => `${weight} ${size}px ${FAMILIES[family]}`;

  /** 網頁字型是依用到的字分批下載的：先把圖片上會出現的字載好，畫出來才不會變成系統字型 */
  async function loadFonts(c) {
    if (!document.fonts || !document.fonts.load) return;
    const chars = JSON.stringify(c);
    await Promise.all([
      document.fonts.load('700 40px "Noto Serif TC"', chars),
      document.fonts.load('400 40px "Noto Serif TC"', chars),
      document.fonts.load('700 40px "Noto Sans TC"', chars),
      document.fonts.load('400 40px "Noto Sans TC"', chars),
    ]).catch(() => {});
  }

  /** 畫出成績單圖片，回傳 PNG 檔 */
  async function render(card, book) {
    const c = content(card, book);
    await loadFonts(c);
    const canvas = document.createElement('canvas');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    const ctx = canvas.getContext('2d');
    const measure = (text, size, family, weight) => {
      ctx.font = fontOf(size, family, weight);
      return ctx.measureText(text).width;
    };

    ctx.fillStyle = COLORS.paper;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    // 書頁感的外框和上方的朱紅色條
    ctx.strokeStyle = COLORS.rule;
    ctx.lineWidth = 2;
    ctx.strokeRect(44, 44, WIDTH - 88, HEIGHT - 88);
    ctx.fillStyle = COLORS.accent;
    ctx.fillRect(MARGIN, 44, 120, 10);

    ctx.textBaseline = 'top';
    for (const op of layout(c, measure)) {
      if (op.kind === 'rule') {
        ctx.fillStyle = COLORS.rule;
        ctx.fillRect(op.x, op.y, op.width, 2);
        continue;
      }
      if (op.kind === 'bar') {
        ctx.fillStyle = COLORS.paperDeep; // 整條軌道淡淡的底，0 本時也看得出這一列是長條
        ctx.fillRect(op.x, op.y, op.track, op.height);
        ctx.fillStyle = COLORS[op.color];
        ctx.fillRect(op.x, op.y, op.width, op.height);
        continue;
      }
      ctx.font = fontOf(op.size, op.family, op.weight);
      ctx.fillStyle = COLORS[op.color];
      ctx.fillText(op.text, op.x, op.y);
    }
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    return new File([blob], '我的借書成績單.png', { type: 'image/png' });
  }
  window.ScorecardImage.render = render;

  // ---------- 「存成圖片」和「分享」 ----------
  const saveButton = document.getElementById('sc-save');
  const shareButton = document.getElementById('sc-share');
  const status = document.getElementById('sc-save-status');
  if (!saveButton) return;

  /** 只有瀏覽器能分享檔案時（多半是手機）才顯示「分享」，不會出現按了沒反應的按鈕 */
  const canShareFiles = (() => {
    try {
      const probe = new File([new Blob(['x'])], 'probe.png', { type: 'image/png' });
      return Boolean(navigator.canShare && navigator.share && navigator.canShare({ files: [probe] }));
    } catch {
      return false;
    }
  })();
  shareButton.hidden = !canShareFiles;

  const current = () => window.Scorecard.current();
  const say = (text) => { if (status) status.textContent = text; };

  saveButton.addEventListener('click', async () => {
    const { card, book } = current();
    if (!card || !book) return;
    saveButton.disabled = true;
    say('圖片製作中…');
    try {
      const file = await render(card, book);
      const url = URL.createObjectURL(file);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      say('已存成圖片（1080×1920），可以發到 IG 限動。');
    } catch {
      say('圖片沒有存成功，請再按一次。');
    } finally {
      saveButton.disabled = false;
    }
  });

  shareButton.addEventListener('click', async () => {
    const { card, book } = current();
    if (!card || !book) return;
    shareButton.disabled = true;
    try {
      const file = await render(card, book);
      await navigator.share({ files: [file], title: '我的借書成績單', text: `換你回答：你還借書嗎？ https://${SITE_URL}/` });
    } catch (err) {
      if (!err || err.name !== 'AbortError') say('這個瀏覽器沒辦法分享圖片，請改用「存成圖片」。');
    } finally {
      shareButton.disabled = false;
    }
  });
})();
