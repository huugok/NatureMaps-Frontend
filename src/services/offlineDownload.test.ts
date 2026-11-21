import { describe, expect, it, vi } from 'vitest';
import { hesperidesDetail } from '../test/greenAreaFixtures';
import type { DownloadProgress, OfflineZonePlant } from '../types/offline';
import { downloadZone, removeZone, TILE_CONCURRENCY } from './offlineDownload';
import type { DownloadDeps } from './offlineDownload';
import { createMemoryStore, createMemoryTileCache } from './offlineStorage';
import { planTiles, tileUrl } from './offlineTiles';

function plant(id: number, greenAreaId: number | null = 1): OfflineZonePlant {
  return {
    id, speciesId: 7, scientificName: 'Citrus × aurantium', commonName: 'Naranjo amargo',
    displayName: 'Naranjo amargo', latitude: 39.4775, longitude: -0.3882, greenAreaId,
  };
}

function makeDeps(overrides: Partial<DownloadDeps> = {}) {
  const store = createMemoryStore();
  const tiles = createMemoryTileCache();
  const pages = [
    { groupSlug: 'jardin-de-las-hesperides', total: 3, returned: 2, nextOffset: 2, plants: [plant(1), plant(2)] },
    { groupSlug: 'jardin-de-las-hesperides', total: 3, returned: 1, nextOffset: null, plants: [plant(3)] },
  ];
  const deps: DownloadDeps = {
    store,
    tiles,
    fetchDetail: vi.fn(async () => hesperidesDetail),
    fetchPlants: vi.fn(async (_slug, _lang, offset) => pages[offset === 0 ? 0 : 1]!),
    fetchTile: vi.fn(async () => new Blob(['x'.repeat(100)], { type: 'image/png' })),
    freeBytes: async () => null,
    now: () => new Date('2026-11-15T10:00:00Z'),
    ...overrides,
  };
  return { deps, store, tiles };
}

