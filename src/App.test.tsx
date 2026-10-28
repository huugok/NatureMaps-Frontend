import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import App from './App';
import { LANGUAGE_STORAGE_KEY } from './services/languagePreference';

const respuestaJson = { headers: { 'content-type': 'application/json' } };

// Catálogo mínimo que devolvería GET /species en desarrollo.
const catalogo = {
  total: 2,
  species: [
    {
      id: 1,
      scientificName: 'Jacaranda mimosifolia',
      names: [{ name: 'Jacaranda', language: 'es' }],
      content: 'Árbol subtropical oriundo de Sudamérica…',
      profile: null,
      enrichment: null,
      image: null,
    },
    {
      id: 2,
      scientificName: 'Citrus aurantium',
      names: [{ name: 'Naranjo amargo', language: 'es' }],
      content: 'Árbol cítrico perennifolio…',
      profile: null,
      enrichment: null,
      image: null,
    },
  ],
};

const detalleEspecie = (id: number) => ({
  ...catalogo.species[id - 1],
  locations: { total: 0, returned: 0, nextAfterId: null, items: [] },
});

// La app carga el catálogo al montar: todas las pruebas usan este stub.
const stubFichaApi = () =>
  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/species/')) {
        const id = Number(url.split('/species/')[1]?.split('?')[0] ?? '1');
        return Promise.resolve(new Response(JSON.stringify(detalleEspecie(id)), respuestaJson));
      }
      return Promise.resolve(new Response(JSON.stringify(catalogo), respuestaJson));
    }),
  );

const renderApp = () => render(<App />);

const openLanguagePage = () => {
  fireEvent.click(screen.getByRole('button', { name: 'Abrir Ajustes' }));
  fireEvent.click(screen.getByRole('button', { name: /idioma/i }));
};

