import type { Language } from '../types/language';
import type { DownloadProgress, OfflineErrorCode, OfflineZoneRecord } from '../types/offline';
import { downloadZone, removeZone } from './offlineDownload';
import { isAbortError, OfflineError } from './offlineError';

// Descargas en curso y recién fallidas (NM-17). Viven fuera de los componentes para que
// la tarjeta de una zona y la lista de Rutas vean lo mismo, y para que una descarga siga
// aunque se cambie de pantalla. Las zonas ya guardadas se leen de IndexedDB.

export type ActiveDownload = {
  groupSlug: string;
  name: string;
  lang: Language;
} & (
  | { status: 'downloading'; progress: DownloadProgress }
  | { status: 'error'; error: OfflineErrorCode | 'generic' }
);

/** Cambios en las zonas guardadas: las pantallas abiertas se ponen al día sin releer. */
export type LibraryChange =
  | { type: 'saved'; record: OfflineZoneRecord }
  | { type: 'removed'; groupSlugs: string[] };

const entries = new Map<string, ActiveDownload>();
const controllers = new Map<string, AbortController>();
const inflight = new Map<string, Promise<OfflineZoneRecord | null>>();
const activeListeners = new Set<() => void>();
const libraryListeners = new Set<(change: LibraryChange) => void>();
let snapshot: readonly ActiveDownload[] = [];

function publish() {
  snapshot = [...entries.values()];
  activeListeners.forEach((listener) => listener());
}

function emit(change: LibraryChange) {
  libraryListeners.forEach((listener) => listener(change));
}

/** Descargas en curso o fallidas, en orden de inicio. La referencia solo cambia si algo cambia. */
export function getActiveDownloads(): readonly ActiveDownload[] {
  return snapshot;
}

export function subscribeActive(listener: () => void): () => void {
  activeListeners.add(listener);
  return () => activeListeners.delete(listener);
}

export function subscribeLibrary(listener: (change: LibraryChange) => void): () => void {
  libraryListeners.add(listener);
  return () => libraryListeners.delete(listener);
}

export interface StartDownloadOptions {
  groupSlug: string;
  lang: Language;
  /** Nombre a mostrar mientras llega el de la ficha. */
  name?: string;
}

/** Empieza a descargar una zona. Si ya se está descargando devuelve la misma descarga; `null` si falla o se cancela. */
export function startDownload({ groupSlug, lang, name }: StartDownloadOptions): Promise<OfflineZoneRecord | null> {
  const running = inflight.get(groupSlug);
  if (running) return running;

  const controller = new AbortController();
  controllers.set(groupSlug, controller);
  const current = (): { name: string } => entries.get(groupSlug) ?? { name: name ?? groupSlug };
  entries.set(groupSlug, {
    groupSlug, lang, name: name ?? groupSlug, status: 'downloading',
    progress: { phase: 'detail', done: 0, total: 1, fraction: 0 },
  });
  publish();

  const promise = (async (): Promise<OfflineZoneRecord | null> => {
    try {
      const record = await downloadZone({
        groupSlug,
        lang,
        signal: controller.signal,
        onDetail: (detail) => {
          const entry = entries.get(groupSlug);
          if (entry && !controller.signal.aborted) {
            entries.set(groupSlug, { ...entry, name: detail.name });
            publish();
          }
        },
        onProgress: (progress) => {
          const entry = entries.get(groupSlug);
          if (entry && !controller.signal.aborted) {
            entries.set(groupSlug, { groupSlug, lang, name: entry.name, status: 'downloading', progress });
            publish();
          }
        },
      });
      entries.delete(groupSlug);
      emit({ type: 'saved', record });
      publish();
      void navigator.storage?.persist?.().catch(() => undefined);
      return record;
    } catch (error) {
      if (isAbortError(error)) {
        entries.delete(groupSlug);
      } else {
        entries.set(groupSlug, {
          groupSlug, lang, name: current().name, status: 'error',
          error: error instanceof OfflineError ? error.code : 'generic',
        });
      }
      publish();
      return null;
    } finally {
      controllers.delete(groupSlug);
      inflight.delete(groupSlug);
    }
  })();
  inflight.set(groupSlug, promise);
  return promise;
}

/** Cancela una descarga en curso (no deja nada guardado). */
export function cancelDownload(groupSlug: string): void {
  controllers.get(groupSlug)?.abort();
}

/** Quita de la lista una descarga fallida. */
export function dismissDownload(groupSlug: string): void {
  if (entries.get(groupSlug)?.status === 'error') {
    entries.delete(groupSlug);
    publish();
  }
}

/** Elimina las zonas indicadas y las teselas que ninguna otra zona necesita. */
export async function removeDownloads(groupSlugs: string[]): Promise<void> {
  for (const groupSlug of groupSlugs) await removeZone(groupSlug);
  emit({ type: 'removed', groupSlugs });
}

/** Solo para tests: olvida las descargas en curso y los avisos. */
export function resetDownloadRegistry(): void {
  controllers.forEach((controller) => controller.abort());
  controllers.clear();
  inflight.clear();
  entries.clear();
  snapshot = [];
}
