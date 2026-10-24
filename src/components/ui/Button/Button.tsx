import type { LucideIcon } from 'lucide-react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '../../../utils/cn'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'md' | 'sm'
  block?: boolean
  icon?: LucideIcon
  /** Si se pasa, el botón navega a esa ruta (se renderiza como enlace). */
  to?: string
  children: ReactNode
}

const variants = {
  primary: 'bg-accent text-on-accent',
  secondary: 'border-[1.5px] border-line bg-surface text-accent',
  ghost: 'text-accent',
}

export function Button({ variant = 'primary', size = 'md', block, icon: Icon, to, className, children, ...rest }: ButtonProps) {
  const small = size === 'sm'
  const cls = cn(
    'inline-flex items-center justify-center gap-2 font-semibold transition active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50',
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
    return (
      <Link to={to} className={cls}>
        {content}
      </Link>
    )
  }
  return (
    <button type="button" className={cls} {...rest}>
      {content}
    </button>
  )
}
