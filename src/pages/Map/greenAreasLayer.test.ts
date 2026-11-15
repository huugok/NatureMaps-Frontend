import { beforeEach, describe, expect, it, vi } from 'vitest';
import { hesperides, turia1, turia2 } from '../../test/greenAreaFixtures';

// Leaflet falso: registra qué capas se crean y cuáles están en el mapa, que es
// lo que decide qué ve el usuario a cada zoom.
const fake = vi.hoisted(() => {
  interface FakeLayer {
    kind: string;
    args: unknown[];
    children: FakeLayer[];
    popup?: () => HTMLElement;
    onMap: boolean;
    addTo: (target: unknown) => FakeLayer;
    remove: () => void;
    bindPopup: (content: () => HTMLElement) => FakeLayer;
    clearLayers: () => void;
  }
  const created: FakeLayer[] = [];
  const make = (kind: string, args: unknown[]): FakeLayer => {
    const layer: FakeLayer = {
      kind,
      args,
      children: [],
      onMap: false,
      addTo(target) {
        const parent = target as { isMap?: boolean; children?: FakeLayer[] };
        if (parent.isMap) layer.onMap = true;
        else parent.children?.push(layer);
        return layer;
      },
      remove() { layer.onMap = false; },
      bindPopup(content) { layer.popup = content; return layer; },
      clearLayers() { layer.children = []; },
    };
    created.push(layer);
    return layer;
  };
  return { created, make };
});

vi.mock('leaflet', () => ({
  default: {
    layerGroup: () => fake.make('group', []),
    geoJSON: (...args: unknown[]) => fake.make('geojson', args),
    circleMarker: (...args: unknown[]) => fake.make('dot', args),
    marker: (...args: unknown[]) => fake.make('label', args),
    divIcon: (options: { html: HTMLElement }) => ({ text: options.html.textContent }),
    latLngBounds: () => {
      const points: unknown[] = [];
      return { points, extend(point: unknown) { points.push(point); } };
    },
  },
}));

import { addGreenAreasLayer, GREEN_AREA_LABEL_MIN_ZOOM, GREEN_AREA_OUTLINE_MIN_ZOOM } from './greenAreasLayer';

function fakeMap(zoom: number) {
  const handlers = new Map<string, () => void>();
  const pane = { style: { zIndex: '' } };
  let currentPane: typeof pane | undefined;
  const map = {
    isMap: true,
    zoom,
    pane,
    getPane: vi.fn(() => currentPane),
    createPane: vi.fn(() => { currentPane = pane; return pane; }),
    getZoom: () => map.zoom,
    hasLayer: (layer: { onMap: boolean }) => layer.onMap,
    on: vi.fn((event: string, handler: () => void) => { handlers.set(event, handler); }),
    off: vi.fn((event: string) => { handlers.delete(event); }),
    fitBounds: vi.fn(),
    setZoom(next: number) { map.zoom = next; handlers.get('zoomend')?.(); },
    hasHandler: (event: string) => handlers.has(event),
  };
  return map;
}

const text = { open: 'Ver zona' };
const groups = () => fake.created.filter((layer) => layer.kind === 'group');
// Orden de creación en addGreenAreasLayer: contornos, puntos, nombres, selección.
const layers = () => {
  const [outlines, dots, labels, selected] = groups();
  return { outlines: outlines!, dots: dots!, labels: labels!, selected: selected! };
};

