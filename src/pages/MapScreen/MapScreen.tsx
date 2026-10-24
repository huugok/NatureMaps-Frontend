import { MapView } from '../../components/MapView'
import { Page } from '../../components/Page'
import { useApp } from '../../context/useApp'

/** Mapa real de Valencia. Los marcadores de plantas se añadirán como hijos de <MapView>. */
export function MapScreen() {
  const { t } = useApp()
  return (
    <Page title={t('map.title')} flush>
      <MapView />
    </Page>
  )
}
