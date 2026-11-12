import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.setConfig({ testTimeout: 15000 });
import '@testing-library/jest-dom/vitest';
import { AppContext } from '../../context/state';
import type { AppState } from '../../context/state';
import { dictionaries } from '../../i18n/strings';
import type { Mode } from '../../types';
import { MapPage } from './MapPage';

/** MapPage usa useSearchParams («Ver en el mapa»): todo render lleva router. */
function renderMap(ui: React.ReactNode = <MapPage />, route = '/mapa') {
  return render(<MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>);
}

/** Estado de contexto mínimo con el modo fijado para probar reacciones al modo. */
function appStateWith(mode: Mode | null): AppState {
  return {
    mode,
    setMode: () => {},
    lang: 'es',
    setLang: () => {},
    t: (key, vars) => {
      let text = dictionaries.es[key] ?? key;
      if (vars) {
        for (const [name, value] of Object.entries(vars)) {
          text = text.replaceAll(`{${name}}`, String(value));
        }
      }
      return text;
    },
  };
}

const leaflet = vi.hoisted(() => {
  const map = {
    on: vi.fn(),
    off: vi.fn(),
    remove: vi.fn(),
    setView: vi.fn(),
    flyTo: vi.fn(),
    fitBounds: vi.fn(),
    getZoom: vi.fn(() => 15),
    getBounds: vi.fn(() => ({
      getWest: () => -0.5,
      getNorth: () => 39.6,
      getEast: () => -0.2,
      getSouth: () => 39.3,
      contains: () => true,
    })),
    getBoundsZoom: vi.fn(() => 15),
  };
  const marker = {
    addTo: vi.fn(function (this: unknown) { return this; }),
    on: vi.fn(),
    setLatLng: vi.fn(),
    bindTooltip: vi.fn(function (this: unknown) { return this; }),
    unbindTooltip: vi.fn(function (this: unknown) { return this; }),
    bindPopup: vi.fn(function (this: unknown) { return this; }),
    openPopup: vi.fn(function (this: unknown) { return this; }),
    getElement: vi.fn(() => null),
    getLatLng: vi.fn(() => ({ lat: 39.47, lng: -0.37 })),
    remove: vi.fn(),
    options: {} as Record<string, unknown>,
  };
  const layerGroup = {
    addLayer: vi.fn(function (this: unknown) { return this; }),
    addTo: vi.fn(function (this: unknown) { return this; }),
    remove: vi.fn(),
  };
  const circle = {
    addTo: vi.fn(function (this: unknown) { return this; }),
    setLatLng: vi.fn(function (this: unknown) { return this; }),
    setRadius: vi.fn(function (this: unknown) { return this; }),
    remove: vi.fn(),
    getBounds: vi.fn(() => ({ pad: () => ({}) })),
  };
  return {
    map,
    marker,
    layerGroup,
    layerGroupFactory: vi.fn(() => layerGroup),
    circle,
    mapFactory: vi.fn(() => map),
    tileLayer: vi.fn(() => ({ addTo: vi.fn() })),
    markerFactory: vi.fn(() => marker),
    circleFactory: vi.fn(() => circle),
    divIcon: vi.fn(() => ({})),
    latLngBounds: vi.fn(() => ({})),
    latLng: vi.fn((point: [number, number]) => ({ lat: point[0], lng: point[1] })),
    point: vi.fn(() => ({})),
  };
});

vi.mock('leaflet', () => ({
  default: {
    map: leaflet.mapFactory,
    tileLayer: leaflet.tileLayer,
    marker: leaflet.markerFactory,
    circle: leaflet.circleFactory,
    layerGroup: leaflet.layerGroupFactory,
    divIcon: leaflet.divIcon,
    latLngBounds: leaflet.latLngBounds,
    latLng: leaflet.latLng,
    point: leaflet.point,
  },
}));

const geo = {
  watchPosition: vi.fn(),
  clearWatch: vi.fn(),
  getCurrentPosition: vi.fn(),
};

