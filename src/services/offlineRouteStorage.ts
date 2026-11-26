import type { OfflineRouteRecord } from '../types/offlineRoute';
import { OfflineError } from './offlineError';
import { removeRouteTileCache } from './routeTileCache';

export interface OfflineRouteStore {
  get(id: number): Promise<OfflineRouteRecord | undefined>;
  all(): Promise<OfflineRouteRecord[]>;
  put(record: OfflineRouteRecord): Promise<void>;
  delete(id: number): Promise<void>;
}

export function supportsOfflineRoutes(): boolean {
  return typeof indexedDB !== 'undefined' && typeof caches !== 'undefined'
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
      const request = indexedDB.open('naturemaps-offline-routes', 3);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains('routes')) database.createObjectStore('routes', { keyPath: 'routeId' });
        // v1/v2 conservan fichas e imágenes. La cartografía antigua se sustituye
        // al volver a descargar; no se necesita el archivo regional PMTiles.
        if (database.objectStoreNames.contains('maps')) database.deleteObjectStore('maps');
        const cursor = request.transaction!.objectStore('routes').openCursor();
        cursor.onsuccess = () => {
          if (!cursor.result) return;
          const record = cursor.result.value as OfflineRouteRecord & { map?: unknown };
          delete record.map;
          record.bytes = new Blob([JSON.stringify(record.packet)]).size
            + record.images.reduce((sum, image) => sum + image.blob.size, 0) + (record.tiles?.bytes ?? 0);
          cursor.result.update(record);
          cursor.result.continue();
        };
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
  const write = async (id: number, record?: OfflineRouteRecord) => {
    const transaction = (await open()).transaction('routes', 'readwrite');
    const done = new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onabort = transaction.onerror = () => reject(transaction.error);
    });
    const routes = transaction.objectStore('routes');
    let previous: OfflineRouteRecord | undefined;
    const read = routes.get(id);
    read.onsuccess = () => {
      previous = read.result as OfflineRouteRecord | undefined;
      if (record) routes.put(record);
      else routes.delete(id);
    };
    await done;
    // El IDB serializa los cambios de dos pestañas. Limpiar después del commit
    // evita perder la versión anterior si falla la escritura o se agota la cuota.
    if (previous?.tiles?.cacheName !== record?.tiles?.cacheName) {
      await removeRouteTileCache(previous?.tiles?.cacheName).catch(() => undefined);
    }
  };
  return {
    async get(id) { return requestResult((await open()).transaction('routes').objectStore('routes').get(id)); },
    async all() { return requestResult((await open()).transaction('routes').objectStore('routes').getAll()); },
    put: (record) => write(record.routeId, record),
    delete: (id) => write(id),
  };
}

export function createMemoryRouteStore(removeCache = removeRouteTileCache): OfflineRouteStore {
  const records = new Map<number, OfflineRouteRecord>();
  const write = async (id: number, record?: OfflineRouteRecord) => {
    const previous = records.get(id);
    if (record) records.set(id, record); else records.delete(id);
    if (previous?.tiles?.cacheName !== record?.tiles?.cacheName) await removeCache(previous?.tiles?.cacheName).catch(() => undefined);
  };
  return {
    get: async (id) => records.get(id), all: async () => [...records.values()],
    put: (record) => write(record.routeId, record), delete: (id) => write(id),
  };
}

let current: OfflineRouteStore | undefined;
export function routeStore(): OfflineRouteStore {
  if (current) return current;
  if (supportsOfflineRoutes()) return current = createRouteStore();
  const fail = async () => { throw new OfflineError('unsupported', 'Offline storage unavailable'); };
  return { get: async () => undefined, all: async () => [], put: fail, delete: fail };
}

export function setOfflineRouteStore(store?: OfflineRouteStore): void { current = store; }

/** Una descarga no se anuncia hasta que datos, imágenes y teselas estén confirmados. */
export function notifyRouteDownloads(): void {
  window.dispatchEvent(new Event('naturemaps-route-downloads'));
}
