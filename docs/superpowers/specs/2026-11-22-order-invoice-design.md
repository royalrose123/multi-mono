# Order × Invoice Multi-Zones Demo — 設計規格

> 日期：2026-11-22
> 狀態：設計已逐段確認，待使用者檢查本文件
> 標示「**合約**」的值（port、路徑、環境變數、cookie 名稱、套件名稱、版本）在實作時不得自行更改；有疑慮先停下來確認。

---

## 0. 目的

用兩個各自獨立部署的 Next.js 15 App Router app（**order**、**invoice**）組成同一個網站，並交付一份說明實作與選型的 tech review。

demo 要能實際展示：

1. 使用者只從 order 的網域進入，`/invoices/*` 由 invoice 提供（Multi-Zones，order 用 rewrites 轉發）。
2. 同一 zone 內是 soft navigation，跨 zone 是整頁載入，畫面上能直接看出差別。
3. 兩個 app 共用 Menu、設計系統和登入狀態。
4. **各自獨立部署**：改哪個 app 就只部署哪個；改共用套件時兩個都部署；改 Menu 內容時不部署任何 app。
5. Build-time Menu 和 runtime 載入的 Menu 並列對照，比較兩者的取捨。

不做的事：真正的認證系統、資料庫、實際部署到 Azure、i18n。

---

## 1. 技術決策摘要

| 決策 | 選擇 | 主要理由 |
|---|---|---|
| 整合方式 | Next.js Multi-Zones | 官方支援，App Router / RSC / SSR 完整保留，可各自部署 |
| 程式碼管理 | Monorepo：pnpm workspace + Turborepo | 共用程式碼一份、版本一致、`--affected` 判斷要部署哪個 app |
| 共用套件形式 | Just-in-Time packages（TS 原始碼 + `transpilePackages`） | 設定最少、改了就 hot reload；demo 不需要發佈 npm |
| 路由層 | order 的 `next.config.ts` rewrites | order 是主網站，本機和 Docker 設定最少；正式環境可改 Front Door（寫在 tech review） |
| zone 靜態資源 | invoice 用 `assetPrefix`，**不用 `basePath`** | 依 Next 官方 Multi-Zones 文件；頁面直接放在 `app/invoices/`，路徑不需轉換 |
| React 版本 | 兩個 app 都用 React 19 | App Router 實際一律使用 Next 內建的 React 19 canary（見 §10），裝 18 只會讓測試和型別與實際執行脫節 |
| tech review 形式 | 單一 HTML 檔，放在 repo 的 `docs/tech-review.html` | 使用者選擇 |

---

## 2. 目錄結構（合約）

專案根目錄：`/Users/royal/Desktop/projects/order-invoice/`

```
order-invoice/
├── apps/
│   ├── order/                 # @repo/order，主網站
│   └── invoice/               # @repo/invoice
├── packages/
│   ├── ui/                    # @repo/ui：設計系統
│   ├── menu/                  # @repo/menu：zone 路由表、ZoneLink、build-time Menu
│   ├── menu-runtime/          # @repo/menu-runtime：runtime 版 Menu（Vite 打包成 ESM）
│   ├── auth/                  # @repo/auth：session JWT
│   ├── zone-inspector/        # @repo/zone-inspector：導頁視覺化工具列
│   └── tsconfig/              # @repo/tsconfig：共用 tsconfig
├── services/
│   └── config-server/         # @repo/config-server：提供 menu.json 與 runtime menu JS
├── deploy/
│   ├── menu.json              # Menu 資料（改這個不用部署 app）
│   └── azure/                 # Azure 對應說明（tech review 引用）
├── e2e/                       # Playwright 測試
├── scripts/                   # deploy-affected 等輔助腳本
├── .github/workflows/         # CI 範例（標註為未實際執行）
├── docs/
│   ├── tech-review.html
│   └── superpowers/specs/     # 本文件
├── docker-compose.yml
├── turbo.json
├── pnpm-workspace.yaml
├── package.json
├── .nvmrc                     # 20.20.2
└── .env.example
```

---

## 3. 版本（合約）

所有 dependencies 寫**精確版本**（不得出現 `^`、`~`）。

