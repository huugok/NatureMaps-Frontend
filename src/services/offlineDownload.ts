import { fetchGreenAreaDetailOnline, fetchGreenAreaPlantsPage } from './greenAreas';
import type { GreenAreaPlantsPage } from './greenAreas';
import type { Language } from '../types/language';
import type { DownloadProgress, OfflineZonePlant, OfflineZoneRecord } from '../types/offline';
import type { GreenAreaDetail } from '../types/greenArea';
import { isAbortError, OfflineError } from './offlineError';
import { freeStorageBytes, offlineStorage } from './offlineStorage';
import type { OfflineStore, TileCache } from './offlineStorage';
import { countTiles, estimateBytes, planTiles, tileUrl } from './offlineTiles';

// Descarga de una zona verde para usarla sin conexión (NM-08): ficha, plantas
// y teselas del mapa. Solo guarda la zona cuando todo ha llegado: una descarga
// cancelada o fallida no deja datos a medias ni teselas huérfanas.

/** OSM pide no saturar sus servidores con descargas masivas: pocas peticiones a la vez. */
export const TILE_CONCURRENCY = 2;
export const PLANTS_PAGE_SIZE = 500;

// Peso de cada fase en la barra de progreso (suman 1).
const WEIGHT = { detail: 0.05, plants: 0.15, tiles: 0.8 } as const;

type PlantsPage = GreenAreaPlantsPage;

export interface DownloadDeps {
  store: OfflineStore;
  tiles: TileCache;
  fetchDetail: (groupSlug: string, lang: Language, signal?: AbortSignal) => Promise<GreenAreaDetail>;
  fetchPlants: (groupSlug: string, lang: Language, offset: number, signal?: AbortSignal) => Promise<PlantsPage>;
  fetchTile: (url: string, signal?: AbortSignal) => Promise<Blob>;
  freeBytes: () => Promise<number | null>;
  now: () => Date;
}

export function defaultDownloadDeps(): DownloadDeps {
  const { store, tiles } = offlineStorage();
  return {
    store,
    tiles,
    fetchDetail: fetchGreenAreaDetailOnline,
    fetchPlants: (groupSlug, lang, offset, signal) => fetchGreenAreaPlantsPage(groupSlug, lang, offset, signal),
    fetchTile: async (url, signal) => {
      const response = await fetch(url, { signal, mode: 'cors' });
      if (!response.ok) throw new Error(`GET ${url} → ${response.status}`);
      return response.blob();
    },
    freeBytes: freeStorageBytes,
    now: () => new Date(),
  };
}

export interface DownloadOptions {
  groupSlug: string;
  lang: Language;
  signal?: AbortSignal;
  onProgress?: (progress: DownloadProgress) => void;
}

function asNetworkError(error: unknown): unknown {
  if (isAbortError(error) || error instanceof OfflineError) return error;
  const message = error instanceof Error ? error.message : 'Error de red';
  return new OfflineError('network', message);
}

/** Descarga y guarda una zona. Se puede cancelar con `signal`; lanza `OfflineError` si falla. */
export async function downloadZone(options: DownloadOptions, deps: DownloadDeps = defaultDownloadDeps()): Promise<OfflineZoneRecord> {
  const { groupSlug, lang, signal, onProgress } = options;
  const report = (phase: DownloadProgress['phase'], done: number, total: number, base: number, weight: number) => {
    const part = total > 0 ? Math.min(done / total, 1) : 1;
    onProgress?.({ phase, done, total, fraction: Math.min(base + part * weight, 1) });
  };
  const added: string[] = [];
  const undo = async () => {
    await Promise.allSettled(added.map((url) => deps.tiles.delete(url)));
  };
  try {
    report('detail', 0, 1, 0, WEIGHT.detail);
    const detail = await deps.fetchDetail(groupSlug, lang, signal);
    const plan = countTiles(detail.bbox);
    const free = await deps.freeBytes();
    if (free !== null && free < estimateBytes(plan.count, detail.plants.total) * 1.5) {
      throw new OfflineError('storage-full', 'No hay espacio suficiente en el dispositivo.');
    }
    report('detail', 1, 1, 0, WEIGHT.detail);

    const plants: OfflineZonePlant[] = [];
    let offset: number | null = 0;
    let total = detail.plants.total;
    while (offset !== null) {
      const page: PlantsPage = await deps.fetchPlants(groupSlug, lang, offset, signal);
      total = page.total;
      plants.push(...page.plants);
      offset = page.nextOffset;
      report('plants', plants.length, total, WEIGHT.detail, WEIGHT.plants);
    }

    const tilePlan = planTiles(detail.bbox);
    const keys = tilePlan.tiles.map(tileUrl);
    let bytes = 0;
    let done = 0;
    let next = 0;
    const base = WEIGHT.detail + WEIGHT.plants;
    report('tiles', 0, keys.length, base, WEIGHT.tiles);
    let failed = false;
    const worker = async () => {
      try {
        while (next < keys.length && !failed) {
          signal?.throwIfAborted();
          const url = keys[next]!;
          next += 1;
          const existing = await deps.tiles.get(url);
          if (existing) {
            bytes += existing.size;
          } else {
            const blob = await deps.fetchTile(url, signal);
            await deps.tiles.put(url, blob);
            added.push(url);
            bytes += blob.size;
          }
          done += 1;
          report('tiles', done, keys.length, base, WEIGHT.tiles);
        }
      } catch (error) {
        failed = true;
        throw error;
      }
    };
    // Se espera a que paren todos los trabajadores antes de deshacer: si no,
    // uno podría guardar una tesela después de la limpieza.
    const results = await Promise.allSettled(Array.from({ length: Math.min(TILE_CONCURRENCY, keys.length) }, worker));
    const rejected = results.find((result): result is PromiseRejectedResult => result.status === 'rejected');
    if (rejected) throw rejected.reason;

    signal?.throwIfAborted();
    report('saving', 0, 1, 1, 0);
    const record: OfflineZoneRecord = {
      groupSlug,
      name: detail.name,
      lang,
      downloadedAt: deps.now().toISOString(),
      bbox: detail.bbox,
      detail,
      plants,
      tiles: { keys, minZoom: tilePlan.minZoom, maxZoom: tilePlan.maxZoom, bytes },
    };
    await deps.store.put(record);
    report('saving', 1, 1, 1, 0);
    return record;
  } catch (error) {
    await undo();
    throw asNetworkError(error);
  }
}

/** Borra una zona descargada y solo las teselas que no necesita ninguna otra zona. */
export async function removeZone(groupSlug: string, deps: Pick<DownloadDeps, 'store' | 'tiles'> = offlineStorage()): Promise<void> {
  const record = await deps.store.get(groupSlug);
  if (!record) return;
  const others = (await deps.store.all()).filter((zone) => zone.groupSlug !== groupSlug);
  const stillUsed = new Set(others.flatMap((zone) => zone.tiles.keys));
  await deps.store.delete(groupSlug);
  await Promise.allSettled(record.tiles.keys.filter((url) => !stillUsed.has(url)).map((url) => deps.tiles.delete(url)));
}

