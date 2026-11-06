import type { PlantPin } from '../types/plant';

/**
 * Agrupación de plantas cercanas del mismo tipo (RF2). El inventario urbano
 * planta filas alineadas (p. ej. plátanos de sombra híbridos cada pocos
 * metros) y pintar cada ejemplar satura el mapa. De cada masa del mismo tipo
 * se pinta UN marcador con el recuento y, al seleccionarlo, el área que
 * ocupan sus miembros.
 */

// Dos plantas del mismo tipo pertenecen al mismo grupo si se puede ir de una
// a otra por saltos de como máximo esta distancia (encadenado): una fila
// continua forma un grupo y dos masas separadas no.
const GROUP_LINK_METERS = 100;
// Holgura sobre el miembro más alejado del centro al pintar el área.
const GROUP_AREA_PADDING = 1.3;
// Radio mínimo del área para que los grupos apretados se vean.
const GROUP_AREA_MIN_METERS = 30;

interface Point {
  latitude: number;
  longitude: number;
}

/** Distancia en línea recta entre dos puntos (aproximación plana, suficiente a escala urbana). */
export function metersBetween(a: Point, b: Point): number {
  const dLat = (b.latitude - a.latitude) * 111_320;
  const dLon = (b.longitude - a.longitude) * 111_320 * Math.max(Math.cos((a.latitude * Math.PI) / 180), 0.01);
  return Math.hypot(dLat, dLon);
}

/** Área que ocupa un grupo: centro y radio del círculo que la pinta. */
export interface GroupArea {
  center: Point;
  radius: number;
}

export interface GroupedPlants {
  /** Marcadores a pintar: plantas sueltas tal cual y un pin por grupo (con `count`). */
  pins: PlantPin[];
  /** Área de cada grupo, indexada por el id del pin que lo representa. */
  areasById: Map<number, GroupArea>;
  /** Área de cada grupo indexada por el id de CUALQUIER miembro: así «Ver en
   * el mapa» (ficha) encuentra el área del grupo aunque el ejemplar más
   * cercano no sea el que representa al grupo. */
  areaByMemberId: Map<number, GroupArea>;
}

/** Agrupa una lista ORDENADA por distancia (como la devuelve el backend en
 * `/trees/nearby`) por nombre mostrado, conservando el orden de primera
 * aparición: la primera especie del resultado es la más cercana. La usan el
 * mapa y Buscar (desplegables por especie). */
export function groupBySpecies<T extends { displayName: string }>(
  plants: T[],
): Array<{ name: string; specimens: T[] }> {
  const byName = new Map<string, T[]>();
  for (const plant of plants) {
    const bucket = byName.get(plant.displayName);
    if (bucket) bucket.push(plant);
    else byName.set(plant.displayName, [plant]);
  }
  return Array.from(byName, ([name, specimens]) => ({ name, specimens }));
}

/** Agrupa las plantas cercanas por tipo (su nombre mostrado) y proximidad.
 * Las plantas sueltas pasan tal cual; cada grupo se representa con un único
 * pin (el del miembro más próximo al origen de la búsqueda) con `count` y
 * `distance` del más cercano, y su área en `areasById`. El coste cuadrático
 * por tipo es asumible: el backend devuelve como máximo 1000 plantas. */
export function groupNearbyPlants(pins: PlantPin[]): GroupedPlants {
  const byType = new Map<string, PlantPin[]>();
  for (const pin of pins) {
    const bucket = byType.get(pin.displayName);
    if (bucket) bucket.push(pin);
    else byType.set(pin.displayName, [pin]);
  }

  const markers: PlantPin[] = [];
  const areasById = new Map<number, GroupArea>();
  const areaByMemberId = new Map<number, GroupArea>();
  for (const members of byType.values()) {
    if (members.length === 1) {
      markers.push(members[0]);
      continue;
    }
    // Grupos por encadenado dentro del tipo: vecinos a <= GROUP_LINK_METERS.
    const visited = new Array<boolean>(members.length).fill(false);
    for (let i = 0; i < members.length; i++) {
      if (visited[i]) continue;
      const cluster: PlantPin[] = [];
      const pending = [members[i]];
      visited[i] = true;
      while (pending.length > 0) {
        const current = pending.pop()!;
        cluster.push(current);
        for (let j = 0; j < members.length; j++) {
          if (!visited[j] && metersBetween(current, members[j]) <= GROUP_LINK_METERS) {
            visited[j] = true;
            pending.push(members[j]);
          }
        }
      }
      if (cluster.length === 1) {
        markers.push(cluster[0]);
        continue;
      }
      const center = {
        latitude: cluster.reduce((sum, member) => sum + member.latitude, 0) / cluster.length,
        longitude: cluster.reduce((sum, member) => sum + member.longitude, 0) / cluster.length,
      };
      const nearest = Math.min(...cluster.map((member) => member.distance ?? Number.POSITIVE_INFINITY));
      const group: PlantPin = {
        id: cluster[0].id,
        displayName: cluster[0].displayName,
        latitude: center.latitude,
        longitude: center.longitude,
        identified: cluster.some((member) => member.identified),
        // La ficha desde el mapa (F03.1) necesita la especie también en grupos.
        speciesId: cluster.find((member) => member.speciesId != null)?.speciesId ?? null,
        scientificName: cluster.find((member) => member.scientificName != null)?.scientificName ?? null,
        distance: Number.isFinite(nearest) ? nearest : undefined,
        count: cluster.length,
      };
      markers.push(group);
      const area: GroupArea = {
        center,
        radius: Math.max(
          GROUP_AREA_MIN_METERS,
          Math.max(...cluster.map((member) => metersBetween(center, member))) * GROUP_AREA_PADDING,
        ),
      };
      areasById.set(group.id, area);
      for (const member of cluster) areaByMemberId.set(member.id, area);
    }
  }
  return { pins: markers, areasById, areaByMemberId };
}