| 項目 | 版本 |
|---|---|
| Node | 20.20.2（`.nvmrc`；`engines.node` 寫 `>=20.9.0`） |
| next | 15.5.28 |
| react / react-dom | 19.3.1 |
| @types/react / @types/react-dom | 19.3.0 / 19.3.0 |
| typescript | 5.9.3 |
| tailwindcss / @tailwindcss/postcss | 4.3.5 |
| pnpm、turbo、jose、zod、vite、vitest、@playwright/test | 實作第一步查詢當下穩定版後固定，寫回本表 |

pnpm 透過 corepack 啟用，根目錄 `package.json` 的 `packageManager` 欄位固定版本。

---

## 4. Zone 與路由（合約）

### 4.1 Zone 定義

| | order | invoice |
|---|---|---|
| 套件名 | `@repo/order` | `@repo/invoice` |
| dev / start port | 3000 | 3001 |
| 負責路徑 | `/`、`/orders`、`/orders/[id]`、`/login`、`/api/*`，以及所有沒被 invoice 接走的路徑 | `/invoices`、`/invoices/[id]`、`/invoices/api/*` |
| `assetPrefix` | 不設 | `/invoices-static` |
| public 檔案位置 | `public/` | `public/invoices-static/` |
| `--color-zone` | `#2563eb`（藍） | `#16a34a`（綠） |

### 4.2 order 的 rewrites

```ts
// apps/order/next.config.ts
async rewrites() {
  const invoice = process.env.INVOICE_ZONE_URL
  return [
    { source: '/invoices', destination: `${invoice}/invoices` },
    { source: '/invoices/:path+', destination: `${invoice}/invoices/:path+` },
    { source: '/invoices-static/:path+', destination: `${invoice}/invoices-static/:path+` },
  ]
}
```

`INVOICE_ZONE_URL` 在 build 時寫進 routes-manifest；改變它要重新 build order。

### 4.3 zone 路由表與 ZoneLink（`@repo/menu`）

- `zones.ts` 匯出 `type Zone = 'order' | 'invoice'` 和 `zoneForPath(path: string): Zone`：`/invoices` 或 `/invoices/...` 屬於 invoice，其餘屬於 order。只接受站內路徑（以單一 `/` 開頭）。
- `<ZoneLink href currentZone>`：目標 zone 等於 `currentZone` 時渲染 `next/link`，否則渲染 `<a>`。
- 所有跨 zone 可能發生的連結（Menu、「查看發票」、「回到訂單」）一律用 `ZoneLink`。

### 4.4 頁面

| zone | 路徑 | 內容 | 需登入 |
|---|---|---|---|
| order | `/` | 首頁與 demo 操作說明 | 否 |
| order | `/login` | 登入表單 | 否 |
| order | `/orders` | 訂單列表 | 是 |
| order | `/orders/[id]` | 訂單明細；有發票時顯示「查看發票」連到 `/invoices/[invoiceId]` | 是 |
| invoice | `/invoices` | 發票列表 | 是 |
| invoice | `/invoices/[id]` | 發票明細；「回到訂單」連到 `/orders/[orderId]` | 是 |

### 4.5 假資料

- order：`apps/order/src/data/orders.ts`，訂單 `1001`–`1005`。
- invoice：`apps/invoice/src/data/invoices.ts`，發票 `INV-1001`–`INV-1004`，各有 `orderId`。訂單 `1005` 沒有發票（明細頁顯示「尚未開立」）。
- 兩邊各自擁有自己的資料，不共用 fixtures。

---

## 5. 共用 Menu

### 5.1 資料格式（合約）

`deploy/menu.json`：

```json
{
  "version": 1,
  "flags": { "menuV2": false },
  "items": [
    { "label": "首頁", "href": "/" },
    { "label": "訂單", "href": "/orders" },
    { "label": "發票", "href": "/invoices" }
  ]
}
```

- `items[].href` 必須是站內路徑；所屬 zone 由 `zoneForPath` 判斷，不在 JSON 裡重複標記。
- `items[].children` 為選填，結構同 item，最多一層。
- `@repo/menu` 用 zod 定義 schema；未知欄位忽略（為日後 expand / contract 預留）。

### 5.2 Build-time Menu（`@repo/menu`，預設）

