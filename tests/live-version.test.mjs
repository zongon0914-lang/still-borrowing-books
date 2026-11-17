// 線上檢查的前置判斷：GitHub Pages 是不是已經換成剛推上去的版本。
// 用小型範例網站確認：內容一樣算新版，內容不同或抓不到都算「還沒更新」。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { staleFiles } from '../tools/live-version.mjs';

async function withSite(files, fn) {
  const server = createServer((req, res) => {
    const body = files[decodeURIComponent(req.url)];
    res.writeHead(body === undefined ? 404 : 200).end(body ?? 'not found');
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    await fn(`http://127.0.0.1:${server.address().port}/still-borrowing-books/`);
  } finally {
    server.close();
  }
}

test('線上內容跟推上去的版本一樣：沒有舊檔案', async () => {
  await withSite(
    {
      '/still-borrowing-books/index.html': '<h1>新版</h1>',
      '/still-borrowing-books/assets/style.css': 'body{}',
    },
    async (url) => {
      const expected = new Map([
        ['index.html', Buffer.from('<h1>新版</h1>')],
        ['assets/style.css', Buffer.from('body{}')],
      ]);
      assert.deepEqual(await staleFiles(url, expected), []);
    },
  );
});

test('線上還是舊內容，或檔案還沒出現：列出那些檔案', async () => {
  await withSite(
    {
      '/still-borrowing-books/index.html': '<h1>舊版</h1>',
      '/still-borrowing-books/assets/style.css': 'body{}',
    },
    async (url) => {
      const expected = new Map([
        ['index.html', Buffer.from('<h1>新版</h1>')],
        ['assets/style.css', Buffer.from('body{}')],
        ['age.html', Buffer.from('<h1>新頁面</h1>')],
      ]);
      assert.deepEqual(await staleFiles(url, expected), ['index.html', 'age.html']);
    },
  );
});
