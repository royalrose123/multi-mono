export type Zone = 'order' | 'invoice'

export type MenuMode = 'build' | 'runtime'
export const MENU_MODE_COOKIE = 'menu-mode'

export function isInternalPath(path: string): boolean {
  return path.startsWith('/') && !path.startsWith('//') && !path.includes('\\')
}

function pathnameOf(path: string): string {
  return path.split(/[?#]/, 1)[0] || '/'
}

/** 路由表：/invoices 開頭屬於 invoice，其餘屬於 order。 */
export function zoneForPath(path: string): Zone {
  if (!isInternalPath(path)) throw new Error(`zoneForPath 只接受站內路徑，收到 "${path}"`)
  const pathname = pathnameOf(path)
  if (pathname === '/invoices' || pathname.startsWith('/invoices/')) return 'invoice'
  return 'order'
}

export function isActivePath(pathname: string, href: string): boolean {
  const target = pathnameOf(href)
  if (target === '/') return pathname === '/'
  return pathname === target || pathname.startsWith(`${target}/`)
}

export function parseMenuMode(value: string | undefined): MenuMode {
  return value === 'runtime' ? 'runtime' : 'build'
}
