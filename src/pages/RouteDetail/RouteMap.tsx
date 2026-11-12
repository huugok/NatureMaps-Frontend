import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { RouteDetail, RouteStop } from '../../services/routes';
import { addRouteOverlay, fitRouteBounds } from '../Map/routeOverlay';

// Mapa de la ficha de ruta: el recorrido (`path`, ya guardado en BD) como
// polilínea y las paradas con los mismos puntos que usa el mapa principal (las
// plantas, con su icono de hoja, se pulsan y abren su ficha). Se pinta al
// montar y se limpia al desmontar; sin interacción con el catálogo: es solo
// presentación.

export interface RouteMapProps {
  route: RouteDetail;
  /** Responde al toque de una parada (abre su ficha). */
  onOpenStop?: (stop: RouteStop) => void;
}

export function RouteMap({ route, onOpenStop }: RouteMapProps) {
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

    const layer = addRouteOverlay(map, route, { onOpenStop });
    layerRef.current = layer;
    fitRouteBounds(map, route);

    return () => {
      layer.remove();
      layerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, [route, onOpenStop]);

  return <div ref={mapElementRef} className="h-full w-full" role="img" aria-label={route.name} />;
}
