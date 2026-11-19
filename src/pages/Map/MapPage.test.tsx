import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

vi.setConfig({ testTimeout: 15000 });
import '@testing-library/jest-dom/vitest';
import { AppContext } from '../../context/state';
import type { AppState } from '../../context/state';
import { dictionaries } from '../../i18n/strings';
import type { Mode } from '../../types';
import { clearPaintedRoute, MapPage } from './MapPage';

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
  const line = {
    addTo: vi.fn(function (this: unknown) { return this; }),
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
    polylineFactory: vi.fn(() => line),
    divIcon: vi.fn(() => ({})),
    latLngBounds: vi.fn(() => ({ pad: () => ({}) })),
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
    circleMarker: vi.fn(() => ({ addTo: vi.fn(() => ({})), on: vi.fn(), bindTooltip: vi.fn() })),
    layerGroup: leaflet.layerGroupFactory,
    polyline: leaflet.polylineFactory,
    divIcon: leaflet.divIcon,
    latLngBounds: leaflet.latLngBounds,
    latLng: leaflet.latLng,
    point: leaflet.point,
    canvas: vi.fn(() => ({})),
  },
}));

// La capa de zonas verdes (NM-08) tiene su propia suite; aquí solo se comprueba
// cuándo la enciende, apaga y resalta el mapa.
const greenAreas = vi.hoisted(() => {
  const layer = { select: vi.fn(), fit: vi.fn(() => true), remove: vi.fn() };
  return {
    layer,
    add: vi.fn((..._args: unknown[]) => layer),
    fetch: vi.fn(async () => [{
      id: 1,
      groupSlug: 'jardin-de-las-hesperides',
      groupName: 'Jardín de las Hespérides',
      center: { latitude: 39.4775, longitude: -0.3882 },
      bbox: [-0.389, 39.477, -0.387, 39.478],
      featured: true,
      plants: 69,
    }]),
  };
});
vi.mock('./greenAreasLayer', () => ({ addGreenAreasLayer: greenAreas.add }));
// La descarga de zonas (NM-08) tiene su propia suite; aquí solo se comprueba
// cuándo se ofrece sobre el mapa y con qué datos.
vi.mock('../../components/OfflineZone', () => ({
  OfflineZoneCard: (props: { groupSlug: string; bbox: number[]; plantCount?: number; onSaved?: (record: { name: string }) => void; onClose?: () => void }) => (
    <div>
      <button type="button" data-bbox={props.bbox.join(',')} data-plants={props.plantCount} onClick={() => props.onSaved?.({ name: 'Jardín de las Hespérides' })}>Descargar zona {props.groupSlug}</button>
      <button type="button" onClick={props.onClose}>Cerrar descarga</button>
    </div>
  ),
  OfflineSavedToast: (props: { name: string; onClose: () => void }) => (
    <div role="status">Descargado {props.name}<button type="button" onClick={props.onClose}>Cerrar aviso</button></div>
  ),
}));
// Solo la capa de zonas se simula; las plantas de un parque salen del fetch del test.
vi.mock('../../services/greenAreas', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../services/greenAreas')>()),
  fetchGreenAreas: greenAreas.fetch,
}));

const geo = {
  watchPosition: vi.fn(),
  clearWatch: vi.fn(),
  getCurrentPosition: vi.fn(),
};

