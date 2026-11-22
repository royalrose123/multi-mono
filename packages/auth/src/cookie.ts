import { SESSION_TTL_SECONDS } from './session'

export const SESSION_COOKIE = 'session'

export function sessionCookieOptions(env: NodeJS.ProcessEnv = process.env) {
  return {
    httpOnly: true as const,
    path: '/' as const,
    sameSite: 'lax' as const,
    maxAge: SESSION_TTL_SECONDS,
    secure: env.NODE_ENV === 'production' && env.COOKIE_SECURE === '1',
  }
}
