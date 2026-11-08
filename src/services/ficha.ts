import { dictionaries } from '../i18n/strings';
import { repairTextEncoding } from '../i18n/format';
import type { Language } from '../types/language';
import type { PlantPin } from '../types/plant';
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

/** Metadatos de una fuente de datos de inventario (`GET /sources/:code`). */
export interface FichaDataSource {
  code: string;
  provider: string;
  name: string;
  url: string;
  license: string;
  licenseUrl: string;
  attribution: string;
  logoUrl: string | null;
  lastDownloadedAt: string | null;
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

/** Catálogo completo paginado, para búsquedas por nombre. */
export async function getAllSpeciesList(language: Language): Promise<FichaListItem[]> {
  const all: FichaListItem[] = [];
  let offset = 0;
  while (true) {
    const body = await fetchJson<{ species: FichaListItem[]; returned: number }>(
      `${API_URL}/species?limit=200&offset=${offset}&lang=${encodeURIComponent(language)}`,
      'No se ha podido cargar el catálogo de especies',
    );
    all.push(...(body.species ?? []));
    if ((body.returned ?? body.species?.length ?? 0) < 200) return all;
    offset += 200;
  }
}

/** Carga todas las ubicaciones de una especie; el backend pagina en bloques de hasta 200. */
export async function getSpeciesLocations(id: number, language: Language): Promise<FichaLocation[]> {
  const locations: FichaLocation[] = [];
  let afterLocationId = 0;
  while (true) {
    const detail = await fetchJson<FichaDetail>(
      `${API_URL}/species/${id}?lang=${encodeURIComponent(language)}&locationLimit=200&afterLocationId=${afterLocationId}`,
      'No se han podido cargar las ubicaciones de la especie',
    );
    locations.push(...detail.locations.items);
    if (detail.locations.nextAfterId === null) return locations;
    afterLocationId = detail.locations.nextAfterId;
  }
}

/** Ficha completa de una especie, con sus ubicaciones reales. */
export async function getSpeciesDetail(id: number, language: Language): Promise<FichaDetail> {
  return fetchJson<FichaDetail>(
    `${API_URL}/species/${id}?lang=${encodeURIComponent(language)}`,
    'No se ha podido cargar la ficha de la especie',
  );
}

/** Consulta los metadatos de una fuente asociada a las ubicaciones de la especie. */
async function getDataSource(code: string): Promise<FichaDataSource> {
  return fetchJson<FichaDataSource>(
    `${API_URL}/sources/${encodeURIComponent(code)}`,
    'No se ha podido cargar una fuente de datos',
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
    if (encontrado) return repairTextEncoding(encontrado.name);
  }
  return names[0] ? repairTextEncoding(names[0].name) : null;
}

/** Convierte el código de fuente del enriquecimiento ('WIKIPEDIA') en etiqueta
 * de UI ('Wikipedia'), para cuando el texto mostrado es el extracto automático
 * y no hay ficha editorial que traiga sus propias fuentes (RNF6). */
function fuenteDesdeEnriquecimiento(enrichment: FichaEnrichment, language: Language): FichaFuente {
  const source = repairTextEncoding(enrichment.source);
  const nombre = source.charAt(0).toUpperCase() + source.slice(1).toLowerCase();
  return {
    name: nombre,
    description: enrichment.license
      ? `${dictionaries[language]['ficha.enrichment']} · ${repairTextEncoding(enrichment.license)}`
      : dictionaries[language]['ficha.enrichment'],
    url: enrichment.url,
    icon: 'search',
  };
}

/** Fuente de la API -> fuente pintable: el icono es presentación, y se elige
 * por URL (el geoportal del Ayuntamiento es fuente institucional). */
function fuentePintable(fuente: FichaSource): FichaFuente {
  return {
    ...fuente,
    name: repairTextEncoding(fuente.name),
    description: repairTextEncoding(fuente.description),
    icon: fuente.url.includes('geoportal.valencia.es') ? 'landmark' : 'search',
  };
}

/** Ficha desde una fila de GET /species (sirve para la fila de la lista y para
 * el detalle, que la extiende): todo menos las ubicaciones, que solo trae el
 * detalle. Los campos que la BD no tiene se quedan ausentes y la página oculta
 * esas secciones en lugar de pintarlas vacías. */
export function fichaDesdeItemLista(item: FichaListItem, language: Language): FichaEspecie {
  const scientificName = repairTextEncoding(item.scientificName);
  const commonName = commonNameFor(item.names, language) ?? scientificName;
  return {
    id: item.id,
    commonName,
    scientificName,
    family: item.profile?.family ? repairTextEncoding(item.profile.family) : undefined,
    photoUrl: item.image?.url,
    photoCredit: item.image?.attribution ? repairTextEncoding(item.image.attribution) : undefined,
    description: item.content ? repairTextEncoding(item.content) : undefined,
    flowering: item.profile?.flowering ? repairTextEncoding(item.profile.flowering) : undefined,
    curiosity: item.profile?.curiosity
      ? { label: 'Dato curioso', text: repairTextEncoding(item.profile.curiosity) }
      : undefined,
    // Fuentes mostradas: las declaradas en la ficha editorial si existe; si no,
    // la del enriquecimiento cuyo extracto es el texto que se está leyendo.
    sources: item.profile?.sources
      ? item.profile.sources.map(fuentePintable)
      : item.enrichment
        ? [fuenteDesdeEnriquecimiento(item.enrichment, language)]
        : [],
  };
}

/** Ficha mínima desde un punto del mapa (F03.1). El marcador solo trae el
 * nombre visible y, si está identificado, su especie; la ficha se abre al
 * instante con eso y App la enriquece con `GET /species/:id`. Sin especie no
 * lleva `id`, así que la página oculta «Ver en el mapa». */
export function fichaDesdePlanta(plant: PlantPin): FichaEspecie {
  return {
    ...(plant.speciesId != null ? { id: plant.speciesId } : {}),
    commonName: repairTextEncoding(plant.displayName),
    scientificName: repairTextEncoding(plant.scientificName ?? plant.displayName),
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
        name: repairTextEncoding(ubicacion.neighborhood ?? ubicacion.district ?? ''),
        district: ubicacion.district ? repairTextEncoding(ubicacion.district) : undefined,
        latitude: ubicacion.latitude,
        longitude: ubicacion.longitude,
      })),
    locationTotal: detail.locations.total,
  };
}

