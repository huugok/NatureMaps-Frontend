import type { LucideIcon } from 'lucide-react'
import type { ButtonHTMLAttributes } from 'react'
import { cn } from '../../../utils/cn'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon
  /** Texto para lectores de pantalla (obligatorio: el botón no tiene texto visible). */
  label: string
  variant?: 'default' | 'accent'
}

export function IconButton({ icon: Icon, label, variant = 'default', className, ...rest }: Props) {
  return (
    <button
      type="button"
      aria-label={label}
      className={cn(
        'grid size-9 shrink-0 place-items-center rounded-full border',
        variant === 'accent' ? 'border-accent bg-accent text-on-accent' : 'border-line bg-surface',
        className,
      )}
      {...rest}
    >
      <Icon size={17} strokeWidth={2.2} aria-hidden="true" />
    </button>
  )
}
