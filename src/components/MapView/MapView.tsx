import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MapPin } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet'
import { useApp } from '../../context/useApp'
import { Card } from '../ui/Card'
import { IconButton } from '../ui/IconButton'

// Centro de Valencia (Plaza del Ayuntamiento)
const VALENCIA_CENTER: [number, number] = [39.4699, -0.3763]

const meIcon = L.divIcon({
  className: '',
  html: '<div class="size-4 rounded-full border-[3px] border-white bg-accent shadow-[0_0_0_6px_color-mix(in_srgb,var(--color-accent)_25%,transparent)]"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
})

function LocateButton({ onPosition, onError }: { onPosition: (p: [number, number]) => void; onError: () => void }) {
  const map = useMap()
  const { t } = useApp()
  const locate = () => {
    if (!navigator.geolocation) return onError()
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const p: [number, number] = [pos.coords.latitude, pos.coords.longitude]
        onPosition(p)
        map.flyTo(p, 16)
      },
      onError,
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }
  return <IconButton icon={MapPin} label={t('map.locate')} variant="accent" className="absolute right-4 bottom-4 z-[500] shadow-float" onClick={locate} />
}

export interface MapViewProps {
  /** Marcadores u otras capas de react-leaflet. */
  children?: ReactNode
  zoom?: number
}

/** Mapa base de OpenStreetMap centrado en Valencia, con botón de "mi ubicación". */
export function MapView({ children, zoom = 14 }: MapViewProps) {
  const { t } = useApp()
  const [me, setMe] = useState<[number, number] | null>(null)
  const [error, setError] = useState(false)

  return (
    <div className="relative min-h-[300px] flex-1">
      <MapContainer center={VALENCIA_CENTER} zoom={zoom} zoomControl={false} className="absolute inset-0 bg-[#dce8d3]">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {me && <Marker position={me} icon={meIcon} />}
        {children}
        <LocateButton
          onPosition={(p) => {
            setMe(p)
            setError(false)
          }}
          onError={() => setError(true)}
        />
      </MapContainer>
      {error && (
        <Card role="alert" className="absolute inset-x-4 top-4 z-[500] text-small shadow-float">
          {t('map.locationDenied')}
        </Card>
      )}
    </div>
  )
}
