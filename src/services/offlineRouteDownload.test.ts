import { describe, expect, it, vi } from 'vitest';
import { routePacket, savedRoute } from '../test/routeOfflineFixtures';
import { createMemoryRouteStore } from './offlineRouteStorage';
import { createMemoryTileCache } from './offlineStorage';
import { downloadRoute, routeBounds } from './offlineRouteDownload';
import type { RouteDownloadDeps } from './offlineRouteDownload';
import type { RouteDownloadProgress } from '../types/offlineRoute';
import type { TileCache } from './offlineStorage';

function deps(overrides: Partial<RouteDownloadDeps> = {}) {
  const caches = new Map<string, TileCache>();
  const removeCache = vi.fn(async (name?: string) => { if (name) caches.delete(name); });
  const dependencies: RouteDownloadDeps = {
    store: createMemoryRouteStore(removeCache), packet: vi.fn(async () => structuredClone(routePacket)),
    image: vi.fn(async () => new Blob(['photo'], { type: 'image/png' })),
    tile: vi.fn(async () => new Blob(['tile'], { type: 'image/png' })),
    cache: (name) => {
      if (!caches.has(name)) caches.set(name, createMemoryTileCache());
      return caches.get(name)!;
    },
    cachedTile: async (url) => {
      for (const cache of caches.values()) { const blob = await cache.get(url); if (blob) return blob; }
      return undefined;
    },
    removeCache, now: () => new Date('2026-11-27T10:00:00Z'), freeBytes: async () => null, ...overrides,
  };
  return { dependencies, caches };
}

