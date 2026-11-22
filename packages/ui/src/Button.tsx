import type { ComponentProps } from 'react'
import { cn } from './cn'

type Variant = 'primary' | 'secondary'

export function buttonClassName(variant: Variant = 'primary'): string {
  return cn(
    'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zone',
    variant === 'primary' && 'bg-zone text-white hover:opacity-90',
    variant === 'secondary' && 'border border-slate-300 bg-white text-slate-800 hover:bg-slate-50',
  )
}

export function Button({ variant = 'primary', className, ...props }: ComponentProps<'button'> & { variant?: Variant }) {
  return <button className={cn(buttonClassName(variant), className)} {...props} />
}
