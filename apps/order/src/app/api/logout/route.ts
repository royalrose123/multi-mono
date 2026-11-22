import { SESSION_COOKIE, sessionCookieOptions } from '@repo/auth'
import { NextResponse } from 'next/server'

export async function POST() {
  const res = new NextResponse(null, { status: 303, headers: { Location: '/' } })
  res.cookies.set(SESSION_COOKIE, '', { ...sessionCookieOptions(), maxAge: 0 })
  return res
}
