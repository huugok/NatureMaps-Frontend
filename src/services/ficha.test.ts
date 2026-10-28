import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import {
  commonNameFor,
  fichaDesdeDetalle,
  fichaDesdeItemLista,
  findSpeciesIndexByScientificName,
  getSpeciesDetail,
  getSpeciesList,
} from './ficha';
import type { FichaDetail, FichaListItem } from './ficha';

const respuestaJson = { headers: { 'content-type': 'application/json' } };

const itemLista: FichaListItem = {
  id: 7,
  scientificName: 'Jacaranda mimosifolia',
  names: [{ name: 'Jacaranda', language: 'es' }],
  content: null,
  profile: null,
  enrichment: null,
  image: null,
};

const detalle: FichaDetail = {
  ...itemLista,
  content: 'Árbol subtropical oriundo de Sudamérica…',
  profile: {
    language: 'es',
    description: 'Árbol subtropical oriundo de Sudamérica…',
    family: 'Bignoniaceae',
    flowering: 'primavera',
    curiosity: 'su fruto es una cápsula leñosa…',
    sources: [
      { name: 'Wikipedia (es)', description: 'Descripción y datos botánicos (CC BY-SA) · Consulta 25/10/2026', url: 'https://es.wikipedia.org/wiki/Jacaranda_mimosifolia' },
    ],
  },
  enrichment: {
    language: 'es',
    content: 'Extracto automático de Wikipedia…',
    source: 'WIKIPEDIA',
    url: 'https://es.wikipedia.org/wiki/Jacaranda_mimosifolia',
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
  },
  image: {
    url: 'https://upload.wikimedia.org/wikipedia/commons/b/b9/Jacaranda1212.jpg',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Jacaranda1212.jpg',
    author: 'Kahuroa',
    license: 'dominio público',
    licenseUrl: 'https://creativecommons.org/licenses/publicdomain/',
    attribution: 'Kahuroa · Wikimedia Commons · dominio público',
  },
  locations: {
    total: 2,
    returned: 2,
    nextAfterId: null,
    items: [
      { id: 1, latitude: 39.47, longitude: -0.37, district: 'Patraix', neighborhood: 'Vara de Quart', source: 'VALENCIA_ARBOLADO', sourceUrl: 'https://geoportal.valencia.es/x' },
      { id: 2, latitude: 39.48, longitude: -0.38, district: 'Campanar', neighborhood: null, source: 'VALENCIA_ARBOLADO', sourceUrl: 'https://geoportal.valencia.es/x' },
    ],
  },
};

describe('getSpeciesList — catálogo para la navegación de la ficha', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('pide la lista con el idioma y devuelve las especies', async () => {
    const fetchMock = vi.fn().mockImplementation(() =>
      new Response(JSON.stringify({ total: 1, species: [itemLista] }), respuestaJson));
    vi.stubGlobal('fetch', fetchMock);

    const lista = await getSpeciesList('es');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe('http://localhost:3000/species?lang=es');
    expect(lista).toHaveLength(1);
    expect(lista[0]).toMatchObject({ id: 7, scientificName: 'Jacaranda mimosifolia' });
  });

  test('codifica el idioma en la URL', async () => {
    const fetchMock = vi.fn().mockImplementation(() =>
      new Response(JSON.stringify({ total: 0, species: [] }), respuestaJson));
    vi.stubGlobal('fetch', fetchMock);

    await getSpeciesList('va');

    expect(fetchMock.mock.calls[0]?.[0]).toBe('http://localhost:3000/species?lang=va');
  });

  test('un catálogo vacío devuelve lista vacía sin fallar', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() =>
      new Response(JSON.stringify({ total: 0, species: [] }), respuestaJson)));

    await expect(getSpeciesList('es')).resolves.toEqual([]);
  });

  test('error de red lanza un mensaje claro sin exponer detalles internos', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Network error')));

    await expect(getSpeciesList('es')).rejects.toThrow('No se ha podido cargar el catálogo de especies');
  });

  test('error HTTP con cuerpo { error } incluye el detalle del backend', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() =>
      new Response(JSON.stringify({ error: 'lang no es válido' }), { status: 400, ...respuestaJson })));

    await expect(getSpeciesList('es')).rejects.toThrow('lang no es válido');
  });
});

