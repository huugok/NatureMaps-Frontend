import { ArrowLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../context/useApp'
import { cn } from '../../utils/cn'
import { IconButton } from '../ui/IconButton'

export interface PageProps {
  title: string
  subtitle?: string
  /** Muestra la flecha de volver. */
  back?: boolean
  /** Botones a la derecha de la cabecera. */
  actions?: ReactNode
  /** Contenido a ancho completo sin márgenes (p. ej. un mapa). */
  flush?: boolean
  children: ReactNode
}

/**
 * Plantilla común de TODAS las pantallas: cabecera + cuerpo.
 * Una pantalla nueva empieza siempre así:
 *
 *   <Page title="Mi pantalla" back>
 *     ...contenido...
 *   </Page>
 */
export function Page({ title, subtitle, back, actions, flush, children }: PageProps) {
  const navigate = useNavigate()
  const { t } = useApp()
  return (
    <div className={cn('flex min-h-full flex-col pt-[env(safe-area-inset-top)]', flush && 'h-full')}>
      <header className="flex items-center gap-3 px-5 pt-5 pb-4">
        {back && <IconButton icon={ArrowLeft} label={t('common.back')} onClick={() => navigate(-1)} />}
        <div className="min-w-0 flex-1">
          <h1 className="text-title leading-tight font-bold">{title}</h1>
          {subtitle && <p className="mt-0.5 text-small text-muted">{subtitle}</p>}
        </div>
        {actions}
      </header>
      <div className={cn('flex flex-1 flex-col', !flush && 'gap-3 px-5 pb-6')}>{children}</div>
    </div>
  )
}
