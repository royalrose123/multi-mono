import { readFileSync } from 'node:fs'
import path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const { readLocalMenu, readMenuFile } = await import('./read-local-menu')

const fixture = (name: string) => path.join(import.meta.dirname, '__fixtures__', name)
const FALLBACK_HREFS = ['/', '/orders', '/invoices']

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('readMenuFile', () => {
  it('合法檔案回傳 ok 與驗證後的 MenuConfig（不帶 source）', async () => {
    const result = await readMenuFile(fixture('valid-menu.json'))
    expect(result).toEqual({
      ok: true,
      menu: { version: 1, flags: { menuV2: true }, items: [{ label: '本機', href: '/orders' }] },
    })
  })

  it.each([
    ['檔案不存在', 'does-not-exist.json'],
    ['不是合法 JSON', 'broken-json.json'],
    ['格式不符 schema', 'bad-schema.json'],
  ])('%s 時回傳 ok: false 與原因', async (_name, file) => {
    const result = await readMenuFile(fixture(file))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).not.toBe('')
  })

  it('沒有指定檔案時讀 MENU_FILE', async () => {
    vi.stubEnv('MENU_FILE', fixture('valid-menu.json'))
    const result = await readMenuFile()
    expect(result.ok && result.menu.items[0].label).toBe('本機')
  })

  it('MENU_FILE 也沒設定時讀 <repo>/deploy/menu.json（相對於 app 的工作目錄 ../../）', async () => {
    vi.stubEnv('MENU_FILE', undefined)
    // vitest 在 packages/menu 執行，與 apps/order 同樣是 repo 下兩層
    const expected = JSON.parse(readFileSync(path.resolve(process.cwd(), '../../deploy/menu.json'), 'utf8'))
    const result = await readMenuFile()
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.menu.items).toEqual(expected.items)
  })
})

describe('readLocalMenu', () => {
  it('成功時回傳檔案內容，source 為 remote', async () => {
    const menu = await readLocalMenu(fixture('valid-menu.json'))
    expect(menu.source).toBe('remote')
    expect(menu.items[0].label).toBe('本機')
    expect(menu.flags.menuV2).toBe(true)
  })

  it.each(['does-not-exist.json', 'broken-json.json', 'bad-schema.json'])('%s → 回傳備援 menu 並標示 fallback', async (file) => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const menu = await readLocalMenu(fixture(file))
    expect(menu.source).toBe('fallback')
    expect(menu.items.map((i) => i.href)).toEqual(FALLBACK_HREFS)
    expect(warn).toHaveBeenCalled()
  })

  it('每次呼叫都重新讀檔（不快取）', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.stubEnv('MENU_FILE', fixture('valid-menu.json'))
    expect((await readLocalMenu()).source).toBe('remote')
    vi.stubEnv('MENU_FILE', fixture('broken-json.json'))
    expect((await readLocalMenu()).source).toBe('fallback')
  })
})
