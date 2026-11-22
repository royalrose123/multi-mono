import { expect, test } from '@playwright/test'
import { inspector, login, mainNav, readMenuFile, revalidateMenus, setMenuMode, writeMenuFile } from './helpers'

// dev 與 docker 都執行：docker 的 order 以 volume 掛載 deploy/，改 host 上的檔案即生效
test.describe('menu.json 格式錯誤', () => {
  let original: string

  test.beforeAll(async ({ request }) => {
    original = readMenuFile()
    writeMenuFile('{ "version": 1, "items": [')
    await revalidateMenus(request)
  })

  test.afterAll(async ({ request }) => {
    writeMenuFile(original)
    await revalidateMenus(request)
  })

  test('order 的 /api/menu 回 503', async ({ request }) => {
    const res = await request.get('/api/menu')
    expect(res.status()).toBe(503)
    expect(res.headers()['cache-control']).toBe('no-store')
  })

  test('order 與 invoice 的 build-time Menu 都改用備援資料，畫面不壞', async ({ page }) => {
    await login(page, '/orders')
    await expect(mainNav(page)).toHaveAttribute('data-menu', 'build')
    await expect(mainNav(page).getByRole('link', { name: '訂單' })).toBeVisible()
    await expect(inspector(page)).toHaveAttribute('data-menu-source', 'fallback')

    await page.goto('/invoices')
    await expect(inspector(page)).toHaveAttribute('data-zone', 'invoice')
    await expect(mainNav(page)).toHaveAttribute('data-menu', 'build')
    await expect(mainNav(page).getByRole('link', { name: '訂單' })).toBeVisible()
    await expect(inspector(page)).toHaveAttribute('data-menu-source', 'fallback')
  })

  test('runtime Menu：Web Component 載入成功，但 Menu 內顯示無法讀取 menu.json', async ({ page, context, baseURL }) => {
    await setMenuMode(context, baseURL!, 'runtime')
    await login(page, '/orders')
    await expect(page.locator('[data-menu="runtime"]')).toHaveAttribute('data-status', 'ready')
    const runtimeNav = page.locator('runtime-site-menu').getByRole('navigation', { name: '主選單' })
    await expect(runtimeNav).toBeVisible()
    await expect(runtimeNav.getByText('無法讀取 menu.json')).toBeVisible()
    await expect(runtimeNav.getByRole('link', { name: '訂單' })).toHaveCount(0)
  })
})
