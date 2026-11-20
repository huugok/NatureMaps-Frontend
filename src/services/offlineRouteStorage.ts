import type { OfflineRouteRecord } from '../types/offlineRoute';
import { OfflineError } from './offlineError';

export interface OfflineRouteStore {
  get(id: number): Promise<OfflineRouteRecord | undefined>;
  all(): Promise<OfflineRouteRecord[]>;
  put(record: OfflineRouteRecord, mapBlob?: Blob): Promise<void>;
  delete(id: number): Promise<void>;
  map(sha256: string): Promise<Blob | undefined>;
}

export function supportsOfflineRoutes(): boolean {
  return typeof indexedDB !== 'undefined'
    && (!import.meta.env.PROD || (typeof navigator !== 'undefined' && 'serviceWorker' in navigator));
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function createRouteStore(): OfflineRouteStore {
  let opened: Promise<IDBDatabase> | undefined;
  const open = () => {
    opened ??= new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('naturemaps-offline-routes', 2);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains('routes')) request.result.createObjectStore('routes', { keyPath: 'routeId' });
        if (!request.result.objectStoreNames.contains('maps')) request.result.createObjectStore('maps', { keyPath: 'sha256' });
      };
      request.onsuccess = () => {
        const database = request.result;
        database.onversionchange = () => { database.close(); opened = undefined; };
        resolve(database);
      };
      request.onerror = () => { opened = undefined; reject(request.error); };
      request.onblocked = () => { opened = undefined; reject(new Error('IndexedDB blocked')); };
    });
    return opened;
  };
  const write = async (operation: (store: IDBObjectStore, maps: IDBObjectStore) => void) => {
    const transaction = (await open()).transaction(['routes', 'maps'], 'readwrite');
    const done = new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onabort = transaction.onerror = () => reject(transaction.error);
    });
    const routes = transaction.objectStore('routes');
    const maps = transaction.objectStore('maps');
    operation(routes, maps);
    // La limpieza y la escritura comparten transacción: dos pestañas no pueden
    // borrar un mapa que la otra acaba de asociar a una ruta.
    const read = routes.getAll();
    read.onsuccess = () => {
      const used = new Set((read.result as OfflineRouteRecord[]).map((record) => record.map?.sha256));
      const cursor = maps.openCursor();
      cursor.onsuccess = () => {
        if (!cursor.result) return;
        if (!used.has(String(cursor.result.key))) cursor.result.delete();
        cursor.result.continue();
      };
    };
    await done;
  };
  return {
    async get(id) { return requestResult((await open()).transaction('routes').objectStore('routes').get(id)); },
    async all() { return requestResult((await open()).transaction('routes').objectStore('routes').getAll()); },
    put: (record, mapBlob) => write((store, maps) => {
      if (record.map && mapBlob) maps.put({ sha256: record.map.sha256, blob: mapBlob });
      store.put(record);
    }),
    delete: (id) => write((store) => { store.delete(id); }),
    async map(sha256) {
      const row = await requestResult((await open()).transaction('maps').objectStore('maps').get(sha256)) as { blob: Blob } | undefined;
      return row?.blob;
    },
  };
}

export function createMemoryRouteStore(): OfflineRouteStore {
  const records = new Map<number, OfflineRouteRecord>();
  const maps = new Map<string, Blob>();
  const clean = () => {
    const used = new Set([...records.values()].map((record) => record.map?.sha256));
    for (const hash of maps.keys()) if (!used.has(hash)) maps.delete(hash);
  };
  return {
    get: async (id) => records.get(id),
    all: async () => [...records.values()],
    put: async (record, mapBlob) => {
      if (record.map && mapBlob) maps.set(record.map.sha256, mapBlob);
      records.set(record.routeId, record); clean();
    },
    delete: async (id) => { records.delete(id); clean(); },
    map: async (hash) => maps.get(hash),
  };
}

let current: OfflineRouteStore | undefined;
export function routeStore(): OfflineRouteStore {
  if (current) return current;
  if (supportsOfflineRoutes()) return current = createRouteStore();
  const fail = async () => { throw new OfflineError('unsupported', 'IndexedDB unavailable'); };
  return { get: async () => undefined, all: async () => [], put: fail, delete: fail, map: async () => undefined };
}

export function setOfflineRouteStore(store?: OfflineRouteStore): void { current = store; }

/** Una descarga no se anuncia hasta que datos e imágenes estén confirmados. */
export function notifyRouteDownloads(): void {
  window.dispatchEvent(new Event('naturemaps-route-downloads'));
}
