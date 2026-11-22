// getMenu（HTTP）與 readLocalMenu（讀檔）共用的「驗證＋備援」邏輯。
import fallbackJson from './fallback-menu.json'
import { menuConfigSchema, type LoadedMenu, type MenuConfig } from './schema'

export type MenuResult = { ok: true; menu: MenuConfig } | { ok: false; reason: string }

export function validateMenu(data: unknown): MenuResult {
  const parsed = menuConfigSchema.safeParse(data)
  if (!parsed.success) return { ok: false, reason: `格式錯誤：${parsed.error.issues[0]?.message ?? 'unknown'}` }
  return { ok: true, menu: parsed.data }
}

export function fallbackMenu(reason: string): LoadedMenu {
  console.warn(`[menu] 改用備援 menu：${reason}`)
  return { ...menuConfigSchema.parse(fallbackJson), source: 'fallback' }
}

export function toLoadedMenu(result: MenuResult): LoadedMenu {
  return result.ok ? { ...result.menu, source: 'remote' } : fallbackMenu(result.reason)
}

export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}
