# Order × Invoice Multi-Zones Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 用 pnpm + Turborepo monorepo 建立 order、invoice 兩個 Next.js 15 App Router zone，以 Multi-Zones 組成同一個網站，展示共用 Menu、設計系統、登入狀態、各自部署，並交付 tech review HTML。

**Architecture:** order（port 3000）是唯一對外入口，用 `rewrites` 把 `/invoices*` 與 `/invoices-static/*` 轉給 invoice（port 3001，`assetPrefix: '/invoices-static'`）。共用程式碼放在 `packages/*`，以 TS 原始碼 + `transpilePackages` 使用。Menu 內容由 config-server（port 4000，模擬 Azure Blob）提供的 `menu.json` 在 runtime 讀取；另有 runtime 載入的 Web Component 版 Menu 作為對照組。

**Tech Stack:** Node 20.20.2、pnpm 10.34.9、Turborepo 2.11.13、Next.js 15.5.28、React 19.3.1、TypeScript 5.9.3、Tailwind CSS 4.3.5、jose 6.2.18、zod 4.6.7、Vite 8.3.8、Vitest 4.1.12、Playwright 1.65.1、Docker Compose。

**Spec:** `docs/superpowers/specs/2026-11-22-order-invoice-design.md`（實作前必讀；本計畫與 spec 衝突時以 spec 的「合約」為準，並停下來回報）

## Global Constraints

- 專案根目錄：`/Users/royal/Desktop/projects/order-invoice/`。**不得修改** `/Users/royal/Desktop/projects/multi-zone/` 或其他資料夾。
- **不得 git commit / push**（使用者偏好）。每個 task 結尾的 Checkpoint 只執行 `git status --short` 並回報變更檔案。
- 每個 shell 先 `cd /Users/royal/Desktop/projects/order-invoice && source ~/.nvm/nvm.sh && nvm use`，`node -v` 必須是 `v20.20.2`（預設的 Node 18 跑不了 Tailwind v4 與 Vite 8）。
- 所有 dependencies 寫**精確版本**，`package.json` 不得出現 `^`、`~`。workspace 內部套件用 `workspace:*`。
- 版本（合約）：next `15.5.28`、react / react-dom `19.3.1`、@types/react `19.3.0`、@types/react-dom `19.3.0`、typescript `5.9.3`、tailwindcss / @tailwindcss/postcss `4.3.5`、@types/node `20.19.43`、pnpm `10.34.9`、turbo `2.11.13`、jose `6.2.18`、zod `4.6.7`、vite `8.3.8`、@vitejs/plugin-react `6.3.0`、vitest `4.1.12`、jsdom `29.1.1`、@testing-library/react `16.3.3`、@testing-library/dom `10.4.2`、@playwright/test `1.65.1`、server-only `0.0.1`。
  - 為什麼不是最新版：vitest 5.x 與 jsdom 30+ 要求 Node 22，本專案固定 Node 20.20.2。
- Port、路徑前綴、環境變數名稱、cookie 名稱、套件名稱照 spec §4、§5.3、§6.1、§11、§13 的合約。
- 使用者看得到的文字（UI、README、tech review、錯誤訊息）一律繁體中文。程式碼識別字用英文。
- 不用 ESLint、不用 create-next-app、不用 `next/font`（避免 build 時連外下載字型）、不用 `next/image`（Multi-Zones 下 `/_next/image` 不套用 `assetPrefix`，見 tech review）。
- npm registry 預設 `https://registry.npmjs.org/`。若 `pnpm install` 出現 `ERR_TLS_CERT_ALTNAME_INVALID`，在根目錄建立 `.npmrc` 寫入 `registry=https://registry.yarnpkg.com/` 後重試，並在 README 記錄；不得使用 `strict-ssl=false`。

## 與 spec 的細部調整（實作時照這裡）

這些是寫計畫時查原始碼後的細化，不改變 spec 的合約：

1. `deploy/` 是一個 workspace 套件 `@repo/deploy`（只有 `package.json` 與 `menu.json`），讓 Turborepo 把 `deploy/menu.json` 的改動歸給它自己，不會讓 app 被判定受影響。`e2e/` 同理是 `@repo/e2e`。
2. 環境變數範例放在各自的 `apps/order/.env.example`、`apps/invoice/.env.example`，`pnpm bootstrap` 各自複製成 `.env.local`。
3. `SiteMenu` 是同步元件、接收 `getMenu()` 的結果當 prop（layout 需要同一份結果的 `source` 給工具列），而不是自己 fetch。
4. `signSession` / `verifySession` 多一個 `secret` 參數（方便測試）；`getCurrentUser()` 與 middleware 從 `process.env.AUTH_SECRET` 讀取。
5. invoice 經 order rewrite 轉發時，Next 的 proxy 設了 `changeOrigin: true`（`next/dist/server/lib/router-utils/proxy-request.js`），invoice 看到的 Host 是 `invoice:3001`，只另外帶 `x-forwarded-host`。所以 middleware 的 redirect 網址必須用 `publicUrl()` 依 `x-forwarded-host` 組出，否則瀏覽器會被導到內網位址。
6. invoice 在 `next.config.ts` 用 `headers()` 對 `/:path*` 加上 `x-zone: invoice`，供 E2E 與手動驗證判斷「是誰回應的」。order **不得**定義套用到 `/:path*` 的 `headers()`（會在 rewrite 前套用而蓋掉 invoice 的值）。
7. order 不得建立 `app/invoices`、`app/invoices-static` 或根層 catch-all 路由。

---

## File Structure

```
order-invoice/
├── package.json                       # 根：scripts、共用 devDependencies、packageManager
├── pnpm-workspace.yaml
├── turbo.json
├── .nvmrc                             # 20.20.2
├── .gitignore / .dockerignore
├── README.md
├── docker-compose.yml
├── scripts/
│   ├── bootstrap.mjs                  # 建立各 app 的 .env.local
│   ├── deploy-affected.mjs            # turbo ls --affected → docker compose up --build
│   └── docker-check.mjs               # Docker 部署後的煙霧測試
├── deploy/
│   ├── package.json                   # @repo/deploy
│   ├── menu.json                      # Menu 資料（合約格式見 spec §5.1）
│   └── azure/README.md                # Azure 對應說明
├── packages/
│   ├── tsconfig/                      # base.json、nextjs.json、react-library.json
│   ├── auth/src/
│   │   ├── session.ts                 # signSession / verifySession / SESSION_TTL_SECONDS
│   │   ├── cookie.ts                  # SESSION_COOKIE / sessionCookieOptions
│   │   ├── safe-next.ts               # safeNextPath
│   │   ├── public-url.ts              # publicUrl
│   │   ├── index.ts                   # 上面四個（Edge 可用）
│   │   ├── server.ts                  # getCurrentUser（server-only）
│   │   └── middleware.ts              # createAuthMiddleware
│   ├── menu/src/
│   │   ├── zones.ts                   # Zone、zoneForPath、isInternalPath、isActivePath、MenuMode
│   │   ├── schema.ts                  # zod schema 與型別
│   │   ├── fallback-menu.json
│   │   ├── get-menu.ts                # getMenu（server-only）
│   │   ├── revalidate.ts              # createRevalidateMenuHandler
│   │   ├── server.ts                  # server 端 barrel
│   │   ├── ZoneLink.tsx
│   │   ├── MenuItemLink.tsx           # 'use client'，目前頁面高亮
│   │   ├── SiteMenu.tsx               # build-time Menu（V1 / V2）
│   │   ├── runtime-navigate.ts        # createNavigate（host 搭橋邏輯）
│   │   ├── RuntimeMenuHost.tsx        # 'use client'，載入 runtime Menu
│   │   └── index.ts
│   ├── ui/src/                        # theme.css、cn、Button、Card、Table、Badge、PageHeader、format
│   ├── zone-inspector/src/            # useNavigationTracker、ZoneInspector
│   └── menu-runtime/                  # Vite library mode → dist/menu-runtime.js
├── services/config-server/            # src/handler.mjs、src/index.mjs、Dockerfile
├── apps/
│   ├── order/                         # Next app（Dockerfile、next.config.ts、src/…）
│   └── invoice/                       # Next app（Dockerfile、next.config.ts、src/…）
├── e2e/                               # @repo/e2e：playwright.config.ts、tests/*.spec.ts
├── .github/workflows/                 # CI 範例（未實際執行）
└── docs/tech-review.html
```

---

### Task 1: Workspace 骨架

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `.nvmrc`, `.gitignore`, `.dockerignore`
- Create: `packages/tsconfig/package.json`, `packages/tsconfig/base.json`, `packages/tsconfig/nextjs.json`, `packages/tsconfig/react-library.json`
- Create: `deploy/package.json`, `deploy/menu.json`
- Create: `scripts/bootstrap.mjs`

**Interfaces:**
- Produces: `@repo/tsconfig/base.json`、`@repo/tsconfig/nextjs.json`、`@repo/tsconfig/react-library.json`；根 scripts `dev`、`build`、`test`、`typecheck`、`bootstrap`、`e2e`、`e2e:docker`、`measure`、`docker:up`、`docker:down`、`deploy:affected`。

- [ ] **Step 1: 初始化 git 與 Node 版本**

```bash
cd /Users/royal/Desktop/projects/order-invoice
git init -b main
echo "20.20.2" > .nvmrc
source ~/.nvm/nvm.sh && nvm use
node -v   # 必須印出 v20.20.2
corepack enable
```

- [ ] **Step 2: 建立根目錄設定檔**

`package.json`：

```json
{
  "name": "order-invoice",
  "private": true,
  "packageManager": "pnpm@10.34.9",
  "engines": { "node": ">=20.9.0" },
  "scripts": {
    "bootstrap": "node scripts/bootstrap.mjs",
    "dev": "turbo run dev",
    "build": "turbo run build",
    "test": "turbo run test",
    "typecheck": "turbo run typecheck",
    "e2e": "pnpm --filter @repo/e2e run e2e",
    "e2e:docker": "pnpm --filter @repo/e2e run e2e:docker",
    "measure": "pnpm --filter @repo/e2e run measure",
    "docker:up": "docker compose up --build -d",
    "docker:down": "docker compose down",
    "docker:check": "node scripts/docker-check.mjs",
    "deploy:affected": "node scripts/deploy-affected.mjs"
  },
  "devDependencies": {
    "@testing-library/dom": "10.4.2",
    "@testing-library/react": "16.3.3",
    "@types/node": "20.19.43",
    "@types/react": "19.3.0",
    "@types/react-dom": "19.3.0",
    "@vitejs/plugin-react": "6.3.0",
    "jsdom": "29.1.1",
    "react": "19.3.1",
    "react-dom": "19.3.1",
    "turbo": "2.11.13",
    "typescript": "5.9.3",
    "vite": "8.3.8",
    "vitest": "4.1.12"
  }
}
```

`pnpm-workspace.yaml`：

```yaml
packages:
  - apps/*
  - packages/*
  - services/*
  - deploy
  - e2e
```

`turbo.json`：

```json
{
  "$schema": "https://turborepo.com/schema.json",
  "ui": "stream",
  "globalPassThroughEnv": ["NEXT_TELEMETRY_DISABLED"],
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "env": ["INVOICE_ZONE_URL", "BUILD_STANDALONE"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "dev": { "cache": false, "persistent": true },
    "test": { "outputs": [] },
    "typecheck": { "outputs": [] }
  }
}
```

`.gitignore`：

```
node_modules
.next
dist
out
.turbo
*.tsbuildinfo
.env.local
e2e/test-results
e2e/playwright-report
e2e/results
.DS_Store
```

`.dockerignore`：

```
**/node_modules
**/.next
**/dist
**/.turbo
**/.env.local
out
e2e
docs
.git
```

- [ ] **Step 3: 建立 `@repo/tsconfig`**

`packages/tsconfig/package.json`：

```json
{
  "name": "@repo/tsconfig",
  "version": "0.0.0",
  "private": true,
  "files": ["base.json", "nextjs.json", "react-library.json"]
}
```

`packages/tsconfig/base.json`：

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "ES2022"],
    "module": "esnext",
    "moduleResolution": "bundler",
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "forceConsistentCasingInFileNames": true,
    "allowJs": false
  }
}
```

`packages/tsconfig/nextjs.json`：

```json
{
  "extends": "./base.json",
  "compilerOptions": {
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }]
  }
}
```

`packages/tsconfig/react-library.json`：

```json
{
  "extends": "./base.json",
  "compilerOptions": { "jsx": "react-jsx" }
}
```

- [ ] **Step 4: 建立 `@repo/deploy` 與 menu.json**

`deploy/package.json`：

```json
{
  "name": "@repo/deploy",
  "version": "0.0.0",
  "private": true,
  "description": "部署設定（menu.json 等）。不是任何 app 的依賴，改動不會觸發 app 重新部署。"
}
```

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

- [ ] **Step 5: 建立 `scripts/bootstrap.mjs`**

```js
// 為每個 app 從 .env.example 建立 .env.local（已存在則不覆蓋）。
import { copyFileSync, existsSync } from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
for (const app of ['order', 'invoice']) {
  const example = path.join(root, 'apps', app, '.env.example')
  const local = path.join(root, 'apps', app, '.env.local')
  if (!existsSync(example)) {
    console.log(`略過 ${app}：找不到 .env.example`)
    continue
  }
  if (existsSync(local)) {
    console.log(`保留 apps/${app}/.env.local（已存在）`)
    continue
  }
  copyFileSync(example, local)
  console.log(`已建立 apps/${app}/.env.local`)
}
```

- [ ] **Step 6: 安裝並驗證**

Run:

```bash
pnpm install
pnpm exec turbo ls
node scripts/bootstrap.mjs
```

Expected: `pnpm install` 成功；`turbo ls` 列出 `@repo/deploy`、`@repo/tsconfig`；bootstrap 印出兩行「略過 …：找不到 .env.example」。若 pnpm 提示 `Ignored build scripts`，記下套件名稱回報，不要自行批准。

- [ ] **Step 7: Checkpoint**

Run: `git status --short`，回報新增的檔案（不 commit）。

---

### Task 2: `@repo/auth`（session、cookie、safe next、public URL、middleware）

**Files:**
- Create: `packages/auth/package.json`, `packages/auth/tsconfig.json`, `packages/auth/vitest.config.ts`, `packages/auth/src/next-env.d.ts`
- Create: `packages/auth/src/session.ts`, `cookie.ts`, `safe-next.ts`, `public-url.ts`, `index.ts`, `server.ts`, `middleware.ts`
- Test: `packages/auth/src/session.test.ts`, `safe-next.test.ts`, `public-url.test.ts`, `middleware.test.ts`

**Interfaces:**
- Produces（`@repo/auth`，Edge 可用）：
  - `type SessionUser = { sub: string; name: string }`
  - `SESSION_TTL_SECONDS = 28800`
  - `signSession(user: SessionUser, secret: string, now?: number): Promise<string>`
  - `verifySession(token: string | undefined, secret: string, now?: number): Promise<SessionUser | null>`（secret 少於 32 字元時 throw）
  - `SESSION_COOKIE = 'session'`
  - `sessionCookieOptions(env?: NodeJS.ProcessEnv): { httpOnly: true; path: '/'; sameSite: 'lax'; maxAge: number; secure: boolean }`
  - `safeNextPath(input: unknown): string`
  - `publicUrl(path: string, headers: Headers, requestUrl: string): URL`
- Produces（`@repo/auth/server`）：`getCurrentUser(): Promise<{ name: string } | null>`
- Produces（`@repo/auth/middleware`）：`createAuthMiddleware(options?: { loginPath?: string }): (request: NextRequest) => Promise<NextResponse>`

- [ ] **Step 1: 建立套件設定**

`packages/auth/package.json`：

```json
{
  "name": "@repo/auth",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts",
    "./server": "./src/server.ts",
    "./middleware": "./src/middleware.ts"
  },
  "scripts": {
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "jose": "6.2.18",
    "server-only": "0.0.1"
  },
  "peerDependencies": {
    "next": "15.5.28"
  },
  "devDependencies": {
    "@repo/tsconfig": "workspace:*",
    "next": "15.5.28",
    "react": "19.3.1",
    "react-dom": "19.3.1"
  }
}
```

`packages/auth/tsconfig.json`：

```json
{
  "extends": "@repo/tsconfig/base.json",
  "include": ["src"]
}
```

`packages/auth/vitest.config.ts`（jose 在 jsdom 下會有 Uint8Array realm 問題，所以用 node）：

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({ test: { environment: 'node' } })
```

`packages/auth/src/next-env.d.ts`：

```ts
/// <reference types="next" />
```

Run: `pnpm install`

- [ ] **Step 2: 寫 session 的失敗測試**

`packages/auth/src/session.test.ts`：

```ts
import { describe, expect, it } from 'vitest'
import { SESSION_TTL_SECONDS, signSession, verifySession } from './session'

const SECRET = 'test-secret-test-secret-test-secret-0000'
const OTHER = 'other-secret-other-secret-other-secret-00'
const alice = { sub: 'u-alice', name: 'Alice' }

describe('session', () => {
  it('簽發後可以驗證回同一個使用者', async () => {
    const token = await signSession(alice, SECRET)
    await expect(verifySession(token, SECRET)).resolves.toEqual(alice)
  })

  it('過期的 token 驗證失敗', async () => {
    const issuedAt = Date.UTC(2026, 0, 1)
    const token = await signSession(alice, SECRET, issuedAt)
    const later = issuedAt + (SESSION_TTL_SECONDS + 1) * 1000
    await expect(verifySession(token, SECRET, later)).resolves.toBeNull()
  })

  it('被竄改的 token 驗證失敗', async () => {
    const token = await signSession(alice, SECRET)
    const [h, p, s] = token.split('.')
    const tampered = `${h}.${p}x.${s}`
    await expect(verifySession(tampered, SECRET)).resolves.toBeNull()
  })

  it('用不同金鑰驗證失敗', async () => {
    const token = await signSession(alice, SECRET)
    await expect(verifySession(token, OTHER)).resolves.toBeNull()
  })

  it('沒有 token 時回傳 null', async () => {
    await expect(verifySession(undefined, SECRET)).resolves.toBeNull()
  })

  it('金鑰少於 32 字元時直接丟錯（避免設定錯誤被靜默吞掉）', async () => {
    await expect(verifySession('a.b.c', 'short')).rejects.toThrow('AUTH_SECRET')
    await expect(signSession(alice, '')).rejects.toThrow('AUTH_SECRET')
  })
})
```

- [ ] **Step 3: 確認測試失敗**

Run: `pnpm --filter @repo/auth test`
Expected: FAIL，`Failed to resolve import "./session"`。

- [ ] **Step 4: 實作 `session.ts`**

```ts
import { SignJWT, jwtVerify } from 'jose'

export type SessionUser = { sub: string; name: string }

export const SESSION_TTL_SECONDS = 60 * 60 * 8

function keyFrom(secret: string): Uint8Array {
  if (!secret || secret.length < 32) {
    throw new Error('AUTH_SECRET 未設定或少於 32 個字元')
  }
  return new TextEncoder().encode(secret)
}

export async function signSession(user: SessionUser, secret: string, now = Date.now()): Promise<string> {
  const key = keyFrom(secret)
  const iat = Math.floor(now / 1000)
  return new SignJWT({ name: user.name })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.sub)
    .setIssuedAt(iat)
    .setExpirationTime(iat + SESSION_TTL_SECONDS)
    .sign(key)
}

export async function verifySession(
  token: string | undefined,
  secret: string,
  now = Date.now(),
): Promise<SessionUser | null> {
  const key = keyFrom(secret)
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, key, {
      algorithms: ['HS256'],
      currentDate: new Date(now),
    })
    if (typeof payload.sub !== 'string' || typeof payload.name !== 'string') return null
    return { sub: payload.sub, name: payload.name }
  } catch {
    return null
  }
}
```

- [ ] **Step 5: 確認 session 測試通過**

Run: `pnpm --filter @repo/auth test -- session`
Expected: PASS（6 tests）。

- [ ] **Step 6: 寫 safeNextPath 與 publicUrl 的失敗測試**

`packages/auth/src/safe-next.test.ts`：

```ts
import { describe, expect, it } from 'vitest'
import { safeNextPath } from './safe-next'

describe('safeNextPath', () => {
  it.each([
    ['/orders', '/orders'],
    ['/invoices/INV-1001?tab=items#top', '/invoices/INV-1001?tab=items#top'],
    ['/', '/'],
  ])('接受站內路徑 %s', (input, expected) => {
    expect(safeNextPath(input)).toBe(expected)
  })

  it.each([
    ['//evil.com'],
    ['https://evil.com'],
    ['/\\evil.com'],
    ['/\t/evil.com'],
    ['javascript:alert(1)'],
    ['orders'],
    [''],
    [undefined],
    [null],
    [123],
  ])('拒絕 %s，回傳 /', (input) => {
    expect(safeNextPath(input)).toBe('/')
  })
})
```

`packages/auth/src/public-url.test.ts`：

