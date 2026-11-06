import { fireEvent, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../test/renderWithProviders'
import { Search } from './Search'

describe('Search', () => {
  afterEach(() => {
    delete (navigator as unknown as { geolocation?: unknown }).geolocation;
    delete (navigator as unknown as { permissions?: unknown }).permissions;
    localStorage.clear();
    vi.unstubAllGlobals();
  })

  it('permite escribir en el buscador', () => {
    renderWithProviders(<Search />)
    const input = screen.getByPlaceholderText('Buscar una planta…')
    fireEvent.change(input, { target: { value: 'olivo' } })
    expect(input).toHaveValue('olivo')
  })

  it('ofrece activar la ubicación cuando no hay permiso para ella', async () => {
    renderWithProviders(<Search />)
    expect(await screen.findByRole('button', { name: 'Activar ubicación' })).toBeInTheDocument()
  })

  it('agrupa las plantas cercanas por especie en desplegables con su distancia', async () => {
    Object.defineProperty(navigator, 'permissions', {
      configurable: true,
      value: { query: async () => ({ state: 'granted' }) },
    })
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition: (success: (position: unknown) => void) => {
          success({ coords: { latitude: 39.47, longitude: -0.37, accuracy: 10 } })
        },
      },
    })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        center: { latitude: 39.47, longitude: -0.37 },
        radius: 1000,
        returned: 3,
        limit: 100,
        language: 'es',
        trees: [
          {
            id: 1, speciesId: 3, scientificName: 'Celtis australis', commonName: 'Almez',
            displayName: 'Almez', latitude: 39.47, longitude: -0.37, distance: 250,
          },
          {
            id: 2, speciesId: 3, scientificName: 'Celtis australis', commonName: 'Almez',
            displayName: 'Almez', latitude: 39.47, longitude: -0.37, distance: 260,
          },
          {
            id: 3, speciesId: 4, scientificName: 'Morus nigra', commonName: 'Morera',
            displayName: 'Morera', latitude: 39.47, longitude: -0.37, distance: 2500,
          },
        ],
      }),
    }))

    renderWithProviders(<Search />)

    expect(await screen.findByRole('heading', { name: 'Cerca de ti' })).toBeInTheDocument()

    // Una fila desplegable por especie, la más cercana primero, con recuento
    // de ejemplares y la distancia del más próximo.
    const almezRow = screen.getByText('Almez').closest('summary')
    expect(almezRow).toHaveTextContent('2')
    expect(almezRow).toHaveTextContent('250 m')
    const moreraRow = screen.getByText('Morera').closest('summary')
    expect(moreraRow).toHaveTextContent('2,5 km')

    // Al abrir el desplegable se listan los ejemplares con su distancia.
    fireEvent.click(almezRow!)
    expect(almezRow!.parentElement).toHaveAttribute('open')
    const specimenItems = almezRow!.parentElement!.querySelectorAll('ul > li')
    expect(specimenItems).toHaveLength(2)
    expect(screen.getByText('260 m')).toBeInTheDocument()
  })

  it('en modo aventura usa el radio fijo de 1000 m aunque el deslizador esté a 5000', async () => {
    localStorage.setItem('naturemaps:prefs', JSON.stringify({ mode: 'aventura' }))
    localStorage.setItem('naturemaps:radius', '5000')
    Object.defineProperty(navigator, 'permissions', {
      configurable: true,
      value: { query: async () => ({ state: 'granted' }) },
    })
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition: (success: (position: unknown) => void) => {
          success({ coords: { latitude: 39.47, longitude: -0.37, accuracy: 10 } })
        },
      },
    })
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        center: { latitude: 39.47, longitude: -0.37 },
        radius: 1000,
        returned: 0,
        limit: 100,
        language: 'es',
        trees: [],
      }),
    })
    vi.stubGlobal('fetch', fetchMock)

    renderWithProviders(<Search />)

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    const url = String(fetchMock.mock.calls[0][0])
    expect(url).toContain('radius=1000')
    expect(url).toContain('limit=100')
  })
})
