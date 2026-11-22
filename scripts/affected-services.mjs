// workspace 套件 → docker compose 服務。沒有列在這裡的套件（共用套件、@repo/deploy）不是部署單位。
// runtime menu 在 apps/order/menu-runtime/，屬於 @repo/order，隨 order 部署。
const SERVICES = [
  ['@repo/order', 'order'],
  ['@repo/invoice', 'invoice'],
]

export function servicesFromTurboLs(json) {
  const items = json?.packages?.items
  if (!Array.isArray(items)) throw new Error('無法解析 turbo ls 的輸出：缺少 packages.items')
  const names = new Set(items.map((i) => i.name))
  return SERVICES.filter(([pkg]) => names.has(pkg)).map(([, service]) => service)
}
