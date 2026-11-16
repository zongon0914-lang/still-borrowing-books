// 檢查點二・網站點得通
// 從首頁出發，跟著每一個站內連結走，確認每一頁都到得了，而且每一頁都有共用的導覽連結。
// 平常檢查本機檔案；有設定 SITE_URL 時改檢查上線的網站（見 tools/check-online.mjs）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crawlSite, localSite, onlineSite } from './crawl.mjs';

const SITE_URL = process.env.SITE_URL;
const site = await crawlSite('index.html', SITE_URL ? onlineSite(SITE_URL) : localSite());

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
