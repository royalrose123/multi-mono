// 刻意不 import @repo/menu：runtime Menu 是獨立打包、獨立部署的產物。
export type RuntimeItem = { label: string; href: string; children?: RuntimeItem[] }

function isInternal(href: unknown): href is string {
  return typeof href === 'string' && href.startsWith('/') && !href.startsWith('//') && !href.includes('\\')
}

export function parseItems(data: unknown): RuntimeItem[] {
  const items = (data as { items?: unknown } | null | undefined)?.items
  if (!Array.isArray(items)) return []
  return items.flatMap((raw): RuntimeItem[] => {
    const item = raw as { label?: unknown; href?: unknown; children?: unknown }
    if (typeof item?.label !== 'string' || item.label === '' || !isInternal(item.href)) return []
    const children = Array.isArray(item.children) ? parseItems({ items: item.children }) : []
    return [{ label: item.label, href: item.href, ...(children.length ? { children } : {}) }]
  })
}

export function isActive(pathname: string, href: string): boolean {
  const target = href.split(/[?#]/, 1)[0] || '/'
  if (target === '/') return pathname === '/'
  return pathname === target || pathname.startsWith(`${target}/`)
}