- `getMenu()`：`import 'server-only'`；`fetch(MENU_CONFIG_URL, { next: { revalidate: 60, tags: ['menu'] } })`；zod 驗證失敗、HTTP 非 2xx、網路錯誤時回傳套件內建的 `fallback-menu.json`，並在回傳值標記 `source: 'remote' | 'fallback'`（工具列顯示用）。
- `<SiteMenu currentZone user />`：async Server Component。`user` 由 app 的 layout 傳入（`{ name: string } | null`），`@repo/menu` 不依賴 `@repo/auth`。
- 依 `flags.menuV2` 渲染 `MenuV1` 或 `MenuV2`（V2 是不同的視覺樣式），用來示範 feature flag 讓兩個 app 同時切換。
- 目前頁面高亮由小型 client component（`usePathname()`）處理。
- 登入時顯示使用者名稱與登出按鈕（`<form method="post" action="/api/logout">`），未登入顯示「登入」連結。

### 5.3 Revalidate API（合約）

| app | 路徑 |
|---|---|
| order | `POST /api/revalidate-menu` |
| invoice | `POST /invoices/api/revalidate-menu` |

- 需帶 header `Authorization: Bearer <REVALIDATE_TOKEN>`，否則回 401。
- 成功時呼叫 `revalidateTag('menu')`，回 `{ revalidated: true }`。

### 5.4 Runtime Menu（`@repo/menu-runtime`，對照組）

- Vite library mode 打包成單一 ESM 檔 `dist/menu-runtime.js`，**自帶 React 19**（與 app 的 React 是不同實例）。
- 註冊 Web Component `<runtime-site-menu>`，在 Shadow DOM 內渲染，樣式打包進同一個檔案並注入 shadow root。
- 自己在瀏覽器端 fetch `menu.json`（與 JS 同一個 config-server，需 CORS）。
- Host 透過 property 傳入：`currentZone`、`pathname`、`user`、`navigate(href: string)`。Runtime Menu 所有連結點擊都呼叫 `navigate`，**由 host 決定** soft 或 hard：同 zone 用 `router.push()`，跨 zone 用 `location.assign()`。
- Host 端元件 `<RuntimeMenuHost runtimeUrl ... />`（client component，放在 `@repo/menu`）：在 `useEffect` 裡 `import(/* webpackIgnore: true */ runtimeUrl)`；載入前顯示佔位框；載入失敗顯示錯誤提示。
- `runtimeUrl` 由 app 在 server 端讀取 runtime 環境變數 `MENU_RUNTIME_URL` 後當 prop 傳入，不使用 `NEXT_PUBLIC_*`。
- `@repo/menu-runtime` **不是任何 app 的 dependency**，所以改它不會讓 Turborepo 判定 app 受影響。

### 5.5 兩種 Menu 的切換

- cookie `menu-mode`，值為 `build`（預設）或 `runtime`，`path=/`。
- 兩個 app 的 layout 讀這個 cookie，決定渲染 `<SiteMenu>` 或 `<RuntimeMenuHost>`。
- 切換開關放在 zone-inspector 工具列，寫入 cookie 後整頁重新整理。

---

## 6. 共用登入（`@repo/auth`）

### 6.1 合約

| 項目 | 值 |
|---|---|
| cookie 名稱 | `session` |
| 內容 | JWT，HS256，payload `{ sub, name }`，有效 8 小時 |
| cookie 屬性 | `httpOnly`、`path=/`、`SameSite=Lax`；`NODE_ENV=production` 且 `COOKIE_SECURE=1` 時加 `Secure` |
| 簽章金鑰 | 環境變數 `AUTH_SECRET`（兩個 app 相同） |
| demo 帳號 | `alice / alice123`（顯示名稱 Alice） |

### 6.2 套件 API

- `signSession(user)`、`verifySession(token)`（使用 `jose`，可在 middleware 的 Edge runtime 執行）
- `getCurrentUser()`：server-only，讀 `cookies()` 後驗證，回傳 `{ name } | null`
- `safeNextPath(input)`：只接受以單一 `/` 開頭的站內路徑；`//evil.com`、`https://...`、`/\evil.com`、空值等一律回傳 `/`

### 6.3 流程

- 登入：`/login` 的表單用一般 HTML `<form method="post" action="/api/login">`（**不用 Server Action**）。order 的 Route Handler 驗證帳密，成功時設 cookie 並回 **303** 到 `safeNextPath(next)`，讓瀏覽器整頁跳轉；失敗回 303 到 `/login?error=1&next=...`。
  - 理由：登入後的目標可能在 invoice（另一個 zone），Server Action 的 `redirect()` 走 client-side 導頁，跨 zone 會失敗。
