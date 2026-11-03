import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import App from './App'
import { LANGUAGE_STORAGE_KEY } from './services/languagePreference'
import { renderWithProviders } from './test/renderWithProviders'

vi.mock('./pages/Map', () => ({ MapPage: () => <div data-testid="mapa" /> }))
vi.mock('./services/api', () => ({ checkHealth: vi.fn().mockResolvedValue(true) }))

const respuestaJson = { headers: { 'content-type': 'application/json' } }

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
}

const detalleEspecie = (id: number) => ({
  ...catalogo.species[id - 1],
  locations: { total: 0, returned: 0, nextAfterId: null, items: [] },
})

const stubFichaApi = () =>
  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/species/')) {
        const id = Number(url.split('/species/')[1]?.split('?')[0] ?? '1')
        return Promise.resolve(new Response(JSON.stringify(detalleEspecie(id)), respuestaJson))
      }
      return Promise.resolve(new Response(JSON.stringify(catalogo), respuestaJson))
    }),
  )

const withMode = () => localStorage.setItem('naturemaps:prefs', JSON.stringify({ mode: 'esencial' }))

const openLanguagePage = () => {
  fireEvent.click(screen.getByRole('link', { name: /idioma/i }))
}

describe('rutas, pestañas y marco', () => {
  beforeEach(() => {
    localStorage.clear()
    stubFichaApi()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('sin modo elegido empieza en la selección de modo', () => {
    renderWithProviders(<App />)
    expect(screen.getByRole('heading', { name: /cómo quieres explorar valencia/i })).toBeInTheDocument()
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
  })

  it('con modo elegido empieza en inicio, con la barra inferior y dentro del marco', () => {
    withMode()
    renderWithProviders(<App />, { route: '/inicio' })
    expect(screen.getByRole('heading', { name: 'Hola, explorador' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /ir a inicio/i })).toHaveAttribute('aria-selected', 'true')
    expect(document.querySelector('.app-frame')).toBeInTheDocument()
  })

  it('mantiene las cinco pestañas de la navegación inferior', () => {
    withMode()
    renderWithProviders(<App />, { route: '/inicio' })
    expect(screen.getAllByRole('tab')).toHaveLength(5)
  })

  it('el mapa se carga bajo demanda al entrar en la pestaña', async () => {
    withMode()
    renderWithProviders(<App />, { route: '/inicio' })
    fireEvent.click(screen.getByRole('tab', { name: /ver mapa/i }))
    expect(await screen.findByTestId('mapa')).toBeInTheDocument()
  })

  it('una ruta desconocida muestra el 404', () => {
    withMode()
    renderWithProviders(<App />, { route: '/nada' })
    expect(screen.getByText('Pantalla no encontrada')).toBeInTheDocument()
  })
})

describe('selector de idioma en Ajustes', () => {
  beforeEach(() => {
    localStorage.clear()
    withMode()
    stubFichaApi()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('arranca con el español seleccionado por defecto', () => {
    renderWithProviders(<App />, { route: '/ajustes' })
    expect(screen.getByRole('heading', { name: 'Ajustes' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /idioma/i })).toHaveTextContent('Español')
  })

  it('ofrece español, valenciano e inglés en Ajustes > Idioma', () => {
    renderWithProviders(<App />, { route: '/ajustes' })
    openLanguagePage()
    expect(screen.getByRole('heading', { name: 'Idioma' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Español' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Valencià' })).not.toBeChecked()
    expect(screen.getByRole('radio', { name: 'English' })).not.toBeChecked()
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeInTheDocument()
  })

  it('guarda el inglés como preferencia y traduce Ajustes', () => {
    renderWithProviders(<App />, { route: '/ajustes' })
    openLanguagePage()
    fireEvent.click(screen.getByRole('radio', { name: 'English' }))
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('en')
    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /language/i })).toHaveTextContent('English')
  })

  it('guarda el valenciano como preferencia', () => {
    renderWithProviders(<App />, { route: '/ajustes' })
    openLanguagePage()
    fireEvent.click(screen.getByRole('radio', { name: 'Valencià' }))
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('va')
    expect(screen.getByRole('link', { name: /idioma/i })).toHaveTextContent('Valencià')
  })

  it('descarta la selección si se sale sin guardar', () => {
    renderWithProviders(<App />, { route: '/ajustes' })
    openLanguagePage()
    fireEvent.click(screen.getByRole('radio', { name: 'English' }))
    fireEvent.click(screen.getByRole('button', { name: 'Volver' }))

    expect(screen.getByRole('heading', { name: 'Ajustes' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /idioma/i })).toHaveTextContent('Español')
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBeNull()
  })

  it('traduce toda la app al arrancar en inglés', () => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'en')
    renderWithProviders(<App />, { route: '/inicio' })

    expect(screen.getByRole('heading', { name: 'Hi, explorer' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Go to Home' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'View map of species and trees' })).toBeInTheDocument()
    expect(document.documentElement.lang).toBe('en')
  })

  it('traduce al valenciano y anuncia el documento como catalán', () => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'va')
    renderWithProviders(<App />, { route: '/inicio' })

    expect(screen.getByRole('tab', { name: 'Anar a Inici' })).toBeInTheDocument()
    expect(document.documentElement.lang).toBe('ca')
  })

  it('restaura la preferencia guardada al volver a abrir la app', () => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'va')
    renderWithProviders(<App />, { route: '/ajustes' })
    expect(screen.getByRole('link', { name: /idioma/i })).toHaveTextContent('Valencià')
  })
})

