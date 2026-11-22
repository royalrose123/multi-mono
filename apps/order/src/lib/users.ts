import type { SessionUser } from '@repo/auth'

// demo 帳號，不得用於正式環境
const USERS = [{ sub: 'u-alice', name: 'Alice', username: 'alice', password: 'alice123' }]

export function authenticate(username: string, password: string): SessionUser | null {
  const user = USERS.find((u) => u.username === username && u.password === password)
  return user ? { sub: user.sub, name: user.name } : null
}
