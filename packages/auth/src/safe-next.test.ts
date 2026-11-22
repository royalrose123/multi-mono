import { describe, expect, it } from 'vitest'
import { safeNextPath } from './safe-next'

describe('safeNextPath', () => {
  it.each([
    ['/orders', '/orders'],
    ['/invoices/INV-1001?tab=items#top', '/invoices/INV-1001?tab=items#top'],
    ['/', '/'],
  ])('接受站內路徑 %s', (input, expected) => {
    expect(safeNextPath(input)).toBe(expected)
  })

  it.each([
    ['//evil.com'],
    ['https://evil.com'],
    ['/\\evil.com'],
    ['/\t/evil.com'],
    ['/..//evil.com'],
    ['/.//evil.com'],
    ['/a/..//evil.com'],
    ['/%2e%2e//evil.com'],
    ['javascript:alert(1)'],
    ['orders'],
    [''],
    [undefined],
    [null],
    [123],
  ])('拒絕 %s，回傳 /', (input) => {
    expect(safeNextPath(input)).toBe('/')
  })
})
