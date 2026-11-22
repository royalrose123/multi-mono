import 'server-only'
import { menuFilePath, readMenuFile } from './read-local-menu'

const headers = { 'Cache-Control': 'no-store' }

/**
 * order 的 GET /api/menu：讀檔＋驗證。成功回 200 與 MenuConfig；檔案不存在或格式錯誤回 503。
 * 失敗時不回備援資料：invoice 與 runtime Menu 各自決定怎麼備援。
 */
export function createMenuApiHandler(getFile: () => string = menuFilePath) {
  return async function GET(): Promise<Response> {
    const result = await readMenuFile(getFile())
    if (!result.ok) {
      console.warn(`[menu] /api/menu 回 503：${result.reason}`)
      return Response.json({ error: 'menu.json 無法使用' }, { status: 503, headers })
    }
    return Response.json(result.menu, { headers })
  }
}