- 登出：`POST /api/logout`（order），清除 cookie，303 到 `/`。invoice 的 Menu 也 POST 到這個路徑。
- 保護頁面：各 app 的 `middleware.ts`。order 比對 `/orders/:path*`，invoice 比對 `/invoices/:path*`（排除 `/invoices/api/*`）；沒有有效 session 時 307 到 `/login?next=<原本路徑含 query>`。
- 已知限制：在 invoice 內 soft navigation 時剛好 session 過期，跨 zone 的 redirect 可能無法順利整頁跳轉。demo 以 8 小時有效期避開，tech review 說明。

---

## 7. 導頁視覺化（`@repo/zone-inspector`）

固定在畫面底部的 client component `<ZoneInspector zone menuSource />`：

- 顯示目前 zone（用 zone 色）。
- 顯示本頁「整頁載入時間」（`performance.timeOrigin` 換算成時間）與載入後的 soft navigation 次數。
- `usePathname()` 變化時（略過首次）次數 +1，並短暫顯示「soft navigation」；首次掛載時短暫顯示「整頁載入」。
- 顯示 Menu 資料來源（`remote` / `fallback`）與目前 menu 模式，並提供 build / runtime 切換開關（§5.5）。

計數存在 module 層級變數；整頁載入會重新執行 module，因此自然歸零。

---

## 8. 設計系統（`@repo/ui`）

- `src/theme.css`：Tailwind v4 `@theme` token（顏色、字型、圓角、陰影）。zone 主色使用 `var(--color-zone)`，由各 app 的 `globals.css` 定義。
- 元件：`Button`、`Card`、`Table`、`Badge`、`PageHeader`。沒有互動需求者不加 `'use client'`。
- 各 app 的 `globals.css`：

  ```css
  @import "tailwindcss";
  @import "@repo/ui/theme.css";
  @source "../../../../packages";
  :root { --color-zone: #2563eb; }
  ```

  （`@source` 的相對路徑以實際檔案位置為準，實作時驗證共用元件的 class 有被產生。）
- 各 app 的 `next.config.ts`：`transpilePackages: ['@repo/ui', '@repo/menu', '@repo/auth', '@repo/zone-inspector']`。

---

## 9. config-server（`@repo/config-server`）

- 一個小型 Node HTTP 伺服器（不引入框架），port 4000（環境變數 `PORT`）。
- `GET /menu.json` → 讀 `MENU_FILE`（預設 `../../deploy/menu.json`）每次請求都重新讀檔，`Cache-Control: no-store`。
- `GET /assets/menu-runtime.js` → 讀 `RUNTIME_DIR`（預設 `../../packages/menu-runtime/dist`）。
- 所有回應加 `Access-Control-Allow-Origin: <CORS_ORIGIN>`（預設 `*`）。
- `GET /health` → 200。
- 其他路徑 404；拒絕任何包含 `..` 的路徑。

---

## 10. React 19 的依據（tech review 引用）

在 Next 15.5.28 的原始碼中驗證（2026-11-22）：

- `package.json` 的 `peerDependencies.react` 是 `^18.2.0 || 19.0.0-rc-... || ^19.0.0`，React 18 是為 Pages Router 保留。
- `dist/build/create-compiler-aliases.js` 的 `createVendoredReactAliases` 會把 App Router 程式碼中的 `react`、`react-dom` 等 import 改指到 `next/dist/compiled/react*`。
- 內建版本：`19.2.0-canary-0bdb9206-20250818`。

結論：App Router 一律跑在內建的 React 19；安裝 React 18 只影響 Pages Router、測試環境與型別。

---

## 11. 環境變數（合約）

| 名稱 | 讀取者 | 生效時機 | 本機 | Docker |
|---|---|---|---|---|
| `INVOICE_ZONE_URL` | order `next.config.ts` | **build** | `http://localhost:3001` | `http://invoice:3001`（build arg） |
| `MENU_CONFIG_URL` | order、invoice（server） | runtime | `http://localhost:4000/menu.json` | `http://config-server:4000/menu.json` |
| `MENU_RUNTIME_URL` | order、invoice（server，傳給瀏覽器） | runtime | `http://localhost:4000/assets/menu-runtime.js` | `http://localhost:8090/assets/menu-runtime.js` |
| `AUTH_SECRET` | order、invoice | runtime | `.env.example` 內的 demo 值 | compose 內的 demo 值 |
| `REVALIDATE_TOKEN` | order、invoice | runtime | demo 值 | demo 值 |
| `COOKIE_SECURE` | order | runtime | 未設 | 未設（本機 http） |
| `BUILD_STANDALONE` | order、invoice `next.config.ts` | build | 未設 | `1`（Dockerfile 設定），此時 `output: 'standalone'` |
| `PORT`、`MENU_FILE`、`RUNTIME_DIR`、`CORS_ORIGIN` | config-server | runtime | 見 §9 | compose 設定 |

