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
pnpm dev         # order:3000、invoice:3001、config-server:4000、menu-runtime watch
```

打開 http://localhost:3000 ，demo 帳號 `alice / alice123`。

| 程序 | port | 說明 |
|---|---|---|
| order | 3000 | 唯一入口，用 rewrites 轉發 `/invoices/*` |
| invoice | 3001 | 只負責 `/invoices/*`，直接開 3001 的 `/` 會是 404 |
| config-server | 4000 | 提供 `menu.json` 與 runtime menu 的 JS（模擬 Azure Blob / CDN） |

## 改 Menu 內容（不用部署）

編輯 `deploy/menu.json`。Menu 的 data cache 為 60 秒，過期後的下一次請求會先拿到舊內容，同時在背景重新抓取（stale-while-revalidate），之後的請求才會看到新內容。要立即生效，呼叫 revalidate API：

```bash
curl -X POST -H "Authorization: Bearer demo-only-revalidate-token" http://localhost:3000/api/revalidate-menu
curl -X POST -H "Authorization: Bearer demo-only-revalidate-token" http://localhost:3000/invoices/api/revalidate-menu
```

## Docker（模擬正式部署）

```bash
pnpm docker:up      # build 並啟動 order、invoice、config-server
pnpm docker:check   # 煙霧測試
pnpm e2e:docker     # E2E（含 config-server 故障情境）
pnpm docker:down
```

| 服務 | 對外 port | 說明 |
|---|---|---|
| order | 8080 | 唯一網站入口 |
| invoice | 不對外 | 只在 compose 內網，由 order 轉發 |
| config-server | 8090 | 模擬另一個網域的 CDN（瀏覽器直接下載 runtime menu） |

`deploy/` 以 volume 掛進 config-server，改 `deploy/menu.json` 不用重啟任何容器。

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
| `apps/order/**` | order |
| `apps/invoice/**` | invoice |
| `packages/ui`、`menu`、`auth`、`zone-inspector` | order、invoice |
| `packages/menu-runtime/**` | config-server |
| `packages/tsconfig/**` | order、invoice、config-server（全部） |
| `deploy/menu.json` | 不部署（volume 直接生效） |

## 測試

```bash
pnpm test          # 單元測試（Vitest）
pnpm test:scripts  # deploy:affected 對照邏輯的單元測試
pnpm typecheck
pnpm --filter @repo/e2e exec playwright install chromium   # 新機器第一次要先裝瀏覽器
pnpm e2e           # E2E（需先 pnpm dev）
pnpm measure       # Menu 載入量測（需先 pnpm docker:up），結果寫到 e2e/results/menu-metrics.json
```

`.env.example` 與 `docker-compose.yml` 裡的 secret 只供 demo，不得用於正式環境。
