import L from 'leaflet';
import type { GreenArea } from '../../types/greenArea';
import type { PlantPin } from '../../types/plant';

// Agrupación de plantas por parque (NM-08). En un parque grande el inventario
// tiene cientos de ejemplares: a poco zoom sus marcadores se solapan entre sí,
// tapan el contorno de la zona y dejan el mapa ilegible. Hasta el zoom de
// parque se pinta un solo marcador por zona verde, con su nombre y el total de
// ejemplares que el inventario registra dentro; al acercarse, cada planta
// vuelve a tener el suyo.

/**
 * Zoom a partir del cual se ven los ejemplares uno a uno. Es 17 y no 16
 * porque al seguir al usuario el mapa se centra en él con zoom 16: con el
 * umbral en 16 no se agruparía nunca con la ubicación concedida.
 */
export const PARK_CLUSTER_MAX_ZOOM = 17;

export interface ParkCluster {
  /** Identificador legible del parque, para abrir su ficha. */
  groupSlug: string;
  name: string;
  latitude: number;
  longitude: number;
  /** Ejemplares del parque que hay cargados ahora mismo en el mapa. */
  shown: number;
  /** Ejemplares que el inventario registra dentro del parque, si se conoce. */
  total: number | null;
}

export interface ClusterResult {
  clusters: ParkCluster[];
  /** Plantas que se siguen pintando una a una (fuera de cualquier zona verde). */
  loose: PlantPin[];
  /** Ejemplares de cada zona, para subdividirlos según el zoom. */
  membersByGroup: Map<string, PlantPin[]>;
}

/**
 * Reparte las plantas entre los parques que las contienen y las que quedan
 * sueltas. Una planta sin zona, o cuya zona no está en la capa, se queda
 * suelta: nunca se oculta un ejemplar por no saber dónde agruparlo.
 *
 * El marcador del parque se coloca en el centro que publica el Ayuntamiento, no
 * en el promedio de las plantas cargadas, para que no se mueva según lo que se
 * haya descargado.
 */
export function clusterPlantsByPark(plants: PlantPin[], areas: GreenArea[]): ClusterResult {
  const areaById = new Map(areas.map((area) => [area.id, area]));
  const clusters = new Map<string, ParkCluster>();
  const loose: PlantPin[] = [];
  const membersByGroup = new Map<string, PlantPin[]>();

  for (const plant of plants) {
    const area = plant.greenAreaId == null ? undefined : areaById.get(plant.greenAreaId);
    if (!area) {
      loose.push(plant);
      continue;
    }
    const members = membersByGroup.get(area.groupSlug);
    if (members) members.push(plant);
    else membersByGroup.set(area.groupSlug, [plant]);
    const existing = clusters.get(area.groupSlug);
    if (existing) {
      existing.shown += plant.count ?? 1;
      continue;
    }
    clusters.set(area.groupSlug, {
      groupSlug: area.groupSlug,
      name: area.groupName,
      latitude: area.center.latitude,
      longitude: area.center.longitude,
      shown: plant.count ?? 1,
      total: null,
    });
  }

  // Total del parque: la suma de todos sus polígonos, no la del que contiene
  // la primera planta (el Jardín del Turia tiene dieciocho tramos).
  const totals = new Map<string, number>();
  for (const area of areas) {
    if (area.plants === undefined) continue;
    totals.set(area.groupSlug, (totals.get(area.groupSlug) ?? 0) + area.plants);
  }
  for (const cluster of clusters.values()) {
    cluster.total = totals.get(cluster.groupSlug) ?? null;
  }

  return { clusters: [...clusters.values()], loose, membersByGroup };
}

export interface ParkMarkersText {
  /** Etiqueta accesible del marcador: nombre del parque y número de ejemplares. */
  label: (cluster: ParkCluster) => string;
}

/**
 * Pinta un marcador por parque. Va en el pane de marcadores, como las plantas,
 * para que quede por encima del contorno de la zona.
 */
export function addParkMarkers(
  map: L.Map,
  clusters: ParkCluster[],
  onOpen: (groupSlug: string) => void,
  text: ParkMarkersText,
): L.LayerGroup {
  const layer = L.layerGroup();
  for (const cluster of clusters) {
    const label = text.label(cluster);
    // Sin encadenar: `on` no devuelve el marcador en todas las versiones.
    const marker = L.marker([cluster.latitude, cluster.longitude], {
      icon: parkIcon(cluster),
      title: label,
      alt: label,
    });
    marker.on('click', () => onOpen(cluster.groupSlug));
    marker.addTo(layer);
  }
  return layer.addTo(map);
}

function treeIcon(): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', '18');
  svg.setAttribute('height', '18');
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', 'M12 2.5 6.5 9h3L5 15h5.2v6.5h3.6V15H19l-4.5-6h3L12 2.5Z');
  path.setAttribute('fill', 'currentColor');
  svg.appendChild(path);
  return svg;
}

/** Icono del parque: árbol, recuento y nombre, como texto y nunca como HTML. */
function parkIcon(cluster: ParkCluster): L.DivIcon {
  const root = document.createElement('span');
  root.className = 'park-pin';

  const badge = document.createElement('span');
  badge.className = 'park-pin__icon';
  badge.appendChild(treeIcon());
  root.append(badge);

  const count = cluster.total ?? cluster.shown;
  if (count > 1) {
    const counter = document.createElement('span');
    counter.className = 'park-pin__count';
    counter.textContent = String(count);
    root.append(counter);
  }

  const name = document.createElement('span');
  name.className = 'park-pin__label';
  name.textContent = cluster.name;
  root.append(name);

  return L.divIcon({ className: 'park-icon', html: root, iconSize: [30, 30], iconAnchor: [15, 15] });
}
