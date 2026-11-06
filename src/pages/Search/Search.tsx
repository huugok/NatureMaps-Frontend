import { ChevronDown, MapPin, Search as SearchIcon } from 'lucide-react'
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
import { groupBySpecies } from '../../services/plantGroups'

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
    // Misma regla de tres que el mapa: 100 plantas por cada 1000 m de radio.
    const nearbyRadius = readNearbyRadius()
    fetchNearbyTrees(
      {
        latitude: position.latitude,
        longitude: position.longitude,
        radius: nearbyRadius,
        limit: Math.max(1, Math.round(nearbyRadius / 10)),
        lang,
      },
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
          {/* Misma agrupación que el mapa (RF2): una especie cercana, un
              desplegable; dentro, cada ejemplar con su distancia. La lista
              llega ordenada por distancia del backend, así que la primera
              especie es siempre la más cercana. */}
          <ul className="mt-3 overflow-hidden rounded-card bg-surface shadow-raised">
            {groupBySpecies(plants).map((group) => (
              <li key={group.name} className="border-b border-line last:border-0">
                <details className="group">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-accent-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent [&::-webkit-details-marker]:hidden">
                    <span className="min-w-0">
                      <span className="block truncate text-body font-semibold text-ink">{group.name}</span>
                      {group.specimens[0].scientificName && group.specimens[0].scientificName !== group.name && (
                        <span className="block truncate text-small text-muted">{group.specimens[0].scientificName}</span>
                      )}
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-accent px-1.5 text-caption tabular-nums text-on-accent">
                        {group.specimens.length}
                      </span>
                      <span className="text-small tabular-nums text-muted">{formatDistance(group.specimens[0].distance, lang)}</span>
                      <ChevronDown size={16} aria-hidden="true" className="text-muted transition-transform group-open:rotate-180" />
                    </span>
                  </summary>
                  <ul className="border-t border-line bg-surface-2">
                    {group.specimens.map((specimen) => (
                      <li key={specimen.id} className="flex items-center justify-between gap-3 border-b border-line px-4 py-2 pl-8 last:border-0">
                        <span className="min-w-0 truncate text-small text-ink">
                          {specimen.scientificName ?? specimen.displayName}
                        </span>
                        <span className="shrink-0 text-small tabular-nums text-muted">{formatDistance(specimen.distance, lang)}</span>
                      </li>
                    ))}
                  </ul>
                </details>
              </li>
            ))}
          </ul>
        </section>
      )}
    </Page>
  )
}
