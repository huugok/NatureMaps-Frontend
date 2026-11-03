import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderWithProviders } from '../../test/renderWithProviders'
import { RoutesList } from './RoutesList'

describe('RoutesList', () => {
  it('muestra el estado vacío mientras no haya rutas', () => {
    renderWithProviders(<RoutesList />)
    expect(screen.getByRole('heading', { name: 'Rutas' })).toBeInTheDocument()
    expect(screen.getByText('Aún no hay rutas')).toBeInTheDocument()
  })
})