describe('selector de idioma en Ajustes', () => {
  beforeEach(() => {
    localStorage.clear();
    stubFichaApi();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('arranca con el español seleccionado por defecto', () => {
    renderApp();

    expect(screen.getByRole('tab', { name: 'Ir a Inicio' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Abrir Ajustes' }));
    expect(screen.getByRole('heading', { name: 'Ajustes' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Idioma: Español' })).toBeInTheDocument();
  });

  it('ofrece español, valenciano e inglés en Ajustes > Idioma', () => {
    renderApp();
    openLanguagePage();

    expect(screen.getByRole('heading', { name: 'Idioma' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Español' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Valencià' })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: 'English' })).not.toBeChecked();
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeInTheDocument();
  });

  it('guarda el inglés como preferencia sin traducir los textos', () => {
    renderApp();
    openLanguagePage();

    fireEvent.click(screen.getByRole('radio', { name: 'English' }));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('en');
    expect(screen.getByRole('heading', { name: 'Ajustes' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Idioma: English' })).toBeInTheDocument();
    // La traducción de los textos llega en otra UT: aquí todo sigue en español.
    expect(screen.getByRole('tab', { name: 'Ir a Inicio' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Ver Mapa de especies y árboles' })).toBeInTheDocument();
  });

  it('guarda el valenciano como preferencia', () => {
    renderApp();
    openLanguagePage();

    fireEvent.click(screen.getByRole('radio', { name: 'Valencià' }));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('va');
    expect(screen.getByRole('button', { name: 'Idioma: Valencià' })).toBeInTheDocument();
  });

  it('descarta la selección si se sale sin guardar', () => {
    renderApp();
    openLanguagePage();

    fireEvent.click(screen.getByRole('radio', { name: 'English' }));
    fireEvent.click(screen.getByRole('button', { name: 'Volver' }));

    expect(screen.getByRole('heading', { name: 'Ajustes' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Idioma: Español' })).toBeInTheDocument();
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBeNull();
  });

  it('restaura la preferencia guardada al volver a abrir la app', () => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'va');
    renderApp();

    fireEvent.click(screen.getByRole('button', { name: 'Abrir Ajustes' }));
    expect(screen.getByRole('button', { name: 'Idioma: Valencià' })).toBeInTheDocument();
  });

  it('mantiene las cinco pestañas y su rejilla al guardar el idioma', () => {
    renderApp();

    expect(screen.getAllByRole('tab')).toHaveLength(5);
    expect(screen.getByRole('tablist')).toHaveClass('grid-cols-5');

    openLanguagePage();
    fireEvent.click(screen.getByRole('radio', { name: 'English' }));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(screen.getAllByRole('tab')).toHaveLength(5);
    expect(screen.getByRole('tablist')).toHaveClass('grid-cols-5');
  });
});

describe('ficha de planta conectada a la API (RF3, UT F06)', () => {
  beforeEach(() => {
    localStorage.clear();
    stubFichaApi();
  });

  afterEach(() => {
    vi.restoreAllMocks(); // devuelve los espías de canvas (prototype) a su estado original
    vi.unstubAllGlobals();
  });

  it('mantiene las cinco pestañas de la navegación inferior', () => {
    renderApp();

    expect(screen.getAllByRole('tab')).toHaveLength(5);
  });

  it('abre la ficha con datos del backend y vuelve a las pestañas', async () => {
    renderApp();

    fireEvent.click(screen.getByRole('button', { name: /ficha de planta/i }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Jacaranda mimosifolia' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ver en el mapa/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Volver' }));

    expect(screen.getByRole('button', { name: /ficha de planta/i })).toBeInTheDocument();
  });

  it('navega por el catálogo con las flechas Anterior y Siguiente', async () => {
    renderApp();

    fireEvent.click(screen.getByRole('button', { name: /ficha de planta/i }));
    await screen.findByRole('heading', { level: 1, name: 'Jacaranda mimosifolia' });
    expect(screen.getByText('1 / 2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Especie anterior' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Especie siguiente' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Citrus aurantium' }),
    ).toBeInTheDocument();
    expect(screen.getByText('2 / 2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Especie siguiente' })).toBeDisabled();
  });

  it('muestra un error con reintentar cuando la API no responde', async () => {
    // Falla solo la primera carga: el reintentar debe recuperar la ficha.
    vi.stubGlobal('fetch', vi.fn()
      .mockRejectedValueOnce(new TypeError('Network error'))
      .mockImplementation((input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('/species/')) {
          const id = Number(url.split('/species/')[1]?.split('?')[0] ?? '1');
          return Promise.resolve(new Response(JSON.stringify(detalleEspecie(id)), respuestaJson));
        }
        return Promise.resolve(new Response(JSON.stringify(catalogo), respuestaJson));
      }));
    renderApp();

    fireEvent.click(screen.getByRole('button', { name: /ficha de planta/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se ha podido cargar el catálogo de especies.',
    );

    // Sin fallback a datos de ejemplo: se ofrece reintentar y funciona.
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Jacaranda mimosifolia' }),
    ).toBeInTheDocument();
  });

  it('avisa cuando el catálogo está vacío en lugar de mostrar una ficha falsa', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() =>
      Promise.resolve(new Response(JSON.stringify({ total: 0, species: [] }), respuestaJson))));
    renderApp();

    fireEvent.click(screen.getByRole('button', { name: /ficha de planta/i }));

    expect(await screen.findByText('El catálogo todavía no tiene especies.')).toBeInTheDocument();
  });

  it('enlaza la foto identificada con su ficha real cuando la especie está en el catálogo', async () => {
    // Cámara + canvas simulados: jsdom no tiene webcam ni canvas 2D.
    const mockTrack = { stop: vi.fn(), applyConstraints: vi.fn() };
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [mockTrack], getVideoTracks: () => [mockTrack] }) },
      writable: true,
      configurable: true,
    });
    const canvasCtx = { drawImage: vi.fn(), fillRect: vi.fn(), fillText: vi.fn() };
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(canvasCtx as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/jpeg;base64,Zm90bw==');

    // La API responde catálogo, detalle y la identificación de Pl@ntNet.
    vi.stubGlobal('fetch', vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/plants/identify')) {
        return Promise.resolve(new Response(JSON.stringify({
          bestMatch: 'Jacaranda mimosifolia',
          remainingIdentificationRequests: 42,
          results: [{ score: 0.91, scientificName: 'Jacaranda mimosifolia', author: null,
            family: null, genus: null, commonNames: ['Jacaranda'], gbifId: null }],
        }), respuestaJson));
      }
      if (url.includes('/species/')) {
        const id = Number(url.split('/species/')[1]?.split('?')[0] ?? '1');
        return Promise.resolve(new Response(JSON.stringify(detalleEspecie(id)), respuestaJson));
      }
      return Promise.resolve(new Response(JSON.stringify(catalogo), respuestaJson));
    }));

    renderApp();

    fireEvent.click(screen.getByRole('tab', { name: 'Escanear e identificar especie con la cámara' }));
    fireEvent.click(await screen.findByRole('button', { name: /^permitir cámara$/i }));
    fireEvent.click(await screen.findByRole('button', { name: /hacer foto/i }));

    const identificar = await screen.findByRole('button', { name: 'Identificar foto' });
    fireEvent.click(identificar);

    // El panel del escaneo ofrece "Ver ficha": la especie está en el catálogo,
    // así que se abre la ficha real de la BD por encima del escaneo (que no se
    // pierde), sin navegación de catálogo pero con el chip de confianza.
    fireEvent.click(await screen.findByRole('button', { name: 'Ver ficha' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Jacaranda mimosifolia' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Identificada con 91% de confianza')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Especie anterior' })).not.toBeInTheDocument();
  });
});
