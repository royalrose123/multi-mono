'use client'

import { useEffect, useRef, useState } from 'react'

// module 層級：soft navigation 時 module 不會重新執行，整頁載入時才會歸零。
let softNavCount = 0

export function resetNavigationTracker(): void {
  softNavCount = 0
}

export function useNavigationTracker(pathname: string) {
  const previous = useRef(pathname)
  const [state, setState] = useState<{ softNavCount: number; lastEvent: 'full-load' | 'soft-nav' }>(() => ({
    softNavCount,
    lastEvent: 'full-load',
  }))
  const [loadedAt, setLoadedAt] = useState<number | null>(null)

  useEffect(() => {
    setLoadedAt(Math.round(performance.timeOrigin))
  }, [])

  useEffect(() => {
    if (previous.current === pathname) return
    previous.current = pathname
    softNavCount += 1
    setState({ softNavCount, lastEvent: 'soft-nav' })
  }, [pathname])

  return { ...state, loadedAt }
}
