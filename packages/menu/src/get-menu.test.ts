import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const { getMenu, MENU_TAG } = await import('./get-menu')

const remote = { version: 1, flags: { menuV2: true }, items: [{ label: '遠端', href: '/orders' }] }

function mockFetch(impl: () => Promise<Response>) {
  const fn = vi.fn(impl)
  vi.stubGlobal('fetch', fn)
  return fn
}

describe('getMenu', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('成功時回傳遠端資料，並設定 60 秒快取與 menu tag', async () => {
    const fetchFn = mockFetch(async () => Response.json(remote))
    const menu = await getMenu('http://config/menu.json')
    expect(menu.source).toBe('remote')
    expect(menu.items[0].label).toBe('遠端')
    expect(menu.flags.menuV2).toBe(true)
    expect(fetchFn).toHaveBeenCalledWith('http://config/menu.json', {
      next: { revalidate: 60, tags: [MENU_TAG] },
    })
  })

  it.each([
    ['HTTP 500', async () => new Response('boom', { status: 500 })],
    ['網路錯誤', async () => { throw new TypeError('fetch failed') }],
    ['格式錯誤', async () => Response.json({ version: 1, items: [] })],
    ['不是 JSON', async () => new Response('<html>', { status: 200 })],
  ])('%s 時回傳備援 menu', async (_name, impl) => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    mockFetch(impl as () => Promise<Response>)
    const menu = await getMenu('http://config/menu.json')
    expect(menu.source).toBe('fallback')
    expect(menu.items.map((i) => i.href)).toEqual(['/', '/orders', '/invoices'])
  })

  it('沒有設定網址時回傳備援 menu，且不呼叫 fetch', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const fetchFn = mockFetch(async () => Response.json(remote))
    const menu = await getMenu(undefined)
    expect(menu.source).toBe('fallback')
    expect(fetchFn).not.toHaveBeenCalled()
  })
})
