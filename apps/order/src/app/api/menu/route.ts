import { createMenuApiHandler } from '@repo/menu/server'

// 每次請求都讀 menu.json（invoice 與 runtime Menu 都從這裡拿資料），不得被靜態化或快取
export const dynamic = 'force-dynamic'

export const GET = createMenuApiHandler()