/** Añade metadatos (incluido el logo) de las fuentes asociadas a ubicaciones. */
export async function fichaDesdeDetalleConFuentes(
  detail: FichaDetail,
  language: Language,
): Promise<FichaEspecie> {
  const ficha = fichaDesdeDetalle(detail, language);
  const codes = [...new Set(detail.locations.items.map((location) => location.source).filter(Boolean))];
  const resolved = await Promise.all(codes.map(async (code) => {
    try {
      return await getDataSource(code);
    } catch {
      return null;
    }
  }));
  const asociadas: FichaFuente[] = resolved
    .filter((source): source is FichaDataSource => source !== null)
    .map((source) => ({
      name: repairTextEncoding(source.name),
      description: [source.provider, source.attribution, `Licencia: ${source.license}`]
        .map(repairTextEncoding)
        .filter(Boolean)
        .join(' · '),
      url: source.url,
      logoUrl: source.logoUrl,
      icon: 'landmark',
    }));
  const fuentesActuales = [...(ficha.sources ?? [])];
  for (const asociada of asociadas) {
    const existente = fuentesActuales.find((source) => source.url === asociada.url);
    if (existente) {
      existente.logoUrl ??= asociada.logoUrl;
      existente.description = [existente.description, asociada.description].filter(Boolean).join(' · ');
    } else {
      fuentesActuales.push(asociada);
    }
  }
  ficha.sources = fuentesActuales;
  return ficha;
}

/** Pl@ntNet y el catálogo escriben los híbridos distinto ('Citrus × aurantium'
 * vs 'Citrus aurantium'): se compara sin la '×' ni mayúsculas. */
function normalizarNombreCientifico(nombre: string): string {
  // El inventario escribe los híbridos con «x» y el catálogo con «×».
  return repairTextEncoding(nombre).toLowerCase().replaceAll('×', ' ').replace(/\sx\s/g, ' ').replace(/\s+/g, ' ').trim();
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
