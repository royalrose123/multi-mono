'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { createNavigate } from './runtime-navigate'
import type { MenuUser } from './SiteMenu'
import type { Zone } from './zones'

export type RuntimeMenuElement = HTMLElement & {
  currentZone: Zone
  pathname: string
  user: MenuUser
  navigate: (href: string) => void
}

type Status = 'loading' | 'ready' | 'error'

/**
 * 在瀏覽器端載入 order 提供的 runtime Menu（Web Component），並把 host 的狀態傳給它。
 * 這是對照組：沒有 SSR，載入前只顯示佔位框。
 */
export function RuntimeMenuHost({ runtimeUrl, currentZone, user }: { runtimeUrl: string; currentZone: Zone; user: MenuUser }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const elementRef = useRef<RuntimeMenuElement | null>(null)
  const [status, setStatus] = useState<Status>('loading')
  const router = useRouter()
  const pathname = usePathname() ?? '/'

  useEffect(() => {
    let cancelled = false
    setStatus('loading')
    import(/* webpackIgnore: true */ runtimeUrl)
      .then(() => customElements.whenDefined('runtime-site-menu'))
      .then(() => {
        if (cancelled || !containerRef.current) return
        const el = document.createElement('runtime-site-menu') as RuntimeMenuElement
        containerRef.current.replaceChildren(el)
        elementRef.current = el
        setStatus('ready')
      })
      .catch((err) => {
        console.error('[runtime-menu] 載入失敗', err)
        if (!cancelled) setStatus('error')
      })
    return () => {
      cancelled = true
      elementRef.current?.remove()
      elementRef.current = null
    }
  }, [runtimeUrl])

  useEffect(() => {
    const el = elementRef.current
    if (!el) return
    el.currentZone = currentZone
    el.user = user
    el.navigate = createNavigate(currentZone, (href) => router.push(href), (href) => window.location.assign(href))
    el.pathname = pathname
  }, [status, currentZone, user, pathname, router])

  return (
    <div data-menu="runtime" data-status={status}>
      {status === 'loading' ? <div aria-label="選單載入中" className="h-14 animate-pulse border-b border-slate-200 bg-slate-100" /> : null}
      {status === 'error' ? (
        <div role="alert" className="border-b border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          選單載入失敗：無法取得 runtime menu
        </div>
      ) : null}
      <div ref={containerRef} />
    </div>
  )
}
