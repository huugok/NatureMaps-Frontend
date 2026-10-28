import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { MapPage } from './MapPage';

const leaflet = vi.hoisted(() => {
  const map = {
    on: vi.fn(),
    remove: vi.fn(),
    setView: vi.fn(),
    flyTo: vi.fn(),
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
    setLatLng: vi.fn(),
    bindTooltip: vi.fn(function (this: unknown) { return this; }),
    unbindTooltip: vi.fn(function (this: unknown) { return this; }),
    getElement: vi.fn(() => null),
    getLatLng: vi.fn(() => ({ lat: 39.47, lng: -0.37 })),
    remove: vi.fn(),
    options: {} as Record<string, unknown>,
  };
  const circle = {
    addTo: vi.fn(function (this: unknown) { return this; }),
    setLatLng: vi.fn(function (this: unknown) { return this; }),
    setRadius: vi.fn(function (this: unknown) { return this; }),
  };
  return {
    map,
    marker,
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
    vi.stubGlobal('fetch', vi.fn());
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

    render(<MapPage />);

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
    const { unmount } = render(<MapPage />);

    expect(screen.getByRole('textbox', { name: 'Buscar sitios en el mapa' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Centrar el mapa en mi ubicación' })).toBeInTheDocument();
    expect(geo.watchPosition).toHaveBeenCalledWith(expect.any(Function), expect.any(Function), expect.objectContaining({ enableHighAccuracy: true }));

    unmount();

    expect(leaflet.map.remove).toHaveBeenCalledOnce();
    expect(geo.clearWatch).toHaveBeenCalledWith(7);
  });

  it('520-3: añade el marcador y el radio de precisión y centra el mapa en la ubicación recibida', () => {
    render(<MapPage />);
    const onPosition = geo.watchPosition.mock.calls[0][0];
    onPosition({ coords: { latitude: 39.48, longitude: -0.38, accuracy: 25 } });

    expect(leaflet.markerFactory).toHaveBeenCalledWith([39.48, -0.38], expect.objectContaining({
      keyboard: false,
      interactive: false,
      zIndexOffset: 1000,
    }));
    expect(leaflet.circleFactory).toHaveBeenCalledWith([39.48, -0.38], expect.objectContaining({ radius: 25 }));
    expect(leaflet.map.setView).toHaveBeenCalledWith([39.48, -0.38], 16, { animate: true });
  });

  it('permite buscar un lugar y anuncia cuando no hay resultados', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => [] } as Response);
    render(<MapPage />);
    fireEvent.change(screen.getByRole('textbox', { name: 'Buscar sitios en el mapa' }), { target: { value: 'Xàtiva' } });
    fireEvent.click(screen.getByRole('button', { name: 'Buscar' }));

    expect(await screen.findByRole('status')).toHaveTextContent('No se encontraron lugares con ese nombre.');
    await waitFor(() => expect(fetch).toHaveBeenCalledOnce());
  });
});
