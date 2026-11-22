import type { ReactNode } from 'react'
import { cn } from './cn'

export type Column<T> = { key: string; header: ReactNode; render: (row: T) => ReactNode; className?: string }

export function Table<T>({
  columns,
  rows,
  rowKey,
  empty = '沒有資料',
}: {
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T) => string
  empty?: ReactNode
}) {
  if (rows.length === 0) return <p className="py-6 text-center text-sm text-slate-500">{empty}</p>
  return (
    <div className="overflow-x-auto rounded-card border border-slate-200 bg-white">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-slate-600">
          <tr>
            {columns.map((c) => (
              <th key={c.key} scope="col" className={cn('px-4 py-3 font-medium', c.className)}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row) => (
            <tr key={rowKey(row)} className="hover:bg-slate-50">
              {columns.map((c) => (
                <td key={c.key} className={cn('px-4 py-3', c.className)}>
                  {c.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
