# 上線到 GitHub Pages

作品連結會是：

```
https://zongon0914-lang.github.io/still-borrowing-books/
```

這個網址也寫在 `package.json` 的 `homepage`，線上檢查會自動用它。改了儲存庫名稱的話，記得兩處一起改。

網站是純靜態檔案（HTML、CSS、JavaScript），不用安裝或建置，整個資料夾推上 GitHub 就是網站。
資料夾裡的 `.nojekyll` 是給 GitHub Pages 看的空檔案，意思是「照原樣發布，不要加工」，請不要刪。

> 注意：儲存庫是**公開**的，裡面所有檔案（含 `docs/`、`.scratch/`、`.claude/`、`tools/raw/` 和比賽海報 PNG）任何人都看得到。推上去之前，確認沒有不想公開的東西。

---

## 第一次上線（只做一次）

> 已於 2026-11-17 完成（用 GitHub CLI 建立儲存庫、推送、開啟 Pages）。以下留作紀錄；之後只需要看「之後怎麼更新網站」。

### 1. 在 GitHub 建立儲存庫

1. 登入 <https://github.com>，右上角 **＋** → **New repository**。
2. **Repository name** 填 `still-borrowing-books`。
3. 選 **Public**（GitHub Pages 免費版只能發布公開儲存庫）。
4. 下面「Add a README」「.gitignore」「license」**都不要勾**——這些檔案我們已經有了，勾了會讓第一次推送衝突。
5. 按 **Create repository**。

### 2. 把網站推上去

在專案資料夾打開 PowerShell（檔案總管進到專案資料夾 → 網址列打 `powershell` 按 Enter），先確認所有變更都已經 commit：

```powershell
git status
```

看到 `nothing to commit, working tree clean` 就可以繼續。如果列出還沒提交的檔案，先執行：

```powershell
git add -A
```

```powershell
git commit -m "Update site"
```

然後一行一行貼上執行：

```powershell
git branch -M main
```

（把本機分支名稱從 `master` 改成 `main`，跟 GitHub 預設一致。）

```powershell
git remote add origin https://github.com/zongon0914-lang/still-borrowing-books.git
```

```powershell
git push -u origin main
```

如果跳出登入視窗，用你的 GitHub 帳號登入即可。

### 3. 開啟 GitHub Pages

1. 到儲存庫頁面 → 上方 **Settings** → 左邊 **Pages**。
2. **Source** 選 **Deploy from a branch**。
3. **Branch** 選 `main`，資料夾選 `/ (root)`，按 **Save**。
4. 等 1～3 分鐘。重新整理這一頁，上方出現「Your site is live at …」就好了。

### 4. 確認上線成功

- 用**無痕視窗**打開作品連結，點過首頁、三個章節和資料來源頁。
- 用**手機**打開同一個連結看一次。
- 在 PowerShell 跑線上版檢查點二，全部打勾就代表線上每一頁、每個檔案都點得通：

```powershell
npm.cmd run check-online
```

---

## 之後怎麼更新網站

每完成一張任務、改好內容後：

1. 先在本機跑兩個檢查點，全部通過再上傳：

   ```powershell
   npm.cmd test
   ```

2. 確認變更都已經 commit（Claude 做完任務時通常已經 commit 好了）：

   ```powershell
   git status
   ```

   如果列出還沒提交的檔案，先 `git add -A`，再 `git commit -m "Update site"`。

3. 推上 GitHub：

   ```powershell
   git push
   ```

4. 跑線上檢查。push 完可以馬上跑：它會先確認線上已經換成新版本（GitHub Pages 要 1～3 分鐘），還沒換好就每 30 秒再看一次，最多等 5 分鐘，換好了才開始檢查：

   ```powershell
   npm.cmd run check-online
   ```

5. 用瀏覽器打開手機版檢查，等它跑完（約 1 分鐘），看到「✔ 全部通過」就代表每一頁在手機寬度都不會左右捲動：

   <https://zongon0914-lang.github.io/still-borrowing-books/tools/check-mobile.html>

   再打開成績單檢查，看到「✔ 全部通過」就代表填表、換一本、借書連結、存成圖片都正常：

   <https://zongon0914-lang.github.io/still-borrowing-books/tools/check-scorecard.html>

6. 打開作品連結看一次（看不到新內容就按 `Ctrl + F5` 強制重新整理）。

作品連結永遠不變，評審點開看到的就是最新版本。

## 出問題時

| 狀況 | 怎麼辦 |
|---|---|
| 打開連結是 404 | Pages 剛開或剛更新，等幾分鐘；仍不行就到 Settings → Pages 看 Branch 是不是 `main`、`/ (root)` |
| `check-online` 說等了 5 分鐘還是舊版本 | 到儲存庫頁面 → 上方 **Actions**，看「pages build and deployment」有沒有紅色叉叉；沒有的話過幾分鐘再跑一次 |
| 本機正常，線上某個檔案壞掉 | 多半是檔名大小寫不一致（GitHub 分大小寫，Windows 不分）。`npm.cmd test` 會指出是哪一個 |
| `check-online` 說某個縣市圖書館連結壞掉（✖） | 先用瀏覽器打開那個網址；真的打不開，就到圖書館網站找新的查詢網址，改 `tools/raw/county-libraries.json`，再跑 `npm.cmd run build-data`。只有 ⚠（被擋）不用處理 |
| `git push` 被拒絕（rejected） | 有人在 GitHub 網頁上改過檔案。先跑 `git pull --rebase`，再 `git push` |
| 圖表沒出來、只顯示數字表格 | 圖表程式從網路載入失敗，重新整理；網站本身沒壞 |
