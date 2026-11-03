import { fireEvent, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../test/renderWithProviders'
import { Search } from './Search'

describe('Search', () => {
  afterEach(() => {
    delete (navigator as unknown as { geolocation?: unknown }).geolocation;
    delete (navigator as unknown as { permissions?: unknown }).permissions;
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

  it('lista las plantas cercanas ordenadas por distancia y con formato por idioma', async () => {
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
        returned: 2,
        limit: 100,
        language: 'es',
        trees: [
          {
            id: 1, speciesId: 3, scientificName: 'Celtis australis', commonName: 'Almez',
            displayName: 'Almez', latitude: 39.47, longitude: -0.37, distance: 250,
          },
          {
            id: 2, speciesId: 4, scientificName: 'Morus nigra', commonName: 'Morera',
            displayName: 'Morera', latitude: 39.47, longitude: -0.37, distance: 2500,
          },
        ],
      }),
    }))

    renderWithProviders(<Search />)

    expect(await screen.findByRole('heading', { name: 'Cerca de ti' })).toBeInTheDocument()
    const items = screen.getAllByRole('listitem')
    expect(items[0]).toHaveTextContent('Almez')
    expect(items[0]).toHaveTextContent('250 m')
    expect(items[1]).toHaveTextContent('Morera')
    expect(items[1]).toHaveTextContent('2,5 km')
  })
})
