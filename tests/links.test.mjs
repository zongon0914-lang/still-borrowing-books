// 檢查點二・網站點得通
// 從首頁出發，跟著每一個站內連結走，確認每一頁都到得了，而且每一頁都有共用的導覽連結。
// 平常檢查本機檔案；有設定 SITE_URL 時改檢查上線的網站（見 tools/check-online.mjs）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crawlSite, localSite, onlineSite } from './crawl.mjs';

const SITE_URL = process.env.SITE_URL;
const read = SITE_URL ? onlineSite(SITE_URL) : localSite();
const site = await crawlSite('index.html', read);

// 分享設定裡寫的是正式網站的完整網址（社群網站不認相對路徑）
const PRODUCTION_URL = 'https://zongon0914-lang.github.io/still-borrowing-books/';

test('從首頁出發，沒有壞掉的連結（含圖片、樣式、程式檔）', () => {
  assert.deepEqual(site.broken, []);
});

test('首頁的三個問題入口都點得到', () => {
  for (const page of ['chapter1.html', 'chapter2.html', 'chapter3.html']) {
    assert.ok(site.pages.has(page), `首頁點不到 ${page}`);
  }
});

test('每一頁都連得到首頁和「資料來源與 AI 使用說明」', () => {
  for (const [page, links] of site.pages) {
    if (page !== 'index.html') assert.ok(links.includes('index.html'), `${page} 沒有回首頁的連結`);
    assert.ok(links.includes('sources.html'), `${page} 沒有資料來源連結`);
  }
});

test('每一頁都有標題和麵包屑', () => {
  for (const [page] of site.pages) {
    const html = site.html.get(page);
    assert.match(html, /<title>[^<]+<\/title>/, `${page} 沒有 <title>`);
    if (page !== 'index.html') assert.match(html, /class="breadcrumb"/, `${page} 沒有麵包屑`);
  }
});

