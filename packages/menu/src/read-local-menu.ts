import 'server-only'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { errorMessage, toLoadedMenu, validateMenu, type MenuResult } from './load-menu'
import type { LoadedMenu } from './schema'

/** MENU_FILE；沒設定時是 <repo>/deploy/menu.json（app 的工作目錄是 apps/<zone>）。 */
export function menuFilePath(): string {
  return process.env.MENU_FILE || path.resolve(process.cwd(), '../../deploy/menu.json')
}

/** 讀檔並驗證，不做備援（/api/menu 要把失敗回報成 503）。每次呼叫都重新讀檔。 */
export async function readMenuFile(file: string = menuFilePath()): Promise<MenuResult> {
  let text: string
  try {
    // 路徑在執行期才決定；告訴 bundler 不要追蹤，避免把整個專案納入 file tracing
    text = await readFile(/* turbopackIgnore: true */ /* webpackIgnore: true */ file, 'utf8')
  } catch (err) {
    return { ok: false, reason: `無法讀取 ${file}：${errorMessage(err)}` }
  }
  try {
    return validateMenu(JSON.parse(text))
  } catch (err) {
    return { ok: false, reason: `不是合法的 JSON：${errorMessage(err)}` }
  }
}

/**
 * order 用：每次請求直接讀 menu.json（不經 HTTP、不快取），改檔立即生效。
 * 失敗時回傳備援 menu 並標示 source: 'fallback'。
 */
export async function readLocalMenu(file?: string): Promise<LoadedMenu> {
  return toLoadedMenu(await readMenuFile(file))
}
