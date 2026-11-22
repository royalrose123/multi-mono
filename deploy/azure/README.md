# Azure 部署對應（範例，未實際部署）

| demo | Azure |
|---|---|
| order、invoice 容器 | 兩個 Azure Container Apps（同一個 Container Apps Environment），image 放在 Azure Container Registry |
| config-server | Azure Blob Storage（`menu.json`、`assets/menu-runtime.js`），前面加 Azure Front Door 或 CDN |
| `AUTH_SECRET`、`REVALIDATE_TOKEN` | Key Vault，以 secret reference 注入 Container Apps |
| order 的 rewrites | 維持 rewrites；或改用 Front Door 依路徑分流（見下方） |

## config-server（Blob Storage）注意事項（範例，未實際部署驗證）

- **CORS**：Blob Storage 預設不送 CORS header。runtime Menu 會從網站網域 `import()` JS 並 fetch `menu.json`，所以必須在 Blob 服務設定 CORS 規則：Allowed origins 只填網站網域、Allowed methods 只開 GET、HEAD、OPTIONS。沒設的話瀏覽器會擋下請求，畫面顯示「選單載入失敗」。
- **匿名讀取**：新的 storage account 預設關閉匿名讀取。`MENU_CONFIG_URL` 讀不到時，app 會靜默改用備援 menu（不會報錯）。解法擇一：開放 `config` container 的公開讀取；或改讓 app 讀 Front Door / CDN 網址；或改用 SAS / managed identity 存取。

## 路由：rewrites 與 Front Door

- **維持 order rewrites**：invoice 只開內部 ingress，order 用內部 FQDN 轉發。`INVOICE_ZONE_URL` 在 build 時寫死，invoice 換網址要重新 build order。
- **改用 Front Door**：Front Door 規則 `/invoices/*`、`/invoices-static/*` → invoice，`/*` → order。order 移除 rewrites，兩個 app 對等；invoice 換網址只要改 Front Door。快取規則：`/_next/static/*`、`/invoices-static/_next/static/*` 長快取；HTML 與 RSC 請求（`RSC` header 或 `_rsc` query）不快取。

## 環境變數

| 名稱 | 值 |
|---|---|
| `INVOICE_ZONE_URL`（order build arg） | `https://<invoice 內部 FQDN>` |
| `MENU_CONFIG_URL` | `https://<storage>.blob.core.windows.net/config/menu.json` |
| `MENU_RUNTIME_URL` | `https://<cdn>/assets/menu-runtime.js` |
| `AUTH_SECRET`、`REVALIDATE_TOKEN` | Key Vault secret reference |
| `COOKIE_SECURE` | `1` |

## 多個 replica 時要注意

- Menu 的 data cache 存在每個容器自己的檔案系統，revalidate API 只會清到收到請求的那個 replica；需要全部立即一致時，改用共享的 `cacheHandler`（例如 Azure Cache for Redis），或接受最多 60 秒的延遲。
- 若使用 Server Actions，要設定固定的 `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY`（本 demo 沒有使用 Server Actions）。
