import { describe, expect, it } from 'vitest';
import { assessStorage, downloadedBytes, isLowStorage, LOW_STORAGE_BYTES } from './offlineQuota';

describe('espacio para las descargas', () => {
  it('sin estimación del navegador no se sabe', () => {
    expect(assessStorage(10_000_000, null)).toBe('unknown');
    expect(isLowStorage(null)).toBe(false);
  });

  it('no cabe si falta espacio para la estimación con margen', () => {
    expect(assessStorage(10_000_000, 14_000_000)).toBe('insufficient');
  });

  it('cabe pero queda por debajo del umbral: poco espacio', () => {
    expect(assessStorage(10_000_000, 15_000_000 + LOW_STORAGE_BYTES - 1)).toBe('low');
  });

  it('con holgura sobre el umbral está bien', () => {
    expect(assessStorage(10_000_000, 15_000_000 + LOW_STORAGE_BYTES)).toBe('ok');
  });

  it('poco espacio libre se mide contra el umbral', () => {
    expect(isLowStorage(LOW_STORAGE_BYTES - 1)).toBe(true);
    expect(isLowStorage(LOW_STORAGE_BYTES)).toBe(false);
  });

  it('suma el peso de las zonas guardadas', () => {
    expect(downloadedBytes([{ tiles: { bytes: 2 } }, { tiles: { bytes: 3 } }] as never)).toBe(5);
    expect(downloadedBytes([])).toBe(0);
  });
});
