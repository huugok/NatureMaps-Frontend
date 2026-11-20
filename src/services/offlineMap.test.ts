/// <reference types="node" />
import { Blob as NodeBlob } from 'node:buffer';
import { webcrypto } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { downloadMap } from './offlineMap';
import { createMemoryRouteStore, setOfflineRouteStore } from './offlineRouteStorage';
import { routePacket, savedRoute } from '../test/routeOfflineFixtures';

beforeEach(() => { vi.stubGlobal('Blob', NodeBlob); vi.stubGlobal('crypto', webcrypto); setOfflineRouteStore(createMemoryRouteStore()); });
afterEach(() => { setOfflineRouteStore(); vi.unstubAllGlobals(); });

async function fixture() {
  const bytes = new Uint8Array(127);
  const hash = [...new Uint8Array(await webcrypto.subtle.digest('SHA-256', bytes))].map((v) => v.toString(16).padStart(2, '0')).join('');
  return { bytes, metadata: { ...routePacket.map!, sha256: hash } };
}

describe('archivo del mapa sin conexión', () => {
  it('descarga por streaming e informa del avance; verifica tamaño y SHA-256', async () => {
    const { bytes, metadata } = await fixture();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(bytes)));
    const progress: number[] = [];
    const blob = await downloadMap(metadata, undefined, (value) => progress.push(value));
    expect(blob.size).toBe(127);
    expect(progress.at(-1)).toBe(1);
  });

  it('rechaza una descarga truncada o con bytes alterados', async () => {
    const { bytes, metadata } = await fixture();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(bytes.slice(0, 100))));
    await expect(downloadMap(metadata)).rejects.toThrow('incompleto');
    bytes[0] = 1;
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(bytes)));
    await expect(downloadMap(metadata)).rejects.toThrow('integridad');
  });

  it('reutiliza un mapa que ya tiene otra ruta sin pedir la red', async () => {
    const store = createMemoryRouteStore(); setOfflineRouteStore(store);
    await store.put(savedRoute(), new Blob([new Uint8Array(127)]));
    const request = vi.fn(); vi.stubGlobal('fetch', request);
    expect((await downloadMap(routePacket.map!)).size).toBe(127);
    expect(request).not.toHaveBeenCalled();
  });

  it('no descarga antes de validar metadatos ni después de cancelar', async () => {
    const request = vi.fn(); vi.stubGlobal('fetch', request);
    await expect(downloadMap({ ...routePacket.map!, bytes: 100_000_000 })).rejects.toMatchObject({ code: 'network' });
    const controller = new AbortController(); controller.abort();
    await expect(downloadMap(routePacket.map!, controller.signal)).rejects.toMatchObject({ name: 'AbortError' });
    expect(request).not.toHaveBeenCalled();
  });
});
