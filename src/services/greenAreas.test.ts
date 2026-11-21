import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { hesperides, hesperidesDetail, stubApi } from '../test/greenAreaFixtures';
import { fetchArticle, fetchArticles, isFallbackLanguage } from './editorial';
import { fetchGreenAreaAt, fetchGreenAreaDetail, fetchGreenAreas, resetGreenAreasCache } from './greenAreas';

describe('servicios de zonas verdes y contenido editorial (NM-08)', () => {
  beforeEach(() => resetGreenAreasCache());
  afterEach(() => vi.unstubAllGlobals());

  it('pide la capa una sola vez y la comparte entre pantallas', async () => {
    const fetchMock = stubApi({ '/green-areas': { returned: 1, areas: [hesperides] } }, vi);
    expect(await fetchGreenAreas()).toEqual([hesperides]);
    expect(await fetchGreenAreas()).toEqual([hesperides]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('no deja un fallo en caché: el siguiente intento vuelve a pedir', async () => {
    stubApi({}, vi);
    await expect(fetchGreenAreas()).rejects.toThrow();
    const fetchMock = stubApi({ '/green-areas': { returned: 1, areas: [hesperides] } }, vi);
    expect(await fetchGreenAreas()).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('pide la ficha de zona con el código de idioma del backend (va → ca)', async () => {
    const fetchMock = stubApi({ '/green-areas/group/': hesperidesDetail }, vi);
    await fetchGreenAreaDetail('jardin-de-las-hesperides', 'va');
    expect(String(fetchMock.mock.calls[0]![0])).toMatch(/\/green-areas\/group\/jardin-de-las-hesperides\?lang=ca$/);
  });

  it('consulta la zona verde de un punto por sus coordenadas', async () => {
    const fetchMock = stubApi({ '/green-areas/at': { relation: 'inside', distance: 0, area: hesperides } }, vi);
    const result = await fetchGreenAreaAt(39.4775, -0.3882);
    expect(result.area?.groupSlug).toBe('jardin-de-las-hesperides');
    expect(String(fetchMock.mock.calls[0]![0])).toContain('/green-areas/at?lat=39.4775&lon=-0.3882');
  });

  it('filtra los artículos por sección y por zona', async () => {
    const fetchMock = stubApi({ '/editorial': { returned: 0, articles: [] } }, vi);
    await fetchArticles('en', { topic: 'jardines', group: 'jardin-de-monforte' });
    const url = new URL(String(fetchMock.mock.calls[0]![0]));
    expect(url.pathname).toBe('/editorial');
    expect(Object.fromEntries(url.searchParams)).toEqual({ lang: 'en', topic: 'jardines', group: 'jardin-de-monforte' });
    await fetchArticle('jardin-de-monforte', 'es');
    expect(String(fetchMock.mock.calls[1]![0])).toMatch(/\/editorial\/jardin-de-monforte\?lang=es$/);
  });

  it('detecta cuándo el texto llega en otro idioma', () => {
    expect(isFallbackLanguage('es', 'es')).toBe(false);
    expect(isFallbackLanguage('ca', 'va')).toBe(false);
    expect(isFallbackLanguage('es', 'va')).toBe(true);
    expect(isFallbackLanguage('es', 'en')).toBe(true);
  });
});
