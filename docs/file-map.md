# 檔案地圖

改東西之前先看這頁，找到要動的檔案就直接打開，不用整個資料夾掃一遍。各檔案開頭的註解寫了它做什麼；指令在 `package.json` 的 `scripts`。

## 網站是純靜態的

沒有後端、沒有打包工具。瀏覽器直接載入根目錄的 `.html` 和 `assets/`，GitHub Pages 從 `main` 的根目錄發布。數據在開發時就整理好，寫進 `assets/data.js`（`window.LIBRARY_DATA`），網站不即時抓 API。

## 數據怎麼來

```
tools/raw/*.json ──tools/clean-data.mjs（整理、核對）──tools/build-data.mjs──> assets/data.js
tools/geo/counties-10t.json ──tools/build-map.mjs──> assets/taiwan-map.js
```

- `assets/data.js`、`assets/taiwan-map.js` 是產生出來的：改 `tools/raw/` 或 `tools/clean-data.mjs`，再跑 `npm.cmd run build-data`（或 `build-map`）。
- `tools/raw/` 大多是政府開放資料原檔；`county-libraries.json`（22 縣市圖書館查詢網址）是人工核對的。
- `tools/fetch-*.mjs` 重新下載原檔，平常不用跑。

## 哪一頁用哪些程式

每一頁都先載入 `data.js` 和 `site.js`（共用：數字格式、把 `data-stat` 欄位填上數字）。

| 頁面 | 專用程式 | 計算那一半（Node 裡可測） | 測試 |
|---|---|---|---|
| `index.html`（大數字下的總答案、卡片：一、二、三、結語、換你回答，章節卡的小數字由 `site.js` 填） | 無 | | `links.test.mjs`、`home.test.mjs`、`ending.test.mjs`（總答案） |
| `chapter1.html` 一年借幾本 | `chapter1.js` | `Chapter1Page.guess`（先猜再看的揭曉句）、`axisTick`／`axisUnit`（縱軸刻度） | `data.test.mjs`、`chapter1-guess.test.mjs` |
| `chapter2.html` 哪裡最愛借 | `taiwan-map.js`、`chapter2.js` | `Chapter2Page.mapLabels`（地圖標哪幾個縣市、標籤放哪裡） | `data.test.mjs`、`chapter2.test.mjs` |
| `county.html?county=…` | `county.js` | `CountyPage.view` | `county.test.mjs` |
| `chapter3.html` 我們借什麼 | `chapter3.js` | `Chapter3Page.view`（人均借閱、生活感換算、顏色深淺表） | `chapter3.test.mjs`、`age.test.mjs` |
| `ending.html` 結語：所以，還借書嗎？ | `chapter3.js`、`ending.js` | `EndingPage.view` | `ending.test.mjs`、`links.test.mjs` |
| `age.html?age=…&sex=…` | `chapter3.js`、`age.js` | `AgePage.view` | `age-tool.test.mjs` |
| `category.html?category=…` | `category.js` | `CategoryPage.view` | `category.test.mjs`、`books.test.mjs` |
| `scorecard.html` 借書成績單 | `chapter3.js`、`scorecard.js`、`scorecard-image.js` | `Scorecard.compute`、`Scorecard.libraryLink`、`ScorecardImage.content` / `layout` | `scorecard*.test.mjs`、`library.test.mjs` |
| `sources.html` 資料來源與 AI 使用說明 | 無 | | `sources.test.mjs` |

`chapter3.js` 也給成績單、年齡工具和結語用（年齡層名稱、網址、「18–24 歲人均借閱是不是所有年齡層最低」），所以要比它們先載入。結語的三個發現和整體答案只在 `EndingPage.view` 產生；`ending.html` 和 `index.html` 裡的總答案、結語的備用文字要跟它一樣（`ending.test.mjs` 會比對）。章節三的顏色深淺表也是寫在 HTML 裡的備用表格，數據變了要跟著改（`chapter3.test.mjs` 會比對）。

縣市名稱一律寫「台」：`tools/clean-data.mjs` 的 `countyName` 在整理時就轉好，`county.js` 也接受舊網址的「臺」。用字規則（「台」、中文標點後不空白、不寫「十年」）由 `wording.test.mjs` 掃全站。

