import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  // 測試會改 menu.json 與 cookie，必須依序執行
  fullyParallel: false,
  workers: 1,
  retries: 0,
  // next dev 第一次造訪路由才編譯，放寬逾時
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    trace: 'retain-on-failure',
    navigationTimeout: 30_000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
