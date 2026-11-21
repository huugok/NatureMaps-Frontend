import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ChevronDown, ChevronUp, Landmark, Leaf, LocateFixed, MapPinOff, Search, Trash2, Trees, X } from 'lucide-react';
import { useApp } from '../../context/useApp';
import { LocationPermissionPrompt, useLocationPermission } from '../../components/Location';
import { formatDistance, repairTextEncoding } from '../../i18n/format';
import { fetchNearbyTrees, readNearbyRadius } from '../../services/nearby';
import { fetchRouteDetail } from '../../services/routes';
import { commonNameFor, getSpeciesLocations, getSpeciesDetail } from '../../services/ficha';
import { groupNearbyPlants, metersBetween } from '../../services/plantGroups';
import type { GroupArea } from '../../services/plantGroups';
import type { PlantPin } from '../../types/plant';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { fetchGreenAreaPlants, fetchGreenAreas } from '../../services/greenAreas';
import { addGreenAreasLayer } from './greenAreasLayer';
import { addOfflineTileLayer } from './offlineTileLayer';
import { OfflineSavedToast, OfflineZoneCard } from '../../components/OfflineZone';
import type { GreenAreasLayer } from './greenAreasLayer';
import { addParkMarkers, clusterPlantsByPark } from './parkClusters';
import type { GreenArea } from '../../types/greenArea';
import { addPlantMarkersProgressively } from './plantMarkers';
import { addRouteOverlay, fitRouteBounds, routeStopToPlantPin } from './routeOverlay';

const VALENCIA: Coordinates = { latitude: 39.4699, longitude: -0.3763 };
// Páginas grandes: con 67k plantas, 5k por página son 14 viajes y ~10 s;
// 20k son 4 viajes y ~5 s, con 4 pasos reales para el anillo.
const NEARBY_PAGE_SIZE = 20000;
// Muestreo del mapa: se cargan todas las plantas del radio, pero solo se pintan
// las visibles y se agrupan hasta no pasar de este número de marcadores.
const MAX_PLANT_MARKERS = 150;
// Memoria del mapa: sobrevive a entrar y salir de la pestaña. No se guarda en
// localStorage: al recargar la página se pierde, igual que el resto de la vista.
let paintedRouteId: number | null = null;
export function clearPaintedRoute() { paintedRouteId = null; }
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
const POI_CACHE_TTL_MS = 5 * 60 * 1000;

const poiAreaCache = new Map<string, { savedAt: number; items: Array<{id: number; name: string; lat: number; lon: number; distance: number}> }>();

function poiCacheKey(center: Coordinates, radius: number): string {
  return `${center.latitude.toFixed(5)}:${center.longitude.toFixed(5)}:${radius}`;
}

function escapeHtml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

