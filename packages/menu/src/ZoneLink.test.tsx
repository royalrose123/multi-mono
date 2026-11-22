import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} data-next-link="" {...rest}>
      {children}
    </a>
  ),
}))

const { ZoneLink } = await import('./ZoneLink')

describe('ZoneLink', () => {
  it('同 zone 用 next/link（soft navigation）', () => {
    render(<ZoneLink href="/orders/1001" currentZone="order">訂單</ZoneLink>)
    expect(screen.getByRole('link', { name: '訂單' }).hasAttribute('data-next-link')).toBe(true)
  })

  it('跨 zone 用一般 <a>（整頁載入）', () => {
    render(<ZoneLink href="/invoices/INV-1001" currentZone="order">發票</ZoneLink>)
    const link = screen.getByRole('link', { name: '發票' })
    expect(link.hasAttribute('data-next-link')).toBe(false)
    expect(link.getAttribute('href')).toBe('/invoices/INV-1001')
  })

  it('從 invoice 連回 order 也是一般 <a>', () => {
    render(<ZoneLink href="/orders/1001" currentZone="invoice" className="x">回到訂單</ZoneLink>)
    const link = screen.getByRole('link', { name: '回到訂單' })
    expect(link.hasAttribute('data-next-link')).toBe(false)
    expect(link.className).toBe('x')
  })
})
