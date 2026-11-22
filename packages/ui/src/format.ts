const currency = new Intl.NumberFormat('zh-TW', { maximumFractionDigits: 0 })
const date = new Intl.DateTimeFormat('zh-TW', {
  timeZone: 'Asia/Taipei',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

export function formatCurrency(amount: number): string {
  return `NT$${currency.format(amount)}`
}

export function formatDate(iso: string): string {
  const parts = Object.fromEntries(date.formatToParts(new Date(iso)).map((p) => [p.type, p.value]))
  return `${parts.year}/${parts.month}/${parts.day}`
}
