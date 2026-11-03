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
        'grid size-11 shrink-0 place-items-center rounded-full transition-[transform,background-color,box-shadow] active:scale-95 disabled:pointer-events-none disabled:bg-line disabled:text-muted-2 disabled:shadow-none',
        variant === 'accent'
          ? 'bg-accent text-on-accent hover:brightness-95'
          : 'bg-surface shadow-raised hover:bg-surface-2',
        className,
      )}
      {...rest}
    >
      <Icon size={18} strokeWidth={2.2} aria-hidden="true" />
    </button>
  )
}
