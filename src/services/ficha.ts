import type { Language } from '../types/language';

// Servicio de la ficha de planta (RF3, UT F06): conecta la pantalla con la API
// del backend (NatureMaps-Backend) en lugar de leer datos de ejemplo de
// `constants.ts`. La precedencia del texto principal (editorial curado ->
// Wikipedia) la resuelve el servidor en el campo `content`; aquí solo se
// traduce la respuesta al tipo que pinta `FichaPlantaPage`.

// URL del backend. Se puede ajustar con VITE_API_URL en .env; por defecto
// apunta a localhost, como la API en desarrollo.
const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

/** Fuente declarada de un texto o de la ficha (RNF6: trazabilidad). */
export interface FichaSource {
  name: string;
  description: string;
  url: string;
}

/** Ficha editorial curada por el equipo, por especie e idioma. */
export interface FichaProfile {
  language: string;
  description: string | null;
  family: string | null;
  flowering: string | null;
  curiosity: string | null;
  sources: FichaSource[] | null;
}

/** Imagen referenciada de Wikimedia, con sus créditos completos. */
export interface FichaImageInfo {
  url: string;
  sourceUrl: string;
  author: string;
  license: string;
  licenseUrl: string;
  attribution: string;
}

export interface FichaNameInfo {
  name: string;
  language: string;
}

/** Fila de GET /species: alimenta la navegación Anterior/Siguiente. */
export interface FichaListItem {
  id: number;
  scientificName: string;
  names: FichaNameInfo[];
  /** Texto principal ya resuelto por el backend (editorial -> Wikipedia). */
  content: string | null;
  profile: FichaProfile | null;
  image: FichaImageInfo | null;
}

export interface FichaLocation {
  id: number;
  latitude: number;
  longitude: number;
  district: string | null;
  neighborhood: string | null;
  source: string;
  sourceUrl: string;
}

/** Respuesta de GET /species/:id: ficha completa con ubicaciones reales. */
export interface FichaDetail extends FichaListItem {
  locations: {
    total: number;
    returned: number;
    nextAfterId: number | null;
    items: FichaLocation[];
  };
}

/** Modelo de vista que consume FichaPlantaPage, ya mapeado desde la API. */
export interface EspecieFicha {
  id: number;
  commonName: string;
  scientificName: string;
  family: string | null;
  photoUrl: string | null;
  photoAlt: string;
  photoCredit: string | null;
  description: string;
  flowering: string | null;
  curiosity: { label: string; text: string } | null;
  sources: FichaSource[];
  locations: { district: string | null; neighborhood: string | null }[];
  locationTotal: number;
}

async function fetchJson<T>(url: string, mensaje: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url);
  } catch {
    // Error de red / servidor caído: el mensaje no expone detalles internos.
    throw new Error(mensaje);
  }
  if (!response.ok) {
    // El backend responde { error: string } en los fallos controlados.
    let detail = '';
    try {
      const body = (await response.json()) as { error?: unknown };
      if (typeof body.error === 'string') detail = body.error;
    } catch {
      // El cuerpo no es JSON: se queda el mensaje genérico.
    }
    throw new Error(detail !== '' ? `${mensaje}: ${detail}` : `${mensaje} (HTTP ${response.status})`);
  }
  return (await response.json()) as T;
}

/** Lista del catálogo para la navegación de la ficha. */
export async function getSpeciesList(language: Language): Promise<FichaListItem[]> {
  const body = await fetchJson<{ species: FichaListItem[] }>(
    `${API_URL}/species?lang=${encodeURIComponent(language)}`,
    'No se ha podido cargar el catálogo de especies',
  );
  return body.species ?? [];
}

/** Ficha completa de una especie, con sus ubicaciones reales. */
export async function getSpeciesDetail(id: number, language: Language): Promise<FichaDetail> {
  return fetchJson<FichaDetail>(
    `${API_URL}/species/${id}?lang=${encodeURIComponent(language)}`,
    'No se ha podido cargar la ficha de la especie',
  );
}

/**
 * Nombre común en el idioma pedido. Los nombres del inventario llegan en
 * español ('es') y valenciano ('ca', código del inventario municipal), así que
 * 'va' acepta también 'ca' y 'en' cae al español: no hay traducción aún.
 */
export function commonNameFor(names: FichaNameInfo[], language: Language): string | null {
  const preferidos: string[] = language === 'va' ? ['va', 'ca', 'es'] : language === 'en' ? ['en', 'es'] : ['es', 'ca'];
  for (const code of preferidos) {
    const encontrado = names.find((entrada) => entrada.language === code);
    if (encontrado) return encontrado.name;
  }
  return names[0]?.name ?? null;
}

/** Mapea la respuesta del detalle al modelo de vista de la ficha. */
export function fichaDesdeDetalle(detail: FichaDetail, language: Language): EspecieFicha {
  const commonName = commonNameFor(detail.names, language) ?? detail.scientificName;
  return {
    id: detail.id,
    commonName,
    scientificName: detail.scientificName,
    family: detail.profile?.family ?? null,
    photoUrl: detail.image?.url ?? null,
    photoAlt: `Fotografía de ${commonName}`,
    photoCredit: detail.image?.attribution ?? null,
    description: detail.content ?? '',
    flowering: detail.profile?.flowering ?? null,
    curiosity: detail.profile?.curiosity
      ? { label: 'Dato curioso', text: detail.profile.curiosity }
      : null,
    sources: detail.profile?.sources ?? [],
    locations: detail.locations.items.map((ubicacion) => ({
      district: ubicacion.district,
      neighborhood: ubicacion.neighborhood,
    })),
    locationTotal: detail.locations.total,
  };
}

/** Pl@ntNet y el catálogo escriben los híbridos distinto ('Citrus × aurantium'
 * vs 'Citrus aurantium'): se compara sin la '×' ni mayúsculas. */
function normalizarNombreCientifico(nombre: string): string {
  return nombre.toLowerCase().replaceAll('×', ' ').replace(/\s+/g, ' ').trim();
}

/** Índice en la lista de la especie identificada por Pl@ntNet, o null si no hay ficha para ella. */
export function findSpeciesIndexByScientificName(
  items: FichaListItem[],
  scientificName: string | null,
): number | null {
  if (!scientificName) return null;
  const objetivo = normalizarNombreCientifico(scientificName);
  const index = items.findIndex((item) => normalizarNombreCientifico(item.scientificName) === objetivo);
  return index >= 0 ? index : null;
}
