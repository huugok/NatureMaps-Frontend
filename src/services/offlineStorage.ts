import type { OfflineZoneRecord } from '../types/offline';
import { OfflineError } from './offlineError';

// Almacenamiento local de las zonas descargadas: IndexedDB para los datos
// (zona, plantas, textos) y Cache API para las teselas del mapa. Los dos van
// detrás de una interfaz para poder probarlos sin navegador y para no dejar
// que ninguna pantalla toque IndexedDB ni la caché directamente.

export interface OfflineStore {
  get(groupSlug: string): Promise<OfflineZoneRecord | undefined>;
  put(record: OfflineZoneRecord): Promise<void>;
  delete(groupSlug: string): Promise<void>;
  all(): Promise<OfflineZoneRecord[]>;
}

export interface TileCache {
  get(url: string): Promise<Blob | undefined>;
  put(url: string, blob: Blob): Promise<void>;
  delete(url: string): Promise<void>;
}

const DB_NAME = 'naturemaps-offline';
const DB_VERSION = 1;
const ZONES_STORE = 'zones';
export const TILE_CACHE_NAME = 'naturemaps-tiles-v1';

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB'));
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB'));
    transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB'));
  });
}

export function createIndexedDbStore(): OfflineStore {
  let opened: Promise<IDBDatabase> | null = null;
  const open = () => {
    opened ??= new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        request.result.createObjectStore(ZONES_STORE, { keyPath: 'groupSlug' });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        opened = null;
        reject(request.error ?? new Error('IndexedDB'));
      };
    });
    return opened;
  };
  const zones = async (mode: IDBTransactionMode) => {
    const transaction = (await open()).transaction(ZONES_STORE, mode);
    return { transaction, store: transaction.objectStore(ZONES_STORE) };
  };
  return {
    async get(groupSlug) {
      const { store } = await zones('readonly');
      return (await requestResult(store.get(groupSlug))) as OfflineZoneRecord | undefined;
    },
    async put(record) {
      const { transaction, store } = await zones('readwrite');
      store.put(record);
      await transactionDone(transaction);
    },
    async delete(groupSlug) {
      const { transaction, store } = await zones('readwrite');
      store.delete(groupSlug);
      await transactionDone(transaction);
    },
    async all() {
      const { store } = await zones('readonly');
      return (await requestResult(store.getAll())) as OfflineZoneRecord[];
    },
  };
}

export function createCacheTileStore(): TileCache {
  const open = () => caches.open(TILE_CACHE_NAME);
  return {
    async get(url) {
      const response = await (await open()).match(url);
      return response ? response.blob() : undefined;
    },
    async put(url, blob) {
      await (await open()).put(url, new Response(blob, { headers: { 'content-type': blob.type || 'image/png' } }));
    },
    async delete(url) {
      await (await open()).delete(url);
    },
  };
}

/** Sin IndexedDB ni Cache API (modo privado, navegadores antiguos, tests): lee vacío y no deja escribir. */
export function createUnsupportedStorage(): { store: OfflineStore; tiles: TileCache } {
  const fail = () => Promise.reject(new OfflineError('unsupported', 'Este navegador no puede guardar zonas sin conexión.'));
  return {
    store: { get: async () => undefined, put: fail, delete: async () => undefined, all: async () => [] },
    tiles: { get: async () => undefined, put: fail, delete: async () => undefined },
  };
}

export function createMemoryStore(): OfflineStore {
  const records = new Map<string, OfflineZoneRecord>();
  return {
    get: async (groupSlug) => records.get(groupSlug),
    put: async (record) => { records.set(record.groupSlug, structuredClone(record)); },
    delete: async (groupSlug) => { records.delete(groupSlug); },
    all: async () => [...records.values()],
  };
}

export function createMemoryTileCache(): TileCache & { keys(): string[] } {
  const tiles = new Map<string, Blob>();
  return {
    get: async (url) => tiles.get(url),
    put: async (url, blob) => { tiles.set(url, blob); },
    delete: async (url) => { tiles.delete(url); },
    keys: () => [...tiles.keys()],
  };
}

export function isOfflineSupported(): boolean {
  return typeof indexedDB !== 'undefined' && typeof caches !== 'undefined';
}

function createDefaultStorage(): { store: OfflineStore; tiles: TileCache } {
  return isOfflineSupported()
    ? { store: createIndexedDbStore(), tiles: createCacheTileStore() }
    : createUnsupportedStorage();
}

let current: { store: OfflineStore; tiles: TileCache } | null = null;

/** Almacenamiento activo: se crea al primer uso para no tocar el navegador al importar. */
export function offlineStorage(): { store: OfflineStore; tiles: TileCache } {
  current ??= createDefaultStorage();
  return current;
}

/** Solo para tests: sustituye el almacenamiento (sin argumentos, lo restablece). */
export function setOfflineStorage(storage?: { store: OfflineStore; tiles: TileCache }): void {
  current = storage ?? null;
}

/** Espacio libre estimado del origen, o null si el navegador no lo dice. */
export async function freeStorageBytes(): Promise<number | null> {
  try {
    const estimate = await navigator.storage?.estimate?.();
    if (!estimate || estimate.quota === undefined || estimate.usage === undefined) return null;
    return estimate.quota - estimate.usage;
  } catch {
    return null;
  }
}
