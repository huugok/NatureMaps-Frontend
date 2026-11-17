import { Search as SearchIcon, Sprout } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useLocationPermission } from '../../components/Location'
import { Page } from '../../components/Page'
import { EmptyState } from '../../components/ui/EmptyState'
import { Input } from '../../components/ui/Input'
import { useApp } from '../../context/useApp'
import { formatDistance, repairTextEncoding } from '../../i18n/format'
import { commonNameFor, getAllSpeciesList } from '../../services/ficha'
import type { FichaListItem } from '../../services/ficha'
import { fetchNearbyTrees } from '../../services/nearby'

interface SearchProps { onSelectSpecies?: (species: FichaListItem) => void }

interface SpeciesCardProps {
  species: FichaListItem
  lang: ReturnType<typeof useApp>['lang']
  distance?: number
}

function SpeciesThumbnail({ species }: Pick<SpeciesCardProps, 'species'>) {
  return (
    <span className="relative flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-card bg-accent-soft text-accent">
      <Sprout size={24} aria-hidden="true" />
      {species.image?.url && (
        <img
          src={species.image.url}
          alt=""
          loading="lazy"
          onError={(event) => { event.currentTarget.style.display = 'none' }}
          className="absolute inset-0 h-full w-full object-cover outline outline-1 -outline-offset-1 outline-black/10"
        />
      )}
    </span>
  )
}

function SpeciesResultNames({ species, lang, distance }: SpeciesCardProps) {
  const { t } = useApp()
  return (
    <span className="min-w-0">
      <span className="block truncate text-body font-semibold text-ink">{commonNameFor(species.names, lang) ?? repairTextEncoding(species.scientificName)}</span>
      <span className="block truncate text-small italic text-muted">{repairTextEncoding(species.scientificName)}</span>
      {distance !== undefined && (
        <span className="mt-1 block text-caption font-semibold tabular-nums text-muted">{t('search.distance', { distance: formatDistance(distance, lang) })}</span>
      )}
    </span>
  )
}