describe('ficha de planta conectada a la API (RF3, UT F06)', () => {
  beforeEach(() => {
    localStorage.clear()
    withMode()
    stubFichaApi()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('abre la ficha con datos del backend y vuelve a Inicio', async () => {
    renderWithProviders(<App />, { route: '/inicio' })
    fireEvent.click(screen.getByRole('link', { name: /ficha de planta/i }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Jacaranda mimosifolia' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /ver en el mapa/i })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Volver' }))
    expect(screen.getByRole('heading', { name: 'Hola, explorador' })).toBeInTheDocument()
  })

  it('navega por el catálogo con las flechas Anterior y Siguiente', async () => {
    renderWithProviders(<App />, { route: '/inicio' })
    fireEvent.click(screen.getByRole('link', { name: /ficha de planta/i }))

    await screen.findByRole('heading', { level: 1, name: 'Jacaranda mimosifolia' })
    expect(screen.getByText('1 / 2')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Especie anterior' })).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: 'Especie siguiente' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Citrus aurantium' })).toBeInTheDocument()
    expect(screen.getByText('2 / 2')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Especie siguiente' })).toBeDisabled()
  })

  it('muestra un error con reintentar cuando la API no responde', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn()
        .mockRejectedValueOnce(new TypeError('Network error'))
        .mockImplementation((input: RequestInfo | URL) => {
          const url = String(input)
          if (url.includes('/species/')) {
            const id = Number(url.split('/species/')[1]?.split('?')[0] ?? '1')
            return Promise.resolve(new Response(JSON.stringify(detalleEspecie(id)), respuestaJson))
          }
          return Promise.resolve(new Response(JSON.stringify(catalogo), respuestaJson))
        }),
    )

    renderWithProviders(<App />, { route: '/inicio' })
    fireEvent.click(screen.getByRole('link', { name: /ficha de planta/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent('No se ha podido cargar el catálogo de especies.')

    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Jacaranda mimosifolia' })).toBeInTheDocument()
  })

  it('avisa cuando el catálogo está vacío', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({ total: 0, species: [] }), respuestaJson)),
      ),
    )

    renderWithProviders(<App />, { route: '/inicio' })
    fireEvent.click(screen.getByRole('link', { name: /ficha de planta/i }))

    expect(await screen.findByText('El catálogo todavía no tiene especies.')).toBeInTheDocument()
  })

  it('enlaza la foto identificada con su ficha real cuando la especie está en el catálogo', async () => {
    const mockTrack = { stop: vi.fn(), applyConstraints: vi.fn() }
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [mockTrack], getVideoTracks: () => [mockTrack] }) },
      writable: true,
      configurable: true,
    })
    const canvasCtx = { drawImage: vi.fn(), fillRect: vi.fn(), fillText: vi.fn() }
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(canvasCtx as unknown as CanvasRenderingContext2D)
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/jpeg;base64,Zm90bw==')

    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((input: RequestInfo | URL) => {
        const url = String(input)
        if (url.includes('/plants/identify')) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                bestMatch: 'Jacaranda mimosifolia',
                remainingIdentificationRequests: 42,
                results: [
                  {
                    score: 0.91,
                    scientificName: 'Jacaranda mimosifolia',
                    author: null,
                    family: null,
                    genus: null,
                    commonNames: ['Jacaranda'],
                    gbifId: null,
                  },
                  {
                    score: 0.42,
                    scientificName: 'Ficus benjamina',
                    author: null,
                    family: null,
                    genus: null,
                    commonNames: ['Ficus'],
                    gbifId: null,
                  },
                ],
              }),
              respuestaJson,
            ),
          )
        }
        if (url.includes('/species/')) {
          const id = Number(url.split('/species/')[1]?.split('?')[0] ?? '1')
          return Promise.resolve(new Response(JSON.stringify(detalleEspecie(id)), respuestaJson))
        }
        return Promise.resolve(new Response(JSON.stringify(catalogo), respuestaJson))
      }),
    )

    renderWithProviders(<App />, { route: '/inicio' })
    fireEvent.click(screen.getByRole('tab', { name: 'Escanear e identificar especie con la cámara' }))
    fireEvent.click(await screen.findByRole('button', { name: /^permitir cámara$/i }))
    fireEvent.click(await screen.findByRole('button', { name: /hacer foto/i }))

    fireEvent.click(await screen.findByRole('button', { name: 'Identificar foto' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Ver ficha' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Jacaranda mimosifolia' })).toBeInTheDocument()
    expect(screen.getByText('Confianza: 91%')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Especie anterior' })).not.toBeInTheDocument()

    // PA 516: el porcentaje de confianza es el camino de vuelta al resultado.
    fireEvent.click(screen.getByRole('button', { name: 'Confianza: 91%' }))

    expect(
      await screen.findByRole('dialog', { name: 'Resultado de la identificación' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Especie más probable')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /Ficus/ })).toBeInTheDocument()

    // Y una alternativa abre su propia ficha con su porcentaje.
    fireEvent.click(screen.getByRole('radio', { name: /Ficus/ }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Ficus benjamina' })).toBeInTheDocument()
    expect(screen.getByText('Confianza: 42%')).toBeInTheDocument()

    // Al volver, la alternativa sigue marcada en el resultado.
    fireEvent.click(screen.getByRole('button', { name: 'Confianza: 42%' }))

    expect(await screen.findByText(/Especie elegida/)).toHaveTextContent('Ficus benjamina')
  })
})
