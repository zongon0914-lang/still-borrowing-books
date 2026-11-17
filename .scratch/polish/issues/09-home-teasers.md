# 09: 首頁章節卡小數字

**What to build:** 首頁每張章節卡上有一個小數字預告：章節一「5.8 本」、章節二「新北 8.7 本」、章節三「2.2 本」，讀者還沒點進去就有點好奇。

詳見 [docs/spec-polish.md](../../../docs/spec-polish.md)（使用者故事 41；實作決策「首頁」）。

**Blocked by:** 02（同一頁）

**Status:** 已上線（2026-11-17，aed1c01）分支 ending。數字由 `site.js` 填（topCountyShort、topCountyPerCapita、youngPerCapita），測試在 `tests/home.test.mjs`。

- [x] 數字用現有的 `data-stat` 機制從數據填入，不寫死；沒有 JavaScript 時有合理的備用文字
- [x] 章節三卡片用 18–24 歲人均借閱，不用 2.5%
- [x] 手機 320／375px 不跑版（截圖）
- [x] `npm.cmd test` 全過
