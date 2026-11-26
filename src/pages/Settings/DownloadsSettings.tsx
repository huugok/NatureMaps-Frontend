import { Page } from '../../components/Page'
import { DownloadedRoutes } from '../../components/OfflineRoute'
import { useApp } from '../../context/useApp'

export interface DownloadsSettingsProps {
  /** Vuelve a la pantalla principal de Ajustes. */
  onBack: () => void
}

/** Lista de rutas descargadas accesible desde Ajustes. La descarga y su
 * contenido pertenecen a NM-14; aquí solo se consultan y se abren. */
export function DownloadsSettings({ onBack }: DownloadsSettingsProps) {
  const { t } = useApp()
  return (
    <Page title={t('settings.downloads')} back onBack={onBack} settings={false}>
      <p className="mb-4 text-small text-muted text-pretty">{t('settings.downloadsDesc')}</p>
      <DownloadedRoutes emptyMessage="routeOffline.downloadsEmpty" />
    </Page>
  )
}
