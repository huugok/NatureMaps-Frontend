import type { LucideIcon } from 'lucide-react'
import type { ButtonHTMLAttributes, MouseEvent, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '../../../utils/cn'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'md' | 'sm'
  block?: boolean
  icon?: LucideIcon
  /**
   * Si se pasa, el botón navega a esa ruta (se renderiza como enlace).
   * `onClick` se conserva; `disabled` desactiva la navegación y `type`/props
   * de formulario no aplican.
   */
  to?: string
  children: ReactNode
}

const variants = {
  primary: 'bg-accent text-on-accent shadow-raised hover:brightness-95',
  secondary: 'bg-surface text-accent shadow-raised hover:bg-surface-2',
  ghost: 'text-accent hover:bg-accent-soft',
}

export function Button({ variant = 'primary', size = 'md', block, icon: Icon, to, className, children, onClick, ...rest }: ButtonProps) {
  const small = size === 'sm'
  const cls = cn(
    'inline-flex items-center justify-center gap-2 font-semibold transition active:scale-[0.97] disabled:pointer-events-none disabled:bg-line disabled:text-muted-2 disabled:shadow-none',
    variants[variant],
    small ? 'rounded-control py-2 text-small' : 'rounded-card py-3.5 text-body',
    variant === 'ghost' ? 'px-2' : small ? 'px-3.5' : 'px-5',
    block && 'w-full',
    className,
  )
  const content = (
    <>
      {Icon && <Icon size={small ? 16 : 18} aria-hidden="true" />}
      {children}
    </>
  )
  if (to) {
    const disabled = rest.disabled === true
    return (
      <Link
        to={to}
        className={cls}
        aria-disabled={disabled || undefined}
        tabIndex={disabled ? -1 : undefined}
        onClick={(event) => {
          if (disabled) {
            event.preventDefault()
            return
          }
          onClick?.(event as unknown as MouseEvent<HTMLButtonElement>)
        }}
      >
        {content}
      </Link>
    )
  }
  return (
    <button type="button" className={cls} onClick={onClick} {...rest}>
      {content}
    </button>
  )
}
