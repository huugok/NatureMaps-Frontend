import type { LucideIcon } from 'lucide-react'
import type { InputHTMLAttributes } from 'react'

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  icon?: LucideIcon
}

export function Input({ icon: Icon, ...rest }: Props) {
  return (
    <label className="flex items-center gap-2 rounded-card border-[1.5px] border-line bg-surface px-3.5 py-3 text-muted focus-within:border-accent focus-within:text-accent">
      {Icon && <Icon size={17} strokeWidth={2} aria-hidden="true" />}
      <input className="min-w-0 flex-1 border-none bg-transparent text-body text-ink outline-none" {...rest} />
    </label>
  )
}
