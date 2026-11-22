import 'server-only'
import { cookies } from 'next/headers'
import { SESSION_COOKIE } from './cookie'
import { verifySession } from './session'

export async function getCurrentUser(): Promise<{ name: string } | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  const user = await verifySession(token, process.env.AUTH_SECRET ?? '')
  return user ? { name: user.name } : null
}
