import { ArrowLeft, Settings as SettingsIcon } from 'lucide-react'
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
  /** Callback de vuelta; si no se pasa, retrocede en el historial. */
  onBack?: () => void
  /** Acciones adicionales a la derecha de la cabecera. */
  actions?: ReactNode
  /** Muestra el acceso a Ajustes. Por defecto, sí. */
  settings?: boolean
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
export function Page({ title, subtitle, back, onBack, actions, settings = true, flush, children }: PageProps) {
  const { t } = useApp()
  const navigate = useNavigate()
  return (
    <div className={cn('flex min-h-full flex-col pt-[env(safe-area-inset-top)]', flush && 'h-full')}>
      <header className="flex items-center gap-3 px-4 pt-[calc(20px+var(--app-top-inset))] pb-4">
        {back && <IconButton icon={ArrowLeft} label={t('common.back')} onClick={onBack ?? (() => navigate(-1))} />}
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-title text-balance">{title}</h1>
          {subtitle && <p className="mt-0.5 text-small text-muted text-pretty">{subtitle}</p>}
        </div>
        {actions}
        {settings && (
          <IconButton
            icon={SettingsIcon}
            label={t('settings.title')}
            variant="accent"
            onClick={() => navigate('/ajustes')}
          />
        )}
      </header>
      <div className={cn('flex flex-1 flex-col', !flush && 'gap-3 px-4 pb-6')}>{children}</div>
    </div>
  )
}
