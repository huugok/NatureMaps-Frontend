import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { RouteDetail } from '../../services/routes';

// Mapa de la ficha de ruta: el recorrido (`path`, ya guardado en BD) como
// polilínea, el punto de partida y las paradas como marcadores (verdes las
// plantas, ámbar los POIs). Se pinta todo al montar y se limpia al desmontar;
// sin interacción con el catálogo: es solo presentación.

const STOP_COLORS: Record<RouteDetail['stops'][number]['kind'], string> = {
  planta: '#3a7d44',
  poi: '#c77d1f',
};

function stopIcon(kind: 'planta' | 'poi', label: string) {
  return L.divIcon({
    className: 'route-stop-icon',
    html: `<span aria-hidden="true" style="background:${STOP_COLORS[kind]}">${label}</span>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}

export function RouteMap({ route }: { route: RouteDetail }) {
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    const element = mapElementRef.current;
    if (!element) return;

    const map = L.map(element, {
      zoomControl: false,
      attributionControl: false,
    });
    mapRef.current = map;
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    const layer = L.layerGroup().addTo(map);
    layerRef.current = layer;

    // Recorrido completo como polilínea; el `path` va del inicio al final.
    if (route.path.length >= 2) {
      const line = L.polyline(
        route.path.map((point) => [point.latitude, point.longitude]),
        { color: '#3b7ddd', weight: 4, interactive: false },
      ).addTo(layer);
      map.fitBounds(line.getBounds().pad(0.15));
    } else {
      map.setView([route.start.latitude, route.start.longitude], 15);
    }

    // Punto de partida y paradas, numeradas en el orden del recorrido.
    L.marker([route.start.latitude, route.start.longitude], {
      icon: L.divIcon({
        className: 'route-stop-icon',
        html: '<span aria-hidden="true" style="background:#3b7ddd">★</span>',
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      }),
      keyboard: false,
    }).addTo(layer);
    route.stops.forEach((stop, index) => {
      L.marker([stop.latitude, stop.longitude], {
        icon: stopIcon(stop.kind, String(index + 1)),
        keyboard: false,
      }).addTo(layer);
    });

    return () => {
      layer.remove();
      layerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, [route]);

  return <div ref={mapElementRef} className="h-full w-full" role="img" aria-label={route.name} />;
}
