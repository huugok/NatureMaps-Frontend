import { describe, expect, it } from 'vitest';
import type { PlantMatch } from '../../types/identify';
import { fichaDesdeIdentificacion } from './fichaDesdeIdentificacion';

function match(
  scientificName: string,
  score: number,
  commonNames: string[] = [],
  family: string | null = null,
): PlantMatch {
  return { score, scientificName, author: null, family, genus: null, commonNames, gbifId: null };
}

describe('fichaDesdeIdentificacion', () => {
  it('no consulta la demo ni el catálogo: de eso decide App; aquí toda especie es mínima', () => {
    // Jacaranda sí tiene ficha en la BD, pero el match contra el catálogo lo
    // hace App (findSpeciesIndexByScientificName) antes de llegar aquí.
    const ficha = fichaDesdeIdentificacion(
      match('Jacaranda mimosifolia', 0.83, ['Jacaranda'], 'Bignoniaceae'),
      null,
    );

    expect(ficha.description).toBeUndefined();
    expect(ficha.curiosity).toBeUndefined();
    expect(ficha.sources?.map((fuente) => fuente.name)).toEqual(['Pl@ntNet']);
  });

  it('construye una ficha genérica con la foto capturada y Pl@ntNet', () => {
    const ficha = fichaDesdeIdentificacion(
      match('Rosa canina', 0.46, ['Rosal silvestre'], 'Rosaceae'),
      'data:image/jpeg;base64,abc',
    );

    expect(ficha.commonName).toBe('Rosal silvestre');
    expect(ficha.scientificName).toBe('Rosa canina');
    expect(ficha.family).toBe('Rosaceae');
    expect(ficha.photoUrl).toBe('data:image/jpeg;base64,abc');
    expect(ficha.photoAlt).toMatch(/rosal silvestre/i);
    expect(ficha.sources?.map((fuente) => fuente.name)).toEqual(['Pl@ntNet']);
  });

  it('no inventa contenido para las especies que no están en el catálogo', () => {
    const ficha = fichaDesdeIdentificacion(match('Rosa canina', 0.46, ['Rosal silvestre']), null);

    expect(ficha.description).toBeUndefined();
    expect(ficha.curiosity).toBeUndefined();
    expect(ficha.flowering).toBeUndefined();
    expect(ficha.locations).toBeUndefined();
  });

  it('usa el nombre científico cuando Pl@ntNet no da nombre común', () => {
    const ficha = fichaDesdeIdentificacion(match('Papaver dubium', 0.28), null);

    expect(ficha.commonName).toBe('Papaver dubium');
    expect(ficha.photoUrl).toBeUndefined();
  });
});
