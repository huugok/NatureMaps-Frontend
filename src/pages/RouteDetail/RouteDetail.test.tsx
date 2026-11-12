import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
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
  };
  return {
    map,
    mapFactory: vi.fn(() => map),
    tileLayer: vi.fn(() => ({ addTo: vi.fn() })),
    polylineFactory: vi.fn(() => line),
    layerGroupFactory: vi.fn(() => layer),
    markerFactory: vi.fn(() => marker),
    divIcon: vi.fn(() => ({})),
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
  stopsCount: 2,
  stops: [
    { kind: 'planta', id: 11, name: 'Naranjo de la plaza', latitude: 39.4705, longitude: -0.3755 },
    { kind: 'poi', id: 22, name: 'Torres de Serranos', latitude: 39.4792, longitude: -0.3762 },
  ],
  path: [
    { latitude: 39.4699, longitude: -0.3763 },
    { latitude: 39.4705, longitude: -0.3755 },
    { latitude: 39.4792, longitude: -0.3762 },
    { latitude: 39.4699, longitude: -0.3763 },
  ],
}

function renderDetail(id = '7') {
  // useParams necesita la definición de ruta: el componente no se renderiza
  // colgado de App en el test, así que montamos /rutas/:id aquí.
  return render(
    <MemoryRouter initialEntries={[`/rutas/${id}`]}>
      <AppProvider>
        <Routes>
          <Route path="/rutas/:id" element={<RouteDetail />} />
        </Routes>
      </AppProvider>
    </MemoryRouter>,
  )
}

describe('RouteDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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
    expect(leaflet.mapFactory).toHaveBeenCalledTimes(1)
    expect(leaflet.polylineFactory).toHaveBeenCalledWith(
      route.path.map((point) => [point.latitude, point.longitude]),
      expect.anything(),
    )
    expect(leaflet.markerFactory).toHaveBeenCalledTimes(3)
    expect(leaflet.map.fitBounds).toHaveBeenCalled()
  })

  it('lista las paradas en orden, con su tipo', async () => {
    mockFetchRouteDetail.mockResolvedValue(route)
    renderDetail()

    // La sección lleva aria-label → role region; la lista va dentro.
    const stopsSection = await screen.findByRole('region', { name: 'Paradas del recorrido' })
    const stops = within(stopsSection).getAllByRole('listitem')
    expect(stops).toHaveLength(2)
    expect(stops[0]).toHaveTextContent('Naranjo de la plaza')
    expect(stops[0]).toHaveTextContent('planta')
    expect(stops[1]).toHaveTextContent('Torres de Serranos')
    expect(stops[1]).toHaveTextContent('POI cultural')
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
