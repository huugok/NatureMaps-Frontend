import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../test/renderWithProviders'
import { MapScreen } from './MapScreen'

vi.mock('../../components/MapView', () => ({ MapView: () => <div data-testid="mapa" /> }))

describe('MapScreen', () => {
  it('muestra el título y el mapa', () => {
    renderWithProviders(<MapScreen />)
    expect(screen.getByRole('heading', { name: 'Mapa' })).toBeInTheDocument()
    expect(screen.getByTestId('mapa')).toBeInTheDocument()
  })
})
