import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { LocateFixed, MapPinOff, Search, X } from 'lucide-react';
import { useApp } from '../../context/useApp';
import { LocationPermissionPrompt, useLocationPermission } from '../../components/Location';
import { formatDistance } from '../../i18n/format';
import { fetchNearbyTrees, readNearbyRadius } from '../../services/nearby';
import type { NearbyPlant } from '../../services/nearby';

const VALENCIA: Coordinates = { latitude: 39.4699, longitude: -0.3763 };
const LOCATION_COLOR = '#3b7ddd';

interface Coordinates {
  latitude: number;
  longitude: number;
}

interface PlaceResult {
  lat: string;
  lon: string;
  display_name: string;
  name?: string;
  address?: { house_number?: string; road?: string };
}

const userLocationIcon = L.divIcon({
  className: 'user-location-icon',
  html: '<span aria-hidden="true"></span>',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

const searchedPlaceIcon = L.divIcon({
  className: 'searched-place-icon',
  html: '<span aria-hidden="true"></span>',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

function zoomToKeepUserAndPlaceVisible(map: L.Map, user: Coordinates, place: L.LatLng) {
  const bounds = L.latLngBounds([user.latitude, user.longitude], place);
  return Math.min(16, Math.max(3, map.getBoundsZoom(bounds, false, L.point(48, 112)) - 1));
}

const NEARBY_LIMIT = 100;
// Refresco de plantas cercanas: si el usuario se ha movido menos que esto
// desde la última consulta, la lista anterior sigue siendo válida.
const NEARBY_REFRESH_METERS = 200;

const plantIcon = L.divIcon({
  className: 'plant-location-icon',
  html: '<span aria-hidden="true"></span>',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

function metersBetween(a: Coordinates, b: Coordinates): number {
  const dLat = (b.latitude - a.latitude) * 111_320;
  const dLon = (b.longitude - a.longitude) * 111_320 * Math.max(Math.cos((a.latitude * Math.PI) / 180), 0.01);
  return Math.hypot(dLat, dLon);
}

function escapeHtml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

// TODO(RF5/RNF8): la UT de puntos en el mapa definirá icono y texto por
// especie y agrupación de puntos cercanos; este marcador neutral es
// provisional y vive aislado para sustituirlo sin tocar el resto.
function createPlantMarker(plant: NearbyPlant): L.Marker {
  return L.marker([plant.latitude, plant.longitude], {
    icon: plantIcon,
    title: plant.displayName,
    alt: plant.displayName,
  });
}

/**
 * Mapa interactivo de Valencia: capa base de OpenStreetMap, ubicación del
 * usuario y búsqueda de lugares (Nominatim). El mapa base anterior
 * (`MapView`) sigue disponible para incrustar capas de especies.
 */
export function MapPage() {
  const { t, lang, mode } = useApp();
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const accuracyCircleRef = useRef<L.Circle | null>(null);
  const searchedPlaceMarkerRef = useRef<L.Marker | null>(null);
  const currentPositionRef = useRef<Coordinates | null>(null);
  const followUserRef = useRef(true);
  const keepBothVisibleRef = useRef(false);
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PlaceResult[]>([]);
  const [searchError, setSearchError] = useState('');
  const [isSubmittingSearch, setIsSubmittingSearch] = useState(false);
  const lastNominatimSearchAt = useRef(0);
  const searchAbortRef = useRef<AbortController | null>(null);

  // Plantas cercanas (RF2): radio configurable en Ajustes, cargadas al tener
  // ubicación y refrescadas si cambia el radio, el idioma o el modo.
  const [radius] = useState(readNearbyRadius);
  const [nearbyPlants, setNearbyPlants] = useState<NearbyPlant[] | null>(null);
  const nearbyPlantsRef = useRef<NearbyPlant[] | null>(null);
  const plantsAbortRef = useRef<AbortController | null>(null);
  const lastFetchCenterRef = useRef<Coordinates | null>(null);
  const plantsLayerRef = useRef<L.LayerGroup | null>(null);
  const {
    status: locationPermission,
    position: locatedPosition,
    allow: allowLocation,
    deny: denyLocation,
    retry: retryLocation,
  } = useLocationPermission();
  // El modo `educativo` no muestra plantas del inventario (pendiente de la UT
  // de contenidos por modo).
  const showPlants = mode !== 'educativo';

  const setPlants = useCallback((plants: NearbyPlant[] | null) => {
    nearbyPlantsRef.current = plants;
    setNearbyPlants(plants);
  }, []);

  // Cargador reasignado tras cada render para que updateUserLocation
  // (memoizado) use siempre el radio, idioma y modo vigentes.
  const loadPlantsRef = useRef<(coords: Coordinates) => void>(() => undefined);
  useEffect(() => {
    loadPlantsRef.current = (coords: Coordinates) => {
      if (!showPlants) return;
      const last = lastFetchCenterRef.current;
      if (last && nearbyPlantsRef.current !== null && metersBetween(last, coords) < NEARBY_REFRESH_METERS) return;
      plantsAbortRef.current?.abort();
      const controller = new AbortController();
      plantsAbortRef.current = controller;
      lastFetchCenterRef.current = coords;
      fetchNearbyTrees(
        { latitude: coords.latitude, longitude: coords.longitude, radius, limit: NEARBY_LIMIT, lang },
        controller.signal,
      )
        .then((response) => {
          if (!controller.signal.aborted) setPlants(response.trees);
        })
        .catch(() => {
          // Fallo de red silencioso: el mapa sigue con lo último mostrado.
        });
    };
  });

  const updateUserLocation = useCallback((position: GeolocationPosition) => {
    const coords = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    };
    currentPositionRef.current = coords;
    const point: L.LatLngExpression = [coords.latitude, coords.longitude];
    const map = mapRef.current;

    if (!map) return;
    if (userMarkerRef.current) userMarkerRef.current.setLatLng(point);
    else {
      userMarkerRef.current = L.marker(point, {
        icon: userLocationIcon,
        keyboard: false,
        interactive: false,
        zIndexOffset: 1000,
      }).addTo(map);
    }

    if (accuracyCircleRef.current) {
      accuracyCircleRef.current.setLatLng(point).setRadius(position.coords.accuracy);
    } else {
      accuracyCircleRef.current = L.circle(point, {
        radius: position.coords.accuracy,
        color: LOCATION_COLOR,
        fillColor: LOCATION_COLOR,
        fillOpacity: 0.12,
        weight: 1,
        interactive: false,
      }).addTo(map);
    }

    if (followUserRef.current) {
      map.setView(point, Math.max(map.getZoom(), 16), { animate: true });
    } else if (
      keepBothVisibleRef.current &&
      searchedPlaceMarkerRef.current &&
      !map.getBounds().contains(point)
    ) {
      const place = searchedPlaceMarkerRef.current.getLatLng();
      map.setView(
        place,
        Math.min(map.getZoom(), zoomToKeepUserAndPlaceVisible(map, coords, place)),
        { animate: true },
      );
    }

    loadPlantsRef.current(coords);
  }, []);

  useEffect(() => {
    if (!mapElementRef.current) return;

    const map = L.map(mapElementRef.current, {
      center: [VALENCIA.latitude, VALENCIA.longitude],
      zoom: 15,
      zoomControl: false,
      attributionControl: false,
    });
    mapRef.current = map;
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);
    map.on('dragstart', () => {
      followUserRef.current = false;
      keepBothVisibleRef.current = false;
    });

    return () => {
      map.remove();
      mapRef.current = null;
      userMarkerRef.current = null;
      accuracyCircleRef.current = null;
      searchedPlaceMarkerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (locationPermission !== 'granted') return;
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      updateUserLocation,
      () => {
        // El mapa permanece centrado en València si no se concede la ubicación.
      },
      { enableHighAccuracy: true, maximumAge: 5_000, timeout: 15_000 },
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [updateUserLocation, locationPermission]);

  // Plantas cercanas: la primera carga (o el refresco tras cambios de radio,
  // idioma o modo) usa la posición del permiso o la última conocida; los
  // siguientes refrescos por movimiento los decide el propio cargador.
  useEffect(() => {
    if (locationPermission !== 'granted' || !showPlants) {
      plantsAbortRef.current?.abort();
      plantsAbortRef.current = null;
      lastFetchCenterRef.current = null;
      return;
    }
    const current = locatedPosition ?? currentPositionRef.current;
    if (current) {
      lastFetchCenterRef.current = null;
      loadPlantsRef.current(current);
    }
  }, [locationPermission, locatedPosition, showPlants, radius, lang]);

  useEffect(() => () => plantsAbortRef.current?.abort(), []);

  // Capa de marcadores de plantas: se reconstruye cuando llegan datos nuevos,
  // cambia el idioma (textos del popup) o se ocultan por modo o sin permiso.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (plantsLayerRef.current) {
      plantsLayerRef.current.remove();
      plantsLayerRef.current = null;
    }
    if (locationPermission !== 'granted' || !showPlants || !nearbyPlants || nearbyPlants.length === 0) return;
    const layer = L.layerGroup();
    for (const plant of nearbyPlants) {
      layer.addLayer(
        createPlantMarker(plant).bindPopup(
          `<strong>${escapeHtml(plant.displayName)}</strong><br>${escapeHtml(formatDistance(plant.distance, lang))}`,
          { closeButton: false, autoPan: false },
        ),
      );
    }
    layer.addTo(map);
    plantsLayerRef.current = layer;
  }, [nearbyPlants, lang, showPlants, locationPermission]);

  const selectPlace = (place: PlaceResult) => {
    const target: Coordinates = {
      latitude: Number(place.lat),
      longitude: Number(place.lon),
    };
    setQuery(place.display_name);
    setSearchResults([]);
    setSearchError('');

    const map = mapRef.current;
    if (!map) return;
    const point: L.LatLngExpression = [target.latitude, target.longitude];
    const alt = t('map.placeAlt', { name: place.display_name });
    if (searchedPlaceMarkerRef.current) {
      searchedPlaceMarkerRef.current.setLatLng(point);
      searchedPlaceMarkerRef.current.options.title = place.display_name;
      searchedPlaceMarkerRef.current.options.alt = alt;
    } else {
      searchedPlaceMarkerRef.current = L.marker(point, {
        icon: searchedPlaceIcon,
        title: place.display_name,
        alt,
      }).addTo(map);
    }
    searchedPlaceMarkerRef.current
      .unbindTooltip()
      .bindTooltip(place.display_name, { direction: 'top', offset: L.point(0, -12) });
    searchedPlaceMarkerRef.current.getElement()?.setAttribute('title', place.display_name);
    searchedPlaceMarkerRef.current.getElement()?.setAttribute('aria-label', alt);

    followUserRef.current = false;
    keepBothVisibleRef.current = true;
    const current = currentPositionRef.current;
    const zoom = current ? zoomToKeepUserAndPlaceVisible(map, current, L.latLng(point)) : 16;
    map.flyTo(point, zoom);
  };

  const handleSearchSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const searchTerm = query.trim();
    if (searchTerm.length < 3 || isSubmittingSearch) return;

    searchAbortRef.current?.abort();
    const controller = new AbortController();
    searchAbortRef.current = controller;
    setSearchResults([]);
    setSearchError('');
    setIsSubmittingSearch(true);

    try {
      const wait = Math.max(0, 1000 - (Date.now() - lastNominatimSearchAt.current));
      if (wait > 0) await new Promise((resolve) => window.setTimeout(resolve, wait));
      if (controller.signal.aborted) return;
      lastNominatimSearchAt.current = Date.now();

      const params = new URLSearchParams({
        format: 'jsonv2',
        limit: '6',
        addressdetails: '1',
        'accept-language': lang === 'va' ? 'ca' : lang,
      });
      const trailingNumber = searchTerm.match(
        /^(.+?)[,\s]+(\d{1,4}[A-Za-z]?(?:\/\d{1,4})?)(?:\s*,\s*(.+))?$/,
      );
      const leadingNumber = searchTerm.match(
        /^(\d{1,4}[A-Za-z]?)\s+((?:calle|carrer|avenida|av\.?|plaza|plaça|paseo|passeig|ronda|camino|camí|passatge)\b.*)$/i,
      );
      const addressMatch = trailingNumber ?? leadingNumber;
      if (addressMatch) {
        const number = trailingNumber ? trailingNumber[2] : leadingNumber?.[1];
        const street = trailingNumber ? trailingNumber[1] : leadingNumber?.[2];
        const city = trailingNumber?.[3];
        if (number && street) params.set('street', `${number} ${street}`);
        if (city) params.set('city', city);
      } else {
        params.set('q', searchTerm);
      }

      const visibleArea = mapRef.current?.getBounds();
      if (visibleArea) {
        params.set(
          'viewbox',
          [
            visibleArea.getWest(),
            visibleArea.getNorth(),
            visibleArea.getEast(),
            visibleArea.getSouth(),
          ].join(','),
        );
      }
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?${params.toString()}`,
        { signal: controller.signal },
      );
      if (!response.ok) throw new Error(t('map.searchError'));
      const places = (await response.json()) as PlaceResult[];
      if (places.length === 0) {
        setSearchError(
          addressMatch ? t('map.searchNoNumber') : t('map.searchNoResults'),
        );
      } else {
        setSearchResults(places);
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        setSearchError(
          error instanceof Error ? error.message : t('map.searchErrorGeneric'),
        );
      }
    } finally {
      if (searchAbortRef.current === controller) {
        searchAbortRef.current = null;
        setIsSubmittingSearch(false);
      }
    }
  };

  const clearSearch = () => {
    searchAbortRef.current?.abort();
    searchAbortRef.current = null;
    setIsSubmittingSearch(false);
    setQuery('');
    setSearchResults([]);
    setSearchError('');
    searchedPlaceMarkerRef.current?.remove();
    searchedPlaceMarkerRef.current = null;
  };

  const updateQuery = (value: string) => {
    if (isSubmittingSearch) {
      searchAbortRef.current?.abort();
      searchAbortRef.current = null;
      setIsSubmittingSearch(false);
    }
    setQuery(value);
    if (!value.trim()) clearSearch();
  };

  const centerOnUser = () => {
    const map = mapRef.current;
    if (currentPositionRef.current && map) {
      keepBothVisibleRef.current = false;
      followUserRef.current = true;
      const { latitude, longitude } = currentPositionRef.current;
      map.flyTo([latitude, longitude], Math.max(map.getZoom(), 16));
      return;
    }
    navigator.geolocation?.getCurrentPosition(updateUserLocation, () => {}, {
      enableHighAccuracy: true,
      timeout: 15_000,
    });
  };

  return (
    <section
      className="relative h-full min-h-0 overflow-hidden bg-app"
      aria-label={t('map.title')}
    >
      <div ref={mapElementRef} className="absolute inset-0 h-full w-full" />

      <div className="absolute inset-x-0 top-0 z-[1000] px-4 pt-4">
        <div className="relative w-full">
          <form
            onSubmit={handleSearchSubmit}
            className="flex min-h-12 items-center gap-3 rounded-card bg-surface px-4 shadow-raised"
          >
            <Search size={20} className="shrink-0 text-muted" aria-hidden="true" />
            <input
              type="text"
              value={query}
              onChange={(event) => updateQuery(event.target.value)}
              placeholder={t('map.searchPlaceholder')}
              aria-label={t('map.searchAria')}
              autoComplete="off"
              enterKeyHint="search"
              className="min-w-0 flex-1 bg-transparent text-base text-ink outline-none placeholder:text-muted"
            />
            {query && (
              <button
                type="button"
                onClick={clearSearch}
                aria-label={t('map.searchClear')}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <X size={18} aria-hidden="true" />
              </button>
            )}
            <button
              type="submit"
              disabled={query.trim().length < 3 || isSubmittingSearch}
              className="min-h-11 shrink-0 rounded-control px-1 text-body font-semibold text-accent transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:text-muted-2 disabled:no-underline"
            >
              {isSubmittingSearch ? t('map.searching') : t('map.searchSubmit')}
            </button>
          </form>

          {(searchResults.length > 0 || searchError) && (
            <div
              className="mt-2 overflow-hidden rounded-card bg-surface shadow-float"
              role="region"
              aria-label={t('map.resultsAria')}
            >
              {searchError && (
                <p className="p-4 text-small text-muted" role="status">
                  {searchError}
                </p>
              )}
              {searchResults.map((place) => (
                <button
                  key={`${place.lat}-${place.lon}-${place.display_name}`}
                  type="button"
                  onClick={() => selectPlace(place)}
                  className="block w-full border-b border-line px-4 py-3 text-left last:border-0 transition-colors hover:bg-accent-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <span className="block text-body font-semibold text-ink">
                    {place.name ?? place.display_name.split(',')[0]}
                    {place.address?.house_number &&
                    !place.display_name.includes(place.address.house_number)
                      ? `, ${place.address.house_number}`
                      : ''}
                  </span>
                  <span className="mt-0.5 block text-small text-muted">
                    {place.display_name}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={centerOnUser}
        aria-label={t('map.centerAria')}
        title={t('map.centerTitle')}
        className="absolute right-4 bottom-4 z-[1000] flex h-12 w-12 items-center justify-center rounded-full bg-surface text-ink shadow-float transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <LocateFixed size={21} aria-hidden="true" />
      </button>

      {locationPermission === 'denied' && (
        <button
          type="button"
          onClick={retryLocation}
          aria-label={t('location.retryAria')}
          title={t('location.retryAria')}
          className="absolute right-4 bottom-20 z-[1000] flex h-12 w-12 items-center justify-center rounded-full bg-surface text-ink shadow-float transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <MapPinOff size={21} aria-hidden="true" />
        </button>
      )}

      {locationPermission === 'prompt' && (
        <div className="absolute inset-0 z-[1100]">
          <LocationPermissionPrompt onAllow={allowLocation} onDeny={denyLocation} />
        </div>
      )}

      <a
        href="https://www.openstreetmap.org/copyright"
        target="_blank"
        rel="noreferrer"
        className="absolute bottom-2 left-2 z-[1000] rounded bg-surface/90 px-1.5 py-1 text-caption text-muted shadow-raised"
      >
        © OpenStreetMap contributors
      </a>
    </section>
  );
}

export default MapPage;
