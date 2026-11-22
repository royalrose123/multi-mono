import { describe, expect, it } from 'vitest'
import { cn } from './cn'
import { formatCurrency, formatDate } from './format'

describe('format', () => {
  it('金額格式為 NT$ 加千分位、無小數', () => {
    expect(formatCurrency(1234)).toBe('NT$1,234')
    expect(formatCurrency(0)).toBe('NT$0')
  })

  it('日期格式為 YYYY/MM/DD（以台北時區）', () => {
    expect(formatDate('2026-11-01T00:00:00+08:00')).toBe('2026/11/01')
  })
})

describe('cn', () => {
  it('忽略 falsy 值並以空白連接', () => {
    expect(cn('a', false, null, undefined, 'b')).toBe('a b')
  })
})
