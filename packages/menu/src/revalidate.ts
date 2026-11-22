import 'server-only'
import { revalidateTag } from 'next/cache'
import { MENU_TAG } from './get-menu'

export function createRevalidateMenuHandler(getToken: () => string | undefined = () => process.env.REVALIDATE_TOKEN) {
  return async function POST(request: Request): Promise<Response> {
    const token = getToken()
    if (!token || request.headers.get('authorization') !== `Bearer ${token}`) {
      return Response.json({ error: 'unauthorized' }, { status: 401 })
    }
    revalidateTag(MENU_TAG)
    return Response.json({ revalidated: true })
  }
}
