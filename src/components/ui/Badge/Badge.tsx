import type { ReactNode } from 'react'
import { cn } from '../../../utils/cn'

export function Badge({ solid, children }: { solid?: boolean; children: ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex self-start rounded-full px-2.5 py-1 text-caption font-bold tracking-wide',
        solid ? 'bg-accent text-on-accent' : 'bg-accent-soft text-accent',
      )}
    >
      {children}
    </span>
  )
}
