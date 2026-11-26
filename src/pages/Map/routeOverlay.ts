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
// pulsables: abren la ficha de la planta. Los POIs se pintan como un punto; en
// la ficha de ruta también son pulsables cuando hay una ficha guardada, mientras
// que en el mapa principal siguen siendo solo visuales.

export const ROUTE_LINE_COLOR = '#3b7ddd';

/** Icono de una parada de POI: punto de la paleta, sin hoja ni etiqueta. */
export function createPoiStopIcon(): L.DivIcon {
  return L.divIcon({
    className: 'route-stop-icon',
    html: '<span aria-hidden="true"></span>',
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  });
}

/** Icono de una parada patrocinada: mismo punto que el POI pero en rosa/morado. */
export function createSponsorStopIcon(): L.DivIcon {
  return L.divIcon({
    className: 'route-stop-icon--sponsor',
    html: '<span aria-hidden="true"></span>',
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  });
}

/** Icono numerado de una parada: superpone el número al icono base sin tapar
 *  la hoja ni el distintivo de patrocinio. El número entra en la secuencia
 *  global de la ruta, también para las paradas publicitarias (PA 2856/2858). */
export function createNumberedStopIcon(stop: RouteStop, index: number): L.DivIcon {
  const base = stop.kind === 'planta'
    ? createPlantIcon(routeStopToPlantPin(stop))
    : stop.kind === 'sponsor' ? createSponsorStopIcon() : createPoiStopIcon();
  const root = document.createElement('span');
  root.className = `route-stop route-stop--${stop.kind}`;
  const html = base.options?.html;
  if (typeof html === 'string') root.innerHTML = html;
  else if (html instanceof HTMLElement) root.append(html.cloneNode(true));
  const number = document.createElement('span');
  number.className = 'route-stop__number';
  number.textContent = String(index + 1);
  root.append(number);
  if (stop.kind === 'sponsor') {
    const badge = document.createElement('span');
    badge.className = 'route-stop__sponsor';
    badge.textContent = '★';
    root.append(badge);
  }
  return L.divIcon({
    className: `route-stop-${stop.kind}`,
    html: root,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
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
  /** En la ficha de ruta, los POIs descargados también abren su ficha guardada. */
  openPoiStops?: boolean;
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

  for (const [index, stop] of route.stops.entries()) {
    const label = `${index + 1}. ${stop.name}`;
    const poiInteractive = stop.kind === 'poi' && options.openPoiStops === true && options.onOpenStop !== undefined;
    const marker = L.marker([stop.latitude, stop.longitude], {
      icon: createNumberedStopIcon(stop, index),
      title: label,
      alt: label,
      keyboard: stop.kind !== 'poi' || poiInteractive,
      interactive: stop.kind !== 'poi' || poiInteractive,
    }).bindTooltip(label, { direction: 'top' });
    if (stop.kind === 'planta' && options.onOpenStop) {
      marker.on('click', () => options.onOpenStop?.(stop));
    }
    if (poiInteractive) {
      marker.on('click', () => options.onOpenStop?.(stop));
    } else if (stop.kind === 'poi' || stop.kind === 'sponsor') {
      // En móvil el toque (y el gesto largo) abre la etiqueta, igual que el
      // hover en escritorio: no hay ficha, solo el nombre del comercio.
      marker.on('click', () => marker.openTooltip());
    }
    marker.addTo(layer);
  }

  layer.addTo(map);
  return layer;
}

/** Encuadra el mapa en el recorrido completo, con un margen pequeño. */
export function fitRouteBounds(map: L.Map, route: RouteDetail): void {
  if (route.path.length >= 2) {
    const bounds = L.latLngBounds(route.path.map((point) => [point.latitude, point.longitude]));
    // Al cambiar de pantalla no dejamos una transición de zoom pendiente:
    // Leaflet 1.x puede terminarla después de desmontar el contenedor.
    map.fitBounds(bounds.pad(0.12), { animate: false });
    return;
  }
  map.setView([route.start.latitude, route.start.longitude], 15, { animate: false });
}