describe('MapPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: geo });
    geo.watchPosition.mockReturnValue(7);
    vi.stubGlobal('fetch', vi.fn(async (url: string) => (
      String(url).includes('/trees')
        ? { ok: true, json: async () => ({ nextOffset: null, trees: [] }) }
        : { ok: true, json: async () => [] }
    ) as Response));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('522-1: mantiene el mapa base si el permiso de ubicación es denegado', () => {
    geo.watchPosition.mockImplementation((_success, error) => {
      error({ code: 1, message: 'Permission denied' });
      return 7;
    });

    renderMap();

    expect(leaflet.mapFactory).toHaveBeenCalledWith(expect.any(HTMLDivElement), expect.objectContaining({
      center: [39.4699, -0.3763],
      zoom: 15,
      zoomControl: false,
      attributionControl: false,
    }));
    expect(leaflet.tileLayer).toHaveBeenCalledWith(expect.stringContaining('tile.openstreetmap.org'), expect.any(Object));
    expect(leaflet.markerFactory).not.toHaveBeenCalled();
    expect(screen.getByRole('region', { name: 'Mapa' })).toBeInTheDocument();
  });

  it('519-1: muestra el mapa y libera el recurso al desmontarse', () => {
    const { unmount } = renderMap();

    expect(screen.getByRole('textbox', { name: 'Buscar sitios en el mapa' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Centrar el mapa en mi ubicación' })).toBeInTheDocument();
    expect(geo.watchPosition).toHaveBeenCalledWith(expect.any(Function), expect.any(Function), expect.objectContaining({ enableHighAccuracy: true }));

    unmount();

    expect(leaflet.map.remove).toHaveBeenCalledOnce();
    expect(geo.clearWatch).toHaveBeenCalledWith(7);
  });

  it('520-3: añade el marcador y el radio de precisión y centra el mapa en la ubicación recibida', () => {
    renderMap();
    const onPosition = geo.watchPosition.mock.calls[0][0];
    onPosition({ coords: { latitude: 39.48, longitude: -0.38, accuracy: 25 } });

    expect(leaflet.markerFactory).toHaveBeenCalledWith([39.48, -0.38], expect.objectContaining({
      keyboard: false,
      interactive: false,
      zIndexOffset: 1000,
    }));
    expect(leaflet.circleFactory).toHaveBeenCalledWith([39.48, -0.38], expect.objectContaining({ radius: 1000 }));
    expect(leaflet.map.setView).toHaveBeenCalledWith([39.48, -0.38], 16, { animate: true });
  });

  it('permite buscar un lugar y anuncia cuando no hay resultados', async () => {
    renderMap();
    fireEvent.change(screen.getByRole('textbox', { name: 'Buscar sitios en el mapa' }), { target: { value: 'Xàtiva' } });
    fireEvent.click(screen.getByRole('button', { name: 'Buscar' }));

    expect(await screen.findByRole('status')).toHaveTextContent('No se encontraron lugares con ese nombre.');
    await waitFor(() => expect(vi.mocked(fetch).mock.calls.filter(([url]) => String(url).includes('nominatim'))).toHaveLength(1));
  });

  it('908: pinta cada planta del inventario con su icono y su nombre', async () => {
    vi.mocked(fetch).mockImplementation((async (url: string) => ({
      ok: true,
      json: async () => String(url).includes('/trees')
        ? {
            nextOffset: null,
            trees: [
              { id: 1, speciesId: 5, displayName: 'Naranjo amargo', latitude: 39.47, longitude: -0.37 },
              { id: 2, speciesId: null, displayName: 'Planta sin identificar', latitude: 39.48, longitude: -0.38 },
            ],
          }
        : [],
    })) as unknown as typeof fetch);

    renderMap();

    await waitFor(() => expect(leaflet.markerFactory).toHaveBeenCalledWith([39.47, -0.37], expect.objectContaining({ title: 'Naranjo amargo', alt: 'Naranjo amargo' })));
    expect(leaflet.markerFactory).toHaveBeenCalledWith([39.48, -0.38], expect.objectContaining({ title: 'Planta sin identificar' }));
    const iconCalls = leaflet.divIcon.mock.calls as unknown as Array<[{ className: string; html?: HTMLElement }]>;
    const icons = iconCalls.map(([options]) => options).filter((o) => o.className === 'plant-icon');
    expect(icons).toHaveLength(2);
    expect(icons[0].html?.className).toBe('plant-pin');
    expect(icons[0].html?.querySelector('.plant-pin__label')?.textContent).toBe('Naranjo amargo');
    expect(icons[1].html?.className).toBe('plant-pin plant-pin--unidentified');
  });

  it('908: avisa si no se pueden cargar las plantas y mantiene el mapa', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('network'));
    renderMap();

    expect(await screen.findByRole('status')).toHaveTextContent('No se pudieron cargar las plantas del mapa.');
    expect(screen.getByRole('region', { name: 'Mapa' })).toBeInTheDocument();
  });

  it('pide permiso antes de usar la ubicación y arranca el seguimiento al concederlo', async () => {
    Object.defineProperty(navigator, 'permissions', {
      configurable: true,
      value: { query: vi.fn(async () => ({ state: 'prompt' })) },
    });
    geo.getCurrentPosition.mockImplementationOnce((success: (position: unknown) => void) => {
      success({ coords: { latitude: 39.48, longitude: -0.38, accuracy: 25 } });
    });

    renderMap();

    expect(await screen.findByRole('button', { name: 'Permitir ubicación' })).toBeInTheDocument();
    expect(geo.watchPosition).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Permitir ubicación' }));

    await waitFor(() => expect(geo.watchPosition).toHaveBeenCalled());
    delete (navigator as unknown as { permissions?: unknown }).permissions;
  });

  it('con el permiso denegado muestra el botón para reactivar la ubicación y no sigue al usuario', async () => {
    Object.defineProperty(navigator, 'permissions', {
      configurable: true,
      value: { query: vi.fn(async () => ({ state: 'denied' })) },
    });

    renderMap();

    expect(await screen.findByRole('button', { name: 'Volver a pedir la ubicación' })).toBeInTheDocument();
    expect(geo.watchPosition).not.toHaveBeenCalled();
    delete (navigator as unknown as { permissions?: unknown }).permissions;
  });

  it('muestra las plantas cercanas del backend como marcadores con distancia en el popup', async () => {
    Object.defineProperty(navigator, 'permissions', {
      configurable: true,
      value: { query: vi.fn(async () => ({ state: 'granted' })) },
    });
    // La posición la fija el hook de permisos vía getCurrentPosition.
    geo.getCurrentPosition.mockImplementationOnce((success: (position: unknown) => void) => {
      success({ coords: { latitude: 39.48, longitude: -0.38, accuracy: 25 } });
    });
    // Cada endpoint recibe su forma: cercanas con datos, paginación de globales vacía.
    vi.mocked(fetch).mockImplementation((async (url: string) => ({
      ok: true,
      json: async () => String(url).includes('/trees/nearby')
        ? {
            center: { latitude: 39.48, longitude: -0.38 },
            radius: 1000,
            returned: 1,
            limit: 100,
            language: 'es',
            trees: [{
              id: 7, speciesId: 3, scientificName: 'Celtis australis', commonName: 'Almez',
              displayName: 'Almez', latitude: 39.4795, longitude: -0.3795, distance: 250,
            }],
          }
        : String(url).includes('/trees')
          ? { nextOffset: null, trees: [] }
          : [],
    })) as unknown as typeof fetch);

    renderMap();
    await waitFor(() => expect(geo.watchPosition).toHaveBeenCalled());
    const onPosition = geo.watchPosition.mock.calls[0][0];
    await act(async () => {
      onPosition({ coords: { latitude: 39.48, longitude: -0.38, accuracy: 25 } });
    });

    expect(await screen.findByText('Almez')).toBeInTheDocument();
    expect(screen.getByText('250 m')).toBeInTheDocument();
    expect(leaflet.layerGroupFactory).toHaveBeenCalled();
    expect(leaflet.layerGroup.addTo).toHaveBeenCalledWith(leaflet.map);
    // El marcador de planta es interactivo (tiene popup), a diferencia del de usuario.
    expect(leaflet.markerFactory).toHaveBeenCalledWith([39.4795, -0.3795], expect.objectContaining({
      title: 'Almez',
    }));
    delete (navigator as unknown as { permissions?: unknown }).permissions;
  });

  it('agrupa las plantas cercanas del mismo tipo y abre su ficha sin mover el mapa', async () => {
    Object.defineProperty(navigator, 'permissions', {
      configurable: true,
      value: { query: vi.fn(async () => ({ state: 'granted' })) },
    });
    // La posición la fija el hook de permisos vía getCurrentPosition.
    geo.getCurrentPosition.mockImplementationOnce((success: (position: unknown) => void) => {
      success({ coords: { latitude: 39.48, longitude: -0.38, accuracy: 25 } });
    });
    // Cada endpoint recibe su forma: cercanas con dos Plátanos de sombra
    // vecinos (misma fila), paginación de globales vacía.
    vi.mocked(fetch).mockImplementation((async (url: string) => ({
      ok: true,
      json: async () => String(url).includes('/trees/nearby')
        ? {
            center: { latitude: 39.48, longitude: -0.38 },
            radius: 1000,
            returned: 2,
            limit: 100,
            language: 'es',
            trees: [
              {
                id: 7, speciesId: 3, scientificName: 'Platanus hispanica', commonName: 'Plátano de sombra',
                displayName: 'Plátano de sombra', latitude: 39.4795, longitude: -0.3795, distance: 250,
              },
              {
                id: 8, speciesId: 3, scientificName: 'Platanus hispanica', commonName: 'Plátano de sombra',
                displayName: 'Plátano de sombra', latitude: 39.4798, longitude: -0.3795, distance: 280,
              },
            ],
          }
        : String(url).includes('/trees')
          ? { nextOffset: null, trees: [] }
          : [],
    })) as unknown as typeof fetch);

    const onOpenPlant = vi.fn();
    renderMap(<MapPage onOpenPlant={onOpenPlant} />);
    await waitFor(() => expect(geo.watchPosition).toHaveBeenCalled());
    const onPosition = geo.watchPosition.mock.calls[0][0];
    await act(async () => {
      onPosition({ coords: { latitude: 39.48, longitude: -0.38, accuracy: 25 } });
    });

    // Un solo marcador de planta con la pastilla de recuento (2 ejemplares).
    await waitFor(() => expect(leaflet.markerFactory).toHaveBeenCalled());
    const iconCalls = leaflet.divIcon.mock.calls as unknown as Array<[{ className: string; html?: HTMLElement }]>;
    const plantIcons = iconCalls.map(([options]) => options).filter((o) => o.className === 'plant-icon');
    expect(plantIcons).toHaveLength(1);
    expect(plantIcons[0].html?.querySelector('.plant-pin__count')?.textContent).toBe('2');

    // Al tocar el grupo se pinta su área y se abre la ficha de su especie; el
    // mapa no se mueve (PA 691: al volver conserva centro y zoom).
    leaflet.map.setView.mockClear();
    leaflet.map.flyTo.mockClear();
    const onClick = leaflet.marker.on.mock.calls.find(([event]) => event === 'click')?.[1] as () => void;
    onClick();
    const areaCall = (leaflet.circleFactory.mock.calls as unknown as Array<[unknown, { className?: string }]>)
      .find(([, options]) => options.className === 'plant-group-area');
    expect(areaCall).toBeDefined();
    expect(leaflet.map.fitBounds).not.toHaveBeenCalled();
    expect(leaflet.map.setView).not.toHaveBeenCalled();
    expect(leaflet.map.flyTo).not.toHaveBeenCalled();
    expect(onOpenPlant).toHaveBeenCalledWith(expect.objectContaining({
      speciesId: 3,
      count: 2,
      displayName: 'Plátano de sombra',
    }));
    delete (navigator as unknown as { permissions?: unknown }).permissions;
  });

  it('PA 690: tocar una planta abre su ficha con los datos de ese punto', async () => {
    Object.defineProperty(navigator, 'permissions', {
      configurable: true,
      value: { query: vi.fn(async () => ({ state: 'granted' })) },
    });
    geo.getCurrentPosition.mockImplementationOnce((success: (position: unknown) => void) => {
      success({ coords: { latitude: 39.48, longitude: -0.38, accuracy: 25 } });
    });
    vi.mocked(fetch).mockImplementation((async (url: string) => ({
      ok: true,
      json: async () => String(url).includes('/trees/nearby')
        ? {
            center: { latitude: 39.48, longitude: -0.38 },
            radius: 1000,
            returned: 1,
            limit: 100,
            language: 'es',
            trees: [{
              id: 7, speciesId: 3, scientificName: 'Celtis australis', commonName: 'Almez',
              displayName: 'Almez', latitude: 39.4795, longitude: -0.3795, distance: 250,
            }],
          }
        : { nextOffset: null, trees: [] },
    })) as unknown as typeof fetch);

    const onOpenPlant = vi.fn();
    renderMap(<MapPage onOpenPlant={onOpenPlant} />);
    await waitFor(() => expect(geo.watchPosition).toHaveBeenCalled());
    const onPosition = geo.watchPosition.mock.calls[0][0];
    await act(async () => {
      onPosition({ coords: { latitude: 39.48, longitude: -0.38, accuracy: 25 } });
    });

    await waitFor(() => expect(leaflet.markerFactory).toHaveBeenCalledWith([39.4795, -0.3795], expect.objectContaining({ title: 'Almez' })));
    leaflet.map.setView.mockClear();
    leaflet.map.flyTo.mockClear();
    const onClick = leaflet.marker.on.mock.calls.find(([event]) => event === 'click')?.[1] as () => void;
    onClick();

    expect(onOpenPlant).toHaveBeenCalledWith(expect.objectContaining({
      id: 7,
      speciesId: 3,
      displayName: 'Almez',
      latitude: 39.4795,
      longitude: -0.3795,
    }));
    // Abrir la ficha no cambia la vista: al volver se conservan centro y zoom.
    expect(leaflet.map.setView).not.toHaveBeenCalled();
    expect(leaflet.map.flyTo).not.toHaveBeenCalled();
    expect(leaflet.map.fitBounds).not.toHaveBeenCalled();
    delete (navigator as unknown as { permissions?: unknown }).permissions;
  });

  it('el área azul de búsqueda sigue al radio del modo (deslizador y aventura fija)', async () => {
    Object.defineProperty(navigator, 'permissions', {
      configurable: true,
      value: { query: vi.fn(async () => ({ state: 'granted' })) },
    });
    geo.getCurrentPosition.mockImplementationOnce((success: (position: unknown) => void) => {
      success({ coords: { latitude: 39.48, longitude: -0.38, accuracy: 25 } });
    });
    localStorage.setItem('naturemaps:radius', '5000');

    const esencial = appStateWith('esencial');
    const aventura = appStateWith('aventura');
    const view = renderMap(
      <AppContext.Provider value={esencial}>
        <MapPage />
      </AppContext.Provider>,
    );

    // El círculo se crea al conocer la posición, con el radio del deslizador.
    await waitFor(() => expect(geo.watchPosition).toHaveBeenCalled());
    const onPosition = geo.watchPosition.mock.calls[0][0];
    await act(async () => {
      onPosition({ coords: { latitude: 39.48, longitude: -0.38, accuracy: 25 } });
    });
    expect(leaflet.circleFactory).toHaveBeenCalledWith([39.48, -0.38], expect.objectContaining({ radius: 5000 }));

    // Al pasar a aventura el área pasa al radio fijo y vuelve al salir del modo.
    view.rerender(
      <MemoryRouter initialEntries={['/mapa']}>
        <AppContext.Provider value={aventura}>
          <MapPage />
        </AppContext.Provider>
      </MemoryRouter>,
    );
    expect(leaflet.circleFactory).toHaveBeenCalledWith([39.48, -0.38], expect.objectContaining({ radius: 5000 }));
    view.rerender(
      <MemoryRouter initialEntries={['/mapa']}>
        <AppContext.Provider value={esencial}>
          <MapPage />
        </AppContext.Provider>
      </MemoryRouter>,
    );
    expect(leaflet.circleFactory).toHaveBeenCalled();

    localStorage.removeItem('naturemaps:radius');
    delete (navigator as unknown as { permissions?: unknown }).permissions;
  });

  it('«Ver en el mapa»: centra el ejemplar más cercano de la especie y pinta su área', async () => {
    Object.defineProperty(navigator, 'permissions', {
      configurable: true,
      value: { query: vi.fn(async () => ({ state: 'granted' })) },
    });
    geo.getCurrentPosition.mockImplementationOnce((success: (position: unknown) => void) => {
      success({ coords: { latitude: 39.48, longitude: -0.38, accuracy: 25 } });
    });
    // Dos Plátanos de sombra (specie 3) vecinos —el más cercano NO es el primero
    // del grupo— y una Morera (specie 4) que no debe recibir el foco.
    vi.mocked(fetch).mockImplementation((async (url: string) => ({
      ok: true,
      json: async () => String(url).includes('/trees/nearby')
        ? {
            center: { latitude: 39.48, longitude: -0.38 },
            radius: 1000,
            returned: 3,
            limit: 100,
            language: 'es',
            trees: [
              {
                id: 7, speciesId: 3, scientificName: 'Platanus hispanica', commonName: 'Plátano de sombra',
                displayName: 'Plátano de sombra', latitude: 39.4795, longitude: -0.3795, distance: 300,
              },
              {
                id: 8, speciesId: 3, scientificName: 'Platanus hispanica', commonName: 'Plátano de sombra',
                displayName: 'Plátano de sombra', latitude: 39.4797, longitude: -0.3795, distance: 150,
              },
              {
                id: 9, speciesId: 4, scientificName: 'Morus nigra', commonName: 'Morera',
                displayName: 'Morera', latitude: 39.4801, longitude: -0.3801, distance: 50,
              },
            ],
          }
        : { nextOffset: null, trees: [] },
    })) as unknown as typeof fetch);

    renderMap(<MapPage />, '/mapa?verEspecie=3');

    // El área pintada cubre al grupo (no el círculo mínimo) y el mapa encuadra.
    await waitFor(() => expect(leaflet.map.fitBounds).toHaveBeenCalled());
    const areaCall = (leaflet.circleFactory.mock.calls as unknown as Array<[unknown, { className?: string }]>)
      .find(([, options]) => options.className === 'plant-group-area');
    expect(areaCall).toBeDefined();
    expect(leaflet.circle.setRadius).not.toHaveBeenCalledWith(30);
    delete (navigator as unknown as { permissions?: unknown }).permissions;
  });

  it('«Ver en el mapa»: avisa si la especie no tiene ejemplares en el área', async () => {
    Object.defineProperty(navigator, 'permissions', {
      configurable: true,
      value: { query: vi.fn(async () => ({ state: 'granted' })) },
    });
    geo.getCurrentPosition.mockImplementationOnce((success: (position: unknown) => void) => {
      success({ coords: { latitude: 39.48, longitude: -0.38, accuracy: 25 } });
    });
    vi.mocked(fetch).mockImplementation((async (url: string) => ({
      ok: true,
      json: async () => String(url).includes('/trees/nearby')
        ? {
            center: { latitude: 39.48, longitude: -0.38 },
            radius: 1000,
            returned: 1,
            limit: 100,
            language: 'es',
            trees: [{
              id: 9, speciesId: 4, scientificName: 'Morus nigra', commonName: 'Morera',
              displayName: 'Morera', latitude: 39.4801, longitude: -0.3801, distance: 50,
            }],
          }
        : { nextOffset: null, trees: [] },
    })) as unknown as typeof fetch);

    renderMap(<MapPage />, '/mapa?verEspecie=3');

    await waitFor(() => expect(geo.watchPosition).toHaveBeenCalled());
    const onPosition = geo.watchPosition.mock.calls[0][0];
    await act(async () => {
      onPosition({ coords: { latitude: 39.48, longitude: -0.38, accuracy: 25 } });
      for (let i = 0; i < 10; i++) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    });

    // No se pinta área para una especie sin ejemplares en el área.
    expect(leaflet.circleFactory).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ className: 'plant-group-area' }),
    );
    delete (navigator as unknown as { permissions?: unknown }).permissions;
  });

  it('al tocar el mapa se contrae la ventana de explorar', () => {
    renderMap();
    const exploreBtn = screen.getByRole('button', { name: /explorar/i });
    expect(exploreBtn).toHaveAttribute('aria-expanded', 'false');

    // Abre la ventana de explorar
    fireEvent.click(exploreBtn);
    expect(exploreBtn).toHaveAttribute('aria-expanded', 'true');

    // Tocar el mapa contrae la ventana
    const mapClickHandler = leaflet.map.on.mock.calls.find(([event]) => event === 'click')?.[1] as (() => void) | undefined;
    expect(mapClickHandler).toBeDefined();
    act(() => {
      mapClickHandler?.();
    });
    expect(exploreBtn).toHaveAttribute('aria-expanded', 'false');
  });
});
