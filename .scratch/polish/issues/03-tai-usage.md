# 03: 「台」用字

**What to build:** 全站的敘述和縣市名稱都寫「台」（台北市、台中市、台南市、台東縣），地圖、排行、縣市頁、成績單選單都跟著變；書名和機構名稱（例如臺北市立圖書館）照原文不動。舊網址 `county.html?county=臺北市` 照樣打得開，頁面顯示「台北市」。

詳見 [docs/spec-polish.md](../../../docs/spec-polish.md)（使用者故事 21–23；實作決策「用字『台』」）。用詞見 GLOSSARY.md「台（用字）」。

**Blocked by:** None (can start immediately)

**Status:** 完成（2026-11-17）分支 ending。`tools/clean-data.mjs` 的 `countyName` 在整理時轉成「台」，重新產生 data.js 和 taiwan-map.js；`county.js` 接受舊網址「臺」。全站掃描在 `tests/wording.test.mjs`。

- [x] 縣市名稱在資料整理流程轉成「台」，重新產生網站數據和地圖數據
- [x] 縣市頁同時接受「台」和「臺」的網址參數，有測試
- [x] 頁面和畫面用的 JS 裡寫死的「臺北市」等改掉（例如結語、章節二找台北的地方）
- [x] 新增全站掃描測試：敘述裡沒有「臺」，書名、機構名稱、報告名稱例外
- [x] `tests/sources.test.mjs` 檢查「臺中」那一行跟著新規則改
- [x] `npm.cmd test` 全過；站內爬蟲 22 縣市都點得到
