# 任務追蹤：本機 Markdown

這個專案的任務是 `.scratch/` 底下的 Markdown 檔，跟程式一起 commit。沒有用 GitHub Issues。

## 放在哪裡

- 一個功能一個資料夾：`.scratch/<功能>/`，例如 `.scratch/borrowing-scorecard/`。
- 每張任務一個檔案：`.scratch/<功能>/issues/<NN>-<英文短名>.md`，從 `01` 開始編號。
- 規格放在 `docs/spec-<功能>.md`（例如 `docs/spec-scorecard.md`），不放在 `.scratch/`。任務檔用相對連結指回規格。

## 一張任務的格式

```markdown
# 03: 任務標題

**What to build:** 這張要做出什麼，讀者看得到的結果。

詳見 [docs/spec-scorecard.md](../../../docs/spec-scorecard.md)（使用者故事 24、25）。

**Blocked by:** 01（沒有就寫 None (can start immediately)）

**Status:** ready-for-agent

- [ ] 完成條件，一條一條可以勾
```

## 狀態怎麼改

- 新開的任務：`**Status:** ready-for-agent`。
- 做完：把 `**Status:**` 那一行改成 `完成（YYYY-MM-DD）`，後面接一句重點（在哪個分支、測試在哪、跟規格不一樣的決定），再把完成條件勾成 `- [x]`。
- 上線後：改成 `已上線（YYYY-MM-DD）`，寫線上檢查的結果和還剩什麼要使用者自己做。
- 要補充的討論，加在檔案最後的 `## Comments` 底下。

## 技能說「發到任務追蹤」「讀那張任務」時

- 發到任務追蹤：照上面的格式在 `.scratch/<功能>/issues/` 新增檔案，編號接在最後一張後面。
- 讀那張任務：打開使用者給的路徑或編號對應的檔案。
