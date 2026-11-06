import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { LocateFixed, MapPinOff, Search, X } from 'lucide-react';
import { useApp } from '../../context/useApp';
import { LocationPermissionPrompt, useLocationPermission } from '../../components/Location';
import { formatDistance } from '../../i18n/format';
import { fetchNearbyTrees, readNearbyRadius } from '../../services/nearby';
import { fetchPlantPins } from '../../services/plants';
import type { PlantPin } from '../../types/plant';
import { PLANT_LABEL_MIN_ZOOM, addPlantMarkers } from './plantMarkers';

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

// Plantas cercanas (RF2): el radio del modo aventura es fijo y el resto de
// modos usa el de Ajustes; el número de plantas sale de una regla de tres
// (100 plantas por cada 1000 m) para no saturar el mapa con radios pequeños.
const NEARBY_RADIUS_AVENTURA = 1000;
// Refresco de plantas cercanas: si el usuario se ha movido menos que esto
// desde la última consulta, la lista anterior sigue siendo válida.
const NEARBY_REFRESH_METERS = 200;

function metersBetween(a: Coordinates, b: Coordinates): number {
  const dLat = (b.latitude - a.latitude) * 111_320;
  const dLon = (b.longitude - a.longitude) * 111_320 * Math.max(Math.cos((a.latitude * Math.PI) / 180), 0.01);
  return Math.hypot(dLat, dLon);
}

function escapeHtml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
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
  const plantsLayerRef = useRef<L.LayerGroup | null>(null);
  const currentPositionRef = useRef<Coordinates | null>(null);
  const followUserRef = useRef(true);
  const keepBothVisibleRef = useRef(false);
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PlaceResult[]>([]);
  const [searchError, setSearchError] = useState('');
  const [isSubmittingSearch, setIsSubmittingSearch] = useState(false);
  const [plantsFailed, setPlantsFailed] = useState(false);
  const lastNominatimSearchAt = useRef(0);
  const searchAbortRef = useRef<AbortController | null>(null);

  // Plantas del mapa: sin posición conocida se pintan las globales (UT 908);
  // en cuanto hay posición, las cercanas al usuario con parámetros por modo.
  const [radius] = useState(readNearbyRadius);
  const [plants, setPlantsState] = useState<PlantPin[] | null>(null);
  const plantsRef = useRef<PlantPin[] | null>(null);
  const plantsAbortRef = useRef<AbortController | null>(null);
  const lastFetchCenterRef = useRef<Coordinates | null>(null);
  const {
    status: locationPermission,
    position: locatedPosition,
    allow: allowLocation,
    deny: denyLocation,
    retry: retryLocation,
  } = useLocationPermission();

  const setPlants = useCallback((pins: PlantPin[] | null) => {
    plantsRef.current = pins;
    setPlantsState(pins);
  }, []);

  // Cargador cercanas reasignado tras cada render para que updateUserLocation
  // (memoizado) use siempre el radio, idioma y modo vigentes.
  const loadPlantsRef = useRef<(coords: Coordinates) => void>(() => undefined);
  useEffect(() => {
    loadPlantsRef.current = (coords: Coordinates) => {
      const modeRadius = mode === 'aventura' ? NEARBY_RADIUS_AVENTURA : radius;
      // Regla de tres: 100 plantas por cada 1000 m de radio.
      const modeLimit = Math.max(1, Math.round(modeRadius / 10));
      const last = lastFetchCenterRef.current;
      if (last && plantsRef.current !== null && metersBetween(last, coords) < NEARBY_REFRESH_METERS) return;
      plantsAbortRef.current?.abort();
      const controller = new AbortController();
      plantsAbortRef.current = controller;
      lastFetchCenterRef.current = coords;
      fetchNearbyTrees(
        { latitude: coords.latitude, longitude: coords.longitude, radius: modeRadius, limit: modeLimit, lang },
        controller.signal,
      )
        .then((response) => {
          if (!controller.signal.aborted) {
            setPlants(response.trees.map((plant) => ({
              id: plant.id,
              displayName: plant.displayName,
              latitude: plant.latitude,
              longitude: plant.longitude,
              identified: plant.speciesId !== null,
              distance: plant.distance,
            })));
          }
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
      plantsLayerRef.current = null;
    };
  }, []);

  // Con posición conocida (la fija el permiso) la vía cercanas toma el relevo.
  const hasPosition = locatedPosition !== null;

  // Plantas del inventario: sin posición conocida, las globales de la UT 908;
  // en cuanto hay posición, la vía cercanas toma el relevo con parámetros por
  // modo (aventura: radio fijo; resto: radio de Ajustes).
  useEffect(() => {
    if (hasPosition) {
      const current = locatedPosition ?? currentPositionRef.current;
      if (current) {
        lastFetchCenterRef.current = null;
        loadPlantsRef.current(current);
      }
      return;
    }
    const map = mapRef.current;
    if (!map) return;
    const controller = new AbortController();
    fetchPlantPins(lang, controller.signal)
      .then((pins) => {
        if (!controller.signal.aborted) {
          setPlants(pins);
          setPlantsFailed(false);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setPlantsFailed(true);
      });
    return () => controller.abort();
  }, [hasPosition, locatedPosition, lang, setPlants]);

  // Etiquetas de plantas junto al icono solo a partir del zoom de la UT 908.
  useEffect(() => {
    const map = mapRef.current;
    const container = mapElementRef.current;
    if (!map || !container) return;
    const syncLabels = () =>
      container.classList.toggle('plants-labels-visible', map.getZoom() >= PLANT_LABEL_MIN_ZOOM);
    syncLabels();
    map.on('zoomend', syncLabels);
    return () => {
      map.off('zoomend', syncLabels);
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

  useEffect(() => () => plantsAbortRef.current?.abort(), []);

  // Capa de marcadores de plantas (render de la UT 908): se reconstruye cuando
  // llegan datos nuevos o cambia el idioma. Con distancia conocida (vía
  // cercanas), cada marcador lleva su popup con nombre y distancia.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (plantsLayerRef.current) {
      plantsLayerRef.current.remove();
      plantsLayerRef.current = null;
    }
    if (!plants || plants.length === 0) return;
    const popupFor = (pin: PlantPin) =>
      pin.distance === undefined
        ? undefined
        : `<strong>${escapeHtml(pin.displayName)}</strong><br>${escapeHtml(formatDistance(pin.distance, lang))}`;
    plantsLayerRef.current = addPlantMarkers(map, plants, popupFor);
  }, [plants, lang]);

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

          {plantsFailed && (
            <p className="mt-2 rounded-card bg-surface p-3 text-small text-muted shadow-float" role="status">
              {t('map.plantsError')}
            </p>
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
