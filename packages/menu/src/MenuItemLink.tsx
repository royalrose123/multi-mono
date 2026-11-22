'use client'

import { usePathname } from 'next/navigation'
import type { MenuItem } from './schema'
import { ZoneLink } from './ZoneLink'
import { isActivePath, zoneForPath, type Zone } from './zones'

const styles = {
  v1: {
    base: 'rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900',
    active: 'bg-slate-100 text-zone',
  },
  v2: {
    base: 'rounded-full px-4 py-1.5 text-sm font-medium text-slate-200 hover:bg-white/10',
    active: 'bg-white text-slate-900',
  },
} as const

export function MenuItemLink({ item, currentZone, variant }: { item: Pick<MenuItem, 'label' | 'href'>; currentZone: Zone; variant: 'v1' | 'v2' }) {
  const pathname = usePathname() ?? '/'
  const active = isActivePath(pathname, item.href)
  const s = styles[variant]
  return (
    <ZoneLink
      href={item.href}
      currentZone={currentZone}
      data-zone={zoneForPath(item.href)}
      aria-current={active ? 'page' : undefined}
      className={active ? `${s.base} ${s.active}` : s.base}
    >
      {item.label}
    </ZoneLink>
  )
}
