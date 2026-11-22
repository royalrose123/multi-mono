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
4. **各自獨立部署**：改哪個 app 就只部署哪個；改共用套件時兩個都部署；改 Menu 內容（`deploy/menu.json`）時不部署任何 app。
5. Build-time Menu（server 端渲染）和 runtime 載入的 Menu（Web Component，瀏覽器端渲染）並列對照，比較兩者的取捨。
6. Menu 資料只有一個來源 `deploy/menu.json`：order 每次請求直接讀檔並以 `/api/menu` 提供，invoice 與 runtime Menu 都從這個 API 取得。

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
| Menu 資料來源 | `deploy/menu.json` 由 order 讀取並提供 `GET /api/menu` | 少一個要部署與監控的服務；runtime Menu 與 order 同網域，不需要 CORS；需要完全獨立時的做法見 §14 與 `deploy/azure/README.md` |
| runtime Menu 的位置 | `apps/order/menu-runtime/`，由 order 用 Vite 打包到 `public/menu-runtime/` | 隨 order 部署、同網域載入；不是獨立的 workspace 套件，也不是任何服務的獨立部署單位 |
| tech review 形式 | 單一 HTML 檔，放在 repo 的 `docs/tech-review.html` | 使用者選擇 |

---

## 2. 目錄結構（合約）

專案根目錄：`/Users/royal/Desktop/projects/order-invoice/`

```
order-invoice/
├── apps/
│   ├── order/                 # @repo/order，主網站；另含 menu-runtime/（runtime Menu 的 Web Component 原始碼）與 /api/menu
│   └── invoice/               # @repo/invoice
├── packages/
│   ├── ui/                    # @repo/ui：設計系統
│   ├── menu/                  # @repo/menu：zone 路由表、ZoneLink、Menu 資料讀取（getMenu / readLocalMenu / /api/menu handler）、SiteMenu、RuntimeMenuHost
│   ├── auth/                  # @repo/auth：session JWT
│   ├── zone-inspector/        # @repo/zone-inspector：導頁視覺化工具列
│   └── tsconfig/              # @repo/tsconfig：共用 tsconfig
├── deploy/
│   ├── menu.json              # Menu 資料（改這個不用部署 app）
│   ├── package.json           # @repo/deploy：不是任何 app 的依賴
│   └── azure/                 # Azure 對應說明（tech review 引用）
├── e2e/                       # Playwright 測試
├── scripts/                   # bootstrap、deploy-affected、docker-check 等輔助腳本
├── .github/workflows/         # CI 範例（標註為未實際執行）
├── docs/
│   ├── tech-review.html
│   └── superpowers/specs/     # 本文件
├── docker-compose.yml
├── turbo.json
├── pnpm-workspace.yaml
├── package.json
└── .nvmrc                     # 20.20.2
```

各 app 的環境變數範例放在 `apps/order/.env.example`、`apps/invoice/.env.example`。

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
| pnpm | 10.34.9（根 `package.json` 的 `packageManager`） |
| turbo | 2.11.13 |
| jose / zod | 6.2.18 / 4.6.7 |
| vite / @vitejs/plugin-react | 8.3.8 / 6.3.0（打包 order 的 runtime Menu；根目錄與 order 都列為 devDependency） |
| vitest | 4.1.12 |
| @playwright/test | 1.65.1 |

