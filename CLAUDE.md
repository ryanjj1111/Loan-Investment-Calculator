# CLAUDE.md

投資帳本：純前端網頁 App（GitHub Pages），記帳、策略檢核、信貸試算。使用者的資料只存在自己的瀏覽器；`data/` 是 GitHub Actions 抓的公開市場資料。回覆與 PR 說明用繁體中文。

## 鐵則：這是公開 repo
- 程式、註解、測試、資料、commit 訊息、PR 說明都不能出現任何人的個人資料或個人策略：持股代號清單、股數、金額、成本、貸款條件、帳戶名稱、個人策略的參數與說明。
- 範例一律用通用標的（2330、2454、0050）；測試設定檔用虛構數字；註解不寫是哪一檔股票發生的問題。
- 抓資料的流程不讀任何使用者輸入；範圍只以整個市場、指數或類別增減。

## 工作方式
- 使用者說「開始」之前，只討論、釐清、提方案，不改程式、不推分支。
- 大改分批，每批一個能獨立合併的 PR，避免做到一半。
- 改了 `js/`，就把 `index.html` 裡所有 `?v=` 改成新版本號（`YYYYMMDD` 加字母，例如 `20261127a`）。
- 不手改排程產生的 `data/` 檔案；改抓取程式時在分支上實跑驗證。

## 不能改壞的
- 信貸計算：改動前後，信貸卡片、結算、還款數字要和 main 完全相同。
- `tools/test/expected/` 只有在刻意改計算規則、確認新數字正確時，才用 `--update` 重新產生。

## 測試（改 `js/` 或 `tools/` 後全跑）
```
node tools/test/engine-test.mjs
node tools/test/check-test.mjs
node tools/test/ai-text-test.mjs
node tools/test/brief-sync-test.mjs
node tools/test/us-test.mjs
python3 tools/test/us-fetch-test.py
```

## 結構
- `index.html`：畫面、樣式、使用說明；`js/`：`engine.js`（信貸計算核心）、`asset-*`、`strategy-*`、`check.js`（條件判斷）、`eval.js`、`us-*`、`ai-ask.js`／`ai-import.js`（AI 討論與匯入）、`brief-sync.js`（上傳晨報用資料）。
- `tools/fetch-*`：抓資料；`.github/workflows/`：排程；`catchup.yml` 補跑過期資料。

## 畫面慣例
- 顏色：漲紅 `.up`、跌綠 `.dn`、通過 `.ok`、警告 `.bad`、提醒 `.wn`。
- emoji 在顯示時由 `js/icons.js` 換成線條圖示，程式字串不用改。
- 說明文字收進 ⓘ（`tipI()`）；數字、警告、隱私提醒留在畫面上。