describe('getSpeciesDetail — ficha completa por especie', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('pide la ficha por id e idioma y devuelve el detalle', async () => {
    const fetchMock = vi.fn().mockImplementation(() =>
      new Response(JSON.stringify(detalle), respuestaJson));
    vi.stubGlobal('fetch', fetchMock);

    const result = await getSpeciesDetail(7, 'es');

    expect(fetchMock.mock.calls[0]?.[0]).toBe('http://localhost:3000/species/7?lang=es');
    expect(result.locations.total).toBe(2);
    expect(result.profile?.family).toBe('Bignoniaceae');
  });

  test('una especie inexistente (404) lanza error con el mensaje del backend', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() =>
      new Response(JSON.stringify({ error: 'Especie no encontrada' }), { status: 404, ...respuestaJson })));

    await expect(getSpeciesDetail(999, 'es')).rejects.toThrow('Especie no encontrada');
  });
});

describe('fichaDesdeDetalle — mapeo de la API al modelo de vista', () => {
  test('mapea nombre común, familia, floración, curiosidad, fuentes e imagen con crédito', () => {
    const especie = fichaDesdeDetalle(detalle, 'es');

    expect(especie.commonName).toBe('Jacaranda');
    expect(especie.scientificName).toBe('Jacaranda mimosifolia');
    expect(especie.family).toBe('Bignoniaceae');
    expect(especie.flowering).toBe('primavera');
    expect(especie.description).toBe(detalle.content);
    expect(especie.curiosity).toEqual({ label: 'Dato curioso', text: 'su fruto es una cápsula leñosa…' });
    expect(especie.photoUrl).toContain('upload.wikimedia.org');
    expect(especie.photoCredit).toBe('Kahuroa · Wikimedia Commons · dominio público');
    expect(especie.sources).toHaveLength(1);
    expect(especie.locations).toEqual([
      { name: 'Vara de Quart', district: 'Patraix' },
      { name: 'Campanar', district: 'Campanar' },
    ]);
    expect(especie.locationTotal).toBe(2);
  });

  test('una especie sin perfil ni imagen produce una ficha parcial válida', () => {
    const especie = fichaDesdeDetalle({ ...detalle, profile: null, image: null, content: null, enrichment: null }, 'es');

    expect(especie.family).toBeUndefined();
    expect(especie.photoUrl).toBeUndefined();
    expect(especie.photoCredit).toBeUndefined();
    expect(especie.curiosity).toBeUndefined();
    expect(especie.sources).toEqual([]);
    expect(especie.description).toBeUndefined();
    expect(especie.commonName).toBe('Jacaranda');
  });

  test('sin perfil editorial, el extracto de Wikipedia se declara como fuente (RNF6)', () => {
    const especie = fichaDesdeDetalle(
      { ...detalle, profile: null, content: 'Extracto automático de Wikipedia…' },
      'es',
    );

    expect(especie.sources).toEqual([
      {
        name: 'Wikipedia',
        description: 'Extracto enciclopédico · CC BY-SA 4.0',
        url: 'https://es.wikipedia.org/wiki/Jacaranda_mimosifolia',
        icon: 'search',
      },
    ]);
  });

  test('con perfil editorial, las fuentes son las del perfil aunque exista enriquecimiento', () => {
    const especie = fichaDesdeDetalle(detalle, 'es');

    // El texto mostrado es el editorial (content = profile.description), así
    // que las fuentes declaradas son las del perfil, no las del extracto. El
    // icono lo añade el mapeo por URL (Wikipedia -> búsqueda).
    expect(especie.sources).toEqual([
      {
        name: 'Wikipedia (es)',
        description: 'Descripción y datos botánicos (CC BY-SA) · Consulta 25/10/2026',
        url: 'https://es.wikipedia.org/wiki/Jacaranda_mimosifolia',
        icon: 'search',
      },
    ]);
    expect(especie.sources?.some((f) => f.name === 'Wikipedia')).toBe(false);
  });

  test('elige el nombre común según el idioma: va acepta ca, en cae a es', () => {
    const nombres = [
      { name: 'Jacarandá', language: 'en' },
      { name: 'Jacarandá', language: 'es' },
    ];
    expect(commonNameFor(nombres, 'es')).toBe('Jacarandá');
    expect(commonNameFor(nombres, 'en')).toBe('Jacarandá');
    expect(commonNameFor([
      { name: 'Jacarandá', language: 'es' },
      { name: 'Jacaranda', language: 'ca' },
    ], 'va')).toBe('Jacaranda');
    expect(commonNameFor([], 'es')).toBeNull();
  });
});

