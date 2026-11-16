// 把 tools/raw/ 的原始資料整理成 assets/data.js，給網站使用。
// 用法：npm.cmd run build-data
// 輸出成 .js（而不是 .json），這樣雙擊 index.html 用 file:// 開也讀得到。
import { writeFileSync } from 'node:fs';
import { buildSiteData } from './clean-data.mjs';

const data = buildSiteData();
const out = new URL('../assets/data.js', import.meta.url);
const header =
  '// 這個檔案由 tools/build-data.mjs 自動產生，請不要手動修改。\n' +
  '// 來源：政府資料開放平台「公共圖書館統計」（國立公共資訊圖書館）；\n' +
  '//       臺北市立圖書館《113年度臺北市立圖書館年刊》各年齡層讀者借閱類別統計；\n' +
  '//       國家圖書館《113年臺灣閱讀風貌及全民閱讀力年度報告》各類別圖書借閱排行\n';
writeFileSync(out, `${header}window.LIBRARY_DATA = ${JSON.stringify(data, null, 2)};\n`, 'utf8');
console.log(`已寫入 assets/data.js（全國 ${data.national.length} 年、年齡層 ${data.age.groups.length} 組、書單 ${data.books.categories.length} 類）`);
