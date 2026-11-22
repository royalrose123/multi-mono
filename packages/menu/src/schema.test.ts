import { describe, expect, it } from 'vitest'
import { menuConfigSchema } from './schema'

const valid = {
  version: 1,
  flags: { menuV2: true },
  items: [{ label: '訂單', href: '/orders', children: [{ label: '全部', href: '/orders' }] }],
}

describe('menuConfigSchema', () => {
  it('接受合法資料', () => {
    expect(menuConfigSchema.parse(valid)).toEqual(valid)
  })

  it('沒有 flags 時預設 menuV2 = false', () => {
    const parsed = menuConfigSchema.parse({ version: 1, items: valid.items })
    expect(parsed.flags.menuV2).toBe(false)
  })

  it('忽略未知欄位（為 expand / contract 預留）', () => {
    const parsed = menuConfigSchema.parse({ ...valid, extra: 1, items: [{ label: 'A', href: '/', icon: 'x' }] })
    expect(parsed).not.toHaveProperty('extra')
    expect(parsed.items[0]).toEqual({ label: 'A', href: '/' })
  })

  it.each([
    ['缺 items', { version: 1 }],
    ['items 為空', { version: 1, items: [] }],
    ['href 不是站內路徑', { version: 1, items: [{ label: 'X', href: 'https://evil.com' }] }],
    ['label 為空', { version: 1, items: [{ label: '', href: '/' }] }],
    ['version 不對', { version: 2, items: [{ label: 'A', href: '/' }] }],
  ])('拒絕：%s', (_name, input) => {
    expect(menuConfigSchema.safeParse(input).success).toBe(false)
  })
})
