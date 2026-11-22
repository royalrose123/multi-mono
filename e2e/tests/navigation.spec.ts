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
