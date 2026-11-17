# 我們這一代，還借書嗎？

115 學年世新大學資訊傳播創意大賞・資訊設計類參賽作品。規格見 [docs/spec.md](docs/spec.md)，用詞見 [GLOSSARY.md](GLOSSARY.md)。

## 作品連結

<https://zongon0914-lang.github.io/still-borrowing-books/>（上線與更新步驟見 [docs/deploy.md](docs/deploy.md)）

## 預覽

直接雙擊 `index.html` 就能在瀏覽器打開，不用安裝任何東西。
（圖表和字型從網路載入，離線時圖表會改顯示數字表格。）

## 資料夾說明

| 位置 | 內容 |
|---|---|
| `index.html`、`chapter*.html`、`sources.html` | 網站頁面 |
| `county.html` | 縣市細節頁範本，網址寫 `county.html?county=新北市` 決定顯示哪個縣市 |
| `assets/` | 樣式、程式，以及自動產生的 `data.js` |
| `tools/raw/` | 「公共圖書館統計」開放資料原始檔（2014–2025）、北市圖年齡表、國圖書單、台北各歲人口（`taipei-pop-2024.json`）、22 縣市圖書館查詢網址（`county-libraries.json`，人工核對） |
| `tools/clean-data.mjs` | 資料整理模組：原始資料 → 網站用的乾淨數據 |
| `tools/geo/` | 台灣 22 縣市界線（taiwan-atlas，MIT 授權；原始資料為內政部國土測繪中心） |
| `tools/build-map.mjs` | 把縣市界線轉成地圖用的 SVG 路徑，寫進 `assets/taiwan-map.js` |
| `tests/` | 檢查點一（數據對不對）、檢查點二（網站點得通） |
| `tools/check-mobile.html` | 檢查點二・手機版：每一頁用 320px、375px 打開，檢查有沒有左右捲動（用瀏覽器打開，見下方） |

## 常用指令（PowerShell）

```powershell
npm.cmd test              # 跑兩個檢查點
npm.cmd run check-online  # 線上版檢查點二：上線的網站每一頁都點得通（剛 push 完會先等線上更新，最多 5 分鐘）
npm.cmd run build-data    # 原始資料有改時，重新產生 assets/data.js
npm.cmd run build-map     # 縣市界線有改時，重新產生 assets/taiwan-map.js
npm.cmd run fetch-raw     # 重新從政府 API 下載原始資料（平常不用）
npm.cmd run fetch-population  # 重新下載台北 2024 年底各歲人口，存成 tools/raw/taipei-pop-2024.json（平常不用）
npm.cmd run setup-hooks   # 每台電腦跑一次：之後每次 commit 前自動跑 npm test，沒過就不讓 commit
```

自動把關有兩道：commit 前的 `.githooks/pre-commit`（要先跑一次 `setup-hooks`），以及推上 GitHub 後的 `.github/workflows/test.yml`（結果在儲存庫的 Actions 分頁）。

手機版檢查不是指令，是用瀏覽器打開一個網頁，等它跑完看結果（約 1 分鐘）：

- 線上版：<https://zongon0914-lang.github.io/still-borrowing-books/tools/check-mobile.html>
- 本機版：先開本機預覽，再打開 `http://localhost:8123/tools/check-mobile.html`（直接雙擊檔案打不開）
