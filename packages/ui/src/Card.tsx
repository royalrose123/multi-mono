import type { ReactNode } from 'react'
import { cn } from './cn'

export function Card({ title, children, className }: { title?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn('rounded-card border border-slate-200 bg-white p-5 shadow-sm', className)}>
      {title ? <h2 className="mb-3 text-base font-semibold text-slate-900">{title}</h2> : null}
      {children}
    </section>
  )
}
