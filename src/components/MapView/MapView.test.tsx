import { fireEvent, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../test/renderWithProviders'
import { MapView } from './MapView'

// Leaflet necesita un navegador real: en los tests sustituimos react-leaflet por maquetas.
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children: ReactNode }) => <div data-testid="mapa">{children}</div>,
  TileLayer: () => null,
  Marker: () => null,
  useMap: () => ({ flyTo: vi.fn() }),
}))

describe('MapView', () => {
  it('muestra el mapa y el botón de ubicación', () => {
    renderWithProviders(<MapView />)
    expect(screen.getByTestId('mapa')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Mi ubicación' })).toBeInTheDocument()
  })

  it('avisa si el navegador no puede dar la ubicación', () => {
    renderWithProviders(<MapView />)
    fireEvent.click(screen.getByRole('button', { name: 'Mi ubicación' }))
    expect(screen.getByRole('alert')).toHaveTextContent('No se ha podido obtener tu ubicación')
  })
})
