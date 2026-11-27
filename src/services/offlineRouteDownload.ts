import { apiGet } from './api';
import { OfflineError, isAbortError } from './offlineError';
import { freeStorageBytes } from './offlineStorage';
import { routeStore } from './offlineRouteStorage';
import { prepareOfflineApp } from './offlineApp';
import { planTiles, tileUrl, AVERAGE_TILE_BYTES } from './offlineTiles';
import { getCachedTile } from './offlineRead';
import { getRouteCachedTile } from './offlineRouteRead';
import { routeTileCache, removeRouteTileCache, ROUTE_TILE_CACHE_PREFIX } from './routeTileCache';
import type { TileCache } from './offlineStorage';
import type { Bbox } from '../types/offline';
import type { RouteDetail } from './routes';
import type { OfflineRouteStore } from './offlineRouteStorage';
import type { Language } from '../types/language';
import type { OfflineRouteRecord, RouteDownloadProgress, RoutePacket } from '../types/offlineRoute';

const MAX_BYTES = 100 * 1024 * 1024;
const MAX_IMAGE_BYTES = 15 * 1024 * 1024;

export interface RouteDownloadDeps {
  prepare?(signal?: AbortSignal): Promise<void>;
  store: OfflineRouteStore;
  packet(id: number, lang: Language, signal?: AbortSignal): Promise<RoutePacket>;
  image(url: string, signal?: AbortSignal): Promise<Blob>;
  tile(url: string, signal?: AbortSignal): Promise<Blob>;
  cachedTile(url: string): Promise<Blob | undefined>;
  cache(name: string): TileCache;
  removeCache(name: string): Promise<void>;
  freeBytes(): Promise<number | null>;
  now(): Date;
}

async function fetchImage(url: string, signal?: AbortSignal): Promise<Blob> {
  if (!/^https?:\/\//.test(url)) throw new Error('Invalid image URL');
  const response = await fetch(url, { signal, credentials: 'omit' });
  if (!response.ok || !response.headers.get('content-type')?.startsWith('image/')) throw new TypeError('Image unavailable');
  if (Number(response.headers.get('content-length')) > MAX_IMAGE_BYTES) throw new OfflineError('too-large', 'Image too large');
  // Limitar también respuestas sin Content-Length antes de llenar la memoria.
  const reader = response.body?.getReader();
  if (!reader) throw new TypeError('Image body unavailable');
  const chunks: Uint8Array<ArrayBuffer>[] = [];
  let size = 0;
  try {
    while (true) {
      signal?.throwIfAborted();
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_IMAGE_BYTES) throw new OfflineError('too-large', 'Image too large');
      chunks.push(new Uint8Array(value));
    }
  } finally { await reader.cancel().catch(() => undefined); }
  if (size === 0) throw new TypeError('Empty image');
  return new Blob(chunks, { type: response.headers.get('content-type')! });
}


/** Incluye el inicio, toda la geometría y las paradas; rechaza coordenadas dañadas. */
export function routeBounds(route: RouteDetail): Bbox {
  const points = [route.start, ...route.path, ...route.stops];
  if (!points.length || points.some(({ latitude, longitude }) => !Number.isFinite(latitude)
    || !Number.isFinite(longitude) || Math.abs(latitude) > 85.0511 || Math.abs(longitude) > 180)) {
    throw new OfflineError('too-large', 'Invalid route bounds');
  }
  const latitudes = points.map((point) => point.latitude);
  const longitudes = points.map((point) => point.longitude);
  return [Math.min(...longitudes), Math.min(...latitudes), Math.max(...longitudes), Math.max(...latitudes)];
}

function defaultDeps(): RouteDownloadDeps {
  return {
    prepare: prepareOfflineApp,
    store: routeStore(),
    packet: (id, lang, signal) => apiGet(`/routes/${id}/offline?lang=${lang}`, signal),
    image: fetchImage,
    tile: fetchImage,
    cachedTile: async (url) => await getRouteCachedTile(url) ?? await getCachedTile(url),
    cache: routeTileCache,
    removeCache: removeRouteTileCache,
    freeBytes: freeStorageBytes,
    now: () => new Date(),
  };
}

