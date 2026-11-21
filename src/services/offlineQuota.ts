import type { OfflineZoneRecord } from '../types/offline';

// Cuánto espacio queda para las descargas sin conexión (NM-17). El navegador solo
// da una estimación (`navigator.storage.estimate`): si no la da, no se avisa de nada.

/** Por debajo de este espacio libre se avisa de que queda poco (100 MB). */
export const LOW_STORAGE_BYTES = 100_000_000;
/** Margen sobre la estimación de una descarga: el peso real de las teselas varía. */
export const STORAGE_MARGIN = 1.5;

export type StorageLevel = 'unknown' | 'ok' | 'low' | 'insufficient';

/** Espacio que se exige para empezar una descarga de `estimatedBytes`. */
export function bytesNeeded(estimatedBytes: number): number {
  return estimatedBytes * STORAGE_MARGIN;
}

/**
 * Si la descarga cabe: `insufficient` no cabe (no se puede empezar), `low` cabe pero
 * deja menos del umbral libre y `unknown` es que el navegador no dice cuánto queda.
 */
export function assessStorage(estimatedBytes: number, free: number | null): StorageLevel {
  if (free === null) return 'unknown';
  const needed = bytesNeeded(estimatedBytes);
  if (free < needed) return 'insufficient';
  if (free - needed < LOW_STORAGE_BYTES) return 'low';
  return 'ok';
}

/** true si queda menos espacio libre que el umbral de aviso. */
export function isLowStorage(free: number | null): boolean {
  return free !== null && free < LOW_STORAGE_BYTES;
}

/** Peso de lo descargado: las teselas son casi todo (la ficha y las plantas pesan poco). */
export function downloadedBytes(zones: ReadonlyArray<Pick<OfflineZoneRecord, 'tiles'>>): number {
  return zones.reduce((sum, zone) => sum + zone.tiles.bytes, 0);
}
