import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { createServer, request } from 'node:http'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createHandler } from './handler.mjs'

// fetch 會先把 %2e%2e 正規化成 /menu.json，無法送出穿越路徑，故用 node:http 送原始 path
const rawGet = (port, p) =>
  new Promise((resolve, reject) => {
    const req = request({ host: '127.0.0.1', port, path: p }, (res) => {
      res.resume()
      res.on('end', () => resolve({ status: res.statusCode }))
    })
    req.on('error', reject)
    req.end()
  })

let dir
let server
let base

beforeAll(async () => {
  dir = await mkdtemp(path.join(tmpdir(), 'config-server-'))
  await writeFile(path.join(dir, 'menu.json'), '{"version":1}')
  await mkdir(path.join(dir, 'runtime'))
  await writeFile(path.join(dir, 'runtime', 'menu-runtime.js'), 'export {}')
  server = createServer(createHandler({ menuFile: path.join(dir, 'menu.json'), runtimeDir: path.join(dir, 'runtime'), corsOrigin: '*' }))
  await new Promise((resolve) => server.listen(0, resolve))
  base = `http://127.0.0.1:${server.address().port}`
})

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve))
  await rm(dir, { recursive: true, force: true })
})

describe('config-server', () => {
  it('GET /menu.json 回傳檔案內容、不快取、帶 CORS', async () => {
    const res = await fetch(`${base}/menu.json`)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('application/json')
    expect(res.headers.get('cache-control')).toBe('no-store')
    expect(res.headers.get('access-control-allow-origin')).toBe('*')
    expect(await res.text()).toBe('{"version":1}')
  })

  it('每次請求都重新讀檔（改檔案不用重啟）', async () => {
    await writeFile(path.join(dir, 'menu.json'), '{"version":1,"changed":true}')
    const res = await fetch(`${base}/menu.json`)
    expect(await res.text()).toContain('changed')
  })

  it('GET /assets/menu-runtime.js 回傳 JavaScript', async () => {
    const res = await fetch(`${base}/assets/menu-runtime.js`)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/javascript')
    expect(res.headers.get('access-control-allow-origin')).toBe('*')
  })

  it('GET /health 回 200', async () => {
    expect((await fetch(`${base}/health`)).status).toBe(200)
  })

  it('OPTIONS 回 204 並帶 CORS', async () => {
    const res = await fetch(`${base}/menu.json`, { method: 'OPTIONS' })
    expect(res.status).toBe(204)
    expect(res.headers.get('access-control-allow-methods')).toContain('GET')
  })

  it.each(['/nope', '/assets/other.js', '/assets/%2e%2e/menu.json', '/..%2fmenu.json'])('%s 回 4xx', async (p) => {
    const res = await rawGet(server.address().port, p)
    expect(res.status).toBeGreaterThanOrEqual(400)
    expect(res.status).toBeLessThan(500)
  })

  it('POST 回 405', async () => {
    expect((await fetch(`${base}/menu.json`, { method: 'POST' })).status).toBe(405)
  })

  it('檔案不存在時回 404', async () => {
    const s = createServer(createHandler({ menuFile: path.join(dir, 'missing.json'), runtimeDir: dir, corsOrigin: '*' }))
    await new Promise((resolve) => s.listen(0, resolve))
    const res = await fetch(`http://127.0.0.1:${s.address().port}/menu.json`)
    await new Promise((resolve) => s.close(resolve))
    expect(res.status).toBe(404)
  })
})
