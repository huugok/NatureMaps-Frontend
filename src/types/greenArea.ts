// Zonas verdes y contenido editorial (NM-08), tal y como los sirve el backend
// (`/green-areas` y `/editorial`).

export type GeoPosition = [number, number];
export type AreaGeometry =
  | { type: 'Polygon'; coordinates: GeoPosition[][] }
  | { type: 'MultiPolygon'; coordinates: GeoPosition[][][] };

/** Secciones temáticas del contenido editorial, en el orden en que se muestran. */
export const EDITORIAL_TOPICS = ['flora', 'parques', 'jardines', 'paisajismo'] as const;
export type EditorialTopic = (typeof EDITORIAL_TOPICS)[number];

export function isEditorialTopic(value: unknown): value is EditorialTopic {
  return typeof value === 'string' && (EDITORIAL_TOPICS as readonly string[]).includes(value);
}

/** Una zona verde: un polígono de la fuente municipal. */
export interface GreenArea {
  id: number;
  /** Identificador legible del parque; varios polígonos pueden compartirlo
   * (los tramos del Jardín del Turia). Es el que usan las rutas `/zona/:grupo`. */
  groupSlug: string;
  name: string;
  /** Nombre del parque completo (igual a `name` salvo en parques por tramos). */
  groupName: string;
  typology: string | null;
  neighborhood: string | null;
  areaM2: number | null;
  featured: boolean;
  center: { latitude: number; longitude: number };
  /** [oeste, sur, este, norte]. */
  bbox: [number, number, number, number];
  geometry?: AreaGeometry | null;
  hasArticle?: boolean;
  /** Ejemplares del inventario dentro de este polígono (capa del mapa). */
  plants?: number;
}

export interface ArticleSummary {
  slug: string;
  topic: EditorialTopic;
  greenAreaGroup: string | null;
  title: string;
  summary: string;
  /** Idioma real del texto: puede no ser el pedido si falta la traducción. */
  language: string;
  position: number;
}

export interface ArticleSource {
  name: string;
  description: string;
  url: string;
}

export interface Article extends ArticleSummary {
  body: string;
  sources: ArticleSource[];
}

export interface GreenAreaDataSource {
  code: string;
  provider: string;
  name: string;
  url: string;
  license: string;
  licenseUrl: string;
  attribution: string;
}

/** Ficha de una zona verde (`GET /green-areas/group/:slug`). */
export interface GreenAreaDetail {
  groupSlug: string;
  name: string;
  typology: string | null;
  neighborhoods: string[];
  areaM2: number | null;
  bbox: [number, number, number, number];
  areas: GreenArea[];
  plants: { total: number; species: number };
  topSpecies: Array<{ speciesId: number; scientificName: string; commonName: string | null; plants: number }>;
  pois: Array<{ id: number; name: string; category: string; latitude: number; longitude: number }>;
  articles: ArticleSummary[];
  dataSource: GreenAreaDataSource | null;
}

/** Zona verde de un punto (`GET /green-areas/at`): dentro, cerca o ninguna. */
export interface GreenAreaAt {
  relation: 'inside' | 'near' | null;
  /** Metros hasta el contorno; 0 si el punto está dentro. */
  distance: number | null;
  area: GreenArea | null;
}

/** Parque o jardín donde hay ejemplares de una especie (ficha de planta). */
export interface SpeciesGreenArea {
  groupSlug: string;
  id: number;
  name: string;
  plants: number;
  hasArticle: boolean;
}
