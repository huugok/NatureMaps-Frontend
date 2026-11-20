import type { OfflineRouteRecord } from '../types/offlineRoute';
import { OfflineError } from './offlineError';

export interface OfflineRouteStore {
  get(id: number): Promise<OfflineRouteRecord | undefined>;
  all(): Promise<OfflineRouteRecord[]>;
  put(record: OfflineRouteRecord): Promise<void>;
  delete(id: number): Promise<void>;
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
      const request = indexedDB.open('naturemaps-offline-routes', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('routes', { keyPath: 'routeId' });
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
  const write = async (operation: (store: IDBObjectStore) => void) => {
    const transaction = (await open()).transaction('routes', 'readwrite');
    const done = new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onabort = transaction.onerror = () => reject(transaction.error);
    });
    operation(transaction.objectStore('routes'));
    await done;
  };
  return {
    async get(id) { return requestResult((await open()).transaction('routes').objectStore('routes').get(id)); },
    async all() { return requestResult((await open()).transaction('routes').objectStore('routes').getAll()); },
    put: (record) => write((store) => { store.put(record); }),
    delete: (id) => write((store) => { store.delete(id); }),
  };
}

export function createMemoryRouteStore(): OfflineRouteStore {
  const records = new Map<number, OfflineRouteRecord>();
  return {
    get: async (id) => records.get(id),
    all: async () => [...records.values()],
    put: async (record) => { records.set(record.routeId, record); },
    delete: async (id) => { records.delete(id); },
  };
}

let current: OfflineRouteStore | undefined;
export function routeStore(): OfflineRouteStore {
  if (current) return current;
  if (supportsOfflineRoutes()) return current = createRouteStore();
  const fail = async () => { throw new OfflineError('unsupported', 'IndexedDB unavailable'); };
  return { get: async () => undefined, all: async () => [], put: fail, delete: fail };
}

export function setOfflineRouteStore(store?: OfflineRouteStore): void { current = store; }

/** Una descarga no se anuncia hasta que datos e imágenes estén confirmados. */
export function notifyRouteDownloads(): void {
  window.dispatchEvent(new Event('naturemaps-route-downloads'));
}
