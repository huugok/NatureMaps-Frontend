import L from 'leaflet';
import type { RouteDetail, RouteStop } from '../../services/routes';
import type { PlantPin } from '../../types/plant';
import { createPlantIcon } from './plantMarkers';

// Dibujo del recorrido de una ruta sobre cualquier mapa Leaflet (la ficha de la
// ruta y el mapa principal comparten el mismo código). El recorrido llega
// guardado en BD (`path`), así que aquí no hay nada que calcular: solo se
// pinta la polilínea y sus paradas.
//
// Las paradas de planta usan el mismo icono que el mapa (hoja + nombre) y son
// pulsables: abren la ficha de la planta. Las de POI se pintan como un punto
// sin interacción —su ficha llegará más adelante— pero con su nombre en el
// atributo `title` del marcador, que el navegador muestra al pasar por encima.

export const ROUTE_LINE_COLOR = '#3b7ddd';

/** Icono de una parada de POI: punto de la paleta, sin hoja ni etiqueta. */
export function createPoiStopIcon(): L.DivIcon {
  return L.divIcon({
    className: 'route-stop-icon',
    html: '<span aria-hidden="true"></span>',
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

/** Icono del punto de partida: círculo de marca. */
export function createRouteStartIcon(): L.DivIcon {
  return L.divIcon({
    className: 'route-start-icon',
    html: '<span aria-hidden="true"></span>',
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

/** Convierte una parada de planta en el modelo de punto que usa el mapa. */
export function routeStopToPlantPin(stop: RouteStop): PlantPin {
  return {
    id: stop.id,
    displayName: stop.name,
    latitude: stop.latitude,
    longitude: stop.longitude,
    identified: stop.speciesId !== null && stop.speciesId !== undefined,
    speciesId: stop.speciesId ?? null,
  };
}

export interface RouteOverlayOptions {
  /** Responde al toque de una parada de planta (abre su ficha). */
  onOpenStop?: (stop: RouteStop) => void;
  /** En el mapa principal los POIs ya los pinta su propia capa; en la ficha
   * de ruta no, así que ahí sí se dibujan. */
  showPois?: boolean;
}

/**
 * Pinta el recorrido de una ruta en el mapa: polilínea, punto de partida y
 * paradas. Devuelve la capa (para quitarla) y el marcador inicial.
 */
export function addRouteOverlay(
  map: L.Map,
  route: RouteDetail,
  options: RouteOverlayOptions = {},
): L.LayerGroup {
  const layer = L.layerGroup();

  if (route.path.length >= 2) {
    L.polyline(
      route.path.map((point) => [point.latitude, point.longitude]),
      { color: ROUTE_LINE_COLOR, weight: 4, interactive: false },
    ).addTo(layer);
  }

  L.marker([route.start.latitude, route.start.longitude], {
    icon: createRouteStartIcon(),
    keyboard: false,
    interactive: false,
  }).addTo(layer);

  for (const stop of route.stops) {
    if (stop.kind === 'planta') {
      const marker = L.marker([stop.latitude, stop.longitude], {
        icon: createPlantIcon(routeStopToPlantPin(stop)),
        title: stop.name,
        alt: stop.name,
      });
      // El nombre también como tooltip: en el mapa pequeño de la ficha las
      // etiquetas de las plantas solo se ven a partir de cierto zoom.
      marker.bindTooltip(stop.name, { direction: 'top' });
      if (options.onOpenStop) marker.on('click', () => options.onOpenStop?.(stop));
      marker.addTo(layer);
      continue;
    }
    if (options.showPois === false) continue;
    // Punto de POI: visible, con su nombre al tocarlo o pasar por encima
    // (tooltip, no popup), pero sin ficha todavía —la de POI llega en una UT
    // posterior—.
    L.marker([stop.latitude, stop.longitude], {
      icon: createPoiStopIcon(),
      title: stop.name,
      alt: stop.name,
      keyboard: false,
      interactive: false,
    })
      .bindTooltip(stop.name, { direction: 'top' })
      .addTo(layer);
  }

  layer.addTo(map);
  return layer;
}

/** Encuadra el mapa en el recorrido completo, con un margen pequeño. */
export function fitRouteBounds(map: L.Map, route: RouteDetail): void {
  if (route.path.length >= 2) {
    const bounds = L.latLngBounds(route.path.map((point) => [point.latitude, point.longitude]));
    map.fitBounds(bounds.pad(0.12));
    return;
  }
  map.setView([route.start.latitude, route.start.longitude], 15);
}