`.env.example` 與 compose 內的 secret 只供 demo，需註明不得用於正式環境。

---

## 12. 本機開發

- `pnpm install` 後 `pnpm dev`：Turborepo 同時啟動 order（3000）、invoice（3001）、config-server（4000）、menu-runtime（`vite build --watch`）。
- 使用者入口：`http://localhost:3000`。
- 各 app 的 `.env.local` 由 `pnpm bootstrap` 從 `.env.example` 建立（已存在則不覆蓋）。不用 `setup` 這個名稱，因為 `pnpm setup` 是 pnpm 內建指令。

---

## 13. Docker 部署

### 13.1 Compose 服務（合約）

| 服務 | 對外 port | 說明 |
|---|---|---|
| `order` | `8080:3000` | 唯一網站入口 |
| `invoice` | 不對外 | 只在 compose 內網 |
| `config-server` | `8090:4000` | 模擬另一網域的 CDN；`./deploy/menu.json` 以 volume 掛入；runtime menu JS 在 image build 時打包進去 |

### 13.2 Dockerfile

- 每個 app 一個 Dockerfile（`apps/<app>/Dockerfile`），在 repo 根目錄 build。
- 階段：`turbo prune @repo/<app> --docker` → 安裝依賴 → `turbo run build --filter=@repo/<app>` → runner 只複製 standalone、`.next/static`、`public`，非 root 使用者執行。
- `next.config.ts` 設 `outputFileTracingRoot` 指向 repo 根目錄。
- config-server 的 Dockerfile 在 build 階段先 build `@repo/menu-runtime`。
- `@repo/config-server` 的 `package.json` 必須把 `@repo/menu-runtime` 列為 dependency（`workspace:*`），Turborepo 才會在 menu-runtime 改動時判定 config-server 受影響；order、invoice 則**不得**依賴 `@repo/menu-runtime`。

### 13.3 腳本（合約）

| 指令 | 作用 |
|---|---|
| `pnpm docker:up` | build 並啟動全部服務 |
| `pnpm docker:down` | 停止並移除 |
| `pnpm deploy:affected` | 用 Turborepo `--affected` 找出受影響的 app（order / invoice / config-server），只對它們 `docker compose up -d --build`；沒有受影響者時印出「不需要部署」 |

### 13.4 變更與部署對照（demo 要能示範）

| 改了什麼 | `deploy:affected` 的結果 |
|---|---|
| `apps/order/**` | 只部署 order |
| `apps/invoice/**` | 只部署 invoice |
| `packages/ui/**`、`packages/menu/**`、`packages/auth/**`、`packages/zone-inspector/**` | order、invoice 都部署 |
| `packages/menu-runtime/**` | 只部署 config-server（app 不動） |
| `deploy/menu.json` | 不部署（volume 直接生效，60 秒內兩個 app 更新） |

`--affected` 需要 git 歷史：實作時執行 `git init`，**不自行 commit**，由使用者建立初始 commit。`--affected` 是否包含未 commit 的改動，實作時驗證並寫進 README。

---

## 14. Azure 對應（只寫說明與範例，不實際部署）

| demo | Azure |
|---|---|
| order、invoice 容器 | 兩個 Azure Container Apps；image 放 ACR |
| config-server | Azure Blob Storage + CDN / Front Door |
| `AUTH_SECRET`、`REVALIDATE_TOKEN` | Key Vault |
| order rewrites | 可改用 Front Door 路徑分流（tech review 比較） |

`.github/workflows/` 範例（檔案開頭註明「範例，未實際執行」）：

- `order.yml`：paths `apps/order/**`、`packages/**`（排除 `packages/menu-runtime/**`）、`pnpm-lock.yaml` → build、push ACR、`az containerapp update`
- `invoice.yml`：同上，換成 invoice
- `menu-config.yml`：paths `deploy/menu.json` → 上傳 Blob → 呼叫兩個 revalidate API
- `menu-runtime.yml`：paths `packages/menu-runtime/**` → build → 上傳 Blob