function normalizeLocationName(value: string): string {
  return repairTextEncoding(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase().trim();
}

/** Junta ejemplares con coordenadas prácticamente iguales en un único pin. */
function groupSelectedLocations(pins: PlantPin[]): PlantPin[] {
  const cells = new Map<string, PlantPin[]>();
  for (const pin of pins) {
    // Una celda de 0,0001° equivale aproximadamente a 8–11 metros en València.
    const key = `${Math.round(pin.latitude * 10_000)}:${Math.round(pin.longitude * 10_000)}`;
    const cell = cells.get(key);
    if (cell) cell.push(pin);
    else cells.set(key, [pin]);
  }
  return [...cells.values()].map((cell) => {
    if (cell.length === 1) return cell[0];
    return {
      ...cell[0],
      latitude: cell.reduce((total, pin) => total + pin.latitude, 0) / cell.length,
      longitude: cell.reduce((total, pin) => total + pin.longitude, 0) / cell.length,
      count: cell.length,
    };
  });
}

/** Marcadores canvas para lotes grandes de ubicaciones de una ficha. */
function addSpeciesLocationMarkers(map: L.Map, pins: PlantPin[], onOpen?: (pin: PlantPin) => void): L.LayerGroup {
  const layer = L.layerGroup();
  const renderer = L.canvas({ padding: 0.5 });
  const selection = getComputedStyle(document.documentElement).getPropertyValue('--color-selection').trim();
  const surface = getComputedStyle(document.documentElement).getPropertyValue('--color-surface').trim();
  for (const pin of pins) {
    const marker = L.circleMarker([pin.latitude, pin.longitude], {
      renderer,
      radius: pin.count && pin.count > 1 ? Math.min(12, 7 + Math.log2(pin.count)) : 6,
      weight: 2,
      color: surface,
      fillColor: selection,
      fillOpacity: 0.9,
    });
    if (pin.count && pin.count > 1) {
      marker.bindTooltip(String(pin.count), {
        permanent: true,
        direction: 'center',
        className: 'selected-species-count',
      });
    } else {
      marker.bindTooltip(pin.displayName, { direction: 'top', offset: L.point(0, -8) });
    }
    if (onOpen) marker.on('click', () => onOpen(pin));
    marker.addTo(layer);
  }
  return layer.addTo(map);
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
  // Ruta pintada: el parámetro `verRuta` manda al iniciarla; si ya no está
  // (el usuario cambió de pestaña), se recupera la última pintada. Solo se
  // borra con «Limpiar mapa» o al iniciar otra.
  const verRutaRaw = searchParams.get('verRuta');
  const paramRouteId = verRutaRaw !== null && /^\d+$/.test(verRutaRaw) ? Number(verRutaRaw) : null;
  const [savedRouteId, setSavedRouteId] = useState<number | null>(paintedRouteId);
  const routeId = paramRouteId ?? savedRouteId;
  const routeVisible = routeId !== null;
  const navigate = useNavigate();
  // Zonas verdes (NM-08, PA 3011): capa apagada por defecto para no cargar el
  // mapa; `?zona=<grupo>` la enciende, resalta ese parque y lo encuadra.
  const zoneParam = searchParams.get('zona');
  const selectedZone = zoneParam !== null && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(zoneParam) ? zoneParam : null;
  const [greenAreasToggled, setGreenAreasToggled] = useState(false);
  // Con el filtro de especie de un parque activo, «Ocultar parques» solo quita
  // el contorno: `?zona=` se queda en la URL porque hace falta para pedir los
  // ejemplares, y por eso la capa se apaga con este estado y no con la URL.
  const [zoneLayerHidden, setZoneLayerHidden] = useState(false);
  // Sube cada vez que la capa queda pintada: avisa al efecto que resalta el parque.
  const [greenAreasVersion, setGreenAreasVersion] = useState(0);
  const [greenAreasFailed, setGreenAreasFailed] = useState(false);
  const greenAreasLayerRef = useRef<GreenAreasLayer | null>(null);
  // Zonas verdes cargadas: la capa del interruptor las dibuja, y el mapa las
  // usa además para agrupar por parque los pines de plantas (NM-08).
  const [greenAreas, setGreenAreas] = useState<GreenArea[] | null>(null);
  // Parque que estaba resaltado al apagar la capa: al volver a encenderla se
  // vuelve a resaltar en lugar de quedarse sin contorno.
  const [rememberedZone, setRememberedZone] = useState<string | null>(null);
  // Parques cuya tarjeta de descarga el usuario ha cerrado, y aviso de «descargado».
  const [dismissedDownloads, setDismissedDownloads] = useState<string[]>([]);
  const [savedToast, setSavedToast] = useState<string | null>(null);
  const closeSavedToast = useCallback(() => setSavedToast(null), []);
  // Zona resaltada (`?zona=`): su caja reúne todos los polígonos del parque y
  // permite descargarla para usarla sin conexión desde el propio mapa.
  const selectedZoneBox = useMemo(() => {
    const parts = selectedZone ? (greenAreas ?? []).filter((area) => area.groupSlug === selectedZone) : [];
    if (parts.length === 0) return null;
    return {
      bbox: [
        Math.min(...parts.map((area) => area.bbox[0])), Math.min(...parts.map((area) => area.bbox[1])),
        Math.max(...parts.map((area) => area.bbox[2])), Math.max(...parts.map((area) => area.bbox[3])),
      ] as [number, number, number, number],
      plants: parts.reduce((total, area) => total + (area.plants ?? 0), 0),
    };
  }, [selectedZone, greenAreas]);
  const parksLayerRef = useRef<L.LayerGroup | null>(null);
  // Por debajo del zoom de parque, las plantas de una zona verde se agrupan en
  // un solo marcador: en Viveros o el Turia son cientos y tapan el mapa.
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const searchAreaCircleRef = useRef<L.Circle | null>(null);
  const searchedPlaceMarkerRef = useRef<L.Marker | null>(null);
  const plantsLayerRef = useRef<L.LayerGroup | null>(null);
  const cancelPlantFramesRef = useRef<(() => void) | null>(null);
  const selectedSpeciesLayerRef = useRef<L.LayerGroup | null>(null);
  const poisLayerRef = useRef<L.LayerGroup | null>(null);
  const locatedItemRef = useRef<L.Circle | null>(null);
  const groupAreaRef = useRef<L.Circle | null>(null);
  const routeLayerRef = useRef<L.LayerGroup | null>(null);
  const routeAbortRef = useRef<AbortController | null>(null);
  // Repintado de la capa de plantas: lo llama Leaflet en `moveend` sin pasar
  // por React (un setState aquí rerenderiza el panel y vuelve a agrupar 67k
  // plantas en cada movimiento).
  const repaintPlantsRef = useRef<() => void>(() => undefined);
  const repaintPoisRef = useRef<() => void>(() => undefined);
  const paintedCenterRef = useRef<Coordinates | null>(null);
  const groupAreasRef = useRef<Map<number, GroupArea>>(new Map());
  // Área de cada grupo indexada por cualquier miembro (para «Ver en el mapa»).
  const memberAreasRef = useRef<Map<number, GroupArea>>(new Map());
  const currentPositionRef = useRef<Coordinates | null>(null);
  const followUserRef = useRef(true);
  const keepBothVisibleRef = useRef(false);
  // `onOpenPlant` llega por props y cambia de identidad: se lee por ref para no
  // redibujar las capas (y la ruta) en cada render de App.
  const onOpenPlantRef = useRef(onOpenPlant);
  useEffect(() => {
    onOpenPlantRef.current = onOpenPlant;
  }, [onOpenPlant]);
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PlaceResult[]>([]);
  const [searchError, setSearchError] = useState('');
  const [isSubmittingSearch, setIsSubmittingSearch] = useState(false);
  const [plantsFailed, setPlantsFailed] = useState(false);
  const [focusMessage, setFocusMessage] = useState('');
  const [focusLoading, setFocusLoading] = useState(false);
  const [selectedSpeciesName, setSelectedSpeciesName] = useState('');
  const [selectedSpeciesLocationCount, setSelectedSpeciesLocationCount] = useState(0);
  const [hiddenSpeciesId, setHiddenSpeciesId] = useState<number | null>(null);
  // «Ver en el mapa» desde la ficha de un parque (`?zona=&verEspecie=`): el mapa
  // enseña solo los ejemplares de esa especie dentro del parque, sin las plantas
  // cercanas al usuario, para que quede limpio aunque el usuario esté lejos.
  const speciesRaw = searchParams.get('verEspecie');
  const zoneSpeciesId = selectedZone !== null && speciesRaw !== null && /^\d+$/.test(speciesRaw) ? Number(speciesRaw) : null;
  const greenAreasOn = !(zoneLayerHidden && zoneSpeciesId !== null) && (greenAreasToggled || selectedZone !== null);
  useEffect(() => {
    if (zoneSpeciesId === null) setZoneLayerHidden(false);
  }, [zoneSpeciesId]);
  const [zoneSpecies, setZoneSpecies] = useState<{ name: string; pins: PlantPin[] } | null>(null);
  const [zoneSpeciesFailed, setZoneSpeciesFailed] = useState(false);
  const [exploreOpen, setExploreOpen] = useState(false);
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
  const [plantProgress, setPlantProgress] = useState<{ loaded: number, total: number } | null>(null);
  const [showPlantToast, setShowPlantToast] = useState(false);
  const [toastExiting, setToastExiting] = useState(false);
  const [toastKey, setToastKey] = useState(0);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastHideRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const plantsRef = useRef<PlantPin[] | null>(null);
  // Resultado de «Explorar cerca», separado de los pines del mapa: un área sin
  // ejemplares deja la lista vacía, pero el mapa conserva lo que ya mostraba.
  const [areaPlants, setAreaPlants] = useState<PlantPin[] | null>(null);
  const plantsAbortRef = useRef<AbortController | null>(null);
  const plantsLoadingRef = useRef(false);
  const lastRequestedCenterRef = useRef<Coordinates | null>(null);
  const speciesFocusRequestRef = useRef(0);
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
    fetchNearbyTrees({ latitude: center.latitude, longitude: center.longitude, radius: searchRadius, lang }, controller.signal)
      .then((response) => {
        const found = response.trees.map((plant) => ({
          id: plant.id, displayName: plant.displayName, scientificName: plant.scientificName ?? plant.reportedScientificName,
          latitude: plant.latitude, longitude: plant.longitude, identified: plant.speciesId !== null,
          speciesId: plant.speciesId, distance: plant.distance,
          greenAreaId: plant.greenAreaId ?? null,
        }));
        // El panel de «Explorar cerca» tiene su propio estado: no debe
        // sustituir a las plantas del mapa.
        setAreaPlants(found);
      })
      .catch(() => { if (!controller.signal.aborted) { setAreaPlants([]); setAreaFailed(true); } })
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
    if (locationPermission === null) return;
    const center = locatedPosition ?? VALENCIA;
    loadArea(center, locatedPosition ? radius : 10000);
  }, [locationPermission, locatedPosition, loadArea, radius]);

  // Radio efectivo de cercanas, vivo para updateUserLocation (memoizado sin
  // dependencias, como el cargador de abajo).
  const effectiveRadiusRef = useRef(radius);
  useEffect(() => {
    effectiveRadiusRef.current = radius;
  });

  // Cargador cercanas reasignado tras cada render para que updateUserLocation
  // (memoizado) use siempre el radio, idioma y modo vigentes.
  /** Abre (o reabre al tocar el círculo) la tarjeta de carga durante 3 s. */
  const openPlantToast = useCallback(() => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    if (toastHideRef.current) clearTimeout(toastHideRef.current);
    setToastExiting(false);
    setShowPlantToast(true);
    setToastKey((key) => key + 1); // remonta el nodo para repetir la animación
    toastTimerRef.current = setTimeout(() => setToastExiting(true), 3000);
    toastHideRef.current = setTimeout(() => {
      setShowPlantToast(false);
      setToastExiting(false);
    }, 3500);
  }, []);

  /** Marca de ubicación y círculo azul: solo existen si hay GPS. */
  const drawUser = useCallback((coords: Coordinates) => {
    const map = mapRef.current;
    if (!map) return;
    const point: L.LatLngExpression = [coords.latitude, coords.longitude];
    if (userMarkerRef.current) userMarkerRef.current.setLatLng(point);
    else {
      userMarkerRef.current = L.marker(point, {
        icon: userLocationIcon, keyboard: false, interactive: false, zIndexOffset: 1000,
      }).addTo(map);
    }
    if (searchAreaCircleRef.current) {
      searchAreaCircleRef.current.setLatLng(point).setRadius(effectiveRadiusRef.current);
    } else {
      searchAreaCircleRef.current = L.circle(point, {
        radius: effectiveRadiusRef.current, color: LOCATION_COLOR, fillColor: LOCATION_COLOR,
        fillOpacity: 0.12, weight: 1, interactive: false,
      }).addTo(map);
    }
  }, []);

  const loadPlantsRef = useRef<(coords: Coordinates) => void>(() => undefined);
  useEffect(() => {
    // Esperamos a que se resuelva el permiso: mientras `status` es null no se
    // pinta nada. Con o sin GPS se carga el inventario completo; el círculo
    // azul decidirá después qué parte se pinta.
    if (locationPermission === null) return;
    loadPlantsRef.current = (coords: Coordinates) => {
      const modeRadius = 10000;
      // Sin regla de 100 plantas por km: las plantas cercanas se agrupan por
      // especie, así que se piden todas las que entren en el radio.
      const last = lastFetchCenterRef.current;
      // Con la lista ya poblada basta con no repetir la consulta en cada paso;
      // si está vacía (fuera de cobertura) se vuelve a intentar al moverse.
      const loaded = plantsRef.current !== null && plantsRef.current.length > 0;
      lastRequestedCenterRef.current = coords;
      if (last && (loaded || plantsLoadingRef.current) && metersBetween(last, coords) < NEARBY_REFRESH_METERS) return;
      // Si ya se está cargando, NO la abortamos: 67k plantas se pidieron para
      // una posición y deben terminar. La siguiente posición se atenderá al
      // terminar, en lugar de reiniciar la descarga una y otra vez.
      if (plantsLoadingRef.current) return;
      plantsLoadingRef.current = true;
      const controller = new AbortController();
      plantsAbortRef.current = controller;
      lastFetchCenterRef.current = coords;
      // La rueda aparece ya en el primer render útil, con el anillo vacío.
      setPlantProgress({ loaded: 0, total: 0 });
      openPlantToast();
      const loadPages = async () => {
        let offset = 0;
        let total = 0;
        let more = true;
        const found: PlantPin[] = [];
        do {
          const response = await fetchNearbyTrees(
            { latitude: coords.latitude, longitude: coords.longitude, radius: modeRadius,
              limit: NEARBY_PAGE_SIZE, offset, lang },
            controller.signal,
          );
          if (controller.signal.aborted) return;
          total = response.total;
          found.push(...response.trees.map((plant) => ({
            id: plant.id,
            displayName: plant.displayName,
            scientificName: plant.scientificName ?? plant.reportedScientificName,
            latitude: plant.latitude,
            longitude: plant.longitude,
            identified: plant.speciesId !== null,
            speciesId: plant.speciesId,
            distance: plant.distance,
            greenAreaId: plant.greenAreaId ?? null,
          })));
          offset += response.trees.length;
          more = response.trees.length > 0 && offset < total && total > 0;
          setPlantProgress({ loaded: found.length, total });
          // Publicación progresiva: cada página entra en cuanto llega, para no
          // agrupar y pintar las 67k de golpe al final. El filtro por radio y
          // por zonas hace que cada render trabaje con muchas menos plantas.
          if (found.length > 0) setPlants([...found]);
        } while (more);
      };
      loadPages().catch(() => {
        if (!controller.signal.aborted) setPlantsFailed(true);
      }).finally(() => {
        // Solo la carga vigente decide: una abortada que termina tarde no toca
        // el estado de la que tomó el relevo.
        if (plantsAbortRef.current !== controller) return;
        plantsLoadingRef.current = false;
        if (controller.signal.aborted) {
          // Nos abortaron para cargar otra zona: esa nueva carga ya está en
          // marcha y maneja su propia rueda. No apagar el progreso aquí.
          return;
        }
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        if (toastHideRef.current) clearTimeout(toastHideRef.current);
        setPlantProgress(null);
        setShowPlantToast(false);
        setToastExiting(false);
        // El GPS pidió otra zona mientras cargábamos: se atiende ahora, sin
        // haber abortado la descarga que ya estaba en marcha.
        const pending = lastRequestedCenterRef.current;
        if (pending && metersBetween(pending, coords) >= NEARBY_REFRESH_METERS) {
          lastFetchCenterRef.current = null;
          loadPlantsRef.current(pending);
        }
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
    drawUser(coords);

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

    // La carga la inicia el effects del permiso con esta misma posición.
  }, [drawUser]);

  useEffect(() => {
    if (!mapElementRef.current) return;

    const map = L.map(mapElementRef.current, {
      center: [VALENCIA.latitude, VALENCIA.longitude],
      zoom: 15,
      zoomControl: false,
      attributionControl: false,
    });
    mapRef.current = map;
    addOfflineTileLayer(map);
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
      selectedSpeciesLayerRef.current = null;
      parksLayerRef.current = null;
      groupAreaRef.current = null;
    };
  }, []);

  // Con posición conocida (la fija el permiso) la vía cercanas toma el relevo,
  // salvo que alrededor no haya ningún ejemplar: entonces se pintan las
  // globales para que el mapa no quede vacío fuera de València.

  // Plantas del inventario: sin posición conocida, las globales de la UT 908;
  // en cuanto hay posición, la vía cercanas toma el relevo con parámetros por
  // modo (aventura: radio fijo; resto: radio de Ajustes).
  useEffect(() => {
    if (locationPermission === null) return;
    // El permiso y la posición llegan por separado: cargar solo una vez con
    // la primera posición conocida (o Valencia si no hay GPS).
    if (plantsLoadingRef.current || plantsRef.current !== null) return;
    const current = locatedPosition ?? currentPositionRef.current ?? VALENCIA;
    loadPlantsRef.current({ latitude: current.latitude, longitude: current.longitude });
  }, [locationPermission, locatedPosition]);

  // El círculo azul y el punto de ubicación solo salen con GPS.
  useEffect(() => {
    if (locatedPosition === null) {
      userMarkerRef.current?.remove();
      userMarkerRef.current = null;
      searchAreaCircleRef.current?.remove();
      searchAreaCircleRef.current = null;
      return;
    }
    drawUser(locatedPosition);
  }, [locatedPosition, drawUser]);

  // Etiquetas de plantas junto al icono solo a partir del zoom de la UT 908.
  useEffect(() => {
    const map = mapRef.current;
    const container = mapElementRef.current;
    if (!map || !container) return;
    const syncLabels = () => {
      const zoom = map.getZoom();
      container.classList.toggle('plants-labels-visible', zoom >= 16);
      // Cuanto más lejos, más pequeños: parques y plantas dejan de solaparse.
      container.classList.toggle('plants-compact', zoom < 16);
      container.classList.toggle('plants-tiny', zoom <= 13);
    };
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


  // Zonas verdes: se piden una vez por sesión (quedan en caché) aunque la capa
  // esté apagada, porque el mapa las necesita para agrupar las plantas por
  // parque. Si fallan, no se agrupa y no se avisa: el mapa sigue igual.
  useEffect(() => {
    let cancelled = false;
    fetchGreenAreas()
      .then((areas) => {
        if (!cancelled) setGreenAreas(areas);
      })
      .catch(() => {
        // Sin zonas no hay agrupación; el interruptor sí avisa si falla.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Capa de zonas verdes: se descarga la primera vez que se enciende (queda
  // en caché para la sesión) y se retira entera al apagarla.
  const openZoneLabel = t('map.greenAreaOpen');
  useEffect(() => {
    const map = mapRef.current;
    if (!greenAreasOn || !map) return;
    let cancelled = false;
    fetchGreenAreas()
      .then((areas) => {
        if (cancelled || mapRef.current !== map) return;
        greenAreasLayerRef.current = addGreenAreasLayer(map, areas, {
          onOpen: (groupSlug) => navigate(`/zona/${groupSlug}`),
          text: { open: openZoneLabel },
        });
        setGreenAreasVersion((current) => current + 1);
      })
      .catch(() => {
        if (!cancelled) setGreenAreasFailed(true);
      });
    return () => {
      cancelled = true;
      greenAreasLayerRef.current?.remove();
      greenAreasLayerRef.current = null;
    };
  }, [greenAreasOn, navigate, openZoneLabel]);

  // Parque seleccionado: se resalta solo ese y el mapa se centra en él. Deja
  // de seguir al usuario para que la siguiente posición no deshaga el encuadre.
  useEffect(() => {
    const layer = greenAreasLayerRef.current;
    if (!layer) return;
    layer.select(selectedZone);
    if (selectedZone !== null && layer.fit(selectedZone)) {
      followUserRef.current = false;
      keepBothVisibleRef.current = false;
    }
  }, [greenAreasVersion, selectedZone]);

  const toggleGreenAreas = () => {
    if (zoneSpeciesId !== null) {
      // Con una especie del parque a la vista, ocultar o mostrar la capa no
      // toca ni la URL ni el filtro, y por tanto tampoco el encuadre del mapa.
      setGreenAreasFailed(false);
      if (greenAreasOn) {
        setZoneLayerHidden(true);
        setGreenAreasToggled(false);
      } else {
        setZoneLayerHidden(false);
        setGreenAreasToggled(true);
      }
      return;
    }
    if (greenAreasOn && selectedZone !== null) {
      // Al apagar la capa se quita el resaltado, pero se recuerda el parque.
      setRememberedZone(selectedZone);
      const params = new URLSearchParams(searchParams);
      params.delete('zona');
      setSearchParams(params, { replace: true });
    } else if (!greenAreasOn && rememberedZone !== null) {
      // Al encenderla de nuevo, vuelve el contorno del parque que había elegido.
      const params = new URLSearchParams(searchParams);
      params.set('zona', rememberedZone);
      setSearchParams(params, { replace: true });
    }
    setGreenAreasFailed(false);
    setGreenAreasToggled(!greenAreasOn);
  };

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

  // Repintado al desplazarse: Leaflet mueve los marcadores por sí solo, pero
  // el muestreo depende del viewport, así que al soltar hay que recalcular.
  // Con retardo y umbral para no reconstruir cientos de iconos en cada paso.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const repaint = (force = false) => {
      const center = map.getCenter();
      const point = { latitude: center.lat, longitude: center.lng };
      const last = paintedCenterRef.current;
      if (!force && last && metersBetween(last, point) < 300) return;
      paintedCenterRef.current = point;
      repaintPlantsRef.current();
      repaintPoisRef.current();
    };
    const schedule = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => { timer = null; repaint(); }, 250);
    };
    const onZoom = () => { if (timer) { clearTimeout(timer); timer = null; } repaint(true); };
    map.on('moveend', schedule);
    map.on('zoomend', onZoom);
    return () => {
      if (timer) clearTimeout(timer);
      map.off('moveend', schedule);
      map.off('zoomend', onZoom);
    };
  }, []);

  // Agrupación fina: se calcula UNA VEZ cuando cambian las plantas (o la capa
  // de parques), no en cada zoom. Con 67k plantas cuesta ~0,4 s; repetirlo en
  // cada moveend era lo que congelaba el mapa.
  const plantGroups = useMemo(() => {
    let source = zoneSpeciesId !== null ? (zoneSpecies?.pins ?? []) : plants;
    if (!source) return null;
    // Con GPS solo se pintan los ejemplares dentro del círculo azul.
    if (locatedPosition !== null && zoneSpeciesId === null) {
      source = source.filter((pin) => metersBetween(locatedPosition, pin) <= radius);
    }
    // Con la capa de zonas encendida, el parque absorbe a sus plantas: se
    // ocultan del mapa y solo se ve su marcador con el recuento.
    if (greenAreasOn && zoneSpeciesId === null) {
      const zoneIds = new Set((greenAreas ?? []).map((area) => area.id));
      source = source.filter((pin) => pin.greenAreaId == null || !zoneIds.has(pin.greenAreaId));
    }
    const parks = zoneSpeciesId === null && greenAreas !== null
      ? clusterPlantsByPark(source, greenAreas)
      : null;
    // Grupos finos de cada zona para poder soltarlos poco a poco al acercarse.
    const parkGroups = new Map<string, PlantPin[]>();
    for (const [slug, members] of parks?.membersByGroup ?? []) {
      parkGroups.set(slug, groupNearbyPlants(members).pins
        .sort((a, b) => (b.count ?? 1) - (a.count ?? 1)));
    }
    return {
      parks: parks?.clusters ?? [],
      membersByGroup: parks?.membersByGroup ?? new Map<string, PlantPin[]>(),
      parkGroups,
      loose: parks ? parks.loose : source,
      groups: groupNearbyPlants(parks ? parks.loose : source),
    };
  }, [plants, zoneSpecies, zoneSpeciesId, greenAreas, greenAreasOn, locatedPosition, radius]);

  // Capa de marcadores de plantas: en cada movimiento solo se filtran al viewport
  // los grupos ya calculados y se cogen los más numerosos (muestreo barato).
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const paint = () => {
    if (plantsLayerRef.current) {
      plantsLayerRef.current.remove();
      plantsLayerRef.current = null;
    }
    parksLayerRef.current?.remove();
    parksLayerRef.current = null;
    clearGroupArea();
    const bounds = map.getBounds();
    const zoom = map.getZoom();
    // Cuanto más lejos, más ejemplares absorbe la zona: contador grande y
    // menos iconos. Al acercarse se van soltando grupos de la zona al mapa.
    const absorbedFraction = zoom <= 15 ? 1 : zoom === 16 ? 0.5 : zoom === 17 ? 0.25 : 0;
    const parkMarkers = [];
    const releasedFromParks: PlantPin[] = [];
    for (const cluster of plantGroups?.parks ?? []) {
      if (!bounds.contains([cluster.latitude, cluster.longitude])) continue;
      const groups = plantGroups?.parkGroups.get(cluster.groupSlug) ?? [];
      const absorbed = groups.slice(0, Math.round(groups.length * absorbedFraction));
      releasedFromParks.push(...groups.slice(absorbed.length));
      const shown = absorbed.reduce((sum, group) => sum + (group.count ?? 1), 0);
      if (shown > 0) parkMarkers.push({ ...cluster, shown });
    }
    if (parkMarkers.length > 0) {
      parksLayerRef.current = addParkMarkers(
        map,
        parkMarkers,
        (groupSlug) => {
          setExploreOpen(false);
          navigate(`/zona/${groupSlug}`);
        },
        { label: (cluster) => t('map.parkPlants', { name: cluster.name, count: cluster.total ?? cluster.shown }) },
      );
    }
    if (!plantGroups || (plantGroups.loose.length === 0 && releasedFromParks.length === 0)) {
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
    const visible = [...plantGroups.groups.pins, ...releasedFromParks]
      .filter((pin) => bounds.contains([pin.latitude, pin.longitude]));
    let pins = visible;
    if (visible.length > MAX_PLANT_MARKERS) {
      // 16x16 celdas del viewport: el grupo más numeroso de cada celda. Así la
      // muestra se reparte por el mapa en vez de amontonarse donde hay más.
      const cols = 16;
      const rows = 16;
      const west = bounds.getWest();
      const south = bounds.getSouth();
      const cellWidth = (bounds.getEast() - west) / cols;
      const cellHeight = (bounds.getNorth() - south) / rows;
      const best = new Map<string, PlantPin>();
      for (const pin of visible) {
        const cx = Math.min(cols - 1, Math.max(0, Math.floor((pin.longitude - west) / cellWidth)));
        const cy = Math.min(rows - 1, Math.max(0, Math.floor((pin.latitude - south) / cellHeight)));
        const key = `${cx}:${cy}`;
        const current = best.get(key);
        if (!current || (pin.count ?? 1) > (current.count ?? 1)) best.set(key, pin);
      }
      pins = [...best.values()];
    }
    // Índice por id: antes se comparaban 7500 áreas con 400 pines (3M
    // comparaciones) en cada repintado.
    const pinIds = new Set(pins.map((pin) => pin.id));
    groupAreasRef.current = new Map(
      [...(plantGroups?.groups.areasById ?? [])].filter(([id]) => pinIds.has(id)),
    );
    memberAreasRef.current = plantGroups?.groups.areaByMemberId ?? new Map();
    const handlePlantClick = (pin: PlantPin) => {
      clearGroupArea();
      setExploreOpen(false);
      if (pin.count !== undefined && pin.count > 1) {
        const area = groupAreasRef.current.get(pin.id);
        if (area) drawArea(area.center, area.radius);
      }
      return onOpenPlant?.(pin) ?? false;
    };
    cancelPlantFramesRef.current?.();
    const progressive = addPlantMarkersProgressively(
      map,
      hiddenSpeciesId === null ? pins : pins.filter((pin) => pin.speciesId !== hiddenSpeciesId),
      popupFor,
      handlePlantClick,
    );
    plantsLayerRef.current = progressive.layer;
    cancelPlantFramesRef.current = progressive.cancel;
    };
    repaintPlantsRef.current = paint;
    paint();
    return () => { repaintPlantsRef.current = () => undefined; };
  }, [plantGroups, lang, clearGroupArea, drawArea, onOpenPlant, t, hiddenSpeciesId, navigate]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const paint = () => {
    poisLayerRef.current?.remove();
    const bounds = map.getBounds();
    const layer = L.layerGroup();
    pois.filter((poi) => bounds.contains([poi.lat, poi.lon]))
      .filter((poi) => locatedPosition === null || metersBetween(locatedPosition, { latitude: poi.lat, longitude: poi.lon }) <= radius)
      .forEach((poi) => {
      const marker = L.circleMarker([poi.lat, poi.lon], { radius: 8, color: '#8b5e20', fillColor: '#c58a31', fillOpacity: 1, weight: 2 });
      // Tooltip al pasar por encima, no permanente: con cientos de POIs, un
      // nodo DOM visible por punto hunde el render del mapa.
      marker.bindTooltip(`${escapeHtml(poi.name)} · ${escapeHtml(formatDistance(poi.distance, lang))}`, {
        direction: 'top',
        offset: L.point(0, -8),
        className: 'poi-distance-label',
      });
      marker.addTo(layer);
    });
    poisLayerRef.current = layer.addTo(map);
    };
    repaintPoisRef.current = paint;
    paint();
    return () => { repaintPoisRef.current = () => undefined; poisLayerRef.current?.remove(); };
  }, [pois, t, lang, locatedPosition, radius]);

  // «Ver en el mapa» (ficha, RF3): centra el ejemplar más cercano de la especie
  // pedida por parámetro y pinta su área; si no hay ninguno dentro del radio
  // del modo, avisa. Un solo uso: el parámetro se limpia al atenderlo, y se
  // espera a tener posición y plantas cercanas cargadas.
  useEffect(() => {
    const verRaw = searchParams.get('verEspecie');
    if (verRaw === null || !/^\d+$/.test(verRaw)) return;
    // Con parque (`?zona=`) lo atiende el filtro de especie del parque.
    if (selectedZone !== null) return;
    const neighborhood = searchParams.get('barrio');
    const requestId = ++speciesFocusRequestRef.current;
    // El GPS puede seguir actualizando la ubicación, pero no debe recentrar el
    // mapa mientras se está mostrando la selección solicitada desde la ficha.
    followUserRef.current = false;
    keepBothVisibleRef.current = false;
    // Limpiar solo verEspecie: si venía con verRuta, la ruta sigue pintada.
    const next = new URLSearchParams(searchParams);
    next.delete('verEspecie');
    setSearchParams(next, { replace: true });
    const speciesId = Number(verRaw);
    selectedSpeciesLayerRef.current?.remove();
    setFocusMessage('');
    setSelectedSpeciesLocationCount(0);
    setFocusLoading(true);
    Promise.all([getSpeciesDetail(speciesId, lang), getSpeciesLocations(speciesId, lang)])
      .then(([species, locations]) => {
        if (requestId !== speciesFocusRequestRef.current) return;
        selectedSpeciesLayerRef.current?.remove();
        const name = commonNameFor(species.names, lang) ?? species.scientificName;
        setSelectedSpeciesName(neighborhood ? `${name} · ${neighborhood}` : name);
        setHiddenSpeciesId(speciesId);
        const matchingLocations = neighborhood
          ? locations.filter((location) => normalizeLocationName(location.neighborhood ?? location.district ?? '') === normalizeLocationName(neighborhood))
          : locations;
        const locationPins: PlantPin[] = matchingLocations.map((location) => ({
          id: location.id, speciesId, displayName: name, scientificName: species.scientificName,
          latitude: location.latitude, longitude: location.longitude, identified: true,
        }));
        setSelectedSpeciesLocationCount(locationPins.length);
        if (locationPins.length === 0) {
          setFocusMessage(neighborhood
            ? t('map.noNeighborhoodLocations', { name: neighborhood })
            : t('map.noSpeciesLocations'));
          setFocusLoading(false);
          return;
        }
        const map = mapRef.current;
        if (!map) {
          setFocusLoading(false);
          return;
        }
        const pins = groupSelectedLocations(locationPins);
        selectedSpeciesLayerRef.current = addSpeciesLocationMarkers(map, pins, onOpenPlant);
        map.fitBounds(L.latLngBounds(locationPins.map((pin): L.LatLngTuple => [pin.latitude, pin.longitude])), { padding: [56, 56], maxZoom: 17 });
        setFocusLoading(false);
      })
      .catch(() => {
        if (requestId === speciesFocusRequestRef.current) {
          setFocusMessage(t('map.speciesLocationsError'));
          setFocusLoading(false);
        }
      });
  }, [searchParams, setSearchParams, lang, onOpenPlant, t, selectedZone]);

  const clearSpeciesSelection = () => {
    speciesFocusRequestRef.current += 1;
    selectedSpeciesLayerRef.current?.remove();
    selectedSpeciesLayerRef.current = null;
    setSelectedSpeciesName('');
    setSelectedSpeciesLocationCount(0);
    setHiddenSpeciesId(null);
    setFocusLoading(false);
    setFocusMessage('');
  };

  // Ejemplares de la especie elegida dentro del parque: se piden las plantas de
  // la zona (o su copia descargada) y se queda solo con esa especie.
  useEffect(() => {
    setZoneSpecies(null);
    setZoneSpeciesFailed(false);
    if (selectedZone === null || zoneSpeciesId === null) return;
    const controller = new AbortController();
    fetchGreenAreaPlants(selectedZone, lang, controller.signal)
      .then((zonePlants) => {
        if (controller.signal.aborted) return;
        const pins: PlantPin[] = zonePlants
          .filter((plant) => plant.speciesId === zoneSpeciesId)
          .map((plant) => ({
            id: plant.id,
            displayName: plant.displayName,
            scientificName: plant.scientificName ?? plant.reportedScientificName,
            latitude: plant.latitude,
            longitude: plant.longitude,
            identified: true,
            speciesId: plant.speciesId,
            greenAreaId: plant.greenAreaId,
          }));
        setZoneSpecies({ name: pins[0]?.displayName ?? '', pins });
      })
      .catch(() => {
        if (!controller.signal.aborted) setZoneSpeciesFailed(true);
      });
    return () => controller.abort();
  }, [selectedZone, zoneSpeciesId, lang]);

  // Encuadra los ejemplares elegidos (y no todo el parque) para verlos de un vistazo.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !zoneSpecies || zoneSpecies.pins.length === 0) return;
    followUserRef.current = false;
    keepBothVisibleRef.current = false;
    const bounds = L.latLngBounds(zoneSpecies.pins.map((pin) => [pin.latitude, pin.longitude] as [number, number]));
    map.fitBounds(bounds, { padding: [64, 64], maxZoom: 18 });
  }, [zoneSpecies, greenAreasVersion]);

  const clearSpeciesFilter = () => {
    const params = new URLSearchParams(searchParams);
    params.delete('verEspecie');
    // Con los parques ocultos, quitar el filtro no debe volver a dibujarlos ni
    // encuadrar el parque: se suelta también la zona.
    if (zoneLayerHidden) params.delete('zona');
    setSearchParams(params, { replace: true });
  };

  // «Ver en el mapa» desde la ficha de ruta: pinta el recorrido y sus paradas
  // mientras exista el parámetro `verRuta`. Las paradas de planta usan el pin
  // del mapa y abren su ficha; las de POI son un marcador visual (su ficha
  // llega en una UT posterior). «Limpiar mapa» quita el parámetro y la capa.
  useEffect(() => {
    routeAbortRef.current?.abort();
    routeAbortRef.current = null;
    if (routeLayerRef.current) {
      routeLayerRef.current.remove();
      routeLayerRef.current = null;
    }
    if (routeId === null) return;
    // La ruta manda sobre la vista: que el GPS no recentre el mapa en el
    // usuario al pintarla (el usuario sí puede arrastrar el mapa después).
    followUserRef.current = false;
    keepBothVisibleRef.current = false;
    paintedRouteId = routeId;
    const controller = new AbortController();
    routeAbortRef.current = controller;
    fetchRouteDetail(routeId, controller.signal)
      .then((route) => {
        if (controller.signal.aborted) return;
        const map = mapRef.current;
        if (!map) return;
        // Mismo dibujado que la ficha de ruta: polilínea, inicio y paradas.
        const layer = addRouteOverlay(map, route, {
          onOpenStop: (stop) => {
            if (stop.kind !== 'planta') return;
            onOpenPlantRef.current?.(routeStopToPlantPin(stop));
          },
        });
        fitRouteBounds(map, route);
        routeLayerRef.current = layer;
      })
      .catch(() => {
        // Si la ruta no se puede cargar, el botón «Limpiar mapa» sigue
        // quitando el parámetro: no hay capa que quitar y no molesta.
      });
    return () => {
      controller.abort();
      if (routeLayerRef.current) {
        routeLayerRef.current.remove();
        routeLayerRef.current = null;
      }
    };
  }, [routeId]);

  const clearRoute = () => {
    clearPaintedRoute();
    setSavedRouteId(null);
    if (paramRouteId !== null) setSearchParams({}, { replace: true });
  };

  // El área de búsqueda sigue al radio aunque cambie el modo o el deslizador.
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

  // «Explorar cerca»: reutiliza los grupos ya calculados para el mapa (agrupar
  // 67k plantas de nuevo en cada render era lo que congelaba la interfaz) y
  // muestra solo los primeros 100; el mapa es la vista completa.
  const explorePlants = useMemo(() => {
    if (areaPlants !== null) {
      return locatedPosition !== null ? groupNearbyPlants(areaPlants).pins : areaPlants;
    }
    const groups = plantGroups?.groups.pins;
    if (!groups) return [];
    return [...groups]
      .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0))
      .slice(0, 100);
  }, [areaPlants, plantGroups, locatedPosition]);

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

      {/* Indicador de carga: círculo verde arriba a la derecha que se va
          completando, con una tarjeta a su izquierda que se retira en 3 s.
          No bloquea el mapa: se puede arrastrar mientras carga. */}
      {plantProgress && (
        <div className="absolute right-4 top-20 z-[1060] flex items-center gap-2">
          {showPlantToast && (
            <span key={toastKey} role="status"
              className={`rounded-full border border-line bg-surface px-3 py-2 text-caption font-semibold text-ink shadow-raised ${toastExiting ? 'plant-progress-card--leaving' : 'plant-progress-card--entering'}`}>
              {t('map.loadingPlants')}
            </span>
          )}
          <button type="button" onClick={openPlantToast}
            aria-label={t('map.loadingPlants')}
            className="plant-progress-ring"
            title={t('map.loadingPlants')}>
            <svg viewBox="0 0 36 36" className="h-7 w-7 -rotate-90" aria-hidden="true">
              <circle cx="18" cy="18" r="15" fill="none" stroke="var(--color-surface)" strokeWidth="4" />
              <circle cx="18" cy="18" r="15" fill="none" stroke="var(--color-accent)" strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 15}
                strokeDashoffset={2 * Math.PI * 15 * (1 - Math.min(1, plantProgress.loaded / Math.max(plantProgress.total, 1)))} />
            </svg>
          </button>
        </div>
      )}

      <button type="button" onClick={() => setExploreOpen((open) => !open)} aria-expanded={exploreOpen}
        className="absolute bottom-4 left-1/2 z-[1000] flex min-h-12 -translate-x-1/2 items-center gap-2 rounded-full bg-surface px-5 text-body font-semibold text-ink shadow-float focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
        {exploreOpen ? <ChevronDown size={18} /> : <ChevronUp size={18} />} {t('map.explore')}
      </button>

      <aside className={`absolute inset-x-0 bottom-0 z-[1050] rounded-t-3xl bg-surface shadow-float transition-transform duration-300 ${exploreOpen ? 'translate-y-0' : 'translate-y-full'}`} style={{height:'62%'}} aria-label={t('map.explorePanel')}>
        <div className="flex h-full flex-col px-4 pt-2 pb-[env(safe-area-inset-bottom,0px)]">
          <button
            type="button"
            onClick={() => setExploreOpen(false)}
            className="mx-auto -mt-1 mb-1 flex h-11 w-36 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            aria-label={t('map.exploreClose')}
          >
            <span className="h-1.5 w-12 rounded-full bg-line-strong" aria-hidden="true" />
          </button>
          <p className="mb-2 text-small font-semibold text-ink">{t('map.nearbyTitle')}</p>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {/* Cerrado = solo la estructura: montar cientos de artículos en cada
                render de progreso era el 24 % de las muestras de CPU. */}
            {exploreOpen && (areaLoading ? <p role="status" className="py-8 text-center text-small text-muted">{t('map.loadingArea')}</p> : areaFailed ? <p role="status" className="py-8 text-center text-small text-danger">{t('map.areaError')}</p> : explorePlants.length === 0 && pois.length === 0 && !poiLoading ? <p className="py-8 text-center text-small text-muted">{t('map.emptyArea')}</p> : <>
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
            </>)}
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

          {zoneSpeciesId !== null && (zoneSpecies !== null || zoneSpeciesFailed) && (
            <div className="mt-2 flex items-center gap-2 rounded-full bg-surface py-1 pr-1 pl-4 shadow-float" role="status">
              <Leaf size={16} className="shrink-0 text-accent" aria-hidden="true" />
              <p className="min-w-0 flex-1 truncate text-small font-semibold text-ink">
                {zoneSpeciesFailed
                  ? t('map.speciesInParkFailed')
                  : zoneSpecies!.pins.length === 0
                    ? t('map.speciesInParkNone')
                    : t('map.speciesInPark', { name: zoneSpecies!.name, count: zoneSpecies!.pins.length })}
              </p>
              <button
                type="button"
                onClick={clearSpeciesFilter}
                aria-label={t('map.speciesInParkClear')}
                title={t('map.speciesInParkClear')}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>
          )}

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

          {greenAreasOn && greenAreasFailed && (
            <p className="mt-2 rounded-card bg-surface p-3 text-small text-muted shadow-float" role="status">
              {t('map.greenAreasError')}
            </p>
          )}

          {(plantsFailed || focusMessage) && (
            <p className="mt-2 rounded-card bg-surface p-3 text-small text-muted shadow-float" role="status">
              {plantsFailed
                ? t('map.plantsError')
                : focusMessage}
            </p>
          )}
          {selectedSpeciesName && (
            <div className="mt-2 flex items-center justify-between gap-2 rounded-card bg-surface px-3 py-2 shadow-float" role="status">
              <span className="min-w-0 truncate text-small text-ink">
                {selectedSpeciesName}
                <span className="ml-2 text-caption tabular-nums text-muted">{t('map.selectedSpeciesLocationCount', { count: selectedSpeciesLocationCount })}</span>
              </span>
              <button type="button" onClick={clearSpeciesSelection} className="shrink-0 rounded-control px-2 py-1 text-small font-semibold text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">{t('map.clearSpeciesSelection')}</button>
            </div>
          )}
          {focusLoading && (
            <p className="mt-2 rounded-card bg-surface p-3 text-small text-muted shadow-float" role="status">{t('map.loadingSpeciesLocations')}</p>
          )}
        </div>
      </div>

      {routeVisible && (
        <button
          type="button"
          onClick={clearRoute}
          aria-label={t('map.clearMap')}
          title={t('map.clearMap')}
          className="absolute right-4 bottom-52 z-[1000] flex h-12 w-12 items-center justify-center rounded-full bg-surface text-ink shadow-float transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <Trash2 size={21} aria-hidden="true" />
        </button>
      )}

      <button
        type="button"
        onClick={centerOnUser}
        aria-label={t('map.centerAria')}
        title={t('map.centerTitle')}
        className="absolute right-4 bottom-4 z-[1000] flex h-12 w-12 items-center justify-center rounded-full bg-surface text-ink shadow-float transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <LocateFixed size={21} aria-hidden="true" />
      </button>

      <button
        type="button"
        onClick={toggleGreenAreas}
        aria-pressed={greenAreasOn}
        aria-label={greenAreasOn ? t('map.greenAreasHide') : t('map.greenAreasShow')}
        title={greenAreasOn ? t('map.greenAreasHide') : t('map.greenAreasShow')}
        className={`absolute right-4 bottom-20 z-[1000] flex h-12 w-12 items-center justify-center rounded-full shadow-float transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${greenAreasOn ? 'bg-accent text-on-accent' : 'bg-surface text-ink hover:bg-surface-2'}`}
      >
        <Trees size={21} aria-hidden="true" />
      </button>

      {locationPermission === 'denied' && (
        <button
          type="button"
          onClick={retryLocation}
          aria-label={t('location.retryAria')}
          title={t('location.retryAria')}
          className="absolute right-4 bottom-36 z-[1000] flex h-12 w-12 items-center justify-center rounded-full bg-surface text-ink shadow-float transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <MapPinOff size={21} aria-hidden="true" />
        </button>
      )}

      {locationPermission === 'prompt' && (
        <div className="absolute inset-0 z-[1100]">
          <LocationPermissionPrompt onAllow={allowLocation} onDeny={denyLocation} />
        </div>
      )}

      {selectedZone && selectedZoneBox && zoneSpeciesId === null && !dismissedDownloads.includes(selectedZone) && (
        <div className="absolute bottom-9 left-4 right-20 z-[1000]">
          <OfflineZoneCard
            groupSlug={selectedZone}
            bbox={selectedZoneBox.bbox}
            plantCount={selectedZoneBox.plants}
            floating
            onSaved={(record) => setSavedToast(record.name)}
            onClose={() => setDismissedDownloads((current) => [...current, selectedZone])}
          />
        </div>
      )}

      {savedToast !== null && (
        <div className="absolute inset-x-4 top-20 z-[1200]">
          <OfflineSavedToast name={savedToast} onClose={closeSavedToast} />
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
