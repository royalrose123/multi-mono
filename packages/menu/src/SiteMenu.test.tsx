import { render, screen, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import type { LoadedMenu } from './schema'

vi.mock('next/navigation', () => ({ usePathname: () => '/orders/1001' }))
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} data-next-link="" {...rest}>
      {children}
    </a>
  ),
}))

const { SiteMenu } = await import('./SiteMenu')

const menu = (menuV2: boolean): LoadedMenu => ({
  version: 1,
  flags: { menuV2 },
  source: 'remote',
  items: [
    { label: '首頁', href: '/' },
    { label: '訂單', href: '/orders' },
    { label: '發票', href: '/invoices' },
  ],
})

describe('SiteMenu', () => {
  it('依 flags.menuV2 切換樣式版本', () => {
    const { rerender } = render(<SiteMenu menu={menu(false)} currentZone="order" user={null} />)
    expect(screen.getByRole('navigation', { name: '主選單' }).dataset.menuVariant).toBe('v1')
    rerender(<SiteMenu menu={menu(true)} currentZone="order" user={null} />)
    expect(screen.getByRole('navigation', { name: '主選單' }).dataset.menuVariant).toBe('v2')
  })

  it('每個連結標記所屬 zone，同 zone 用 next/link、跨 zone 用 <a>', () => {
    render(<SiteMenu menu={menu(false)} currentZone="order" user={null} />)
    const nav = screen.getByRole('navigation', { name: '主選單' })
    const orders = within(nav).getByRole('link', { name: '訂單' })
    const invoices = within(nav).getByRole('link', { name: '發票' })
    expect(orders.dataset.zone).toBe('order')
    expect(orders.hasAttribute('data-next-link')).toBe(true)
    expect(invoices.dataset.zone).toBe('invoice')
    expect(invoices.hasAttribute('data-next-link')).toBe(false)
  })

  it('目前頁面標記 aria-current', () => {
    render(<SiteMenu menu={menu(false)} currentZone="order" user={null} />)
    expect(screen.getByRole('link', { name: '訂單' }).getAttribute('aria-current')).toBe('page')
    expect(screen.getByRole('link', { name: '首頁' }).getAttribute('aria-current')).toBeNull()
  })

  it('未登入顯示登入連結；登入後顯示名稱與 POST 到 /api/logout 的登出表單', () => {
    const { rerender } = render(<SiteMenu menu={menu(false)} currentZone="invoice" user={null} />)
    expect(screen.getByRole('link', { name: '登入' }).getAttribute('href')).toBe('/login')
    rerender(<SiteMenu menu={menu(false)} currentZone="invoice" user={{ name: 'Alice' }} />)
    expect(screen.getByText('Alice')).toBeTruthy()
    const form = screen.getByRole('button', { name: '登出' }).closest('form')!
    expect(form.getAttribute('method')).toBe('post')
    expect(form.getAttribute('action')).toBe('/api/logout')
  })
})