---

## 15. 測試與驗證

### 15.1 單元測試（Vitest，TDD）

- `zoneForPath`：`/`、`/orders/1`、`/invoices`、`/invoices/INV-1`、`/invoicesX`（屬於 order）
- `ZoneLink`：同 zone 渲染 `next/link`、跨 zone 渲染 `<a>`
- menu schema：合法資料、缺欄位、`href` 非站內路徑、未知欄位被忽略
- `getMenu`：remote 成功、HTTP 500、網路錯誤、格式錯誤 → fallback 並標記來源
- `signSession` / `verifySession`：正常、過期、竄改、金鑰不同
- `safeNextPath`：`/orders`、`//evil.com`、`https://evil.com`、`/\evil.com`、空值、`undefined`

### 15.2 E2E（Playwright）

在本機 dev（`localhost:3000`）與 Docker（`localhost:8080`）各跑一次：

1. order 內導頁：soft navigation 次數增加、載入時間不變。
2. order → invoice：整頁載入（載入時間改變、次數歸零），zone 顯示為 invoice。
3. 未登入進 `/invoices/INV-1001` → 導到 `/login?next=...` → 登入後回到該發票頁。
4. 在 order 登入後，invoice 的 Menu 顯示使用者名稱；在 invoice 登出後，order 也是未登入。
5. 修改 `menu.json`（測試中寫入暫存版本）並呼叫 revalidate API 後，兩個 zone 的 Menu 都顯示新項目；測試結束還原。
6. 切換到 runtime menu：Menu 由 `<runtime-site-menu>` 渲染；在 order 內點 Menu 連結仍是 soft navigation。
7. 停掉 config-server：build-time Menu 顯示 fallback 且工具列顯示 `fallback`；runtime Menu 顯示錯誤提示。
8. invoice 的靜態資源路徑以 `/invoices-static/` 開頭且皆回 200。

### 15.3 其他

- `turbo typecheck`、`turbo build`、`turbo test` 全部通過。
- Docker 檢查腳本：`localhost:8080/invoices` 回 200（經 order 轉發）；invoice 的 3001 從 host 無法連線。
- Runtime vs build-time 量測（寫進 tech review）：runtime bundle 大小（gzip）、Menu 出現時間（Playwright 量測）、view-source 是否含 Menu 文字。

---

## 16. Tech review（`docs/tech-review.html`）

單一自包含 HTML（不需網路即可開啟；不載入外部資源），繁體中文，支援淺色與深色模式，可在手機寬度閱讀。

章節：

1. 背景與目標
2. 選型
   - 10 種 micro frontend 做法比較（Multi-Zones、Vercel Microfrontends、Reverse Proxy、Monorepo 單一 app、npm 套件、Module Federation、qiankun / single-spa、Web Components、iframe、ESI / Fragment），以及在 Next 15 App Router 下的可行性
   - 「獨立部署 / 一致體驗 / 完整 Next 能力」三選二
   - React 18 與 App Router（§10 的證據）
   - Monorepo 工具：JIT packages / Compiled packages / Nx
   - 路由層：order rewrites / Azure Front Door / Nginx
3. 架構圖（inline SVG）
4. 實作重點：`assetPrefix` vs `basePath`（並修正先前討論中使用 `basePath` 的說法）、`ZoneLink`、共用 Menu、登入為何用 form POST、設計系統、導頁視覺化
5. Build-time Menu vs Runtime Menu：§15.3 的實測數字與比較表
6. 共用程式碼的變更流程：三種改動、expand / contract、feature flag、部署時間差
7. 部署：Docker、Azure 對應、CI 範例
8. 已知限制與風險
9. 驗證結果：實際執行的測試指令與結果

---

## 17. 已知限制（demo 範圍內接受）

- 跨 zone 導頁為整頁載入（Multi-Zones 本質）。
- 共用套件改動需部署兩個 app，期間可能短暫不一致。
- order 的 rewrites 目標在 build 時固定。
- invoice 內 soft navigation 遇到 session 過期時的跨 zone redirect（§6.3）。
- Runtime Menu 無 SSR、會有佔位到出現的延遲、多一份 React。
