import { describe, expect, it } from 'vitest'
import { isActive, parseItems } from './items'

describe('parseItems', () => {
  it('取出合法項目，丟掉不合法的', () => {
    const data = {
      version: 1,
      items: [
        { label: '首頁', href: '/' },
        { label: '壞的', href: 'https://evil.com' },
        { label: '', href: '/x' },
        { label: '訂單', href: '/orders', children: [{ label: '全部', href: '/orders' }, { label: 'x', href: '//evil' }] },
      ],
    }
    expect(parseItems(data)).toEqual([
      { label: '首頁', href: '/' },
      { label: '訂單', href: '/orders', children: [{ label: '全部', href: '/orders' }] },
    ])
  })

  it.each([null, undefined, 1, 'x', {}, { items: 'x' }])('格式不對（%s）時回傳空陣列', (data) => {
    expect(parseItems(data)).toEqual([])
  })
})

describe('isActive', () => {
  it('與 build-time Menu 規則相同', () => {
    expect(isActive('/', '/')).toBe(true)
    expect(isActive('/orders', '/')).toBe(false)
    expect(isActive('/orders/1001', '/orders')).toBe(true)
    expect(isActive('/ordersX', '/orders')).toBe(false)
  })
})
