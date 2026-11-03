import { MapView } from '../../components/MapView'
import { Page } from '../../components/Page'

/** Mapa real de Valencia. Los marcadores de plantas se añadirán como hijos de <MapView>. */
export function MapScreen() {
  return (
    <Page title="Mapa" flush>
      <MapView />
    </Page>
  )
}
