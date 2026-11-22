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
