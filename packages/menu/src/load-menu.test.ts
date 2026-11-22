import { describe, expect, it, vi } from 'vitest'
import { fallbackMenu, validateMenu } from './load-menu'

describe('validateMenu（getMenu 與 readLocalMenu 共用）', () => {
  it('合法資料回傳 ok 與套用預設值後的 MenuConfig', () => {
    expect(validateMenu({ version: 1, items: [{ label: 'A', href: '/a' }] })).toEqual({
      ok: true,
      menu: { version: 1, flags: { menuV2: false }, items: [{ label: 'A', href: '/a' }] },
    })
  })

  it.each([
    ['items 為空', { version: 1, items: [] }],
    ['外部連結', { version: 1, items: [{ label: 'x', href: 'https://evil.com' }] }],
    ['不是物件', 'x'],
  ])('%s → ok: false，原因以「格式錯誤」開頭', (_name, data) => {
    const result = validateMenu(data)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toMatch(/^格式錯誤：/)
  })
})

describe('fallbackMenu', () => {
  it('回傳打包在套件裡的備援 menu，source 為 fallback，並記錄原因', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const menu = fallbackMenu('測試原因')
    expect(menu.source).toBe('fallback')
    expect(menu.items.map((i) => i.href)).toEqual(['/', '/orders', '/invoices'])
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('測試原因'))
    warn.mockRestore()
  })
})
