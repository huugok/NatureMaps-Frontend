import type { HTMLAttributes } from 'react'
import { cn } from '../../../utils/cn'

/** Contenedor vertical de <ListItem>. Acepta role (p. ej. "radiogroup"). */
export function List({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col gap-2', className)} {...rest} />
}
