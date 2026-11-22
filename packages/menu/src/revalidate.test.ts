import { beforeEach, describe, expect, it, vi } from 'vitest'

const revalidateTag = vi.fn()
vi.mock('next/cache', () => ({ revalidateTag }))
vi.mock('server-only', () => ({}))

const { createRevalidateMenuHandler } = await import('./revalidate')

const post = (auth?: string) =>
  new Request('http://localhost/api/revalidate-menu', {
    method: 'POST',
    headers: auth ? { authorization: auth } : {},
  })

describe('createRevalidateMenuHandler', () => {
  beforeEach(() => revalidateTag.mockClear())

  it('token 正確時清除 menu 快取', async () => {
    const res = await createRevalidateMenuHandler(() => 'secret')(post('Bearer secret'))
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({ revalidated: true })
    expect(revalidateTag).toHaveBeenCalledWith('menu')
  })

  it.each([
    ['沒有帶 token', undefined],
    ['token 錯誤', 'Bearer wrong'],
    ['格式錯誤', 'secret'],
  ])('%s 時回 401', async (_name, auth) => {
    const res = await createRevalidateMenuHandler(() => 'secret')(post(auth))
    expect(res.status).toBe(401)
    expect(revalidateTag).not.toHaveBeenCalled()
  })

  it('伺服器沒設定 token 時一律拒絕', async () => {
    const res = await createRevalidateMenuHandler(() => undefined)(post('Bearer '))
    expect(res.status).toBe(401)
  })
})