pnpm 透過 corepack 啟用。Docker image 內以 `npm install -g` 安裝同版本的 pnpm 與 turbo。

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
const INVOICE_ZONE_URL = process.env.INVOICE_ZONE_URL ?? 'http://localhost:3001'
async rewrites() {
  return {
    beforeFiles: [],
    afterFiles: [
      { source: '/invoices', destination: `${INVOICE_ZONE_URL}/invoices` },
      { source: '/invoices/:path+', destination: `${INVOICE_ZONE_URL}/invoices/:path+` },
      { source: '/invoices-static/:path+', destination: `${INVOICE_ZONE_URL}/invoices-static/:path+` },
    ],
    fallback: [],
  }
}
```

`INVOICE_ZONE_URL` 必須是不帶路徑、不帶結尾斜線的 origin（否則 build 失敗），build 時寫進 routes-manifest；改變它要重新 build order。order 不得定義套用到 `/:path*` 的 `headers()`（會在 rewrite 前套用，蓋掉 invoice 回應的 `x-zone`）；invoice 在所有回應加上 `x-zone: invoice`，用來判斷是誰回應的。

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

### 5.2 資料來源與 API（合約）

`deploy/menu.json` 是唯一的資料來源，路徑由環境變數 `MENU_FILE` 指定（未設定時為 `<repo>/deploy/menu.json`）。

| 讀取者 | 取得方式 | 快取 |
|---|---|---|
| order 的 layout（build-time Menu） | `readLocalMenu()`：每次請求直接讀檔並驗證 | 不快取，改檔立即生效 |
| order 的 `GET /api/menu` | `createMenuApiHandler()`：讀檔並驗證；成功回 200 與 MenuConfig，檔案不存在或格式錯誤回 **503**（不回備援資料） | `Cache-Control: no-store`；route 設 `dynamic = 'force-dynamic'` |
| invoice 的 layout（build-time Menu） | `getMenu()`：`fetch(MENU_CONFIG_URL, { next: { revalidate: 60, tags: ['menu'] } })` | 60 秒，或 revalidate API 清除 |
| runtime Menu（瀏覽器） | 瀏覽器 `fetch` 同網域的 `/api/menu` | 不快取 |

- `MENU_CONFIG_URL` 指向 order 的 `/api/menu`（見 §11）。
- 備援：`readLocalMenu()` 與 `getMenu()` 在讀檔失敗、HTTP 非 2xx、網路錯誤、未設定 `MENU_CONFIG_URL`、JSON 或 zod 驗證失敗時，回傳套件內建的 `fallback-menu.json` 並標記 `source: 'fallback'`；成功時標記 `source: 'remote'`（工具列顯示用）。兩者共用 `load-menu.ts` 的驗證與備援邏輯。

### 5.3 Build-time Menu（`@repo/menu`，預設）

- `<SiteMenu menu currentZone user />`：由 app 的 layout 取得 menu（order 用 `readLocalMenu()`、invoice 用 `getMenu()`）後傳入；`user` 為 `{ name: string } | null`，`@repo/menu` 不依賴 `@repo/auth`。`getMenu`、`readLocalMenu`、`createMenuApiHandler`、`createRevalidateMenuHandler` 都在 `@repo/menu/server`（`import 'server-only'`）。
- 依 `flags.menuV2` 渲染 V1 或 V2 樣式（`data-menu-variant`），用來示範 feature flag 讓兩個 app 同時切換。
- 目前頁面高亮由小型 client component（`usePathname()`）處理。
- 登入時顯示使用者名稱與登出按鈕（`<form method="post" action="/api/logout">`），未登入顯示「登入」連結。

### 5.4 Revalidate API（合約）

| app | 路徑 |
|---|---|
| invoice | `POST /invoices/api/revalidate-menu` |

- order 沒有 revalidate API：它不快取 menu。
- 需帶 header `Authorization: Bearer <REVALIDATE_TOKEN>`，否則回 401。
- 成功時呼叫 `revalidateTag('menu')`，回 `{ revalidated: true }`。

### 5.5 Runtime Menu（`apps/order/menu-runtime/`，對照組）

- 原始碼在 `apps/order/menu-runtime/`，不是 workspace 套件；order 用 Vite library mode 打包（minify）成單一 ESM 檔，輸出到 `apps/order/public/menu-runtime/menu-runtime.js`（build 產物，列入 `.gitignore`）。order 的 `build` script 先跑 `vite build`，再 `next build`；`menu-runtime:watch` 以 `vite build --watch` 供開發使用。
- **自帶 React 19**（與 app 的 React 是不同實例）。
- 註冊 Web Component `<runtime-site-menu>`，在 Shadow DOM 內渲染，樣式（`?inline` CSS）注入 shadow root。
- 瀏覽器端 `fetch` 與 JS 同網域的 `/api/menu`（以 `import.meta.url` 解析），不需要 CORS。載入失敗時 Menu 內顯示「無法讀取 menu.json」。
- Host 透過 property 傳入：`currentZone`、`pathname`、`user`、`navigate(href: string)`。Runtime Menu 所有連結點擊都呼叫 `navigate`，**由 host 決定** soft 或 hard：同 zone 用 `router.push()`，跨 zone 用 `location.assign()`（`createNavigate`）。
- Host 端元件 `<RuntimeMenuHost runtimeUrl currentZone user />`（client component，放在 `@repo/menu`）：在 `useEffect` 裡 `import(/* webpackIgnore: true */ runtimeUrl)`，等 `customElements.whenDefined('runtime-site-menu')` 後建立元素；載入前顯示佔位框；載入失敗顯示錯誤提示。外層 `<div data-menu="runtime" data-status="loading|ready|error">`。
- `runtimeUrl` 是 `@repo/menu` 匯出的常數 `RUNTIME_MENU_SRC = '/menu-runtime/menu-runtime.js'`（**合約**）。兩個 app 都用這個同網域路徑載入：invoice 的頁面經 order 的網域提供，所以 `/menu-runtime/*` 由 order 回應，不需要 invoice 轉發。
- runtime Menu 屬於 `@repo/order`：改它會讓 Turborepo 判定 order 受影響，隨 order 部署；invoice 不受影響。

### 5.6 兩種 Menu 的切換

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

固定在畫面底部的 client component `<ZoneInspector zone menuMode menuSource />`：

- 顯示目前 zone（用 zone 色）。
- 顯示本頁「整頁載入時間」（`performance.timeOrigin` 換算成時間）與載入後的 soft navigation 次數。
- `usePathname()` 變化時（略過首次）次數 +1，並短暫顯示「soft navigation」；首次掛載時短暫顯示「整頁載入」。
- 顯示 Menu 資料來源（`remote` / `fallback` / `runtime`）與目前 menu 模式，並提供 build / runtime 切換開關（§5.6）。

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

## 9. order 的 Menu API 與 runtime Menu 檔案

order 同時扮演 Menu 資料與 runtime Menu 的提供者，不需要額外的服務。

### 9.1 `GET /api/menu`（合約）

- 路徑 `apps/order/src/app/api/menu/route.ts`：`export const dynamic = 'force-dynamic'`、`export const GET = createMenuApiHandler()`。
- 每次請求讀 `MENU_FILE`（預設 `<repo>/deploy/menu.json`）並以 zod 驗證，不快取。
- 200：回 MenuConfig JSON，`Cache-Control: no-store`。
- 503：檔案不存在、不是合法 JSON 或格式錯誤，body 為 `{ "error": "menu.json 無法使用" }`，同樣 `no-store`；不回備援資料，由呼叫端（invoice、runtime Menu）各自處理。
- 呼叫端：invoice（`MENU_CONFIG_URL`，§5.2）與瀏覽器中的 runtime Menu（同網域 `/api/menu`）。
- Docker 中 order 以 `./deploy:/config:ro` 掛入資料夾，`MENU_FILE=/config/menu.json`（§13.1）。

### 9.2 runtime Menu 檔案

- `GET /menu-runtime/menu-runtime.js`：Next 直接從 `apps/order/public/menu-runtime/` 提供的靜態檔（Vite 打包產物，§5.5）。
- 本機開發由 `menu-runtime:watch` 持續重新打包；Docker build 時由 `turbo run build --filter=@repo/order` 產生，Dockerfile 檢查檔案存在。

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
| `MENU_FILE` | order（`/api/menu`、layout） | runtime | 未設（預設 `<repo>/deploy/menu.json`） | `/config/menu.json`（掛載 `./deploy:/config:ro`） |
| `MENU_CONFIG_URL` | invoice（server） | runtime | `http://localhost:3000/api/menu` | `http://order:3000/api/menu` |
| `AUTH_SECRET` | order、invoice | runtime | 各 app 的 `.env.example` 內的 demo 值 | compose 內的 demo 值 |
| `REVALIDATE_TOKEN` | invoice | runtime | demo 值 | demo 值 |
| `COOKIE_SECURE` | order | runtime | 未設 | 未設（本機 http） |
| `BUILD_STANDALONE` | order、invoice `next.config.ts` | build | 未設 | `1`（Dockerfile 設定），此時 `output: 'standalone'` |

runtime Menu 的位置是常數 `RUNTIME_MENU_SRC`（§5.5），不是環境變數。

各 app 的 `.env.example` 與 compose 內的 secret 只供 demo，需註明不得用於正式環境。

---

## 12. 本機開發

- `pnpm install` 後 `pnpm dev`（`turbo run dev menu-runtime:watch`）：Turborepo 同時啟動 order（3000）、invoice（3001），以及 order 的 `menu-runtime:watch`（`vite build --watch`，輸出到 `apps/order/public/menu-runtime/`）。
- 使用者入口：`http://localhost:3000`。
- 各 app 的 `.env.local` 由 `pnpm bootstrap` 從 `apps/<app>/.env.example` 建立（已存在則不覆蓋）。不用 `setup` 這個名稱，因為 `pnpm setup` 是 pnpm 內建指令。

---

## 13. Docker 部署

### 13.1 Compose 服務（合約）

| 服務 | 對外 port | 說明 |
|---|---|---|
| `order` | `8080:3000` | 唯一網站入口；`./deploy:/config:ro` 以資料夾 volume 掛入，`MENU_FILE=/config/menu.json`；runtime Menu JS 在 image build 時打包進 `public/` |
| `invoice` | 不對外（`expose: 3001`） | 只在 compose 內網；`MENU_CONFIG_URL=http://order:3000/api/menu` |

compose 只有這兩個服務。掛載整個資料夾而不是單一檔案：編輯器以「寫新檔再改名」存檔時，單檔掛載會失效。

### 13.2 Dockerfile

- 每個 app 一個 Dockerfile（`apps/<app>/Dockerfile`），在 repo 根目錄 build。
- 階段：`turbo prune @repo/<app> --docker` → 安裝依賴 → `turbo run build --filter=@repo/<app>` → runner 只複製 standalone、`.next/static`、`public`，非 root 使用者執行。
- `next.config.ts` 設 `outputFileTracingRoot` 指向 repo 根目錄。
- order 的 Dockerfile 在 build 階段由 `turbo run build --filter=@repo/order` 先用 Vite 打包 runtime Menu 到 `apps/order/public/menu-runtime/`，再 `next build`；接著檢查 `menu-runtime.js` 存在，runner 階段隨 `public/` 一起複製。
- order 需要 build arg `INVOICE_ZONE_URL`（rewrites 在 build 時寫死），缺少時 build 失敗。
- order、invoice 都不依賴任何 runtime Menu 的 workspace 套件，因為 runtime Menu 就在 `@repo/order` 內。

### 13.3 腳本（合約）

| 指令 | 作用 |
|---|---|
| `pnpm docker:up` | build 並啟動全部服務 |
| `pnpm docker:down` | 停止並移除 |
| `pnpm docker:check` | `scripts/docker-check.mjs` 煙霧測試（見 §15.3） |
| `pnpm deploy:affected` | 用 `turbo ls --affected` 找出受影響的套件，經 `scripts/affected-services.mjs` 對應到服務（只有 `@repo/order` → `order`、`@repo/invoice` → `invoice`），只對它們 `docker compose up -d --build --no-deps`；沒有受影響者時印出「不需要部署任何服務」；`--dry-run` 只列出不部署 |

### 13.4 變更與部署對照（demo 要能示範）

| 改了什麼 | `deploy:affected` 的結果 |
|---|---|
| `apps/order/**` | 只部署 order |
| `apps/invoice/**` | 只部署 invoice |
| `packages/ui/**`、`packages/menu/**`、`packages/auth/**`、`packages/zone-inspector/**` | order、invoice 都部署 |
| `apps/order/menu-runtime/**` | 只部署 order（runtime Menu 屬於 order） |
| `deploy/menu.json` | 不部署：order 每次請求讀檔，立即生效；invoice 最多 60 秒內更新（呼叫 `/invoices/api/revalidate-menu` 可立即更新） |

`--affected` 需要 git 歷史，比對 `main...HEAD` 加上尚未 commit 的改動；在 main 上 commit 之後就看不到差異，示範方式（不 commit、用分支、或 `TURBO_SCM_BASE=HEAD~1`）寫在 README。**不自行 commit**，由使用者建立 commit。

---

## 14. Azure 對應（只寫說明與範例，不實際部署）

| demo | Azure |
|---|---|
| order、invoice 容器 | 兩個 Azure Container Apps；image 放 ACR |
| `./deploy:/config:ro` 掛入 order | Azure Files share（放 `menu.json`）以 volume 掛進 order，掛載路徑 `/config` |
| runtime Menu JS | 打包在 order 的 image（`public/`），隨 order 部署，不需另外的儲存體或 CDN |
| `AUTH_SECRET`、`REVALIDATE_TOKEN` | Key Vault |
| order rewrites | 可改用 Front Door 路徑分流（tech review 比較） |

需要讓 Menu 資料或 runtime Menu 完全獨立於 app 部署時，可改用獨立的 config-server（Azure Blob + CDN / Front Door），取捨與做法見 `deploy/azure/README.md` 的「必要時改用獨立 config-server」。

`.github/workflows/` 範例（檔案開頭註明「範例，未實際執行」）：

- `order.yml`：paths `apps/order/**`、`packages/**`、`pnpm-lock.yaml` → build、push ACR、`az containerapp update`（runtime Menu 隨 order 的 build 產出，改 `apps/order/menu-runtime/**` 也會觸發）
- `invoice.yml`：paths `apps/invoice/**`、`packages/**`、`pnpm-lock.yaml`，其餘同上
- `menu-config.yml`：paths `deploy/menu.json` → 上傳到掛進 order 的 Azure Files share（order 立即生效）→ 呼叫 invoice 的 revalidate API；不 build、不部署任何 app

---

## 15. 測試與驗證

### 15.1 單元測試（Vitest，TDD）

- `@repo/menu`
  - `zoneForPath`：`/`、`/orders/1`、`/invoices`、`/invoices/INV-1`、`/invoicesX`（屬於 order）
  - `ZoneLink`：同 zone 渲染 `next/link`、跨 zone 渲染 `<a>`
  - menu schema：合法資料、缺欄位、`href` 非站內路徑、未知欄位被忽略
  - `getMenu`：成功、HTTP 500、網路錯誤、格式錯誤、未設定 URL → fallback 並標記來源
  - `load-menu`（驗證與備援）、`readLocalMenu`（讀檔成功、檔案不存在、格式錯誤）
  - `createMenuApiHandler`：合法檔案回 200 且 `no-store`、每次請求重新讀檔、檔案不存在或格式錯誤回 503
  - `createRevalidateMenuHandler`：token 正確、缺少或錯誤回 401
  - `SiteMenu`、`runtime-navigate`（同 zone 走 soft、跨 zone 走 hard）
- `@repo/auth`：`signSession` / `verifySession`（正常、過期、竄改、金鑰不同）、`safeNextPath`（`/orders`、`//evil.com`、`https://evil.com`、`/\evil.com`、空值、`undefined`）、middleware、`public-url`
- `@repo/ui`：`format`、`Table`
- `@repo/zone-inspector`：`useNavigationTracker`
- `apps/order/menu-runtime`：`items`（解析 menu 項目、高亮判斷）
- `scripts/affected-services.test.mjs`（`pnpm test:scripts`）：套件對應到服務（只有 order、invoice）

### 15.2 E2E（Playwright）

在本機 dev（`localhost:3000`）與 Docker（`localhost:8080`，`pnpm e2e:docker`）各跑一次，worker 為 1（測試會改 `deploy/menu.json` 與 cookie）。`measure.spec.ts` 標記 `@measure`，不在 `pnpm e2e` 內，由 `pnpm measure` 對 Docker 執行。

| 檔案 | 內容 |
|---|---|
| `navigation.spec.ts` | order 內導頁是 soft navigation（次數增加、載入時間不變）；order → invoice 是整頁載入（zone 變 invoice、次數歸零）；invoice 內 soft、回到訂單整頁載入 |
| `auth.spec.ts` | 未登入進 `/invoices/INV-1001` 導到 `/login?next=...`，登入後回到該發票頁；密碼錯誤留在登入頁；在 order 登入後 invoice 也是登入狀態、在 invoice 登出後 order 也登出；`next` 不能導到外部網站 |
| `menu.spec.ts` | `/api/menu` 回 `menu.json` 內容且 `no-store`；改 `menu.json` 後 order 立即更新、invoice 在 revalidate 後更新；`menuV2` flag 讓兩個 zone 同時切換 V2 樣式（測試結束還原檔案） |
| `menu-invalid.spec.ts` | `menu.json` 格式錯誤：`/api/menu` 回 503；order 與 invoice 的 build-time Menu 都改用備援資料（工具列 `fallback`）；runtime Menu 載入成功但 Menu 內顯示「無法讀取 menu.json」 |
| `runtime-menu.spec.ts` | 切到 runtime menu：JS 與 `/api/menu` 都由 order 同網域回應、Menu 由 `<runtime-site-menu>` 渲染、同 zone 仍是 soft navigation、跨 zone 整頁載入；runtime 模式的 HTML 沒有 build-time Menu（無 SSR） |
| `assets.spec.ts` | invoice 的靜態資源路徑以 `/invoices-static/` 開頭且由 invoice 回應（`x-zone`）；order 的靜態資源沒有 `x-zone` |
| `measure.spec.ts`（`@measure`） | build-time vs runtime Menu 出現時間（5 次中位數）、HTML 是否含 Menu、runtime bundle 大小（gzip），寫入 `e2e/results/menu-metrics.json` |

### 15.3 其他

- `turbo typecheck`、`turbo build`、`turbo test` 全部通過。
- Docker 檢查腳本（`pnpm docker:check`）：order 首頁 200；未登入進 `/invoices` 回 307 到 `localhost:8080/login?next=%2Finvoices`（經 order 轉發，不是 invoice 的內網位址）；invoice 的 3001 從 host 無法連線；order 的 `/api/menu` 回 200 且 `no-store`；`/menu-runtime/menu-runtime.js` 回 200 且為 JavaScript。
- Runtime vs build-time 量測（`pnpm measure`，寫進 tech review）：runtime bundle 大小（gzip）、Menu 出現時間（Playwright 量測）、view-source 是否含 Menu 文字。

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
4. 實作重點：`assetPrefix` vs `basePath`、`ZoneLink`、共用 Menu、登入為何用 form POST、其他 Multi-Zones 的坑、設計系統與導頁視覺化
5. Monorepo 共用元件 vs Web Component：兩種共用 Menu 做法的 UI 實作方式、對照表與程式碼位置
6. 共用程式碼的變更流程：三種改動、expand / contract、feature flag、部署時間差
7. 部署：Docker、Azure 對應、CI 範例
8. 已知限制與風險
9. 驗證結果：實際執行的測試指令與結果，含 Menu 量測（§15.3）

---

## 17. 已知限制（demo 範圍內接受）

- 跨 zone 導頁為整頁載入（Multi-Zones 本質）。
- 共用套件改動需部署兩個 app，期間可能短暫不一致。
- order 的 rewrites 目標在 build 時固定。
- invoice 內 soft navigation 遇到 session 過期時的跨 zone redirect（§6.3）。
- Runtime Menu 無 SSR、會有佔位到出現的延遲、多一份 React。
- Menu 資料與 runtime Menu 由 order 提供：order 停止服務時 invoice 改用備援 menu；改 runtime Menu 的程式碼要部署 order；order 多個 replica 需掛同一份 `menu.json`。
- invoice 的 Menu data cache 最多 60 秒才更新；revalidate API 只清到收到請求的那個 replica。
