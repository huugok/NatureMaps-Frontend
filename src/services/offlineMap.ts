import { apiGet, API_URL } from './api';
import { OfflineError } from './offlineError';
import { routeStore } from './offlineRouteStorage';
import type { OfflineMapMetadata } from '../types/offlineMap';

export const MAX_MAP_BYTES = 32 * 1024 * 1024;

export async function fetchMapMetadata(signal?: AbortSignal): Promise<OfflineMapMetadata> {
  return apiGet('/offline-maps/valencia', signal);
}

export async function downloadMap(metadata: OfflineMapMetadata, signal?: AbortSignal, report?: (fraction: number) => void): Promise<Blob> {
  if (!Number.isSafeInteger(metadata.bytes) || metadata.bytes < 127 || metadata.bytes > MAX_MAP_BYTES
    || !/^[a-f0-9]{64}$/.test(metadata.sha256) || !metadata.url.startsWith('/offline-maps/')) {
    throw new OfflineError('network', 'Paquete cartográfico inválido');
  }
  signal?.throwIfAborted();
  const existing = await routeStore().map(metadata.sha256);
  if (existing) { report?.(1); return existing; }
  const response = await fetch(`${API_URL}${metadata.url}`, { signal });
  if (!response.ok) throw new TypeError('No se pudo descargar el mapa');
  const reader = response.body?.getReader();
  if (!reader) throw new TypeError('El mapa no tiene contenido');
  const chunks: Uint8Array<ArrayBuffer>[] = [];
  let size = 0;
  try {
    while (true) {
      signal?.throwIfAborted();
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > metadata.bytes) throw new OfflineError('too-large', 'El mapa supera el tamaño anunciado');
      chunks.push(new Uint8Array(value));
      report?.(size / metadata.bytes);
    }
  } finally { await reader.cancel().catch(() => undefined); }
  const blob = new Blob(chunks, { type: 'application/vnd.pmtiles' });
  if (blob.size !== metadata.bytes) throw new TypeError('Mapa incompleto');
  const bytes = await blob.arrayBuffer();
  const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map((v) => v.toString(16).padStart(2, '0')).join('');
  if (hash !== metadata.sha256) throw new TypeError('El mapa no supera la comprobación de integridad');
  signal?.throwIfAborted();
  return blob;
}

/** Lee primero el mapa compartido de las rutas guardadas. No pide la red. */
export async function savedBasemap(): Promise<{ metadata: OfflineMapMetadata; blob: Blob } | undefined> {
  const storage = routeStore();
  for (const record of await storage.all()) {
    if (!record.map) continue;
    const blob = await storage.map(record.map.sha256);
    if (blob) return { metadata: record.map, blob };
  }
  return undefined;
}
