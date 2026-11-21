import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { hesperides, hesperidesDetail, stubApi } from '../test/greenAreaFixtures';
import type { OfflineZoneRecord } from '../types/offline';
import { fetchGreenAreaDetail, fetchGreenAreas, resetGreenAreasCache } from './greenAreas';
import { fetchNearbyTrees } from './nearby';
import { getCachedTile, haversineMeters, offlineGreenAreas, offlineNearbyTrees } from './offlineRead';
import { createMemoryStore, createMemoryTileCache, setOfflineStorage } from './offlineStorage';

function record(): OfflineZoneRecord {
  const plant = (id: number, latitude: number, greenAreaId: number | null) => ({
    id, speciesId: 7, scientificName: 'Citrus × aurantium', commonName: 'Naranjo amargo',
    displayName: 'Naranjo amargo', latitude, longitude: -0.3882, greenAreaId,
  });
  return {
    groupSlug: 'jardin-de-las-hesperides',
    name: 'Jardín de las Hespérides',
    lang: 'es',
    downloadedAt: '2026-11-15T10:00:00.000Z',
    bbox: hesperides.bbox,
    detail: hesperidesDetail,
    plants: [plant(1, 39.4775, 1), plant(2, 39.4780, 1), plant(3, 39.4900, null)],
    tiles: { keys: [], minZoom: 13, maxZoom: 17, bytes: 0 },
  };
}

describe('zonas descargadas: lectura sin conexión', () => {
  const store = createMemoryStore();
  const tiles = createMemoryTileCache();
  beforeEach(async () => {
    resetGreenAreasCache();
    setOfflineStorage({ store, tiles });
    await store.delete('jardin-de-las-hesperides');
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    setOfflineStorage();
  });

  it('calcula distancias en línea recta como el backend', () => {
    expect(haversineMeters(39.4775, -0.3882, 39.4775, -0.3882)).toBe(0);
    expect(haversineMeters(39.4775, -0.3882, 39.4865, -0.3882)).toBeCloseTo(1000, -1);
  });

  it('sin zonas descargadas no inventa datos', async () => {
    expect(await offlineGreenAreas()).toBeNull();
    expect(await offlineNearbyTrees({ latitude: 39.4775, longitude: -0.3882, radius: 500, lang: 'es' })).toBeNull();
  });

  it('plantas cercanas: solo las que caen en el radio, de más cerca a más lejos', async () => {
    await store.put(record());
    const result = await offlineNearbyTrees({ latitude: 39.4775, longitude: -0.3882, radius: 200, lang: 'es' });
    expect(result?.trees.map((tree) => tree.id)).toEqual([1, 2]);
    expect(result?.trees[0]!.distance).toBe(0);
    expect(result?.trees[0]!.greenAreaId).toBe(1);
    expect(result?.returned).toBe(2);
  });

  it('respeta el límite pedido', async () => {
    await store.put(record());
    const result = await offlineNearbyTrees({ latitude: 39.4775, longitude: -0.3882, radius: 5000, limit: 1, lang: 'es' });
    expect(result?.trees).toHaveLength(1);
  });

  it('capa del mapa: polígonos descargados con su recuento de ejemplares', async () => {
    await store.put(record());
    const areas = await offlineGreenAreas();
    expect(areas).toHaveLength(1);
    expect(areas![0]!.plants).toBe(2);
    expect(areas![0]!.geometry).toBeTruthy();
  });

  it('sirve la ficha descargada cuando no hay red, y la del backend cuando sí', async () => {
    await store.put(record());
    stubApi({ '/green-areas/group/': new TypeError('Failed to fetch') }, vi);
    expect((await fetchGreenAreaDetail('jardin-de-las-hesperides', 'es')).name).toBe('Jardín de las Hespérides');

    const online = { ...hesperidesDetail, name: 'Nombre nuevo del backend' };
    stubApi({ '/green-areas/group/': online }, vi);
    expect((await fetchGreenAreaDetail('jardin-de-las-hesperides', 'es')).name).toBe('Nombre nuevo del backend');
  });

  it('un 404 del backend no se tapa con la copia descargada', async () => {
    await store.put(record());
    stubApi({}, vi);
    await expect(fetchGreenAreaDetail('jardin-de-las-hesperides', 'es')).rejects.toThrow('404');
  });

  it('sin red y sin copia, la ficha falla como siempre', async () => {
    stubApi({ '/green-areas/group/': new TypeError('Failed to fetch') }, vi);
    await expect(fetchGreenAreaDetail('jardin-de-las-hesperides', 'es')).rejects.toBeInstanceOf(TypeError);
  });

  it('sin red, la capa del mapa y las plantas cercanas salen de lo descargado', async () => {
    await store.put(record());
    stubApi({ '/green-areas': new TypeError('Failed to fetch'), '/trees/nearby': new TypeError('Failed to fetch') }, vi);
    expect(await fetchGreenAreas()).toHaveLength(1);
    const nearby = await fetchNearbyTrees({ latitude: 39.4775, longitude: -0.3882, radius: 500, lang: 'es' });
    expect(nearby.trees.length).toBe(2);
  });

  it('devuelve una tesela guardada y nada si no está', async () => {
    await tiles.put('https://tile.openstreetmap.org/15/1/1.png', new Blob(['png']));
    expect(await getCachedTile('https://tile.openstreetmap.org/15/1/1.png')).toBeDefined();
    expect(await getCachedTile('https://tile.openstreetmap.org/15/2/2.png')).toBeUndefined();
  });
});
