// 從內政部戶政司 API 下載「村里戶數、單一年齡人口」2024 年底（民國 113 年 12 月）資料，
// 只留臺北市 12 區、把全部里加總成「每一歲的男、女人口」，存到 tools/raw/taipei-pop-2024.json。
// 整份原始資料約 40MB，所以只存加總後的小檔；要核對時可以再跑一次這個指令重新產生。
// 只有要更新原始資料時才需要跑：npm.cmd run fetch-population
// 下載完記得再跑 npm.cmd run build-data。
import { writeFileSync } from 'node:fs';

const MONTH = '11312'; // 民國 113 年 12 月
const API = `https://www.ris.gov.tw/rs-opendata/api/v1/datastore/ODRP014/${MONTH}?page=`;
const CITY = '臺北市';
// 0–99 歲各一欄，100 歲以上合成一欄「100up」
const AGES = [...Array.from({ length: 100 }, (_, i) => String(i).padStart(3, '0')), '100up'];

const male = AGES.map(() => 0);
const female = AGES.map(() => 0);
let total = 0;
const villages = new Set();
const districts = new Set();

let totalPage = 1;
for (let page = 1; page <= totalPage; page++) {
  const res = await fetch(API + page);
  if (!res.ok) throw new Error(`第 ${page} 頁下載失敗：HTTP ${res.status}`);
  const body = await res.json();
  if (!Array.isArray(body.responseData)) throw new Error(`第 ${page} 頁回傳的不是資料表：${JSON.stringify(body).slice(0, 200)}`);
  totalPage = Number(body.totalPage);
  for (const row of body.responseData) {
    if (row.statistic_yyymm !== MONTH) throw new Error(`資料月份不是 ${MONTH}：${row.statistic_yyymm}`);
    if (!row.site_id.startsWith(CITY)) continue;
    districts.add(row.site_id);
    villages.add(`${row.site_id}${row.village}`);
    total += Number(row.people_total);
    AGES.forEach((age, i) => {
      male[i] += Number(row[`people_age_${age}_m`]);
      female[i] += Number(row[`people_age_${age}_f`]);
    });
  }
  console.log(`第 ${page}/${totalPage} 頁`);
}

const out = {
  說明: '由 tools/fetch-population.mjs 從內政部 API 下載後自動產生：臺北市全部里的現住人口加總成每一歲的男、女人口。ages 最後一格「100+」是 100 歲以上。total 是各里「人口數合計」欄的加總，資料整理模組用它核對各歲加起來對不對。',
  source: {
    title: '村里戶數、單一年齡人口（新增區域代碼）',
    publisher: '內政部',
    month: '113 年 12 月（2024 年底）',
    url: 'https://data.gov.tw/dataset/77132',
    api: `${API}1`,
  },
  year: 2024,
  rocYear: 113,
  city: CITY,
  districts: districts.size,
  villages: villages.size,
  ages: AGES.map((a) => (a === '100up' ? '100+' : String(Number(a)))),
  male,
  female,
  total,
};
writeFileSync(new URL('./raw/taipei-pop-2024.json', import.meta.url), JSON.stringify(out, null, 2) + '\n', 'utf8');
console.log(`${CITY}：${districts.size} 區、${villages.size} 里、${total} 人`);