test('章節二連得到 22 個縣市的細節頁，而且細節頁存在', () => {
  const html = site.html.get('chapter2.html');
  assert.ok(html, '首頁點不到 chapter2.html');
  const counties = new Set([...html.matchAll(/href="county\.html\?county=([^"&#]+)"/g)].map((m) => m[1]));
  assert.equal(counties.size, 22, `只找到：${[...counties].join('、')}`);
  assert.ok(site.pages.has('county.html'), '點不到 county.html');
});

test('章節三連得到年齡工具和 10 個類別頁，而且這些頁面存在', () => {
  const html = site.html.get('chapter3.html');
  assert.ok(html, '首頁點不到 chapter3.html');
  const categories = new Set([...html.matchAll(/href="category\.html\?category=([^"&#]+)"/g)].map((m) => m[1]));
  assert.equal(categories.size, 10, `只找到：${[...categories].join('、')}`);
  assert.ok(site.pages.has('age.html'), '點不到 age.html（年齡工具）');
  assert.ok(site.pages.has('category.html'), '點不到 category.html（類別頁）');
});

test('章節三連得到 9 個年齡層的結果頁', () => {
  const html = site.html.get('chapter3.html');
  assert.ok(html, '首頁點不到 chapter3.html');
  const ages = new Set([...html.matchAll(/href="age\.html\?age=([^"&#]+)"/g)].map((m) => decodeURIComponent(m[1])));
  assert.deepEqual([...ages].sort(), ['0-5', '12-17', '18-24', '25-34', '35-44', '45-54', '55-64', '6-11', '65+']);
});

test('從首頁到任何第三層頁面（縣市、類別、年齡結果）不超過 2 次點擊', () => {
  // 從首頁一層一層往外走，記下每一頁最少要點幾次才到得了
  const clicks = new Map([['index.html', 0]]);
  const queue = ['index.html'];
  while (queue.length) {
    const page = queue.shift();
    for (const target of site.pages.get(page) ?? []) {
      if (target.endsWith('.html') && !clicks.has(target)) {
        clicks.set(target, clicks.get(page) + 1);
        queue.push(target);
      }
    }
  }
  for (const page of ['county.html', 'category.html', 'age.html']) {
    assert.ok(clicks.has(page), `首頁點不到 ${page}`);
    assert.ok(clicks.get(page) <= 2, `${page} 要點 ${clicks.get(page)} 次才到`);
  }
});

test('從首頁爬得到結語；首頁和章節三都連到結語，結語連到成績單', () => {
  assert.ok(site.pages.has('ending.html'), '點不到 ending.html');
  assert.ok(site.pages.get('index.html').includes('ending.html'), '首頁沒有連到 ending.html');
  assert.ok(site.pages.get('chapter3.html')?.includes('ending.html'), '章節三沒有連到 ending.html');
  assert.ok(site.pages.get('ending.html')?.includes('scorecard.html'), '結語沒有連到 scorecard.html');
});

test('首頁的卡片順序是一、二、三、結語、換你回答', () => {
  const html = site.html.get('index.html');
  const list = html.slice(html.indexOf('class="question-list"'));
  const cards = [...list.matchAll(/class="question-card[^"]*" href="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(cards, ['chapter1.html', 'chapter2.html', 'chapter3.html', 'ending.html', 'scorecard.html']);
});

test('首頁（第五個入口）和章節三都連得到「換你回答」成績單頁，從首頁 1 次點擊就到', () => {
  assert.ok(site.pages.get('index.html').includes('scorecard.html'), '首頁沒有連到 scorecard.html');
  assert.ok(site.pages.get('chapter3.html')?.includes('scorecard.html'), '章節三沒有連到 scorecard.html');
  assert.ok(site.pages.has('scorecard.html'), '點不到 scorecard.html');
});

// 讀 <meta property="og:title" content="…"> 或 <meta name="twitter:card" content="…">
function meta(html, key) {
  const m = html.match(new RegExp(`<meta (?:property|name)="${key.replace(':', '\\:')}" content="([^"]*)">`));
  return m ? m[1] : null;
}

test('每一頁都有分享預覽設定（Open Graph 和 Twitter 卡片），網址寫成正式網站的完整網址', () => {
  for (const [page] of site.pages) {
    const html = site.html.get(page);
    for (const key of ['og:title', 'og:description', 'og:image', 'og:url', 'og:type', 'twitter:card', 'twitter:title', 'twitter:description', 'twitter:image']) {
      assert.ok(meta(html, key), `${page} 沒有 ${key}`);
    }
    assert.equal(meta(html, 'og:url'), PRODUCTION_URL + (page === 'index.html' ? '' : page), `${page} 的 og:url 不對`);
    assert.ok(meta(html, 'og:image').startsWith(PRODUCTION_URL), `${page} 的 og:image 不是正式網站的完整網址`);
    assert.equal(meta(html, 'twitter:image'), meta(html, 'og:image'), `${page} 的 twitter:image 跟 og:image 不一樣`);
    assert.equal(meta(html, 'twitter:card'), 'summary_large_image', `${page} 的 twitter:card 不是大圖`);
  }
});

test('分享預覽的標題每頁各自寫；成績單頁寫「換你回答：你還借書嗎？」', () => {
  const titles = [...site.pages.keys()].map((page) => meta(site.html.get(page), 'og:title'));
  assert.equal(new Set(titles).size, titles.length, `有重複的標題：${titles.join('、')}`);
  const descriptions = [...site.pages.keys()].map((page) => meta(site.html.get(page), 'og:description'));
  assert.equal(new Set(descriptions).size, descriptions.length, '有重複的介紹');
  assert.match(meta(site.html.get('scorecard.html'), 'og:title'), /^換你回答：你還借書嗎？/);
  assert.equal(meta(site.html.get('chapter2.html'), 'og:title').includes('哪裡的人最愛借書？'), true, '章節二的標題沒有章名');
});

test('分享預覽圖指向的檔案真的存在', async () => {
  const images = new Set([...site.pages.keys()].map((page) => meta(site.html.get(page), 'og:image')));
  for (const image of images) {
    const file = image.slice(PRODUCTION_URL.length);
    assert.notEqual(await read(file), null, `找不到預覽圖 ${file}`);
  }
});

test('章節一、二、三和結語標出進度 1／4 到 4／4，其他頁沒有進度', () => {
  // 預期值照規格「章節進度」：讀的順序是一、二、三、結語，共 4 篇
  const expected = { 'chapter1.html': '1／4', 'chapter2.html': '2／4', 'chapter3.html': '3／4', 'ending.html': '4／4' };
  for (const [page] of site.pages) {
    const html = site.html.get(page);
    const found = [...html.matchAll(/class="chapter-progress"[^>]*>([^<]*)</g)].map((m) => m[1].trim());
    assert.deepEqual(found, expected[page] ? [expected[page]] : [], `${page} 的進度文字不對`);
  }
  for (const page of Object.keys(expected)) assert.ok(site.pages.has(page), `首頁點不到 ${page}`);
});

// 規格 docs/spec-polish.md 使用者故事 24、25：每一頁的導覽列一致，都有結語和成績單；成績單頁回到結語
const NAV = [
  ['chapter1.html', '一年借幾本'],
  ['chapter2.html', '哪裡最愛借'],
  ['chapter3.html', '我們借什麼'],
  ['ending.html', '結語'],
  ['scorecard.html', '成績單'],
  ['sources.html', '資料來源與 AI 使用說明'],
];

test('每一頁的導覽列都一樣，有三章、結語、成績單和資料來源', () => {
  for (const [page, html] of site.html) {
    const nav = html.match(/<nav class="site-nav"[^>]*>([\s\S]*?)<\/nav>/);
    assert.ok(nav, `${page} 沒有導覽列`);
    const links = [...nav[1].matchAll(/<a href="([^"]+)"[^>]*>([^<]+)<\/a>/g)].map((m) => [m[1], m[2]]);
    assert.deepEqual(links, NAV, `${page} 的導覽列不一樣`);
  }
});

test('成績單頁的返回連結回到結語', () => {
  const html = site.html.get('scorecard.html');
  const nav = html.match(/<nav class="chapter-nav"[^>]*>([\s\S]*?)<\/nav>/)[1];
  assert.match(nav, /<a href="ending\.html">← 回到：所以，還借書嗎？<\/a>/);
});