describe('fichaDesdeItemLista — ficha instantánea desde la fila de la lista', () => {
  test('mapea la fila con su perfil e imagen, pero sin ubicaciones (las trae el detalle)', () => {
    const filaCompleta: FichaListItem = {
      ...detalle,
      locations: undefined,
    } as unknown as FichaListItem;

    const especie = fichaDesdeItemLista(filaCompleta, 'es');

    expect(especie.commonName).toBe('Jacaranda');
    expect(especie.scientificName).toBe('Jacaranda mimosifolia');
    expect(especie.family).toBe('Bignoniaceae');
    expect(especie.description).toBe(detalle.content);
    expect(especie.photoUrl).toContain('upload.wikimedia.org');
    expect(especie.locations).toBeUndefined();
    expect(especie.locationTotal).toBeUndefined();
  });

  test('una fuente del geoportal se pinta como institucional (icono por URL)', () => {
    const especie = fichaDesdeItemLista({
      ...itemLista,
      profile: {
        language: 'es',
        description: null,
        family: null,
        flowering: null,
        curiosity: null,
        sources: [
          { name: 'Ajuntament de València', description: 'Inventario de arbolado municipal', url: 'https://geoportal.valencia.es/server/rest/services/OPENDATA/MedioAmbiente/MapServer/151/query' },
        ],
      },
    }, 'es');

    expect(especie.sources).toEqual([
      { name: 'Ajuntament de València', description: 'Inventario de arbolado municipal', url: 'https://geoportal.valencia.es/server/rest/services/OPENDATA/MedioAmbiente/MapServer/151/query', icon: 'landmark' },
    ]);
  });
});

describe('findSpeciesIndexByScientificName — match de Pl@ntNet contra el catálogo', () => {
  const items: FichaListItem[] = [
    itemLista,
    { ...itemLista, id: 8, scientificName: 'Citrus aurantium', names: [{ name: 'Naranjo amargo', language: 'es' }] },
  ];

  test('encuentra la especie por su nombre científico', () => {
    expect(findSpeciesIndexByScientificName(items, 'Jacaranda mimosifolia')).toBe(0);
  });

  test('es inmune a mayúsculas y a la notación de híbrido (×)', () => {
    expect(findSpeciesIndexByScientificName(items, 'citrus × aurantium')).toBe(1);
    expect(findSpeciesIndexByScientificName(items, 'Citrus aurantium')).toBe(1);
  });

  test('devuelve null sin candidato o cuando la especie no está en el catálogo', () => {
    expect(findSpeciesIndexByScientificName(items, null)).toBeNull();
    expect(findSpeciesIndexByScientificName(items, 'Morus nigra')).toBeNull();
    expect(findSpeciesIndexByScientificName([], 'Jacaranda mimosifolia')).toBeNull();
  });
});
