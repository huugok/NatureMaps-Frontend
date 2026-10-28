import type { Language } from '../types/language';
import type { FichaEspecie, FichaFuente } from '../pages/FichaPlanta/types';

// Servicio de la ficha de planta (RF3, UT F06): conecta la pantalla con la API
// del backend (NatureMaps-Backend) en lugar de leer datos de ejemplo de
// `constants.ts`. La precedencia del texto principal (editorial curado ->
// Wikipedia) la resuelve el servidor en el campo `content`; aquí solo se
// traduce la respuesta al tipo que pinta `FichaPlantaPage`.

// URL del backend. Se puede ajustar con VITE_API_URL en .env; por defecto
// apunta a localhost, como la API en desarrollo.
const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

/** Fuente declarada de un texto o de la ficha (RNF6: trazabilidad), tal y
 * como llega de la API: sin icono, que es decisión de presentación. */
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

/** Extracto automático de Wikipedia (tabla species_enrichments), con su licencia. */
export interface FichaEnrichment {
  language: string;
  content: string | null;
  source: string;
  url: string;
  license: string | null;
  licenseUrl: string | null;
}

/** Fila de GET /species: alimenta la navegación Anterior/Siguiente. */
export interface FichaListItem {
  id: number;
  scientificName: string;
  names: FichaNameInfo[];
  /** Texto principal ya resuelto por el backend (editorial -> Wikipedia). */
  content: string | null;
  profile: FichaProfile | null;
  enrichment: FichaEnrichment | null;
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

/** Modelo de vista que consume FichaPlantaPage: una fila de la API mapeada a
 * la forma de `FichaEspecie` (nulos -> ausentes, fuentes con icono). */
export type { FichaEspecie } from '../pages/FichaPlanta/types';

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

/** Convierte el código de fuente del enriquecimiento ('WIKIPEDIA') en etiqueta
 * de UI ('Wikipedia'), para cuando el texto mostrado es el extracto automático
 * y no hay ficha editorial que traiga sus propias fuentes (RNF6). */
function fuenteDesdeEnriquecimiento(enrichment: FichaEnrichment): FichaFuente {
  const nombre = enrichment.source.charAt(0).toUpperCase() + enrichment.source.slice(1).toLowerCase();
  return {
    name: nombre,
    description: enrichment.license
      ? `Extracto enciclopédico · ${enrichment.license}`
      : 'Extracto enciclopédico',
    url: enrichment.url,
    icon: 'search',
  };
}

/** Fuente de la API -> fuente pintable: el icono es presentación, y se elige
 * por URL (el geoportal del Ayuntamiento es fuente institucional). */
function fuentePintable(fuente: FichaSource): FichaFuente {
  return {
    ...fuente,
    icon: fuente.url.includes('geoportal.valencia.es') ? 'landmark' : 'search',
  };
}

/** Ficha desde una fila de GET /species (sirve para la fila de la lista y para
 * el detalle, que la extiende): todo menos las ubicaciones, que solo trae el
 * detalle. Los campos que la BD no tiene se quedan ausentes y la página oculta
 * esas secciones en lugar de pintarlas vacías. */
export function fichaDesdeItemLista(item: FichaListItem, language: Language): FichaEspecie {
  const commonName = commonNameFor(item.names, language) ?? item.scientificName;
  return {
    commonName,
    scientificName: item.scientificName,
    family: item.profile?.family ?? undefined,
    photoUrl: item.image?.url,
    photoAlt: `Fotografía de ${commonName}`,
    photoCredit: item.image?.attribution,
    description: item.content ?? undefined,
    flowering: item.profile?.flowering ?? undefined,
    curiosity: item.profile?.curiosity
      ? { label: 'Dato curioso', text: item.profile.curiosity }
      : undefined,
    // Fuentes mostradas: las declaradas en la ficha editorial si existe; si no,
    // la del enriquecimiento cuyo extracto es el texto que se está leyendo.
    sources: item.profile?.sources
      ? item.profile.sources.map(fuentePintable)
      : item.enrichment
        ? [fuenteDesdeEnriquecimiento(item.enrichment)]
        : [],
  };
}

/** Mapea la respuesta del detalle al modelo de vista de la ficha: la ficha de
 * la fila más sus ubicaciones reales (chips y recuento de ejemplares). */
export function fichaDesdeDetalle(detail: FichaDetail, language: Language): FichaEspecie {
  return {
    ...fichaDesdeItemLista(detail, language),
    locations: detail.locations.items
      .filter((ubicacion) => ubicacion.neighborhood !== null || ubicacion.district !== null)
      .map((ubicacion) => ({
        name: ubicacion.neighborhood ?? ubicacion.district ?? '',
        district: ubicacion.district ?? undefined,
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
