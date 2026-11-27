import type { TileCache } from './offlineStorage';

// Cada descarga posee su caché. Borrar o cancelar una ruta nunca borra parques
// ni teselas de otra ruta; una actualización conserva la caché anterior hasta
// confirmar los datos nuevos en IndexedDB.
export const ROUTE_TILE_CACHE_PREFIX = 'naturemaps-route-tiles-v1-';

export function routeTileCache(name: string): TileCache {
  if (!name.startsWith(ROUTE_TILE_CACHE_PREFIX)) throw new Error('Invalid route cache');
  return {
    async get(url) {
      if (!await caches.has(name)) return undefined;
      return (await (await caches.open(name)).match(url))?.blob();
    },
    async put(url, blob) {
      await (await caches.open(name)).put(url, new Response(blob, {
        headers: { 'content-type': blob.type || 'image/png' },
      }));
    },
    async delete(url) { if (await caches.has(name)) await (await caches.open(name)).delete(url); },
  };
}

export async function removeRouteTileCache(name?: string): Promise<void> {
  if (name?.startsWith(ROUTE_TILE_CACHE_PREFIX) && typeof caches !== 'undefined') await caches.delete(name);
}
