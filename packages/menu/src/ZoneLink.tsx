import Link from 'next/link'
import type { ComponentProps } from 'react'
import { zoneForPath, type Zone } from './zones'

type Props = Omit<ComponentProps<'a'>, 'href'> & { href: string; currentZone: Zone }

/** 同 zone 用 next/link（soft navigation），跨 zone 用 <a>（整頁載入）。 */
export function ZoneLink({ href, currentZone, children, ...rest }: Props) {
  if (zoneForPath(href) === currentZone) {
    return (
      <Link href={href} {...rest}>
        {children}
      </Link>
    )
  }
  return (
    <a href={href} {...rest}>
      {children}
    </a>
  )
}
