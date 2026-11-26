import type { OfflineRouteRecord, RoutePacket } from '../types/offlineRoute';

export const routePacket: RoutePacket = {
  schemaVersion: 2, revision: 'revision-1', language: 'es',
  map: { code: 'valencia', sha256: 'a'.repeat(64), bytes: 127, bounds: [-0.52, 39.36, -0.24, 39.62],
    minZoom: 0, maxZoom: 15, sourceUrl: 'https://build.protomaps.com/20261118.pmtiles',
    attribution: '© OpenStreetMap contributors · Protomaps', licenseUrl: 'https://www.openstreetmap.org/copyright',
    url: `/offline-maps/valencia/${'a'.repeat(64)}.pmtiles` },
  route: {
    id: 7, name: 'Ruta de los jardines', theme: 'mixta', shape: 'lineal', lengthCategory: 'corta',
    distanceMeters: 2000, durationSeconds: 1500, description: 'Un paseo botánico.',
    start: { latitude: 39.47, longitude: -0.38 }, stopsCount: 4,
    stops: [
      { kind: 'planta', id: 1, speciesId: 5, name: 'Naranjo', latitude: 39.47, longitude: -0.38 },
      { kind: 'poi', id: 2, speciesId: null, name: 'Torre', latitude: 39.471, longitude: -0.381 },
      { kind: 'planta', id: 3, speciesId: null, name: 'Palmera', latitude: 39.472, longitude: -0.382 },
      { kind: 'poi', id: 4, speciesId: null, name: 'Fuente', latitude: 39.473, longitude: -0.383 },
    ],
    path: [
      { latitude: 39.47, longitude: -0.38 },
      { latitude: 39.471, longitude: -0.381 },
      { latitude: 39.472, longitude: -0.382 },
      { latitude: 39.473, longitude: -0.383 },
    ],
  },
  stops: [
    { kind: 'planta', id: 1, plant: { id: 1, speciesId: 5, displayName: 'Naranjo' }, poi: null },
    { kind: 'poi', id: 2, plant: null, poi: { id: 2, name: 'Torre', sourceUrl: 'https://example.test/poi', image: null,
      profile: { description: 'Una torre histórica.', language: 'es', sourceUrl: 'https://example.test/poi', license: 'CC BY-SA' } } },
    { kind: 'planta', id: 3, plant: { id: 3, speciesId: null, displayName: 'Palmera' }, poi: null },
    { kind: 'poi', id: 4, plant: null, poi: { id: 4, name: 'Fuente', sourceUrl: 'https://example.test/fountain', image: null,
      profile: { description: 'Una fuente del jardín.', language: 'es', sourceUrl: 'https://example.test/fountain', license: 'CC BY-SA' } } },
  ],
  species: [{ id: 5, scientificName: 'Citrus aurantium', names: [{ name: 'Naranjo', language: 'es' }],
    content: 'Ficha del naranjo.', profile: null, enrichment: null, image: null,
    locations: { total: 1, returned: 1, nextAfterId: null, items: [] } }],
  images: [{ url: 'https://example.test/photo.png', sourceUrl: 'https://example.test/commons',
    author: 'Autor', attribution: 'Autor CC BY', license: 'CC BY 4.0', licenseUrl: 'https://example.test/license' }],
};

export function savedRoute(id = 7): OfflineRouteRecord {
  return { routeId: id, lang: 'es', downloadedAt: '2026-11-20T10:00:00Z', bytes: 100,
    packet: { ...routePacket, route: { ...routePacket.route, id } }, images: [], map: routePacket.map };
}
