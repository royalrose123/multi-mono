const BASE = 'http://internal.invalid'

/** 只接受站內相對路徑，其他一律回傳 '/'，避免 open redirect。 */
export function safeNextPath(input: unknown): string {
  if (typeof input !== 'string' || input === '') return '/'
  if (!input.startsWith('/') || input.startsWith('//') || input.includes('\\')) return '/'
  try {
    const url = new URL(input, BASE)
    if (url.origin !== BASE) return '/'
    const normalized = url.pathname + url.search + url.hash
    // 正規化（dot-segment）後可能變成 //host，需再檢查一次
    if (normalized.startsWith('//') || normalized.includes('\\')) return '/'
    return normalized
  } catch {
    return '/'
  }
}