describe('descarga de rutas: IndexedDB y Cache API', () => {
  it('guarda geometría, fichas, créditos, fotos y teselas al terminar; progreso monótono', async () => {
    const { dependencies, caches } = deps();
    const progress: RouteDownloadProgress[] = [];
    const saved = await downloadRoute({ id: 7, lang: 'es', onProgress: (p) => progress.push(p) }, dependencies);
    expect(saved.packet.route.path).toHaveLength(2);
    expect(saved.packet.species[0]!.content).toBe('Ficha del naranjo.');
    expect(saved.packet.images[0]!.author).toBe('Autor');
    expect(saved.images[0]!.blob.size).toBe(5);
    expect(await dependencies.store.get(7)).toBe(saved);
    expect(saved.tiles!.keys.length).toBeGreaterThan(0);
    expect(saved.tiles!.keys.every((url) => url.startsWith('https://tile.openstreetmap.org/'))).toBe(true);
    expect((await caches.get(saved.tiles!.cacheName)!.get(saved.tiles!.keys[0]!))!.size).toBe(4);
    expect(progress[0]!.fraction).toBe(0);
    expect(progress.at(-1)!.fraction).toBe(1);
    expect(progress.map((p) => p.fraction)).toEqual(progress.map((p) => p.fraction).sort((a, b) => a - b));
  });

  it('cancelar durante las imágenes no deja una descarga parcial', async () => {
    const controller = new AbortController();
    const { dependencies, caches } = deps({ image: async (_url, signal) => {
      controller.abort(); signal!.throwIfAborted(); return new Blob();
    } });
    await expect(downloadRoute({ id: 7, lang: 'es', signal: controller.signal }, dependencies)).rejects.toMatchObject({ name: 'AbortError' });
    expect(await dependencies.store.all()).toEqual([]);
    expect(caches.size).toBe(0);
  });

  it('conserva la versión anterior si una imagen falla al volver a descargar', async () => {
    const { dependencies } = deps({ image: async () => { throw new TypeError('offline'); } });
    const previous = savedRoute(); await dependencies.store.put(previous);
    await expect(downloadRoute({ id: 7, lang: 'en' }, dependencies)).rejects.toMatchObject({ code: 'network' });
    expect(await dependencies.store.get(7)).toBe(previous);
  });

  it('sin espacio no guarda y permite reintentar después', async () => {
    const { dependencies } = deps({ freeBytes: async () => 1 });
    await expect(downloadRoute({ id: 7, lang: 'es' }, dependencies)).rejects.toMatchObject({ code: 'storage-full' });
    expect(dependencies.tile).not.toHaveBeenCalled();
    dependencies.freeBytes = async () => null;
    await downloadRoute({ id: 7, lang: 'es' }, dependencies);
    expect(await dependencies.store.get(7)).toBeDefined();
  });

  it('un fallo de cuota al confirmar retira la caché nueva y conserva la anterior', async () => {
    const { dependencies, caches } = deps();
    const previous = await downloadRoute({ id: 7, lang: 'es' }, dependencies);
    dependencies.store.put = async () => { throw new DOMException('Full', 'QuotaExceededError'); };
    const progress: RouteDownloadProgress[] = [];
    await expect(downloadRoute({ id: 7, lang: 'es', onProgress: p => progress.push(p) }, dependencies)).rejects.toMatchObject({ code: 'storage-full' });
    expect(progress.at(-1)!.fraction).toBeLessThan(1);
    expect(await dependencies.store.get(7)).toBe(previous);
    expect([...caches.keys()]).toEqual([previous.tiles!.cacheName]);
  });

  it('deduplica imágenes y funciona sin fotos', async () => {
    const { dependencies } = deps({ packet: async () => ({ ...routePacket, images: [...routePacket.images, ...routePacket.images] }) });
    expect((await downloadRoute({ id: 7, lang: 'es' }, dependencies)).images).toHaveLength(1);
    expect(dependencies.image).toHaveBeenCalledTimes(1);
    dependencies.packet = async () => ({ ...routePacket, images: [] });
    expect((await downloadRoute({ id: 7, lang: 'es' }, dependencies)).images).toEqual([]);
  });

  it('no toca la red si la señal ya está cancelada', async () => {
    const controller = new AbortController(); controller.abort();
    const { dependencies } = deps();
    await expect(downloadRoute({ id: 7, lang: 'es', signal: controller.signal }, dependencies)).rejects.toMatchObject({ name: 'AbortError' });
    expect(dependencies.packet).not.toHaveBeenCalled();
  });

  it('rechaza otro id o una versión antigua del paquete', async () => {
    await expect(downloadRoute({ id: 8, lang: 'es' }, deps().dependencies)).rejects.toMatchObject({ code: 'network' });
    await expect(downloadRoute({ id: 7, lang: 'es' }, deps({ packet: async () => ({ ...routePacket, schemaVersion: 2 }) }).dependencies)).rejects.toMatchObject({ code: 'network' });
  });

  it('cancelar durante las teselas espera ambas peticiones antes de limpiar', async () => {
    const controller = new AbortController();
    let calls = 0;
    const { dependencies, caches } = deps();
    const previous = await downloadRoute({ id: 7, lang: 'es' }, dependencies);
    dependencies.cachedTile = async () => undefined;
    dependencies.tile = async (_url, signal) => {
      calls += 1;
      if (calls === 1) { await new Promise(resolve => setTimeout(resolve, 10)); controller.abort(); signal!.throwIfAborted(); }
      await new Promise(resolve => setTimeout(resolve, 20));
      return new Blob(['late tile']);
    };
    await expect(downloadRoute({ id: 7, lang: 'es', signal: controller.signal }, dependencies)).rejects.toMatchObject({ name: 'AbortError' });
    expect(await dependencies.store.get(7)).toBe(previous);
    expect([...caches.keys()]).toEqual([previous.tiles!.cacheName]);
    expect(calls).toBe(2);
  });

  it('una ruta reutiliza teselas sin red pero su borrado no rompe otra ruta', async () => {
    const { dependencies, caches } = deps();
    const first = await downloadRoute({ id: 7, lang: 'es' }, dependencies);
    const calls = vi.mocked(dependencies.tile).mock.calls.length;
    dependencies.packet = async () => ({ ...routePacket, route: { ...routePacket.route, id: 8 } });
    const second = await downloadRoute({ id: 8, lang: 'es' }, dependencies);
    expect(vi.mocked(dependencies.tile).mock.calls.length).toBe(calls);
    await dependencies.store.delete(7);
    expect(caches.has(first.tiles!.cacheName)).toBe(false);
    expect(await caches.get(second.tiles!.cacheName)!.get(second.tiles!.keys[0]!)).toBeDefined();
    await dependencies.store.delete(8);
    expect(caches.size).toBe(0);
  });

  it('actualizar sustituye la caché anterior solo después de confirmar', async () => {
    const { dependencies, caches } = deps();
    const first = await downloadRoute({ id: 7, lang: 'es' }, dependencies);
    const second = await downloadRoute({ id: 7, lang: 'es' }, dependencies);
    expect(second.tiles!.cacheName).not.toBe(first.tiles!.cacheName);
    expect([...caches.keys()]).toEqual([second.tiles!.cacheName]);
  });

  it('no confirma la ruta si una tesela falla', async () => {
    const { dependencies, caches } = deps({ tile: async () => { throw new TypeError('unavailable'); } });
    await expect(downloadRoute({ id: 7, lang: 'es' }, dependencies)).rejects.toMatchObject({ code: 'network' });
    expect(await dependencies.store.all()).toEqual([]);
    expect(caches.size).toBe(0);
  });

  it('calcula los límites con geometría y paradas y rechaza áreas enormes', async () => {
    const route = { ...routePacket.route, path: [...routePacket.route.path, { latitude: 39.5, longitude: -0.4 }] };
    expect(routeBounds(route)).toEqual([-0.4, 39.47, -0.38, 39.5]);
    expect(() => routeBounds({ ...route, start: { latitude: NaN, longitude: 0 } })).toThrow();
    const { dependencies } = deps({ packet: async () => ({ ...routePacket, route: { ...route, start: { latitude: 0, longitude: 0 } } }) });
    await expect(downloadRoute({ id: 7, lang: 'es' }, dependencies)).rejects.toMatchObject({ code: 'too-large' });
    expect(dependencies.tile).not.toHaveBeenCalled();
  });
});
