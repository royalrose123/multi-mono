import { NextResponse, type NextRequest } from 'next/server'
import { SESSION_COOKIE } from './cookie'
import { publicUrl } from './public-url'
import { verifySession } from './session'

export function createAuthMiddleware(options: { loginPath?: string } = {}) {
  const loginPath = options.loginPath ?? '/login'

  return async function middleware(request: NextRequest): Promise<NextResponse> {
    const token = request.cookies.get(SESSION_COOKIE)?.value
    const user = await verifySession(token, process.env.AUTH_SECRET ?? '')
    if (user) return NextResponse.next()

    const back = request.nextUrl.pathname + request.nextUrl.search
    const target = publicUrl(`${loginPath}?next=${encodeURIComponent(back)}`, request.headers, request.url)
    return NextResponse.redirect(target, 307)
  }
}
