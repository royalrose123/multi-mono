import 'server-only'
import { errorMessage, fallbackMenu, toLoadedMenu, validateMenu } from './load-menu'
import type { LoadedMenu } from './schema'

export const MENU_TAG = 'menu'

/**
 * invoice 用：向 order 的 /api/menu 取得 menu（快取 60 秒，tag 為 'menu'）。
 * 任何失敗都回傳打包在套件裡的備援 menu，畫面不會因為 order 的 API 故障而壞掉。
 */
export async function getMenu(url: string | undefined = process.env.MENU_CONFIG_URL): Promise<LoadedMenu> {
  if (!url) return fallbackMenu('未設定 MENU_CONFIG_URL')
  try {
    const res = await fetch(url, { next: { revalidate: 60, tags: [MENU_TAG] } })
    if (!res.ok) return fallbackMenu(`HTTP ${res.status}`)
    return toLoadedMenu(validateMenu(await res.json()))
  } catch (err) {
    return fallbackMenu(errorMessage(err))
  }
}
