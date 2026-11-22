import { ZoneLink } from '@repo/menu'
import { Badge, formatCurrency, formatDate, PageHeader, Table } from '@repo/ui'
import { orders, orderTotal, statusLabel, type Order } from '@/data/orders'

export default function OrdersPage() {
  return (
    <>
      <PageHeader title="訂單" description="點訂單編號查看明細（同一個 zone，soft navigation）。" />
      <Table<Order>
        rows={orders}
        rowKey={(o) => o.id}
        columns={[
          {
            key: 'id',
            header: '訂單編號',
            render: (o) => (
              <ZoneLink href={`/orders/${o.id}`} currentZone="order" className="font-medium text-zone underline">
                {o.id}
              </ZoneLink>
            ),
          },
          { key: 'customer', header: '客戶', render: (o) => o.customer },
          { key: 'date', header: '日期', render: (o) => formatDate(o.createdAt) },
          { key: 'total', header: '金額', render: (o) => formatCurrency(orderTotal(o)), className: 'text-right' },
          { key: 'status', header: '狀態', render: (o) => <Badge tone={statusLabel[o.status].tone}>{statusLabel[o.status].text}</Badge> },
        ]}
      />
    </>
  )
}
