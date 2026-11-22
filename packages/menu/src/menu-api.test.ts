import path from 'node:path'
import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const { createMenuApiHandler } = await import('./menu-api')

const fixture = (name: string) => path.join(import.meta.dirname, '__fixtures__', name)

describe('createMenuApiHandler（order 的 GET /api/menu）', () => {
  it('檔案合法時回 200 與 MenuConfig，且不可被快取', async () => {
    const res = await createMenuApiHandler(() => fixture('valid-menu.json'))()
    expect(res.status).toBe(200)
    expect(res.headers.get('cache-control')).toBe('no-store')
    expect(res.headers.get('content-type')).toContain('application/json')
    await expect(res.json()).resolves.toEqual({
      version: 1,
      flags: { menuV2: true },
      items: [{ label: '本機', href: '/orders' }],
    })
  })

  it.each([
    ['檔案不存在', 'does-not-exist.json'],
    ['不是合法 JSON', 'broken-json.json'],
    ['格式不符 schema', 'bad-schema.json'],
  ])('%s 時回 503（不回備援資料，讓呼叫端自己決定備援）', async (_name, file) => {
    const res = await createMenuApiHandler(() => fixture(file))()
    expect(res.status).toBe(503)
    expect(res.headers.get('cache-control')).toBe('no-store')
    const body = await res.json()
    expect(body).toHaveProperty('error')
    expect(body).not.toHaveProperty('items')
  })

  it('每次請求都重新讀檔', async () => {
    let file = fixture('valid-menu.json')
    const GET = createMenuApiHandler(() => file)
    expect((await GET()).status).toBe(200)
    file = fixture('broken-json.json')
    expect((await GET()).status).toBe(503)
  })
})
