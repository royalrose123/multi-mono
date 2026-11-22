import { getCurrentUser } from '@repo/auth/server'
import { MENU_MODE_COOKIE, parseMenuMode, RUNTIME_MENU_SRC, RuntimeMenuHost, SiteMenu } from '@repo/menu'
import { readLocalMenu } from '@repo/menu/server'
import { ZoneInspector } from '@repo/zone-inspector'
import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import type { ReactNode } from 'react'
import './globals.css'

export const metadata: Metadata = { title: 'Order｜Order × Invoice Demo' }

export default async function RootLayout({ children }: { children: ReactNode }) {
  const [user, cookieStore] = await Promise.all([getCurrentUser(), cookies()])
  const menuMode = parseMenuMode(cookieStore.get(MENU_MODE_COOKIE)?.value)
  // order 每次請求直接讀 menu.json（MENU_FILE），改檔立即生效
  const menu = menuMode === 'build' ? await readLocalMenu() : null

  return (
    <html lang="zh-Hant">
      <body className="min-h-screen bg-slate-50 pb-20 font-sans text-slate-900">
        <header>
          {menu ? (
            <SiteMenu menu={menu} currentZone="order" user={user} />
          ) : (
            <RuntimeMenuHost runtimeUrl={RUNTIME_MENU_SRC} currentZone="order" user={user} />
          )}
        </header>
        <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
        <ZoneInspector zone="order" menuMode={menuMode} menuSource={menu?.source ?? 'runtime'} />
      </body>
    </html>
  )
}
