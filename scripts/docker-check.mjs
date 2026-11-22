// Docker 部署後的煙霧測試：node scripts/docker-check.mjs
import net from 'node:net'

const checks = []
const check = (name, fn) => checks.push({ name, fn })
const assert = (cond, msg) => {
  if (!cond) throw new Error(msg)
}

check('order 首頁 200', async () => {
  const res = await fetch('http://localhost:8080/')
  assert(res.status === 200, `status ${res.status}`)
})

check('未登入進 /invoices 會 307 到 8080 的登入頁（不是 invoice 的內網位址）', async () => {
  const res = await fetch('http://localhost:8080/invoices', { redirect: 'manual' })
  assert(res.status === 307, `status ${res.status}`)
  const location = res.headers.get('location')
  assert(location === 'http://localhost:8080/login?next=%2Finvoices', `location ${location}`)
})

check('invoice 的 3001 不對外', async () => {
  await new Promise((resolve, reject) => {
    const socket = net.connect(3001, '127.0.0.1')
    socket.once('connect', () => {
      socket.destroy()
      reject(new Error('3001 可以從 host 連線'))
    })
    socket.once('error', () => resolve())
  })
})

check('order 的 /api/menu 200（JSON、不快取）', async () => {
  const res = await fetch('http://localhost:8080/api/menu')
  assert(res.status === 200, `status ${res.status}`)
  assert(res.headers.get('cache-control') === 'no-store', `cache-control ${res.headers.get('cache-control')}`)
  const body = await res.json()
  assert(Array.isArray(body.items) && body.items.length > 0, 'items')
})

check('order 提供 runtime Menu 的 JS', async () => {
  const res = await fetch('http://localhost:8080/menu-runtime/menu-runtime.js')
  assert(res.status === 200, `status ${res.status}`)
  assert((res.headers.get('content-type') ?? '').includes('javascript'), `content-type ${res.headers.get('content-type')}`)
})

let failed = 0
for (const { name, fn } of checks) {
  try {
    await fn()
    console.log(`✓ ${name}`)
  } catch (err) {
    failed += 1
    console.log(`✗ ${name}：${err.message}`)
  }
}
process.exit(failed ? 1 : 0)
