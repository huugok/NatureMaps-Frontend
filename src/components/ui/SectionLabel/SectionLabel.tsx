import type { ReactNode } from 'react'

/** Título pequeño en mayúsculas que separa bloques dentro de una pantalla. */
export function SectionLabel({ children }: { children: ReactNode }) {
  return <p className="mt-3 text-caption font-semibold uppercase tracking-wider text-muted">{children}</p>
}
