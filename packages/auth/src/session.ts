import { SignJWT, jwtVerify } from 'jose'

export type SessionUser = { sub: string; name: string }

export const SESSION_TTL_SECONDS = 60 * 60 * 8

function keyFrom(secret: string): Uint8Array {
  if (!secret || secret.length < 32) {
    throw new Error('AUTH_SECRET 未設定或少於 32 個字元')
  }
  return new TextEncoder().encode(secret)
}

export async function signSession(user: SessionUser, secret: string, now = Date.now()): Promise<string> {
  const key = keyFrom(secret)
  const iat = Math.floor(now / 1000)
  return new SignJWT({ name: user.name })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.sub)
    .setIssuedAt(iat)
    .setExpirationTime(iat + SESSION_TTL_SECONDS)
    .sign(key)
}

export async function verifySession(
  token: string | undefined,
  secret: string,
  now = Date.now(),
): Promise<SessionUser | null> {
  const key = keyFrom(secret)
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, key, {
      algorithms: ['HS256'],
      currentDate: new Date(now),
    })
    if (typeof payload.sub !== 'string' || typeof payload.name !== 'string') return null
    return { sub: payload.sub, name: payload.name }
  } catch {
    return null
  }
}
