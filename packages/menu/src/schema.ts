import { z } from 'zod'
import { isInternalPath } from './zones'

const href = z.string().refine(isInternalPath, { message: 'href 必須是站內路徑（以單一 / 開頭）' })

const leafItem = z.object({ label: z.string().min(1), href })

export const menuItemSchema = leafItem.extend({ children: z.array(leafItem).optional() })

export const menuConfigSchema = z.object({
  version: z.literal(1),
  flags: z.object({ menuV2: z.boolean().default(false) }).default({ menuV2: false }),
  items: z.array(menuItemSchema).min(1),
})

export type MenuItem = z.infer<typeof menuItemSchema>
export type MenuConfig = z.infer<typeof menuConfigSchema>
export type MenuSource = 'remote' | 'fallback'
export type LoadedMenu = MenuConfig & { source: MenuSource }
