import { describe, expect, it } from 'vitest'
import { publicUrl } from './public-url'

describe('publicUrl', () => {
  it('經過 order 的 rewrite 時，使用 x-forwarded-host', () => {
    const headers = new Headers({ host: 'invoice:3001', 'x-forwarded-host': 'localhost:8080' })
    const url = publicUrl('/login?next=%2Finvoices', headers, 'http://invoice:3001/invoices')
    expect(url.toString()).toBe('http://localhost:8080/login?next=%2Finvoices')
  })

  it('有 x-forwarded-proto 時使用它', () => {
    const headers = new Headers({ 'x-forwarded-host': 'shop.example.com', 'x-forwarded-proto': 'https' })
    expect(publicUrl('/login', headers, 'http://invoice:3001/x').toString()).toBe('https://shop.example.com/login')
  })

  it('多個值時取第一個', () => {
    const headers = new Headers({ 'x-forwarded-host': 'a.example.com, b.example.com' })
    expect(publicUrl('/', headers, 'http://invoice:3001/').host).toBe('a.example.com')
  })

  it('沒有轉發 header 時使用 request 本身的 origin', () => {
    expect(publicUrl('/login', new Headers(), 'http://localhost:3000/orders').toString()).toBe(
      'http://localhost:3000/login',
    )
  })
})
