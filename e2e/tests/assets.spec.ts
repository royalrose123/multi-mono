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
