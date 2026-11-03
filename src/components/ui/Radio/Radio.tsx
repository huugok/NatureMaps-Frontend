import { cn } from '../../../utils/cn'

/** Indicador visual de selección (decorativo: el control accesible es el ListItem que lo contiene). */
export function Radio({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden="true"
      data-checked={checked}
      className={cn(
        'relative size-5 shrink-0 rounded-full border-2',
        checked ? 'border-accent after:absolute after:inset-[3px] after:rounded-full after:bg-accent' : 'border-[#d8d8d2]',
      )}
    />
  )
}
