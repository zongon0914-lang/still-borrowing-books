// 線上檢查的一部分：22 縣市圖書館的借書連結還打得開嗎？
// 用小型範例網站模擬各種回應，確認「打得開／被擋（只警告）／壞掉」分得對。
// 真的去打 22 個圖書館網站的是 npm.cmd run check-online，這裡不連外網。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { checkLibraryLinks, libraryUrl } from '../tools/check-libraries.mjs';

async function withSite(routes, fn) {
  const server = createServer((req, res) => {
    const route = routes[new URL(req.url, 'http://x').pathname];
    if (!route) return res.writeHead(404).end('not found');
    if (route.redirect) return res.writeHead(302, { location: route.redirect }).end();
    if (route.hang) return; // 永遠不回應，模擬網站卡住
    res.writeHead(route.status).end('page');
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    await fn(`http://127.0.0.1:${server.address().port}`);
  } finally {
    server.closeAllConnections();
    server.close();
  }
}

test('有書名格式的縣市：{title} 換成編碼過的書名；只有查詢頁的縣市：原樣', () => {
  assert.equal(
    libraryUrl({ titleUrl: 'https://a.tw/search?q={title}&x=1' }, '原子習慣'),
    'https://a.tw/search?q=%E5%8E%9F%E5%AD%90%E7%BF%92%E6%85%A3&x=1',
  );
  assert.equal(libraryUrl({ searchUrl: 'https://b.tw/Miracle_rwd/' }, '原子習慣'), 'https://b.tw/Miracle_rwd/');
});

test('200 和轉址後 200 算打得開；403、429 算被擋（警告）；404、500、卡住、連不上算壞掉', async () => {
  await withSite(
    {
      '/ok': { status: 200 },
      '/moved': { redirect: '/ok' },
      '/blocked': { status: 403 },
      '/busy': { status: 429 },
      '/server-error': { status: 500 },
      '/slow': { hang: true },
    },
    async (base) => {
      const counties = [
        { county: '甲市', searchUrl: `${base}/ok` },
        { county: '乙市', titleUrl: `${base}/moved?q={title}` },
        { county: '丙縣', searchUrl: `${base}/blocked` },
        { county: '丁縣', searchUrl: `${base}/busy` },
        { county: '戊縣', searchUrl: `${base}/gone` },
        { county: '己縣', searchUrl: `${base}/server-error` },
        { county: '庚縣', searchUrl: `${base}/slow` },
        { county: '辛縣', searchUrl: 'http://127.0.0.1:1/' },
      ];
      const results = await checkLibraryLinks(counties, { timeoutMs: 1000, retries: 0 });
      const verdicts = Object.fromEntries(results.map((r) => [r.county, r.verdict]));
      assert.deepEqual(verdicts, {
        甲市: 'ok',
        乙市: 'ok',
        丙縣: 'warn',
        丁縣: 'warn',
        戊縣: 'fail',
        己縣: 'fail',
        庚縣: 'fail',
        辛縣: 'fail',
      });
      const gone = results.find((r) => r.county === '戊縣');
      assert.match(gone.detail, /404/);
      assert.ok(gone.url.endsWith('/gone'));
    },
  );
});

test('第一次卡住、第二次就好：重試後算打得開', async () => {
  let calls = 0;
  const server = createServer((req, res) => {
    calls += 1;
    if (calls === 1) return; // 第一次不回應
    res.writeHead(200).end('page');
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    const [result] = await checkLibraryLinks([{ county: '甲市', searchUrl: `${base}/` }], { timeoutMs: 500, retries: 1 });
    assert.equal(result.verdict, 'ok');
    assert.equal(calls, 2);
  } finally {
    server.closeAllConnections();
    server.close();
  }
});
