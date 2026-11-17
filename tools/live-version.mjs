// 判斷 GitHub Pages 上的網站是不是已經換成剛推上去的版本。
// 推上去之後 Pages 要 1～3 分鐘才會更新；這段時間線上檢查會抓到舊頁面而亂報錯，
// 所以 check-online 先用這裡確認「線上 = 推上去的版本」，再開始檢查。
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));

/** 網站檔案：根目錄的 .html 和 assets/ 底下的檔案（tools/、tests/、docs/ 不算） */
const isSiteFile = (file) => /^[^/]+\.html$/.test(file) || file.startsWith('assets/');

/**
 * 某個 git 版本（預設是推上 GitHub 的 origin/main）裡，每個網站檔案的內容。
 * 讀的是 git 存的內容，不是資料夾裡的檔案，所以還沒 commit 的修改不會算進來。
 * @returns {Map<string, Buffer>}
 */
export function siteFilesAt(ref = 'origin/main', root = ROOT) {
  const git = (...args) => execFileSync('git', ['-c', 'core.quotepath=off', ...args], { cwd: root, maxBuffer: 64 << 20 });
  const files = git('ls-tree', '-r', '--name-only', ref).toString('utf8').split('\n').filter(isSiteFile);
  return new Map(files.map((file) => [file, git('show', `${ref}:${file}`)]));
}

/** 這台電腦上有幾個 commit 還沒推上 GitHub */
export function unpushedCount(root = ROOT) {
  const out = execFileSync('git', ['rev-list', '--count', 'origin/main..HEAD'], { cwd: root });
  return Number(out.toString().trim());
}

/**
 * 跟 expected 比對，列出線上內容不一樣（或抓不到）的檔案。空陣列 = 線上已經是新版。
 * @param {string} baseUrl 作品連結
 * @param {Map<string, Buffer>} expected 檔案 → 應該有的內容
 */
export async function staleFiles(baseUrl, expected) {
  const base = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  const results = await Promise.all(
    [...expected].map(async ([file, content]) => {
      try {
        // no-cache：叫中間的快取伺服器回頭確認，避免拿到幾分鐘前的舊檔
        const res = await fetch(new URL(file, base), { headers: { 'cache-control': 'no-cache' } });
        if (!res.ok) return file;
        return Buffer.from(await res.arrayBuffer()).equals(content) ? null : file;
      } catch {
        return file;
      }
    }),
  );
  return results.filter(Boolean);
}
