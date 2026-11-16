import L from 'leaflet';
import type { GeoJsonObject } from 'geojson';
import type { GreenArea } from '../../types/greenArea';

// Capa de zonas verdes del mapa (NM-08, PA 3011). Pinta el contorno de cada
// parque o jardín, sin relleno opaco, para no tapar ni el mapa base ni los
// marcadores de plantas. Lo que se ve depende del zoom:
//   - vista de ciudad: un punto discreto por parque;
//   - vista de barrio: el contorno;
//   - vista de parque: contorno y nombre.
// La zona seleccionada se resalta siempre, a cualquier zoom.

/** Zoom a partir del cual se dibuja el contorno en lugar del punto. */
export const GREEN_AREA_OUTLINE_MIN_ZOOM = 14;
/** Zoom a partir del cual se escribe el nombre del parque. */
export const GREEN_AREA_LABEL_MIN_ZOOM = 16;

const PANE = 'green-areas';

export interface GreenAreaPopupText {
  /** Texto del botón que abre la ficha de la zona. */
  open: string;
}

export interface GreenAreasLayerOptions {
  /** Abre la ficha de la zona tocada. */
  onOpen: (groupSlug: string) => void;
  text: GreenAreaPopupText;
}

export interface GreenAreasLayer {
  /** Resalta todos los polígonos de un parque (o ninguno con null). */
  select: (groupSlug: string | null) => void;
  /** Encuadra el mapa en un parque. Devuelve false si no está en la capa. */
  fit: (groupSlug: string) => boolean;
  remove: () => void;
}

function popupContent(area: GreenArea, options: GreenAreasLayerOptions): HTMLElement {
  // DOM y textContent, nunca HTML: los nombres vienen de datos abiertos externos.
  const root = document.createElement('div');
  root.className = 'green-area-popup';
  const title = document.createElement('strong');
  title.textContent = area.groupName;
  root.append(title);
  if (area.typology) {
    const typology = document.createElement('span');
    typology.textContent = area.typology;
    root.append(typology);
  }
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = options.text.open;
  button.addEventListener('click', () => options.onOpen(area.groupSlug));
  root.append(button);
  return root;
}

function labelIcon(name: string): L.DivIcon {
  const label = document.createElement('span');
  label.className = 'green-area-label__text';
  label.textContent = name;
  return L.divIcon({ className: 'green-area-label', html: label, iconSize: [0, 0] });
}

/**
 * Añade la capa al mapa. Va en un pane propio por debajo de los marcadores
 * (600) y del área de grupo de plantas (400), así nunca intercepta un toque
 * dirigido a una planta.
 */
export function addGreenAreasLayer(map: L.Map, areas: GreenArea[], options: GreenAreasLayerOptions): GreenAreasLayer {
  if (!map.getPane(PANE)) {
    const pane = map.createPane(PANE);
    pane.style.zIndex = '350';
  }

  const outlines = L.layerGroup();
  const dots = L.layerGroup();
  const labels = L.layerGroup();
  const selectedOutlines = L.layerGroup().addTo(map);
  const byGroup = new Map<string, Array<{ area: GreenArea; outline: L.GeoJSON | null }>>();
  const labelled = new Set<string>();
  let selected: string | null = null;

  for (const area of areas) {
    const center: L.LatLngExpression = [area.center.latitude, area.center.longitude];
    const popup = () => popupContent(area, options);
    let outline: L.GeoJSON | null = null;
    if (area.geometry) {
      outline = L.geoJSON(area.geometry as GeoJsonObject, {
        pane: PANE,
        style: { className: 'green-area-outline' },
      });
      outline.bindPopup(popup, { closeButton: false, autoPan: false });
      outline.addTo(outlines);
    }
    // Un solo punto y un solo nombre por parque, aunque tenga varios polígonos:
    // el primero de la lista es el mayor (el backend ordena por superficie).
    if (!labelled.has(area.groupSlug)) {
      labelled.add(area.groupSlug);
      L.circleMarker(center, { pane: PANE, radius: 5, className: 'green-area-dot' })
        .bindPopup(popup, { closeButton: false, autoPan: false })
        .addTo(dots);
      L.marker(center, { pane: PANE, icon: labelIcon(area.groupName), keyboard: false, interactive: false })
        .addTo(labels);
    }
    const members = byGroup.get(area.groupSlug) ?? [];
    members.push({ area, outline });
    byGroup.set(area.groupSlug, members);
  }

  const toggle = (layer: L.LayerGroup, visible: boolean) => {
    if (visible && !map.hasLayer(layer)) layer.addTo(map);
    if (!visible && map.hasLayer(layer)) layer.remove();
  };

  const sync = () => {
    const zoom = map.getZoom();
    toggle(dots, zoom < GREEN_AREA_OUTLINE_MIN_ZOOM);
    toggle(outlines, zoom >= GREEN_AREA_OUTLINE_MIN_ZOOM);
    toggle(labels, zoom >= GREEN_AREA_LABEL_MIN_ZOOM);
  };
  sync();
  map.on('zoomend', sync);

  const select = (groupSlug: string | null) => {
    selected = groupSlug;
    selectedOutlines.clearLayers();
    if (selected === null) return;
    for (const { area } of byGroup.get(selected) ?? []) {
      if (!area.geometry) continue;
      // Copia resaltada aparte: se ve también en vista de ciudad, donde el
      // contorno normal está oculto.
      L.geoJSON(area.geometry as GeoJsonObject, {
        pane: PANE,
        interactive: false,
        style: { className: 'green-area-outline green-area-outline--selected' },
      }).addTo(selectedOutlines);
    }
  };

  const fit = (groupSlug: string) => {
    const members = byGroup.get(groupSlug);
    if (!members || members.length === 0) return false;
    const bounds = L.latLngBounds([]);
    for (const { area } of members) {
      bounds.extend([area.bbox[1], area.bbox[0]]);
      bounds.extend([area.bbox[3], area.bbox[2]]);
    }
    map.fitBounds(bounds, { padding: [32, 96], maxZoom: 17 });
    return true;
  };

  return {
    select,
    fit,
    remove: () => {
      map.off('zoomend', sync);
      for (const layer of [outlines, dots, labels, selectedOutlines]) layer.remove();
    },
  };
}
