# Order × Invoice Multi-Zones Demo

order（主網站）與 invoice 是兩個各自部署的 Next.js 15 App Router app，用 Multi-Zones 組成同一個網站；程式碼放在同一個 pnpm + Turborepo monorepo。

- 設計規格：`docs/superpowers/specs/2026-11-22-order-invoice-design.md`
- Tech review：`docs/tech-review.html`

## 前置需求

- [nvm](https://github.com/nvm-sh/nvm)，Node 20.20.2（`nvm install && nvm use`）
- `corepack enable`（pnpm 版本由 `package.json` 的 `packageManager` 固定）
- Docker Desktop（只有 Docker 相關指令需要）

## 本機開發

```bash
pnpm install
pnpm bootstrap   # 建立 apps/*/.env.local
pnpm dev         # order:3000、invoice:3001，加上 runtime Menu 的 Vite watch
```

從舊版（有 config-server）升級：`apps/*/.env.local` 若還有 `localhost:4000` 或 `MENU_RUNTIME_URL`，依 `.env.example` 更新（invoice 的 `MENU_CONFIG_URL` 改為 `http://localhost:3000/api/menu`）。

打開 http://localhost:3000 ，demo 帳號 `alice / alice123`。

| 程序 | port | 說明 |
|---|---|---|
| order | 3000 | 唯一入口，用 rewrites 轉發 `/invoices/*`；另外提供 `GET /api/menu`（menu 資料）與 `/menu-runtime/menu-runtime.js`（runtime Menu） |
| invoice | 3001 | 只負責 `/invoices/*`，直接開 3001 的 `/` 會是 404 |

## 改 Menu 內容（不用部署）

編輯 `deploy/menu.json`（order 讀 `MENU_FILE`，沒設定時是 `<repo>/deploy/menu.json`）。

- **order**：每次請求直接讀檔，存檔後重新整理就看到新內容。
- **invoice**：向 order 的 `/api/menu` 取得，data cache 60 秒。過期後的下一次請求會先拿到舊內容，同時在背景重新抓取（stale-while-revalidate），之後的請求才會看到新內容；要立即生效，呼叫 invoice 的 revalidate API：

```bash
curl -X POST -H "Authorization: Bearer demo-only-revalidate-token" http://localhost:3000/invoices/api/revalidate-menu
```

`menu.json` 不存在或格式錯誤時，`/api/menu` 回 503，兩個 zone 的 build-time Menu 都改用打包在 `@repo/menu` 裡的備援資料；runtime Menu 會顯示「無法讀取 menu.json」。

## Docker（模擬正式部署）

```bash
pnpm docker:up      # build 並啟動 order、invoice
pnpm docker:check   # 煙霧測試
pnpm e2e:docker     # E2E（含 menu.json 格式錯誤情境）
pnpm docker:down
```

| 服務 | 對外 port | 說明 |
|---|---|---|
| order | 8080 | 唯一網站入口 |
| invoice | 不對外 | 只在 compose 內網，由 order 轉發；從 `http://order:3000/api/menu` 取得 menu |

`deploy/` 以 volume 掛進 order（`./deploy:/config:ro`，`MENU_FILE=/config/menu.json`），改 `deploy/menu.json` 不用重啟任何容器。

## 只部署有改動的服務

```bash
pnpm deploy:affected --dry-run   # 只列出會部署哪些服務
pnpm deploy:affected             # 對受影響的服務執行 docker compose up -d --build
```

`--affected` 比對的是 `main...HEAD` 加上尚未 commit 的改動，所以在 main 上 commit 之後就看不到差異了。示範方式三選一：

- 改完不 commit，直接跑 `pnpm deploy:affected --dry-run`。
- 在分支上工作，再跑 `pnpm deploy:affected --dry-run`。
- 已經在 main 上 commit：`TURBO_SCM_BASE=HEAD~1 pnpm deploy:affected --dry-run`（改成比對上一個 commit）。

| 改了什麼 | 部署 |
|---|---|
| `apps/order/**`（含 runtime Menu 的 `apps/order/menu-runtime/`） | order |
| `apps/invoice/**` | invoice |
| `packages/ui`、`menu`、`auth`、`zone-inspector` | order、invoice |
| `packages/tsconfig/**` | order、invoice |
| `deploy/menu.json` | 不部署（volume 直接生效） |

## 測試

```bash
pnpm test          # 單元測試（Vitest，含 order 的 runtime Menu）
pnpm test:scripts  # deploy:affected 對照邏輯的單元測試
pnpm typecheck
pnpm --filter @repo/e2e exec playwright install chromium   # 新機器第一次要先裝瀏覽器
pnpm build         # 含 order 的 Vite 打包（apps/order/public/menu-runtime/）與兩個 next build
pnpm e2e           # E2E（需先 pnpm dev）
pnpm measure       # Menu 載入量測（需先 pnpm docker:up），結果寫到 e2e/results/menu-metrics.json
```

`.env.example` 與 `docker-compose.yml` 裡的 secret 只供 demo，不得用於正式環境。
