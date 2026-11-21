import { apiGet } from './api';
import type { Language } from '../types/language';
import type { GreenArea, GreenAreaAt, GreenAreaDetail } from '../types/greenArea';
import type { OfflineZonePlant } from '../types/offline';
import { isUnreachable } from './offlineError';
import { offlineGreenAreaDetail, offlineGreenAreas, offlineZonePlants } from './offlineRead';

// Zonas verdes (NM-08). Consume `/green-areas` del backend: la capa del mapa,
// la ficha de una zona y la zona en la que cae un punto.

// El backend guarda el valenciano con el código `ca`; la app usa `va`.
export const API_LANGUAGE: Record<Language, string> = { es: 'es', va: 'ca', en: 'en' };

interface GreenAreasResponse {
  returned: number;
  areas: GreenArea[];
}

// La capa no cambia durante la sesión (el Ayuntamiento la actualiza muy de
// tarde en tarde) y pesa: se pide una sola vez y se comparte entre pantallas.
let layerCache: Promise<GreenArea[]> | null = null;

/** Parques y jardines con su contorno, para la capa del mapa. */
export function fetchGreenAreas(): Promise<GreenArea[]> {
  if (!layerCache) {
    layerCache = apiGet<GreenAreasResponse>('/green-areas')
      .then((response) => response.areas)
      .catch(async (error: unknown) => {
        // Un fallo no debe quedarse en caché: el siguiente intento vuelve a pedir.
        layerCache = null;
        // Sin red se pintan las zonas descargadas (sin cachear: al volver la red se pide la capa entera).
        const saved = isUnreachable(error) ? await offlineGreenAreas() : null;
        if (saved) return saved;
        throw error;
      });
  }
  return layerCache;
}

/** Solo para tests: olvida la capa cacheada. */
export function resetGreenAreasCache(): void {
  layerCache = null;
}

/** Ficha de una zona verde pedida al backend, sin copia local (la usa la descarga). */
export function fetchGreenAreaDetailOnline(groupSlug: string, lang: Language, signal?: AbortSignal): Promise<GreenAreaDetail> {
  return apiGet<GreenAreaDetail>(
    `/green-areas/group/${encodeURIComponent(groupSlug)}?lang=${API_LANGUAGE[lang]}`,
    signal,
  );
}

/** Ficha de una zona verde por su identificador legible; sin red, la copia descargada. */
export async function fetchGreenAreaDetail(groupSlug: string, lang: Language, signal?: AbortSignal): Promise<GreenAreaDetail> {
  try {
    return await fetchGreenAreaDetailOnline(groupSlug, lang, signal);
  } catch (error) {
    const saved = isUnreachable(error) ? await offlineGreenAreaDetail(groupSlug) : null;
    if (saved) return saved;
    throw error;
  }
}

/** Zona verde que contiene un punto o, si no hay, el parque más cercano. */
export function fetchGreenAreaAt(latitude: number, longitude: number, signal?: AbortSignal): Promise<GreenAreaAt> {
  return apiGet<GreenAreaAt>(`/green-areas/at?lat=${latitude}&lon=${longitude}`, signal);
}

/** Página de plantas de una zona (`GET /green-areas/group/:slug/plants`). */
export interface GreenAreaPlantsPage {
  groupSlug: string;
  total: number;
  returned: number;
  nextOffset: number | null;
  plants: OfflineZonePlant[];
}

export const GREEN_AREA_PLANTS_PAGE_SIZE = 500;

/** Una página de plantas de la zona, sin copia local (la usa también la descarga). */
export function fetchGreenAreaPlantsPage(
  groupSlug: string,
  lang: Language,
  offset: number,
  signal?: AbortSignal,
): Promise<GreenAreaPlantsPage> {
  return apiGet<GreenAreaPlantsPage>(
    `/green-areas/group/${encodeURIComponent(groupSlug)}/plants?limit=${GREEN_AREA_PLANTS_PAGE_SIZE}&offset=${offset}&lang=${API_LANGUAGE[lang]}`,
    signal,
  );
}

/** Todas las plantas de una zona; sin red, las de la copia descargada. */
export async function fetchGreenAreaPlants(
  groupSlug: string,
  lang: Language,
  signal?: AbortSignal,
): Promise<OfflineZonePlant[]> {
  try {
    const plants: OfflineZonePlant[] = [];
    let offset: number | null = 0;
    while (offset !== null) {
      const page: GreenAreaPlantsPage = await fetchGreenAreaPlantsPage(groupSlug, lang, offset, signal);
      plants.push(...page.plants);
      offset = page.nextOffset;
    }
    return plants;
  } catch (error) {
    const saved = isUnreachable(error) ? await offlineZonePlants(groupSlug) : null;
    if (saved) return saved;
    throw error;
  }
}