```ts
import { describe, expect, it } from 'vitest'
import { publicUrl } from './public-url'

describe('publicUrl', () => {
  it('經過 order 的 rewrite 時，使用 x-forwarded-host', () => {
    const headers = new Headers({ host: 'invoice:3001', 'x-forwarded-host': 'localhost:8080' })
    const url = publicUrl('/login?next=%2Finvoices', headers, 'http://invoice:3001/invoices')
    expect(url.toString()).toBe('http://localhost:8080/login?next=%2Finvoices')
  })

  it('有 x-forwarded-proto 時使用它', () => {
    const headers = new Headers({ 'x-forwarded-host': 'shop.example.com', 'x-forwarded-proto': 'https' })
    expect(publicUrl('/login', headers, 'http://invoice:3001/x').toString()).toBe('https://shop.example.com/login')
  })

  it('多個值時取第一個', () => {
    const headers = new Headers({ 'x-forwarded-host': 'a.example.com, b.example.com' })
    expect(publicUrl('/', headers, 'http://invoice:3001/').host).toBe('a.example.com')
  })

  it('沒有轉發 header 時使用 request 本身的 origin', () => {
    expect(publicUrl('/login', new Headers(), 'http://localhost:3000/orders').toString()).toBe(
      'http://localhost:3000/login',
    )
  })
})
```

- [ ] **Step 7: 確認測試失敗**

Run: `pnpm --filter @repo/auth test`
Expected: FAIL，找不到 `./safe-next`、`./public-url`。

- [ ] **Step 8: 實作 `safe-next.ts`、`public-url.ts`、`cookie.ts`**

`packages/auth/src/safe-next.ts`：

```ts
const BASE = 'http://internal.invalid'

/** 只接受站內相對路徑，其他一律回傳 '/'，避免 open redirect。 */
export function safeNextPath(input: unknown): string {
  if (typeof input !== 'string' || input === '') return '/'
  if (!input.startsWith('/') || input.startsWith('//') || input.includes('\\')) return '/'
  try {
    const url = new URL(input, BASE)
    if (url.origin !== BASE) return '/'
    return url.pathname + url.search + url.hash
  } catch {
    return '/'
  }
}
```

`packages/auth/src/public-url.ts`：

```ts
function first(value: string | null): string | undefined {
  const v = value?.split(',')[0]?.trim()
  return v ? v : undefined
}

/**
 * 組出瀏覽器看得到的網址。
 * invoice 經 order 的 rewrite 轉發時，Host 會被改成 invoice 的內網位址，
 * 原本的 Host 只保留在 x-forwarded-host。
 */
export function publicUrl(path: string, headers: Headers, requestUrl: string): URL {
  const req = new URL(requestUrl)
  const host = first(headers.get('x-forwarded-host')) ?? req.host
  const proto = first(headers.get('x-forwarded-proto')) ?? req.protocol.replace(':', '')
  return new URL(path, `${proto}://${host}`)
}
```

`packages/auth/src/cookie.ts`：

```ts
import { SESSION_TTL_SECONDS } from './session'

export const SESSION_COOKIE = 'session'

export function sessionCookieOptions(env: NodeJS.ProcessEnv = process.env) {
  return {
    httpOnly: true as const,
    path: '/' as const,
    sameSite: 'lax' as const,
    maxAge: SESSION_TTL_SECONDS,
    secure: env.NODE_ENV === 'production' && env.COOKIE_SECURE === '1',
  }
}
```

`packages/auth/src/index.ts`：

```ts
export { SESSION_TTL_SECONDS, signSession, verifySession, type SessionUser } from './session'
export { SESSION_COOKIE, sessionCookieOptions } from './cookie'
export { safeNextPath } from './safe-next'
export { publicUrl } from './public-url'
```

- [ ] **Step 9: 確認測試通過**

Run: `pnpm --filter @repo/auth test`
Expected: PASS。

- [ ] **Step 10: 寫 middleware 的失敗測試**

`packages/auth/src/middleware.test.ts`：

```ts
import { NextRequest } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createAuthMiddleware } from './middleware'
import { signSession } from './session'

const SECRET = 'test-secret-test-secret-test-secret-0000'

describe('createAuthMiddleware', () => {
  beforeEach(() => vi.stubEnv('AUTH_SECRET', SECRET))
  afterEach(() => vi.unstubAllEnvs())

  it('沒登入時 307 導到瀏覽器看得到的 /login，並帶上原本的路徑', async () => {
    const middleware = createAuthMiddleware()
    const req = new NextRequest('http://invoice:3001/invoices/INV-1001?x=1', {
      headers: { host: 'invoice:3001', 'x-forwarded-host': 'localhost:8080' },
    })
    const res = await middleware(req)
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toBe(
      'http://localhost:8080/login?next=%2Finvoices%2FINV-1001%3Fx%3D1',
    )
  })

  it('有有效 session 時放行', async () => {
    const token = await signSession({ sub: 'u-alice', name: 'Alice' }, SECRET)
    const req = new NextRequest('http://localhost:3000/orders', {
      headers: { cookie: `session=${token}` },
    })
    const res = await createAuthMiddleware()(req)
    expect(res.headers.get('x-middleware-next')).toBe('1')
  })

  it('session 無效時也導到登入頁', async () => {
    const req = new NextRequest('http://localhost:3000/orders', {
      headers: { cookie: 'session=not-a-jwt' },
    })
    const res = await createAuthMiddleware()(req)
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toBe('http://localhost:3000/login?next=%2Forders')
  })
})
```

- [ ] **Step 11: 確認測試失敗**

Run: `pnpm --filter @repo/auth test -- middleware`
Expected: FAIL，找不到 `./middleware`。

- [ ] **Step 12: 實作 `middleware.ts` 與 `server.ts`**

`packages/auth/src/middleware.ts`：

```ts
import { NextResponse, type NextRequest } from 'next/server'
import { SESSION_COOKIE } from './cookie'
import { publicUrl } from './public-url'
import { verifySession } from './session'

export function createAuthMiddleware(options: { loginPath?: string } = {}) {
  const loginPath = options.loginPath ?? '/login'

  return async function middleware(request: NextRequest): Promise<NextResponse> {
    const token = request.cookies.get(SESSION_COOKIE)?.value
    const user = await verifySession(token, process.env.AUTH_SECRET ?? '')
    if (user) return NextResponse.next()

    const back = request.nextUrl.pathname + request.nextUrl.search
    const target = publicUrl(`${loginPath}?next=${encodeURIComponent(back)}`, request.headers, request.url)
    return NextResponse.redirect(target, 307)
  }
}
```

`packages/auth/src/server.ts`：

```ts
import 'server-only'
import { cookies } from 'next/headers'
import { SESSION_COOKIE } from './cookie'
import { verifySession } from './session'

export async function getCurrentUser(): Promise<{ name: string } | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  const user = await verifySession(token, process.env.AUTH_SECRET ?? '')
  return user ? { name: user.name } : null
}
```

- [ ] **Step 13: 確認全部測試與型別檢查通過**

Run: `pnpm --filter @repo/auth test && pnpm --filter @repo/auth typecheck`
Expected: PASS；`tsc` 沒有輸出。

- [ ] **Step 14: Checkpoint**

Run: `git status --short`，回報變更（不 commit）。

---

### Task 3: `@repo/menu` 核心（zones、schema、getMenu、revalidate）

**Files:**
- Create: `packages/menu/package.json`, `tsconfig.json`, `vitest.config.ts`, `src/next-env.d.ts`
- Create: `packages/menu/src/zones.ts`, `schema.ts`, `fallback-menu.json`, `get-menu.ts`, `revalidate.ts`, `server.ts`
- Test: `packages/menu/src/zones.test.ts`, `schema.test.ts`, `get-menu.test.ts`, `revalidate.test.ts`

**Interfaces:**
- Produces（`@repo/menu/zones`，純函式，client / server / 其他套件都可 import）：
  - `type Zone = 'order' | 'invoice'`
  - `isInternalPath(path: string): boolean`
  - `zoneForPath(path: string): Zone`（非站內路徑 throw）
  - `isActivePath(pathname: string, href: string): boolean`
  - `type MenuMode = 'build' | 'runtime'`、`MENU_MODE_COOKIE = 'menu-mode'`、`parseMenuMode(value: string | undefined): MenuMode`
- Produces（`@repo/menu` 的型別，來自 `schema.ts`）：`MenuItem`、`MenuConfig`、`MenuSource = 'remote' | 'fallback'`、`LoadedMenu = MenuConfig & { source: MenuSource }`、`menuConfigSchema`
- Produces（`@repo/menu/server`）：`MENU_TAG = 'menu'`、`getMenu(url?: string): Promise<LoadedMenu>`、`createRevalidateMenuHandler(getToken?: () => string | undefined): (request: Request) => Promise<Response>`

- [ ] **Step 1: 建立套件設定**

`packages/menu/package.json`：

```json
{
  "name": "@repo/menu",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts",
    "./server": "./src/server.ts",
    "./zones": "./src/zones.ts"
  },
  "scripts": {
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "server-only": "0.0.1",
    "zod": "4.6.7"
  },
  "peerDependencies": {
    "next": "15.5.28",
    "react": "19.3.1"
  },
  "devDependencies": {
    "@repo/tsconfig": "workspace:*",
    "next": "15.5.28",
    "react": "19.3.1",
    "react-dom": "19.3.1"
  }
}
```

`packages/menu/tsconfig.json`：

```json
{
  "extends": "@repo/tsconfig/react-library.json",
  "include": ["src"]
}
```

`packages/menu/vitest.config.ts`：

```ts
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({ plugins: [react()], test: { environment: 'jsdom' } })
```

`packages/menu/src/next-env.d.ts`：

```ts
/// <reference types="next" />
```

`packages/menu/src/index.ts`（Task 3 先放型別與 zones，Task 5 補元件）：

```ts
export * from './zones'
export type { LoadedMenu, MenuConfig, MenuItem, MenuSource } from './schema'
```

Run: `pnpm install`

- [ ] **Step 2: 寫 zones 的失敗測試**

`packages/menu/src/zones.test.ts`：

```ts
import { describe, expect, it } from 'vitest'
import { isActivePath, isInternalPath, parseMenuMode, zoneForPath } from './zones'

describe('zoneForPath', () => {
  it.each([
    ['/', 'order'],
    ['/orders', 'order'],
    ['/orders/1001', 'order'],
    ['/login?next=%2Finvoices', 'order'],
    ['/invoicesX', 'order'],
    ['/invoices', 'invoice'],
    ['/invoices/INV-1001', 'invoice'],
    ['/invoices?page=2', 'invoice'],
    ['/invoices#top', 'invoice'],
  ] as const)('%s 屬於 %s', (path, zone) => {
    expect(zoneForPath(path)).toBe(zone)
  })

  it('非站內路徑直接丟錯', () => {
    expect(() => zoneForPath('https://evil.com')).toThrow()
    expect(() => zoneForPath('//evil.com')).toThrow()
  })
})

describe('isInternalPath', () => {
  it('只接受單一斜線開頭且沒有反斜線的路徑', () => {
    expect(isInternalPath('/orders')).toBe(true)
    expect(isInternalPath('//evil.com')).toBe(false)
    expect(isInternalPath('/\\evil.com')).toBe(false)
    expect(isInternalPath('orders')).toBe(false)
  })
})

describe('isActivePath', () => {
  it('首頁只有在 / 時才算目前頁面', () => {
    expect(isActivePath('/', '/')).toBe(true)
    expect(isActivePath('/orders', '/')).toBe(false)
  })

  it('子路徑也算目前頁面，但相似前綴不算', () => {
    expect(isActivePath('/orders', '/orders')).toBe(true)
    expect(isActivePath('/orders/1001', '/orders')).toBe(true)
    expect(isActivePath('/ordersX', '/orders')).toBe(false)
  })

  it('忽略 href 的 query', () => {
    expect(isActivePath('/orders', '/orders?e2e=1')).toBe(true)
  })
})

describe('parseMenuMode', () => {
  it('只有 runtime 會被視為 runtime，其他都是 build', () => {
    expect(parseMenuMode('runtime')).toBe('runtime')
    expect(parseMenuMode('build')).toBe('build')
    expect(parseMenuMode(undefined)).toBe('build')
    expect(parseMenuMode('xxx')).toBe('build')
  })
})
```

- [ ] **Step 3: 確認測試失敗**

Run: `pnpm --filter @repo/menu test -- zones`
Expected: FAIL，找不到 `./zones`。

- [ ] **Step 4: 實作 `zones.ts`**

```ts
export type Zone = 'order' | 'invoice'

export type MenuMode = 'build' | 'runtime'
export const MENU_MODE_COOKIE = 'menu-mode'

export function isInternalPath(path: string): boolean {
  return path.startsWith('/') && !path.startsWith('//') && !path.includes('\\')
}

