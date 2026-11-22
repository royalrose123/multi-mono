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
    await expect(page.locator('[role="alert"]:not(#__next-route-announcer__)')).toContainText('選單載入失敗')
  })
})
