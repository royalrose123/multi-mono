import { describe, expect, it } from 'vitest'
import { SESSION_TTL_SECONDS, signSession, verifySession } from './session'

const SECRET = 'test-secret-test-secret-test-secret-0000'
const OTHER = 'other-secret-other-secret-other-secret-00'
const alice = { sub: 'u-alice', name: 'Alice' }

describe('session', () => {
  it('簽發後可以驗證回同一個使用者', async () => {
    const token = await signSession(alice, SECRET)
    await expect(verifySession(token, SECRET)).resolves.toEqual(alice)
  })

  it('過期的 token 驗證失敗', async () => {
    const issuedAt = Date.UTC(2026, 0, 1)
    const token = await signSession(alice, SECRET, issuedAt)
    const later = issuedAt + (SESSION_TTL_SECONDS + 1) * 1000
    await expect(verifySession(token, SECRET, later)).resolves.toBeNull()
  })

  it('被竄改的 token 驗證失敗', async () => {
    const token = await signSession(alice, SECRET)
    const [h, p, s] = token.split('.')
    const tampered = `${h}.${p}x.${s}`
    await expect(verifySession(tampered, SECRET)).resolves.toBeNull()
  })

  it('用不同金鑰驗證失敗', async () => {
    const token = await signSession(alice, SECRET)
    await expect(verifySession(token, OTHER)).resolves.toBeNull()
  })

  it('沒有 token 時回傳 null', async () => {
    await expect(verifySession(undefined, SECRET)).resolves.toBeNull()
  })

  it('金鑰少於 32 字元時直接丟錯（避免設定錯誤被靜默吞掉）', async () => {
    await expect(verifySession('a.b.c', 'short')).rejects.toThrow('AUTH_SECRET')
    await expect(signSession(alice, '')).rejects.toThrow('AUTH_SECRET')
  })
})
