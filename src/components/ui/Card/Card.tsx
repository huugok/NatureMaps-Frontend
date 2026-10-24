import type { HTMLAttributes } from 'react'
import { cn } from '../../../utils/cn'

interface Props extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'accent'
}

export function Card({ variant = 'default', className, ...rest }: Props) {
  return (
    <div
      className={cn(
        'rounded-card p-4',
        variant === 'accent'
          ? 'bg-linear-to-br from-accent to-accent-2 text-on-accent'
          : 'border border-line bg-surface',
        className,
      )}
      {...rest}
    />
  )
}
