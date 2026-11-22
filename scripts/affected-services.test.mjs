import { describe, expect, it } from 'vitest'
import { servicesFromTurboLs } from './affected-services.mjs'

const ls = (...names) => ({ packageManager: 'pnpm', packages: { count: names.length, items: names.map((name) => ({ name, path: 'x' })) } })

describe('servicesFromTurboLs', () => {
  it('只改 invoice → 只部署 invoice', () => {
    expect(servicesFromTurboLs(ls('@repo/invoice'))).toEqual(['invoice'])
  })

  it('改 apps/order/**（含 runtime menu 的 apps/order/menu-runtime/）→ 只部署 order', () => {
    expect(servicesFromTurboLs(ls('@repo/order'))).toEqual(['order'])
  })

  it('改共用套件 → order、invoice 都部署（共用套件本身不是服務）', () => {
    expect(servicesFromTurboLs(ls('@repo/menu', '@repo/order', '@repo/invoice', '@repo/zone-inspector'))).toEqual(['order', 'invoice'])
  })

  it('只改 deploy/menu.json → 不部署任何服務', () => {
    expect(servicesFromTurboLs(ls('@repo/deploy'))).toEqual([])
  })

  it('不認得的套件（例如已移除的 config-server）不會變成部署目標', () => {
    expect(servicesFromTurboLs(ls('@repo/config-server', '@repo/menu-runtime'))).toEqual([])
  })

  it('格式不對時丟錯，避免誤判成「不需要部署」', () => {
    expect(() => servicesFromTurboLs({})).toThrow()
  })
})
