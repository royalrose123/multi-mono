import { ZoneLink } from '@repo/menu'
import { Card, PageHeader } from '@repo/ui'

export default function HomePage() {
  return (
    <>
      <PageHeader title="Order × Invoice Multi-Zones Demo" description="order 與 invoice 是兩個各自部署的 Next.js app，透過 Multi-Zones 組成同一個網站。" />
      <div className="grid gap-4 md:grid-cols-2">
        <Card title="試試看">
          <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-700">
            <li>
              用 <code>alice / alice123</code>{' '}
              <ZoneLink href="/login?next=%2Forders" currentZone="order" className="text-zone underline">
                登入
              </ZoneLink>
              。
            </li>
            <li>在「訂單」列表與明細之間切換：底部工具列的 soft navigation 次數會增加，整頁載入時間不變。</li>
            <li>在訂單明細按「查看發票」：會整頁載入到 invoice，工具列變成綠色、次數歸零。</li>
            <li>按工具列的「切換成 runtime menu」，比較兩種 Menu 的差異。</li>
          </ol>
        </Card>
        <Card title="這個 demo 展示什麼">
          <ul className="list-disc space-y-2 pl-5 text-sm text-slate-700">
            <li>order 用 rewrites 把 <code>/invoices/*</code> 轉給 invoice。</li>
            <li>共用 Menu、設計系統、登入狀態（同網域 cookie）。</li>
            <li>Menu 內容放在 <code>menu.json</code>，改了不用部署任何 app。</li>
          </ul>
        </Card>
      </div>
    </>
  )
}
