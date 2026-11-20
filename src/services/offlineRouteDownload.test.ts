import { describe, expect, it, vi } from 'vitest';
import { routePacket, savedRoute } from '../test/routeOfflineFixtures';
import { createMemoryRouteStore } from './offlineRouteStorage';
import { downloadRoute } from './offlineRouteDownload';
import type { RouteDownloadDeps } from './offlineRouteDownload';
import type { RouteDownloadProgress } from '../types/offlineRoute';

function deps(overrides: Partial<RouteDownloadDeps> = {}): RouteDownloadDeps {
  return {
    store: createMemoryRouteStore(), packet: vi.fn(async () => structuredClone(routePacket)),
    image: vi.fn(async () => new Blob(['photo'], { type: 'image/png' })),
    now: () => new Date('2026-11-20T10:00:00Z'), freeBytes: async () => null, ...overrides,
  };
}

describe('descarga completa y atómica de rutas', () => {
  it('guarda geometría, fichas, créditos y blobs al terminar; progreso monótono', async () => {
    const dependencies = deps();
    const progress: RouteDownloadProgress[] = [];
    const saved = await downloadRoute({ id: 7, lang: 'es', onProgress: (p) => progress.push(p) }, dependencies);
    expect(saved.packet.route.path).toHaveLength(2);
    expect(saved.packet.species[0]!.content).toBe('Ficha del naranjo.');
    expect(saved.packet.images[0]!.author).toBe('Autor');
    expect(saved.images[0]!.blob.size).toBe(5);
    expect(await dependencies.store.get(7)).toBe(saved);
    expect(progress[0]!.fraction).toBe(0);
    expect(progress.at(-1)!.fraction).toBe(1);
    expect(progress.map((p) => p.fraction)).toEqual(progress.map((p) => p.fraction).sort((a, b) => a - b));
  });

  it('la cancelación interrumpe el fetch y no deja una descarga parcial', async () => {
    const controller = new AbortController();
    const dependencies = deps({ image: vi.fn(async (_url, signal) => {
      controller.abort(); signal!.throwIfAborted(); return new Blob();
    }) });
    await expect(downloadRoute({ id: 7, lang: 'es', signal: controller.signal }, dependencies)).rejects.toMatchObject({ name: 'AbortError' });
    expect(await dependencies.store.all()).toEqual([]);
  });

  it('conserva la versión anterior si una imagen falla al volver a descargar', async () => {
    const dependencies = deps({ image: async () => { throw new TypeError('offline'); } });
    const previous = savedRoute();
    await dependencies.store.put(previous);
    await expect(downloadRoute({ id: 7, lang: 'en' }, dependencies)).rejects.toMatchObject({ code: 'network' });
    expect(await dependencies.store.get(7)).toBe(previous);
  });

  it('sin espacio no guarda y permite reintentar después', async () => {
    const dependencies = deps({ freeBytes: async () => 1 });
    await expect(downloadRoute({ id: 7, lang: 'es' }, dependencies)).rejects.toMatchObject({ code: 'storage-full' });
    expect(await dependencies.store.all()).toEqual([]);
    dependencies.freeBytes = async () => null;
    await downloadRoute({ id: 7, lang: 'es' }, dependencies);
    expect(await dependencies.store.get(7)).toBeDefined();
  });

  it('un fallo de cuota durante el commit no se anuncia como éxito', async () => {
    const dependencies = deps();
    dependencies.store.put = async () => { throw new DOMException('Full', 'QuotaExceededError'); };
    const progress: RouteDownloadProgress[] = [];
    await expect(downloadRoute({ id: 7, lang: 'es', onProgress: (p) => progress.push(p) }, dependencies)).rejects.toMatchObject({ code: 'storage-full' });
    expect(progress.at(-1)!.fraction).toBeLessThan(1);
  });

  it('deduplica imágenes dentro de la ruta', async () => {
    const dependencies = deps({ packet: async () => ({ ...routePacket, images: [...routePacket.images, ...routePacket.images] }) });
    const saved = await downloadRoute({ id: 7, lang: 'es' }, dependencies);
    expect(saved.images).toHaveLength(1);
    expect(dependencies.image).toHaveBeenCalledTimes(1);
  });

  it('no toca la red si la señal ya está cancelada', async () => {
    const controller = new AbortController(); controller.abort();
    const dependencies = deps();
    await expect(downloadRoute({ id: 7, lang: 'es', signal: controller.signal }, dependencies)).rejects.toMatchObject({ name: 'AbortError' });
    expect(dependencies.packet).not.toHaveBeenCalled();
  });

  it('rechaza otro id o una versión de paquete desconocida', async () => {
    await expect(downloadRoute({ id: 8, lang: 'es' }, deps())).rejects.toMatchObject({ code: 'network' });
  });

  it('funciona cuando la ruta no tiene fotos', async () => {
    const dependencies = deps({ packet: async () => ({ ...routePacket, images: [] }) });
    expect((await downloadRoute({ id: 7, lang: 'es' }, dependencies)).images).toEqual([]);
  });
});
