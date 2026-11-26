import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AppProvider } from '../../context/AppContext'
import { RouteDetail } from './RouteDetail'
import { fetchRouteDetail } from '../../services/routes'
import type { RouteDetail as RouteDetailData } from '../../services/routes'

// La ficha habla con GET /routes/:id a través de services/routes; se simula el
// servicio (el contrato HTTP lo cubren los tests del backend).
vi.mock('../../services/routes', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/routes')>()
  return {
    ...actual,
    fetchRouteDetail: vi.fn(),
  }
})

// Leaflet simulado igual que en MapPage.test: capturamos las llamadas que
// interesan del mapa (polilínea del recorrido, paradas) sin canvas real.
const leaflet = vi.hoisted(() => {
  const map = {
    on: vi.fn(),
    off: vi.fn(),
    remove: vi.fn(),
    setView: vi.fn(),
    fitBounds: vi.fn(),
  };
  const line = {
    addTo: vi.fn(function (this: unknown) { return this; }),
    getBounds: vi.fn(() => ({ pad: () => ({}) })),
  };
  const layer = {
    addTo: vi.fn(function (this: unknown) { return this; }),
    remove: vi.fn(),
  };
  const marker = {
    addTo: vi.fn(function (this: unknown) { return this; }),
    on: vi.fn(),
    bindTooltip: vi.fn(function (this: unknown) { return this; }),
    options: {} as Record<string, unknown>,
  };
  // Cada llamada crea su propio marcador: así se puede comprobar qué manejador
  // de clic lleva cada parada.
  const created: Array<{ on: ReturnType<typeof vi.fn> }> = [];
  const markerFactory = vi.fn(() => {
    const instance = { ...marker, on: vi.fn(), bindTooltip: vi.fn(function (this: unknown) { return this; }) };
    created.push(instance);
    return instance;
  });
  return {
    map,
    mapFactory: vi.fn(() => map),
    tileLayer: vi.fn(() => ({ addTo: vi.fn() })),
    polylineFactory: vi.fn(() => line),
    layerGroupFactory: vi.fn(() => layer),
    markerFactory,
    created,
    divIcon: vi.fn(() => ({})),
    latLngBounds: vi.fn(() => ({ pad: () => ({}) })),
    line,
    layer,
    marker,
  };
});

vi.mock('leaflet', () => ({
  default: {
    map: leaflet.mapFactory,
    tileLayer: leaflet.tileLayer,
    polyline: leaflet.polylineFactory,
    layerGroup: leaflet.layerGroupFactory,
    marker: leaflet.markerFactory,
    divIcon: leaflet.divIcon,
    latLngBounds: leaflet.latLngBounds,
  },
}));

const mockFetchRouteDetail = vi.mocked(fetchRouteDetail)

const route: RouteDetailData = {
  id: 7,
  name: 'Historia bajo los árboles',
  theme: 'mixta',
  shape: 'circular',
  lengthCategory: 'corta',
  distanceMeters: 2280,
  durationSeconds: 1980,
  start: { latitude: 39.4699, longitude: -0.3763 },
  description: 'Plantas del inventario y patrimonio histórico alternados.',
  stopsCount: 2, userId: 1, origin: 'Predeterminado',
  stops: [
    { kind: 'planta', id: 11, name: 'Naranjo de la plaza', latitude: 39.4705, longitude: -0.3755, speciesId: 3 },
    { kind: 'poi', id: 22, name: 'Torres de Serranos', latitude: 39.4792, longitude: -0.3762, speciesId: null },
  ],
  path: [
    { latitude: 39.4699, longitude: -0.3763 },
    { latitude: 39.4705, longitude: -0.3755 },
    { latitude: 39.4792, longitude: -0.3762 },
    { latitude: 39.4699, longitude: -0.3763 },
  ],
}

/** Destino de la navegación al mapa: muestra la ruta y sus parámetros. */
function MapaDestino() {
  const location = useLocation();
  return (
    <>
      <p>Mapa principal</p>
      <p>{`mapa${location.search}`}</p>
    </>
  );
}

function renderDetail(id = '7', onOpenStop?: (stop: RouteDetailData['stops'][number]) => void) {
  // useParams necesita la definición de ruta: el componente no se renderiza
  // colgado de App en el test, así que montamos /rutas/:id aquí.
  return render(
    <MemoryRouter initialEntries={[`/rutas/${id}`]}>
      <AppProvider>
        <Routes>
          <Route path="/rutas/:id" element={<RouteDetail onOpenStop={onOpenStop} />} />
          <Route path="/mapa" element={<MapaDestino />} />
        </Routes>
      </AppProvider>
    </MemoryRouter>,
  )
}

