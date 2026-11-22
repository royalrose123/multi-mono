import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { resetNavigationTracker, useNavigationTracker } from './useNavigationTracker'

describe('useNavigationTracker', () => {
  beforeEach(() => resetNavigationTracker())

  it('首次掛載視為整頁載入，次數為 0，並記錄載入時間', async () => {
    const { result } = renderHook(({ p }) => useNavigationTracker(p), { initialProps: { p: '/orders' } })
    await act(async () => {})
    expect(result.current.softNavCount).toBe(0)
    expect(result.current.lastEvent).toBe('full-load')
    expect(result.current.loadedAt).toBe(Math.round(performance.timeOrigin))
  })

  it('pathname 改變時次數 +1，且標記為 soft navigation', () => {
    const { result, rerender } = renderHook(({ p }) => useNavigationTracker(p), { initialProps: { p: '/orders' } })
    rerender({ p: '/orders/1001' })
    expect(result.current.softNavCount).toBe(1)
    expect(result.current.lastEvent).toBe('soft-nav')
    rerender({ p: '/' })
    expect(result.current.softNavCount).toBe(2)
  })

  it('pathname 沒變（例如 StrictMode 重跑 effect）時不增加次數', () => {
    const { result, rerender } = renderHook(({ p }) => useNavigationTracker(p), {
      initialProps: { p: '/orders' },
      reactStrictMode: true,
    })
    rerender({ p: '/orders' })
    expect(result.current.softNavCount).toBe(0)
  })
})
