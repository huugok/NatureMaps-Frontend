import { groupNearbyPlants } from '../../services/plantGroups';

/** Worker de agrupación: recibe una página de plantas y devuelve los grupos
 *  ya calculados. No toca DOM ni Leaflet; todo lo que cruza el límite son
 *  objetos planos y arrays de pares (clonables sin transferir buffers). */

self.onmessage = (event: MessageEvent<{ id: number; pins: Parameters<typeof groupNearbyPlants>[0] }>) => {
  const { id, pins } = event.data;
  const grouped = groupNearbyPlants(pins);
  (self as unknown as Worker).postMessage({
    id,
    pins: grouped.pins,
    areasById: [...grouped.areasById],
    areaByMemberId: [...grouped.areaByMemberId],
  });
};
