import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { LocateFixed, MapPinOff, Search, X, ChevronUp, ChevronDown, Leaf, Landmark } from 'lucide-react';
import { useApp } from '../../context/useApp';
import { LocationPermissionPrompt, useLocationPermission } from '../../components/Location';
import { formatDistance } from '../../i18n/format';
import { fetchNearbyTrees, readNearbyRadius } from '../../services/nearby';
import { fetchPlantPins } from '../../services/plants';
import { groupNearbyPlants, metersBetween } from '../../services/plantGroups';
import type { GroupArea } from '../../services/plantGroups';
import type { PlantPin } from '../../types/plant';
import { useSearchParams } from 'react-router-dom';
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

// Plantas cercanas (RF2): el radio efectivo por modo vive en services/nearby
// (aventura fijo, resto el deslizador); el número de plantas sale de una regla
// de tres (100 plantas por cada 1000 m) para no saturar el mapa.
// Refresco de plantas cercanas: si el usuario se ha movido menos que esto
// desde la última consulta, la lista anterior sigue siendo válida.
const NEARBY_REFRESH_METERS = 200;
// Círculo mínimo pintado al ir a un ejemplar suelto («Ver en el mapa»), para
// que el punto sea localizable a simple vista.
const FOCUS_RADIUS_METERS = 30;
const POI_CACHE_TTL_MS = 5 * 60 * 1000;

const poiAreaCache = new Map<string, { savedAt: number; items: Array<{id: number; name: string; lat: number; lon: number; distance: number}> }>();

function poiCacheKey(center: Coordinates, radius: number): string {
  return `${center.latitude.toFixed(5)}:${center.longitude.toFixed(5)}:${radius}`;
}

function escapeHtml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

export interface MapPageProps {
  /** Abre la ficha de la planta tocada (F03.1). App la pinta como overlay para
   * que el mapa siga montado y conserve centro y zoom al volver (PA 691). */
  onOpenPlant?: (plant: PlantPin) => boolean;
}

/**
 * Mapa interactivo de Valencia: capa base de OpenStreetMap, ubicación del
 * usuario y búsqueda de lugares (Nominatim). El mapa base anterior
 * (`MapView`) sigue disponible para incrustar capas de especies.
 */
