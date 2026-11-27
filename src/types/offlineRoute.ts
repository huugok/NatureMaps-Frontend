import type { FichaDataSource, FichaDetail, FichaImageInfo } from '../services/ficha';
import type { RouteDetail } from '../services/routes';
import type { Language } from './language';
import type { Bbox } from './offline';

export interface RoutePoi {
  id: number;
  name: string;
  sourceUrl: string;
  image: FichaImageInfo | null;
  profile: { description: string; language: string; sourceUrl: string; license: string | null } | null;
  dataSource?: FichaDataSource | null;
}

export interface RoutePacket {
  schemaVersion: 1 | 2 | 3;
  language: string;
  revision: string;
  route: RouteDetail;
  stops: Array<{
    kind: 'planta' | 'poi' | 'sponsor';
    id: number;
    plant: { id: number; speciesId: number | null; displayName: string; sourceUrl?: string; dataSource?: FichaDataSource | null } | null;
    poi: RoutePoi | null;
    sponsor?: { name: string; businessName: string; sponsorLocation: string };
  }>;
  species: FichaDetail[];
  images: FichaImageInfo[];
}

export interface OfflineRouteRecord {
  routeId: number;
  lang: Language;
  downloadedAt: string;
  bytes: number;
  packet: RoutePacket;
  tiles?: RouteTileManifest;
  /** Los blobs y los datos se confirman juntos, en una sola transacción IDB.
   * Cada ruta posee sus imágenes: borrar/cancelar nunca rompe otra descarga. */
  images: Array<{ url: string; blob: Blob }>;
}

export interface RouteDownloadProgress {
  phase: 'content' | 'images' | 'map' | 'saving';
  fraction: number;
  done: number;
  total: number;
}

export interface RouteTileManifest {
  cacheName: string;
  keys: string[];
  bbox: Bbox;
  minZoom: number;
  maxZoom: number;
  bytes: number;
}
