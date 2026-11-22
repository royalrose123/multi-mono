import { MenuItemLink } from './MenuItemLink'
import type { LoadedMenu } from './schema'
import { ZoneLink } from './ZoneLink'
import type { Zone } from './zones'

export type MenuUser = { name: string } | null

const containers = {
  v1: 'flex flex-wrap items-center gap-4 border-b border-slate-200 bg-white px-4 py-3 sm:px-6',
  v2: 'm-3 flex flex-wrap items-center gap-3 rounded-full bg-slate-900 px-4 py-2 text-white shadow-lg',
} as const

export function SiteMenu({ menu, currentZone, user }: { menu: LoadedMenu; currentZone: Zone; user: MenuUser }) {
  const variant = menu.flags.menuV2 ? 'v2' : 'v1'
  return (
    <nav aria-label="主選單" data-menu="build" data-menu-variant={variant} className={containers[variant]}>
      <span className="font-semibold">Order × Invoice</span>
      <ul className="flex flex-1 flex-wrap items-center gap-1">
        {menu.items.map((item) => (
          <li key={item.href} className="group relative">
            <MenuItemLink item={item} currentZone={currentZone} variant={variant} />
            {item.children?.length ? (
              <ul className="absolute left-0 top-full z-10 hidden min-w-40 rounded-md border border-slate-200 bg-white p-1 text-slate-800 shadow group-hover:block">
                {item.children.map((child) => (
                  <li key={child.href}>
                    <MenuItemLink item={child} currentZone={currentZone} variant="v1" />
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        ))}
      </ul>
      <div className="flex items-center gap-3 text-sm">
        {user ? (
          <>
            <span>{user.name}</span>
            <form method="post" action="/api/logout">
              <button type="submit" className="rounded-md border border-current px-3 py-1 hover:opacity-80">
                登出
              </button>
            </form>
          </>
        ) : (
          <ZoneLink href="/login" currentZone={currentZone} className="rounded-md border border-current px-3 py-1 hover:opacity-80">
            登入
          </ZoneLink>
        )}
      </div>
    </nav>
  )
}
