import { ZoneLink } from '@repo/menu'
import { Badge, formatCurrency, formatDate, PageHeader, Table } from '@repo/ui'
import { invoices, statusLabel, type Invoice } from '@/data/invoices'

export default function InvoicesPage() {
  return (
    <>
      <PageHeader title="發票" description="由 invoice zone 提供（port 3001，經 order 轉發）。" />
      <Table<Invoice>
        rows={invoices}
        rowKey={(i) => i.id}
        columns={[
          {
            key: 'id',
            header: '發票號碼',
            render: (i) => (
              <ZoneLink href={`/invoices/${i.id}`} currentZone="invoice" className="font-medium text-zone underline">
                {i.id}
              </ZoneLink>
            ),
          },
          { key: 'buyer', header: '買受人', render: (i) => i.buyer },
          { key: 'date', header: '開立日期', render: (i) => formatDate(i.issuedAt) },
          { key: 'amount', header: '金額', render: (i) => formatCurrency(i.amount), className: 'text-right' },
          { key: 'status', header: '狀態', render: (i) => <Badge tone={statusLabel[i.status].tone}>{statusLabel[i.status].text}</Badge> },
        ]}
      />
    </>
  )
}
