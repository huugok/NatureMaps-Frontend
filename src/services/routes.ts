import { apiGet } from './api';

// Catálogo de rutas botánico-culturales predefinidas (GET /routes del backend).
// El catálogo ya viene calculado y guardado en BD: la ficha pinta el `path`
// tal cual, sin segundas peticiones ni motores de rutas en vivo.

/** Contenido de las paradas de una ruta. */
export type RouteTheme = 'botanica' | 'cultural' | 'mixta';

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

/** Listado del catálogo, ordenado por distancia (corta → larga). */
export async function fetchRouteList(signal?: AbortSignal): Promise<RouteSummary[]> {
  const data = await apiGet<{ total: number; routes: RouteSummary[] }>('/routes', signal);
  return data.routes;
}

/** Ficha completa de una ruta, con paradas y recorrido. */
export async function fetchRouteDetail(id: number, signal?: AbortSignal): Promise<RouteDetail> {
  return apiGet<RouteDetail>(`/routes/${id}`, signal);
}
