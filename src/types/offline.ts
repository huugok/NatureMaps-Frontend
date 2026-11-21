import type { GreenAreaDetail } from './greenArea';
import type { Language } from './language';

// Zonas verdes descargadas para usarlas sin conexión (NM-08, descarga offline).

/** [oeste, sur, este, norte], el mismo orden que usa el backend. */
export type Bbox = [number, number, number, number];

/** Ejemplar de una zona descargada (`GET /green-areas/group/:slug/plants`). */
export interface OfflineZonePlant {
  id: number;
  speciesId: number | null;
  scientificName: string | null;
  reportedScientificName?: string | null;
  commonName: string | null;
  displayName: string;
  latitude: number;
  longitude: number;
  greenAreaId: number | null;
}

/** Lo que se guarda en el dispositivo por cada zona descargada. */
export interface OfflineZoneRecord {
  groupSlug: string;
  name: string;
  /** Idioma en que se guardaron los textos (el backend sirve uno por petición). */
  lang: Language;
  downloadedAt: string;
  bbox: Bbox;
  detail: GreenAreaDetail;
  plants: OfflineZonePlant[];
  tiles: {
    /** URLs de las teselas de esta zona: permiten borrar solo las que no usa otra zona. */
    keys: string[];
    minZoom: number;
    maxZoom: number;
    bytes: number;
  };
}

export type DownloadPhase = 'detail' | 'plants' | 'tiles' | 'saving';

export interface DownloadProgress {
  phase: DownloadPhase;
  done: number;
  total: number;
  /** Avance global de 0 a 1. */
  fraction: number;
}

export type OfflineErrorCode = 'unsupported' | 'storage-full' | 'too-large' | 'network';
