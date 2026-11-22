import { ZoneLink } from '@repo/menu'
import { Badge, buttonClassName, Card, formatCurrency, formatDate, PageHeader, Table } from '@repo/ui'
import { notFound } from 'next/navigation'
import { findOrder, orderTotal, statusLabel } from '@/data/orders'

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const order = findOrder(id)
  if (!order) notFound()

  return (
    <>
      <PageHeader
        title={`訂單 ${order.id}`}
        description={`${order.customer}・${formatDate(order.createdAt)}`}
        actions={
          <>
            <ZoneLink href="/orders" currentZone="order" className={buttonClassName('secondary')}>
              回到列表
            </ZoneLink>
            {order.invoiceId ? (
              <ZoneLink href={`/invoices/${order.invoiceId}`} currentZone="order" className={buttonClassName('primary')}>
                查看發票
              </ZoneLink>
            ) : null}
          </>
        }
      />
      <div className="grid gap-4 md:grid-cols-3">
        <Card title="狀態">
          <Badge tone={statusLabel[order.status].tone}>{statusLabel[order.status].text}</Badge>
          <p className="mt-3 text-sm text-slate-600">發票：{order.invoiceId ?? <Badge tone="warning">尚未開立</Badge>}</p>
        </Card>
        <Card title="品項" className="md:col-span-2">
          <Table
            rows={order.items}
            rowKey={(i) => i.name}
            columns={[
              { key: 'name', header: '品名', render: (i) => i.name },
              { key: 'qty', header: '數量', render: (i) => i.qty, className: 'text-right' },
              { key: 'subtotal', header: '小計', render: (i) => formatCurrency(i.qty * i.price), className: 'text-right' },
            ]}
          />
          <p className="mt-3 text-right font-semibold">合計 {formatCurrency(orderTotal(order))}</p>
        </Card>
      </div>
    </>
  )
}
