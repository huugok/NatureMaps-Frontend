import { describe, expect, it } from 'vitest';
import { groupNearbyPlants, metersBetween } from './plantGroups';
import type { PlantPin } from '../../types/plant';

function pin(id: number, latitude: number, longitude: number, extra: Partial<PlantPin> = {}): PlantPin {
  return { id, displayName: 'Plátano de sombra', latitude, longitude, identified: true, distance: 10, ...extra };
}

describe('groupNearbyPlants', () => {
  it('agrupa plantas del mismo tipo encadenadas por proximidad en un marcador con recuento', () => {
    // Separados ~55 m: por saltos de 100 m forman una sola masa.
    const { pins, areasById } = groupNearbyPlants([
      pin(1, 39.47, -0.37, { distance: 250 }),
      pin(2, 39.4705, -0.37, { distance: 260 }),
      pin(3, 39.471, -0.37, { distance: 270 }),
    ]);

    expect(pins).toHaveLength(1);
    const group = pins[0];
    expect(group.count).toBe(3);
    expect(group.id).toBe(1);
    expect(group.displayName).toBe('Plátano de sombra');
    // La distancia del grupo es la del miembro más cercano.
    expect(group.distance).toBe(250);

    const area = areasById.get(group.id);
    expect(area).toBeDefined();
    // El círculo cubre al miembro más alejado del centro del grupo.
    expect(area!.radius).toBeGreaterThan(metersBetween(group, { latitude: 39.471, longitude: -0.37 }));
  });

  it('no agrupa plantas del mismo tipo separadas más allá del enlace', () => {
    const { pins, areasById } = groupNearbyPlants([pin(1, 39.47, -0.37), pin(2, 39.472, -0.37)]);

    expect(pins).toHaveLength(2);
    expect(pins.every((p) => p.count === undefined)).toBe(true);
    expect(areasById.size).toBe(0);
  });

  it('mantiene separados los tipos distintos aunque coincidan en el punto', () => {
    const { pins } = groupNearbyPlants([
      pin(1, 39.47, -0.37),
      pin(2, 39.47, -0.37, { displayName: 'Otra especie' }),
    ]);

    expect(pins).toHaveLength(2);
  });

  it('agrupa también las plantas sin identificar cercanas', () => {
    const { pins } = groupNearbyPlants([
      pin(1, 39.47, -0.37, { identified: false, displayName: 'Planta sin identificar' }),
      pin(2, 39.4703, -0.37, { identified: false, displayName: 'Planta sin identificar' }),
    ]);

    expect(pins).toHaveLength(1);
    expect(pins[0].identified).toBe(false);
    expect(pins[0].count).toBe(2);
  });

  it('deja pasar las plantas sueltas tal cual y sin área', () => {
    const single = pin(5, 39.47, -0.37, { displayName: 'Almez', distance: 250 });
    const { pins, areasById } = groupNearbyPlants([single]);

    expect(pins).toEqual([single]);
    expect(areasById.size).toBe(0);
  });

  it('el radio del área respeta un mínimo para que los grupos apretados se vean', () => {
    const { pins, areasById } = groupNearbyPlants([pin(1, 39.47, -0.37), pin(2, 39.470001, -0.37)]);

    expect(areasById.get(pins[0].id)!.radius).toBeGreaterThanOrEqual(30);
  });
});
