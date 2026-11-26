import { apiGet } from './api';
import { isUnreachable } from './offlineError';
import { routeStore } from './offlineRouteStorage';

// Catálogo de rutas botánico-culturales predefinidas (GET /routes del backend).
// El catálogo ya viene calculado y guardado en BD: la ficha pinta el `path`
// tal cual, sin segundas peticiones ni motores de rutas en vivo.

/** Contenido de las paradas de una ruta. */
export type RouteTheme = 'botanica' | 'cultural' | 'mixta' | 'sponsor';

/** Forma que quedó el recorrido: anillo cerrado o línea si la zona no daba
 * para cerrarlo (el generador mantiene la longitud objetivo igualmente). */
export type RouteShape = 'circular' | 'lineal';

/** Categoría de longitud: corta 1–3 km, media 4–7 km, larga 8+ km. */
export type RouteLengthCategory = 'corta' | 'media' | 'larga';

export type RouteStopKind = 'planta' | 'poi' | 'sponsor';

/** Parada del recorrido: planta del inventario o POI cultural. */
export interface RouteStop {
  kind: RouteStopKind;
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  /** Especie del catálogo si la parada es una planta identificada; null en POIs
   * y plantas sin enlazar. Permite abrir su ficha real desde el mapa. */
  speciesId: number | null;
  /** Nombre comercial y ubicación básica del patrocinador (solo `sponsor`). */
  businessName?: string;
  sponsorLocation?: string;
}

export interface RoutePoint {
  latitude: number;
  longitude: number;
}

/** Datos del listado: lo que pinta una tarjeta, sin la geometría. */
export interface RouteSummary {
  id: number;
  name: string;
  theme: RouteTheme;
  shape: RouteShape;
  lengthCategory: RouteLengthCategory;
  distanceMeters: number;
  durationSeconds: number;
  start: RoutePoint;
  description: string;
  stopsCount: number;
}

/** Ficha completa: añade paradas en orden y la geometría del recorrido. */
export interface RouteDetail extends RouteSummary {
  stops: RouteStop[];
  path: RoutePoint[];
}

const ROUTE_CATALOG_KEY = 'naturemaps:route-catalog:v1';

function isRouteSummary(value: unknown): value is RouteSummary {
  if (value === null || typeof value !== 'object') return false;
  const route = value as Partial<RouteSummary>;
  return typeof route.id === 'number' && Number.isFinite(route.id)
    && typeof route.name === 'string'
    && (route.theme === 'botanica' || route.theme === 'cultural' || route.theme === 'mixta')
    && (route.shape === 'circular' || route.shape === 'lineal')
    && (route.lengthCategory === 'corta' || route.lengthCategory === 'media' || route.lengthCategory === 'larga')
    && typeof route.distanceMeters === 'number' && Number.isFinite(route.distanceMeters)
    && typeof route.durationSeconds === 'number' && Number.isFinite(route.durationSeconds)
    && typeof route.description === 'string'
    && typeof route.stopsCount === 'number' && Number.isFinite(route.stopsCount)
    && route.start !== null && typeof route.start === 'object'
    && typeof route.start.latitude === 'number' && Number.isFinite(route.start.latitude)
    && typeof route.start.longitude === 'number' && Number.isFinite(route.start.longitude);
}

/** El catálogo es ligero y no cambia con la descarga de una ruta. Guardarlo
 * permite seguir viendo todas las rutas sin red y avisar cuando una concreta
 * no está descargada, en lugar de reducir el listado a las copias guardadas. */
function readCachedRouteList(): RouteSummary[] {
  try {
    const raw = localStorage.getItem(ROUTE_CATALOG_KEY);
    if (raw === null) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isRouteSummary) : [];
  } catch {
    return [];
  }
}

function cacheRouteList(routes: RouteSummary[]): void {
  try {
    localStorage.setItem(ROUTE_CATALOG_KEY, JSON.stringify(routes));
  } catch {
    // El catálogo sigue disponible online aunque el navegador rechace localStorage.
  }
}

function mergeRoutes(...lists: RouteSummary[][]): RouteSummary[] {
  const byId = new Map<number, RouteSummary>();
  for (const list of lists) {
    for (const route of list) byId.set(route.id, route);
  }
  return [...byId.values()].sort((a, b) => a.distanceMeters - b.distanceMeters);
}

/** Listado del catálogo, ordenado por distancia (corta → larga). */
export async function fetchRouteList(signal?: AbortSignal): Promise<RouteSummary[]> {
  try {
    const data = await apiGet<{ total: number; routes: RouteSummary[] }>('/routes', signal);
    cacheRouteList(data.routes);
    return data.routes;
  } catch (error) {
    if (!isUnreachable(error)) throw error;
    const cached = readCachedRouteList();
    let downloaded: RouteSummary[] = [];
    try {
      const records = await routeStore().all();
      downloaded = records.map((record) => record.packet.route);
    } catch {
      // Un fallo de IndexedDB no debe ocultar el catálogo ligero ya cacheado.
    }
    const routes = mergeRoutes(cached, downloaded);
    if (routes.length === 0) throw error;
    return routes;
  }
}

/** Ficha completa de una ruta, con paradas y recorrido. */
export async function fetchRouteDetail(id: number, signal?: AbortSignal): Promise<RouteDetail> {
  try { return await apiGet<RouteDetail>(`/routes/${id}`, signal); }
  catch (error) {
    if (!isUnreachable(error)) throw error;
    const saved = await routeStore().get(id);
    if (!saved) throw error;
    return saved.packet.route;
  }
}
