import 'leaflet/dist/leaflet.css'
import type { ReactNode } from 'react'
import { MapContainer, TileLayer } from 'react-leaflet'

// Centro de Valencia (Plaza del Ayuntamiento)
const VALENCIA_CENTER: [number, number] = [39.4699, -0.3763]

export interface MapViewProps {
  /** Marcadores u otras capas de react-leaflet. */
  children?: ReactNode
  zoom?: number
  /** Centro inicial del mapa. Por defecto, el centro de Valencia. */
  initialCenter?: [number, number]
}

/**
 * Mapa base de OpenStreetMap centrado en Valencia.
 * La geolocalización del usuario pertenece a RNF7 y no está en esta PR.
 */
export function MapView({ children, zoom = 14, initialCenter = VALENCIA_CENTER }: MapViewProps) {
  return (
    <div className="relative min-h-[300px] flex-1">
      <MapContainer center={initialCenter} zoom={zoom} zoomControl={false} className="absolute inset-0 bg-[#dce8d3]">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {children}
      </MapContainer>
    </div>
  )
}
