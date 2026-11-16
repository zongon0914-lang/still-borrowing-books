// 檢查點二・線上版：從作品連結的首頁出發，把檢查點二整組跑一次。
// 用法：npm.cmd run check-online
//      （作品連結寫在 package.json 的 homepage；要檢查別的網址就加在後面：npm.cmd run check-online -- 網址）
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const url = process.argv[2] ?? pkg.homepage;
if (!url || !/^https?:\/\//.test(url)) {
  console.error(`這不是網址：${url}`);
  console.error('用法：npm.cmd run check-online，或 npm.cmd run check-online -- https://…');
  process.exit(1);
}

console.log(`檢查線上網站：${url}\n`);
const testFile = fileURLToPath(new URL('../tests/links.test.mjs', import.meta.url));
const result = spawnSync(process.execPath, ['--test', testFile], {
  stdio: 'inherit',
  env: { ...process.env, SITE_URL: url },
});
process.exit(result.status ?? 1);