function normalizeSearch(value: string) {
  return repairTextEncoding(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase().trim()
}

/** Búsqueda del catálogo por nombre común o científico. */
export function Search({ onSelectSpecies }: SearchProps) {
  const { t, lang } = useApp()
  const [query, setQuery] = useState('')
  const { status: locationStatus, position, allow, deny, retry } = useLocationPermission()
  const [catalog, setCatalog] = useState<FichaListItem[] | null>(null)
  const [catalogFailed, setCatalogFailed] = useState(false)
  const [nearestDistanceBySpecies, setNearestDistanceBySpecies] = useState<Record<number, number>>({})

  useEffect(() => {
    let cancelled = false
    setCatalog(null)
    setCatalogFailed(false)
    getAllSpeciesList(lang)
      .then((items) => { if (!cancelled) setCatalog(items) })
      .catch(() => { if (!cancelled) { setCatalog([]); setCatalogFailed(true) } })
    return () => { cancelled = true }
  }, [lang])

  useEffect(() => {
    if (!position) {
      setNearestDistanceBySpecies({})
      return
    }
    const controller = new AbortController()
    fetchNearbyTrees({
      latitude: position.latitude,
      longitude: position.longitude,
      radius: 10_000,
      limit: 1000,
      lang: lang === 'va' ? 'ca' : lang,
    }, controller.signal)
      .then((response) => {
        if (controller.signal.aborted) return
        const distances: Record<number, number> = {}
        for (const plant of response.trees) {
          if (plant.speciesId === null) continue
          distances[plant.speciesId] = Math.min(distances[plant.speciesId] ?? Infinity, plant.distance)
        }
        setNearestDistanceBySpecies(distances)
      })
      .catch(() => {
        if (!controller.signal.aborted) setNearestDistanceBySpecies({})
      })
    return () => controller.abort()
  }, [position, lang])

  const normalizedQuery = normalizeSearch(query)
  const matches = catalog
    ? catalog.filter((item) => normalizeSearch([item.scientificName, ...item.names.map((name) => name.name)].join(' ')).includes(normalizedQuery))
    : []
  const orderedMatches = [...matches].sort((a, b) => {
    const distanceA = nearestDistanceBySpecies[a.id] ?? Infinity
    const distanceB = nearestDistanceBySpecies[b.id] ?? Infinity
    return distanceA - distanceB || commonNameFor(a.names, lang)?.localeCompare(commonNameFor(b.names, lang) ?? '', lang) || a.scientificName.localeCompare(b.scientificName)
  })

  return (
    <Page title={t('search.title')}>
      <Input icon={SearchIcon} type="search" value={query} placeholder={t('search.placeholder')} onChange={(e) => setQuery(e.target.value)} />

      {locationStatus === 'prompt' && (
        <section className="mt-3 rounded-card bg-surface p-3 shadow-raised" aria-label={t('search.locationOrder')}>
          <p className="text-small text-muted">{t('search.locationOrderDesc')}</p>
          <div className="mt-2 flex gap-2">
            <button type="button" onClick={allow} className="min-h-11 rounded-control bg-accent px-3 text-small font-semibold text-on-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">{t('location.allowButton')}</button>
            <button type="button" onClick={deny} className="min-h-11 rounded-control px-3 text-small font-semibold text-muted hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">{t('location.denyButton')}</button>
          </div>
        </section>
      )}
      {locationStatus === 'denied' && (
        <button type="button" onClick={retry} className="mt-3 text-left text-small font-medium text-accent underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">{t('search.locationRetry')}</button>
      )}

      {normalizedQuery && (
        <section className="mt-3" aria-label={t('search.results')}>
          {catalog === null ? <p role="status" className="p-3 text-small text-muted">{t('search.loading')}</p> : catalogFailed ? (
            <p role="status" className="rounded-card bg-surface p-4 text-small text-muted">{t('search.catalogError')}</p>
          ) : orderedMatches.length === 0 ? (
            <p role="status" className="rounded-card bg-surface p-4 text-small text-muted">{t('search.noResults')}</p>
          ) : (
            <ul className="overflow-hidden rounded-card bg-surface shadow-raised">
              {orderedMatches.map((species) => (
                <li key={species.id} className="border-b border-line last:border-0">
                  <button type="button" onClick={() => onSelectSpecies?.(species)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-accent-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                    <SpeciesThumbnail species={species} />
                    <SpeciesResultNames species={species} lang={lang} distance={nearestDistanceBySpecies[species.id]} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
      {!normalizedQuery && catalogFailed && (
        <p role="status" className="mt-3 rounded-card bg-surface p-4 text-small text-muted">{t('search.catalogError')}</p>
      )}
      {!normalizedQuery && catalog === null && (
        <p role="status" className="mt-3 p-3 text-small text-muted">{t('search.loading')}</p>
      )}
      {!normalizedQuery && catalog !== null && !catalogFailed && orderedMatches.length === 0 && (
        <div className="relative flex-1">
          <div className="pointer-events-none absolute inset-0 flex">
            <EmptyState icon={SearchIcon} title={t('search.noResults')} description={t('search.emptyDesc')} />
          </div>
        </div>
      )}
      {!normalizedQuery && catalog !== null && !catalogFailed && orderedMatches.length > 0 && (
        <div className="relative flex-1">
          <ul className="mt-3 overflow-hidden rounded-card bg-surface shadow-raised">
            {orderedMatches.map((species) => (
              <li key={species.id} className="border-b border-line last:border-0">
                <button type="button" onClick={() => onSelectSpecies?.(species)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-accent-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                  <SpeciesThumbnail species={species} />
                  <SpeciesResultNames species={species} lang={lang} distance={nearestDistanceBySpecies[species.id]} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Page>
  )
}
