// 把 tools/raw/ 的原始資料整理成 assets/data.js，給網站使用。
// 用法：npm.cmd run build-data
// 輸出成 .js（而不是 .json），這樣雙擊 index.html 用 file:// 開也讀得到。
import { writeFileSync } from 'node:fs';
import { loadRaw, buildCleanData } from './clean-data.mjs';

const data = buildCleanData(loadRaw());
const out = new URL('../assets/data.js', import.meta.url);
const header =
  '// 這個檔案由 tools/build-data.mjs 自動產生，請不要手動修改。\n' +
  '// 來源：政府資料開放平台「公共圖書館統計」（國立公共資訊圖書館）\n';
writeFileSync(out, `${header}window.LIBRARY_DATA = ${JSON.stringify(data, null, 2)};\n`, 'utf8');
console.log(`已寫入 assets/data.js（全國 ${data.national.length} 年）`);
