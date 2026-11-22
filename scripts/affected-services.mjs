// workspace 套件 → docker compose 服務。沒有列在這裡的套件（共用套件、@repo/deploy）不是部署單位。
const SERVICES = [
  ['@repo/order', 'order'],
  ['@repo/invoice', 'invoice'],
  ['@repo/config-server', 'config-server'],
]

export function servicesFromTurboLs(json) {
  const items = json?.packages?.items
  if (!Array.isArray(items)) throw new Error('無法解析 turbo ls 的輸出：缺少 packages.items')
  const names = new Set(items.map((i) => i.name))
  return SERVICES.filter(([pkg]) => names.has(pkg)).map(([, service]) => service)
}
