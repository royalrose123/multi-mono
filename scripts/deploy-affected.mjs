// 用 Turborepo 找出受影響的服務，只重新 build 與部署它們。
// 用法：pnpm deploy:affected [--dry-run]
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { servicesFromTurboLs } from './affected-services.mjs'

const root = path.resolve(import.meta.dirname, '..')
const dryRun = process.argv.includes('--dry-run')

const output = execFileSync('pnpm', ['exec', 'turbo', 'ls', '--affected', '--output', 'json'], { cwd: root, encoding: 'utf8' })
const json = JSON.parse(output.slice(output.indexOf('{')))
const affected = json.packages.items.map((i) => i.name)
const services = servicesFromTurboLs(json)

console.log(`受影響的套件：${affected.length ? affected.join('、') : '（無）'}`)
if (services.length === 0) {
  console.log('不需要部署任何服務。')
  process.exit(0)
}
console.log(`要部署的服務：${services.join('、')}`)
if (dryRun) process.exit(0)

execFileSync('docker', ['compose', 'up', '-d', '--build', '--no-deps', ...services], { cwd: root, stdio: 'inherit' })
