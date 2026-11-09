import { fireEvent, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../test/renderWithProviders'
import { Search } from './Search'

const { speciesCatalog } = vi.hoisted(() => ({ speciesCatalog: [
  {
    id: 1,
    scientificName: 'Citrus × aurantium',
    names: [{ name: 'Naranjo', language: 'es' }],
    content: null,
    profile: null,
    enrichment: null,
    image: null,
  },
  {
    id: 2,
    scientificName: 'Citrus limon',
    names: [{ name: 'Limonero', language: 'es' }],
    content: null,
    profile: null,
    enrichment: null,
    image: null,
  },
  {
    id: 3,
    scientificName: 'Olea europaea',
    names: [{ name: 'Olivo', language: 'es' }],
    content: null,
    profile: null,
    enrichment: null,
    image: null,
  },
]}))

vi.mock('../../services/ficha', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/ficha')>()
  return {
    ...actual,
    getAllSpeciesList: vi.fn().mockResolvedValue(speciesCatalog),
  }
})

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

  it('carga el catálogo completo al entrar aunque todavía no haya texto', async () => {
    renderWithProviders(<Search />)

    expect(await screen.findByRole('button', { name: /Naranjo.*Citrus × aurantium/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Limonero.*Citrus limon/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Olivo.*Olea europaea/i })).toBeInTheDocument()
  })

  it('busca por nombre común y científico sin distinguir mayúsculas ni acentos', async () => {
    renderWithProviders(<Search />)
    const input = screen.getByPlaceholderText('Buscar una planta…')
    await screen.findByRole('button', { name: /Naranjo.*Citrus × aurantium/i })

    fireEvent.change(input, { target: { value: 'NARANJO' } })
    expect(screen.getByRole('button', { name: /Naranjo.*Citrus × aurantium/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Limonero.*Citrus limon/i })).not.toBeInTheDocument()

    fireEvent.change(input, { target: { value: 'citrus' } })
    expect(screen.getByRole('button', { name: /Naranjo.*Citrus × aurantium/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Limonero.*Citrus limon/i })).toBeInTheDocument()

    fireEvent.change(input, { target: { value: 'limónero' } })
    expect(screen.getByRole('button', { name: /Limonero.*Citrus limon/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Olivo.*Olea europaea/i })).not.toBeInTheDocument()
  })

  it('muestra un mensaje explícito cuando la búsqueda no encuentra especies', async () => {
    renderWithProviders(<Search />)
    await screen.findByRole('button', { name: /Naranjo.*Citrus × aurantium/i })
    fireEvent.change(screen.getByPlaceholderText('Buscar una planta…'), { target: { value: 'zzzz' } })

    expect(screen.getByRole('status')).toHaveTextContent('No se han encontrado plantas')
    expect(screen.queryByRole('button', { name: /Naranjo/i })).not.toBeInTheDocument()
  })

  it('devuelve la especie seleccionada al pulsar un resultado', async () => {
    const onSelectSpecies = vi.fn()
    renderWithProviders(<Search onSelectSpecies={onSelectSpecies} />)
    await screen.findByRole('button', { name: /Naranjo.*Citrus × aurantium/i })

    fireEvent.click(screen.getByRole('button', { name: /Naranjo.*Citrus × aurantium/i }))

    expect(onSelectSpecies).toHaveBeenCalledWith(speciesCatalog[0])
  })

  it('ofrece activar la ubicación cuando no hay permiso para ella', async () => {
    renderWithProviders(<Search />)
    expect(await screen.findByRole('button', { name: /Activar ubicación/ })).toBeInTheDocument()
  })

  it('ordena primero las especies con ubicaciones cercanas y muestra su distancia', async () => {
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
            id: 3, speciesId: 3, scientificName: 'Olea europaea', commonName: 'Olivo',
            displayName: 'Olivo', latitude: 39.47, longitude: -0.37, distance: 250,
          },
          {
            id: 1, speciesId: 1, scientificName: 'Citrus × aurantium', commonName: 'Naranjo',
            displayName: 'Naranjo', latitude: 39.47, longitude: -0.37, distance: 260,
          },
        ],
      }),
    }))

    renderWithProviders(<Search />)

    await waitFor(() => {
      const speciesResults = screen.getAllByRole('button').filter((button) => button.textContent?.includes('Citrus') || button.textContent?.includes('Olea'))
      expect(speciesResults[0]).toHaveTextContent('Olivo')
    })
    const speciesResults = screen.getAllByRole('button').filter((button) => button.textContent?.includes('Citrus') || button.textContent?.includes('Olea'))
    expect(speciesResults[0]).toHaveTextContent('250 m')
    expect(speciesResults[1]).toHaveTextContent('260 m')
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
