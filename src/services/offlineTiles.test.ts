import { describe, expect, it } from 'vitest';
import { hesperides, turia1 } from '../test/greenAreaFixtures';
import { OfflineError } from './offlineError';
import {
  countTiles, estimateBytes, expandBbox, latToTileY, lonToTileX, planTiles, tileUrl,
} from './offlineTiles';

describe('teselas de una zona para el modo sin conexión', () => {
  it('convierte coordenadas en teselas (valores de referencia de OSM)', () => {
    // Londres, zoom 10: la tesela 10/511/340 de OSM.
    expect(lonToTileX(-0.1278, 10)).toBe(511);
    expect(latToTileY(51.5074, 10)).toBe(340);
    // Invariantes del esquema: el meridiano 0 y el ecuador son el borde entre teselas.
    expect(lonToTileX(0, 1)).toBe(1);
    expect(latToTileY(0, 1)).toBe(1);
    expect(lonToTileX(-180, 3)).toBe(0);
    expect(lonToTileX(180, 3)).toBe(7);
    expect(latToTileY(85, 3)).toBe(0);
  });

  it('usa una URL estable sin subdominio, que sirve de clave de la caché', () => {
    expect(tileUrl({ z: 15, x: 16_361, y: 12_548 })).toBe('https://tile.openstreetmap.org/15/16361/12548.png');
  });

  it('amplía la caja con un margen mínimo para zonas diminutas', () => {
    const [west, south, east, north] = expandBbox([-0.3887, 39.4771, -0.3878, 39.4779]);
    expect(west).toBeLessThan(-0.3887);
    expect(east).toBeGreaterThan(-0.3878);
    expect(south).toBeLessThan(39.4771);
    expect(north).toBeGreaterThan(39.4779);
    expect(-0.3878 - east).toBeLessThanOrEqual(-0.0005 + 1e-9);
  });

  it('planifica de zoom 13 a 17 para un jardín pequeño, sin repetir teselas', () => {
    const plan = planTiles(hesperides.bbox);
    expect(plan.minZoom).toBe(13);
    expect(plan.maxZoom).toBe(17);
    expect(plan.tiles.length).toBe(plan.count);
    expect(new Set(plan.tiles.map(tileUrl)).size).toBe(plan.tiles.length);
    expect(plan.tiles.length).toBeLessThan(100);
    expect(plan.tiles.every(({ z }) => z >= 13 && z <= 17)).toBe(true);
  });

  it('cuenta lo mismo que genera', () => {
    expect(countTiles(hesperides.bbox).count).toBe(planTiles(hesperides.bbox).tiles.length);
  });

  it('baja el zoom máximo si la zona no cabe en el tope de teselas', () => {
    const wide: [number, number, number, number] = [-0.45, 39.43, -0.30, 39.52];
    const plan = countTiles(wide, { maxTiles: 600 });
    expect(plan.maxZoom).toBeLessThan(17);
    expect(plan.count).toBeLessThanOrEqual(600);
  });

  it('se niega a descargar una zona enorme en lugar de llenar el dispositivo', () => {
    const spain: [number, number, number, number] = [-9, 36, 3, 43];
    expect(() => countTiles(spain)).toThrow(OfflineError);
    expect(() => countTiles(spain)).toThrow(/demasiado grande/);
  });

  it('un parque grande como el Turia cabe dentro del tope', () => {
    const plan = countTiles([...turia1.bbox] as [number, number, number, number]);
    expect(plan.maxZoom).toBe(17);
  });

  it('estima el peso a partir de teselas y plantas', () => {
    expect(estimateBytes(100, 0)).toBeGreaterThan(100 * 10_000);
    expect(estimateBytes(100, 1000)).toBeGreaterThan(estimateBytes(100, 0));
  });
});