describe('descarga de una zona para el modo sin conexión', () => {
  it('descarga ficha, todas las plantas paginadas y las teselas, y lo guarda al final', async () => {
    const { deps, store, tiles } = makeDeps();
    const record = await downloadZone({ groupSlug: 'jardin-de-las-hesperides', lang: 'es' }, deps);

    const expectedTiles = planTiles(hesperidesDetail.bbox);
    expect(record.plants.map((p) => p.id)).toEqual([1, 2, 3]);
    expect(record.tiles.keys).toHaveLength(expectedTiles.count);
    expect(tiles.keys()).toHaveLength(expectedTiles.count);
    expect(record.tiles.bytes).toBe(expectedTiles.count * 100);
    expect(record.downloadedAt).toBe('2026-11-15T10:00:00.000Z');
    expect(await store.get('jardin-de-las-hesperides')).toMatchObject({ name: 'Jardín de las Hespérides', lang: 'es' });
    expect(deps.fetchPlants).toHaveBeenCalledTimes(2);
  });

  it('informa del progreso de 0 a 1, fase a fase y sin retroceder', async () => {
    const { deps } = makeDeps();
    const progress: DownloadProgress[] = [];
    await downloadZone({ groupSlug: 'jardin-de-las-hesperides', lang: 'es', onProgress: (p) => progress.push(p) }, deps);
    const phases = [...new Set(progress.map((p) => p.phase))];
    expect(phases).toEqual(['detail', 'plants', 'tiles', 'saving']);
    expect(progress[0]!.fraction).toBe(0);
    expect(progress.at(-1)!.fraction).toBe(1);
    const fractions = progress.map((p) => p.fraction);
    expect(fractions).toEqual([...fractions].sort((a, b) => a - b));
  });

  it('no abre más de dos peticiones de teselas a la vez', async () => {
    let active = 0;
    let peak = 0;
    const { deps } = makeDeps({
      fetchTile: vi.fn(async () => {
        active += 1;
        peak = Math.max(peak, active);
        await new Promise((resolve) => setTimeout(resolve, 1));
        active -= 1;
        return new Blob(['t']);
      }),
    });
    await downloadZone({ groupSlug: 'jardin-de-las-hesperides', lang: 'es' }, deps);
    expect(peak).toBeLessThanOrEqual(TILE_CONCURRENCY);
    expect(peak).toBeGreaterThan(1);
  });

  it('reaprovecha las teselas que ya están en el dispositivo', async () => {
    const { deps, tiles } = makeDeps();
    const first = planTiles(hesperidesDetail.bbox).tiles[0]!;
    await tiles.put(tileUrl(first), new Blob(['y'.repeat(50)]));
    await downloadZone({ groupSlug: 'jardin-de-las-hesperides', lang: 'es' }, deps);
    expect(deps.fetchTile).toHaveBeenCalledTimes(planTiles(hesperidesDetail.bbox).count - 1);
  });

  it('al cancelar no guarda la zona y retira las teselas que había descargado', async () => {
    const controller = new AbortController();
    let calls = 0;
    const { deps, store, tiles } = makeDeps({
      fetchTile: vi.fn(async () => {
        calls += 1;
        if (calls === 5) controller.abort();
        return new Blob(['t']);
      }),
    });
    await expect(downloadZone({ groupSlug: 'jardin-de-las-hesperides', lang: 'es', signal: controller.signal }, deps))
      .rejects.toMatchObject({ name: 'AbortError' });
    expect(await store.get('jardin-de-las-hesperides')).toBeUndefined();
    expect(tiles.keys()).toHaveLength(0);
  });

  it('si falla una tesela, el error es de red y no deja nada guardado', async () => {
    let calls = 0;
    const { deps, store, tiles } = makeDeps({
      fetchTile: vi.fn(async () => {
        calls += 1;
        if (calls === 3) throw new TypeError('Failed to fetch');
        return new Blob(['t']);
      }),
    });
    await expect(downloadZone({ groupSlug: 'jardin-de-las-hesperides', lang: 'es' }, deps))
      .rejects.toMatchObject({ code: 'network' });
    expect(await store.get('jardin-de-las-hesperides')).toBeUndefined();
    expect(tiles.keys()).toHaveLength(0);
  });

  it('no empieza si no hay espacio en el dispositivo', async () => {
    const { deps, store } = makeDeps({ freeBytes: async () => 1000 });
    await expect(downloadZone({ groupSlug: 'jardin-de-las-hesperides', lang: 'es' }, deps))
      .rejects.toMatchObject({ code: 'storage-full' });
    expect(deps.fetchTile).not.toHaveBeenCalled();
    expect(await store.all()).toHaveLength(0);
  });

  it('si no se puede guardar (navegador sin IndexedDB), lo dice y limpia las teselas', async () => {
    const { deps, tiles } = makeDeps();
    deps.store.put = async () => { throw new Error('QuotaExceededError'); };
    await expect(downloadZone({ groupSlug: 'jardin-de-las-hesperides', lang: 'es' }, deps)).rejects.toBeInstanceOf(Error);
    expect(tiles.keys()).toHaveLength(0);
  });

  it('al borrar una zona conserva las teselas que comparte con otra', async () => {
    const { deps, store, tiles } = makeDeps();
    const record = await downloadZone({ groupSlug: 'jardin-de-las-hesperides', lang: 'es' }, deps);
    const shared = record.tiles.keys[0]!;
    await store.put({
      ...record,
      groupSlug: 'jardin-vecino',
      name: 'Jardín vecino',
      tiles: { ...record.tiles, keys: [shared] },
    });
    await removeZone('jardin-de-las-hesperides', { store, tiles });
    expect(await store.get('jardin-de-las-hesperides')).toBeUndefined();
    expect(tiles.keys()).toEqual([shared]);
    await removeZone('jardin-vecino', { store, tiles });
    expect(tiles.keys()).toHaveLength(0);
  });

  it('borrar una zona que no está descargada no hace nada', async () => {
    const { store, tiles } = makeDeps();
    await expect(removeZone('no-existe', { store, tiles })).resolves.toBeUndefined();
  });
});
