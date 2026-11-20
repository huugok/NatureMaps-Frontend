import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../test/renderWithProviders'
import { RoutesList } from './RoutesList'
import type { RouteSummary } from '../../services/routes'

// El listado habla con GET /routes a través de services/routes; se simula el
// servicio (el contrato HTTP lo cubren los tests del backend).
vi.mock('../../services/routes', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/routes')>()
  return {
    ...actual,
    fetchRouteList: vi.fn(),
  }
})

import { fetchRouteList } from '../../services/routes'

const mockFetchRouteList = vi.mocked(fetchRouteList)

function route(overrides: Partial<RouteSummary> = {}): RouteSummary {
  return {
    id: 1,
    name: 'Azahar y sombra del Carmen',
    theme: 'botanica',
    shape: 'circular',
    lengthCategory: 'corta',
    distanceMeters: 2100,
    durationSeconds: 1740,
    start: { latitude: 39.4699, longitude: -0.3763 },
    description: 'Un paseo corto por el casco antiguo.',
    stopsCount: 4,
    ...overrides,
  }
}

describe('RoutesList', () => {
  it('lista las rutas con nombre, tema, forma, longitud, duración y paradas', async () => {
    mockFetchRouteList.mockResolvedValue([
      route(),
      route({
        id: 2,
        name: 'Monumentos del casco antiguo',
        theme: 'cultural',
        shape: 'lineal',
        distanceMeters: 2300,
        durationSeconds: 1900,
        stopsCount: 6,
      }),
    ])

    renderWithProviders(<RoutesList />, { route: '/rutas' })

    expect(await screen.findByText('Azahar y sombra del Carmen')).toBeInTheDocument()
    expect(screen.getByText('Monumentos del casco antiguo')).toBeInTheDocument()
    expect(screen.getByText('Botánica')).toBeInTheDocument()
    expect(screen.getByText('Cultural')).toBeInTheDocument()
    // La forma también se distingue: anillo o recta.
    expect(screen.getByText('Circular')).toBeInTheDocument()
    expect(screen.getByText('Lineal')).toBeInTheDocument()
    // Distancias y duraciones formateadas (29 min = 1740 s).
    expect(screen.getAllByText('2,1 km')).toHaveLength(1)
    expect(screen.getByText('2,3 km')).toBeInTheDocument()
    expect(screen.getByText('29 min')).toBeInTheDocument()
    expect(screen.getByText('6 paradas')).toBeInTheDocument()
  })

  it('muestra carga, error con reintento y estado vacío', async () => {
    mockFetchRouteList.mockRejectedValueOnce(new Error('GET /routes → 500'))
    const user = userEvent.setup()
    renderWithProviders(<RoutesList />, { route: '/rutas' })

    expect(screen.getByRole('status')).toHaveTextContent('Cargando rutas…')
    expect(await screen.findByRole('alert')).toBeInTheDocument()
    mockFetchRouteList.mockResolvedValueOnce([])
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByText('Aún no hay rutas')).toBeInTheDocument()
    expect(mockFetchRouteList).toHaveBeenCalledTimes(2)
  })

  it('abre la ficha de la ruta al tocar su tarjeta', async () => {
    const user = userEvent.setup()
    mockFetchRouteList.mockResolvedValue([route()])
    // Con las dos rutas montadas: la tarjeta debe navegar a /rutas/:id.
    render(
      <MemoryRouter initialEntries={['/rutas']}>
        <Routes>
          <Route path="/rutas" element={<RoutesList />} />
          <Route path="/rutas/:id" element={<p>Ficha de ruta</p>} />
        </Routes>
      </MemoryRouter>,
    )

    await user.click(await screen.findByRole('button', { name: 'Azahar y sombra del Carmen' }))
    expect(screen.getByText('Ficha de ruta')).toBeInTheDocument()
  })
})
