import { NextRequest } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createAuthMiddleware } from './middleware'
import { signSession } from './session'

const SECRET = 'test-secret-test-secret-test-secret-0000'

describe('createAuthMiddleware', () => {
  beforeEach(() => vi.stubEnv('AUTH_SECRET', SECRET))
  afterEach(() => vi.unstubAllEnvs())

  it('沒登入時 307 導到瀏覽器看得到的 /login，並帶上原本的路徑', async () => {
    const middleware = createAuthMiddleware()
    const req = new NextRequest('http://invoice:3001/invoices/INV-1001?x=1', {
      headers: { host: 'invoice:3001', 'x-forwarded-host': 'localhost:8080' },
    })
    const res = await middleware(req)
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toBe(
      'http://localhost:8080/login?next=%2Finvoices%2FINV-1001%3Fx%3D1',
    )
  })

  it('有有效 session 時放行', async () => {
    const token = await signSession({ sub: 'u-alice', name: 'Alice' }, SECRET)
    const req = new NextRequest('http://localhost:3000/orders', {
      headers: { cookie: `session=${token}` },
    })
    const res = await createAuthMiddleware()(req)
    expect(res.headers.get('x-middleware-next')).toBe('1')
  })

  it('session 無效時也導到登入頁', async () => {
    const req = new NextRequest('http://localhost:3000/orders', {
      headers: { cookie: 'session=not-a-jwt' },
    })
    const res = await createAuthMiddleware()(req)
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toBe('http://localhost:3000/login?next=%2Forders')
  })
})
