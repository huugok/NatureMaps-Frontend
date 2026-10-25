import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { LocateFixed, Search, X } from 'lucide-react';

const VALENCIA: Coordinates = { latitude: 39.4699, longitude: -0.3763 };
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
  const bounds = L.latLngBounds(
    [user.latitude, user.longitude],
    place,
  );
  return Math.min(16, Math.max(3, map.getBoundsZoom(bounds, false, L.point(48, 112)) - 1));
}

export function MapPage() {
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
        color: '#4285f4',
        fillColor: '#4285f4',
        fillOpacity: 0.12,
        weight: 1,
        interactive: false,
      }).addTo(map);
    }

    if (followUserRef.current) {
      map.setView(point, Math.max(map.getZoom(), 16), { animate: true });
    } else if (keepBothVisibleRef.current && searchedPlaceMarkerRef.current && !map.getBounds().contains(point)) {
      const place = searchedPlaceMarkerRef.current.getLatLng();
      map.setView(place, Math.min(map.getZoom(), zoomToKeepUserAndPlaceVisible(map, coords, place)), { animate: true });
    }
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
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
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
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      updateUserLocation,
      () => { /* El mapa permanece centrado en València si no se concede la ubicación. */ },
      { enableHighAccuracy: true, maximumAge: 5_000, timeout: 15_000 },
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [updateUserLocation]);



  const selectPlace = (place: PlaceResult) => {
    const target: Coordinates = { latitude: Number(place.lat), longitude: Number(place.lon) };
    setQuery(place.display_name);
    setSearchResults([]);
    setSearchError('');

    const map = mapRef.current;
    if (!map) return;
    const point: L.LatLngExpression = [target.latitude, target.longitude];
    if (searchedPlaceMarkerRef.current) {
      searchedPlaceMarkerRef.current.setLatLng(point);
      searchedPlaceMarkerRef.current.options.title = place.display_name;
      searchedPlaceMarkerRef.current.options.alt = `Lugar buscado: ${place.display_name}`;
    } else {
      searchedPlaceMarkerRef.current = L.marker(point, {
        icon: searchedPlaceIcon,
        title: place.display_name,
        alt: `Lugar buscado: ${place.display_name}`,
      }).addTo(map);
    }
    searchedPlaceMarkerRef.current
      .unbindTooltip()
      .bindTooltip(place.display_name, { direction: 'top', offset: L.point(0, -12) });
    searchedPlaceMarkerRef.current.getElement()?.setAttribute('title', place.display_name);
    searchedPlaceMarkerRef.current.getElement()?.setAttribute('aria-label', `Lugar buscado: ${place.display_name}`);

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

      const params = new URLSearchParams({ format: 'jsonv2', limit: '6', addressdetails: '1', 'accept-language': 'es' });
      const trailingNumber = searchTerm.match(/^(.+?)[,\s]+(\d{1,4}[A-Za-z]?(?:\/\d{1,4})?)(?:\s*,\s*(.+))?$/);
      const leadingNumber = searchTerm.match(/^(\d{1,4}[A-Za-z]?)\s+((?:calle|carrer|avenida|av\.?|plaza|plaça|paseo|passeig|ronda|camino|camí|passatge)\b.*)$/i);
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
        params.set('viewbox', [visibleArea.getWest(), visibleArea.getNorth(), visibleArea.getEast(), visibleArea.getSouth()].join(','));
      }
      const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, { signal: controller.signal });
      if (!response.ok) throw new Error('OpenStreetMap no pudo completar la búsqueda. Inténtalo de nuevo.');
      const places = await response.json() as PlaceResult[];
      if (places.length === 0) {
        setSearchError(addressMatch
          ? 'No se encontró ese número de portal; puede que no esté registrado en OpenStreetMap.'
          : 'No se encontraron lugares con ese nombre.');
      } else {
        setSearchResults(places);
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        setSearchError(error instanceof Error ? error.message : 'No se pudo completar la búsqueda.');
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
    <section className="relative min-h-0 flex-1 overflow-hidden bg-emerald-50" aria-label="Mapa">
      <div ref={mapElementRef} className="absolute inset-0 h-full w-full" />

      <div className="absolute inset-x-0 top-0 z-[1000] px-4 pt-4">
        <div className="relative mx-auto max-w-md">
          <form onSubmit={handleSearchSubmit} className="flex h-12 items-center gap-3 rounded-2xl bg-white px-4 shadow-md">
            <Search size={20} className="shrink-0 text-neutral-500" aria-hidden="true" />
            <input
              type="text"
              value={query}
              onChange={(event) => updateQuery(event.target.value)}
              placeholder="Buscar sitios en el mapa"
              aria-label="Buscar sitios en el mapa"
              className="min-w-0 flex-1 bg-transparent text-sm text-neutral-900 outline-none placeholder:text-neutral-500"
            />
            {query && (
              <button type="button" onClick={clearSearch} aria-label="Borrar búsqueda y quitar marcador" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100">
                <X size={18} aria-hidden="true" />
              </button>
            )}
            <button type="submit" disabled={query.trim().length < 3 || isSubmittingSearch} className="shrink-0 text-sm font-semibold text-emerald-800 disabled:text-neutral-400">
              {isSubmittingSearch ? 'Buscando…' : 'Buscar'}
            </button>
          </form>
          {(searchResults.length > 0 || searchError) && (
            <div className="mt-2 overflow-hidden rounded-2xl bg-white shadow-lg" role="region" aria-label="Resultados de búsqueda">
              {searchError && <p className="p-4 text-sm text-neutral-600" role="status">{searchError}</p>}
              {searchResults.map((place) => (
                <button key={`${place.lat}-${place.lon}-${place.display_name}`} type="button" onClick={() => selectPlace(place)} className="block w-full border-b border-neutral-100 px-4 py-3 text-left text-sm text-neutral-800 last:border-0 hover:bg-emerald-50 focus-visible:outline-none focus-visible:bg-emerald-50">
                  <span className="block font-semibold">
                    {place.name ?? place.display_name.split(',')[0]}
                    {place.address?.house_number && !place.display_name.includes(place.address.house_number)
                      ? `, ${place.address.house_number}`
                      : ''}
                  </span>
                  <span className="mt-0.5 block text-xs text-neutral-500">{place.display_name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={centerOnUser}
        aria-label="Centrar el mapa en mi ubicación"
        title="Centrar en mi ubicación"
        className="absolute bottom-[82px] right-4 z-[1000] flex h-12 w-12 items-center justify-center rounded-full bg-white text-neutral-700 shadow-md hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
      >
        <LocateFixed size={21} aria-hidden="true" />
      </button>

      <a
        href="https://www.openstreetmap.org/copyright"
        target="_blank"
        rel="noreferrer"
        className="absolute bottom-[70px] left-2 z-[1000] rounded bg-white/90 px-1.5 py-1 text-[10px] text-neutral-700 shadow-sm"
      >
        © OpenStreetMap contributors
      </a>
    </section>
  );
}