describe('MapPage', () => {
  beforeEach(() => {
    clearPaintedRoute();
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

  it('el círculo de carga va por el perímetro, está bajo el buscador y se retira al terminar', async () => {
    let releaseSecond: (() => void) | undefined;
    const gate = new Promise<void>((resolve) => { releaseSecond = resolve; });
    Object.defineProperty(navigator, 'permissions', {
      configurable: true,
      value: { query: vi.fn(async () => ({ state: 'granted' })) },
    });
    geo.getCurrentPosition.mockImplementationOnce((success: (position: unknown) => void) => {
      success({ coords: { latitude: 39.48, longitude: -0.38, accuracy: 25 } });
    });
    vi.mocked(fetch).mockImplementation((async (url: string) => {
      const requestUrl = new URL(String(url));
      if (requestUrl.pathname.includes('/trees/nearby')) {
        const offset = Number(requestUrl.searchParams.get('offset') ?? 0);
        if (offset === 1) await gate;
        return {
          ok: true,
          json: async () => ({
            center: { latitude: 39.48, longitude: -0.38 }, radius: 1000,
            returned: offset < 2 ? 1 : 0, total: 2, limit: 20000, language: 'es',
            trees: offset < 2 ? [{
              id: offset + 1, speciesId: 3, displayName: 'Almez', latitude: 39.4795,
              longitude: -0.3795, distance: offset * 10,
            }] : [],
          }),
        };
      }
      return { ok: true, json: async () => ({ nextOffset: null, trees: [] }) };
    }) as unknown as typeof fetch);

    const { unmount } = renderMap();
    const circle = await screen.findByRole('button', { name: /Cargando plantas/ });
    // Bajo la barra de búsqueda (top-20), no encima (top-4).
    expect(circle.parentElement).toHaveClass('top-20');
    // El perímetro se dibuja con strokeDashoffset sobre un circle.
    const ring = circle.querySelector('circle[stroke="var(--color-accent)"]');
    expect(ring?.getAttribute('stroke-dashoffset')).not.toBe(ring?.getAttribute('stroke-dasharray'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument(); // no bloquea

    // La tarjeta se retira a los 3 s mientras la segunda página sigue pendiente.
    await waitFor(() => expect(screen.queryByText(/Cargando plantas/)).not.toBeInTheDocument(), { timeout: 5000 });
    expect(circle).toBeInTheDocument();
    // Solo un clic del usuario la reabre (la espera de la 2ª página no la toca).
    fireEvent.click(circle);
    expect(screen.getByText(/Cargando plantas/)).toHaveClass('plant-progress-card--entering');

    // Al terminar la carga desaparecen círculo y tarjeta.
    releaseSecond?.();
    await waitFor(() => expect(vi.mocked(fetch).mock.calls
      .map((call) => new URL(String(call[0])))
      .filter((url) => url.searchParams.get('limit') === '20000')).toHaveLength(2));
    await waitFor(() => expect(screen.queryByRole('button', { name: /Cargando plantas/ })).not.toBeInTheDocument(), { timeout: 5000 });
    unmount();
    delete (navigator as unknown as { permissions?: unknown }).permissions;
  });

  it('«Ver en el mapa»: pinta los ejemplares de la especie y encuadra el mapa', async () => {
    // El effects actual pide la ficha y las ubicaciones al backend (no usa las
    // plantas cercanas), así que se simulan esas dos respuestas.
    const speciesDetail = {
      id: 3, scientificName: 'Platanus hispanica',
      names: [{ name: 'Plátano de sombra', language: 'es' }],
      profile: null, enrichment: null, image: null,
      locations: {
        total: 2, returned: 2, nextAfterId: null,
        items: [
          { id: 7, latitude: 39.4795, longitude: -0.3795, district: 'Ciutat Vella', neighborhood: null, source: 'VALENCIA_ARBOLADO', sourceUrl: null },
          { id: 8, latitude: 39.4797, longitude: -0.3795, district: 'Ciutat Vella', neighborhood: null, source: 'VALENCIA_ARBOLADO', sourceUrl: null },
        ],
      },
    };
    vi.mocked(fetch).mockImplementation((async (url: string) => ({
      ok: true,
      json: async () => String(url).includes('/species/3')
        ? speciesDetail
        : { nextOffset: null, trees: [] },
    })) as unknown as typeof fetch);

    renderMap(<MapPage />, '/mapa?verEspecie=3');

    // Se pintan los ejemplares y el mapa encuadra su extensión.
    await waitFor(() => expect(leaflet.map.fitBounds).toHaveBeenCalled());
    expect(leaflet.latLngBounds).toHaveBeenCalledWith([[39.4795, -0.3795], [39.4797, -0.3795]]);
    expect(await screen.findByText(/Plátano de sombra/)).toBeInTheDocument();
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

  it('«Ver en el mapa» desde una ruta: pinta el recorrido y «Limpiar mapa» lo quita', async () => {
    const route = {
      id: 7,
      name: 'Historia bajo los árboles',
      theme: 'mixta',
      shape: 'circular',
      lengthCategory: 'corta',
      distanceMeters: 2280,
      durationSeconds: 1980,
      start: { latitude: 39.4699, longitude: -0.3763 },
      description: 'Plantas y patrimonio alternados.',
      stopsCount: 2,
      stops: [
        { kind: 'planta', id: 11, name: 'Naranjo', latitude: 39.4705, longitude: -0.3755, speciesId: 3 },
        { kind: 'poi', id: 22, name: 'Torre', latitude: 39.4706, longitude: -0.3754, speciesId: null },
      ],
      path: [
        { latitude: 39.4699, longitude: -0.3763 },
        { latitude: 39.4705, longitude: -0.3755 },
        { latitude: 39.4699, longitude: -0.3763 },
      ],
    };
    vi.stubGlobal('fetch', vi.fn(async (url: string) => (
      String(url).includes('/routes/7')
        ? { ok: true, json: async () => route }
        : { ok: true, json: async () => ({ nextOffset: null, trees: [] }) }
    )) as unknown as typeof fetch);

    renderMap(<MapPage />, '/mapa?verRuta=7');

    // El recorrido se pinta como polilínea y el mapa se encuadra en él.
    await waitFor(() => expect(leaflet.polylineFactory).toHaveBeenCalled());
    expect(leaflet.polylineFactory).toHaveBeenCalledWith(
      route.path.map((point) => [point.latitude, point.longitude]),
      expect.anything(),
    );
    expect(leaflet.map.fitBounds).toHaveBeenCalled();
    // Inicio, parada de planta y parada de POI de la ruta.
    expect(leaflet.markerFactory).toHaveBeenCalledTimes(3);

    // Un dato de GPS posterior no debe arrancar el mapa hacia el usuario.
    leaflet.map.setView.mockClear();
    const onPosition = geo.watchPosition.mock.calls[0]?.[0] as ((p: unknown) => void) | undefined;
    act(() => onPosition?.({ coords: { latitude: 39.48, longitude: -0.38, accuracy: 25 } }));
    expect(leaflet.map.setView).not.toHaveBeenCalled();

    // «Limpiar mapa» aparece como botón de solo icono y quita la capa.
    const clear = await screen.findByRole('button', { name: 'Limpiar mapa' });
    expect(clear.querySelector('svg')).toBeInTheDocument();
    expect(clear.textContent).toBe('');
    await userEvent.click(clear);

    await waitFor(() => expect(leaflet.layerGroup.remove).toHaveBeenCalled());
    expect(screen.queryByRole('button', { name: 'Limpiar mapa' })).not.toBeInTheDocument();
  });

  it('la ruta sigue pintada al salir del mapa y volver a entrar', async () => {
    const route = {
      id: 9, name: 'Ruta persistente', theme: 'mixta', shape: 'circular', lengthCategory: 'corta',
      distanceMeters: 2100, durationSeconds: 1700,
      start: { latitude: 39.4699, longitude: -0.3763 },
      description: 'Para comprobar que no se pierde al cambiar de pestaña.',
      stopsCount: 1,
      stops: [{ kind: 'planta', id: 11, name: 'Naranjo', latitude: 39.4705, longitude: -0.3755, speciesId: 3 }],
      path: [
        { latitude: 39.4699, longitude: -0.3763 },
        { latitude: 39.4705, longitude: -0.3755 },
        { latitude: 39.4699, longitude: -0.3763 },
      ],
    };
    vi.mocked(fetch).mockImplementation((async (url: string) => ({
      ok: true,
      json: async () => String(url).includes('/routes/9')
        ? route
        : String(url).includes('/trees')
          ? { nextOffset: null, trees: [] }
          : [],
    })) as unknown as typeof fetch);

    const first = renderMap(<MapPage />, '/mapa?verRuta=9');
    expect(await screen.findByRole('button', { name: 'Limpiar mapa' })).toBeInTheDocument();
    first.unmount();

    // Sin el parámetro, al volver al mapa se recupera la última ruta pintada.
    renderMap(<MapPage />, '/mapa');
    expect(await screen.findByRole('button', { name: 'Limpiar mapa' })).toBeInTheDocument();
    expect(leaflet.polylineFactory).toHaveBeenCalled();
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

  it('fuera de València, sin ejemplares cerca, el mapa conserva las plantas del inventario', async () => {
    Object.defineProperty(navigator, 'permissions', {
      configurable: true,
      value: { query: vi.fn(async () => ({ state: 'granted' })) },
    });
    // Posición fuera del término municipal: el inventario no cubre esa zona.
    geo.getCurrentPosition.mockImplementationOnce((success: (position: unknown) => void) => {
      success({ coords: { latitude: 39.4372, longitude: -0.4653, accuracy: 25 } });
    });
    // Cercanas no devuelve nada; las globales sí.
    vi.mocked(fetch).mockImplementation((async (url: string) => ({
      ok: true,
      json: async () => String(url).includes('/trees/nearby')
        ? { center: { latitude: 39.4372, longitude: -0.4653 }, radius: 1000, returned: 0, limit: 100, language: 'es', trees: [] }
        : String(url).includes('/trees')
          ? { nextOffset: null, trees: [{ id: 1, speciesId: 5, displayName: 'Naranjo amargo', latitude: 39.47, longitude: -0.37 }] }
          : [],
    })) as unknown as typeof fetch);

    renderMap();
    await waitFor(() => expect(geo.watchPosition).toHaveBeenCalled());
    act(() => {
      (geo.watchPosition.mock.calls[0][0] as (position: unknown) => void)({
        coords: { latitude: 39.4372, longitude: -0.4653, accuracy: 25 },
      });
    });

    // Los pines del inventario siguen pintándose pese a la respuesta vacía.
    await waitFor(() => expect(leaflet.markerFactory).toHaveBeenCalledWith(
      [39.47, -0.37], expect.objectContaining({ title: 'Naranjo amargo' })));
    delete (navigator as unknown as { permissions?: unknown }).permissions;
  });

  it('al moverse a una zona con ejemplares se vuelve a las plantas cercanas', async () => {
    Object.defineProperty(navigator, 'permissions', {
      configurable: true,
      value: { query: vi.fn(async () => ({ state: 'granted' })) },
    });
    geo.getCurrentPosition.mockImplementationOnce((success: (position: unknown) => void) => {
      success({ coords: { latitude: 39.4372, longitude: -0.4653, accuracy: 25 } });
    });
    let nearbyTrees: unknown[] = [];
    vi.mocked(fetch).mockImplementation((async (url: string) => ({
      ok: true,
      json: async () => String(url).includes('/trees/nearby')
        ? { center: { latitude: 39.47, longitude: -0.37 }, radius: 1000, returned: nearbyTrees.length, limit: 100, language: 'es', trees: nearbyTrees }
        : String(url).includes('/trees')
          ? { nextOffset: null, trees: [] }
          : [],
    })) as unknown as typeof fetch);

    renderMap();
    await waitFor(() => expect(geo.watchPosition).toHaveBeenCalled());
    const onPosition = geo.watchPosition.mock.calls[0][0] as (position: unknown) => void;
    act(() => onPosition({ coords: { latitude: 39.4372, longitude: -0.4653, accuracy: 25 } }));

    // Entra en cobertura: una respuesta vacía previa no bloquea la siguiente.
    nearbyTrees = [{
      id: 9, speciesId: 3, scientificName: 'Celtis australis', displayName: 'Almez',
      latitude: 39.4795, longitude: -0.3795, distance: 120,
    }];
    act(() => onPosition({ coords: { latitude: 39.48, longitude: -0.38, accuracy: 25 } }));
    await waitFor(() => expect(leaflet.markerFactory).toHaveBeenCalledWith(
      [39.4795, -0.3795], expect.objectContaining({ title: 'Almez' })));
    delete (navigator as unknown as { permissions?: unknown }).permissions;
  });

  it('agrupa en un marcador las plantas que están dentro de un parque', async () => {
    vi.mocked(fetch).mockImplementation((async (url: string) => ({
      ok: true,
      json: async () => String(url).includes('/trees')
        ? {
            nextOffset: null,
            trees: [
              { id: 1, speciesId: 5, displayName: 'Cidro', latitude: 39.4775, longitude: -0.3882, greenAreaId: 1 },
              { id: 2, speciesId: 6, displayName: 'Limonero', latitude: 39.4776, longitude: -0.3883, greenAreaId: 1 },
              { id: 3, speciesId: 7, displayName: 'Jacaranda', latitude: 39.47, longitude: -0.37, greenAreaId: null },
            ],
          }
        : [],
    })) as unknown as typeof fetch);

    renderMap();

    // Un solo marcador para las dos plantas del jardín, con su recuento real,
    // y la planta de calle sigue teniendo el suyo.
    await waitFor(() => expect(leaflet.markerFactory).toHaveBeenCalledWith(
      [39.4775, -0.3882], expect.objectContaining({ title: 'Jardín de las Hespérides: 69 ejemplares' })));
    expect(leaflet.markerFactory).toHaveBeenCalledWith([39.47, -0.37], expect.objectContaining({ title: 'Jacaranda' }));
    expect(leaflet.markerFactory).not.toHaveBeenCalledWith([39.4776, -0.3883], expect.anything());
  });

  it('al acercarse al parque se ven sus plantas una a una', async () => {
    vi.mocked(fetch).mockImplementation((async (url: string) => ({
      ok: true,
      json: async () => String(url).includes('/trees')
        ? {
            nextOffset: null,
            trees: [{ id: 1, speciesId: 5, displayName: 'Cidro', latitude: 39.4775, longitude: -0.3882, greenAreaId: 1 }],
          }
        : [],
    })) as unknown as typeof fetch);

    renderMap();
    await waitFor(() => expect(leaflet.markerFactory).toHaveBeenCalledWith(
      [39.4775, -0.3882], expect.objectContaining({ title: 'Jardín de las Hespérides: 69 ejemplares' })));

    leaflet.map.getZoom.mockReturnValue(18);
    const zoomHandlers = leaflet.map.on.mock.calls.filter(([event]) => event === 'zoomend');
    act(() => {
      for (const [, handler] of zoomHandlers) (handler as () => void)();
    });

    await waitFor(() => expect(leaflet.markerFactory).toHaveBeenCalledWith(
      [39.4775, -0.3882], expect.objectContaining({ title: 'Cidro' })));
    leaflet.map.getZoom.mockReturnValue(15);
  });

  it('PA 3011: la capa de zonas verdes está apagada por defecto y se enciende y apaga con su botón', async () => {
    geo.getCurrentPosition.mockImplementation(() => {});
    renderMap();
    const toggle = screen.getByRole('button', { name: 'Mostrar parques' });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    // Las zonas se piden al abrir el mapa (hacen falta para agrupar por
    // parque), pero la capa no se dibuja hasta encender el interruptor.
    expect(greenAreas.add).not.toHaveBeenCalled();

    fireEvent.click(toggle);
    await waitFor(() => expect(greenAreas.add).toHaveBeenCalledTimes(1));
    expect(greenAreas.add.mock.calls[0]![0]).toBe(leaflet.map);
    const pressed = screen.getByRole('button', { name: 'Ocultar parques' });
    expect(pressed).toHaveAttribute('aria-pressed', 'true');
    // Sin parque elegido no se resalta ni se mueve el mapa.
    expect(greenAreas.layer.select).toHaveBeenLastCalledWith(null);
    expect(greenAreas.layer.fit).not.toHaveBeenCalled();

    fireEvent.click(pressed);
    await waitFor(() => expect(greenAreas.layer.remove).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('button', { name: 'Mostrar parques' })).toBeInTheDocument();
  });

  it('descarga offline: con una zona resaltada se ofrece descargarla desde el mapa', async () => {
    renderMap(<MapPage />, '/mapa?zona=jardin-de-las-hesperides');
    const button = await screen.findByRole('button', { name: 'Descargar zona jardin-de-las-hesperides' });
    expect(button).toHaveAttribute('data-bbox', '-0.389,39.477,-0.387,39.478');
    expect(button).toHaveAttribute('data-plants', '69');
  });

  it('descarga offline: sin zona resaltada no se ofrece ninguna descarga', async () => {
    renderMap(<MapPage />, '/mapa');
    await waitFor(() => expect(greenAreas.fetch).toHaveBeenCalled());
    expect(screen.queryByRole('button', { name: /Descargar zona/ })).not.toBeInTheDocument();
  });

  it('PA 3011: ?zona= enciende la capa sola, resalta ese parque y encuadra el mapa en él', async () => {
    geo.getCurrentPosition.mockImplementation(() => {});
    renderMap(<MapPage />, '/mapa?zona=jardin-de-las-hesperides');
    await waitFor(() => expect(greenAreas.layer.select).toHaveBeenCalledWith('jardin-de-las-hesperides'));
    expect(greenAreas.layer.fit).toHaveBeenCalledWith('jardin-de-las-hesperides');
    const pressed = screen.getByRole('button', { name: 'Ocultar parques' });
    // Apagar la capa quita el resaltado del parque.
    fireEvent.click(pressed);
    await waitFor(() => expect(greenAreas.layer.remove).toHaveBeenCalled());
    expect(screen.getByRole('button', { name: 'Mostrar parques' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('al volver a encender la capa se vuelve a resaltar el parque que había elegido', async () => {
    geo.getCurrentPosition.mockImplementation(() => {});
    renderMap(<MapPage />, '/mapa?zona=jardin-de-las-hesperides');
    await waitFor(() => expect(greenAreas.layer.select).toHaveBeenCalledWith('jardin-de-las-hesperides'));
    fireEvent.click(screen.getByRole('button', { name: 'Ocultar parques' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Mostrar parques' })).toHaveAttribute('aria-pressed', 'false'));
    greenAreas.layer.select.mockClear();
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar parques' }));
    await waitFor(() => expect(greenAreas.layer.select).toHaveBeenCalledWith('jardin-de-las-hesperides'));
    expect(screen.getByRole('button', { name: 'Ocultar parques' })).toHaveAttribute('aria-pressed', 'true');
  });

  const zonePlantsResponse = (plants: Array<{ id: number; speciesId: number | null; displayName: string; latitude: number; longitude: number }>) =>
    (async (url: string) => ({
      ok: true,
      json: async () => String(url).includes('/plants')
        ? { groupSlug: 'jardin-de-las-hesperides', total: plants.length, returned: plants.length, nextOffset: null, plants: plants.map((plant) => ({ greenAreaId: 1, scientificName: null, commonName: null, ...plant })) }
        : { nextOffset: null, trees: [] },
    })) as unknown as typeof fetch;

  it('especie dentro de un parque: solo se ven los ejemplares de esa especie en el parque y se encuadran', async () => {
    geo.getCurrentPosition.mockImplementation(() => {});
    vi.mocked(fetch).mockImplementation(zonePlantsResponse([
      { id: 1, speciesId: 5, displayName: 'Palmera datilera', latitude: 39.4771, longitude: -0.3881 },
      { id: 2, speciesId: 5, displayName: 'Palmera datilera', latitude: 39.4774, longitude: -0.3885 },
      { id: 3, speciesId: 8, displayName: 'Tamarisco', latitude: 39.4776, longitude: -0.3884 },
    ]));
    leaflet.map.fitBounds.mockClear();
    renderMap(<MapPage />, '/mapa?zona=jardin-de-las-hesperides&verEspecie=5');
    expect(await screen.findByText('Palmera datilera: 2 en este parque')).toBeInTheDocument();
    expect(String(vi.mocked(fetch).mock.calls.map((call) => call[0]).find((url) => String(url).includes('/plants')))).toContain('/green-areas/group/jardin-de-las-hesperides/plants');
    await waitFor(() => expect(leaflet.latLngBounds).toHaveBeenCalledWith([[39.4771, -0.3881], [39.4774, -0.3885]]));
    expect(leaflet.map.fitBounds).toHaveBeenCalled();
    // Con el filtro activo no se ofrece la descarga: el mapa queda limpio.
    expect(screen.queryByRole('button', { name: /Descargar zona/ })).not.toBeInTheDocument();
    // Quitar el filtro devuelve la tarjeta y el mapa normal del parque.
    fireEvent.click(screen.getByRole('button', { name: 'Quitar el filtro de especie' }));
    expect(screen.queryByText(/en este parque/)).not.toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Descargar zona jardin-de-las-hesperides' })).toBeInTheDocument();
  });

  it('especie dentro de un parque: se ven los ejemplares uno a uno aunque el zoom sea de ciudad', async () => {
    geo.getCurrentPosition.mockImplementation(() => {});
    vi.mocked(fetch).mockImplementation(zonePlantsResponse([
      { id: 1, speciesId: 5, displayName: 'Palmera datilera', latitude: 39.4771, longitude: -0.3881 },
      { id: 2, speciesId: 5, displayName: 'Palmera datilera', latitude: 39.4774, longitude: -0.3885 },
    ]));
    // Un parque grande obliga a encuadrar con poco zoom: no se agrupa en un marcador.
    leaflet.map.getZoom.mockReturnValue(15);
    leaflet.markerFactory.mockClear();
    renderMap(<MapPage />, '/mapa?zona=jardin-de-las-hesperides&verEspecie=5');
    expect(await screen.findByText('Palmera datilera: 2 en este parque')).toBeInTheDocument();
    await waitFor(() => expect(leaflet.markerFactory).toHaveBeenCalledWith(
      expect.anything(), expect.objectContaining({ title: expect.stringContaining('Palmera datilera') })));
    expect(leaflet.markerFactory).not.toHaveBeenCalledWith(
      expect.anything(), expect.objectContaining({ title: expect.stringContaining('ejemplares') }));
  });

  it('especie dentro de un parque: ocultar parques quita el contorno pero mantiene el filtro y no mueve el mapa', async () => {
    geo.getCurrentPosition.mockImplementation(() => {});
    vi.mocked(fetch).mockImplementation(zonePlantsResponse([
      { id: 1, speciesId: 5, displayName: 'Palmera datilera', latitude: 39.4771, longitude: -0.3881 },
      { id: 2, speciesId: 5, displayName: 'Palmera datilera', latitude: 39.4774, longitude: -0.3885 },
    ]));
    renderMap(<MapPage />, '/mapa?zona=jardin-de-las-hesperides&verEspecie=5');
    expect(await screen.findByText('Palmera datilera: 2 en este parque')).toBeInTheDocument();
    await waitFor(() => expect(leaflet.map.fitBounds).toHaveBeenCalled());

    greenAreas.layer.remove.mockClear();
    leaflet.map.fitBounds.mockClear();
    leaflet.map.flyTo.mockClear();
    leaflet.map.setView.mockClear();
    fireEvent.click(screen.getByRole('button', { name: 'Ocultar parques' }));
    await waitFor(() => expect(greenAreas.layer.remove).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('button', { name: 'Mostrar parques' })).toHaveAttribute('aria-pressed', 'false');
    // El filtro sigue y el encuadre no cambia.
    expect(screen.getByText('Palmera datilera: 2 en este parque')).toBeInTheDocument();
    expect(leaflet.map.fitBounds).not.toHaveBeenCalled();
    expect(leaflet.map.flyTo).not.toHaveBeenCalled();
    expect(leaflet.map.setView).not.toHaveBeenCalled();

    // Volver a mostrarlos devuelve el contorno sin perder el filtro.
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar parques' }));
    expect(await screen.findByRole('button', { name: 'Ocultar parques' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Palmera datilera: 2 en este parque')).toBeInTheDocument();
  });

  it('especie dentro de un parque: con los parques ocultos, quitar el filtro no vuelve a dibujarlos', async () => {
    geo.getCurrentPosition.mockImplementation(() => {});
    vi.mocked(fetch).mockImplementation(zonePlantsResponse([
      { id: 1, speciesId: 5, displayName: 'Palmera datilera', latitude: 39.4771, longitude: -0.3881 },
    ]));
    renderMap(<MapPage />, '/mapa?zona=jardin-de-las-hesperides&verEspecie=5');
    expect(await screen.findByText('Palmera datilera: 1 en este parque')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Ocultar parques' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Mostrar parques' })).toBeInTheDocument());
    greenAreas.add.mockClear();
    fireEvent.click(screen.getByRole('button', { name: 'Quitar el filtro de especie' }));
    expect(screen.queryByText(/en este parque/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mostrar parques' })).toHaveAttribute('aria-pressed', 'false');
    expect(greenAreas.add).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: /Descargar zona/ })).not.toBeInTheDocument();
  });

  it('especie dentro de un parque: avisa si el parque no tiene ejemplares de esa especie', async () => {
    geo.getCurrentPosition.mockImplementation(() => {});
    vi.mocked(fetch).mockImplementation(zonePlantsResponse([
      { id: 3, speciesId: 8, displayName: 'Tamarisco', latitude: 39.4776, longitude: -0.3884 },
    ]));
    renderMap(<MapPage />, '/mapa?zona=jardin-de-las-hesperides&verEspecie=5');
    expect(await screen.findByText('No hay ejemplares registrados de esta especie en este parque.')).toBeInTheDocument();
  });

  it('especie dentro de un parque: avisa si no se pueden cargar los ejemplares', async () => {
    geo.getCurrentPosition.mockImplementation(() => {});
    vi.mocked(fetch).mockImplementation((async () => { throw new Error('boom'); }) as unknown as typeof fetch);
    renderMap(<MapPage />, '/mapa?zona=jardin-de-las-hesperides&verEspecie=5');
    expect(await screen.findByText('No se pudieron cargar los ejemplares de este parque.')).toBeInTheDocument();
  });

  it('descarga offline: la tarjeta se puede cerrar y el aviso de descargado se puede quitar', async () => {
    renderMap(<MapPage />, '/mapa?zona=jardin-de-las-hesperides');
    fireEvent.click(await screen.findByRole('button', { name: 'Descargar zona jardin-de-las-hesperides' }));
    expect(await screen.findByText('Descargado Jardín de las Hespérides')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar aviso' }));
    expect(screen.queryByText('Descargado Jardín de las Hespérides')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar descarga' }));
    expect(screen.queryByRole('button', { name: /Descargar zona/ })).not.toBeInTheDocument();
  });

  it('PA 3011: tocar «Ver zona» en un contorno abre la ficha de esa zona verde', async () => {
    geo.getCurrentPosition.mockImplementation(() => {});
    render(
      <MemoryRouter initialEntries={['/mapa']}>
        <Routes>
          <Route path="/mapa" element={<MapPage />} />
          <Route path="/zona/:grupo" element={<p>Ficha de zona</p>} />
        </Routes>
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar parques' }));
    await waitFor(() => expect(greenAreas.add).toHaveBeenCalled());
    const options = greenAreas.add.mock.calls[0]![2] as { onOpen: (group: string) => void; text: { open: string } };
    expect(options.text.open).toBe('Ver zona');
    act(() => options.onOpen('jardin-de-las-hesperides'));
    expect(await screen.findByText('Ficha de zona')).toBeInTheDocument();
  });

  it('avisa si no se pueden cargar las zonas verdes y el mapa sigue funcionando', async () => {
    geo.getCurrentPosition.mockImplementation(() => {});
    greenAreas.fetch.mockRejectedValue(new Error('sin red'));
    renderMap();
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar parques' }));
    expect(await screen.findByText('No se pudieron cargar las zonas verdes.')).toBeInTheDocument();
    expect(greenAreas.add).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Buscar sitios en el mapa')).toBeInTheDocument();
    greenAreas.fetch.mockReset();
  });
});
