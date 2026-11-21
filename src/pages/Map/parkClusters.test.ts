import { beforeEach, describe, expect, it, vi } from 'vitest';
import { hesperides, turia1, turia2 } from '../../test/greenAreaFixtures';
import type { PlantPin } from '../../types/plant';

const fake = vi.hoisted(() => {
  interface FakeLayer {
    kind: string;
    args: unknown[];
    children: FakeLayer[];
    handlers: Record<string, () => void>;
    addTo: (target: unknown) => FakeLayer;
    on: (event: string, handler: () => void) => FakeLayer;
  }
  const created: FakeLayer[] = [];
  const make = (kind: string, args: unknown[]): FakeLayer => {
    const layer: FakeLayer = {
      kind,
      args,
      children: [],
      handlers: {},
      addTo(target) {
        const parent = target as { isMap?: boolean; children?: FakeLayer[] };
        if (!parent.isMap) parent.children?.push(layer);
        return layer;
      },
      on(event, handler) { layer.handlers[event] = handler; return layer; },
    };
    created.push(layer);
    return layer;
  };
  return { created, make };
});

vi.mock('leaflet', () => ({
  default: {
    layerGroup: () => fake.make('group', []),
    marker: (...args: unknown[]) => fake.make('marker', args),
    divIcon: (options: { html: HTMLElement }) => ({ html: options.html }),
  },
}));

import { addParkMarkers, clusterPlantsByPark, PARK_CLUSTER_MAX_ZOOM } from './parkClusters';

function plant(id: number, name: string, greenAreaId: number | null, extra: Partial<PlantPin> = {}): PlantPin {
  return { id, displayName: name, latitude: 39.47, longitude: -0.37, identified: true, greenAreaId, ...extra };
}

// La capa trae el recuento real del inventario por polígono.
const areas = [
  { ...hesperides, plants: 69 },
  { ...turia1, plants: 1200 },
  { ...turia2, plants: 572 },
];

describe('agrupación de plantas por parque (NM-08)', () => {
  beforeEach(() => { fake.created.length = 0; });

  it('agrupa por parque y deja sueltas las de calle', () => {
    const { clusters, loose } = clusterPlantsByPark([
      plant(1, 'Cidro', hesperides.id),
      plant(2, 'Limonero', hesperides.id),
      plant(3, 'Jacaranda', null),
      plant(4, 'Almez', 999),
    ], areas);

    expect(clusters).toHaveLength(1);
    expect(clusters[0]).toMatchObject({ groupSlug: 'jardin-de-las-hesperides', name: 'Jardín de las Hespérides', shown: 2 });
    // Una planta cuya zona no está en la capa no se pierde: se pinta suelta.
    expect(loose.map((item) => item.displayName)).toEqual(['Jacaranda', 'Almez']);
  });

  it('un parque de varios tramos es un solo marcador y suma los recuentos', () => {
    const { clusters } = clusterPlantsByPark([
      plant(1, 'Pino', turia1.id),
      plant(2, 'Pino', turia2.id),
      plant(3, 'Morera', turia1.id),
    ], areas);

    expect(clusters).toHaveLength(1);
    expect(clusters[0]!.name).toBe('Jardín del Turia');
    expect(clusters[0]!.shown).toBe(3);
    // El total es el del parque entero, no el del tramo donde cayó la primera.
    expect(clusters[0]!.total).toBe(1772);
    // El marcador va en el centro oficial del parque, no en el de las plantas.
    expect(clusters[0]!.latitude).toBe(turia1.center.latitude);
  });

  it('cuenta los ejemplares que ya venían agrupados por especie', () => {
    const { clusters } = clusterPlantsByPark([
      plant(1, 'Cidro', hesperides.id, { count: 12 }),
      plant(2, 'Limonero', hesperides.id, { count: 8 }),
    ], areas);
    expect(clusters[0]!.shown).toBe(20);
  });

  it('sin recuento del inventario usa el de las plantas cargadas', () => {
    const { clusters } = clusterPlantsByPark(
      [plant(1, 'Cidro', hesperides.id)],
      [{ ...hesperides, plants: undefined }],
    );
    expect(clusters[0]!.total).toBeNull();
  });

  it('pinta un marcador por parque, con el nombre como texto y no como HTML', () => {
    const onOpen = vi.fn();
    const malicious = { ...hesperides, groupName: '<img src=x onerror=alert(1)>', plants: 69 };
    const { clusters } = clusterPlantsByPark([plant(1, 'Cidro', hesperides.id)], [malicious]);
    addParkMarkers({ isMap: true } as never, clusters, onOpen, { label: (c) => `${c.name}: ${c.total ?? c.shown}` });

    const markers = fake.created.filter((layer) => layer.kind === 'marker');
    expect(markers).toHaveLength(1);
    const options = markers[0]!.args[1] as { title: string; icon: { html: HTMLElement } };
    expect(options.title).toBe('<img src=x onerror=alert(1)>: 69');
    const html = options.icon.html;
    expect(html.querySelector('img')).toBeNull();
    expect(html.querySelector('.park-pin__label')!.textContent).toBe('<img src=x onerror=alert(1)>');
    expect(html.querySelector('.park-pin__count')!.textContent).toBe('69');

    markers[0]!.handlers.click!();
    expect(onOpen).toHaveBeenCalledWith('jardin-de-las-hesperides');
  });

  it('se agrupa también al zoom con el que el mapa sigue al usuario', () => {
    // updateUserLocation centra el mapa con zoom mínimo 16: si el umbral fuera
    // 16, con la ubicación concedida no se agruparía nunca.
    expect(PARK_CLUSTER_MAX_ZOOM).toBeGreaterThan(16);
  });
});