describe('RouteDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    leaflet.created.length = 0
  })

  afterEach(() => {
    cleanup()
  })

  it('pinta los datos de la ficha y el recorrido en el mapa', async () => {
    mockFetchRouteDetail.mockResolvedValue(route)

    renderDetail()

    expect(await screen.findByRole('heading', { name: 'Historia bajo los árboles' })).toBeInTheDocument()
    // «Mixta» aparece como subtítulo y como badge.
    expect(screen.getAllByText('Mixta')).toHaveLength(2)
    expect(screen.getByText('Circular')).toBeInTheDocument()
    expect(screen.getByText('2,3 km')).toBeInTheDocument()
    expect(screen.getByText('33 min')).toBeInTheDocument()
    expect(screen.getByText('2 paradas')).toBeInTheDocument()
    expect(screen.getByText('Plantas del inventario y patrimonio histórico alternados.')).toBeInTheDocument()

    // Mapa: polilínea con el path completo y un marcador por parada + inicio.
    // El mapa se monta en un efecto posterior al pintado de los datos.
    await waitFor(() => expect(leaflet.mapFactory).toHaveBeenCalledTimes(1));
    expect(leaflet.polylineFactory).toHaveBeenCalledWith(
      route.path.map((point) => [point.latitude, point.longitude]),
      expect.anything(),
    );
    expect(leaflet.markerFactory).toHaveBeenCalledTimes(3);
    expect(leaflet.map.fitBounds).toHaveBeenCalled();
  })

  it('lista las paradas en orden, con su tipo, y abre la ficha de las de planta', async () => {
    const user = userEvent.setup()
    const onOpenStop = vi.fn()
    mockFetchRouteDetail.mockResolvedValue(route)
    renderDetail('7', onOpenStop)

    const stopsSection = await screen.findByRole('region', { name: 'Paradas del recorrido' })
    const stops = within(stopsSection).getAllByRole('listitem')
    expect(stops).toHaveLength(2)
    expect(stops[0]).toHaveTextContent('Naranjo de la plaza')
    expect(stops[0]).toHaveTextContent('planta')
    expect(stops[1]).toHaveTextContent('Torres de Serranos')
    expect(stops[1]).toHaveTextContent('POI cultural')

    // La parada de planta abre su ficha; la de POI no (su ficha llega luego).
    await user.click(within(stops[0]).getByRole('button'))
    expect(onOpenStop).toHaveBeenCalledWith(expect.objectContaining({ kind: 'planta', name: 'Naranjo de la plaza' }))
    expect(within(stops[1]).queryByRole('button')).toBeNull()
  })

  it('el toque de una parada en el mapa también abre su ficha', async () => {
    const onOpenStop = vi.fn()
    mockFetchRouteDetail.mockResolvedValue(route)
    renderDetail('7', onOpenStop)

    await screen.findByRole('heading', { name: 'Historia bajo los árboles' })
    // Plantas abren ficha; POIs y patrocinadores también responden al toque
    // para mostrar su etiqueta. Se busca el handler que llama a onOpenStop.
    const withClick = leaflet.created.filter((instance) => instance.on.mock.calls.length > 0)
    expect(withClick.length).toBeGreaterThanOrEqual(1)
    const handlers = withClick.flatMap((instance) => instance.on.mock.calls.map((call) => call[1] as () => void))
    const clickHandler = handlers.find((handler) => {
      onOpenStop.mockClear()
      handler()
      return onOpenStop.mock.calls.length > 0
    })
    expect(clickHandler).toBeTypeOf('function')
    expect(onOpenStop).toHaveBeenCalledWith(expect.objectContaining({ kind: 'planta' }))
  })

  it('«Iniciar ruta» lleva al mapa con la ruta pintada', async () => {
    const user = userEvent.setup()
    mockFetchRouteDetail.mockResolvedValue(route)
    renderDetail()

    await user.click(await screen.findByRole('button', { name: 'Iniciar ruta' }))
    expect(screen.getByText('Mapa principal')).toBeInTheDocument()
    expect(screen.getByText('mapa?verRuta=7')).toBeInTheDocument()
  })

  it('incluye el botón «Descargar ruta» como marcador de posición', async () => {
    const user = userEvent.setup()
    mockFetchRouteDetail.mockResolvedValue(route)
    renderDetail()

    await user.click(await screen.findByRole('button', { name: 'Descargar ruta' }))
    expect(screen.getByRole('status')).toHaveTextContent('Disponible en próximas versiones.')
  })

  it('un id no numérico muestra «no existe» sin llamar al servicio', () => {
    renderDetail('abc')
    expect(screen.getByRole('alert')).toHaveTextContent('Esta ruta no existe o ya no está disponible.')
    expect(mockFetchRouteDetail).not.toHaveBeenCalled()
  })

  it('404 y fallo de red son estados distintos', async () => {
    mockFetchRouteDetail.mockRejectedValueOnce(Object.assign(new Error('GET /routes/7 → 404'), { status: 404 }))
    renderDetail()
    expect(await screen.findByRole('alert')).toHaveTextContent('Esta ruta no existe o ya no está disponible.')

    cleanup()
    mockFetchRouteDetail.mockRejectedValueOnce(Object.assign(new Error('GET /routes/7 → 500'), { status: 500 }))
    renderDetail()
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se pudieron cargar las rutas. Comprueba tu conexión e inténtalo de nuevo.',
    )
  })
})
