import type { ReactNode } from 'react'
import { cn } from '../../../utils/cn'

interface Props {
  active?: boolean
  onClick?: () => void
  children: ReactNode
}

export function Chip({ active, onClick, children }: Props) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-3.25 py-1.75 text-small font-medium',
        active ? 'border-accent bg-accent text-on-accent' : 'border-line bg-surface text-muted',
      )}
    >
      {children}
    </button>
  )
}
