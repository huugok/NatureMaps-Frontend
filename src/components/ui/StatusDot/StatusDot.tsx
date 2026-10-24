import type { ReactNode } from 'react'
import { cn } from '../../../utils/cn'

const dot = {
  ok: 'before:bg-green',
  error: 'before:bg-danger',
  idle: 'before:bg-muted-2',
}

export function StatusDot({ status, children }: { status: 'ok' | 'error' | 'idle'; children: ReactNode }) {
  return (
    <span
      data-status={status}
      className={cn('inline-flex items-center gap-1.5 text-small text-muted before:size-[9px] before:rounded-full', dot[status])}
    >
      {children}
    </span>
  )
}
