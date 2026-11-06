import { fireEvent, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { checkHealth } from '../../services/api'
import { renderWithProviders } from '../../test/renderWithProviders'
import { Settings } from './Settings'

vi.mock('../../services/api', () => ({ checkHealth: vi.fn() }))

const onBack = vi.fn()

describe('Settings', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.mocked(checkHealth).mockReset()
  })

  it('enlaza al cambio de modo y al catálogo', async () => {
    vi.mocked(checkHealth).mockResolvedValue(true)
    renderWithProviders(<Settings language="es" onBack={onBack} />)
    expect(screen.getByRole('link', { name: /cambiar de modo/i })).toHaveAttribute('href', '/modo')
    expect(screen.getByRole('link', { name: /catálogo de componentes/i })).toHaveAttribute('href', '/componentes')
    await screen.findByText('Conectado')
  })

  it('muestra el idioma recibido y enlaza al selector', async () => {
    vi.mocked(checkHealth).mockResolvedValue(true)
    renderWithProviders(<Settings language="va" onBack={onBack} />)
    const link = screen.getByRole('link', { name: /idioma/i })
    expect(link).toHaveAttribute('href', '/ajustes/idioma')
    expect(screen.getByText('Valencià')).toBeInTheDocument()
    await screen.findByText('Conectado')
  })

  it('muestra el modo actual como subtítulo', async () => {
    localStorage.setItem('naturemaps:prefs', JSON.stringify({ mode: 'educativo' }))
    vi.mocked(checkHealth).mockResolvedValue(true)
    renderWithProviders(<Settings language="es" onBack={onBack} />)
    expect(screen.getByText('Grupo escolar')).toBeInTheDocument()
    await screen.findByText('Conectado')
  })

  it('indica si el servidor no responde', async () => {
    vi.mocked(checkHealth).mockResolvedValue(false)
    renderWithProviders(<Settings language="es" onBack={onBack} />)
    expect(screen.getByText('Comprobando…')).toBeInTheDocument()
    expect(await screen.findByText('Sin conexión')).toBeInTheDocument()
  })

  it('guarda el radio de plantas cercanas al mover el deslizador', () => {
    vi.mocked(checkHealth).mockResolvedValue(true)
    renderWithProviders(<Settings language="es" onBack={onBack} />)

    const slider = screen.getByLabelText('Radio para mostrar plantas cercanas (excepto en modo aventura)')
    expect(slider).toHaveValue('1000')
    expect(screen.getByText('1 km')).toBeInTheDocument()

    fireEvent.change(slider, { target: { value: '2500' } })

    expect(localStorage.getItem('naturemaps:radius')).toBe('2500')
    expect(screen.getByText('2,5 km')).toBeInTheDocument()
  })

  it('recupera el radio guardado y lo muestra formateado', async () => {
    localStorage.setItem('naturemaps:radius', '700')
    vi.mocked(checkHealth).mockResolvedValue(true)
    renderWithProviders(<Settings language="es" onBack={onBack} />)

    expect(screen.getByLabelText('Radio para mostrar plantas cercanas (excepto en modo aventura)')).toHaveValue('700')
    expect(screen.getByText('700 m')).toBeInTheDocument()
    await screen.findByText('Conectado')
  })
})
