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
  await expect(page.locator('[role="alert"]:not(#__next-route-announcer__)')).toHaveText('帳號或密碼錯誤')
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
