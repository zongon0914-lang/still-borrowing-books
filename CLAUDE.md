# 我們這一代，還借書嗎？

資訊設計類參賽作品，純靜態網站（GitHub Pages）。使用者偏好繁體中文、白話解釋、PowerShell 指令（`npm.cmd`）。

- 找檔案、看哪一頁用哪些程式：先讀 `docs/file-map.md`。
- 寫或 review 程式：照 `CODING_STANDARDS.md`。
- 推 `main` 就是更新正式網站：推之前先問使用者，推完跑 `npm.cmd run check-online`（步驟見 `docs/deploy.md`）。

## Agent skills

### Issue tracker

任務是 `.scratch/<功能>/issues/` 底下的 Markdown 檔，做完改 `**Status:**` 那一行。See `docs/agents/issue-tracker.md`.

### Domain docs

Single-context：根目錄一份 `GLOSSARY.md`，決策放 `docs/adr/`。See `docs/agents/domain.md`.
