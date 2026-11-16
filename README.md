# 我們這一代，還借書嗎？

115 學年世新大學資訊傳播創意大賞・資訊設計類參賽作品。規格見 [docs/spec.md](docs/spec.md)，用詞見 [GLOSSARY.md](GLOSSARY.md)。

## 預覽

直接雙擊 `index.html` 就能在瀏覽器打開，不用安裝任何東西。
（圖表和字型從網路載入，離線時圖表會改顯示數字表格。）

## 資料夾說明

| 位置 | 內容 |
|---|---|
| `index.html`、`chapter*.html`、`sources.html` | 網站頁面 |
| `assets/` | 樣式、程式，以及自動產生的 `data.js` |
| `tools/raw/` | 「公共圖書館統計」開放資料原始檔（2014–2025） |
| `tools/clean-data.mjs` | 資料整理模組：原始資料 → 網站用的乾淨數據 |
| `tests/` | 檢查點一（數據對不對）、檢查點二（網站點得通） |

## 常用指令（PowerShell）

```powershell
npm.cmd test              # 跑兩個檢查點
npm.cmd run build-data    # 原始資料有改時，重新產生 assets/data.js
npm.cmd run fetch-raw     # 重新從政府 API 下載原始資料（平常不用）
```
