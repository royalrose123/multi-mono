import { safeNextPath } from '@repo/auth'
import { Button, Card, PageHeader } from '@repo/ui'

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams
  const nextPath = safeNextPath(next)
  const input = 'mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-zone focus:outline-none'

  return (
    <div className="mx-auto max-w-sm">
      <PageHeader title="登入" description="demo 帳號：alice / alice123" />
      <Card>
        {/* 一般 HTML form POST，不用 Server Action：登入後可能要跳到另一個 zone，必須整頁跳轉。 */}
        <form method="post" action="/api/login" className="space-y-4">
          <input type="hidden" name="next" value={nextPath} />
          <label className="block text-sm">
            帳號
            <input name="username" autoComplete="username" required className={input} />
          </label>
          <label className="block text-sm">
            密碼
            <input name="password" type="password" autoComplete="current-password" required className={input} />
          </label>
          {error ? (
            <p role="alert" className="text-sm text-red-600">
              帳號或密碼錯誤
            </p>
          ) : null}
          <Button type="submit" className="w-full">
            登入
          </Button>
        </form>
      </Card>
    </div>
  )
}
