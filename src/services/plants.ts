import { apiGet } from './api';
import type { Language } from '../types/language';
import type { PlantPin } from '../types/plant';
import { repairTextEncoding } from '../i18n/format';

// Plantas del mapa (F03.1). Consume `GET /trees` del backend, que pagina de 200
// en 200 y todavía no filtra por zona; por eso se limita el total que se carga.

const PAGE_SIZE = 200;
/** Tope de plantas que se piden de una vez para no saturar el mapa ni la red. */
export const MAX_PLANTS = 1000;

interface TreesResponse {
  nextOffset: number | null;
  trees: Array<{
    id: number;
    speciesId: number | null;
    displayName: string;
    scientificName: string | null;
    reportedScientificName: string | null;
    latitude: number;
    longitude: number;
  }>;
}

// El backend guarda los nombres en catalán con el código `ca`; la app usa `va`.
const API_LANGUAGE: Record<Language, string> = { es: 'es', va: 'ca', en: 'en' };

export async function fetchPlantPins(lang: Language, signal?: AbortSignal): Promise<PlantPin[]> {
  const pins: PlantPin[] = [];
  let offset: number | null = 0;

  while (offset !== null && pins.length < MAX_PLANTS) {
    const page: TreesResponse = await apiGet<TreesResponse>(
      `/trees?limit=${PAGE_SIZE}&offset=${offset}&lang=${API_LANGUAGE[lang]}`,
      signal,
    );
    for (const tree of page.trees) {
      pins.push({
        id: tree.id,
        displayName: repairTextEncoding(tree.displayName),
        scientificName: tree.scientificName ? repairTextEncoding(tree.scientificName) : tree.reportedScientificName ? repairTextEncoding(tree.reportedScientificName) : null,
        latitude: tree.latitude,
        longitude: tree.longitude,
        identified: tree.speciesId !== null,
        speciesId: tree.speciesId,
      });
    }
    offset = page.nextOffset;
  }

  return pins.slice(0, MAX_PLANTS);
}
