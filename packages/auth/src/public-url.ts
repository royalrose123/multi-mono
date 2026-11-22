function first(value: string | null): string | undefined {
  const v = value?.split(',')[0]?.trim()
  return v ? v : undefined
}

/**
 * 組出瀏覽器看得到的網址。
 * invoice 經 order 的 rewrite 轉發時，Host 會被改成 invoice 的內網位址，
 * 原本的 Host 只保留在 x-forwarded-host。
 */
export function publicUrl(path: string, headers: Headers, requestUrl: string): URL {
  const req = new URL(requestUrl)
  const host = first(headers.get('x-forwarded-host')) ?? req.host
  const proto = first(headers.get('x-forwarded-proto')) ?? req.protocol.replace(':', '')
  return new URL(path, `${proto}://${host}`)
}
