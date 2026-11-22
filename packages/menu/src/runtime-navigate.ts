import { isInternalPath, zoneForPath, type Zone } from './zones'

/** runtime Menu 沒辦法使用 next/link，由 host 決定 soft 或 hard navigation。 */
export function createNavigate(
  currentZone: Zone,
  push: (href: string) => void,
  assign: (href: string) => void,
): (href: string) => void {
  return (href) => {
    if (!isInternalPath(href)) return
    if (zoneForPath(href) === currentZone) push(href)
    else assign(href)
  }
}