describe('capa de zonas verdes del mapa (NM-08, PA 3011)', () => {
  beforeEach(() => { fake.created.length = 0; });

  it('va en un pane propio por debajo de los marcadores de plantas', () => {
    const map = fakeMap(15);
    addGreenAreasLayer(map as never, [hesperides], { onOpen: vi.fn(), text });
    expect(map.createPane).toHaveBeenCalledWith('green-areas');
    expect(Number(map.pane.style.zIndex)).toBeLessThan(400);
  });

  it('se adapta al zoom: punto en vista de ciudad, contorno en barrio y nombre en parque', () => {
    const map = fakeMap(GREEN_AREA_OUTLINE_MIN_ZOOM - 1);
    addGreenAreasLayer(map as never, [hesperides], { onOpen: vi.fn(), text });
    const { outlines, dots, labels } = layers();
    expect([dots.onMap, outlines.onMap, labels.onMap]).toEqual([true, false, false]);
    map.setZoom(GREEN_AREA_OUTLINE_MIN_ZOOM);
    expect([dots.onMap, outlines.onMap, labels.onMap]).toEqual([false, true, false]);
    map.setZoom(GREEN_AREA_LABEL_MIN_ZOOM);
    expect([dots.onMap, outlines.onMap, labels.onMap]).toEqual([false, true, true]);
  });

  it('dibuja el contorno con clase propia (sin relleno opaco) y un solo punto y nombre por parque', () => {
    const map = fakeMap(15);
    addGreenAreasLayer(map as never, [turia1, turia2, hesperides], { onOpen: vi.fn(), text });
    const { outlines, dots, labels } = layers();
    expect(outlines.children).toHaveLength(3);
    const options = outlines.children[0]!.args[1] as { pane: string; style: { className: string } };
    expect(options.pane).toBe('green-areas');
    expect(options.style.className).toBe('green-area-outline');
    // Los dos tramos del Turia comparten punto y nombre: el del parque entero.
    expect(dots.children).toHaveLength(2);
    expect(labels.children.map((label) => (label.args[1] as { icon: { text: string } }).icon.text)).toEqual([
      'Jardín del Turia', 'Jardín de las Hespérides',
    ]);
    // El nombre no intercepta toques dirigidos a una planta.
    expect((labels.children[0]!.args[1] as { interactive: boolean }).interactive).toBe(false);
  });

  it('tocar un contorno ofrece abrir la ficha de la zona, con el nombre como texto y no como HTML', () => {
    const onOpen = vi.fn();
    const map = fakeMap(15);
    const malicious = { ...hesperides, groupName: '<img src=x onerror=alert(1)>' };
    addGreenAreasLayer(map as never, [malicious], { onOpen, text });
    const popup = layers().outlines.children[0]!.popup!();
    expect(popup.querySelector('img')).toBeNull();
    expect(popup.querySelector('strong')!.textContent).toBe('<img src=x onerror=alert(1)>');
    const button = popup.querySelector('button')!;
    expect(button.textContent).toBe('Ver zona');
    button.click();
    expect(onOpen).toHaveBeenCalledWith('jardin-de-las-hesperides');
  });

  it('resalta solo el parque seleccionado, también en vista de ciudad, y lo encuadra entero', () => {
    const map = fakeMap(12);
    const layer = addGreenAreasLayer(map as never, [turia1, turia2, hesperides], { onOpen: vi.fn(), text });
    const { selected, outlines } = layers();
    expect(selected.onMap).toBe(true);
    expect(outlines.onMap).toBe(false);
    layer.select('jardin-del-turia');
    expect(selected.children).toHaveLength(2);
    const options = selected.children[0]!.args[1] as { interactive: boolean; style: { className: string } };
    expect(options.style.className).toContain('green-area-outline--selected');
    expect(options.interactive).toBe(false);

    expect(layer.fit('jardin-del-turia')).toBe(true);
    const bounds = map.fitBounds.mock.calls[0]![0] as { points: Array<[number, number]> };
    // Esquinas de los dos tramos: [latitud, longitud].
    expect(bounds.points).toContainEqual([39.48, -0.4]);
    expect(bounds.points).toContainEqual([39.482, -0.39]);

    layer.select('jardin-de-las-hesperides');
    expect(selected.children).toHaveLength(1);
    layer.select(null);
    expect(selected.children).toHaveLength(0);
    expect(layer.fit('no-existe')).toBe(false);
  });

  it('al retirarla no deja capas ni escuchas en el mapa', () => {
    const map = fakeMap(16);
    const layer = addGreenAreasLayer(map as never, [hesperides], { onOpen: vi.fn(), text });
    expect(map.hasHandler('zoomend')).toBe(true);
    layer.remove();
    expect(groups().every((group) => !group.onMap)).toBe(true);
    expect(map.hasHandler('zoomend')).toBe(false);
  });
});
