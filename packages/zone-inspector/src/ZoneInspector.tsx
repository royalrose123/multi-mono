'use client'

import { MENU_MODE_COOKIE, type MenuMode, type Zone } from '@repo/menu/zones'
import { usePathname } from 'next/navigation'
import { useNavigationTracker } from './useNavigationTracker'

const zoneLabel: Record<Zone, string> = { order: 'order（主網站）', invoice: 'invoice' }
const sourceLabel = { remote: 'build-time（menu.json）', fallback: 'build-time（備援資料）', runtime: 'runtime（瀏覽器載入）' } as const

function formatTime(ms: number | null): string {
  if (ms === null) return '—'
  return new Date(ms).toLocaleTimeString('zh-TW', { hour12: false })
}

export function ZoneInspector({
  zone,
  menuMode,
  menuSource,
}: {
  zone: Zone
  menuMode: MenuMode
  menuSource: 'remote' | 'fallback' | 'runtime'
}) {
  const pathname = usePathname() ?? '/'
  const { softNavCount, lastEvent, loadedAt } = useNavigationTracker(pathname)
  const nextMode: MenuMode = menuMode === 'build' ? 'runtime' : 'build'

  function switchMenu() {
    document.cookie = `${MENU_MODE_COOKIE}=${nextMode}; path=/; max-age=31536000; samesite=lax`
    window.location.reload()
  }

  return (
    <aside
      data-testid="zone-inspector"
      data-zone={zone}
      data-soft-nav-count={softNavCount}
      data-loaded-at={loadedAt ?? ''}
      data-last-event={lastEvent}
      data-menu-mode={menuMode}
      data-menu-source={menuSource}
      className="fixed inset-x-0 bottom-0 z-50 flex flex-wrap items-center gap-x-5 gap-y-1 border-t-4 border-zone bg-slate-900 px-4 py-2 text-xs text-slate-100"
    >
      <span className="flex items-center gap-2 font-semibold">
        <span className="size-2.5 rounded-full bg-zone" aria-hidden />
        目前 zone：{zoneLabel[zone]}
      </span>
      <span>整頁載入：{formatTime(loadedAt)}</span>
      <span>soft navigation：{softNavCount} 次</span>
      <span key={`${lastEvent}-${softNavCount}`} className="animate-pulse rounded bg-white/10 px-2 py-0.5">
        最近一次：{lastEvent === 'soft-nav' ? 'soft navigation' : '整頁載入'}
      </span>
      <span>Menu：{sourceLabel[menuSource]}</span>
      <button type="button" onClick={switchMenu} className="ml-auto rounded border border-white/30 px-2 py-1 hover:bg-white/10">
        {nextMode === 'runtime' ? '切換成 runtime menu' : '切換成 build-time menu'}
      </button>
    </aside>
  )
}
