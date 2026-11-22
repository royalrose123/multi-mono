import { readFile } from 'node:fs/promises'
import path from 'node:path'

/**
 * 模擬 Azure Blob / CDN：提供 menu.json 與 runtime menu 的 JS。
 * @param {{ menuFile: string, runtimeDir: string, corsOrigin: string }} options
 */
export function createHandler({ menuFile, runtimeDir, corsOrigin }) {
  const routes = {
    '/menu.json': { file: () => menuFile, type: 'application/json; charset=utf-8', cache: 'no-store' },
    '/assets/menu-runtime.js': { file: () => path.join(runtimeDir, 'menu-runtime.js'), type: 'text/javascript; charset=utf-8', cache: 'no-cache' },
  }

  return async function handler(req, res) {
    const cors = { 'Access-Control-Allow-Origin': corsOrigin }
    const send = (status, headers = {}, body) => {
      res.writeHead(status, { ...cors, ...headers })
      res.end(body)
    }

    // 先檢查原始 URL（URL 解析會把 %2e%2e 正規化掉，導致判斷失準）
    let raw
    let pathname
    try {
      raw = decodeURIComponent(req.url ?? '/')
      pathname = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname)
    } catch {
      return send(400)
    }
    if (raw.includes('..') || pathname.includes('..')) return send(400)

    if (req.method === 'OPTIONS') return send(204, { 'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS' })
    if (req.method !== 'GET' && req.method !== 'HEAD') return send(405)
    if (pathname === '/health') return send(200, { 'Content-Type': 'text/plain; charset=utf-8' }, 'ok')

    const route = routes[pathname]
    if (!route) return send(404)
    try {
      const body = await readFile(route.file())
      return send(200, { 'Content-Type': route.type, 'Cache-Control': route.cache }, body)
    } catch (err) {
      if (err && err.code === 'ENOENT') return send(404)
      console.error('[config-server]', err)
      return send(500)
    }
  }
}
