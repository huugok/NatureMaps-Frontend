import type { GreenArea, GreenAreaDetail } from '../types/greenArea';
import type { OfflineZonePlant, OfflineZoneRecord } from '../types/offline';
import type { NearbyPlant, NearbyResponse } from './nearby';
import { offlineStorage } from './offlineStorage';

// Lectura de lo descargado: las pantallas piden primero al backend y, si no
// hay red, estas funciones sirven la copia guardada. Si no hay copia devuelven
// null/vacío y quien llama conserva su error de siempre: sin datos de reserva
// inventados.

async function safeAll(): Promise<OfflineZoneRecord[]> {
  try {
    return await offlineStorage().store.all();
  } catch {
    return [];
  }
}

export async function getOfflineZone(groupSlug: string): Promise<OfflineZoneRecord | null> {
  try {
    return (await offlineStorage().store.get(groupSlug)) ?? null;
  } catch {
    return null;
  }
}

export async function listOfflineZones(): Promise<OfflineZoneRecord[]> {
  return safeAll();
}

/** Ficha de una zona descargada. */
export async function offlineGreenAreaDetail(groupSlug: string): Promise<GreenAreaDetail | null> {
  return (await getOfflineZone(groupSlug))?.detail ?? null;
}

/** Plantas de una zona descargada; null si no está descargada. */
export async function offlineZonePlants(groupSlug: string): Promise<OfflineZonePlant[] | null> {
  return (await getOfflineZone(groupSlug))?.plants ?? null;
}

/** Capa del mapa con los polígonos de las zonas descargadas; null si no hay ninguna. */
export async function offlineGreenAreas(): Promise<GreenArea[] | null> {
  const zones = await safeAll();
  if (zones.length === 0) return null;
  return zones.flatMap((zone) => {
    const perArea = new Map<number, number>();
    for (const plant of zone.plants) {
      if (plant.greenAreaId !== null) perArea.set(plant.greenAreaId, (perArea.get(plant.greenAreaId) ?? 0) + 1);
    }
    return zone.detail.areas.map((area) => ({ ...area, plants: perArea.get(area.id) ?? 0 }));
  });
}

const EARTH_RADIUS_M = 6_371_000;

/** Distancia en línea recta, en metros (la misma fórmula que usa el backend). */
export function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const rad = (degrees: number) => (degrees * Math.PI) / 180;
  const a = Math.sin(rad(lat2 - lat1) / 2) ** 2
    + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lon2 - lon1) / 2) ** 2;
  return EARTH_RADIUS_M * 2 * Math.asin(Math.sqrt(a));
}

function toNearby(plant: OfflineZonePlant, distance: number): NearbyPlant {
  return { ...plant, distance: Math.round(distance) };
}

/**
 * Plantas cercanas a un punto entre las zonas descargadas, con la misma forma
 * que `GET /trees/nearby`. Null si no hay ninguna zona descargada.
 */
export async function offlineNearbyTrees(params: {
  latitude: number;
  longitude: number;
  radius: number;
  limit?: number;
  offset?: number;
  lang: string;
}): Promise<NearbyResponse | null> {
  const zones = await safeAll();
  if (zones.length === 0) return null;
  const limit = params.limit ?? 100;
  const seen = new Set<number>();
  const trees: NearbyPlant[] = [];
  for (const zone of zones) {
    for (const plant of zone.plants) {
      if (seen.has(plant.id)) continue;
      seen.add(plant.id);
      const distance = haversineMeters(params.latitude, params.longitude, plant.latitude, plant.longitude);
      if (distance <= params.radius) trees.push(toNearby(plant, distance));
    }
  }
  trees.sort((a, b) => a.distance - b.distance);
  const page = trees.slice(params.offset ?? 0, (params.offset ?? 0) + limit);
  return {
    total: trees.length,
    center: { latitude: params.latitude, longitude: params.longitude },
    radius: params.radius,
    returned: page.length,
    limit,
    language: params.lang,
    trees: page,
  };
}

/** Tesela guardada para pintar el mapa sin conexión. */
export async function getCachedTile(url: string): Promise<Blob | undefined> {
  try {
    return await offlineStorage().tiles.get(url);
  } catch {
    return undefined;
  }
}
