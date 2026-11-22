import { describe, expect, it } from 'vitest'
import { isActivePath, isInternalPath, parseMenuMode, zoneForPath } from './zones'

describe('zoneForPath', () => {
  it.each([
    ['/', 'order'],
    ['/orders', 'order'],
    ['/orders/1001', 'order'],
    ['/login?next=%2Finvoices', 'order'],
    ['/invoicesX', 'order'],
    ['/invoices', 'invoice'],
    ['/invoices/INV-1001', 'invoice'],
    ['/invoices?page=2', 'invoice'],
    ['/invoices#top', 'invoice'],
  ] as const)('%s 屬於 %s', (path, zone) => {
    expect(zoneForPath(path)).toBe(zone)
  })

  it('非站內路徑直接丟錯', () => {
    expect(() => zoneForPath('https://evil.com')).toThrow()
    expect(() => zoneForPath('//evil.com')).toThrow()
  })
})

describe('isInternalPath', () => {
  it('只接受單一斜線開頭且沒有反斜線的路徑', () => {
    expect(isInternalPath('/orders')).toBe(true)
    expect(isInternalPath('//evil.com')).toBe(false)
    expect(isInternalPath('/\\evil.com')).toBe(false)
    expect(isInternalPath('orders')).toBe(false)
  })
})

describe('isActivePath', () => {
  it('首頁只有在 / 時才算目前頁面', () => {
    expect(isActivePath('/', '/')).toBe(true)
    expect(isActivePath('/orders', '/')).toBe(false)
  })

  it('子路徑也算目前頁面，但相似前綴不算', () => {
    expect(isActivePath('/orders', '/orders')).toBe(true)
    expect(isActivePath('/orders/1001', '/orders')).toBe(true)
    expect(isActivePath('/ordersX', '/orders')).toBe(false)
  })

  it('忽略 href 的 query', () => {
    expect(isActivePath('/orders', '/orders?e2e=1')).toBe(true)
  })
})

describe('parseMenuMode', () => {
  it('只有 runtime 會被視為 runtime，其他都是 build', () => {
    expect(parseMenuMode('runtime')).toBe('runtime')
    expect(parseMenuMode('build')).toBe('build')
    expect(parseMenuMode(undefined)).toBe('build')
    expect(parseMenuMode('xxx')).toBe('build')
  })
})
