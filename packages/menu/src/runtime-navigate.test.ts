import { describe, expect, it, vi } from 'vitest'
import { createNavigate } from './runtime-navigate'

describe('createNavigate', () => {
  it('同 zone 呼叫 router.push（soft navigation）', () => {
    const push = vi.fn()
    const assign = vi.fn()
    createNavigate('order', push, assign)('/orders/1001')
    expect(push).toHaveBeenCalledWith('/orders/1001')
    expect(assign).not.toHaveBeenCalled()
  })

  it('跨 zone 呼叫 location.assign（整頁載入）', () => {
    const push = vi.fn()
    const assign = vi.fn()
    createNavigate('order', push, assign)('/invoices')
    expect(assign).toHaveBeenCalledWith('/invoices')
    expect(push).not.toHaveBeenCalled()
  })

  it('非站內路徑一律忽略', () => {
    const push = vi.fn()
    const assign = vi.fn()
    createNavigate('order', push, assign)('https://evil.com')
    expect(push).not.toHaveBeenCalled()
    expect(assign).not.toHaveBeenCalled()
  })
})
