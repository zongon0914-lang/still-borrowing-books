// 檢查點二・線上版：從作品連結的首頁出發，把檢查點二整組跑一次。
// 用法：npm.cmd run check-online
//      （作品連結寫在 package.json 的 homepage；要檢查別的網址就加在後面：npm.cmd run check-online -- 網址）
// 剛 git push 完也可以直接跑：會先等 GitHub Pages 換成新版本（最多 5 分鐘），再開始檢查。
// 最後順便檢查 22 縣市圖書館的借書連結還打得開（見 tools/check-libraries.mjs；被網站擋的只警告）。
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';
import { siteFilesAt, staleFiles, unpushedCount } from './live-version.mjs';
import { checkLibraryLinks, loadCounties, report } from './check-libraries.mjs';

const WAIT_SECONDS = 30;
const MAX_TRIES = 11; // 看 11 次、中間等 10 次 × 30 秒 = 最多等 5 分鐘

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const url = process.argv[2] ?? pkg.homepage;
if (!url || !/^https?:\/\//.test(url)) {
  console.error(`這不是網址：${url}`);
  console.error('用法：npm.cmd run check-online，或 npm.cmd run check-online -- https://…');
  process.exit(1);
}

console.log(`檢查線上網站：${url}\n`);

// 只有檢查自己的作品連結時，才比對「線上 = 推上去的版本」
if (url === pkg.homepage) await waitForLatest();

const testFile = fileURLToPath(new URL('../tests/links.test.mjs', import.meta.url));
const result = spawnSync(process.execPath, ['--test', testFile], {
  stdio: 'inherit',
  env: { ...process.env, SITE_URL: url },
});

console.log('
檢查 22 縣市圖書館的借書連結（測試書名「原子習慣」）…');
const librariesOk = report(await checkLibraryLinks(loadCounties()));
process.exit(result.status === 0 && librariesOk ? 0 : 1);

async function waitForLatest() {
  let expected;
  try {
    const unpushed = unpushedCount();
    if (unpushed > 0) {
      console.log(`注意：有 ${unpushed} 個 commit 還沒推上 GitHub。線上檢查只看得到已經推上去的版本；要檢查最新修改，先執行 git push。\n`);
    }
    expected = siteFilesAt('origin/main');
  } catch {
    console.log('（讀不到 git 紀錄，略過「線上是不是新版本」的確認，直接檢查。）\n');
    return;
  }

  for (let attempt = 1; attempt <= MAX_TRIES; attempt++) {
    const stale = await staleFiles(url, expected);
    if (stale.length === 0) {
      console.log('✔ 線上已經是推上去的最新版本，開始檢查。\n');
      return;
    }
    if (attempt === MAX_TRIES) break;
    console.log(
      `線上還是舊版本（${stale.length} 個檔案還沒更新，例如 ${stale[0]}）：GitHub Pages 還在更新，` +
        `${WAIT_SECONDS} 秒後再看一次…（第 ${attempt} 次，最多等 5 分鐘）`,
    );
    await sleep(WAIT_SECONDS * 1000);
  }

  console.error('\n✖ 等了 5 分鐘，線上還是舊版本，所以先不檢查（檢查舊版本沒有意義）。');
  console.error('  到 GitHub 儲存庫頁面 → 上方 Actions，看「pages build and deployment」有沒有失敗；');
  console.error('  沒失敗的話，過幾分鐘再跑一次 npm.cmd run check-online。');
  process.exit(1);
}
