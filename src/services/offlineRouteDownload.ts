import { apiGet } from './api';
import { OfflineError, isAbortError } from './offlineError';
import { freeStorageBytes } from './offlineStorage';
import { routeStore } from './offlineRouteStorage';
import { prepareOfflineApp } from './offlineApp';
import { downloadMap } from './offlineMap';
import type { OfflineMapMetadata } from '../types/offlineMap';
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
  map(metadata: OfflineMapMetadata, signal?: AbortSignal, progress?: (fraction: number) => void): Promise<Blob>;
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

function defaultDeps(): RouteDownloadDeps {
  return {
    prepare: prepareOfflineApp,
    store: routeStore(),
    packet: (id, lang, signal) => apiGet(`/routes/${id}/offline?lang=${lang}`, signal),
    image: fetchImage,
    map: downloadMap,
    freeBytes: freeStorageBytes,
    now: () => new Date(),
  };
}

export async function downloadRoute(options: {
  id: number; lang: Language; signal?: AbortSignal;
  onProgress?: (progress: RouteDownloadProgress) => void;
}, deps = defaultDeps()): Promise<OfflineRouteRecord> {
  const { signal, onProgress } = options;
  try {
    signal?.throwIfAborted();
    onProgress?.({ phase: 'content', fraction: 0, done: 0, total: 1 });
    await deps.prepare?.(signal);
    const packet = await deps.packet(options.id, options.lang, signal);
    signal?.throwIfAborted();
    if (packet.schemaVersion !== 2 || !packet.map || packet.route.id !== options.id) throw new Error('Invalid route packet');
    const urls = [...new Set(packet.images.map((image) => image.url))];
    const images: OfflineRouteRecord['images'] = [];
    let bytes = new Blob([JSON.stringify(packet)]).size;
    const free = await deps.freeBytes();
    if (free !== null && free < bytes + packet.map.bytes) throw new OfflineError('storage-full', 'Storage full');
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
    onProgress?.({ phase: 'map', fraction: 0.45, done: 0, total: packet.map.bytes });
    const mapBlob = await deps.map(packet.map, signal, (fraction) => onProgress?.({
      phase: 'map', fraction: 0.45 + 0.5 * fraction, done: Math.round(packet.map!.bytes * fraction), total: packet.map!.bytes,
    }));
    bytes += mapBlob.size;
    if (bytes > MAX_BYTES) throw new OfflineError('too-large', 'Route too large');
    if (free !== null && bytes > free) throw new OfflineError('storage-full', 'Storage full');
    signal?.throwIfAborted();
    const record: OfflineRouteRecord = {
      routeId: options.id, lang: options.lang, downloadedAt: deps.now().toISOString(), bytes, packet, images, map: packet.map,
    };
    onProgress?.({ phase: 'saving', fraction: 0.95, done: 0, total: 1 });
    // Cancelar funciona hasta este punto. La confirmación IDB es atómica.
    signal?.throwIfAborted();
    await deps.store.put(record, mapBlob);
    onProgress?.({ phase: 'saving', fraction: 1, done: 1, total: 1 });
    return record;
  } catch (error) {
    if (isAbortError(error) || error instanceof OfflineError) throw error;
    if (error && typeof error === 'object' && 'name' in error && error.name === 'QuotaExceededError') {
      throw new OfflineError('storage-full', 'Storage full');
    }
    throw new OfflineError('network', 'Route download failed');
  }
}
