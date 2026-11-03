import { MapPin, Search as SearchIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { LocationPermissionPrompt, useLocationPermission } from '../../components/Location'
import { Page } from '../../components/Page'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'
import { Input } from '../../components/ui/Input'
import { useApp } from '../../context/useApp'
import { formatDistance } from '../../i18n/format'
import { fetchNearbyTrees, readNearbyRadius } from '../../services/nearby'
import type { NearbyPlant } from '../../services/nearby'

/**
 * Búsqueda. El catálogo completo filtrando por nombre llega con otra UT; hoy
 * la página muestra las plantas del inventario más cercanas al usuario
 * (`GET /trees/nearby`), ordenadas por distancia y con el radio de Ajustes.
 */
export function Search() {
  const { t, lang } = useApp()
  const [query, setQuery] = useState('')
  const { status, position, allow, deny, retry } = useLocationPermission()
  const [plants, setPlants] = useState<NearbyPlant[] | null>(null)

  useEffect(() => {
    if (status !== 'granted' || !position) return
    const controller = new AbortController()
    fetchNearbyTrees(
      { latitude: position.latitude, longitude: position.longitude, radius: readNearbyRadius(), limit: 100, lang },
      controller.signal,
    )
      .then((response) => {
        if (!controller.signal.aborted) setPlants(response.trees)
      })
      .catch(() => {
        if (!controller.signal.aborted) setPlants(null)
      })
    return () => controller.abort()
  }, [status, position, lang])

  // Mismo flujo que el mapa: primero el aviso de permiso, pantalla completa.
  if (status === 'prompt') {
    return <LocationPermissionPrompt onAllow={allow} onDeny={deny} />
  }

  return (
    <Page title={t('search.title')}>
      <Input icon={SearchIcon} type="search" value={query} placeholder={t('search.placeholder')} onChange={(e) => setQuery(e.target.value)} />

      {status === 'denied' ? (
        <EmptyState
          icon={MapPin}
          title={t('search.locationEmpty')}
          description={t('search.locationEmptyDesc')}
          action={<Button onClick={retry}>{t('search.activateLocation')}</Button>}
        />
      ) : plants === null ? (
        <div className="relative flex-1">
          <div className="pointer-events-none absolute inset-0 flex">
            <EmptyState icon={SearchIcon} title={t('search.empty')} description={t('search.emptyDesc')} />
          </div>
        </div>
      ) : plants.length === 0 ? (
        <div className="relative flex-1">
          <div className="pointer-events-none absolute inset-0 flex">
            <EmptyState icon={SearchIcon} title={t('search.nearbyEmpty')} description={t('search.nearbyDesc')} />
          </div>
        </div>
      ) : (
        <section aria-label={t('search.nearby')} className="mt-4">
          <h2 className="font-display text-heading text-ink">{t('search.nearby')}</h2>
          <p className="text-small text-muted mt-0.5">{t('search.nearbyDesc')}</p>
          <ul className="mt-3 overflow-hidden rounded-card bg-surface shadow-raised">
            {plants.map((plant) => (
              <li key={plant.id} className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 last:border-0">
                <span className="min-w-0">
                  <span className="block truncate text-body font-semibold text-ink">{plant.displayName}</span>
                  {plant.scientificName && plant.scientificName !== plant.displayName && (
                    <span className="block truncate text-small text-muted">{plant.scientificName}</span>
                  )}
                </span>
                <span className="shrink-0 text-small tabular-nums text-muted">{formatDistance(plant.distance, lang)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </Page>
  )
}
