// 為每個 app 從 .env.example 建立 .env.local（已存在則不覆蓋）。
import { copyFileSync, existsSync } from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
for (const app of ['order', 'invoice']) {
  const example = path.join(root, 'apps', app, '.env.example')
  const local = path.join(root, 'apps', app, '.env.local')
  if (!existsSync(example)) {
    console.log(`略過 ${app}：找不到 .env.example`)
    continue
  }
  if (existsSync(local)) {
    console.log(`保留 apps/${app}/.env.local（已存在）`)
    continue
  }
  copyFileSync(example, local)
  console.log(`已建立 apps/${app}/.env.local`)
}
