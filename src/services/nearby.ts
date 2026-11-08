import { apiGet } from './api';
import type { Mode } from '../types';
import { repairTextEncoding } from '../i18n/format';

// Plantas cercanas al usuario (GET /trees/nearby del backend).
// El backend devuelve `distance` en metros (línea recta) y ordena de más
// cercana a más lejana; aquí solo se consume.

export interface NearbyPlant {
  id: number;
  speciesId: number | null;
  scientificName: string | null;
  reportedScientificName?: string | null;
  commonName: string | null;
  displayName: string;
  latitude: number;
  longitude: number;
  /** Distancia en línea recta al punto consultado, en metros. */
  distance: number;
}

export interface NearbyResponse {
  center: { latitude: number; longitude: number };
  radius: number;
  returned: number;
  limit: number;
  language: string;
  trees: NearbyPlant[];
}

// Radio de búsqueda configurable en Ajustes. Va en su propia clave de
// localStorage para no tocar `naturemaps:prefs`, que solo guarda el modo.
const RADIUS_KEY = 'naturemaps:radius';

export const NEARBY_RADIUS_AVENTURA = 1000;
export const DEFAULT_NEARBY_RADIUS = NEARBY_RADIUS_AVENTURA;
export const NEARBY_RADIUS_MIN = 100;
export const NEARBY_RADIUS_MAX = 10000;
export const NEARBY_RADIUS_STEP = 100;

/** Radio de cercanas según el modo: aventura fijo, resto el del deslizador. */
export function effectiveNearbyRadius(mode: Mode | null, sliderRadius: number): number {
  return mode === 'aventura' ? NEARBY_RADIUS_AVENTURA : sliderRadius;
}

/** Radio guardado por el usuario (recortado y alineado al paso), en metros. */
export function readNearbyRadius(): number {
  const raw = localStorage.getItem(RADIUS_KEY);
  if (raw === null) return DEFAULT_NEARBY_RADIUS;
  const value = Number(raw);
  if (!Number.isFinite(value)) return DEFAULT_NEARBY_RADIUS;
  const snapped = Math.round(value / NEARBY_RADIUS_STEP) * NEARBY_RADIUS_STEP;
  return Math.min(NEARBY_RADIUS_MAX, Math.max(NEARBY_RADIUS_MIN, snapped));
}

export function saveNearbyRadius(meters: number): void {
  localStorage.setItem(RADIUS_KEY, String(meters));
}

export async function fetchNearbyTrees(
  params: { latitude: number; longitude: number; radius: number; limit?: number; lang: string },
  signal?: AbortSignal,
): Promise<NearbyResponse> {
  const query = new URLSearchParams({
    lat: String(params.latitude),
    lon: String(params.longitude),
    radius: String(params.radius),
    limit: String(params.limit ?? 100),
    lang: params.lang,
  });
  const response = await apiGet<NearbyResponse>(`/trees/nearby?${query.toString()}`, signal);
  return {
    ...response,
    trees: response.trees.map((tree) => ({
      ...tree,
      commonName: repairTextEncoding(tree.commonName),
      displayName: repairTextEncoding(tree.displayName),
      scientificName: tree.scientificName ? repairTextEncoding(tree.scientificName) : null,
      reportedScientificName: tree.reportedScientificName ? repairTextEncoding(tree.reportedScientificName) : tree.reportedScientificName,
    })),
  };
}
