import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { gzipSync } from 'node:zlib'
import { test } from '@playwright/test'
import { setMenuMode } from './helpers'

const ROOT = path.resolve(import.meta.dirname, '../..')
const RUNS = 5
const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]

test('@measure build-time vs runtime Menu', async ({ browser, baseURL, request }) => {
  const result: Record<string, unknown> = { measuredAt: new Date().toISOString(), baseURL, runs: RUNS }

  for (const mode of ['build', 'runtime'] as const) {
    const times: number[] = []
    for (let i = 0; i < RUNS; i++) {
      const context = await browser.newContext()
      await setMenuMode(context, baseURL!, mode)
      const page = await context.newPage()
      const t0 = Date.now()
      await page.goto('/', { waitUntil: 'commit' })
      const nav = mode === 'build'
        ? page.locator('nav[aria-label="主選單"][data-menu="build"]')
        : page.locator('runtime-site-menu').getByRole('navigation', { name: '主選單' })
      await nav.getByRole('link', { name: '訂單' }).waitFor()
      times.push(Date.now() - t0)
      await context.close()
    }
    const html = await (await request.get('/', { headers: { cookie: `menu-mode=${mode}` } })).text()
    result[mode] = { menuVisibleMsMedian: median(times), menuVisibleMs: times, menuInHtml: html.includes('data-menu="build"') }
  }

  const bundle = readFileSync(path.join(ROOT, 'apps/order/public/menu-runtime/menu-runtime.js'))
  result.runtimeBundle = { bytes: bundle.length, gzipBytes: gzipSync(bundle).length }

  mkdirSync(path.join(ROOT, 'e2e/results'), { recursive: true })
  writeFileSync(path.join(ROOT, 'e2e/results/menu-metrics.json'), JSON.stringify(result, null, 2))
  console.log(JSON.stringify(result, null, 2))
})
