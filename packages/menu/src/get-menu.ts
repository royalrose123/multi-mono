import 'server-only'
import fallbackJson from './fallback-menu.json'
import { menuConfigSchema, type LoadedMenu } from './schema'

export const MENU_TAG = 'menu'

function fallback(reason: string): LoadedMenu {
  console.warn(`[menu] 改用備援 menu：${reason}`)
  return { ...menuConfigSchema.parse(fallbackJson), source: 'fallback' }
}

/**
 * 讀取 menu.json（快取 60 秒，tag 為 'menu'）。
 * 任何失敗都回傳打包在套件裡的備援 menu，畫面不會因為設定服務故障而壞掉。
 */
export async function getMenu(url: string | undefined = process.env.MENU_CONFIG_URL): Promise<LoadedMenu> {
  if (!url) return fallback('未設定 MENU_CONFIG_URL')
  try {
    const res = await fetch(url, { next: { revalidate: 60, tags: [MENU_TAG] } })
    if (!res.ok) return fallback(`HTTP ${res.status}`)
    const parsed = menuConfigSchema.safeParse(await res.json())
    if (!parsed.success) return fallback(`格式錯誤：${parsed.error.issues[0]?.message ?? 'unknown'}`)
    return { ...parsed.data, source: 'remote' }
  } catch (err) {
    return fallback(err instanceof Error ? err.message : String(err))
  }
}