function pathnameOf(path: string): string {
  return path.split(/[?#]/, 1)[0] || '/'
}

/** 路由表：/invoices 開頭屬於 invoice，其餘屬於 order。 */
export function zoneForPath(path: string): Zone {
  if (!isInternalPath(path)) throw new Error(`zoneForPath 只接受站內路徑，收到 "${path}"`)
  const pathname = pathnameOf(path)
  if (pathname === '/invoices' || pathname.startsWith('/invoices/')) return 'invoice'
  return 'order'
}

export function isActivePath(pathname: string, href: string): boolean {
  const target = pathnameOf(href)
  if (target === '/') return pathname === '/'
  return pathname === target || pathname.startsWith(`${target}/`)
}

export function parseMenuMode(value: string | undefined): MenuMode {
  return value === 'runtime' ? 'runtime' : 'build'
}
```

- [ ] **Step 5: 確認 zones 測試通過**

Run: `pnpm --filter @repo/menu test -- zones`
Expected: PASS。

- [ ] **Step 6: 寫 schema 與 getMenu 的失敗測試**

`packages/menu/src/schema.test.ts`：

```ts
import { describe, expect, it } from 'vitest'
import { menuConfigSchema } from './schema'

const valid = {
  version: 1,
  flags: { menuV2: true },
  items: [{ label: '訂單', href: '/orders', children: [{ label: '全部', href: '/orders' }] }],
}

describe('menuConfigSchema', () => {
  it('接受合法資料', () => {
    expect(menuConfigSchema.parse(valid)).toEqual(valid)
  })

  it('沒有 flags 時預設 menuV2 = false', () => {
    const parsed = menuConfigSchema.parse({ version: 1, items: valid.items })
    expect(parsed.flags.menuV2).toBe(false)
  })

  it('忽略未知欄位（為 expand / contract 預留）', () => {
    const parsed = menuConfigSchema.parse({ ...valid, extra: 1, items: [{ label: 'A', href: '/', icon: 'x' }] })
    expect(parsed).not.toHaveProperty('extra')
    expect(parsed.items[0]).toEqual({ label: 'A', href: '/' })
  })

  it.each([
    ['缺 items', { version: 1 }],
    ['items 為空', { version: 1, items: [] }],
    ['href 不是站內路徑', { version: 1, items: [{ label: 'X', href: 'https://evil.com' }] }],
    ['label 為空', { version: 1, items: [{ label: '', href: '/' }] }],
    ['version 不對', { version: 2, items: [{ label: 'A', href: '/' }] }],
  ])('拒絕：%s', (_name, input) => {
    expect(menuConfigSchema.safeParse(input).success).toBe(false)
  })
})
```

`packages/menu/src/get-menu.test.ts`：

```ts
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const { getMenu, MENU_TAG } = await import('./get-menu')

const remote = { version: 1, flags: { menuV2: true }, items: [{ label: '遠端', href: '/orders' }] }

function mockFetch(impl: () => Promise<Response>) {
  const fn = vi.fn(impl)
  vi.stubGlobal('fetch', fn)
  return fn
}

describe('getMenu', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('成功時回傳遠端資料，並設定 60 秒快取與 menu tag', async () => {
    const fetchFn = mockFetch(async () => Response.json(remote))
    const menu = await getMenu('http://config/menu.json')
    expect(menu.source).toBe('remote')
    expect(menu.items[0].label).toBe('遠端')
    expect(menu.flags.menuV2).toBe(true)
    expect(fetchFn).toHaveBeenCalledWith('http://config/menu.json', {
      next: { revalidate: 60, tags: [MENU_TAG] },
    })
  })

  it.each([
    ['HTTP 500', async () => new Response('boom', { status: 500 })],
    ['網路錯誤', async () => { throw new TypeError('fetch failed') }],
    ['格式錯誤', async () => Response.json({ version: 1, items: [] })],
    ['不是 JSON', async () => new Response('<html>', { status: 200 })],
  ])('%s 時回傳備援 menu', async (_name, impl) => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    mockFetch(impl as () => Promise<Response>)
    const menu = await getMenu('http://config/menu.json')
    expect(menu.source).toBe('fallback')
    expect(menu.items.map((i) => i.href)).toEqual(['/', '/orders', '/invoices'])
  })

  it('沒有設定網址時回傳備援 menu，且不呼叫 fetch', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const fetchFn = mockFetch(async () => Response.json(remote))
    const menu = await getMenu(undefined)
    expect(menu.source).toBe('fallback')
    expect(fetchFn).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 7: 確認測試失敗**

Run: `pnpm --filter @repo/menu test`
Expected: FAIL，找不到 `./schema`、`./get-menu`。

- [ ] **Step 8: 實作 `schema.ts`、`fallback-menu.json`、`get-menu.ts`**

`packages/menu/src/schema.ts`：

```ts
import { z } from 'zod'
import { isInternalPath } from './zones'

const href = z.string().refine(isInternalPath, { message: 'href 必須是站內路徑（以單一 / 開頭）' })

const leafItem = z.object({ label: z.string().min(1), href })

export const menuItemSchema = leafItem.extend({ children: z.array(leafItem).optional() })

export const menuConfigSchema = z.object({
  version: z.literal(1),
  flags: z.object({ menuV2: z.boolean().default(false) }).default({ menuV2: false }),
  items: z.array(menuItemSchema).min(1),
})

export type MenuItem = z.infer<typeof menuItemSchema>
export type MenuConfig = z.infer<typeof menuConfigSchema>
export type MenuSource = 'remote' | 'fallback'
export type LoadedMenu = MenuConfig & { source: MenuSource }
```

`packages/menu/src/fallback-menu.json`（與 `deploy/menu.json` 相同內容）：

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

`packages/menu/src/get-menu.ts`：

```ts
import 'server-only'
import fallbackJson from './fallback-menu.json'
import { menuConfigSchema, type LoadedMenu } from './schema'

export const MENU_TAG = 'menu'

function fallback(reason: string): LoadedMenu {
  console.warn(`[menu] 改用備援 menu：${reason}`)
  return { ...menuConfigSchema.parse(fallbackJson), source: 'fallback' }
}

/**
 * 讀取 menu.json（快取 60 秒，tag 為 'menu'）。
 * 任何失敗都回傳打包在套件裡的備援 menu，畫面不會因為設定服務故障而壞掉。
 */
export async function getMenu(url: string | undefined = process.env.MENU_CONFIG_URL): Promise<LoadedMenu> {
  if (!url) return fallback('未設定 MENU_CONFIG_URL')
  try {
    const res = await fetch(url, { next: { revalidate: 60, tags: [MENU_TAG] } })
    if (!res.ok) return fallback(`HTTP ${res.status}`)
    const parsed = menuConfigSchema.safeParse(await res.json())
    if (!parsed.success) return fallback(`格式錯誤：${parsed.error.issues[0]?.message ?? 'unknown'}`)
    return { ...parsed.data, source: 'remote' }
  } catch (err) {
    return fallback(err instanceof Error ? err.message : String(err))
  }
}
```

- [ ] **Step 9: 確認測試通過**

Run: `pnpm --filter @repo/menu test`
Expected: PASS。

- [ ] **Step 10: 寫 revalidate handler 的失敗測試**

`packages/menu/src/revalidate.test.ts`：

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'

const revalidateTag = vi.fn()
vi.mock('next/cache', () => ({ revalidateTag }))
vi.mock('server-only', () => ({}))

const { createRevalidateMenuHandler } = await import('./revalidate')

const post = (auth?: string) =>
  new Request('http://localhost/api/revalidate-menu', {
    method: 'POST',
    headers: auth ? { authorization: auth } : {},
  })

describe('createRevalidateMenuHandler', () => {
  beforeEach(() => revalidateTag.mockClear())

  it('token 正確時清除 menu 快取', async () => {
    const res = await createRevalidateMenuHandler(() => 'secret')(post('Bearer secret'))
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({ revalidated: true })
    expect(revalidateTag).toHaveBeenCalledWith('menu')
  })

  it.each([
    ['沒有帶 token', undefined],
    ['token 錯誤', 'Bearer wrong'],
    ['格式錯誤', 'secret'],
  ])('%s 時回 401', async (_name, auth) => {
    const res = await createRevalidateMenuHandler(() => 'secret')(post(auth))
    expect(res.status).toBe(401)
    expect(revalidateTag).not.toHaveBeenCalled()
  })

  it('伺服器沒設定 token 時一律拒絕', async () => {
    const res = await createRevalidateMenuHandler(() => undefined)(post('Bearer '))
    expect(res.status).toBe(401)
  })
})
```

- [ ] **Step 11: 確認測試失敗**

Run: `pnpm --filter @repo/menu test -- revalidate`
Expected: FAIL，找不到 `./revalidate`。

- [ ] **Step 12: 實作 `revalidate.ts` 與 `server.ts`**

`packages/menu/src/revalidate.ts`：

```ts
import 'server-only'
import { revalidateTag } from 'next/cache'
import { MENU_TAG } from './get-menu'

export function createRevalidateMenuHandler(getToken: () => string | undefined = () => process.env.REVALIDATE_TOKEN) {
  return async function POST(request: Request): Promise<Response> {
    const token = getToken()
    if (!token || request.headers.get('authorization') !== `Bearer ${token}`) {
      return Response.json({ error: 'unauthorized' }, { status: 401 })
    }
    revalidateTag(MENU_TAG)
    return Response.json({ revalidated: true })
  }
}
```

`packages/menu/src/server.ts`：

```ts
import 'server-only'

export { getMenu, MENU_TAG } from './get-menu'
export { createRevalidateMenuHandler } from './revalidate'
```

- [ ] **Step 13: 確認全部測試與型別檢查通過**

Run: `pnpm --filter @repo/menu test && pnpm --filter @repo/menu typecheck`
Expected: PASS；`tsc` 沒有輸出。

- [ ] **Step 14: Checkpoint**

Run: `git status --short`，回報變更（不 commit）。

---

### Task 4: `@repo/ui` 設計系統

**Files:**
- Create: `packages/ui/package.json`, `tsconfig.json`, `vitest.config.ts`
- Create: `packages/ui/src/theme.css`, `cn.ts`, `format.ts`, `Button.tsx`, `Card.tsx`, `Table.tsx`, `Badge.tsx`, `PageHeader.tsx`, `index.ts`
- Test: `packages/ui/src/format.test.ts`, `packages/ui/src/Table.test.tsx`

**Interfaces:**
- Produces（`@repo/ui`）：
  - `cn(...parts: Array<string | false | null | undefined>): string`
  - `formatCurrency(amount: number): string`（`NT$1,234`）、`formatDate(iso: string): string`（`2026/11/01`）
  - `buttonClassName(variant?: 'primary' | 'secondary'): string`
  - `Button(props: ComponentProps<'button'> & { variant?: 'primary' | 'secondary' })`
  - `Card({ title?: ReactNode; children: ReactNode; className?: string })`
  - `Table<T>({ columns: Array<{ key: string; header: ReactNode; render: (row: T) => ReactNode; className?: string }>; rows: T[]; rowKey: (row: T) => string; empty?: ReactNode })`
  - `Badge({ tone?: 'neutral' | 'success' | 'warning' | 'info'; children: ReactNode })`
  - `PageHeader({ title: ReactNode; description?: ReactNode; actions?: ReactNode })`
- Produces（`@repo/ui/theme.css`）：Tailwind v4 `@theme` token，預設 `--color-zone: #64748b`，app 自行覆寫。

- [ ] **Step 1: 建立套件設定**

`packages/ui/package.json`：

```json
{
  "name": "@repo/ui",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts",
    "./theme.css": { "style": "./src/theme.css", "default": "./src/theme.css" }
  },
  "scripts": {
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "peerDependencies": {
    "react": "19.3.1"
  },
  "devDependencies": {
    "@repo/tsconfig": "workspace:*",
    "react": "19.3.1",
    "react-dom": "19.3.1"
  }
}
```

`packages/ui/tsconfig.json`：

```json
{
  "extends": "@repo/tsconfig/react-library.json",
  "include": ["src"]
}
```

`packages/ui/vitest.config.ts`：

```ts
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({ plugins: [react()], test: { environment: 'jsdom' } })
```

Run: `pnpm install`

- [ ] **Step 2: 寫失敗測試**

`packages/ui/src/format.test.ts`：

```ts
import { describe, expect, it } from 'vitest'
import { cn } from './cn'
import { formatCurrency, formatDate } from './format'

describe('format', () => {
  it('金額格式為 NT$ 加千分位、無小數', () => {
    expect(formatCurrency(1234)).toBe('NT$1,234')
    expect(formatCurrency(0)).toBe('NT$0')
  })

  it('日期格式為 YYYY/MM/DD（以台北時區）', () => {
    expect(formatDate('2026-11-01T00:00:00+08:00')).toBe('2026/11/01')
  })
})

describe('cn', () => {
  it('忽略 falsy 值並以空白連接', () => {
    expect(cn('a', false, null, undefined, 'b')).toBe('a b')
  })
})
```

`packages/ui/src/Table.test.tsx`：

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Table } from './Table'

type Row = { id: string; name: string }
const columns = [
  { key: 'id', header: '編號', render: (r: Row) => r.id },
  { key: 'name', header: '名稱', render: (r: Row) => <strong>{r.name}</strong> },
]

describe('Table', () => {
  it('依 columns 渲染表頭與每一列', () => {
    render(<Table columns={columns} rows={[{ id: '1', name: 'A' }, { id: '2', name: 'B' }]} rowKey={(r) => r.id} />)
    expect(screen.getAllByRole('columnheader').map((th) => th.textContent)).toEqual(['編號', '名稱'])
    expect(screen.getAllByRole('row')).toHaveLength(3)
    expect(screen.getByText('B').tagName).toBe('STRONG')
  })

  it('沒有資料時顯示 empty 內容', () => {
    render(<Table columns={columns} rows={[]} rowKey={(r) => r.id} empty="沒有資料" />)
    expect(screen.getByText('沒有資料')).toBeTruthy()
  })
})
```

- [ ] **Step 3: 確認測試失敗**

Run: `pnpm --filter @repo/ui test`
Expected: FAIL，找不到 `./cn`、`./format`、`./Table`。

- [ ] **Step 4: 實作所有元件**

`packages/ui/src/theme.css`：

```css
@theme {
  --font-sans: ui-sans-serif, system-ui, -apple-system, "PingFang TC", "Noto Sans TC", "Microsoft JhengHei", sans-serif;
  --color-zone: #64748b;
  --radius-card: 0.75rem;
}
```

`packages/ui/src/cn.ts`：

```ts
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}
```

`packages/ui/src/format.ts`：

```ts
const currency = new Intl.NumberFormat('zh-TW', { maximumFractionDigits: 0 })
const date = new Intl.DateTimeFormat('zh-TW', {
  timeZone: 'Asia/Taipei',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

export function formatCurrency(amount: number): string {
  return `NT$${currency.format(amount)}`
}

export function formatDate(iso: string): string {
  const parts = Object.fromEntries(date.formatToParts(new Date(iso)).map((p) => [p.type, p.value]))
  return `${parts.year}/${parts.month}/${parts.day}`
}
```

`packages/ui/src/Button.tsx`：

```tsx
import type { ComponentProps } from 'react'
import { cn } from './cn'

type Variant = 'primary' | 'secondary'

export function buttonClassName(variant: Variant = 'primary'): string {
  return cn(
    'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zone',
    variant === 'primary' && 'bg-zone text-white hover:opacity-90',
    variant === 'secondary' && 'border border-slate-300 bg-white text-slate-800 hover:bg-slate-50',
  )
}

export function Button({ variant = 'primary', className, ...props }: ComponentProps<'button'> & { variant?: Variant }) {
  return <button className={cn(buttonClassName(variant), className)} {...props} />
}
```

`packages/ui/src/Card.tsx`：

```tsx
import type { ReactNode } from 'react'
import { cn } from './cn'

export function Card({ title, children, className }: { title?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn('rounded-card border border-slate-200 bg-white p-5 shadow-sm', className)}>
      {title ? <h2 className="mb-3 text-base font-semibold text-slate-900">{title}</h2> : null}
      {children}
    </section>
  )
}
```

`packages/ui/src/Table.tsx`：

```tsx
import type { ReactNode } from 'react'
import { cn } from './cn'

export type Column<T> = { key: string; header: ReactNode; render: (row: T) => ReactNode; className?: string }

export function Table<T>({
  columns,
  rows,
  rowKey,
  empty = '沒有資料',
}: {
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T) => string
  empty?: ReactNode
}) {
  if (rows.length === 0) return <p className="py-6 text-center text-sm text-slate-500">{empty}</p>
  return (
    <div className="overflow-x-auto rounded-card border border-slate-200 bg-white">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-slate-600">
          <tr>
            {columns.map((c) => (
              <th key={c.key} scope="col" className={cn('px-4 py-3 font-medium', c.className)}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row) => (
            <tr key={rowKey(row)} className="hover:bg-slate-50">
              {columns.map((c) => (
                <td key={c.key} className={cn('px-4 py-3', c.className)}>
                  {c.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

`packages/ui/src/Badge.tsx`：

```tsx
import type { ReactNode } from 'react'
import { cn } from './cn'

type Tone = 'neutral' | 'success' | 'warning' | 'info'

const tones: Record<Tone, string> = {
  neutral: 'bg-slate-100 text-slate-700',
  success: 'bg-green-100 text-green-800',
  warning: 'bg-amber-100 text-amber-800',
  info: 'bg-blue-100 text-blue-800',
}

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium', tones[tone])}>{children}</span>
}
```

`packages/ui/src/PageHeader.tsx`：

```tsx
import type { ReactNode } from 'react'

export function PageHeader({ title, description, actions }: { title: ReactNode; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        {description ? <p className="mt-1 text-sm text-slate-600">{description}</p> : null}
      </div>
      {actions ? <div className="flex gap-2">{actions}</div> : null}
    </div>
  )
}
```

`packages/ui/src/index.ts`：

```ts
export { cn } from './cn'
export { formatCurrency, formatDate } from './format'
export { Button, buttonClassName } from './Button'
export { Card } from './Card'
export { Table, type Column } from './Table'
export { Badge } from './Badge'
export { PageHeader } from './PageHeader'
```

- [ ] **Step 5: 確認測試與型別檢查通過**

Run: `pnpm --filter @repo/ui test && pnpm --filter @repo/ui typecheck`
Expected: PASS；`tsc` 沒有輸出。

- [ ] **Step 6: Checkpoint**

Run: `git status --short`，回報變更（不 commit）。

---

### Task 5: `@repo/menu` 元件（ZoneLink、SiteMenu、RuntimeMenuHost）

**Files:**
- Create: `packages/menu/src/ZoneLink.tsx`, `MenuItemLink.tsx`, `SiteMenu.tsx`, `runtime-navigate.ts`, `RuntimeMenuHost.tsx`
- Modify: `packages/menu/src/index.ts`
- Test: `packages/menu/src/ZoneLink.test.tsx`, `SiteMenu.test.tsx`, `runtime-navigate.test.ts`

**Interfaces:**
- Consumes: `zoneForPath`、`isActivePath`、`Zone`（Task 3）、`LoadedMenu`（Task 3）、`buttonClassName` 不使用（menu 不依賴 ui，避免耦合）
- Produces（`@repo/menu`）：
  - `ZoneLink(props: Omit<ComponentProps<'a'>, 'href'> & { href: string; currentZone: Zone })`
  - `type MenuUser = { name: string } | null`
  - `SiteMenu({ menu: LoadedMenu; currentZone: Zone; user: MenuUser })`：根元素 `<nav aria-label="主選單" data-menu="build" data-menu-variant="v1"|"v2">`；每個連結帶 `data-zone`；目前頁面帶 `aria-current="page"`
  - `createNavigate(currentZone: Zone, push: (href: string) => void, assign: (href: string) => void): (href: string) => void`
  - `type RuntimeMenuElement = HTMLElement & { currentZone: Zone; pathname: string; user: MenuUser; navigate: (href: string) => void }`
  - `RuntimeMenuHost({ runtimeUrl: string; currentZone: Zone; user: MenuUser })`：根元素 `<div data-menu="runtime" data-status="loading"|"ready"|"error">`，載入後在裡面放 `<runtime-site-menu>`

- [ ] **Step 1: 寫失敗測試**

`packages/menu/src/ZoneLink.test.tsx`：

```tsx
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} data-next-link="" {...rest}>
      {children}
    </a>
  ),
}))

const { ZoneLink } = await import('./ZoneLink')

describe('ZoneLink', () => {
  it('同 zone 用 next/link（soft navigation）', () => {
    render(<ZoneLink href="/orders/1001" currentZone="order">訂單</ZoneLink>)
    expect(screen.getByRole('link', { name: '訂單' }).hasAttribute('data-next-link')).toBe(true)
  })

  it('跨 zone 用一般 <a>（整頁載入）', () => {
    render(<ZoneLink href="/invoices/INV-1001" currentZone="order">發票</ZoneLink>)
    const link = screen.getByRole('link', { name: '發票' })
    expect(link.hasAttribute('data-next-link')).toBe(false)
    expect(link.getAttribute('href')).toBe('/invoices/INV-1001')
  })

  it('從 invoice 連回 order 也是一般 <a>', () => {
    render(<ZoneLink href="/orders/1001" currentZone="invoice" className="x">回到訂單</ZoneLink>)
    const link = screen.getByRole('link', { name: '回到訂單' })
    expect(link.hasAttribute('data-next-link')).toBe(false)
    expect(link.className).toBe('x')
  })
})
```

`packages/menu/src/SiteMenu.test.tsx`：

```tsx
import { render, screen, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import type { LoadedMenu } from './schema'

vi.mock('next/navigation', () => ({ usePathname: () => '/orders/1001' }))
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} data-next-link="" {...rest}>
      {children}
    </a>
  ),
}))

const { SiteMenu } = await import('./SiteMenu')

const menu = (menuV2: boolean): LoadedMenu => ({
  version: 1,
  flags: { menuV2 },
  source: 'remote',
  items: [
    { label: '首頁', href: '/' },
    { label: '訂單', href: '/orders' },
    { label: '發票', href: '/invoices' },
  ],
})

describe('SiteMenu', () => {
  it('依 flags.menuV2 切換樣式版本', () => {
    const { rerender } = render(<SiteMenu menu={menu(false)} currentZone="order" user={null} />)
    expect(screen.getByRole('navigation', { name: '主選單' }).dataset.menuVariant).toBe('v1')
    rerender(<SiteMenu menu={menu(true)} currentZone="order" user={null} />)
    expect(screen.getByRole('navigation', { name: '主選單' }).dataset.menuVariant).toBe('v2')
  })

  it('每個連結標記所屬 zone，同 zone 用 next/link、跨 zone 用 <a>', () => {
    render(<SiteMenu menu={menu(false)} currentZone="order" user={null} />)
    const nav = screen.getByRole('navigation', { name: '主選單' })
    const orders = within(nav).getByRole('link', { name: '訂單' })
    const invoices = within(nav).getByRole('link', { name: '發票' })
    expect(orders.dataset.zone).toBe('order')
    expect(orders.hasAttribute('data-next-link')).toBe(true)
    expect(invoices.dataset.zone).toBe('invoice')
    expect(invoices.hasAttribute('data-next-link')).toBe(false)
  })

  it('目前頁面標記 aria-current', () => {
    render(<SiteMenu menu={menu(false)} currentZone="order" user={null} />)
    expect(screen.getByRole('link', { name: '訂單' }).getAttribute('aria-current')).toBe('page')
    expect(screen.getByRole('link', { name: '首頁' }).getAttribute('aria-current')).toBeNull()
  })

  it('未登入顯示登入連結；登入後顯示名稱與 POST 到 /api/logout 的登出表單', () => {
    const { rerender } = render(<SiteMenu menu={menu(false)} currentZone="invoice" user={null} />)
    expect(screen.getByRole('link', { name: '登入' }).getAttribute('href')).toBe('/login')
    rerender(<SiteMenu menu={menu(false)} currentZone="invoice" user={{ name: 'Alice' }} />)
    expect(screen.getByText('Alice')).toBeTruthy()
    const form = screen.getByRole('button', { name: '登出' }).closest('form')!
    expect(form.getAttribute('method')).toBe('post')
    expect(form.getAttribute('action')).toBe('/api/logout')
  })
})
```

`packages/menu/src/runtime-navigate.test.ts`：

```ts
import { describe, expect, it, vi } from 'vitest'
import { createNavigate } from './runtime-navigate'

describe('createNavigate', () => {
  it('同 zone 呼叫 router.push（soft navigation）', () => {
    const push = vi.fn()
    const assign = vi.fn()
    createNavigate('order', push, assign)('/orders/1001')
    expect(push).toHaveBeenCalledWith('/orders/1001')
    expect(assign).not.toHaveBeenCalled()
  })

  it('跨 zone 呼叫 location.assign（整頁載入）', () => {
    const push = vi.fn()
    const assign = vi.fn()
    createNavigate('order', push, assign)('/invoices')
    expect(assign).toHaveBeenCalledWith('/invoices')
    expect(push).not.toHaveBeenCalled()
  })

  it('非站內路徑一律忽略', () => {
    const push = vi.fn()
    const assign = vi.fn()
    createNavigate('order', push, assign)('https://evil.com')
    expect(push).not.toHaveBeenCalled()
    expect(assign).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: 確認測試失敗**

Run: `pnpm --filter @repo/menu test`
Expected: FAIL，找不到 `./ZoneLink`、`./SiteMenu`、`./runtime-navigate`。

- [ ] **Step 3: 實作 `ZoneLink.tsx`、`MenuItemLink.tsx`、`SiteMenu.tsx`**

`packages/menu/src/ZoneLink.tsx`：

```tsx
import Link from 'next/link'
import type { ComponentProps } from 'react'
import { zoneForPath, type Zone } from './zones'

type Props = Omit<ComponentProps<'a'>, 'href'> & { href: string; currentZone: Zone }

/** 同 zone 用 next/link（soft navigation），跨 zone 用 <a>（整頁載入）。 */
export function ZoneLink({ href, currentZone, children, ...rest }: Props) {
  if (zoneForPath(href) === currentZone) {
    return (
      <Link href={href} {...rest}>
        {children}
      </Link>
    )
  }
  return (
    <a href={href} {...rest}>
      {children}
    </a>
  )
}
```

`packages/menu/src/MenuItemLink.tsx`：

```tsx
'use client'

import { usePathname } from 'next/navigation'
import type { MenuItem } from './schema'
import { ZoneLink } from './ZoneLink'
import { isActivePath, zoneForPath, type Zone } from './zones'

const styles = {
  v1: {
    base: 'rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900',
    active: 'bg-slate-100 text-zone',
  },
  v2: {
    base: 'rounded-full px-4 py-1.5 text-sm font-medium text-slate-200 hover:bg-white/10',
    active: 'bg-white text-slate-900',
  },
} as const

export function MenuItemLink({ item, currentZone, variant }: { item: Pick<MenuItem, 'label' | 'href'>; currentZone: Zone; variant: 'v1' | 'v2' }) {
  const pathname = usePathname() ?? '/'
  const active = isActivePath(pathname, item.href)
  const s = styles[variant]
  return (
    <ZoneLink
      href={item.href}
      currentZone={currentZone}
      data-zone={zoneForPath(item.href)}
      aria-current={active ? 'page' : undefined}
      className={active ? `${s.base} ${s.active}` : s.base}
    >
      {item.label}
    </ZoneLink>
  )
}
```

`packages/menu/src/SiteMenu.tsx`：

```tsx
import { MenuItemLink } from './MenuItemLink'
import type { LoadedMenu } from './schema'
import { ZoneLink } from './ZoneLink'
import type { Zone } from './zones'

export type MenuUser = { name: string } | null

const containers = {
  v1: 'flex flex-wrap items-center gap-4 border-b border-slate-200 bg-white px-4 py-3 sm:px-6',
  v2: 'm-3 flex flex-wrap items-center gap-3 rounded-full bg-slate-900 px-4 py-2 text-white shadow-lg',
} as const

export function SiteMenu({ menu, currentZone, user }: { menu: LoadedMenu; currentZone: Zone; user: MenuUser }) {
  const variant = menu.flags.menuV2 ? 'v2' : 'v1'
  return (
    <nav aria-label="主選單" data-menu="build" data-menu-variant={variant} className={containers[variant]}>
      <span className="font-semibold">Order × Invoice</span>
      <ul className="flex flex-1 flex-wrap items-center gap-1">
        {menu.items.map((item) => (
          <li key={item.href} className="group relative">
            <MenuItemLink item={item} currentZone={currentZone} variant={variant} />
            {item.children?.length ? (
              <ul className="absolute left-0 top-full z-10 hidden min-w-40 rounded-md border border-slate-200 bg-white p-1 text-slate-800 shadow group-hover:block">
                {item.children.map((child) => (
                  <li key={child.href}>
                    <MenuItemLink item={child} currentZone={currentZone} variant="v1" />
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        ))}
      </ul>
      <div className="flex items-center gap-3 text-sm">
        {user ? (
          <>
            <span>{user.name}</span>
            <form method="post" action="/api/logout">
              <button type="submit" className="rounded-md border border-current px-3 py-1 hover:opacity-80">
                登出
              </button>
            </form>
          </>
        ) : (
          <ZoneLink href="/login" currentZone={currentZone} className="rounded-md border border-current px-3 py-1 hover:opacity-80">
            登入
          </ZoneLink>
        )}
      </div>
    </nav>
  )
}
```

- [ ] **Step 4: 實作 `runtime-navigate.ts`、`RuntimeMenuHost.tsx`，更新 `index.ts`**

`packages/menu/src/runtime-navigate.ts`：

```ts
import { isInternalPath, zoneForPath, type Zone } from './zones'

/** runtime Menu 沒辦法使用 next/link，由 host 決定 soft 或 hard navigation。 */
export function createNavigate(
  currentZone: Zone,
  push: (href: string) => void,
  assign: (href: string) => void,
): (href: string) => void {
  return (href) => {
    if (!isInternalPath(href)) return
    if (zoneForPath(href) === currentZone) push(href)
    else assign(href)
  }
}
```

`packages/menu/src/RuntimeMenuHost.tsx`：

```tsx
'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { createNavigate } from './runtime-navigate'
import type { MenuUser } from './SiteMenu'
import type { Zone } from './zones'

export type RuntimeMenuElement = HTMLElement & {
  currentZone: Zone
  pathname: string
  user: MenuUser
  navigate: (href: string) => void
}

type Status = 'loading' | 'ready' | 'error'

/**
 * 在瀏覽器端從 CDN 載入 runtime Menu（Web Component），並把 host 的狀態傳給它。
 * 這是對照組：沒有 SSR，載入前只顯示佔位框。
 */
export function RuntimeMenuHost({ runtimeUrl, currentZone, user }: { runtimeUrl: string; currentZone: Zone; user: MenuUser }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const elementRef = useRef<RuntimeMenuElement | null>(null)
  const [status, setStatus] = useState<Status>('loading')
  const router = useRouter()
  const pathname = usePathname() ?? '/'

  useEffect(() => {
    let cancelled = false
    setStatus('loading')
    import(/* webpackIgnore: true */ runtimeUrl)
      .then(() => customElements.whenDefined('runtime-site-menu'))
      .then(() => {
        if (cancelled || !containerRef.current) return
        const el = document.createElement('runtime-site-menu') as RuntimeMenuElement
        containerRef.current.replaceChildren(el)
        elementRef.current = el
        setStatus('ready')
      })
      .catch((err) => {
        console.error('[runtime-menu] 載入失敗', err)
        if (!cancelled) setStatus('error')
      })
    return () => {
      cancelled = true
      elementRef.current?.remove()
      elementRef.current = null
    }
  }, [runtimeUrl])

  useEffect(() => {
    const el = elementRef.current
    if (!el) return
    el.currentZone = currentZone
    el.user = user
    el.navigate = createNavigate(currentZone, (href) => router.push(href), (href) => window.location.assign(href))
    el.pathname = pathname
  }, [status, currentZone, user, pathname, router])

  return (
    <div data-menu="runtime" data-status={status}>
      {status === 'loading' ? <div aria-label="選單載入中" className="h-14 animate-pulse border-b border-slate-200 bg-slate-100" /> : null}
      {status === 'error' ? (
        <div role="alert" className="border-b border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          選單載入失敗：無法從 CDN 取得 runtime menu
        </div>
      ) : null}
      <div ref={containerRef} />
    </div>
  )
}
```

`packages/menu/src/index.ts`：

```ts
export * from './zones'
export type { LoadedMenu, MenuConfig, MenuItem, MenuSource } from './schema'
export { ZoneLink } from './ZoneLink'
export { SiteMenu, type MenuUser } from './SiteMenu'
export { createNavigate } from './runtime-navigate'
export { RuntimeMenuHost, type RuntimeMenuElement } from './RuntimeMenuHost'
```

- [ ] **Step 5: 確認測試與型別檢查通過**

Run: `pnpm --filter @repo/menu test && pnpm --filter @repo/menu typecheck`
Expected: PASS；`tsc` 沒有輸出。

- [ ] **Step 6: Checkpoint**

Run: `git status --short`，回報變更（不 commit）。

---

### Task 6: `@repo/zone-inspector` 導頁視覺化

**Files:**
- Create: `packages/zone-inspector/package.json`, `tsconfig.json`, `vitest.config.ts`, `src/next-env.d.ts`
- Create: `packages/zone-inspector/src/useNavigationTracker.ts`, `ZoneInspector.tsx`, `index.ts`
- Test: `packages/zone-inspector/src/useNavigationTracker.test.ts`

**Interfaces:**
- Consumes: `Zone`、`MenuMode`、`MENU_MODE_COOKIE`（`@repo/menu/zones`）
- Produces（`@repo/zone-inspector`）：
  - `useNavigationTracker(pathname: string): { softNavCount: number; lastEvent: 'full-load' | 'soft-nav'; loadedAt: number | null }`
  - `resetNavigationTracker(): void`（僅供測試）
  - `ZoneInspector({ zone: Zone; menuMode: MenuMode; menuSource: 'remote' | 'fallback' | 'runtime' })`：根元素 `<aside data-testid="zone-inspector" data-zone data-soft-nav-count data-loaded-at data-last-event data-menu-mode data-menu-source>`；切換按鈕文字為「切換成 runtime menu」或「切換成 build-time menu」

- [ ] **Step 1: 建立套件設定**

`packages/zone-inspector/package.json`：

```json
{
  "name": "@repo/zone-inspector",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": { ".": "./src/index.ts" },
  "scripts": {
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@repo/menu": "workspace:*"
  },
  "peerDependencies": {
    "next": "15.5.28",
    "react": "19.3.1"
  },
  "devDependencies": {
    "@repo/tsconfig": "workspace:*",
    "next": "15.5.28",
    "react": "19.3.1",
    "react-dom": "19.3.1"
  }
}
```

`packages/zone-inspector/tsconfig.json`：

```json
{
  "extends": "@repo/tsconfig/react-library.json",
  "include": ["src"]
}
```

`packages/zone-inspector/vitest.config.ts`：

```ts
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({ plugins: [react()], test: { environment: 'jsdom' } })
```

`packages/zone-inspector/src/next-env.d.ts`：

```ts
/// <reference types="next" />
```

Run: `pnpm install`

- [ ] **Step 2: 寫失敗測試**

`packages/zone-inspector/src/useNavigationTracker.test.ts`：

```ts
import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { resetNavigationTracker, useNavigationTracker } from './useNavigationTracker'

describe('useNavigationTracker', () => {
  beforeEach(() => resetNavigationTracker())

  it('首次掛載視為整頁載入，次數為 0，並記錄載入時間', async () => {
    const { result } = renderHook(({ p }) => useNavigationTracker(p), { initialProps: { p: '/orders' } })
    await act(async () => {})
    expect(result.current.softNavCount).toBe(0)
    expect(result.current.lastEvent).toBe('full-load')
    expect(result.current.loadedAt).toBe(Math.round(performance.timeOrigin))
  })

  it('pathname 改變時次數 +1，且標記為 soft navigation', () => {
    const { result, rerender } = renderHook(({ p }) => useNavigationTracker(p), { initialProps: { p: '/orders' } })
    rerender({ p: '/orders/1001' })
    expect(result.current.softNavCount).toBe(1)
    expect(result.current.lastEvent).toBe('soft-nav')
    rerender({ p: '/' })
    expect(result.current.softNavCount).toBe(2)
  })

  it('pathname 沒變（例如 StrictMode 重跑 effect）時不增加次數', () => {
    const { result, rerender } = renderHook(({ p }) => useNavigationTracker(p), {
      initialProps: { p: '/orders' },
      reactStrictMode: true,
    })
    rerender({ p: '/orders' })
    expect(result.current.softNavCount).toBe(0)
  })
})
```

- [ ] **Step 3: 確認測試失敗**

Run: `pnpm --filter @repo/zone-inspector test`
Expected: FAIL，找不到 `./useNavigationTracker`。

- [ ] **Step 4: 實作 hook、元件、index**

`packages/zone-inspector/src/useNavigationTracker.ts`：

```ts
import { useEffect, useRef, useState } from 'react'

// module 層級：soft navigation 時 module 不會重新執行，整頁載入時才會歸零。
let softNavCount = 0

export function resetNavigationTracker(): void {
  softNavCount = 0
}

export function useNavigationTracker(pathname: string) {
  const previous = useRef(pathname)
  const [state, setState] = useState<{ softNavCount: number; lastEvent: 'full-load' | 'soft-nav' }>(() => ({
    softNavCount,
    lastEvent: 'full-load',
  }))
  const [loadedAt, setLoadedAt] = useState<number | null>(null)

  useEffect(() => {
    setLoadedAt(Math.round(performance.timeOrigin))
  }, [])

  useEffect(() => {
    if (previous.current === pathname) return
    previous.current = pathname
    softNavCount += 1
    setState({ softNavCount, lastEvent: 'soft-nav' })
  }, [pathname])

  return { ...state, loadedAt }
}
```

`packages/zone-inspector/src/ZoneInspector.tsx`：

```tsx
'use client'

import { MENU_MODE_COOKIE, type MenuMode, type Zone } from '@repo/menu/zones'
import { usePathname } from 'next/navigation'
import { useNavigationTracker } from './useNavigationTracker'

const zoneLabel: Record<Zone, string> = { order: 'order（主網站）', invoice: 'invoice' }
const sourceLabel = { remote: 'build-time（遠端 menu.json）', fallback: 'build-time（備援資料）', runtime: 'runtime（CDN 載入）' } as const

function formatTime(ms: number | null): string {
  if (ms === null) return '—'
  return new Date(ms).toLocaleTimeString('zh-TW', { hour12: false })
}

export function ZoneInspector({
  zone,
  menuMode,
  menuSource,
}: {
  zone: Zone
  menuMode: MenuMode
  menuSource: 'remote' | 'fallback' | 'runtime'
}) {
  const pathname = usePathname() ?? '/'
  const { softNavCount, lastEvent, loadedAt } = useNavigationTracker(pathname)
  const nextMode: MenuMode = menuMode === 'build' ? 'runtime' : 'build'

  function switchMenu() {
    document.cookie = `${MENU_MODE_COOKIE}=${nextMode}; path=/; max-age=31536000; samesite=lax`
    window.location.reload()
  }

  return (
    <aside
      data-testid="zone-inspector"
      data-zone={zone}
      data-soft-nav-count={softNavCount}
      data-loaded-at={loadedAt ?? ''}
      data-last-event={lastEvent}
      data-menu-mode={menuMode}
      data-menu-source={menuSource}
      className="fixed inset-x-0 bottom-0 z-50 flex flex-wrap items-center gap-x-5 gap-y-1 border-t-4 border-zone bg-slate-900 px-4 py-2 text-xs text-slate-100"
    >
      <span className="flex items-center gap-2 font-semibold">
        <span className="size-2.5 rounded-full bg-zone" aria-hidden />
        目前 zone：{zoneLabel[zone]}
      </span>
      <span>整頁載入：{formatTime(loadedAt)}</span>
      <span>soft navigation：{softNavCount} 次</span>
      <span key={`${lastEvent}-${softNavCount}`} className="animate-pulse rounded bg-white/10 px-2 py-0.5">
        最近一次：{lastEvent === 'soft-nav' ? 'soft navigation' : '整頁載入'}
      </span>
      <span>Menu：{sourceLabel[menuSource]}</span>
      <button type="button" onClick={switchMenu} className="ml-auto rounded border border-white/30 px-2 py-1 hover:bg-white/10">
        {nextMode === 'runtime' ? '切換成 runtime menu' : '切換成 build-time menu'}
      </button>
    </aside>
  )
}
```

`packages/zone-inspector/src/index.ts`：

```ts
export { ZoneInspector } from './ZoneInspector'
export { resetNavigationTracker, useNavigationTracker } from './useNavigationTracker'
```

- [ ] **Step 5: 確認測試與型別檢查通過**

Run: `pnpm --filter @repo/zone-inspector test && pnpm --filter @repo/zone-inspector typecheck`
Expected: PASS；`tsc` 沒有輸出。

- [ ] **Step 6: Checkpoint**

Run: `git status --short`，回報變更（不 commit）。

---

### Task 7: `apps/order`（主網站）

**Files:**
- Create: `apps/order/package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `next-env.d.ts`, `.env.example`, `public/.gitkeep`
- Create: `apps/order/src/app/globals.css`, `layout.tsx`, `page.tsx`, `not-found.tsx`
- Create: `apps/order/src/app/login/page.tsx`
- Create: `apps/order/src/app/orders/page.tsx`, `apps/order/src/app/orders/[id]/page.tsx`
- Create: `apps/order/src/app/api/login/route.ts`, `api/logout/route.ts`, `api/revalidate-menu/route.ts`
- Create: `apps/order/src/middleware.ts`, `apps/order/src/lib/users.ts`, `apps/order/src/data/orders.ts`

**Interfaces:**
- Consumes: `@repo/auth`（Task 2）、`@repo/menu` / `@repo/menu/server`（Task 3、5）、`@repo/ui`（Task 4）、`@repo/zone-inspector`（Task 6）
- Produces: order 在 port 3000 提供 spec §4.4 的頁面；`POST /api/login`、`POST /api/logout`、`POST /api/revalidate-menu`。

- [ ] **Step 1: 建立 app 設定**

`apps/order/package.json`：

```json
{
  "name": "@repo/order",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3000",
    "build": "next build",
    "start": "next start -p 3000",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@repo/auth": "workspace:*",
    "@repo/menu": "workspace:*",
    "@repo/ui": "workspace:*",
    "@repo/zone-inspector": "workspace:*",
    "next": "15.5.28",
    "react": "19.3.1",
    "react-dom": "19.3.1"
  },
  "devDependencies": {
    "@repo/tsconfig": "workspace:*",
    "@tailwindcss/postcss": "4.3.5",
    "tailwindcss": "4.3.5"
  }
}
```

`apps/order/tsconfig.json`：

```json
{
  "extends": "@repo/tsconfig/nextjs.json",
  "compilerOptions": {
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "src/**/*.ts", "src/**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

`apps/order/next-env.d.ts`：

```ts
/// <reference types="next" />
/// <reference types="next/image-types/global" />

// NOTE: This file should not be edited
// see https://nextjs.org/docs/app/api-reference/config/typescript for more information.
```

`apps/order/postcss.config.mjs`：

```js
export default { plugins: { '@tailwindcss/postcss': {} } }
```

`apps/order/next.config.ts`：

```ts
import path from 'node:path'
import type { NextConfig } from 'next'

const INVOICE_ZONE_URL = process.env.INVOICE_ZONE_URL ?? 'http://localhost:3001'
if (!/^https?:\/\/[^/]+$/.test(INVOICE_ZONE_URL)) {
  throw new Error(`INVOICE_ZONE_URL 必須是不帶路徑、不帶結尾斜線的 origin，目前是 "${INVOICE_ZONE_URL}"`)
}
// build log 要能看到實際寫進 routes-manifest 的目標（Docker build 時用來確認）
console.log(`[order] rewrites → invoice=${INVOICE_ZONE_URL}`)

const nextConfig: NextConfig = {
  output: process.env.BUILD_STANDALONE === '1' ? 'standalone' : undefined,
  outputFileTracingRoot: path.resolve(process.cwd(), '../..'),
  transpilePackages: ['@repo/ui', '@repo/menu', '@repo/auth', '@repo/zone-inspector'],
  eslint: { ignoreDuringBuilds: true },
  // order 不得定義套用到 /:path* 的 headers()：會在 rewrite 前套用而蓋掉 invoice 的 x-zone。
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
  },
}

export default nextConfig
```

`apps/order/.env.example`：

```
# 本機開發用。以下 secret 只供 demo，不得用於正式環境。
INVOICE_ZONE_URL=http://localhost:3001
MENU_CONFIG_URL=http://localhost:4000/menu.json
MENU_RUNTIME_URL=http://localhost:4000/assets/menu-runtime.js
AUTH_SECRET=demo-only-auth-secret-change-me-0123456789
REVALIDATE_TOKEN=demo-only-revalidate-token
```

建立空檔 `apps/order/public/.gitkeep`。

Run: `pnpm install && node scripts/bootstrap.mjs`
Expected: 印出「已建立 apps/order/.env.local」。

- [ ] **Step 2: 建立資料與使用者**

`apps/order/src/data/orders.ts`：

```ts
export type OrderStatus = 'pending' | 'paid' | 'shipped'

export type Order = {
  id: string
  customer: string
  createdAt: string
  status: OrderStatus
  invoiceId: string | null
  items: { name: string; qty: number; price: number }[]
}

export const orders: Order[] = [
  { id: '1001', customer: '王小明', createdAt: '2026-11-01T10:20:00+08:00', status: 'shipped', invoiceId: 'INV-1001', items: [{ name: '機械鍵盤', qty: 1, price: 3200 }, { name: '滑鼠墊', qty: 2, price: 350 }] },
  { id: '1002', customer: '陳美玲', createdAt: '2026-11-03T14:05:00+08:00', status: 'paid', invoiceId: 'INV-1002', items: [{ name: '27 吋螢幕', qty: 1, price: 8900 }] },
  { id: '1003', customer: '林志豪', createdAt: '2026-11-08T09:40:00+08:00', status: 'paid', invoiceId: 'INV-1003', items: [{ name: 'USB-C 擴充座', qty: 1, price: 2490 }, { name: '傳輸線', qty: 3, price: 290 }] },
  { id: '1004', customer: '張雅婷', createdAt: '2026-11-12T16:30:00+08:00', status: 'shipped', invoiceId: 'INV-1004', items: [{ name: '降噪耳機', qty: 1, price: 6990 }] },
  { id: '1005', customer: '黃建國', createdAt: '2026-11-20T11:15:00+08:00', status: 'pending', invoiceId: null, items: [{ name: '筆電支架', qty: 1, price: 1280 }] },
]

export function orderTotal(order: Order): number {
  return order.items.reduce((sum, i) => sum + i.qty * i.price, 0)
}

export function findOrder(id: string): Order | undefined {
  return orders.find((o) => o.id === id)
}

export const statusLabel: Record<OrderStatus, { text: string; tone: 'warning' | 'info' | 'success' }> = {
  pending: { text: '待付款', tone: 'warning' },
  paid: { text: '已付款', tone: 'info' },
  shipped: { text: '已出貨', tone: 'success' },
}
```

`apps/order/src/lib/users.ts`：

```ts
import type { SessionUser } from '@repo/auth'

// demo 帳號，不得用於正式環境
const USERS = [{ sub: 'u-alice', name: 'Alice', username: 'alice', password: 'alice123' }]

export function authenticate(username: string, password: string): SessionUser | null {
  const user = USERS.find((u) => u.username === username && u.password === password)
  return user ? { sub: user.sub, name: user.name } : null
}
```

- [ ] **Step 3: 建立 layout 與樣式**

`apps/order/src/app/globals.css`：

```css
@import "tailwindcss";
@import "@repo/ui/theme.css";

/* 讓共用套件裡用到的 class 也被產生（路徑相對於本檔案） */
@source "../../../../packages";

@theme {
  --color-zone: #2563eb;
}
```

`apps/order/src/app/layout.tsx`：

```tsx
import { getCurrentUser } from '@repo/auth/server'
import { MENU_MODE_COOKIE, parseMenuMode, RuntimeMenuHost, SiteMenu } from '@repo/menu'
import { getMenu } from '@repo/menu/server'
import { ZoneInspector } from '@repo/zone-inspector'
import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import type { ReactNode } from 'react'
import './globals.css'

export const metadata: Metadata = { title: 'Order｜Order × Invoice Demo' }

export default async function RootLayout({ children }: { children: ReactNode }) {
  const [user, cookieStore] = await Promise.all([getCurrentUser(), cookies()])
  const menuMode = parseMenuMode(cookieStore.get(MENU_MODE_COOKIE)?.value)
  const menu = menuMode === 'build' ? await getMenu() : null

  return (
    <html lang="zh-Hant">
      <body className="min-h-screen bg-slate-50 pb-20 font-sans text-slate-900">
        <header>
          {menu ? (
            <SiteMenu menu={menu} currentZone="order" user={user} />
          ) : (
            <RuntimeMenuHost runtimeUrl={process.env.MENU_RUNTIME_URL ?? ''} currentZone="order" user={user} />
          )}
        </header>
        <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
        <ZoneInspector zone="order" menuMode={menuMode} menuSource={menu?.source ?? 'runtime'} />
      </body>
    </html>
  )
}
```

`apps/order/src/app/not-found.tsx`：

```tsx
import { PageHeader } from '@repo/ui'

export default function NotFound() {
  return <PageHeader title="找不到頁面" description="這個網址不存在。" />
}
```

- [ ] **Step 4: 建立頁面**

`apps/order/src/app/page.tsx`：

```tsx
import { ZoneLink } from '@repo/menu'
import { Card, PageHeader } from '@repo/ui'

export default function HomePage() {
  return (
    <>
      <PageHeader title="Order × Invoice Multi-Zones Demo" description="order 與 invoice 是兩個各自部署的 Next.js app，透過 Multi-Zones 組成同一個網站。" />
      <div className="grid gap-4 md:grid-cols-2">
        <Card title="試試看">
          <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-700">
            <li>
              用 <code>alice / alice123</code>{' '}
              <ZoneLink href="/login?next=%2Forders" currentZone="order" className="text-zone underline">
                登入
              </ZoneLink>
              。
            </li>
            <li>在「訂單」列表與明細之間切換：底部工具列的 soft navigation 次數會增加，整頁載入時間不變。</li>
            <li>在訂單明細按「查看發票」：會整頁載入到 invoice，工具列變成綠色、次數歸零。</li>
            <li>按工具列的「切換成 runtime menu」，比較兩種 Menu 的差異。</li>
          </ol>
        </Card>
        <Card title="這個 demo 展示什麼">
          <ul className="list-disc space-y-2 pl-5 text-sm text-slate-700">
            <li>order 用 rewrites 把 <code>/invoices/*</code> 轉給 invoice。</li>
            <li>共用 Menu、設計系統、登入狀態（同網域 cookie）。</li>
            <li>Menu 內容放在 <code>menu.json</code>，改了不用部署任何 app。</li>
          </ul>
        </Card>
      </div>
    </>
  )
}
```

`apps/order/src/app/login/page.tsx`：

```tsx
import { safeNextPath } from '@repo/auth'
import { Button, Card, PageHeader } from '@repo/ui'

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams
  const nextPath = safeNextPath(next)
  const input = 'mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-zone focus:outline-none'

  return (
    <div className="mx-auto max-w-sm">
      <PageHeader title="登入" description="demo 帳號：alice / alice123" />
      <Card>
        {/* 一般 HTML form POST，不用 Server Action：登入後可能要跳到另一個 zone，必須整頁跳轉。 */}
        <form method="post" action="/api/login" className="space-y-4">
          <input type="hidden" name="next" value={nextPath} />
          <label className="block text-sm">
            帳號
            <input name="username" autoComplete="username" required className={input} />
          </label>
          <label className="block text-sm">
            密碼
            <input name="password" type="password" autoComplete="current-password" required className={input} />
          </label>
          {error ? (
            <p role="alert" className="text-sm text-red-600">
              帳號或密碼錯誤
            </p>
          ) : null}
          <Button type="submit" className="w-full">
            登入
          </Button>
        </form>
      </Card>
    </div>
  )
}
```

`apps/order/src/app/orders/page.tsx`：

```tsx
import { ZoneLink } from '@repo/menu'
import { Badge, formatCurrency, formatDate, PageHeader, Table } from '@repo/ui'
import { orders, orderTotal, statusLabel, type Order } from '@/data/orders'

export default function OrdersPage() {
  return (
    <>
      <PageHeader title="訂單" description="點訂單編號查看明細（同一個 zone，soft navigation）。" />
      <Table<Order>
        rows={orders}
        rowKey={(o) => o.id}
        columns={[
          {
            key: 'id',
            header: '訂單編號',
            render: (o) => (
              <ZoneLink href={`/orders/${o.id}`} currentZone="order" className="font-medium text-zone underline">
                {o.id}
              </ZoneLink>
            ),
          },
          { key: 'customer', header: '客戶', render: (o) => o.customer },
          { key: 'date', header: '日期', render: (o) => formatDate(o.createdAt) },
          { key: 'total', header: '金額', render: (o) => formatCurrency(orderTotal(o)), className: 'text-right' },
          { key: 'status', header: '狀態', render: (o) => <Badge tone={statusLabel[o.status].tone}>{statusLabel[o.status].text}</Badge> },
        ]}
      />
    </>
  )
}
```

`apps/order/src/app/orders/[id]/page.tsx`：

```tsx
import { ZoneLink } from '@repo/menu'
import { Badge, buttonClassName, Card, formatCurrency, formatDate, PageHeader, Table } from '@repo/ui'
import { notFound } from 'next/navigation'
import { findOrder, orderTotal, statusLabel } from '@/data/orders'

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const order = findOrder(id)
  if (!order) notFound()

  return (
    <>
      <PageHeader
        title={`訂單 ${order.id}`}
        description={`${order.customer}・${formatDate(order.createdAt)}`}
        actions={
          <>
            <ZoneLink href="/orders" currentZone="order" className={buttonClassName('secondary')}>
              回到列表
            </ZoneLink>
            {order.invoiceId ? (
              <ZoneLink href={`/invoices/${order.invoiceId}`} currentZone="order" className={buttonClassName('primary')}>
                查看發票
              </ZoneLink>
            ) : null}
          </>
        }
      />
      <div className="grid gap-4 md:grid-cols-3">
        <Card title="狀態">
          <Badge tone={statusLabel[order.status].tone}>{statusLabel[order.status].text}</Badge>
          <p className="mt-3 text-sm text-slate-600">發票：{order.invoiceId ?? <Badge tone="warning">尚未開立</Badge>}</p>
        </Card>
        <Card title="品項" className="md:col-span-2">
          <Table
            rows={order.items}
            rowKey={(i) => i.name}
            columns={[
              { key: 'name', header: '品名', render: (i) => i.name },
              { key: 'qty', header: '數量', render: (i) => i.qty, className: 'text-right' },
              { key: 'subtotal', header: '小計', render: (i) => formatCurrency(i.qty * i.price), className: 'text-right' },
            ]}
          />
          <p className="mt-3 text-right font-semibold">合計 {formatCurrency(orderTotal(order))}</p>
        </Card>
      </div>
    </>
  )
}
```

- [ ] **Step 5: 建立 API 與 middleware**

`apps/order/src/app/api/login/route.ts`：

```ts
import { safeNextPath, SESSION_COOKIE, sessionCookieOptions, signSession } from '@repo/auth'
import { NextResponse } from 'next/server'
import { authenticate } from '@/lib/users'

// 用相對路徑的 Location 回 303，瀏覽器會整頁跳轉；不論前面是 order 直連、Docker 還是 Front Door 都正確。
function seeOther(location: string): NextResponse {
  return new NextResponse(null, { status: 303, headers: { Location: location } })
}

export async function POST(request: Request) {
  const form = await request.formData()
  const next = safeNextPath(form.get('next'))
  const user = authenticate(String(form.get('username') ?? ''), String(form.get('password') ?? ''))
  if (!user) return seeOther(`/login?error=1&next=${encodeURIComponent(next)}`)

  const token = await signSession(user, process.env.AUTH_SECRET ?? '')
  const res = seeOther(next)
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions())
  return res
}
```

`apps/order/src/app/api/logout/route.ts`：

```ts
import { SESSION_COOKIE, sessionCookieOptions } from '@repo/auth'
import { NextResponse } from 'next/server'

export async function POST() {
  const res = new NextResponse(null, { status: 303, headers: { Location: '/' } })
  res.cookies.set(SESSION_COOKIE, '', { ...sessionCookieOptions(), maxAge: 0 })
  return res
}
```

`apps/order/src/app/api/revalidate-menu/route.ts`：

```ts
import { createRevalidateMenuHandler } from '@repo/menu/server'

export const POST = createRevalidateMenuHandler()
```

`apps/order/src/middleware.ts`：

```ts
import { createAuthMiddleware } from '@repo/auth/middleware'

export default createAuthMiddleware()

export const config = { matcher: ['/orders/:path*'] }
```

- [ ] **Step 6: 啟動並手動驗證**

這一步只驗證 order 本身（config-server 在 Task 9 才建立，所以 Menu 會使用備援資料）：

Run: `pnpm --filter @repo/order dev`，再另一個 terminal：

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" http://localhost:3000/orders
curl -s -c /tmp/oi-cookie -o /dev/null -w "%{http_code} %{redirect_url}\n" \
  -d "username=alice&password=alice123&next=/orders" http://localhost:3000/api/login
curl -s -b /tmp/oi-cookie -o /dev/null -w "%{http_code}\n" http://localhost:3000/orders/1001
curl -s -X POST -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/revalidate-menu
rm -f /tmp/oi-cookie
```

Expected（依序）：`200`；`307 http://localhost:3000/login?next=%2Forders`；`303 http://localhost:3000/orders`；`200`；`401`。dev server 的 log 會出現 `[menu] 改用備援 menu：fetch failed`（config-server 還沒有，這是預期的）。用瀏覽器打開 `http://localhost:3000`，確認 Menu、工具列（藍色）與樣式正常。完成後停掉 dev server。

- [ ] **Step 7: 確認 build 與型別檢查通過**

Run: `pnpm --filter @repo/order build && pnpm --filter @repo/order typecheck`
Expected: build 成功，log 有 `[order] rewrites → invoice=http://localhost:3001`；`tsc` 沒有輸出。

- [ ] **Step 8: Checkpoint**

Run: `git status --short`，回報變更（不 commit）。

---

### Task 8: `apps/invoice`，並驗證跨 zone 整合

**Files:**
- Create: `apps/invoice/package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `next-env.d.ts`, `.env.example`, `public/invoices-static/.gitkeep`
- Create: `apps/invoice/src/app/globals.css`, `layout.tsx`, `not-found.tsx`
- Create: `apps/invoice/src/app/invoices/page.tsx`, `invoices/[id]/page.tsx`, `invoices/api/revalidate-menu/route.ts`
- Create: `apps/invoice/src/middleware.ts`, `apps/invoice/src/data/invoices.ts`

**Interfaces:**
- Consumes: 與 Task 7 相同的共用套件。
- Produces: invoice 在 port 3001 提供 `/invoices`、`/invoices/[id]`、`POST /invoices/api/revalidate-menu`；所有回應帶 `x-zone: invoice`；靜態資源在 `/invoices-static/_next/*`。

- [ ] **Step 1: 建立 app 設定**

`apps/invoice/package.json`：

```json
{
  "name": "@repo/invoice",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3001",
    "build": "next build",
    "start": "next start -p 3001",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@repo/auth": "workspace:*",
    "@repo/menu": "workspace:*",
    "@repo/ui": "workspace:*",
    "@repo/zone-inspector": "workspace:*",
    "next": "15.5.28",
    "react": "19.3.1",
    "react-dom": "19.3.1"
  },
  "devDependencies": {
    "@repo/tsconfig": "workspace:*",
    "@tailwindcss/postcss": "4.3.5",
    "tailwindcss": "4.3.5"
  }
}
```

`apps/invoice/tsconfig.json`、`apps/invoice/next-env.d.ts`、`apps/invoice/postcss.config.mjs`：內容與 Task 7 Step 1 的 order 版本**逐字相同**（以下重複列出）。

```json
{
  "extends": "@repo/tsconfig/nextjs.json",
  "compilerOptions": {
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "src/**/*.ts", "src/**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

```ts
/// <reference types="next" />
/// <reference types="next/image-types/global" />

// NOTE: This file should not be edited
// see https://nextjs.org/docs/app/api-reference/config/typescript for more information.
```

```js
export default { plugins: { '@tailwindcss/postcss': {} } }
```

`apps/invoice/next.config.ts`：

```ts
import path from 'node:path'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // 依 Next 官方 Multi-Zones 文件：zone 用 assetPrefix（不是 basePath），頁面直接放在 app/invoices/。
  assetPrefix: '/invoices-static',
  output: process.env.BUILD_STANDALONE === '1' ? 'standalone' : undefined,
  outputFileTracingRoot: path.resolve(process.cwd(), '../..'),
  transpilePackages: ['@repo/ui', '@repo/menu', '@repo/auth', '@repo/zone-inspector'],
  eslint: { ignoreDuringBuilds: true },
  async headers() {
    // 經 order 轉發時原樣傳回，用來判斷「是誰回應的」
    return [{ source: '/:path*', headers: [{ key: 'x-zone', value: 'invoice' }] }]
  },
}

export default nextConfig
```

`apps/invoice/.env.example`：

```
# 本機開發用。以下 secret 只供 demo，不得用於正式環境（必須與 order 相同）。
MENU_CONFIG_URL=http://localhost:4000/menu.json
MENU_RUNTIME_URL=http://localhost:4000/assets/menu-runtime.js
AUTH_SECRET=demo-only-auth-secret-change-me-0123456789
REVALIDATE_TOKEN=demo-only-revalidate-token
```

建立空檔 `apps/invoice/public/invoices-static/.gitkeep`。

Run: `pnpm install && node scripts/bootstrap.mjs`
Expected: 印出「已建立 apps/invoice/.env.local」。

- [ ] **Step 2: 建立資料**

`apps/invoice/src/data/invoices.ts`：

```ts
export type InvoiceStatus = 'issued' | 'paid'

export type Invoice = {
  id: string
  orderId: string
  buyer: string
  issuedAt: string
  amount: number
  status: InvoiceStatus
}

export const invoices: Invoice[] = [
  { id: 'INV-1001', orderId: '1001', buyer: '王小明', issuedAt: '2026-11-01T18:00:00+08:00', amount: 3900, status: 'paid' },
  { id: 'INV-1002', orderId: '1002', buyer: '陳美玲', issuedAt: '2026-11-03T18:00:00+08:00', amount: 8900, status: 'paid' },
  { id: 'INV-1003', orderId: '1003', buyer: '林志豪', issuedAt: '2026-11-08T18:00:00+08:00', amount: 3360, status: 'issued' },
  { id: 'INV-1004', orderId: '1004', buyer: '張雅婷', issuedAt: '2026-11-12T18:00:00+08:00', amount: 6990, status: 'paid' },
]

export function findInvoice(id: string): Invoice | undefined {
  return invoices.find((i) => i.id === id)
}

export const statusLabel: Record<InvoiceStatus, { text: string; tone: 'info' | 'success' }> = {
  issued: { text: '已開立', tone: 'info' },
  paid: { text: '已收款', tone: 'success' },
}
```

- [ ] **Step 3: 建立 layout、樣式、頁面**

`apps/invoice/src/app/globals.css`：

```css
@import "tailwindcss";
@import "@repo/ui/theme.css";

/* 讓共用套件裡用到的 class 也被產生（路徑相對於本檔案） */
@source "../../../../packages";

@theme {
  --color-zone: #16a34a;
}
```

`apps/invoice/src/app/layout.tsx`：

```tsx
import { getCurrentUser } from '@repo/auth/server'
import { MENU_MODE_COOKIE, parseMenuMode, RuntimeMenuHost, SiteMenu } from '@repo/menu'
import { getMenu } from '@repo/menu/server'
import { ZoneInspector } from '@repo/zone-inspector'
import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import type { ReactNode } from 'react'
import './globals.css'

export const metadata: Metadata = { title: 'Invoice｜Order × Invoice Demo' }

export default async function RootLayout({ children }: { children: ReactNode }) {
  const [user, cookieStore] = await Promise.all([getCurrentUser(), cookies()])
  const menuMode = parseMenuMode(cookieStore.get(MENU_MODE_COOKIE)?.value)
  const menu = menuMode === 'build' ? await getMenu() : null

  return (
    <html lang="zh-Hant">
      <body className="min-h-screen bg-slate-50 pb-20 font-sans text-slate-900">
        <header>
          {menu ? (
            <SiteMenu menu={menu} currentZone="invoice" user={user} />
          ) : (
            <RuntimeMenuHost runtimeUrl={process.env.MENU_RUNTIME_URL ?? ''} currentZone="invoice" user={user} />
          )}
        </header>
        <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
        <ZoneInspector zone="invoice" menuMode={menuMode} menuSource={menu?.source ?? 'runtime'} />
      </body>
    </html>
  )
}
```

`apps/invoice/src/app/not-found.tsx`：

```tsx
import { PageHeader } from '@repo/ui'

export default function NotFound() {
  return <PageHeader title="找不到發票" description="這張發票不存在。" />
}
```

`apps/invoice/src/app/invoices/page.tsx`：

```tsx
import { ZoneLink } from '@repo/menu'
import { Badge, formatCurrency, formatDate, PageHeader, Table } from '@repo/ui'
import { invoices, statusLabel, type Invoice } from '@/data/invoices'

export default function InvoicesPage() {
  return (
    <>
      <PageHeader title="發票" description="由 invoice zone 提供（port 3001，經 order 轉發）。" />
      <Table<Invoice>
        rows={invoices}
        rowKey={(i) => i.id}
        columns={[
          {
            key: 'id',
            header: '發票號碼',
            render: (i) => (
              <ZoneLink href={`/invoices/${i.id}`} currentZone="invoice" className="font-medium text-zone underline">
                {i.id}
              </ZoneLink>
            ),
          },
          { key: 'buyer', header: '買受人', render: (i) => i.buyer },
          { key: 'date', header: '開立日期', render: (i) => formatDate(i.issuedAt) },
          { key: 'amount', header: '金額', render: (i) => formatCurrency(i.amount), className: 'text-right' },
          { key: 'status', header: '狀態', render: (i) => <Badge tone={statusLabel[i.status].tone}>{statusLabel[i.status].text}</Badge> },
        ]}
      />
    </>
  )
}
```

`apps/invoice/src/app/invoices/[id]/page.tsx`：

```tsx
import { ZoneLink } from '@repo/menu'
import { Badge, buttonClassName, Card, formatCurrency, formatDate, PageHeader } from '@repo/ui'
import { notFound } from 'next/navigation'
import { findInvoice, statusLabel } from '@/data/invoices'

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const invoice = findInvoice(id)
  if (!invoice) notFound()

  return (
    <>
      <PageHeader
        title={`發票 ${invoice.id}`}
        description={`${invoice.buyer}・${formatDate(invoice.issuedAt)}`}
        actions={
          <>
            <ZoneLink href="/invoices" currentZone="invoice" className={buttonClassName('secondary')}>
              回到列表
            </ZoneLink>
            <ZoneLink href={`/orders/${invoice.orderId}`} currentZone="invoice" className={buttonClassName('primary')}>
              回到訂單
            </ZoneLink>
          </>
        }
      />
      <Card title="發票資訊">
        <dl className="grid grid-cols-[8rem_1fr] gap-y-2 text-sm">
          <dt className="text-slate-500">對應訂單</dt>
          <dd>{invoice.orderId}</dd>
          <dt className="text-slate-500">金額</dt>
          <dd className="font-semibold">{formatCurrency(invoice.amount)}</dd>
          <dt className="text-slate-500">狀態</dt>
          <dd>
            <Badge tone={statusLabel[invoice.status].tone}>{statusLabel[invoice.status].text}</Badge>
          </dd>
        </dl>
      </Card>
    </>
  )
}
```

- [ ] **Step 4: 建立 revalidate API 與 middleware**

`apps/invoice/src/app/invoices/api/revalidate-menu/route.ts`：

```ts
import { createRevalidateMenuHandler } from '@repo/menu/server'

export const POST = createRevalidateMenuHandler()
```

`apps/invoice/src/middleware.ts`：

```ts
import { createAuthMiddleware } from '@repo/auth/middleware'

export default createAuthMiddleware()

// 保護 /invoices 與 /invoices/*，但排除 /invoices/api/*（revalidate API 用 token 保護）
export const config = { matcher: ['/invoices', '/invoices/((?!api/).*)'] }
```

- [ ] **Step 5: 同時啟動兩個 app 驗證跨 zone**

Run（兩個 terminal）：`pnpm --filter @repo/order dev`、`pnpm --filter @repo/invoice dev`，再執行：

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3001/
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" http://localhost:3000/invoices/INV-1001
curl -s -c /tmp/oi-cookie -o /dev/null -d "username=alice&password=alice123&next=/invoices/INV-1001" http://localhost:3000/api/login
curl -s -b /tmp/oi-cookie -D - -o /tmp/oi-page.html http://localhost:3000/invoices/INV-1001 | grep -i -E "^HTTP|^x-zone"
grep -o 'src="[^"]*_next[^"]*"' /tmp/oi-page.html | head -3
curl -s -o /dev/null -w "%{http_code}\n" -X POST -H "Authorization: Bearer demo-only-revalidate-token" http://localhost:3000/invoices/api/revalidate-menu
rm -f /tmp/oi-cookie /tmp/oi-page.html
```

Expected（依序）：
1. `404`（invoice 不負責 `/`）
2. `307 http://localhost:3000/login?next=%2Finvoices%2FINV-1001`（**網址必須是 3000 而不是 3001**，驗證 `publicUrl` 生效）
3. （無輸出）
4. `HTTP/1.1 200 OK` 與 `x-zone: invoice`
5. 三行 `src="/invoices-static/_next/static/..."`
6. `200`

再用瀏覽器開 `http://localhost:3000`：登入 → 訂單 → 1001 → 查看發票，確認跳到 invoice 時是整頁載入（工具列變綠、soft navigation 次數歸零），invoice 的 Menu 顯示 Alice；在 invoice 按「登出」回到 order 首頁。完成後停掉兩個 dev server。

- [ ] **Step 6: 確認 build 與型別檢查通過**

Run: `pnpm --filter @repo/invoice build && pnpm --filter @repo/invoice typecheck`
Expected: 成功；`tsc` 沒有輸出。

- [ ] **Step 7: Checkpoint**

Run: `git status --short`，回報變更（不 commit）。

---

### Task 9: `services/config-server`

**Files:**
- Create: `services/config-server/package.json`, `src/handler.mjs`, `src/index.mjs`, `vitest.config.mjs`
- Test: `services/config-server/src/handler.test.mjs`

**Interfaces:**
- Produces: `createHandler({ menuFile: string, runtimeDir: string, corsOrigin: string }): (req, res) => Promise<void>`；HTTP 介面依 spec §9：`GET /menu.json`、`GET /assets/menu-runtime.js`、`GET /health`、`OPTIONS *`。

- [ ] **Step 1: 建立套件設定**

`services/config-server/package.json`：

```json
{
  "name": "@repo/config-server",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "node --watch src/index.mjs",
    "start": "node src/index.mjs",
    "test": "vitest run"
  },
  "dependencies": {
    "@repo/menu-runtime": "workspace:*"
  }
}
```

（`@repo/menu-runtime` 在 Task 10 建立。這個依賴讓 Turborepo 在 menu-runtime 改動時判定 config-server 受影響，也讓 `turbo build --filter=@repo/config-server` 先 build menu-runtime。Task 10 建立前先不要執行 `pnpm install`。）

`services/config-server/vitest.config.mjs`：

```js
import { defineConfig } from 'vitest/config'

export default defineConfig({ test: { environment: 'node' } })
```

- [ ] **Step 2: 寫失敗測試**

`services/config-server/src/handler.test.mjs`：

```js
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createHandler } from './handler.mjs'

let dir
let server
let base

beforeAll(async () => {
  dir = await mkdtemp(path.join(tmpdir(), 'config-server-'))
  await writeFile(path.join(dir, 'menu.json'), '{"version":1}')
  await mkdir(path.join(dir, 'runtime'))
  await writeFile(path.join(dir, 'runtime', 'menu-runtime.js'), 'export {}')
  server = createServer(createHandler({ menuFile: path.join(dir, 'menu.json'), runtimeDir: path.join(dir, 'runtime'), corsOrigin: '*' }))
  await new Promise((resolve) => server.listen(0, resolve))
  base = `http://127.0.0.1:${server.address().port}`
})

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve))
  await rm(dir, { recursive: true, force: true })
})

describe('config-server', () => {
  it('GET /menu.json 回傳檔案內容、不快取、帶 CORS', async () => {
    const res = await fetch(`${base}/menu.json`)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('application/json')
    expect(res.headers.get('cache-control')).toBe('no-store')
    expect(res.headers.get('access-control-allow-origin')).toBe('*')
    expect(await res.text()).toBe('{"version":1}')
  })

  it('每次請求都重新讀檔（改檔案不用重啟）', async () => {
    await writeFile(path.join(dir, 'menu.json'), '{"version":1,"changed":true}')
    const res = await fetch(`${base}/menu.json`)
    expect(await res.text()).toContain('changed')
  })

  it('GET /assets/menu-runtime.js 回傳 JavaScript', async () => {
    const res = await fetch(`${base}/assets/menu-runtime.js`)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/javascript')
    expect(res.headers.get('access-control-allow-origin')).toBe('*')
  })

  it('GET /health 回 200', async () => {
    expect((await fetch(`${base}/health`)).status).toBe(200)
  })

  it('OPTIONS 回 204 並帶 CORS', async () => {
    const res = await fetch(`${base}/menu.json`, { method: 'OPTIONS' })
    expect(res.status).toBe(204)
    expect(res.headers.get('access-control-allow-methods')).toContain('GET')
  })

  it.each(['/nope', '/assets/other.js', '/assets/%2e%2e/menu.json', '/..%2fmenu.json'])('%s 回 4xx', async (p) => {
    const res = await fetch(`${base}${p}`)
    expect(res.status).toBeGreaterThanOrEqual(400)
    expect(res.status).toBeLessThan(500)
  })

  it('POST 回 405', async () => {
    expect((await fetch(`${base}/menu.json`, { method: 'POST' })).status).toBe(405)
  })

  it('檔案不存在時回 404', async () => {
    const s = createServer(createHandler({ menuFile: path.join(dir, 'missing.json'), runtimeDir: dir, corsOrigin: '*' }))
    await new Promise((resolve) => s.listen(0, resolve))
    const res = await fetch(`http://127.0.0.1:${s.address().port}/menu.json`)
    await new Promise((resolve) => s.close(resolve))
    expect(res.status).toBe(404)
  })
})
```

- [ ] **Step 3: 確認測試失敗**

Run: `pnpm --filter @repo/config-server exec vitest run`（Task 10 前尚未 `pnpm install` 這個套件時，改用 `cd services/config-server && ../../node_modules/.bin/vitest run`）
Expected: FAIL，找不到 `./handler.mjs`。

- [ ] **Step 4: 實作 `handler.mjs` 與 `index.mjs`**

`services/config-server/src/handler.mjs`：

```js
import { readFile } from 'node:fs/promises'
import path from 'node:path'

/**
 * 模擬 Azure Blob / CDN：提供 menu.json 與 runtime menu 的 JS。
 * @param {{ menuFile: string, runtimeDir: string, corsOrigin: string }} options
 */
export function createHandler({ menuFile, runtimeDir, corsOrigin }) {
  const routes = {
    '/menu.json': { file: () => menuFile, type: 'application/json; charset=utf-8', cache: 'no-store' },
    '/assets/menu-runtime.js': { file: () => path.join(runtimeDir, 'menu-runtime.js'), type: 'text/javascript; charset=utf-8', cache: 'no-cache' },
  }

  return async function handler(req, res) {
    const cors = { 'Access-Control-Allow-Origin': corsOrigin }
    const send = (status, headers = {}, body) => {
      res.writeHead(status, { ...cors, ...headers })
      res.end(body)
    }

    let pathname
    try {
      pathname = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname)
    } catch {
      return send(400)
    }
    if (pathname.includes('..')) return send(400)

    if (req.method === 'OPTIONS') return send(204, { 'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS' })
    if (req.method !== 'GET' && req.method !== 'HEAD') return send(405)
    if (pathname === '/health') return send(200, { 'Content-Type': 'text/plain; charset=utf-8' }, 'ok')

    const route = routes[pathname]
    if (!route) return send(404)
    try {
      const body = await readFile(route.file())
      return send(200, { 'Content-Type': route.type, 'Cache-Control': route.cache }, body)
    } catch (err) {
      if (err && err.code === 'ENOENT') return send(404)
      console.error('[config-server]', err)
      return send(500)
    }
  }
}
```

`services/config-server/src/index.mjs`：

```js
import { createServer } from 'node:http'
import path from 'node:path'
import { createHandler } from './handler.mjs'

const root = path.resolve(import.meta.dirname, '../../..')
const port = Number(process.env.PORT ?? 4000)
const menuFile = process.env.MENU_FILE ?? path.join(root, 'deploy/menu.json')
const runtimeDir = process.env.RUNTIME_DIR ?? path.join(root, 'packages/menu-runtime/dist')
const corsOrigin = process.env.CORS_ORIGIN ?? '*'

createServer(createHandler({ menuFile, runtimeDir, corsOrigin })).listen(port, () => {
  console.log(`[config-server] http://localhost:${port}  menu=${menuFile}  runtime=${runtimeDir}`)
})
```

- [ ] **Step 5: 確認測試通過**

Run: 同 Step 3 的指令。
Expected: PASS。

- [ ] **Step 6: Checkpoint**

Run: `git status --short`，回報變更（不 commit）。

---

### Task 10: `@repo/menu-runtime`（runtime Menu 對照組）與完整本機開發

**Files:**
- Create: `packages/menu-runtime/package.json`, `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`
- Create: `packages/menu-runtime/src/vite-env.d.ts`, `items.ts`, `RuntimeMenu.tsx`, `styles.css`, `index.tsx`
- Test: `packages/menu-runtime/src/items.test.ts`
- Create: `README.md`（本機開發段落）

**Interfaces:**
- Consumes: 不依賴任何 workspace 套件（刻意獨立：模擬另一個團隊、另一條部署線）。`RuntimeMenuElement` 的 property 合約見 Task 5。
- Produces: `dist/menu-runtime.js`（ESM），註冊 `<runtime-site-menu>`；`parseItems(data: unknown): RuntimeItem[]`、`isActive(pathname: string, href: string): boolean`。Shadow DOM 內的根元素為 `<nav aria-label="主選單" data-menu="runtime-element">`。

- [ ] **Step 1: 建立套件設定**

`packages/menu-runtime/package.json`：

```json
{
  "name": "@repo/menu-runtime",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "files": ["dist"],
  "scripts": {
    "build": "vite build",
    "dev": "vite build --watch",
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "react": "19.3.1",
    "react-dom": "19.3.1"
  },
  "devDependencies": {
    "@repo/tsconfig": "workspace:*"
  }
}
```

`packages/menu-runtime/tsconfig.json`：

```json
{
  "extends": "@repo/tsconfig/react-library.json",
  "include": ["src", "vite.config.ts"]
}
```

`packages/menu-runtime/vite.config.ts`：

```ts
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  // library mode 不會替換 process.env.NODE_ENV，React 需要它
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  build: {
    lib: { entry: 'src/index.tsx', formats: ['es'], fileName: () => 'menu-runtime.js' },
    outDir: 'dist',
    emptyOutDir: true,
  },
})
```

`packages/menu-runtime/vitest.config.ts`：

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({ test: { environment: 'node' } })
```

`packages/menu-runtime/src/vite-env.d.ts`：

```ts
/// <reference types="vite/client" />
```

Run: `pnpm install`
Expected: 成功（config-server 對 menu-runtime 的 workspace 依賴此時才能解析）。

- [ ] **Step 2: 寫失敗測試**

`packages/menu-runtime/src/items.test.ts`：

```ts
import { describe, expect, it } from 'vitest'
import { isActive, parseItems } from './items'

describe('parseItems', () => {
  it('取出合法項目，丟掉不合法的', () => {
    const data = {
      version: 1,
      items: [
        { label: '首頁', href: '/' },
        { label: '壞的', href: 'https://evil.com' },
        { label: '', href: '/x' },
        { label: '訂單', href: '/orders', children: [{ label: '全部', href: '/orders' }, { label: 'x', href: '//evil' }] },
      ],
    }
    expect(parseItems(data)).toEqual([
      { label: '首頁', href: '/' },
      { label: '訂單', href: '/orders', children: [{ label: '全部', href: '/orders' }] },
    ])
  })

  it.each([null, undefined, 1, 'x', {}, { items: 'x' }])('格式不對（%s）時回傳空陣列', (data) => {
    expect(parseItems(data)).toEqual([])
  })
})

describe('isActive', () => {
  it('與 build-time Menu 規則相同', () => {
    expect(isActive('/', '/')).toBe(true)
    expect(isActive('/orders', '/')).toBe(false)
    expect(isActive('/orders/1001', '/orders')).toBe(true)
    expect(isActive('/ordersX', '/orders')).toBe(false)
  })
})
```

- [ ] **Step 3: 確認測試失敗**

Run: `pnpm --filter @repo/menu-runtime test`
Expected: FAIL，找不到 `./items`。

- [ ] **Step 4: 實作 `items.ts`、`RuntimeMenu.tsx`、`styles.css`、`index.tsx`**

`packages/menu-runtime/src/items.ts`：

```ts
// 刻意不 import @repo/menu：runtime Menu 是獨立打包、獨立部署的產物。
export type RuntimeItem = { label: string; href: string; children?: RuntimeItem[] }

function isInternal(href: unknown): href is string {
  return typeof href === 'string' && href.startsWith('/') && !href.startsWith('//') && !href.includes('\\')
}

export function parseItems(data: unknown): RuntimeItem[] {
  const items = (data as { items?: unknown } | null | undefined)?.items
  if (!Array.isArray(items)) return []
  return items.flatMap((raw): RuntimeItem[] => {
    const item = raw as { label?: unknown; href?: unknown; children?: unknown }
    if (typeof item?.label !== 'string' || item.label === '' || !isInternal(item.href)) return []
    const children = Array.isArray(item.children) ? parseItems({ items: item.children }) : []
    return [{ label: item.label, href: item.href, ...(children.length ? { children } : {}) }]
  })
}

export function isActive(pathname: string, href: string): boolean {
  const target = href.split(/[?#]/, 1)[0] || '/'
  if (target === '/') return pathname === '/'
  return pathname === target || pathname.startsWith(`${target}/`)
}
```

`packages/menu-runtime/src/RuntimeMenu.tsx`：

```tsx
import { useEffect, useState, type MouseEvent } from 'react'
import { isActive, parseItems, type RuntimeItem } from './items'

export type RuntimeMenuProps = {
  menuUrl: string
  pathname?: string
  user?: { name: string } | null
  navigate?: (href: string) => void
}

export function RuntimeMenu({ menuUrl, pathname = '/', user = null, navigate }: RuntimeMenuProps) {
  const [items, setItems] = useState<RuntimeItem[] | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch(menuUrl)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((data) => !cancelled && setItems(parseItems(data)))
      .catch(() => !cancelled && setFailed(true))
    return () => {
      cancelled = true
    }
  }, [menuUrl])

  function onClick(event: MouseEvent<HTMLAnchorElement>, href: string) {
    if (!navigate || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    navigate(href)
  }

  const link = (item: RuntimeItem) => (
    <a
      href={item.href}
      className={isActive(pathname, item.href) ? 'link active' : 'link'}
      aria-current={isActive(pathname, item.href) ? 'page' : undefined}
      onClick={(e) => onClick(e, item.href)}
    >
      {item.label}
    </a>
  )

  return (
    <nav aria-label="主選單" data-menu="runtime-element" className="menu">
      <span className="brand">Order × Invoice</span>
      <span className="tag">runtime</span>
      <ul className="items">
        {failed ? <li className="error">無法讀取 menu.json</li> : null}
        {items?.map((item) => (
          <li key={item.href}>{link(item)}</li>
        ))}
      </ul>
      <div className="user">
        {user ? (
          <>
            <span>{user.name}</span>
            <form method="post" action="/api/logout">
              <button type="submit" className="button">登出</button>
            </form>
          </>
        ) : (
          <a href="/login" className="button" onClick={(e) => onClick(e, '/login')}>
            登入
          </a>
        )}
      </div>
    </nav>
  )
}
```

`packages/menu-runtime/src/styles.css`：

```css
:host { display: block; font-family: ui-sans-serif, system-ui, -apple-system, "PingFang TC", "Noto Sans TC", sans-serif; }
.menu { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; padding: 12px 16px; background: #fefce8; border-bottom: 2px dashed #ca8a04; color: #1e293b; }
.brand { font-weight: 600; }
.tag { font-size: 11px; padding: 2px 8px; border-radius: 999px; background: #ca8a04; color: #fff; }
.items { display: flex; flex: 1; flex-wrap: wrap; gap: 4px; margin: 0; padding: 0; list-style: none; }
.link { display: inline-block; padding: 6px 12px; border-radius: 6px; color: #475569; font-size: 14px; text-decoration: none; }
.link:hover { background: #fef9c3; color: #0f172a; }
.link.active { background: #fde68a; color: #0f172a; font-weight: 600; }
.user { display: flex; align-items: center; gap: 12px; font-size: 14px; }
.user form { margin: 0; }
.button { font: inherit; padding: 4px 12px; border: 1px solid currentColor; border-radius: 6px; background: transparent; color: inherit; cursor: pointer; text-decoration: none; }
.error { color: #b91c1c; font-size: 14px; }
```

`packages/menu-runtime/src/index.tsx`：

```tsx
import { createRoot, type Root } from 'react-dom/client'
import { RuntimeMenu, type RuntimeMenuProps } from './RuntimeMenu'
import css from './styles.css?inline'

type Zone = 'order' | 'invoice'
type HostProps = Omit<RuntimeMenuProps, 'menuUrl'> & { currentZone?: Zone }

// menu.json 與本檔案放在同一個 CDN：/assets/menu-runtime.js → /menu.json
const MENU_URL = new URL('../menu.json', import.meta.url).toString()

class RuntimeSiteMenuElement extends HTMLElement {
  #root: Root | null = null
  #props: HostProps = {}
  #scheduled = false

  connectedCallback() {
    const shadow = this.shadowRoot ?? this.attachShadow({ mode: 'open' })
    const style = document.createElement('style')
    style.textContent = css
    const mount = document.createElement('div')
    shadow.replaceChildren(style, mount)
    this.#root = createRoot(mount)
    this.#render()
  }

  disconnectedCallback() {
    const root = this.#root
    this.#root = null
    // 延後 unmount，避免在 host React commit 期間同步卸載另一個 root
    queueMicrotask(() => root?.unmount())
  }

  get currentZone() { return this.#props.currentZone }
  set currentZone(value) { this.#set({ currentZone: value }) }
  get pathname() { return this.#props.pathname }
  set pathname(value) { this.#set({ pathname: value }) }
  get user() { return this.#props.user }
  set user(value) { this.#set({ user: value }) }
  get navigate() { return this.#props.navigate }
  set navigate(value) { this.#set({ navigate: value }) }

  #set(patch: HostProps) {
    this.#props = { ...this.#props, ...patch }
    if (this.#scheduled) return
    this.#scheduled = true
    queueMicrotask(() => {
      this.#scheduled = false
      this.#render()
    })
  }

  #render() {
    const { currentZone: _zone, ...props } = this.#props
    this.#root?.render(<RuntimeMenu menuUrl={MENU_URL} {...props} />)
  }
}

if (!customElements.get('runtime-site-menu')) {
  customElements.define('runtime-site-menu', RuntimeSiteMenuElement)
}
```

- [ ] **Step 5: 確認測試、型別檢查、build 通過**

Run:

```bash
pnpm --filter @repo/menu-runtime test
pnpm --filter @repo/menu-runtime typecheck
pnpm --filter @repo/menu-runtime build
ls -la packages/menu-runtime/dist
pnpm --filter @repo/config-server test
```

Expected: 全部 PASS；`dist/menu-runtime.js` 存在（約 190 KB 未壓縮，含 React）。

- [ ] **Step 6: 用 `pnpm dev` 驗證完整本機環境**

Run: `pnpm dev`（turbo 同時啟動 order、invoice、config-server、menu-runtime watch），另一個 terminal：

```bash
curl -s http://localhost:4000/health
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:4000/assets/menu-runtime.js
curl -s http://localhost:3000/ | grep -o 'data-menu="build"' | head -1
```

Expected: `ok`；`200`；`data-menu="build"`（dev server log 不再出現「改用備援 menu」）。

瀏覽器手動驗證：
1. `http://localhost:3000` 底部工具列顯示「Menu：build-time（遠端 menu.json）」。
2. 修改 `deploy/menu.json`，把「發票」改成「發票管理」，執行 `curl -X POST -H "Authorization: Bearer demo-only-revalidate-token" http://localhost:3000/api/revalidate-menu`，重新整理 order 首頁 → 顯示「發票管理」。登入後進 invoice，先呼叫 `http://localhost:3000/invoices/api/revalidate-menu` 再重新整理 → 也顯示「發票管理」。**改回「發票」**並再呼叫兩個 revalidate API。
3. 按「切換成 runtime menu」→ 頁面重新整理後先看到灰色佔位框，再出現黃色虛線框的 runtime Menu（標籤 runtime）。在 order 內點「訂單」→ soft navigation 次數 +1；點「發票」→ 整頁載入到 invoice。
4. 按「切換成 build-time menu」切回。

- [ ] **Step 7: 撰寫 README 的本機開發段落**

`README.md`：

````markdown
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

編輯 `deploy/menu.json`，最多 60 秒後兩個 app 自動更新。要立即生效：

```bash
curl -X POST -H "Authorization: Bearer demo-only-revalidate-token" http://localhost:3000/api/revalidate-menu
curl -X POST -H "Authorization: Bearer demo-only-revalidate-token" http://localhost:3000/invoices/api/revalidate-menu
```

## 測試

```bash
pnpm test        # 單元測試（Vitest）
pnpm typecheck
pnpm e2e         # E2E（需先 pnpm dev）
```

`.env.example` 與 `docker-compose.yml` 裡的 secret 只供 demo，不得用於正式環境。
````

- [ ] **Step 8: 確認整個 monorepo 的測試與型別檢查通過**

Run: `pnpm test && pnpm typecheck`
Expected: 全部 PASS。

- [ ] **Step 9: Checkpoint**

Run: `git status --short`，回報變更（不 commit）。

---

### Task 11: E2E（Playwright，本機 dev）

**Files:**
- Create: `e2e/package.json`, `e2e/playwright.config.ts`, `e2e/tsconfig.json`
- Create: `e2e/tests/helpers.ts`, `navigation.spec.ts`, `auth.spec.ts`, `menu.spec.ts`, `runtime-menu.spec.ts`, `assets.spec.ts`, `config-down.spec.ts`

**Interfaces:**
- Consumes: Task 5–10 的 `data-*` 屬性與文字：`[data-testid="zone-inspector"]` 的 `data-zone`、`data-soft-nav-count`、`data-loaded-at`、`data-menu-source`；`nav[aria-label="主選單"]`；`[data-menu="runtime"][data-status]`；`runtime-site-menu`；按鈕「登入」「登出」「查看發票」；label「帳號」「密碼」。
- Produces: `pnpm e2e`（dev，`http://localhost:3000`）、`pnpm e2e:docker`（`http://localhost:8080`）。

- [ ] **Step 1: 建立套件與設定**

`e2e/package.json`：

```json
{
  "name": "@repo/e2e",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "e2e": "playwright test --grep-invert @measure",
    "e2e:docker": "E2E_TARGET=docker E2E_BASE_URL=http://localhost:8080 playwright test --grep-invert @measure",
    "measure": "E2E_TARGET=docker E2E_BASE_URL=http://localhost:8080 playwright test --grep @measure"
  },
  "devDependencies": {
    "@playwright/test": "1.65.1",
    "@repo/tsconfig": "workspace:*"
  }
}
```

（scripts 刻意不叫 `test`，避免 `turbo run test` 在沒有啟動 server 時執行 E2E。）

`e2e/tsconfig.json`：

```json
{
  "extends": "@repo/tsconfig/base.json",
  "include": ["**/*.ts"]
}
```

`e2e/playwright.config.ts`：

```ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  // 測試會改 menu.json 與 cookie，必須依序執行
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
```

Run:

```bash
pnpm install
pnpm --filter @repo/e2e exec playwright install chromium
```

- [ ] **Step 2: 建立共用 helpers**

`e2e/tests/helpers.ts`：

```ts
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { expect, type APIRequestContext, type BrowserContext, type Page } from '@playwright/test'

export const TARGET = process.env.E2E_TARGET === 'docker' ? 'docker' : 'dev'
export const TOKEN = process.env.E2E_REVALIDATE_TOKEN ?? 'demo-only-revalidate-token'
export const MENU_FILE = path.resolve(import.meta.dirname, '../../deploy/menu.json')

export const inspector = (page: Page) => page.getByTestId('zone-inspector')
export const mainNav = (page: Page) => page.getByRole('navigation', { name: '主選單' })

export async function login(page: Page, next = '/') {
  await page.goto(`/login?next=${encodeURIComponent(next)}`)
  await page.getByLabel('帳號').fill('alice')
  await page.getByLabel('密碼').fill('alice123')
  await page.getByRole('button', { name: '登入' }).click()
  await page.waitForURL((url) => url.pathname === next.split('?')[0])
}

/** 在 window 上做記號：soft navigation 後記號還在，整頁載入後會消失。 */
export async function markWindow(page: Page) {
  await page.evaluate(() => ((window as unknown as { __e2eMark: number }).__e2eMark = 1))
}

export async function windowMark(page: Page) {
  return page.evaluate(() => (window as unknown as { __e2eMark?: number }).__e2eMark ?? null)
}

export async function revalidateMenus(request: APIRequestContext) {
  for (const p of ['/api/revalidate-menu', '/invoices/api/revalidate-menu']) {
    const res = await request.post(p, { headers: { Authorization: `Bearer ${TOKEN}` } })
    expect(res.status(), p).toBe(200)
  }
}

export function readMenuFile(): string {
  return readFileSync(MENU_FILE, 'utf8')
}

export function writeMenuFile(content: string) {
  writeFileSync(MENU_FILE, content)
}

export async function setMenuMode(context: BrowserContext, baseURL: string, mode: 'build' | 'runtime') {
  await context.addCookies([{ name: 'menu-mode', value: mode, url: baseURL }])
}
```

- [ ] **Step 3: 寫導頁與登入的測試**

`e2e/tests/navigation.spec.ts`：

```ts
import { expect, test } from '@playwright/test'
import { inspector, login, markWindow, windowMark } from './helpers'

test.beforeEach(async ({ page }) => {
  await login(page, '/orders')
})

test('同 zone 內是 soft navigation：次數增加、載入時間不變、window 記號還在', async ({ page }) => {
  await expect(inspector(page)).toHaveAttribute('data-loaded-at', /\d+/)
  const loadedAt = await inspector(page).getAttribute('data-loaded-at')
  await markWindow(page)

  await page.getByRole('link', { name: '1001', exact: true }).click()
  await expect(page).toHaveURL(/\/orders\/1001$/)
  await expect(inspector(page)).toHaveAttribute('data-soft-nav-count', '1')
  await expect(inspector(page)).toHaveAttribute('data-loaded-at', loadedAt!)
  expect(await windowMark(page)).toBe(1)
})

test('跨 zone（order → invoice）是整頁載入：zone 變成 invoice、次數歸零、記號消失', async ({ page }) => {
  await page.goto('/orders/1001')
  await markWindow(page)
  await page.getByRole('link', { name: '查看發票' }).click()
  await expect(page).toHaveURL(/\/invoices\/INV-1001$/)
  await expect(inspector(page)).toHaveAttribute('data-zone', 'invoice')
  await expect(inspector(page)).toHaveAttribute('data-soft-nav-count', '0')
  expect(await windowMark(page)).toBeNull()
})

test('invoice 內也是 soft navigation，回到訂單是整頁載入', async ({ page }) => {
  await page.goto('/invoices')
  await markWindow(page)
  await page.getByRole('link', { name: 'INV-1002', exact: true }).click()
  await expect(page).toHaveURL(/\/invoices\/INV-1002$/)
  await expect(inspector(page)).toHaveAttribute('data-soft-nav-count', '1')
  expect(await windowMark(page)).toBe(1)

  await page.getByRole('link', { name: '回到訂單' }).click()
  await expect(page).toHaveURL(/\/orders\/1002$/)
  await expect(inspector(page)).toHaveAttribute('data-zone', 'order')
  expect(await windowMark(page)).toBeNull()
})
```

`e2e/tests/auth.spec.ts`：

```ts
import { expect, test } from '@playwright/test'
import { login, mainNav } from './helpers'

test('未登入進 invoice 會導到 order 的登入頁，登入後回到原本的發票', async ({ page }) => {
  await page.goto('/invoices/INV-1001')
  await expect(page).toHaveURL(/\/login\?next=%2Finvoices%2FINV-1001$/)
  await page.getByLabel('帳號').fill('alice')
  await page.getByLabel('密碼').fill('alice123')
  await page.getByRole('button', { name: '登入' }).click()
  await expect(page).toHaveURL(/\/invoices\/INV-1001$/)
  await expect(page.getByRole('heading', { name: '發票 INV-1001' })).toBeVisible()
})

test('密碼錯誤時留在登入頁並顯示錯誤', async ({ page }) => {
  await page.goto('/login?next=%2Forders')
  await page.getByLabel('帳號').fill('alice')
  await page.getByLabel('密碼').fill('wrong')
  await page.getByRole('button', { name: '登入' }).click()
  await expect(page).toHaveURL(/\/login\?error=1&next=%2Forders$/)
  await expect(page.getByRole('alert')).toHaveText('帳號或密碼錯誤')
})

test('在 order 登入，invoice 也是登入狀態；在 invoice 登出，order 也登出', async ({ page }) => {
  await login(page, '/orders')
  await page.goto('/invoices')
  await expect(mainNav(page).getByText('Alice')).toBeVisible()

  await mainNav(page).getByRole('button', { name: '登出' }).click()
  await expect(page).toHaveURL(/\/$/)
  await page.goto('/orders')
  await expect(page).toHaveURL(/\/login\?next=%2Forders$/)
})

test('next 參數不能導到外部網站', async ({ page }) => {
  await page.goto('/login?next=%2F%2Fevil.example.com')
  await page.getByLabel('帳號').fill('alice')
  await page.getByLabel('密碼').fill('alice123')
  await page.getByRole('button', { name: '登入' }).click()
  await expect(page).toHaveURL((url) => url.pathname === '/' && !url.host.includes('evil'))
})
```

- [ ] **Step 4: 寫 Menu 相關測試**

`e2e/tests/menu.spec.ts`：

```ts
import { expect, test } from '@playwright/test'
import { inspector, login, mainNav, readMenuFile, revalidateMenus, writeMenuFile } from './helpers'

let original: string

test.beforeAll(() => {
  original = readMenuFile()
})

test.afterAll(async ({ request }) => {
  writeMenuFile(original)
  await revalidateMenus(request)
})

test('改 menu.json 並 revalidate 後，兩個 zone 的 Menu 都更新（不用重新部署）', async ({ page, request }) => {
  const menu = JSON.parse(original)
  menu.items.push({ label: 'E2E 測試項目', href: '/orders?e2e=1' })
  writeMenuFile(JSON.stringify(menu, null, 2))
  await revalidateMenus(request)

  await login(page, '/orders')
  await expect(mainNav(page).getByRole('link', { name: 'E2E 測試項目' })).toBeVisible()
  await expect(inspector(page)).toHaveAttribute('data-menu-source', 'remote')

  await page.goto('/invoices')
  await expect(mainNav(page).getByRole('link', { name: 'E2E 測試項目' })).toBeVisible()
})

test('打開 menuV2 flag 後，兩個 zone 同時切換成 V2 樣式', async ({ page, request }) => {
  const menu = JSON.parse(original)
  menu.flags = { menuV2: true }
  writeMenuFile(JSON.stringify(menu, null, 2))
  await revalidateMenus(request)

  await login(page, '/orders')
  await expect(mainNav(page)).toHaveAttribute('data-menu-variant', 'v2')
  await page.goto('/invoices')
  await expect(mainNav(page)).toHaveAttribute('data-menu-variant', 'v2')
})
```

`e2e/tests/runtime-menu.spec.ts`：

```ts
import { expect, test } from '@playwright/test'
import { inspector, login, markWindow, setMenuMode, windowMark } from './helpers'

test('runtime Menu：由 Web Component 渲染，同 zone 仍可 soft navigation，跨 zone 整頁載入', async ({ page, context, baseURL }) => {
  await setMenuMode(context, baseURL!, 'runtime')
  await login(page, '/orders')

  const host = page.locator('[data-menu="runtime"]')
  await expect(host).toHaveAttribute('data-status', 'ready')
  const runtimeNav = page.locator('runtime-site-menu').getByRole('navigation', { name: '主選單' })
  await expect(runtimeNav).toBeVisible()
  await expect(inspector(page)).toHaveAttribute('data-menu-source', 'runtime')

  await markWindow(page)
  await runtimeNav.getByRole('link', { name: '首頁' }).click()
  await expect(page).toHaveURL(/\/$/)
  await expect(inspector(page)).toHaveAttribute('data-soft-nav-count', '1')
  expect(await windowMark(page)).toBe(1)

  await runtimeNav.getByRole('link', { name: '發票' }).click()
  await expect(page).toHaveURL(/\/invoices$/)
  await expect(inspector(page)).toHaveAttribute('data-zone', 'invoice')
  expect(await windowMark(page)).toBeNull()
})

test('runtime Menu 沒有 SSR：HTML 原始碼裡沒有 Menu 的連結', async ({ request, context, baseURL }) => {
  await setMenuMode(context, baseURL!, 'runtime')
  const res = await request.get('/', { headers: { cookie: 'menu-mode=runtime' } })
  const html = await res.text()
  expect(html).toContain('data-menu="runtime"')
  expect(html).not.toContain('data-menu="build"')

  const build = await (await request.get('/', { headers: { cookie: 'menu-mode=build' } })).text()
  expect(build).toContain('data-menu="build"')
})
```

- [ ] **Step 5: 寫靜態資源與 config-server 故障的測試**

`e2e/tests/assets.spec.ts`：

```ts
import { expect, test } from '@playwright/test'
import { login } from './helpers'

test('invoice 的頁面與靜態資源都由 invoice 回應，路徑以 /invoices-static/ 開頭', async ({ page, request }) => {
  await login(page, '/invoices/INV-1001')
  const pageRes = await page.request.get('/invoices/INV-1001')
  expect(pageRes.headers()['x-zone']).toBe('invoice')

  const srcs = await page.locator('script[src]').evaluateAll((els) => els.map((e) => e.getAttribute('src')!))
  const nextScripts = srcs.filter((s) => s.includes('/_next/'))
  expect(nextScripts.length).toBeGreaterThan(0)
  for (const src of nextScripts) {
    expect(src.startsWith('/invoices-static/_next/')).toBe(true)
    const res = await request.get(src)
    expect(res.status(), src).toBe(200)
    expect(res.headers()['x-zone'], src).toBe('invoice')
  }
})

test('order 的靜態資源沒有 x-zone（由 order 自己回應）', async ({ page, request }) => {
  await page.goto('/')
  const src = await page.locator('script[src*="/_next/"]').first().getAttribute('src')
  expect(src!.startsWith('/_next/')).toBe(true)
  const res = await request.get(src!)
  expect(res.status()).toBe(200)
  expect(res.headers()['x-zone']).toBeUndefined()
})
```

`e2e/tests/config-down.spec.ts`：

```ts
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { expect, test } from '@playwright/test'
import { inspector, login, mainNav, revalidateMenus, setMenuMode, TARGET } from './helpers'

const ROOT = path.resolve(import.meta.dirname, '../..')
const compose = (...args: string[]) => execFileSync('docker', ['compose', ...args], { cwd: ROOT, stdio: 'inherit' })

test.describe('config-server 故障', () => {
  test.skip(TARGET !== 'docker', '只在 Docker 環境執行（需要能停掉 config-server 容器）')

  test.beforeAll(() => compose('stop', 'config-server'))
  test.afterAll(async ({ request }) => {
    compose('start', 'config-server')
    await new Promise((r) => setTimeout(r, 2000))
    await revalidateMenus(request)
  })

  test('build-time Menu 改用備援資料，畫面不壞', async ({ page, request }) => {
    await revalidateMenus(request)
    await login(page, '/orders')
    await expect(mainNav(page)).toHaveAttribute('data-menu', 'build')
    await expect(mainNav(page).getByRole('link', { name: '訂單' })).toBeVisible()
    await expect(inspector(page)).toHaveAttribute('data-menu-source', 'fallback')
  })

  test('runtime Menu 無法載入，只剩錯誤提示', async ({ page, context, baseURL }) => {
    await setMenuMode(context, baseURL!, 'runtime')
    await login(page, '/orders')
    await expect(page.locator('[data-menu="runtime"]')).toHaveAttribute('data-status', 'error')
    await expect(page.getByRole('alert')).toContainText('選單載入失敗')
  })
})
```

- [ ] **Step 6: 執行 E2E（dev）**

Run: 一個 terminal `pnpm dev`，另一個 terminal `pnpm e2e`
Expected: 全部 PASS；`config-down.spec.ts` 的 2 個測試顯示 skipped。若 `menu.spec.ts` 失敗，先確認 `deploy/menu.json` 已還原（`git diff deploy/menu.json` 應該沒有差異）。

- [ ] **Step 7: Checkpoint**

Run: `git status --short`，回報變更（不 commit）。確認 `deploy/menu.json` 沒有被測試留下改動。

---

### Task 12: Docker 部署

**Files:**
- Create: `apps/order/Dockerfile`, `apps/invoice/Dockerfile`, `services/config-server/Dockerfile`
- Create: `docker-compose.yml`, `scripts/docker-check.mjs`
- Modify: `README.md`（Docker 段落）

**Interfaces:**
- Consumes: Task 7–10 的 app 與 config-server。
- Produces: `pnpm docker:up` 後 `http://localhost:8080`（order）、`http://localhost:8090`（config-server）；invoice 不對外。

- [ ] **Step 1: 確認 `turbo prune` 的輸出結構**

Run:

```bash
pnpm exec turbo prune @repo/order --docker
ls out out/json
rm -rf out
```

Expected: `out/` 內有 `json/`、`full/`、`pnpm-lock.yaml`；`out/json/` 內有 `package.json`、`pnpm-workspace.yaml`、`apps/`、`packages/`。若 `pnpm-workspace.yaml` 不在 `out/json/`，下面 Dockerfile 的 `COPY --from=pruner /app/out/json/ .` 之後要加一行 `COPY --from=pruner /app/out/full/pnpm-workspace.yaml ./`，並回報。

- [ ] **Step 2: 建立 order 的 Dockerfile**

`apps/order/Dockerfile`：

```dockerfile
# syntax=docker/dockerfile:1
# 在 repo 根目錄執行：docker build -f apps/order/Dockerfile --build-arg INVOICE_ZONE_URL=http://invoice:3001 .
FROM node:20.20.2-alpine AS base
RUN npm install -g pnpm@10.34.9 turbo@2.11.13
ENV NEXT_TELEMETRY_DISABLED=1

# 1) 把 monorepo 裁剪成只含 order 與它依賴的套件
FROM base AS pruner
WORKDIR /app
COPY . .
RUN turbo prune @repo/order --docker

# 2) 先複製 package.json 與 lockfile 安裝依賴（吃 Docker layer cache），再複製原始碼 build
FROM base AS builder
WORKDIR /app
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN pnpm install --frozen-lockfile
COPY --from=pruner /app/out/full/ .
ARG INVOICE_ZONE_URL
RUN test -n "$INVOICE_ZONE_URL" || (echo "需要 build arg INVOICE_ZONE_URL（rewrites 在 build 時寫死）" && exit 1)
ENV INVOICE_ZONE_URL=$INVOICE_ZONE_URL
ENV BUILD_STANDALONE=1
RUN turbo run build --filter=@repo/order

# 3) 執行階段只保留 standalone 產物
FROM node:20.20.2-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000
COPY --from=builder --chown=node:node /app/apps/order/.next/standalone ./
COPY --from=builder --chown=node:node /app/apps/order/.next/static ./apps/order/.next/static
COPY --from=builder --chown=node:node /app/apps/order/public ./apps/order/public
USER node
EXPOSE 3000
CMD ["node", "apps/order/server.js"]
```

- [ ] **Step 3: 建立 invoice 與 config-server 的 Dockerfile**

`apps/invoice/Dockerfile`：

```dockerfile
# syntax=docker/dockerfile:1
# 在 repo 根目錄執行：docker build -f apps/invoice/Dockerfile .
FROM node:20.20.2-alpine AS base
RUN npm install -g pnpm@10.34.9 turbo@2.11.13
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS pruner
WORKDIR /app
COPY . .
RUN turbo prune @repo/invoice --docker

FROM base AS builder
WORKDIR /app
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN pnpm install --frozen-lockfile
COPY --from=pruner /app/out/full/ .
ENV BUILD_STANDALONE=1
RUN turbo run build --filter=@repo/invoice

FROM node:20.20.2-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3001
COPY --from=builder --chown=node:node /app/apps/invoice/.next/standalone ./
COPY --from=builder --chown=node:node /app/apps/invoice/.next/static ./apps/invoice/.next/static
COPY --from=builder --chown=node:node /app/apps/invoice/public ./apps/invoice/public
USER node
EXPOSE 3001
CMD ["node", "apps/invoice/server.js"]
```

`services/config-server/Dockerfile`：

```dockerfile
# syntax=docker/dockerfile:1
# 在 repo 根目錄執行：docker build -f services/config-server/Dockerfile .
FROM node:20.20.2-alpine AS base
RUN npm install -g pnpm@10.34.9 turbo@2.11.13

FROM base AS pruner
WORKDIR /app
COPY . .
RUN turbo prune @repo/config-server --docker

# runtime menu 的 JS 在 build 時打包進 image（模擬上傳到 CDN）
FROM base AS builder
WORKDIR /app
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN pnpm install --frozen-lockfile
COPY --from=pruner /app/out/full/ .
# 結尾的 ... 代表連同依賴一起 build（config-server 自己沒有 build 腳本，靠它帶出 menu-runtime 的 build）
RUN turbo run build --filter=@repo/config-server...

FROM node:20.20.2-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production PORT=4000 MENU_FILE=/config/menu.json RUNTIME_DIR=/app/runtime CORS_ORIGIN=*
COPY --from=builder --chown=node:node /app/services/config-server/src ./src
COPY --from=builder --chown=node:node /app/packages/menu-runtime/dist ./runtime
USER node
EXPOSE 4000
CMD ["node", "src/index.mjs"]
```

- [ ] **Step 4: 建立 `docker-compose.yml`**

```yaml
# 以下 secret 只供 demo，不得用於正式環境。
name: order-invoice

x-app-env: &app-env
  MENU_CONFIG_URL: http://config-server:4000/menu.json
  MENU_RUNTIME_URL: http://localhost:8090/assets/menu-runtime.js
  AUTH_SECRET: demo-only-auth-secret-change-me-0123456789
  REVALIDATE_TOKEN: demo-only-revalidate-token

services:
  order:
    build:
      context: .
      dockerfile: apps/order/Dockerfile
      args:
        INVOICE_ZONE_URL: http://invoice:3001
    ports: ["8080:3000"]
    environment: *app-env
    depends_on: [invoice, config-server]

  invoice:
    build:
      context: .
      dockerfile: apps/invoice/Dockerfile
    expose: ["3001"]
    environment: *app-env

  config-server:
    build:
      context: .
      dockerfile: services/config-server/Dockerfile
    ports: ["8090:4000"]
    # 掛整個資料夾而不是單一檔案：編輯器用「寫新檔再改名」存檔時，單檔掛載會失效
    volumes: ["./deploy:/config:ro"]
```

- [ ] **Step 5: 建立 `scripts/docker-check.mjs`**

```js
// Docker 部署後的煙霧測試：node scripts/docker-check.mjs
import net from 'node:net'

const checks = []
const check = (name, fn) => checks.push({ name, fn })
const assert = (cond, msg) => {
  if (!cond) throw new Error(msg)
}

check('order 首頁 200', async () => {
  const res = await fetch('http://localhost:8080/')
  assert(res.status === 200, `status ${res.status}`)
})

check('未登入進 /invoices 會 307 到 8080 的登入頁（不是 invoice 的內網位址）', async () => {
  const res = await fetch('http://localhost:8080/invoices', { redirect: 'manual' })
  assert(res.status === 307, `status ${res.status}`)
  const location = res.headers.get('location')
  assert(location === 'http://localhost:8080/login?next=%2Finvoices', `location ${location}`)
})

check('invoice 的 3001 不對外', async () => {
  await new Promise((resolve, reject) => {
    const socket = net.connect(3001, '127.0.0.1')
    socket.once('connect', () => {
      socket.destroy()
      reject(new Error('3001 可以從 host 連線'))
    })
    socket.once('error', () => resolve())
  })
})

check('config-server health 與 runtime menu（帶 CORS）', async () => {
  assert((await fetch('http://localhost:8090/health')).status === 200, 'health')
  const res = await fetch('http://localhost:8090/assets/menu-runtime.js')
  assert(res.status === 200, `runtime status ${res.status}`)
  assert(res.headers.get('access-control-allow-origin') === '*', 'CORS header')
})

let failed = 0
for (const { name, fn } of checks) {
  try {
    await fn()
    console.log(`✓ ${name}`)
  } catch (err) {
    failed += 1
    console.log(`✗ ${name}：${err.message}`)
  }
}
process.exit(failed ? 1 : 0)
```

- [ ] **Step 6: 啟動並驗證**

先停掉 `pnpm dev`（E2E 會用到 8080，與 dev 不衝突，但 `config-down` 測試要停容器）。

Run:

```bash
pnpm docker:up
docker compose ps
pnpm docker:check
pnpm e2e:docker
```

Expected: 三個服務都是 running；`docker:check` 全部 ✓；`e2e:docker` 全部 PASS（包含 `config-down.spec.ts`）。build log 中 order 有 `[order] rewrites → invoice=http://invoice:3001`。

再手動驗證「改 menu.json 不用重啟容器」：改 `deploy/menu.json` 的一個 label，呼叫 `curl -X POST -H "Authorization: Bearer demo-only-revalidate-token" http://localhost:8080/api/revalidate-menu`，重新整理 `http://localhost:8080` 看到新 label；**改回原本內容**並再呼叫一次。

- [ ] **Step 7: 更新 README 的 Docker 段落**

在 `README.md` 的「測試」段落之前加入：

````markdown
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
````

- [ ] **Step 8: Checkpoint**

Run: `git status --short`，回報變更（不 commit）。

---

### Task 13: `deploy:affected`（只部署受影響的服務）

**Files:**
- Create: `scripts/deploy-affected.mjs`, `scripts/affected-services.mjs`
- Test: `scripts/affected-services.test.mjs`
- Modify: `README.md`（各自部署段落）

**Interfaces:**
- Consumes: `turbo ls --affected --output json`
- Produces: `servicesFromTurboLs(json: unknown): string[]`（回傳 `order`、`invoice`、`config-server` 的子集合，依此順序）；`pnpm deploy:affected [--dry-run]`

- [ ] **Step 1: 確認 `turbo ls` 的 JSON 格式與 `--affected` 的行為**

前提：使用者已建立初始 commit（若 `git log` 沒有任何 commit，**停下來請使用者先 commit**，不要自己 commit）。

Run:

```bash
git log --oneline -1
pnpm exec turbo ls --affected --output json
echo "// probe" >> apps/invoice/src/data/invoices.ts
pnpm exec turbo ls --affected --output json
git checkout apps/invoice/src/data/invoices.ts
echo "# probe" >> docs/superpowers/specs/2026-11-22-order-invoice-design.md
pnpm exec turbo ls --affected --output json
git checkout docs/superpowers/specs/2026-11-22-order-invoice-design.md
```

Expected 與記錄：
1. 沒有改動時 `packages.items` 為空陣列。
2. 改 invoice 檔案（未 commit）時只出現 `@repo/invoice`——確認 `--affected` **包含未 commit 的改動**。
3. 改根目錄的 `docs/` 時的結果：記錄下來（預期不影響任何套件；若顯示全部套件，在 README 註明「根目錄檔案的改動會讓 Turborepo 視為全部受影響」）。

JSON 格式預期為 `{ "packageManager": "pnpm", "packages": { "count": N, "items": [{ "name": "@repo/invoice", "path": "apps/invoice" }] } }`。若實際格式不同，依實際格式調整 Step 3 的 `servicesFromTurboLs` 與測試，並回報。

- [ ] **Step 2: 寫失敗測試**

`scripts/affected-services.test.mjs`：

```js
import { describe, expect, it } from 'vitest'
import { servicesFromTurboLs } from './affected-services.mjs'

const ls = (...names) => ({ packageManager: 'pnpm', packages: { count: names.length, items: names.map((name) => ({ name, path: 'x' })) } })

describe('servicesFromTurboLs', () => {
  it('只改 invoice → 只部署 invoice', () => {
    expect(servicesFromTurboLs(ls('@repo/invoice'))).toEqual(['invoice'])
  })

  it('改共用套件 → order、invoice 都部署（共用套件本身不是服務）', () => {
    expect(servicesFromTurboLs(ls('@repo/menu', '@repo/order', '@repo/invoice', '@repo/zone-inspector'))).toEqual(['order', 'invoice'])
  })

  it('改 menu-runtime → 只部署 config-server', () => {
    expect(servicesFromTurboLs(ls('@repo/menu-runtime', '@repo/config-server'))).toEqual(['config-server'])
  })

  it('只改 deploy/menu.json → 不部署任何服務', () => {
    expect(servicesFromTurboLs(ls('@repo/deploy'))).toEqual([])
  })

  it('格式不對時丟錯，避免誤判成「不需要部署」', () => {
    expect(() => servicesFromTurboLs({})).toThrow()
  })
})
```

- [ ] **Step 3: 確認失敗後實作**

Run: `pnpm exec vitest run scripts/affected-services.test.mjs`
Expected: FAIL，找不到 `./affected-services.mjs`。

`scripts/affected-services.mjs`：

```js
// workspace 套件 → docker compose 服務。沒有列在這裡的套件（共用套件、@repo/deploy）不是部署單位。
const SERVICES = [
  ['@repo/order', 'order'],
  ['@repo/invoice', 'invoice'],
  ['@repo/config-server', 'config-server'],
]

export function servicesFromTurboLs(json) {
  const items = json?.packages?.items
  if (!Array.isArray(items)) throw new Error('無法解析 turbo ls 的輸出：缺少 packages.items')
  const names = new Set(items.map((i) => i.name))
  return SERVICES.filter(([pkg]) => names.has(pkg)).map(([, service]) => service)
}
```

`scripts/deploy-affected.mjs`：

```js
// 用 Turborepo 找出受影響的服務，只重新 build 與部署它們。
// 用法：pnpm deploy:affected [--dry-run]
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { servicesFromTurboLs } from './affected-services.mjs'

const root = path.resolve(import.meta.dirname, '..')
const dryRun = process.argv.includes('--dry-run')

const output = execFileSync('pnpm', ['exec', 'turbo', 'ls', '--affected', '--output', 'json'], { cwd: root, encoding: 'utf8' })
const json = JSON.parse(output.slice(output.indexOf('{')))
const affected = json.packages.items.map((i) => i.name)
const services = servicesFromTurboLs(json)

console.log(`受影響的套件：${affected.length ? affected.join('、') : '（無）'}`)
if (services.length === 0) {
  console.log('不需要部署任何服務。')
  process.exit(0)
}
console.log(`要部署的服務：${services.join('、')}`)
if (dryRun) process.exit(0)

execFileSync('docker', ['compose', 'up', '-d', '--build', '--no-deps', ...services], { cwd: root, stdio: 'inherit' })
```

- [ ] **Step 4: 確認測試通過並實際示範**

Run:

```bash
pnpm exec vitest run scripts/affected-services.test.mjs
pnpm deploy:affected --dry-run
echo "// probe" >> apps/invoice/src/data/invoices.ts && pnpm deploy:affected --dry-run; git checkout apps/invoice/src/data/invoices.ts
echo "// probe" >> packages/menu/src/zones.ts && pnpm deploy:affected --dry-run; git checkout packages/menu/src/zones.ts
echo "/* probe */" >> packages/menu-runtime/src/styles.css && pnpm deploy:affected --dry-run; git checkout packages/menu-runtime/src/styles.css
node -e "const f='deploy/menu.json';const fs=require('fs');fs.writeFileSync(f,fs.readFileSync(f,'utf8')+'\n')" && pnpm deploy:affected --dry-run; git checkout deploy/menu.json
```

Expected（依序）：PASS；「不需要部署任何服務。」；`invoice`；`order、invoice`；`config-server`；「不需要部署任何服務。」。結果與 spec §13.4 一致。

- [ ] **Step 5: 更新 README**

在 README 的 Docker 段落之後加入：

````markdown
## 只部署有改動的服務

```bash
pnpm deploy:affected --dry-run   # 只列出會部署哪些服務
pnpm deploy:affected             # 對受影響的服務執行 docker compose up -d --build
```

比較對象是 `main` 分支（包含尚未 commit 的改動）。

| 改了什麼 | 部署 |
|---|---|
| `apps/order/**` | order |
| `apps/invoice/**` | invoice |
| `packages/ui`、`menu`、`auth`、`zone-inspector` | order、invoice |
| `packages/menu-runtime/**` | config-server |
| `deploy/menu.json` | 不部署（volume 直接生效） |
````

（若 Step 1 發現根目錄檔案改動會讓全部受影響，在表格後加一行說明。）

- [ ] **Step 6: Checkpoint**

Run: `git status --short`，回報變更（不 commit）。

---

### Task 14: Azure 對應與 CI 範例

**Files:**
- Create: `deploy/azure/README.md`
- Create: `.github/workflows/order.yml`, `invoice.yml`, `menu-config.yml`, `menu-runtime.yml`

**Interfaces:**
- Produces: 範例檔案，tech review §7 引用。**不實際執行**。

- [ ] **Step 1: 建立 `deploy/azure/README.md`**

````markdown
# Azure 部署對應（範例，未實際部署）

| demo | Azure |
|---|---|
| order、invoice 容器 | 兩個 Azure Container Apps（同一個 Container Apps Environment），image 放在 Azure Container Registry |
| config-server | Azure Blob Storage（`menu.json`、`assets/menu-runtime.js`），前面加 Azure Front Door 或 CDN |
| `AUTH_SECRET`、`REVALIDATE_TOKEN` | Key Vault，以 secret reference 注入 Container Apps |
| order 的 rewrites | 維持 rewrites；或改用 Front Door 依路徑分流（見下方） |

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
````

- [ ] **Step 2: 建立四個 workflow 範例**

`.github/workflows/order.yml`：

```yaml
# 範例：未實際執行。需要的 secrets：AZURE_CREDENTIALS；vars：ACR_NAME、RESOURCE_GROUP、INVOICE_INTERNAL_URL
name: deploy-order
on:
  push:
    branches: [main]
    paths:
      - apps/order/**
      - packages/**
      - '!packages/menu-runtime/**'
      - pnpm-lock.yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: azure/login@v2
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}
      - name: Build and push image
        run: |
          az acr login -n ${{ vars.ACR_NAME }}
          docker build -f apps/order/Dockerfile \
            --build-arg INVOICE_ZONE_URL=${{ vars.INVOICE_INTERNAL_URL }} \
            -t ${{ vars.ACR_NAME }}.azurecr.io/order:${{ github.sha }} .
          docker push ${{ vars.ACR_NAME }}.azurecr.io/order:${{ github.sha }}
      - name: Deploy to Container Apps
        run: |
          az containerapp update -n order -g ${{ vars.RESOURCE_GROUP }} \
            --image ${{ vars.ACR_NAME }}.azurecr.io/order:${{ github.sha }}
```

`.github/workflows/invoice.yml`：

```yaml
# 範例：未實際執行。需要的 secrets：AZURE_CREDENTIALS；vars：ACR_NAME、RESOURCE_GROUP
name: deploy-invoice
on:
  push:
    branches: [main]
    paths:
      - apps/invoice/**
      - packages/**
      - '!packages/menu-runtime/**'
      - pnpm-lock.yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: azure/login@v2
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}
      - name: Build and push image
        run: |
          az acr login -n ${{ vars.ACR_NAME }}
          docker build -f apps/invoice/Dockerfile -t ${{ vars.ACR_NAME }}.azurecr.io/invoice:${{ github.sha }} .
          docker push ${{ vars.ACR_NAME }}.azurecr.io/invoice:${{ github.sha }}
      - name: Deploy to Container Apps
        run: |
          az containerapp update -n invoice -g ${{ vars.RESOURCE_GROUP }} \
            --image ${{ vars.ACR_NAME }}.azurecr.io/invoice:${{ github.sha }}
```

`.github/workflows/menu-config.yml`：

```yaml
# 範例：未實際執行。改 menu.json 只上傳 Blob 並清除兩個 app 的快取，不 build、不部署任何 app。
# 需要的 secrets：AZURE_CREDENTIALS、REVALIDATE_TOKEN；vars：STORAGE_ACCOUNT、SITE_URL
name: publish-menu-config
on:
  push:
    branches: [main]
    paths: [deploy/menu.json]
jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: azure/login@v2
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}
      - name: Validate JSON
        run: node -e "JSON.parse(require('fs').readFileSync('deploy/menu.json','utf8'))"
      - name: Upload to Blob
        run: |
          az storage blob upload --account-name ${{ vars.STORAGE_ACCOUNT }} --auth-mode login \
            -c config -n menu.json -f deploy/menu.json --overwrite \
            --content-type application/json --content-cache-control no-store
      - name: Revalidate both zones
        run: |
          for path in /api/revalidate-menu /invoices/api/revalidate-menu; do
            curl -fsS -X POST -H "Authorization: Bearer ${{ secrets.REVALIDATE_TOKEN }}" "${{ vars.SITE_URL }}$path"
          done
```

`.github/workflows/menu-runtime.yml`：

```yaml
# 範例：未實際執行。runtime menu 改動只重新打包並上傳到 Blob，不部署任何 app。
# 需要的 secrets：AZURE_CREDENTIALS；vars：STORAGE_ACCOUNT
name: publish-menu-runtime
on:
  push:
    branches: [main]
    paths: [packages/menu-runtime/**]
jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter @repo/menu-runtime build
      - uses: azure/login@v2
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}
      - name: Upload to Blob
        run: |
          az storage blob upload --account-name ${{ vars.STORAGE_ACCOUNT }} --auth-mode login \
            -c config -n assets/menu-runtime.js -f packages/menu-runtime/dist/menu-runtime.js --overwrite \
            --content-type text/javascript --content-cache-control no-cache
```

- [ ] **Step 3: 檢查 YAML 語法**

Run: `for f in .github/workflows/*.yml; do node -e "const y=require('fs').readFileSync('$f','utf8'); if(/\t/.test(y)) throw new Error('$f 含 tab'); console.log('ok $f')"; done`
Expected: 四行 `ok`。（沒有 YAML parser 依賴；只檢查 tab，實際語法由使用者推上 GitHub 時驗證，已在檔案開頭標註未執行。）

- [ ] **Step 4: Checkpoint**

Run: `git status --short`，回報變更（不 commit）。

---

### Task 15: 量測與 Tech Review HTML

**Files:**
- Create: `e2e/tests/measure.spec.ts`
- Create: `docs/tech-review.html`

**Interfaces:**
- Consumes: Docker 環境（Task 12）、`e2e/results/menu-metrics.json`
- Produces: `docs/tech-review.html`（spec §16 的 9 個章節）

- [ ] **Step 1: 建立量測測試**

`e2e/tests/measure.spec.ts`：

```ts
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { gzipSync } from 'node:zlib'
import { test } from '@playwright/test'
import { setMenuMode } from './helpers'

const ROOT = path.resolve(import.meta.dirname, '../..')
const RUNS = 5
const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]

test('@measure build-time vs runtime Menu', async ({ browser, baseURL, request }) => {
  const result: Record<string, unknown> = { measuredAt: new Date().toISOString(), baseURL, runs: RUNS }

  for (const mode of ['build', 'runtime'] as const) {
    const times: number[] = []
    for (let i = 0; i < RUNS; i++) {
      const context = await browser.newContext()
      await setMenuMode(context, baseURL!, mode)
      const page = await context.newPage()
      const t0 = Date.now()
      await page.goto('/', { waitUntil: 'commit' })
      const nav = mode === 'build'
        ? page.locator('nav[aria-label="主選單"][data-menu="build"]')
        : page.locator('runtime-site-menu').getByRole('navigation', { name: '主選單' })
      await nav.getByRole('link', { name: '訂單' }).waitFor()
      times.push(Date.now() - t0)
      await context.close()
    }
    const html = await (await request.get('/', { headers: { cookie: `menu-mode=${mode}` } })).text()
    result[mode] = { menuVisibleMsMedian: median(times), menuVisibleMs: times, menuInHtml: html.includes('data-menu="build"') }
  }

  const bundle = readFileSync(path.join(ROOT, 'packages/menu-runtime/dist/menu-runtime.js'))
  result.runtimeBundle = { bytes: bundle.length, gzipBytes: gzipSync(bundle).length }

  mkdirSync(path.join(ROOT, 'e2e/results'), { recursive: true })
  writeFileSync(path.join(ROOT, 'e2e/results/menu-metrics.json'), JSON.stringify(result, null, 2))
  console.log(JSON.stringify(result, null, 2))
})
```

- [ ] **Step 2: 執行量測**

Run（Docker 已啟動）：`pnpm measure`
Expected: PASS，`e2e/results/menu-metrics.json` 產生，含 `build.menuVisibleMsMedian`、`runtime.menuVisibleMsMedian`、`build.menuInHtml: true`、`runtime.menuInHtml: false`、`runtimeBundle.gzipBytes`。記下數字供下一步使用。

- [ ] **Step 3: 收集驗證結果**

Run 並保存每個指令的摘要輸出（通過數／失敗數）：

```bash
pnpm test 2>&1 | tail -20
pnpm typecheck 2>&1 | tail -5
pnpm docker:check
pnpm e2e:docker 2>&1 | tail -15
```

（本機 dev 的 `pnpm e2e` 結果沿用 Task 11 Step 6，若之後有改動則重跑。）

- [ ] **Step 4: 撰寫 `docs/tech-review.html`**

規格：
- 單一自包含 HTML：所有 CSS 寫在 `<style>`，不載入任何外部資源（字型、CDN、圖片），離線可開。
- `<html lang="zh-Hant">`，`<title>Order × Invoice 技術評估</title>`。
- 顏色定義成 `:root` 的 CSS 變數，並在 `@media (prefers-color-scheme: dark)` 重新定義；`body` 有明確背景色。
- 手機寬度可讀：`max-width` 內容欄、左右 16px gutter、寬表格包在 `overflow-x: auto` 容器裡，頁面不得橫向捲動。
- 左側（寬螢幕）或頂部（窄螢幕）章節目錄，錨點連到各章。
- 架構圖用 inline SVG，文字與線條用 `currentColor` 或 CSS 變數，深淺色都清楚。
- 程式碼片段用 `<pre><code>`，可水平捲動。

內容（章節與必含重點）：

1. **背景與目標**：兩個獨立的 Next 15 App Router 專案（order、invoice）整合成一個網站；要求各自上線、共用 Menu。
2. **選型**
   - 10 種做法比較表：Multi-Zones、Vercel Microfrontends、Reverse Proxy、Monorepo 單一 app、npm 套件、Module Federation、qiankun / single-spa、Web Components、iframe、ESI / Fragment；欄位：App Router / RSC 支援、獨立部署、跨站跳頁體驗、改動成本、結論。
   - 「獨立部署 / 一致體驗 / 完整 Next 能力」最多三選二的圖表與說明。
   - Monorepo ≠ 單一 app：Monorepo 只決定程式碼放哪裡，部署單位由 app 數量決定。
   - React 18 與 App Router：引用 spec §10 的原始碼證據（`peerDependencies`、`createVendoredReactAliases`、內建 `19.2.0-canary-0bdb9206-20250818`），結論是 App Router 一律跑內建的 React 19。
   - Monorepo 工具：JIT packages（採用）、Compiled packages、Nx 的比較與「什麼情況改用」。
   - 路由層：order rewrites（採用）、Azure Front Door、Nginx 的比較。
3. **架構圖**：瀏覽器 → order（8080/3000）→ rewrite → invoice（內網 3001）；兩個 app 的 server 端 → config-server（menu.json）；瀏覽器 → config-server（runtime menu JS，CORS）；同網域 `session` cookie。
4. **實作重點**
   - `assetPrefix` vs `basePath`：zone 用 `assetPrefix`（官方文件），頁面放在 `app/invoices/`；並明確**修正**先前討論中用 `basePath` 的範例。
   - `ZoneLink` 與路由表：同 zone `next/link`、跨 zone `<a>`。
   - 共用 Menu：`getMenu()` 快取 60 秒、tag `menu`、zod 驗證、失敗用備援；revalidate API。
   - 登入：JWT cookie、為什麼用 form POST + 303 而不是 Server Action；`safeNextPath`；**`x-forwarded-host` 的坑**（proxy `changeOrigin: true`，middleware 必須用 `publicUrl()`）。
   - 其他 Multi-Zones 坑：`/_next/image` 不套用 `assetPrefix`（本 demo 不使用 `next/image`）、order 不能定義套用到 `/:path*` 的 `headers()`、order 不能有 `app/invoices` 或根層 catch-all 路由、`INVOICE_ZONE_URL` 在 build 時寫死。
   - 設計系統與 Tailwind v4 的 `@source`；導頁視覺化工具列。
5. **Build-time Menu vs Runtime Menu**：用 Step 2 的實測數字填表（Menu 出現時間中位數、HTML 是否包含 Menu、runtime bundle 大小與 gzip 大小、config-server 故障時的表現、改動時要部署什麼、soft navigation 要靠 host 搭橋）。附量測時間與環境（Docker、本機）。結論：Menu 內容放 JSON 拿到「不用部署」的大部分好處，元件跟著 app 部署換取 SSR 與穩定。
6. **共用程式碼的變更流程**：三種改動（內容／元件／資料格式）的處理；expand / contract 步驟；`menuV2` feature flag 讓兩個 zone 同時切換；部署時間差的三種處理方式；`deploy:affected` 的對照表（Task 13 的實際結果）。
7. **部署**：Docker 架構（turbo prune、standalone、volume 掛 `deploy/`）；Azure 對應表（引用 `deploy/azure/README.md`）；CI 範例的 path filter 設計；`NEXT_PUBLIC_*` 在 build 時寫死的陷阱與本 demo 的做法（server 端讀 runtime env 再傳 prop）；多 replica 的 cache 注意事項。
8. **已知限制與風險**：spec §17 全部項目，加上 Task 13 Step 1 觀察到的根目錄檔案行為。
9. **驗證結果**：Step 3 收集的指令與結果摘要（單元測試數、E2E 通過數、docker-check、量測時間），標明執行日期。

- [ ] **Step 5: 檢查 tech review**

Run:

```bash
grep -c "<section" docs/tech-review.html
grep -E -o "https?://[^\"' )<]+" docs/tech-review.html | sort -u
open docs/tech-review.html
```

Expected: section 數 ≥ 9；外部網址只出現在文字說明的參考連結中（例如 Next 官方文件），沒有 `<link>`、`<script src>`、`<img src>` 指向外部。瀏覽器中切換系統深淺色模式都清楚；把視窗縮到約 375px 寬，頁面沒有橫向捲動。

- [ ] **Step 6: Checkpoint**

Run: `git status --short`，回報變更（不 commit）。

---

### Task 16: 最終驗證

**Files:** 無新增（只修正前面 task 發現的問題）

- [ ] **Step 1: 從乾淨狀態完整跑一次**

Run:

```bash
pnpm docker:down
rm -rf node_modules apps/*/node_modules packages/*/node_modules services/*/node_modules e2e/node_modules apps/*/.next packages/menu-runtime/dist .turbo
pnpm install
pnpm test
pnpm typecheck
pnpm build
```

Expected: 全部成功。

- [ ] **Step 2: 本機 dev E2E**

Run: `pnpm dev`（另一個 terminal）後 `pnpm e2e`，完成後停掉 dev。
Expected: 全部 PASS，`config-down` 2 個 skipped。

- [ ] **Step 3: Docker E2E**

Run: `pnpm docker:up && pnpm docker:check && pnpm e2e:docker`
Expected: 全部 PASS。

- [ ] **Step 4: 對照 spec 逐條檢查**

逐一確認 spec §0 的 5 個目標、§13.4 對照表、§15 測試清單、§16 tech review 章節都已完成；`git diff deploy/menu.json` 沒有測試殘留；README 的指令都實際跑過。

- [ ] **Step 5: 回報**

回報內容：完成的項目、所有驗證指令與結果、與 spec 的任何差異（含「與 spec 的細部調整」以外新發現的）、使用者需要做的事（建立 commit、決定是否發佈 tech review）。不 commit。
