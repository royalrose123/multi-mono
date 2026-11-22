import { useEffect, useState, type MouseEvent } from 'react'
import { isActive, parseItems, type RuntimeItem } from './items'

export type RuntimeMenuProps = {
  menuUrl: string
  pathname?: string
  user?: { name: string } | null
  navigate?: (href: string) => void
}

export function RuntimeMenu({ menuUrl, pathname = '/', user = null, navigate }: RuntimeMenuProps) {
  const [items, setItems] = useState<RuntimeItem[] | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch(menuUrl)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((data) => !cancelled && setItems(parseItems(data)))
      .catch(() => !cancelled && setFailed(true))
    return () => {
      cancelled = true
    }
  }, [menuUrl])

  function onClick(event: MouseEvent<HTMLAnchorElement>, href: string) {
    if (!navigate || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    navigate(href)
  }

  const link = (item: RuntimeItem) => (
    <a
      href={item.href}
      className={isActive(pathname, item.href) ? 'link active' : 'link'}
      aria-current={isActive(pathname, item.href) ? 'page' : undefined}
      onClick={(e) => onClick(e, item.href)}
    >
      {item.label}
    </a>
  )

  return (
    <nav aria-label="主選單" data-menu="runtime-element" className="menu">
      <span className="brand">Order × Invoice</span>
      <span className="tag">runtime</span>
      <ul className="items">
        {failed ? <li className="error">無法讀取 menu.json</li> : null}
        {items?.map((item) => (
          <li key={item.href}>{link(item)}</li>
        ))}
      </ul>
      <div className="user">
        {user ? (
          <>
            <span>{user.name}</span>
            <form method="post" action="/api/logout">
              <button type="submit" className="button">登出</button>
            </form>
          </>
        ) : (
          <a href="/login" className="button" onClick={(e) => onClick(e, '/login')}>
            登入
          </a>
        )}
      </div>
    </nav>
  )
}
