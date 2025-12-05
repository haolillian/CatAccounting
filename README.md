# 貓咪記帳小島 (Cat Accounting)

這是一個簡單的純前端單頁應用（HTML/CSS/JS），結合記帳與養貓遊戲：每新增一筆支出，貓咪會獲得 EXP 並可能升級，心情也會依花費比例改變。

檔案
- `index.html`：主頁
- `style.css`：樣式
- `script.js`：前端邏輯（含 localStorage）
- `requirements.txt`：空檔，避免某些 CI/平台在找不到該檔案時失敗

快速在本機啟動（選項一：用簡單的 HTTP server）
```bash
cd /path/to/repo
python3 -m http.server 8000
# 然後瀏覽 http://localhost:8000
```

部署到 Render（建議）
1. 在 Render 建立一個新的 Static Site（非 Web Service）。
2. 連接到此 GitHub Repo，選擇 `main` 分支。
3. 不需要 build command（留空），Publish directory 設為 `/`（或你放檔案的資料夾）。
4. Deploy。

常見錯誤
- 若你在 Render 建立的是 Web Service 而非 Static Site，Render 會嘗試用 Python/Node 等進行 build，若 repository 沒有 `requirements.txt` 會出現「Could not open requirements file」的錯誤。解法：
  - 改在 Render 建立 Static Site（推介），或
  - 在 repo 加入 `requirements.txt`（即使為空）並提供適合的 Build/Start 指令。

下一步（可選）
- 我要幫你把 README 補充更多部署步驟或新增 Render 的 `render.yaml` 配置檔來自動化部署設定嗎？

---
作者：貓咪記帳小島
