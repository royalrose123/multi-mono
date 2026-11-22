export type OrderStatus = 'pending' | 'paid' | 'shipped'

export type Order = {
  id: string
  customer: string
  createdAt: string
  status: OrderStatus
  invoiceId: string | null
  items: { name: string; qty: number; price: number }[]
}

export const orders: Order[] = [
  { id: '1001', customer: '王小明', createdAt: '2026-11-01T10:20:00+08:00', status: 'shipped', invoiceId: 'INV-1001', items: [{ name: '機械鍵盤', qty: 1, price: 3200 }, { name: '滑鼠墊', qty: 2, price: 350 }] },
  { id: '1002', customer: '陳美玲', createdAt: '2026-11-03T14:05:00+08:00', status: 'paid', invoiceId: 'INV-1002', items: [{ name: '27 吋螢幕', qty: 1, price: 8900 }] },
  { id: '1003', customer: '林志豪', createdAt: '2026-11-08T09:40:00+08:00', status: 'paid', invoiceId: 'INV-1003', items: [{ name: 'USB-C 擴充座', qty: 1, price: 2490 }, { name: '傳輸線', qty: 3, price: 290 }] },
  { id: '1004', customer: '張雅婷', createdAt: '2026-11-12T16:30:00+08:00', status: 'shipped', invoiceId: 'INV-1004', items: [{ name: '降噪耳機', qty: 1, price: 6990 }] },
  { id: '1005', customer: '黃建國', createdAt: '2026-11-20T11:15:00+08:00', status: 'pending', invoiceId: null, items: [{ name: '筆電支架', qty: 1, price: 1280 }] },
]

export function orderTotal(order: Order): number {
  return order.items.reduce((sum, i) => sum + i.qty * i.price, 0)
}

export function findOrder(id: string): Order | undefined {
  return orders.find((o) => o.id === id)
}

export const statusLabel: Record<OrderStatus, { text: string; tone: 'warning' | 'info' | 'success' }> = {
  pending: { text: '待付款', tone: 'warning' },
  paid: { text: '已付款', tone: 'info' },
  shipped: { text: '已出貨', tone: 'success' },
}
