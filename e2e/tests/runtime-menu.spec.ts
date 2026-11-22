import { expect, test } from '@playwright/test'
import { inspector, login, markWindow, setMenuMode, windowMark } from './helpers'

test('runtime Menu：由 Web Component 渲染，同 zone 仍可 soft navigation，跨 zone 整頁載入', async ({ page, context, baseURL }) => {
  await setMenuMode(context, baseURL!, 'runtime')
  // runtime Menu 的 JS 與資料都由 order（同網域）提供
  const origin = new URL(baseURL!).origin
  const runtimeJs = page.waitForResponse((r) => r.url() === `${origin}/menu-runtime/menu-runtime.js` && r.status() === 200)
  const menuApi = page.waitForResponse((r) => r.url() === `${origin}/api/menu` && r.status() === 200)
  await login(page, '/orders')
  await Promise.all([runtimeJs, menuApi])

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
