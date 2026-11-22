# Azure 部署對應（範例，未實際部署）

| demo | Azure |
|---|---|
| order、invoice 容器 | 兩個 Azure Container Apps（同一個 Container Apps Environment），image 放在 Azure Container Registry |
| `./deploy:/config:ro` 掛進 order | Azure Files share（放 `menu.json`）以 volume 掛進 order 的 Container App，掛載路徑 `/config`（對應舊 demo 在 Kubernetes 用的 ConfigMap） |
| runtime Menu（`/menu-runtime/menu-runtime.js`） | 打包進 order 的 image（`public/`），隨 order 部署，不需要另外的儲存體或 CDN |
| `AUTH_SECRET`、`REVALIDATE_TOKEN` | Key Vault，以 secret reference 注入 Container Apps |
| order 的 rewrites | 維持 rewrites；或改用 Front Door 依路徑分流（見下方） |

## menu.json（Azure Files volume）

- order 每次請求都讀 `MENU_FILE`，所以上傳新的 `menu.json` 到 share 後立即生效，不用重啟 revision。
- 掛整個 share（資料夾），不要用單一檔案的 subPath：檔案被「寫新檔再改名」覆蓋時，單檔掛載可能看不到新內容。
- invoice 經內部 ingress 向 order 的 `/api/menu` 取得 menu（快取 60 秒）；上傳後呼叫 invoice 的 revalidate API 可立即更新（`.github/workflows/menu-config.yml`）。
- order 有多個 replica 時，它們掛同一個 share，讀到的是同一份檔案。

## 路由：rewrites 與 Front Door

- **維持 order rewrites**：invoice 只開內部 ingress，order 用內部 FQDN 轉發。`INVOICE_ZONE_URL` 在 build 時寫死，invoice 換網址要重新 build order。
- **改用 Front Door**：Front Door 規則 `/invoices/*`、`/invoices-static/*` → invoice，`/*` → order。order 移除 rewrites，兩個 app 對等；invoice 換網址只要改 Front Door。快取規則：`/_next/static/*`、`/invoices-static/_next/static/*` 長快取；HTML、RSC 請求（`RSC` header 或 `_rsc` query）與 `/api/menu` 不快取。

## 環境變數

| 名稱 | 值 |
|---|---|
| `INVOICE_ZONE_URL`（order build arg） | `https://<invoice 內部 FQDN>` |
| `MENU_FILE`（order） | `/config/menu.json`（Azure Files volume 的掛載路徑） |
| `MENU_CONFIG_URL`（invoice） | `https://<order 內部 FQDN>/api/menu` |
| `AUTH_SECRET`、`REVALIDATE_TOKEN` | Key Vault secret reference |
| `COOKIE_SECURE` | `1` |

## 多個 replica 時要注意

- invoice 的 Menu data cache 存在每個容器自己的檔案系統，revalidate API 只會清到收到請求的那個 replica；需要全部立即一致時，改用共享的 `cacheHandler`（例如 Azure Cache for Redis），或接受最多 60 秒的延遲。order 不快取 menu，沒有這個問題。
- 若使用 Server Actions，要設定固定的 `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY`（本 demo 沒有使用 Server Actions）。

## 必要時改用獨立 config-server

本 demo 先前的版本有一個獨立的 config-server（模擬 Azure Blob + CDN）提供 `menu.json` 與 runtime Menu 的 JS，現在改由 order 提供。

**何時值得**：

- Menu 資料或 runtime 元件要**完全獨立於 app 部署**（例如改 runtime Menu 的程式碼不想部署 order）。
- **多個網站共用**同一份 Menu 或同一個 Web Component，不適合綁在其中一個 app 上。

**做法**：`menu.json` 與 `assets/menu-runtime.js` 放在 Azure Blob Storage，前面加 Azure Front Door 或 CDN；invoice（與 order）的 `MENU_CONFIG_URL` 指向 Blob / CDN，runtime Menu 從 CDN `import()`。

**代價**：

- **多一個服務**要部署、監控，也多一個故障點（設定服務掛掉時，兩個 zone 都只能用備援 menu）。
- **CORS**：Blob Storage 預設不送 CORS header。runtime Menu 會從網站網域 `import()` JS 並 fetch `menu.json`，所以必須在 Blob 服務設定 CORS 規則：Allowed origins 只填網站網域、Allowed methods 只開 GET、HEAD、OPTIONS。沒設的話瀏覽器會擋下請求，畫面顯示「選單載入失敗」。
- **讀取權限**：新的 storage account 預設關閉匿名讀取。`MENU_CONFIG_URL` 讀不到時，app 會靜默改用備援 menu（不會報錯）。解法擇一：開放 `config` container 的公開讀取；或改讓 app 讀 Front Door / CDN 網址；或改用 SAS / managed identity 存取。
