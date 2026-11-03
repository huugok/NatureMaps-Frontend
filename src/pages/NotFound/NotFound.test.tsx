import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderWithProviders } from '../../test/renderWithProviders'
import { NotFound } from './NotFound'

describe('NotFound', () => {
  it('avisa y ofrece volver al inicio', () => {
    renderWithProviders(<NotFound />)
    expect(screen.getByText('Pantalla no encontrada')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ir al inicio' })).toHaveAttribute('href', '/inicio')
  })
})
