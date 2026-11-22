import { createServer } from 'node:http'
import path from 'node:path'
import { createHandler } from './handler.mjs'

const root = path.resolve(import.meta.dirname, '../../..')
const port = Number(process.env.PORT ?? 4000)
const menuFile = process.env.MENU_FILE ?? path.join(root, 'deploy/menu.json')
const runtimeDir = process.env.RUNTIME_DIR ?? path.join(root, 'packages/menu-runtime/dist')
const corsOrigin = process.env.CORS_ORIGIN ?? '*'

createServer(createHandler({ menuFile, runtimeDir, corsOrigin })).listen(port, () => {
  console.log(`[config-server] http://localhost:${port}  menu=${menuFile}  runtime=${runtimeDir}`)
})
