import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import App from './App'
import { LANGUAGE_STORAGE_KEY } from './services/languagePreference'
import { SPECIES_PHOTO_STORAGE_KEY } from './services/speciesPhoto'
import { renderWithProviders } from './test/renderWithProviders'

vi.mock('./pages/Map', () => ({
  MapPage: ({ onOpenPlant }: {
    onOpenPlant?: (plant: {
      id: number;
      speciesId: number | null;
      displayName: string;
      latitude: number;
      longitude: number;
      identified: boolean;
    }) => void;
  }) => (
    <div data-testid="mapa">
      <button
        type="button"
        onClick={() => onOpenPlant?.({
          id: 7,
          speciesId: 1,
          displayName: 'Jacaranda',
          latitude: 39.47,
          longitude: -0.37,
          identified: true,
        })}
      >
        Tocar almez
      </button>
    </div>
  ),
}))
vi.mock('./services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./services/api')>()
  return { ...actual, checkHealth: vi.fn().mockResolvedValue(true) }
})

// Leaflet no pinta en jsdom: la ficha de ruta monta su propio mapa.
vi.mock('leaflet', () => ({
  default: {
    map: vi.fn(() => ({
      on: vi.fn(), off: vi.fn(), remove: vi.fn(), setView: vi.fn(), fitBounds: vi.fn(),
    })),
    tileLayer: vi.fn(() => ({ addTo: vi.fn() })),
    layerGroup: vi.fn(() => ({ addTo: vi.fn(), remove: vi.fn() })),
    polyline: vi.fn(() => ({ addTo: vi.fn(), getBounds: vi.fn(() => ({ pad: () => ({}) })) })),
    marker: vi.fn(() => ({
      addTo: vi.fn(), on: vi.fn(), bindTooltip: vi.fn(function (this: unknown) { return this; }),
    })),
    divIcon: vi.fn(() => ({})),
    latLngBounds: vi.fn(() => ({ pad: () => ({}) })),
  },
}))

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

  it('PA 690/691: abre la ficha de la planta tocada y mantiene el mapa montado al volver', async () => {
    withMode()
    renderWithProviders(<App />, { route: '/mapa' })

    fireEvent.click(await screen.findByRole('button', { name: 'Tocar almez' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Jacaranda mimosifolia' })).toBeInTheDocument()
    // La ficha es un overlay: la pantalla del mapa sigue montada debajo y no
    // ofrece «Ver en el mapa» porque ya se viene de él.
    expect(screen.getByTestId('mapa')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /ver en el mapa/i })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Volver' }))

    expect(screen.queryByRole('heading', { level: 1, name: 'Jacaranda mimosifolia' })).not.toBeInTheDocument()
    expect(screen.getByTestId('mapa')).toBeInTheDocument()
  })

  it('mantiene el selector inferior visible y activo durante el escaneo', async () => {
    withMode()
    renderWithProviders(<App />, { route: '/inicio' })

    fireEvent.click(screen.getByRole('tab', { name: /escanear e identificar/i }))

    expect(await screen.findByRole('tab', { name: /escanear e identificar/i }))
      .toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tablist')).toBeInTheDocument()
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

describe('catálogo de rutas (UT de rutas predefinidas)', () => {
  const ruta = {
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
      { kind: 'planta', id: 11, name: 'Naranjo de la plaza', latitude: 39.4705, longitude: -0.3755, speciesId: 2 },
      { kind: 'poi', id: 22, name: 'Torres de Serranos', latitude: 39.4792, longitude: -0.3762, speciesId: null },
    ],
    path: [
      { latitude: 39.4699, longitude: -0.3763 },
      { latitude: 39.4705, longitude: -0.3755 },
      { latitude: 39.4699, longitude: -0.3763 },
    ],
  }
  const listado = {
    total: 1,
    routes: [{
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
    }],
  }

  beforeEach(() => {
    localStorage.clear()
    withMode()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((input: RequestInfo | URL) => {
        const url = String(input)
        if (url.includes('/routes/7')) {
          return Promise.resolve(new Response(JSON.stringify(ruta), respuestaJson))
        }
        if (url.includes('/routes')) {
          return Promise.resolve(new Response(JSON.stringify(listado), respuestaJson))
        }
        if (url.includes('/species/')) {
          const id = Number(url.split('/species/')[1]?.split('?')[0] ?? '1')
          return Promise.resolve(new Response(JSON.stringify(detalleEspecie(id)), respuestaJson))
        }
        return Promise.resolve(new Response(JSON.stringify(catalogo), respuestaJson))
      }),
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('el listado muestra nombre, tema, longitud, duración y paradas', async () => {
    renderWithProviders(<App />, { route: '/rutas' })

    expect(await screen.findByText('Historia bajo los árboles')).toBeInTheDocument()
    expect(screen.getByText('Mixta')).toBeInTheDocument()
    expect(screen.getByText('2,3 km')).toBeInTheDocument()
    expect(screen.getByText('33 min')).toBeInTheDocument()
    expect(screen.getByText('2 paradas')).toBeInTheDocument()
  })

  it('la ficha repite los datos y abre la ficha de la planta al tocar su parada', async () => {
    renderWithProviders(<App />, { route: '/rutas/7' })

    expect(await screen.findByRole('heading', { level: 1, name: 'Historia bajo los árboles' })).toBeInTheDocument()
    expect(screen.getByText('2,3 km')).toBeInTheDocument()
    expect(screen.getByText('33 min')).toBeInTheDocument()
    expect(screen.getByText('2 paradas')).toBeInTheDocument()

    // La parada de planta abre su ficha; la de POI todavía no (llega luego).
    fireEvent.click(screen.getByRole('button', { name: /Naranjo de la plaza/ }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Citrus aurantium' })).toBeInTheDocument()

    // Al volver se sigue en la ficha de la ruta. Hay dos flechas «Volver» (la de
    // la ruta y la de la ficha abierta encima): se pulsa la de la ficha.
    fireEvent.click(screen.getAllByRole('button', { name: 'Volver' }).at(-1) as HTMLElement)
    expect(screen.getByRole('heading', { level: 1, name: 'Historia bajo los árboles' })).toBeInTheDocument()
  })

  it('la ficha ofrece «Iniciar ruta» e informa si el almacenamiento offline no está disponible', async () => {
    renderWithProviders(<App />, { route: '/rutas/7' })

    expect(await screen.findByRole('heading', { level: 1, name: 'Historia bajo los árboles' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Iniciar ruta' })).toBeInTheDocument()
    expect(screen.getByText('Este navegador no permite guardar rutas sin conexión.')).toBeInTheDocument()
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
    let firstCatalogue = true
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((input: RequestInfo | URL) => {
        const url = String(input)
        if (url.includes('/species/')) {
          const id = Number(url.split('/species/')[1]?.split('?')[0] ?? '1')
          return Promise.resolve(new Response(JSON.stringify(detalleEspecie(id)), respuestaJson))
        }
        if (url.includes('/species?lang=') && !url.includes('month=') && firstCatalogue) {
          firstCatalogue = false
          return Promise.reject(new TypeError('Network error'))
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

describe('PA 512 — ficha pendiente sin conexión', () => {
  beforeEach(() => {
    localStorage.clear()
    withMode()
    const mockTrack = { stop: vi.fn(), applyConstraints: vi.fn() }
    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        getUserMedia: vi.fn().mockResolvedValue({
          getTracks: () => [mockTrack],
          getVideoTracks: () => [mockTrack],
        }),
      },
      writable: true,
      configurable: true,
    })
    const canvasCtx = { drawImage: vi.fn(), fillRect: vi.fn(), fillText: vi.fn() }
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      canvasCtx as unknown as CanvasRenderingContext2D,
    )
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue(
      'data:image/jpeg;base64,Zm90bw==',
    )
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((input: RequestInfo | URL) => {
        if (String(input).includes('/plants/identify')) {
          return Promise.reject(new TypeError('Failed to fetch'))
        }
        return Promise.resolve(new Response(JSON.stringify(catalogo), respuestaJson))
      }),
    )
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('muestra la foto original y ningún dato de especie cuando la API no responde', async () => {
    renderWithProviders(<App />, { route: '/inicio' })
    fireEvent.click(screen.getByRole('tab', { name: /escanear e identificar/i }))
    fireEvent.click(await screen.findByRole('button', { name: /^permitir cámara$/i }))
    fireEvent.click(await screen.findByRole('button', { name: /hacer foto/i }))
    fireEvent.click(await screen.findByRole('button', { name: 'Identificar foto' }))

    expect(
      await screen.findByRole('heading', { name: 'Planta sin identificar' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Identificación pendiente')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Foto de la planta' })).toHaveAttribute(
      'src',
      'data:image/jpeg;base64,Zm90bw==',
    )
    expect(screen.getByRole('button', { name: 'Reintentar identificación' })).toBeInTheDocument()

    expect(screen.queryByText('Especie más probable')).not.toBeInTheDocument()
    expect(screen.queryByText('Jacaranda mimosifolia')).not.toBeInTheDocument()
    expect(
      screen.queryByText('No se ha podido contactar con el servidor de identificación'),
    ).not.toBeInTheDocument()
  })
})

describe('PA 574 — ficha con datos parciales de catálogo', () => {
  beforeEach(() => {
    localStorage.clear()
    withMode()
    const especieParcial = {
      id: 13,
      scientificName: 'Tamarix africana',
      names: [{ name: 'Taraje', language: 'es' }],
      content: null,
      profile: null,
      enrichment: null,
      image: null,
    }
    const detalleParcial = {
      ...especieParcial,
      locations: {
        total: 36,
        returned: 1,
        nextAfterId: null,
        items: [{
          id: 23,
          latitude: 39.46,
          longitude: -0.37,
          district: 'La Gran Via',
          neighborhood: null,
          source: 'VALENCIA_ARBOLADO',
          sourceUrl: 'https://example.test/tree/23',
        }],
      },
    }

    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((input: RequestInfo | URL) => {
        const url = String(input)
        // La ficha pide metadatos de la fuente de cada ubicación; en este caso
        // la fuente no está disponible y la ficha debe decirlo.
        if (url.includes('/sources/')) {
          return Promise.resolve(new Response('{}', { status: 404, ...respuestaJson }))
        }
        return Promise.resolve(new Response(
          JSON.stringify(url.includes('/species/13') ? detalleParcial : {
            total: 1,
            species: [especieParcial],
          }),
          respuestaJson,
        ))
      }),
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('mantiene los datos disponibles y señala cada campo ausente', async () => {
    renderWithProviders(<App />, { route: '/ficha' })

    expect(await screen.findByRole('heading', { level: 1, name: 'Tamarix africana' })).toBeInTheDocument()
    expect(screen.getByText('Taraje')).toBeInTheDocument()
    expect(screen.getByText('Sin foto disponible')).toBeInTheDocument()
    expect(screen.getByText('familia no disponible')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Descripción' })).toBeInTheDocument()
    expect(screen.getByText('Descripción no disponible')).toBeInTheDocument()
    expect(screen.getByText('Floración no disponible')).toBeInTheDocument()
    expect(screen.getByText('Dato curioso no disponible')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Fuentes de información' })).toBeInTheDocument()
    expect(screen.getByText('Fuentes no disponibles')).toBeInTheDocument()

    expect(screen.getByText('La Gran Via')).toBeInTheDocument()
    expect(screen.getByText('36 ejemplares')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})

describe('PA 2941 — foto de la muestra en la ficha', () => {
  beforeEach(() => {
    localStorage.clear()
    withMode()
    const mockTrack = { stop: vi.fn(), applyConstraints: vi.fn() }
    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        getUserMedia: vi.fn().mockResolvedValue({
          getTracks: () => [mockTrack],
          getVideoTracks: () => [mockTrack],
        }),
      },
      writable: true,
      configurable: true,
    })
    const canvasCtx = { drawImage: vi.fn(), fillRect: vi.fn(), fillText: vi.fn() }
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      canvasCtx as unknown as CanvasRenderingContext2D,
    )
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue(
      'data:image/jpeg;base64,Zm90bw==',
    )

    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((input: RequestInfo | URL) => {
        const url = String(input)
        if (url.includes('/plants/identify')) {
          return Promise.resolve(new Response(JSON.stringify({
            bestMatch: 'Jacaranda mimosifolia',
            remainingIdentificationRequests: 42,
            results: [{
              score: 0.91,
              scientificName: 'Jacaranda mimosifolia',
              author: null,
              family: null,
              genus: null,
              commonNames: ['Jacaranda'],
              gbifId: null,
            }],
          }), respuestaJson))
        }
        if (url.includes('/species/')) {
          const id = Number(url.split('/species/')[1]?.split('?')[0] ?? '1')
          return Promise.resolve(new Response(JSON.stringify(detalleEspecie(id)), respuestaJson))
        }
        return Promise.resolve(new Response(JSON.stringify(catalogo), respuestaJson))
      }),
    )
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('sustituye la foto del catálogo por la captura y la conserva al reabrir la ficha', async () => {
    const { unmount } = renderWithProviders(<App />, { route: '/inicio' })
    fireEvent.click(screen.getByRole('tab', { name: /escanear e identificar/i }))
    fireEvent.click(await screen.findByRole('button', { name: /^permitir cámara$/i }))
    fireEvent.click(await screen.findByRole('button', { name: /hacer foto/i }))
    fireEvent.click(await screen.findByRole('button', { name: 'Identificar foto' }))

    fireEvent.click(await screen.findByRole('button', { name: 'Usar esta foto en la ficha' }))

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Jacaranda mimosifolia' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Fotografía de Jacaranda' })).toHaveAttribute(
      'src',
      'data:image/jpeg;base64,Zm90bw==',
    )
    expect(localStorage.getItem(SPECIES_PHOTO_STORAGE_KEY)).toContain(
      'data:image/jpeg;base64,Zm90bw==',
    )

    unmount()

    // La foto queda guardada: la ficha del catálogo la sigue mostrando.
    renderWithProviders(<App />, { route: '/ficha' })

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Jacaranda mimosifolia' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Fotografía de Jacaranda' })).toHaveAttribute(
      'src',
      'data:image/jpeg;base64,Zm90bw==',
    )
    expect(screen.queryByText('Sin foto disponible')).not.toBeInTheDocument()
  })
})

describe('PA 2941 — foto no persistible', () => {
  beforeEach(() => {
    localStorage.clear()
    withMode()
    const mockTrack = { stop: vi.fn(), applyConstraints: vi.fn() }
    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        getUserMedia: vi.fn().mockResolvedValue({
          getTracks: () => [mockTrack],
          getVideoTracks: () => [mockTrack],
        }),
      },
      writable: true,
      configurable: true,
    })
    const canvasCtx = { drawImage: vi.fn(), fillRect: vi.fn(), fillText: vi.fn() }
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      canvasCtx as unknown as CanvasRenderingContext2D,
    )
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue(
      'data:image/jpeg;base64,Zm90bw==',
    )
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((input: RequestInfo | URL) => {
        const url = String(input)
        if (url.includes('/plants/identify')) {
          return Promise.resolve(new Response(JSON.stringify({
            bestMatch: 'Jacaranda mimosifolia',
            remainingIdentificationRequests: 42,
            results: [{
              score: 0.91,
              scientificName: 'Jacaranda mimosifolia',
              author: null,
              family: null,
              genus: null,
              commonNames: ['Jacaranda'],
              gbifId: null,
            }],
          }), respuestaJson))
        }
        if (url.includes('/species/')) {
          const id = Number(url.split('/species/')[1]?.split('?')[0] ?? '1')
          return Promise.resolve(new Response(JSON.stringify(detalleEspecie(id)), respuestaJson))
        }
        return Promise.resolve(new Response(JSON.stringify(catalogo), respuestaJson))
      }),
    )
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('enseña la captura en la ficha aunque el almacenamiento la rechace', async () => {
    renderWithProviders(<App />, { route: '/inicio' })
    fireEvent.click(screen.getByRole('tab', { name: /escanear e identificar/i }))
    fireEvent.click(await screen.findByRole('button', { name: /^permitir cámara$/i }))
    fireEvent.click(await screen.findByRole('button', { name: /hacer foto/i }))
    fireEvent.click(await screen.findByRole('button', { name: 'Identificar foto' }))

    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Cuota llena', 'QuotaExceededError')
    })
    fireEvent.click(await screen.findByRole('button', { name: 'Usar esta foto en la ficha' }))

    expect(await screen.findByRole('img', { name: 'Fotografía de Jacaranda' })).toHaveAttribute(
      'src',
      'data:image/jpeg;base64,Zm90bw==',
    )
    expect(localStorage.getItem(SPECIES_PHOTO_STORAGE_KEY)).toBeNull()
  })
})
