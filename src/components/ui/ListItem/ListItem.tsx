import { ChevronRight, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '../../../utils/cn'

interface Props {
  title: string
  subtitle?: string
  icon?: LucideIcon
  /** Navega a esta ruta al pulsar. */
  to?: string
  onClick?: () => void
  /** Contenido a la derecha (switch, badge…). Si no hay y es pulsable, muestra una flecha. */
  trailing?: ReactNode
  selected?: boolean
}

export function ListItem({ title, subtitle, icon: Icon, to, onClick, trailing, selected }: Props) {
  const cls = cn(
    'flex w-full items-center gap-3 rounded-card bg-surface p-3 text-left',
    selected ? 'border-2 border-accent' : 'border border-line',
  )
  const clickable = Boolean(to || onClick)
  const inner = (
    <>
      {Icon && (
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
          <Icon size={20} aria-hidden="true" />
        </span>
      )}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-body font-semibold">{title}</span>
        {subtitle && <span className="text-small text-muted">{subtitle}</span>}
      </span>
      <span className="flex items-center text-muted-2">
        {trailing ?? (clickable && <ChevronRight size={14} strokeWidth={2.4} aria-hidden="true" />)}
      </span>
    </>
  )
  if (to)
    return (
      <Link to={to} className={cls}>
        {inner}
      </Link>
    )
  if (onClick)
    return (
      <button type="button" className={cls} onClick={onClick} aria-pressed={selected}>
        {inner}
      </button>
    )
  return <div className={cls}>{inner}</div>
}
