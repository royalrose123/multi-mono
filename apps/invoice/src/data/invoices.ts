export type InvoiceStatus = 'issued' | 'paid'

export type Invoice = {
  id: string
  orderId: string
  buyer: string
  issuedAt: string
  amount: number
  status: InvoiceStatus
}

export const invoices: Invoice[] = [
  { id: 'INV-1001', orderId: '1001', buyer: '王小明', issuedAt: '2026-11-01T18:00:00+08:00', amount: 3900, status: 'paid' },
  { id: 'INV-1002', orderId: '1002', buyer: '陳美玲', issuedAt: '2026-11-03T18:00:00+08:00', amount: 8900, status: 'paid' },
  { id: 'INV-1003', orderId: '1003', buyer: '林志豪', issuedAt: '2026-11-08T18:00:00+08:00', amount: 3360, status: 'issued' },
  { id: 'INV-1004', orderId: '1004', buyer: '張雅婷', issuedAt: '2026-11-12T18:00:00+08:00', amount: 6990, status: 'paid' },
]

export function findInvoice(id: string): Invoice | undefined {
  return invoices.find((i) => i.id === id)
}

export const statusLabel: Record<InvoiceStatus, { text: string; tone: 'info' | 'success' }> = {
  issued: { text: '已開立', tone: 'info' },
  paid: { text: '已收款', tone: 'success' },
}
