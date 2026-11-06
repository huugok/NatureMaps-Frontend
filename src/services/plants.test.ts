import { afterEach, describe, expect, it, vi } from 'vitest';
import { MAX_PLANTS, fetchPlantPins } from './plants';

function tree(id: number, speciesId: number | null = 1) {
  return { id, speciesId, displayName: `Planta ${id}`, latitude: 39.47, longitude: -0.37 };
}

function respond(pages: Array<{ nextOffset: number | null; trees: ReturnType<typeof tree>[] }>) {
  const fetchMock = vi.fn();
  for (const page of pages) fetchMock.mockResolvedValueOnce({ ok: true, json: async () => page });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('fetchPlantPins', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('convierte los árboles del backend en pines y marca los identificados', async () => {
    respond([{ nextOffset: null, trees: [tree(1, 7), tree(2, null)] }]);

    const pins = await fetchPlantPins('es');

    expect(pins).toEqual([
      { id: 1, displayName: 'Planta 1', latitude: 39.47, longitude: -0.37, identified: true },
      { id: 2, displayName: 'Planta 2', latitude: 39.47, longitude: -0.37, identified: false },
    ]);
  });

  it('pide el valenciano al backend como catalán y recorre las páginas', async () => {
    const fetchMock = respond([
      { nextOffset: 200, trees: [tree(1)] },
      { nextOffset: null, trees: [tree(2)] },
    ]);

    const pins = await fetchPlantPins('va');

    expect(pins).toHaveLength(2);
    expect(String(fetchMock.mock.calls[0][0])).toContain('/trees?limit=200&offset=0&lang=ca');
    expect(String(fetchMock.mock.calls[1][0])).toContain('offset=200');
  });

  it('no carga más de MAX_PLANTS plantas', async () => {
    const many = Array.from({ length: 200 }, (_, i) => tree(i));
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ nextOffset: 1, trees: many }) })));

    const pins = await fetchPlantPins('en');

    expect(pins).toHaveLength(MAX_PLANTS);
    expect(fetch).toHaveBeenCalledTimes(MAX_PLANTS / 200);
  });

  it('propaga el error si el backend falla', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 500 })));

    await expect(fetchPlantPins('es')).rejects.toThrow('500');
  });
});
