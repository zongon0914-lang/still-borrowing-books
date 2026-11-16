// 檢查點一・年齡資料對不對（章節三）
// 原始表：北市圖《113年度臺北市立圖書館年刊》年度統計-9「113 年各年齡層讀者借閱類別統計」，人工抄進 tools/raw/tpml-age-2024.json。
// 期望值是直接看原表 PDF 寫下來的，不是用程式重算。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadAgeRaw, buildAgeData } from '../tools/clean-data.mjs';

const raw = loadAgeRaw();
const age = buildAgeData(raw);
const group = (a) => age.groups.find((g) => g.age === a);

test('9 個年齡層都在，順序照北市圖的分法', () => {
  assert.deepEqual(age.groups.map((g) => g.age), ['0-5', '6-11', '12-17', '18-24', '25-34', '35-44', '45-54', '55-64', '65+']);
});

test('10 個類別照原表順序', () => {
  assert.deepEqual(age.categories, ['學齡前', '總類', '哲學', '宗教', '自然科學', '應用科學', '社會科學', '史地', '語言文學', '藝術']);
});

test('資料年份標成北市圖 113 年度（2024 年），只有台北市', () => {
  assert.equal(age.year, 2024);
  assert.equal(age.rocYear, 113);
  assert.match(age.source.title, /113年度臺北市立圖書館年刊/);
});

test('每個年齡層（不分性別、女、男）的類別占比加起來是 100%（四捨五入到 0.1% 後容許 ±0.5）', () => {
  for (const g of age.groups) {
    for (const sex of ['all', 'female', 'male']) {
      const sum = g[sex].categories.reduce((s, c) => s + Number((c.share * 100).toFixed(1)), 0);
      assert.ok(Math.abs(sum - 100) <= 0.5, `${g.age} ${sex}：${sum}`);
    }
  }
});

// 隨機抽 10 格跟原表 PDF 逐格比對
const SPOT = [
  ['女', '0-5', '語言文學', 75612],
  ['女', '18-24', '哲學', 14900],
  ['女', '35-44', '學齡前', 74061],
  ['女', '55-64', '應用科學', 119617],
  ['女', '65+', '藝術', 78046],
  ['男', '6-11', '自然科學', 139588],
  ['男', '18-24', '語言文學', 46216],
  ['男', '25-34', '社會科學', 38968],
  ['男', '45-54', '總類', 38121],
  ['男', '65+', '史地', 92276],
];
test('抽 10 格跟原表 PDF 比對，數字一樣', () => {
  const key = { 女: 'female', 男: 'male' };
  for (const [sex, a, cat, expected] of SPOT) {
    const c = group(a)[key[sex]].categories.find((x) => x.name === cat);
    assert.equal(c.loans, expected, `${sex} ${a} ${cat}`);
  }
});

test('合計跟原表一樣：總借閱 12,871,611 冊；18–24 歲女 179,054、男 138,570', () => {
  assert.equal(age.totalLoans, 12_871_611);
  assert.equal(group('18-24').female.loans, 179_054);
  assert.equal(group('18-24').male.loans, 138_570);
  assert.equal(group('18-24').all.loans, 317_624);
});

test('抄錯一格時，資料整理模組會用原表的小計抓出來', () => {
  const bad = structuredClone(raw);
  bad.rows[3].counts[8] += 10; // 女 18-24 語言文學多抄 10
  assert.throws(() => buildAgeData(bad), /18-24/);
});

test('抄錯小計時也抓得出來', () => {
  const bad = structuredClone(raw);
  bad.grandTotal[10] -= 1;
  assert.throws(() => buildAgeData(bad), /總計/);
});
