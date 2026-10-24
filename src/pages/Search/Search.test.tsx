import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderWithProviders } from '../../test/renderWithProviders'
import { Search } from './Search'

describe('Search', () => {
  it('permite escribir en el buscador', () => {
    renderWithProviders(<Search />)
    const input = screen.getByPlaceholderText('Buscar una planta…')
    fireEvent.change(input, { target: { value: 'olivo' } })
    expect(input).toHaveValue('olivo')
  })

  it('muestra el estado vacío mientras no haya catálogo', () => {
    renderWithProviders(<Search />)
    expect(screen.getByText('Aún no hay plantas disponibles')).toBeInTheDocument()
  })
})