export function MapPage({ onOpenPlant }: MapPageProps = {}) {
  const { t, lang } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const searchAreaCircleRef = useRef<L.Circle | null>(null);
  const searchedPlaceMarkerRef = useRef<L.Marker | null>(null);
  const plantsLayerRef = useRef<L.LayerGroup | null>(null);
  const poisLayerRef = useRef<L.LayerGroup | null>(null);
  const locatedItemRef = useRef<L.Circle | null>(null);
  const groupAreaRef = useRef<L.Circle | null>(null);
  const groupAreasRef = useRef<Map<number, GroupArea>>(new Map());
  // Área de cada grupo indexada por cualquier miembro (para «Ver en el mapa»).
  const memberAreasRef = useRef<Map<number, GroupArea>>(new Map());
  const currentPositionRef = useRef<Coordinates | null>(null);
  const followUserRef = useRef(true);
  const keepBothVisibleRef = useRef(false);
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PlaceResult[]>([]);
  const [searchError, setSearchError] = useState('');
  const [isSubmittingSearch, setIsSubmittingSearch] = useState(false);
  const [plantsFailed, setPlantsFailed] = useState(false);
  const [focusFailed, setFocusFailed] = useState(false);
  const [exploreOpen, setExploreOpen] = useState(false);
  const [chosenArea, setChosenArea] = useState(false);
  const [pois, setPois] = useState<Array<{id: number; name: string; lat: number; lon: number; distance: number}>>([]);
  const [areaLoading, setAreaLoading] = useState(false);
  const [poiLoading, setPoiLoading] = useState(false);
  const [areaFailed, setAreaFailed] = useState(false);
  const [poiFicha, setPoiFicha] = useState<{name: string; distance: number} | null>(null);
  const areaRequestRef = useRef<AbortController | null>(null);
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

  const loadArea = useCallback((center: Coordinates, searchRadius = radius) => {
    areaRequestRef.current?.abort();
    const controller = new AbortController();
    areaRequestRef.current = controller;
    setAreaLoading(true);
    setAreaFailed(false);
    // Conserva la misma densidad que el mapa original: 100 ejemplares por km
    // de radio, con el máximo del backend para radios mayores.
    const limit = 1000;
    fetchNearbyTrees({ latitude: center.latitude, longitude: center.longitude, radius: searchRadius, limit, lang }, controller.signal)
      .then((response) => setPlants(response.trees.map((plant) => ({
        id: plant.id, displayName: plant.displayName, scientificName: plant.scientificName ?? plant.reportedScientificName,
        latitude: plant.latitude, longitude: plant.longitude, identified: plant.speciesId !== null,
        speciesId: plant.speciesId, distance: plant.distance,
      }))))
      .catch(() => { if (!controller.signal.aborted) { setPlants([]); setAreaFailed(true); } })
      .finally(() => { if (!controller.signal.aborted) setAreaLoading(false); });
    const cachedPois = poiAreaCache.get(poiCacheKey(center, searchRadius));
    if (cachedPois && Date.now() - cachedPois.savedAt < POI_CACHE_TTL_MS) {
      setPois(cachedPois.items);
      setPoiLoading(false);
      return;
    }
    setPoiLoading(true);
    const query = `[out:json];(nwr[\"tourism\"~\"museum|attraction|viewpoint\"](around:${searchRadius},${center.latitude},${center.longitude});nwr[\"historic\"](around:${searchRadius},${center.latitude},${center.longitude});nwr[\"amenity\"~\"place_of_worship|fountain\"](around:${searchRadius},${center.latitude},${center.longitude}););out center tags;`;
    const overpassUrl = (endpoint: string) => `${endpoint}?data=${encodeURIComponent(query)}`;
    const fetchOverpass = (endpoint: string) => fetch(overpassUrl(endpoint), { signal: controller.signal }).then((response) => {
      if (!response.ok) throw new Error(`Overpass ${response.status}`);
      return response.json();
    });
    fetchOverpass('https://overpass-api.de/api/interpreter')
      .catch((error: unknown) => {
        if (controller.signal.aborted) throw error;
        return fetchOverpass('https://overpass.kumi.systems/api/interpreter');
      })
      .then((data: {elements?: Array<{id:number; lat?:number; lon?:number; center?:{lat:number; lon:number}; tags?:{name?:string}}>} ) => {
        const items = (data.elements ?? [])
        .map((item) => ({ ...item, lat: item.lat ?? item.center?.lat, lon: item.lon ?? item.center?.lon }))
        .filter((item) => item.tags?.name && Number.isFinite(item.lat) && Number.isFinite(item.lon))
        .map((item) => ({
          id: item.id,
          name: item.tags!.name!,
          lat: item.lat!,
          lon: item.lon!,
          distance: metersBetween(center, { latitude: item.lat!, longitude: item.lon! }),
        }))
        .filter((item) => Number.isFinite(item.distance) && item.distance <= searchRadius);
        poiAreaCache.set(poiCacheKey(center, searchRadius), { savedAt: Date.now(), items });
        setPois(items);
        setPoiLoading(false);
      })
      .catch(() => { if (!controller.signal.aborted) { setPois([]); setPoiLoading(false); } });
  }, [lang, radius, setPlants]);

  useEffect(() => {
    if (locatedPosition && !chosenArea) loadArea(locatedPosition, radius);
  }, [locatedPosition, chosenArea, loadArea, radius]);

  // Radio efectivo de cercanas, vivo para updateUserLocation (memoizado sin
  // dependencias, como el cargador de abajo).
  const effectiveRadiusRef = useRef(radius);
  useEffect(() => {
    effectiveRadiusRef.current = radius;
  });

  // Cargador cercanas reasignado tras cada render para que updateUserLocation
  // (memoizado) use siempre el radio, idioma y modo vigentes.
  const loadPlantsRef = useRef<(coords: Coordinates) => void>(() => undefined);
  useEffect(() => {
    loadPlantsRef.current = (coords: Coordinates) => {
      const modeRadius = radius;
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
              scientificName: plant.scientificName ?? plant.reportedScientificName,
              latitude: plant.latitude,
              longitude: plant.longitude,
              identified: plant.speciesId !== null,
              speciesId: plant.speciesId,
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

    if (searchAreaCircleRef.current) {
      searchAreaCircleRef.current.setLatLng(point).setRadius(effectiveRadiusRef.current);
    } else {
      // Círculo azul = área de búsqueda de plantas cercanas (radio efectivo del
      // modo), no la precisión del GPS.
      searchAreaCircleRef.current = L.circle(point, {
        radius: effectiveRadiusRef.current,
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
      setExploreOpen(false);
    });
    map.on('click', () => {
      setExploreOpen(false);
    });

    return () => {
      map.remove();
      mapRef.current = null;
      userMarkerRef.current = null;
      searchAreaCircleRef.current = null;
      searchedPlaceMarkerRef.current = null;
      plantsLayerRef.current = null;
      groupAreaRef.current = null;
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

  // Área de un grupo de plantas (RF2): círculo que cubre a sus miembros, fuera
  // de React porque es estado puro de Leaflet. Se limpia al reconstruir la capa.
  const clearGroupArea = useCallback(() => {
    groupAreaRef.current?.remove();
    groupAreaRef.current = null;
  }, []);

  /** Pinta el área de un grupo sin tocar la vista: al tocar un marcador se
   * abre su ficha y el mapa debe conservar centro y zoom (PA 691). */
  const drawArea = useCallback((center: Coordinates, radius: number) => {
    const map = mapRef.current;
    if (!map) return;
    clearGroupArea();
    groupAreaRef.current = L.circle([center.latitude, center.longitude], {
      radius,
      className: 'plant-group-area',
      interactive: false,
    }).addTo(map);
  }, [clearGroupArea]);

  /** Pinta el área y encuadra el mapa para verla entera. Solo lo usa «Ver en
   * el mapa» desde la ficha, donde el cambio de vista es intencionado. */
  const focusArea = useCallback((center: Coordinates, radius: number) => {
    drawArea(center, radius);
    const map = mapRef.current;
    if (!map || !groupAreaRef.current) return;
    map.fitBounds(groupAreaRef.current.getBounds(), { padding: [48, 48], maxZoom: 17 });
  }, [drawArea]);

  // Capa de marcadores de plantas (render de la UT 908): se reconstruye cuando
  // llegan datos nuevos, cambia el idioma o se pasa de globales a cercanas.
  // Con distancia conocida (vía cercanas), cada marcador lleva su popup con
  // nombre y distancia; las plantas del mismo tipo encadenadas se agrupan en
  // un marcador con recuento y, al pulsarlo, pintan el área del grupo.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (plantsLayerRef.current) {
      plantsLayerRef.current.remove();
      plantsLayerRef.current = null;
    }
    clearGroupArea();
    const mapPlants = plants;
    if (!mapPlants || mapPlants.length === 0) {
      groupAreasRef.current = new Map();
      memberAreasRef.current = new Map();
      return;
    }
    const popupFor = (pin: PlantPin) => {
      if (pin.distance === undefined) return undefined;
      const detail = pin.count !== undefined && pin.count > 1
        ? `${escapeHtml(t('map.plantGroup', { n: pin.count }))} · `
        : '';
      return `<strong>${escapeHtml(pin.displayName)}</strong><br>${detail}${escapeHtml(formatDistance(pin.distance, lang))}`;
    };
    if (!hasPosition) {
      groupAreasRef.current = new Map();
      memberAreasRef.current = new Map();
      plantsLayerRef.current = addPlantMarkers(map, mapPlants, popupFor);
      return;
    }
    if (!hasPosition) {
      groupAreasRef.current = new Map();
      memberAreasRef.current = new Map();
      plantsLayerRef.current = addPlantMarkers(map, mapPlants, popupFor);
      return;
    }
    const { pins, areasById, areaByMemberId } = groupNearbyPlants(mapPlants);
    groupAreasRef.current = areasById;
    memberAreasRef.current = areaByMemberId;
    const handlePlantClick = (pin: PlantPin) => {
      clearGroupArea();
      setExploreOpen(false);
      if (pin.count !== undefined && pin.count > 1) {
        const area = groupAreasRef.current.get(pin.id);
        if (area) drawArea(area.center, area.radius);
      }
      return onOpenPlant?.(pin) ?? false;
    };
    plantsLayerRef.current = addPlantMarkers(map, pins, popupFor, handlePlantClick);
  }, [plants, lang, hasPosition, clearGroupArea, drawArea, onOpenPlant, t]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    poisLayerRef.current?.remove();
    const layer = L.layerGroup();
    pois.forEach((poi) => {
      const marker = L.circleMarker([poi.lat, poi.lon], { radius: 8, color: '#8b5e20', fillColor: '#c58a31', fillOpacity: 1, weight: 2 });
      marker.bindTooltip(`${escapeHtml(poi.name)} · ${escapeHtml(formatDistance(poi.distance, lang))}`, {
        permanent: true,
        direction: 'top',
        offset: L.point(0, -8),
        className: 'poi-distance-label',
      });
      marker.addTo(layer);
    });
    poisLayerRef.current = layer.addTo(map);
    return () => { layer.remove(); };
  }, [pois, t, lang]);

  // «Ver en el mapa» (ficha, RF3): centra el ejemplar más cercano de la especie
  // pedida por parámetro y pinta su área; si no hay ninguno dentro del radio
  // del modo, avisa. Un solo uso: el parámetro se limpia al atenderlo, y se
  // espera a tener posición y plantas cercanas cargadas.
  useEffect(() => {
    const verRaw = searchParams.get('verEspecie');
    if (verRaw === null || !/^\d+$/.test(verRaw)) return;
    if (!hasPosition || plants === null) return;
    setSearchParams({}, { replace: true });
    const candidates = plants.filter((pin) => pin.speciesId === Number(verRaw));
    if (candidates.length === 0) {
      setFocusFailed(true);
      return;
    }
    setFocusFailed(false);
    const nearest = candidates.reduce((a, b) =>
      (b.distance ?? Number.POSITIVE_INFINITY) < (a.distance ?? Number.POSITIVE_INFINITY) ? b : a,
    );
    const area = memberAreasRef.current.get(nearest.id);
    focusArea(
      area?.center ?? { latitude: nearest.latitude, longitude: nearest.longitude },
      area?.radius ?? FOCUS_RADIUS_METERS,
    );
  }, [searchParams, plants, hasPosition, setSearchParams, focusArea]);

  // El área de búsqueda sigue el radio configurado en Ajustes.
  useEffect(() => {
    searchAreaCircleRef.current?.setRadius(radius);
  }, [radius]);

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

  const explorePlants = plants === null
    ? []
    : hasPosition
      ? groupNearbyPlants(plants).pins
      : plants;

  const locateExploreItem = (point: Coordinates) => {
    const map = mapRef.current;
    if (!map) return;
    const position: L.LatLngExpression = [point.latitude, point.longitude];
    map.flyTo(position, Math.max(map.getZoom(), 17));
    locatedItemRef.current?.remove();
    locatedItemRef.current = L.circle(position, {
      radius: 18,
      className: 'explore-target-highlight',
      interactive: false,
    }).addTo(map);
  };

  return (
    <section
      className="relative h-full min-h-0 overflow-hidden bg-app"
      aria-label={t('map.title')}
    >
      <div
        ref={mapElementRef}
        onClick={() => setExploreOpen(false)}
        className="absolute inset-0 h-full w-full"
      />

      <button type="button" onClick={() => setExploreOpen((open) => !open)} aria-expanded={exploreOpen}
        className="absolute bottom-4 left-1/2 z-[1000] flex min-h-12 -translate-x-1/2 items-center gap-2 rounded-full bg-surface px-5 text-body font-semibold text-ink shadow-float focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
        {exploreOpen ? <ChevronDown size={18} /> : <ChevronUp size={18} />} {t('map.explore')}
      </button>

      <aside className={`absolute inset-x-0 bottom-0 z-[1050] rounded-t-3xl bg-surface shadow-float transition-transform duration-300 ${exploreOpen ? 'translate-y-0' : 'translate-y-full'}`} style={{height:'62%'}} aria-label="Exploración cercana">
        <div className="flex h-full flex-col px-4 pt-2 pb-[env(safe-area-inset-bottom,0px)]">
          <button
            type="button"
            onClick={() => setExploreOpen(false)}
            className="mx-auto -mt-1 mb-1 flex h-11 w-36 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            aria-label="Cerrar exploración"
          >
            <span className="h-1.5 w-12 rounded-full bg-line-strong" aria-hidden="true" />
          </button>
          <div className="mb-3 flex gap-2">
            <button type="button" onClick={() => { setChosenArea(false); centerOnUser(); if (locatedPosition) loadArea(locatedPosition, radius); }} className={`min-h-11 flex-1 rounded-control px-3 text-small font-semibold ${!chosenArea ? 'bg-accent text-on-accent' : 'bg-surface-2 text-ink'}`}>{t('map.nearMe')}</button>
            <button type="button" onClick={() => { const center = mapRef.current?.getCenter(); if (center) { setChosenArea(true); loadArea({latitude:center.lat,longitude:center.lng}); } }} className={`min-h-11 flex-1 rounded-control px-3 text-small font-semibold ${chosenArea ? 'bg-accent text-on-accent' : 'bg-surface-2 text-ink'}`}>{t('map.chooseArea')}</button>
          </div>
          <p className="mb-2 text-small font-semibold text-ink">{chosenArea ? t('map.selectedArea') : t('map.nearbyTitle')}</p>
          {chosenArea && <button type="button" disabled={areaLoading} onClick={() => {const center=mapRef.current?.getCenter(); if(center) loadArea({latitude:center.lat,longitude:center.lng});}} className="mb-2 min-h-10 rounded-control bg-accent-soft px-3 text-small font-semibold text-ink disabled:opacity-60">{areaLoading ? t('map.loadingArea') : t('map.updateArea')}</button>}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {areaLoading ? <p role="status" className="py-8 text-center text-small text-muted">{t('map.loadingArea')}</p> : areaFailed ? <p role="status" className="py-8 text-center text-small text-danger">{t('map.areaError')}</p> : explorePlants.length === 0 && pois.length === 0 && !poiLoading ? <p className="py-8 text-center text-small text-muted">{t('map.emptyArea')}</p> : <>
              {explorePlants.slice().sort((a,b)=>(a.distance ?? 0)-(b.distance ?? 0)).map((plant) => <article key={`plant-${plant.id}`} className="border-b border-line py-2">
                <div className="flex items-center gap-2 text-small text-ink"><Leaf size={17} className="shrink-0 text-accent"/><span className="flex-1">{plant.displayName}{plant.count && plant.count > 1 ? ` · ${plant.count}` : ''}</span><span className="tabular-nums text-muted">{formatDistance(plant.distance ?? 0,lang)}</span></div>
                <div className="mt-1 flex justify-end gap-2">
                  <button type="button" onClick={() => onOpenPlant?.(plant)} className="min-h-11 rounded-control px-3 text-caption text-muted hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">{t('map.viewFicha')}</button>
                  <button type="button" onClick={() => locateExploreItem({latitude:plant.latitude,longitude:plant.longitude})} className="flex min-h-11 items-center gap-1 rounded-control px-3 text-caption font-semibold text-accent hover:bg-accent-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"><LocateFixed size={14}/>{t('map.locate')}</button>
                </div>
              </article>)}
              {pois.slice().sort((a, b) => a.distance - b.distance).map((poi)=><article key={`poi-${poi.id}`} className="border-b border-line py-2">
                <div className="flex items-center gap-2 text-small text-ink"><Landmark size={17} className="shrink-0 text-warm-strong"/><span className="flex-1">{poi.name}</span><span className="tabular-nums text-muted">{formatDistance(poi.distance,lang)}</span></div>
                <div className="mt-1 flex justify-end gap-2">
                  <button type="button" onClick={() => setPoiFicha({name:poi.name,distance:poi.distance})} className="min-h-11 rounded-control px-3 text-caption text-muted hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">{t('map.viewFicha')}</button>
                  <button type="button" onClick={() => locateExploreItem({latitude:poi.lat,longitude:poi.lon})} className="flex min-h-11 items-center gap-1 rounded-control px-3 text-caption font-semibold text-accent hover:bg-accent-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"><LocateFixed size={14}/>{t('map.locate')}</button>
                </div>
              </article>)}
              {poiLoading && <p role="status" className="py-3 text-center text-caption text-muted">{t('map.loadingArea')}</p>}
            </>}
          </div>
        </div>
      </aside>

      {poiFicha && (
        <div className="absolute inset-0 z-[1150] grid place-items-center bg-ink/30 p-4" role="presentation">
          <section role="dialog" aria-modal="true" aria-labelledby="poi-ficha-title" className="w-full max-w-sm rounded-card bg-surface p-5 shadow-float">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-caption uppercase tracking-wider text-muted">{t('map.poiDetails')}</p>
                <h2 id="poi-ficha-title" className="mt-1 font-display text-heading font-semibold text-ink">{poiFicha.name}</h2>
              </div>
              <button type="button" onClick={() => setPoiFicha(null)} aria-label={t('map.close')} className="flex size-11 shrink-0 items-center justify-center rounded-full text-muted hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"><X size={18}/></button>
            </div>
            <p className="mt-3 text-small text-muted">{t('map.poi')} · {formatDistance(poiFicha.distance, lang)}</p>
            <p className="mt-2 text-caption text-muted">{t('map.poiSource')}</p>
          </section>
        </div>
      )}

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

          {(plantsFailed || focusFailed) && (
            <p className="mt-2 rounded-card bg-surface p-3 text-small text-muted shadow-float" role="status">
              {plantsFailed
                ? t('map.plantsError')
                : t('map.noNearbySpecies', { radius: formatDistance(radius, lang) })}
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
        className="absolute bottom-2 left-2 z-[900] rounded bg-surface/90 px-1.5 py-1 text-caption text-muted shadow-raised"
      >
        © OpenStreetMap contributors
      </a>
    </section>
  );
}

export default MapPage;
