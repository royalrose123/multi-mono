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

test('order 的 /api/menu 回傳 menu.json 的內容，且不可快取', async ({ request }) => {
  const res = await request.get('/api/menu')
  expect(res.status()).toBe(200)
  expect(res.headers()['cache-control']).toBe('no-store')
  expect((await res.json()).items).toEqual(JSON.parse(original).items)
})

test('改 menu.json：order 立即更新；invoice 在 revalidate 後更新（都不用重新部署）', async ({ page, request }) => {
  const menu = JSON.parse(original)
  menu.items.push({ label: 'E2E 測試項目', href: '/orders?e2e=1' })
  writeMenuFile(JSON.stringify(menu, null, 2))

  // order 每次請求都讀檔：不呼叫 revalidate 也看得到
  await login(page, '/orders')
  await expect(mainNav(page).getByRole('link', { name: 'E2E 測試項目' })).toBeVisible()
  await expect(inspector(page)).toHaveAttribute('data-menu-source', 'remote')
  const api = await request.get('/api/menu')
  expect((await api.json()).items.map((i: { label: string }) => i.label)).toContain('E2E 測試項目')

  // invoice 有 60 秒快取：revalidate 後才保證看到
  await revalidateMenus(request)
  await page.goto('/invoices')
  await expect(mainNav(page).getByRole('link', { name: 'E2E 測試項目' })).toBeVisible()
  await expect(inspector(page)).toHaveAttribute('data-menu-source', 'remote')
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
