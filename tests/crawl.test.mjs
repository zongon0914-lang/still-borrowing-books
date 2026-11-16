// 檢查點二・判斷規則：確保「點得通」的判斷跟 GitHub Pages 上線後一致。
// 用小型範例網站確認：本機檢查會抓到大小寫不一致，線上檢查會抓到不存在的檔案。
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { crawlSite, localSite, onlineSite } from './crawl.mjs';

const tempDirs = [];
after(() => tempDirs.forEach((dir) => rmSync(dir, { recursive: true, force: true })));

function makeSite(files) {
  const root = mkdtempSync(path.join(tmpdir(), 'site-'));
  tempDirs.push(root);
  for (const [name, text] of Object.entries(files)) {
    mkdirSync(path.dirname(path.join(root, name)), { recursive: true });
    writeFileSync(path.join(root, name), text);
  }
  return root;
}

test('本機檢查：檔名大小寫不一致算壞連結（GitHub Pages 分大小寫）', async () => {
  const root = makeSite({
    'index.html': '<link href="Assets/style.css"><a href="about.html">',
    'assets/style.css': '',
    'about.html': '<a href="index.html">',
  });
  const site = await crawlSite('index.html', localSite(root));
  assert.deepEqual(site.broken, ['index.html → Assets/style.css']);
  assert.ok(site.pages.has('about.html'));
});

test('本機檢查：連到資料夾時比照 GitHub Pages 讀裡面的 index.html', async () => {
  const root = makeSite({
    'index.html': '<a href="about/"><a href="empty/">',
    'about/index.html': '<a href="../index.html">',
    'empty/note.txt': '',
  });
  const site = await crawlSite('index.html', localSite(root));
  assert.deepEqual(site.broken, ['index.html → empty/']);
});

test('線上檢查：從作品連結出發，回應不是 200 的檔案算壞連結', async () => {
  const files = {
    '/still-borrowing-books/index.html': '<a href="chapter1.html"><script src="assets/gone.js"></script>',
    '/still-borrowing-books/chapter1.html': '<a href="index.html">',
  };
  const server = createServer((req, res) => {
    const body = files[req.url];
    res.writeHead(body === undefined ? 404 : 200).end(body ?? 'not found');
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    const url = `http://127.0.0.1:${server.address().port}/still-borrowing-books`;
    const site = await crawlSite('index.html', onlineSite(url));
    assert.deepEqual(site.broken, ['index.html → assets/gone.js']);
    assert.deepEqual([...site.pages.keys()], ['index.html', 'chapter1.html']);
  } finally {
    server.close();
  }
});
