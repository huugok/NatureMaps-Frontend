import { Leaf, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

interface Props {
  icon?: LucideIcon
  title: string
  description?: string
  /** Botón u otra acción opcional debajo del texto. */
  action?: ReactNode
}

/** Estado vacío: se usa mientras una lista no tiene datos reales. */
export function EmptyState({ icon: Icon = Leaf, title, description, action }: Props) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 py-8 text-center">
      <span className="mb-2 grid size-16 place-items-center rounded-panel bg-accent-soft text-accent">
        <Icon size={30} aria-hidden="true" />
      </span>
      <p className="text-heading font-bold">{title}</p>
      {description && <p className="max-w-[280px] text-small leading-normal text-muted">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  )
}
