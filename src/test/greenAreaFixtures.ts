import type { Article, ArticleSummary, GreenArea, GreenAreaDetail } from '../types/greenArea';

// Datos de ejemplo de zonas verdes y artículos, con la forma real del backend.

export const hesperides: GreenArea = {
  id: 1,
  groupSlug: 'jardin-de-las-hesperides',
  name: 'Jardín de las Hespérides',
  groupName: 'Jardín de las Hespérides',
  typology: 'Parques Urbanos',
  neighborhood: 'El Botànic',
  areaM2: 4341.6,
  featured: true,
  center: { latitude: 39.4775, longitude: -0.3882 },
  bbox: [-0.3887, 39.4771, -0.3878, 39.4779],
  geometry: { type: 'Polygon', coordinates: [[[-0.3887, 39.4771], [-0.3878, 39.4771], [-0.3878, 39.4779], [-0.3887, 39.4771]]] },
  hasArticle: true,
};

export const turia1: GreenArea = {
  id: 2,
  groupSlug: 'jardin-del-turia',
  name: 'Jardín del Turia (tramo 1)',
  groupName: 'Jardín del Turia',
  typology: 'Parques Urbanos',
  neighborhood: 'Cauce del Turia',
  areaM2: 82000,
  featured: true,
  center: { latitude: 39.481, longitude: -0.3975 },
  bbox: [-0.4, 39.48, -0.395, 39.482],
  geometry: { type: 'Polygon', coordinates: [[[-0.4, 39.48], [-0.395, 39.48], [-0.395, 39.482], [-0.4, 39.48]]] },
  hasArticle: true,
};

export const turia2: GreenArea = {
  ...turia1,
  id: 3,
  name: 'Jardín del Turia (tramo 2)',
  areaM2: 38000,
  center: { latitude: 39.481, longitude: -0.3925 },
  bbox: [-0.395, 39.48, -0.39, 39.482],
};

export const articleSummaries: ArticleSummary[] = [
  { slug: 'flora-caracteristica-de-valencia', topic: 'flora', greenAreaGroup: null, title: 'Flora característica de València', summary: 'Naranjos, jacarandas y ficus.', language: 'es', position: 10 },
  { slug: 'jardin-del-turia', topic: 'parques', greenAreaGroup: 'jardin-del-turia', title: 'Jardín del Turia: el río que se hizo jardín', summary: 'El antiguo cauce del Turia.', language: 'es', position: 21 },
  { slug: 'jardin-de-las-hesperides', topic: 'jardines', greenAreaGroup: 'jardin-de-las-hesperides', title: 'Jardín de las Hespérides', summary: 'Un jardín de cítricos.', language: 'es', position: 33 },
];

export const hesperidesArticle: Article = {
  ...articleSummaries[2]!,
  body: 'Primer párrafo sobre los cítricos.\n\nSegundo párrafo sobre el mito.',
  sources: [
    { name: 'Vía Arquitectura', description: 'Premio COACV · Consulta 12/11/2026', url: 'https://via-arquitectura.net/02_prem/02p-064.htm' },
  ],
};

export const hesperidesDetail: GreenAreaDetail = {
  groupSlug: 'jardin-de-las-hesperides',
  name: 'Jardín de las Hespérides',
  typology: 'Parques Urbanos',
  neighborhoods: ['El Botànic'],
  areaM2: 4342,
  bbox: hesperides.bbox,
  areas: [hesperides],
  plants: { total: 1250, species: 2 },
  topSpecies: [
    { speciesId: 7, scientificName: 'Citrus × aurantium', commonName: 'Naranjo amargo', plants: 1200 },
    { speciesId: 9, scientificName: 'Jacaranda mimosifolia', commonName: null, plants: 50 },
  ],
  pois: [{ id: 4, name: 'Estatua de Hércules', category: 'monumento', latitude: 39.4775, longitude: -0.3882 }],
  articles: [articleSummaries[2]!],
  dataSource: {
    code: 'VALENCIA_ESPACIOS_VERDES',
    provider: 'Ajuntament de València',
    name: 'Espais Verds — Espacios Verdes',
    url: 'https://geoportal.valencia.es/server/rest/services/OPENDATA/MedioAmbiente/MapServer/8',
    license: 'CC BY 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    attribution: 'Fuente de los datos: Ajuntament de València – Dades Obertes.',
  },
};

/** Sustituye `fetch` por respuestas según la ruta pedida. Devuelve el mock. */
export function stubApi(routes: Record<string, unknown>, vi: { fn: typeof import('vitest').vi.fn; stubGlobal: typeof import('vitest').vi.stubGlobal }) {
  const fetchMock = vi.fn(async (input: string | URL | Request) => {
    const url = String(input);
    const match = Object.keys(routes)
      .sort((a, b) => b.length - a.length)
      .find((route) => url.includes(route));
    if (match === undefined) return { ok: false, status: 404, json: async () => ({ error: 'no encontrado' }) } as Response;
    const body = routes[match];
    if (body instanceof Error) throw body;
    return { ok: true, status: 200, json: async () => body } as Response;
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}
