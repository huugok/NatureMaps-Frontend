import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { RouteDetail, RouteStop } from '../../services/routes';
import { addRouteOverlay, fitRouteBounds } from '../Map/routeOverlay';
import { addOfflineTileLayer } from '../Map/offlineTileLayer';

// Mapa de la ficha de ruta: el recorrido (`path`, ya guardado en BD) como
// polilínea y las paradas con los mismos puntos que usa el mapa principal (las
// plantas, con su icono de hoja, se pulsan y abren su ficha). Se pinta al
// montar y se limpia al desmontar; sin interacción con el catálogo: es solo
// presentación.

export interface RouteMapProps {
  route: RouteDetail;
  /** Responde al toque de una parada (abre su ficha). */
  onOpenStop?: (stop: RouteStop) => void;
  /** Los POIs solo abren su ficha guardada cuando hay una descarga local. */
  openPoiStops?: boolean;
}

export function RouteMap({ route, onOpenStop, openPoiStops = false }: RouteMapProps) {
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const onOpenStopRef = useRef(onOpenStop);

  useEffect(() => {
    onOpenStopRef.current = onOpenStop;
  }, [onOpenStop]);

  useEffect(() => {
    const element = mapElementRef.current;
    if (!element) return;

    const map = L.map(element, {
      zoomControl: false,
      attributionControl: true,
    });
    mapRef.current = map;
    addOfflineTileLayer(map);

    const layer = addRouteOverlay(map, route, {
      onOpenStop: (stop) => onOpenStopRef.current?.(stop),
      openPoiStops,
    });
    layerRef.current = layer;
    fitRouteBounds(map, route);

    return () => {
      layer.remove();
      layerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, [route, openPoiStops]);

  return <div ref={mapElementRef} className="h-full w-full bg-surface-2" role="img" aria-label={route.name} />;
}
