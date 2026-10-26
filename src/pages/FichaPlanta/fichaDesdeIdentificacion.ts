import type { PlantMatch } from '../../types/identify';
import { DEMO_SPECIES } from './constants';
import type { FichaEspecie } from './types';

/** Normaliza un nombre científico para comparar sin depender de mayúsculas ni espacios. */
function normalizar(nombre: string): string {
  return nombre.trim().toLocaleLowerCase('es');
}

/** Fuente que se muestra cuando la ficha viene de Pl@ntNet y no de la demo. */
const FUENTE_PLANTNET = {
  name: 'Pl@ntNet',
  description: 'Identificación por imagen · Consulta realizada desde el escaneo',
  url: 'https://my.plantnet.org',
  icon: 'search' as const,
};

/**
 * Traduce una especie identificada por Pl@ntNet a la forma que pinta la ficha.
 *
 * Si la especie está entre las 6 de la demo se usa su ficha completa; si no,
 * se construye una ficha con lo único que sabemos de verdad: nombre común,
 * nombre científico, familia, la foto que acaba de hacer el usuario y
 * Pl@ntNet como fuente. No se inventan descripciones ni curiosidades.
 */
export function fichaDesdeIdentificacion(
  match: PlantMatch,
  fotoCapturada: string | null = null,
): FichaEspecie {
  const demo = DEMO_SPECIES.find(
    (especie) => normalizar(especie.scientificName) === normalizar(match.scientificName),
  );
  if (demo) {
    return demo;
  }

  const nombreComun = match.commonNames[0] ?? match.scientificName;

  return {
    commonName: nombreComun,
    scientificName: match.scientificName,
    family: match.family ?? undefined,
    photoUrl: fotoCapturada ?? undefined,
    photoAlt: fotoCapturada !== null ? `Foto de ${nombreComun}` : undefined,
    sources: [FUENTE_PLANTNET],
  };
}
