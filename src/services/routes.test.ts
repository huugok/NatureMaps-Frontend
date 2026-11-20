import { afterEach, describe, expect, it, vi } from 'vitest';
import { savedRoute } from '../test/routeOfflineFixtures';
import { createMemoryRouteStore, setOfflineRouteStore } from './offlineRouteStorage';
import { fetchRouteDetail, fetchRouteList } from './routes';
import { getSpeciesDetail } from './ficha';

afterEach(() => { vi.unstubAllGlobals(); setOfflineRouteStore(); });

describe('lectura de rutas y fichas guardadas', () => {
  async function prepare() {
    const store = createMemoryRouteStore();
    setOfflineRouteStore(store);
    await store.put(savedRoute());
    return store;
  }

  it('abre catálogo, geometría y fichas sin red', async () => {
    await prepare();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')));
    expect((await fetchRouteList())[0]!.id).toBe(7);
    expect((await fetchRouteDetail(7)).path).toHaveLength(2);
    expect((await getSpeciesDetail(5, 'es')).content).toBe('Ficha del naranjo.');
  });

  it('un 5xx permite leer la copia, un 404 sigue siendo un error', async () => {
    await prepare();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 503 })));
    expect((await fetchRouteDetail(7)).id).toBe(7);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 404 })));
    await expect(fetchRouteDetail(7)).rejects.toMatchObject({ status: 404 });
    await expect(getSpeciesDetail(5, 'es')).rejects.toThrow();
  });

  it('no oculta la cancelación con una copia descargada', async () => {
    await prepare();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new DOMException('Aborted', 'AbortError')));
    await expect(fetchRouteDetail(7)).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('borrar una ruta elimina su contenido sin afectar otra ruta con las mismas imágenes', async () => {
    const store = await prepare();
    const second = savedRoute(8);
    second.images = [{ url: 'https://example.test/shared.png', blob: new Blob(['shared']) }];
    await store.put({ ...savedRoute(7), images: second.images });
    await store.put(second);
    await store.delete(7);
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')));
    await expect(fetchRouteDetail(7)).rejects.toThrow();
    expect((await fetchRouteDetail(8)).id).toBe(8);
    expect((await store.get(8))!.images[0]!.blob.size).toBe(6);
  });
});
