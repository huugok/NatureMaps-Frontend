import { fireEvent, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { renderWithProviders } from '../../test/renderWithProviders'
import { Components } from './Components'

describe('Components (catálogo)', () => {
  beforeEach(() => localStorage.clear())

  it('muestra el título y las secciones del catálogo', () => {
    renderWithProviders(<Components />)
    expect(screen.getByRole('heading', { name: 'Componentes' })).toBeInTheDocument()
    expect(screen.getByText('EmptyState')).toBeInTheDocument()
  })

  it('el interruptor de ejemplo cambia de estado', () => {
    renderWithProviders(<Components />)
    const sw = screen.getByRole('switch', { name: 'Ejemplo' })
    expect(sw).toHaveAttribute('aria-checked', 'true')
    fireEvent.click(sw)
    expect(sw).toHaveAttribute('aria-checked', 'false')
  })

  it('los chips se activan de uno en uno', () => {
    renderWithProviders(<Components />)
    fireEvent.click(screen.getByRole('button', { name: 'Árboles' }))
    expect(screen.getByRole('button', { name: 'Árboles' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Todas' })).toHaveAttribute('aria-pressed', 'false')
  })
})
