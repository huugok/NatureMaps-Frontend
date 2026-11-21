import type { Bbox } from '../types/offline';
import { OfflineError } from './offlineError';

// Matemática de teselas de OpenStreetMap (esquema XYZ «slippy map») para saber
// qué teselas cubren una zona. Sin red ni estado: se prueba con datos fijos.

/**
 * Sin subdominios (`{s}`): la URL de una tesela es siempre la misma y sirve
 * de clave en la caché, tanto al descargarla como al pintar el mapa.
 */
export const TILE_URL_TEMPLATE = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

export interface TileCoord { z: number; x: number; y: number }

/** Peso medio de una tesela PNG de OSM, para estimar antes de descargar. */
export const AVERAGE_TILE_BYTES = 18_000;
const PLANT_BYTES = 400;
const FIXED_BYTES = 20_000;

export const OFFLINE_MIN_ZOOM = 13;
/** El mapa pasa de marcador de parque a plantas sueltas en el zoom 17 (`parkClusters`). */
export const OFFLINE_MAX_ZOOM = 17;
/** Si la zona es enorme se baja el zoom máximo, pero no por debajo de este. */
export const OFFLINE_LOWEST_MAX_ZOOM = 15;
export const OFFLINE_MAX_TILES = 2000;

const MAX_LATITUDE = 85.0511;

export function tileUrl({ z, x, y }: TileCoord): string {
  return TILE_URL_TEMPLATE.replace('{z}', String(z)).replace('{x}', String(x)).replace('{y}', String(y));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function lonToTileX(longitude: number, zoom: number): number {
  const tiles = 2 ** zoom;
  return clamp(Math.floor(((longitude + 180) / 360) * tiles), 0, tiles - 1);
}

export function latToTileY(latitude: number, zoom: number): number {
  const tiles = 2 ** zoom;
  const radians = (clamp(latitude, -MAX_LATITUDE, MAX_LATITUDE) * Math.PI) / 180;
  const y = ((1 - Math.log(Math.tan(radians) + 1 / Math.cos(radians)) / Math.PI) / 2) * tiles;
  return clamp(Math.floor(y), 0, tiles - 1);
}

/** Amplía la caja un margen proporcional (con un mínimo) para no cortar el mapa en el borde. */
export function expandBbox([west, south, east, north]: Bbox, margin = 0.1): Bbox {
  const padLon = Math.max((east - west) * margin, 0.0005);
  const padLat = Math.max((north - south) * margin, 0.0005);
  return [west - padLon, south - padLat, east + padLon, north + padLat];
}

interface ZoomRange { xMin: number; xMax: number; yMin: number; yMax: number }

function rangeAt([west, south, east, north]: Bbox, zoom: number): ZoomRange {
  return {
    xMin: lonToTileX(west, zoom),
    xMax: lonToTileX(east, zoom),
    yMin: latToTileY(north, zoom),
    yMax: latToTileY(south, zoom),
  };
}

function countAt(bbox: Bbox, zoom: number): number {
  const { xMin, xMax, yMin, yMax } = rangeAt(bbox, zoom);
  return (xMax - xMin + 1) * (yMax - yMin + 1);
}

export interface TilePlanOptions {
  minZoom?: number;
  maxZoom?: number;
  margin?: number;
  maxTiles?: number;
  lowestMaxZoom?: number;
}

export interface TilePlan {
  minZoom: number;
  maxZoom: number;
  bbox: Bbox;
  count: number;
  tiles: TileCoord[];
}

/** Cuenta las teselas de la zona sin generarlas: sirve para estimar el peso. */
export function countTiles(bbox: Bbox, options: TilePlanOptions = {}): { minZoom: number; maxZoom: number; count: number; bbox: Bbox } {
  const {
    minZoom = OFFLINE_MIN_ZOOM,
    maxZoom = OFFLINE_MAX_ZOOM,
    margin = 0.1,
    maxTiles = OFFLINE_MAX_TILES,
    lowestMaxZoom = OFFLINE_LOWEST_MAX_ZOOM,
  } = options;
  const padded = expandBbox(bbox, margin);
  const total = (top: number) => {
    let sum = 0;
    for (let zoom = minZoom; zoom <= top; zoom += 1) sum += countAt(padded, zoom);
    return sum;
  };
  for (let top = maxZoom; top >= Math.max(lowestMaxZoom, minZoom); top -= 1) {
    const count = total(top);
    if (count <= maxTiles) return { minZoom, maxZoom: top, count, bbox: padded };
  }
  throw new OfflineError('too-large', 'La zona es demasiado grande para descargarla entera.');
}

/** Teselas que cubren la zona, de menos a más zoom. Baja el zoom máximo si la zona no cabe. */
export function planTiles(bbox: Bbox, options: TilePlanOptions = {}): TilePlan {
  const { minZoom, maxZoom, count, bbox: padded } = countTiles(bbox, options);
  const tiles: TileCoord[] = [];
  for (let z = minZoom; z <= maxZoom; z += 1) {
    const { xMin, xMax, yMin, yMax } = rangeAt(padded, z);
    for (let x = xMin; x <= xMax; x += 1) {
      for (let y = yMin; y <= yMax; y += 1) tiles.push({ z, x, y });
    }
  }
  return { minZoom, maxZoom, bbox: padded, count, tiles };
}

/** Peso aproximado de una zona descargada, en bytes. */
export function estimateBytes(tileCount: number, plantCount = 0): number {
  return tileCount * AVERAGE_TILE_BYTES + plantCount * PLANT_BYTES + FIXED_BYTES;
}
