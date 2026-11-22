import { getCurrentUser } from '@repo/auth/server'
import { MENU_MODE_COOKIE, parseMenuMode, RuntimeMenuHost, SiteMenu } from '@repo/menu'
import { getMenu } from '@repo/menu/server'
import { ZoneInspector } from '@repo/zone-inspector'
import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import type { ReactNode } from 'react'
import './globals.css'

export const metadata: Metadata = { title: 'Order｜Order × Invoice Demo' }

export default async function RootLayout({ children }: { children: ReactNode }) {
  const [user, cookieStore] = await Promise.all([getCurrentUser(), cookies()])
  const menuMode = parseMenuMode(cookieStore.get(MENU_MODE_COOKIE)?.value)
  const menu = menuMode === 'build' ? await getMenu() : null

  return (
    <html lang="zh-Hant">
      <body className="min-h-screen bg-slate-50 pb-20 font-sans text-slate-900">
        <header>
          {menu ? (
            <SiteMenu menu={menu} currentZone="order" user={user} />
          ) : (
            <RuntimeMenuHost runtimeUrl={process.env.MENU_RUNTIME_URL ?? ''} currentZone="order" user={user} />
          )}
        </header>
        <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
        <ZoneInspector zone="order" menuMode={menuMode} menuSource={menu?.source ?? 'runtime'} />
      </body>
    </html>
  )
}
