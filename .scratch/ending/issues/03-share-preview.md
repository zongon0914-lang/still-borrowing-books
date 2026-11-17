# 03: 分享預覽

**What to build:** 把作品任何一頁的網址貼到 LINE、IG、Facebook 時，出現那一頁自己的標題、一句介紹和一張書頁風格的預覽圖（成績單頁寫「換你回答：你還借書嗎？」）。全站共用一張 1200×630 的預覽圖，用網站本身的書頁版面排好後截圖產生，內容是作品標題、副標題和「1.35 億冊」。分享設定裡的圖片和網址寫成正式網站的完整網址。縣市、類別、年齡結果頁共用同一組設定；成績單不做每個人專屬的預覽圖。

詳見 [docs/spec-ending.md](../../../docs/spec-ending.md)（使用者故事 21–25；實作決策「分享預覽」；測試決策「接縫三」）。

**Blocked by:** 01

**Status:** 已上線（2026-11-17）；完成（在 ending 分支）每頁 `<head>` 加上各自的 Open Graph／Twitter 卡片設定，全站共用 `assets/share-preview.png`（由 `tools/share-preview.html` 截圖產生），測試在 `tests/links.test.mjs`。

- [x] 每一頁都有分享用的標題、介紹、圖片、網址設定（Open Graph 和 Twitter 卡片），標題和介紹每頁各自寫
- [x] 預覽圖 1200×630，風格跟首頁一致；任務單上記下它是怎麼產生的，方便數據更新時重做
- [x] 自動測試：每一頁都有這些設定；圖片設定指向的檔案真的存在（本機檢查檔案）
- [x] `npm.cmd test` 全部通過

## 完成紀錄

- 10 個根目錄頁面的 `<head>` 都加了 `og:title`／`og:description`／`og:url`／`og:image`（含寬高、替代文字）和 `twitter:card=summary_large_image` 一組；標題、介紹沿用各頁的 `<title>` 和 description，所以每頁不同，成績單是「換你回答：你還借書嗎？｜…」。縣市、類別、年齡結果頁不依參數換。
- `tests/links.test.mjs` 新增 3 個測試：每頁都有設定、網址是正式網站完整網址；標題和介紹不重複；`og:image` 去掉正式網址開頭後，本機檔案存在（設定 `SITE_URL` 時改查線上網址打得開）。
- 預覽圖 `assets/share-preview.png`（1200×630）版面在 `tools/share-preview.html`，沿用 `assets/style.css` 的紙張色、字型和首頁大數字，「1.35 億冊」和年份由 `data.js` 填。數據更新後在專案根目錄的 PowerShell 重新產生（要連網路載字型）：

  ```powershell
  & "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --headless --disable-gpu --hide-scrollbars --force-device-scale-factor=1 --window-size=1200,630 --virtual-time-budget=8000 --screenshot="$PWD\assets\share-preview.png" "$PWD\tools\share-preview.html"
  ```

- 還沒做：上線後用 LINE 或 Facebook 分享偵錯工具看一次預覽（參賽者自己做）。
