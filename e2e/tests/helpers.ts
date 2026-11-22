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

/** 只有 invoice 有 menu 快取（order 每次請求都讀檔），所以只清 invoice。 */
export async function revalidateMenus(request: APIRequestContext) {
  const p = '/invoices/api/revalidate-menu'
  const res = await request.post(p, { headers: { Authorization: `Bearer ${TOKEN}` } })
  expect(res.status(), p).toBe(200)
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