export async function downloadRoute(options: {
  id: number; lang: Language; signal?: AbortSignal;
  onProgress?: (progress: RouteDownloadProgress) => void;
}, deps = defaultDeps()): Promise<OfflineRouteRecord> {
  const { signal, onProgress } = options;
  let cacheName: string | undefined;
  let committed = false;
  try {
    signal?.throwIfAborted();
    onProgress?.({ phase: 'content', fraction: 0, done: 0, total: 1 });
    await deps.prepare?.(signal);
    const packet = await deps.packet(options.id, options.lang, signal);
    signal?.throwIfAborted();
    if (packet.schemaVersion !== 3 || packet.route.id !== options.id) throw new Error('Invalid route packet');
    const plan = planTiles(routeBounds(packet.route));
    const urls = [...new Set(packet.images.map((image) => image.url))];
    const images: OfflineRouteRecord['images'] = [];
    let bytes = new Blob([JSON.stringify(packet)]).size;
    const free = await deps.freeBytes();
    if (free !== null && free < bytes + plan.count * AVERAGE_TILE_BYTES * 1.5) throw new OfflineError('storage-full', 'Storage full');
    onProgress?.({ phase: 'images', fraction: 0.1, done: 0, total: urls.length });
    for (const url of urls) {
      signal?.throwIfAborted();
      const blob = await deps.image(url, signal);
      signal?.throwIfAborted();
      bytes += blob.size;
      if (bytes > MAX_BYTES || blob.size > MAX_IMAGE_BYTES) throw new OfflineError('too-large', 'Route too large');
      if (free !== null && bytes > free) throw new OfflineError('storage-full', 'Storage full');
      images.push({ url, blob });
      onProgress?.({ phase: 'images', fraction: 0.1 + 0.35 * images.length / urls.length, done: images.length, total: urls.length });
    }
    signal?.throwIfAborted();
    const keys = plan.tiles.map(tileUrl);
    cacheName = ROUTE_TILE_CACHE_PREFIX + options.id + '-' + crypto.randomUUID();
    const cache = deps.cache(cacheName);
    let next = 0;
    let done = 0;
    let tileBytes = 0;
    let failed = false;
    const report = () => onProgress?.({ phase: 'map', fraction: 0.45 + 0.5 * done / keys.length, done, total: keys.length });
    report();
    const worker = async () => {
      try {
        while (next < keys.length && !failed) {
          signal?.throwIfAborted();
          const url = keys[next++]!;
          const blob = await deps.cachedTile(url) ?? await deps.tile(url, signal);
          signal?.throwIfAborted();
          bytes += blob.size;
          tileBytes += blob.size;
          if (bytes > MAX_BYTES) throw new OfflineError('too-large', 'Route too large');
          if (free !== null && bytes > free) throw new OfflineError('storage-full', 'Storage full');
          await cache.put(url, blob);
          done += 1;
          report();
        }
      } catch (error) { failed = true; throw error; }
    };
    // Dos peticiones como máximo, igual que las zonas. Esperar ambas antes de
    // limpiar impide que una petición tardía deje teselas después de cancelar.
    const results = await Promise.allSettled([worker(), worker()]);
    const failure = results.find((result) => result.status === 'rejected');
    if (failure?.status === 'rejected') throw failure.reason;
    if (bytes > MAX_BYTES) throw new OfflineError('too-large', 'Route too large');
    if (free !== null && bytes > free) throw new OfflineError('storage-full', 'Storage full');
    signal?.throwIfAborted();
    const record: OfflineRouteRecord = {
      routeId: options.id, lang: options.lang, downloadedAt: deps.now().toISOString(), bytes, packet, images,
      tiles: { cacheName, keys, bbox: plan.bbox, minZoom: plan.minZoom, maxZoom: plan.maxZoom, bytes: tileBytes },
    };
    onProgress?.({ phase: 'saving', fraction: 0.95, done: 0, total: 1 });
    // Cancelar funciona hasta este punto. La confirmación IDB es atómica.
    signal?.throwIfAborted();
    await deps.store.put(record);
    committed = true;
    onProgress?.({ phase: 'saving', fraction: 1, done: 1, total: 1 });
    return record;
  } catch (error) {
    if (cacheName && !committed) await deps.removeCache(cacheName).catch(() => undefined);
    if (isAbortError(error) || error instanceof OfflineError) throw error;
    if (error && typeof error === 'object' && 'name' in error && error.name === 'QuotaExceededError') {
      throw new OfflineError('storage-full', 'Storage full');
    }
    throw new OfflineError('network', 'Route download failed');
  }
}
