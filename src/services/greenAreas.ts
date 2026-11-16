import { apiGet } from './api';
import type { Language } from '../types/language';
import type { GreenArea, GreenAreaAt, GreenAreaDetail } from '../types/greenArea';

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
      .catch((error: unknown) => {
        // Un fallo no debe quedarse en caché: el siguiente intento vuelve a pedir.
        layerCache = null;
        throw error;
      });
  }
  return layerCache;
}

/** Solo para tests: olvida la capa cacheada. */
export function resetGreenAreasCache(): void {
  layerCache = null;
}

/** Ficha de una zona verde por su identificador legible. */
export function fetchGreenAreaDetail(groupSlug: string, lang: Language, signal?: AbortSignal): Promise<GreenAreaDetail> {
  return apiGet<GreenAreaDetail>(
    `/green-areas/group/${encodeURIComponent(groupSlug)}?lang=${API_LANGUAGE[lang]}`,
    signal,
  );
}

/** Zona verde que contiene un punto o, si no hay, el parque más cercano. */
export function fetchGreenAreaAt(latitude: number, longitude: number, signal?: AbortSignal): Promise<GreenAreaAt> {
  return apiGet<GreenAreaAt>(`/green-areas/at?lat=${latitude}&lon=${longitude}`, signal);
}
