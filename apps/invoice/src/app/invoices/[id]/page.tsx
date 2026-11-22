import { ZoneLink } from '@repo/menu'
import { Badge, buttonClassName, Card, formatCurrency, formatDate, PageHeader } from '@repo/ui'
import { notFound } from 'next/navigation'
import { findInvoice, statusLabel } from '@/data/invoices'

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const invoice = findInvoice(id)
  if (!invoice) notFound()

  return (
    <>
      <PageHeader
        title={`發票 ${invoice.id}`}
        description={`${invoice.buyer}・${formatDate(invoice.issuedAt)}`}
        actions={
          <>
            <ZoneLink href="/invoices" currentZone="invoice" className={buttonClassName('secondary')}>
              回到列表
            </ZoneLink>
            <ZoneLink href={`/orders/${invoice.orderId}`} currentZone="invoice" className={buttonClassName('primary')}>
              回到訂單
            </ZoneLink>
          </>
        }
      />
      <Card title="發票資訊">
        <dl className="grid grid-cols-[8rem_1fr] gap-y-2 text-sm">
          <dt className="text-slate-500">對應訂單</dt>
          <dd>{invoice.orderId}</dd>
          <dt className="text-slate-500">金額</dt>
          <dd className="font-semibold">{formatCurrency(invoice.amount)}</dd>
          <dt className="text-slate-500">狀態</dt>
          <dd>
            <Badge tone={statusLabel[invoice.status].tone}>{statusLabel[invoice.status].text}</Badge>
          </dd>
        </dl>
      </Card>
    </>
  )
}
