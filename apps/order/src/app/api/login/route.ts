import { safeNextPath, SESSION_COOKIE, sessionCookieOptions, signSession } from '@repo/auth'
import { NextResponse } from 'next/server'
import { authenticate } from '@/lib/users'

// 用相對路徑的 Location 回 303，瀏覽器會整頁跳轉；不論前面是 order 直連、Docker 還是 Front Door 都正確。
function seeOther(location: string): NextResponse {
  return new NextResponse(null, { status: 303, headers: { Location: location } })
}

export async function POST(request: Request) {
  const form = await request.formData()
  const next = safeNextPath(form.get('next'))
  const user = authenticate(String(form.get('username') ?? ''), String(form.get('password') ?? ''))
  if (!user) return seeOther(`/login?error=1&next=${encodeURIComponent(next)}`)

  const token = await signSession(user, process.env.AUTH_SECRET ?? '')
  const res = seeOther(next)
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions())
  return res
}
