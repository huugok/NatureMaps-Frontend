import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { MapView } from './MapView'

// Leaflet necesita un navegador real: en los tests sustituimos react-leaflet por maquetas.
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children, center }: { children: ReactNode; center: [number, number] }) => (
    <div data-testid="mapa" data-center={center.join(',')}>
      {children}
    </div>
  ),
  TileLayer: () => null,
}))

describe('MapView', () => {
  it('muestra el mapa centrado en Valencia, sin geolocalización', () => {
    render(<MapView />)
    expect(screen.getByTestId('mapa')).toHaveAttribute('data-center', '39.4699,-0.3763')
    expect(screen.queryByRole('button', { name: 'Mi ubicación' })).not.toBeInTheDocument()
  })

  it('admite un centro inicial', () => {
    render(<MapView initialCenter={[40, -1]} />)
    expect(screen.getByTestId('mapa')).toHaveAttribute('data-center', '40,-1')
  })
})
