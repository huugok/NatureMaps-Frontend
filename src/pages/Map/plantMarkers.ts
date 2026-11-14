import L from 'leaflet';
import type { PlantPin } from '../../types/plant';

// Marcadores de plantas del mapa (F03.1). Cada planta lleva su propio icono (una
// hoja) y su nombre escrito al lado, distintos de los puntos de ubicación del
// usuario y del lugar buscado. El estilo vive en `index.css` (`.plant-pin`).

const SVG_NS = 'http://www.w3.org/2000/svg';

function leafIcon(): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', '18');
  svg.setAttribute('height', '18');
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', 'M20 4C10 4 4 9 4 16c0 1.5.4 2.9 1.1 4C6.5 14 11 11 16 10c-4 2-7 5-8.5 10.5C16 20 20 13 20 4Z');
  path.setAttribute('fill', 'currentColor');
  svg.appendChild(path);
  return svg;
}

/**
 * Icono de una planta: hoja + nombre. El nombre se inserta como texto (nunca como
 * HTML) porque viene de datos abiertos externos. Las plantas sin especie asociada
 * usan una variante apagada para distinguirlas de las identificadas. Los grupos
 * del mismo tipo (RF2) llevan una pastilla con el recuento de ejemplares.
 */
export function createPlantIcon(pin: PlantPin): L.DivIcon {
  const root = document.createElement('span');
  root.className = pin.identified ? 'plant-pin' : 'plant-pin plant-pin--unidentified';

  const badge = document.createElement('span');
  badge.className = 'plant-pin__icon';
  badge.appendChild(leafIcon());

  root.append(badge);
  if (pin.count !== undefined && pin.count > 1) {
    const count = document.createElement('span');
    count.className = 'plant-pin__count';
    count.textContent = String(pin.count);
    root.append(count);
  }

  const label = document.createElement('span');
  label.className = 'plant-pin__label';
  label.textContent = pin.displayName;

  root.append(label);
  return L.divIcon({
    className: 'plant-icon',
    html: root,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

/** Zoom a partir del cual se escribe el nombre junto al icono. */
export const PLANT_LABEL_MIN_ZOOM = 16;

/** Dibuja las plantas en una capa propia y devuelve la capa. `popupFor` permite
 * añadir un popup por marcador (vía cercanas: nombre y distancia) y
 * `onOpenPlant` responde al toque de un marcador: abre su ficha (F03.1) y, en
 * los grupos RF2, pinta además el área que ocupan. */
export function addPlantMarkers(
  map: L.Map,
  pins: PlantPin[],
  popupFor?: (pin: PlantPin) => string | undefined,
  onOpenPlant?: (pin: PlantPin) => boolean,
): L.LayerGroup {
  const layer = L.layerGroup();
  for (const pin of pins) {
    const marker = L.marker([pin.latitude, pin.longitude], {
      icon: createPlantIcon(pin),
      title: pin.displayName,
      alt: pin.displayName,
    });
    const popup = popupFor?.(pin);
    if (!onOpenPlant && popup) marker.bindPopup(popup, { closeButton: false, autoPan: false });
    if (onOpenPlant) marker.on('click', () => {
      const hasFicha = onOpenPlant(pin);
      if (!hasFicha && popup) marker.bindPopup(popup, { closeButton: false, autoPan: false }).openPopup();
    });
    marker.addTo(layer);
  }
  return layer.addTo(map);
}