## 檢查

| 檢查 | 怎麼跑 | 看什麼 |
|---|---|---|
| 全部自動測試 | `npm.cmd test`（commit 前和推上 GitHub 時也會自動跑） | 數據對不對、站內連結、導覽列、每頁內容、成績單所有組合（含圖片長條圖）、用詞 |
| 線上網站 | `npm.cmd run check-online` | 線上每頁點得通，加上 22 縣市圖書館連結（`tools/check-libraries.mjs`） |
| 手機寬度 | 瀏覽器打開 `tools/check-mobile.html` | 每頁 320／375px 不左右捲動、不卡在「載入中」 |
| 成績單操作 | 瀏覽器打開 `tools/check-scorecard.html` | 填表、換一本、借書連結、1080×1920 圖片 |

## 分享預覽

每一頁 `<head>` 裡有 Open Graph 和 Twitter 卡片設定（標題、介紹每頁各自寫，圖片和網址寫正式網站的完整網址；`links.test.mjs` 會檢查）。全站共用一張預覽圖 `assets/share-preview.png`（1200×630），版面在 `tools/share-preview.html`（沿用 `style.css`，數字由 `data.js` 填）。數據更新後要重新產生，在專案根目錄的 PowerShell 執行（要連網路載字型）：

```powershell
& "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --headless --disable-gpu --hide-scrollbars --force-device-scale-factor=1 --window-size=1200,630 --virtual-time-budget=8000 --screenshot="$PWD\assets\share-preview.png" "$PWD\tools\share-preview.html"
```

新增頁面時，從現有頁面複製這組設定，改 `og:title`、`og:description`、`og:url`（和對應的 `twitter:`）。

`tests/crawl.mjs` 是 `links.test.mjs` 用的站內爬蟲；`tools/live-version.mjs` 讓 `check-online` 先等 GitHub Pages 換成新版本。

## 文件

- 規格：`docs/spec.md`（整個網站）、`docs/spec-scorecard.md`（借書成績單）、`docs/spec-ending.md`（結語、章節進度、分享預覽、先猜再看、捲動動畫）、`docs/spec-polish.md`（交件前打磨：年齡改用人均、答案往前放、「台」用字、顏色深淺表、成績單長條圖）
- 上線步驟和出問題時怎麼辦：`docs/deploy.md`
- 用詞：`GLOSSARY.md`；寫程式的規則：`CODING_STANDARDS.md`
- 任務：`.scratch/<功能>/issues/`（見 `docs/agents/issue-tracker.md`）

## 容易踩到的地方

- **本機預覽要用網址開。** 伺服器是 `tools/serve.mjs`（`npm.cmd run serve`），每個回應都叫瀏覽器不要快取，改完重新整理就是新版。`tools/check-*.html` 雙擊打開會讀不到其他頁面。
- **8123 被佔住時換 port。** `.claude/launch.json` 的 `site` 固定用 8123（預覽分頁要對得上），被別的預覽（例如另一個 worktree）佔住就起不來。小幫手或第二個預覽用 `npm.cmd run serve -- 0`，系統會挑空的 port，網址印在第一行。
- **瀏覽器面板藏起來時，動畫不會跑。** 面板沒顯示，頁面就不繪製：捲動動畫、「捲到才畫」的圖都不會觸發，截圖也會逾時。這種時候看到長條是空的、圖沒畫出來，先執行 `await new Promise(r => { requestAnimationFrame(() => r('有在繪製')); setTimeout(() => r('沒在繪製'), 1000); })`，是「沒在繪製」就請使用者把面板打開再檢查，不要當成網站的 bug。
- **線上網站的 `assets/*.js` 會被快取約 10 分鐘。** GitHub Pages 的設定，剛上線看到舊版就按 `Ctrl + F5`。
- **GitHub 分大小寫，Windows 不分。** 檔名大小寫打錯，本機正常、線上 404；`npm.cmd test` 會抓到。
- **推 `main` 就是更新正式網站。** 推之前先問使用者。
