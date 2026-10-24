import { fireEvent, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { renderWithProviders } from './test/renderWithProviders'

vi.mock('./components/MapView', () => ({ MapView: () => <div data-testid="mapa" /> }))
vi.mock('./services/api', () => ({ checkHealth: vi.fn().mockResolvedValue(true) }))

describe('App', () => {
  beforeEach(() => localStorage.clear())

  it('sin modo elegido empieza en la selección de modo', () => {
    renderWithProviders(<App />)
    expect(screen.getByRole('heading', { name: /cómo quieres explorar valencia/i })).toBeInTheDocument()
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
  })

  it('con modo elegido empieza en inicio, con la barra inferior', () => {
    localStorage.setItem('naturemaps:prefs', JSON.stringify({ mode: 'esencial' }))
    renderWithProviders(<App />)
    expect(screen.getByRole('heading', { name: 'Hola, explorador' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /ir a inicio/i })).toHaveAttribute('aria-selected', 'true')
  })

  it('el mapa se carga bajo demanda al entrar en la pestaña', async () => {
    localStorage.setItem('naturemaps:prefs', JSON.stringify({ mode: 'esencial' }))
    renderWithProviders(<App />, { route: '/inicio' })
    fireEvent.click(screen.getByRole('tab', { name: /ver mapa/i }))
    expect(await screen.findByTestId('mapa')).toBeInTheDocument()
  })

  it('flujo de idioma: desde Ajustes se cambia y toda la app se traduce al instante', async () => {
    localStorage.setItem('naturemaps:prefs', JSON.stringify({ mode: 'esencial' }))
    renderWithProviders(<App />, { entries: ['/inicio', '/ajustes'], index: 1 })
    fireEvent.click(screen.getByRole('link', { name: /idioma/i }))
    fireEvent.click(screen.getByRole('button', { name: 'English' }))
    expect(localStorage.getItem('naturemaps.language')).toBe('en')
    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    expect(await screen.findByRole('heading', { name: 'Settings' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /language/i })).toHaveTextContent('English')
    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    expect(screen.getByRole('heading', { name: 'Hi, explorer' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Go to Home' })).toHaveTextContent('Home')
  })

  it('una ruta desconocida muestra el 404', () => {
    renderWithProviders(<App />, { route: '/nada' })
    expect(screen.getByText('Pantalla no encontrada')).toBeInTheDocument()
  })
})
