import { dictionaries } from '../../i18n/strings';
import type { Language } from '../../types/language';
import type { PlantMatch } from '../../types/identify';
import type { FichaEspecie } from './types';

/** Fuente que se muestra cuando la especie identificada no tiene ficha en el catálogo. */
function fuentePlantNet(language: Language) {
  return {
    name: 'Pl@ntNet',
    description: dictionaries[language]['ficha.plantnetDesc'],
    url: 'https://my.plantnet.org',
    icon: 'search' as const,
  };
}

/**
 * Traduce una especie identificada por Pl@ntNet a la forma que pinta la ficha.
 *
 * Antes de llegar aquí App comprueba si la especie tiene ficha en el catálogo
 * del backend (match client-side por nombre científico) y, si la tiene, abre
 * la ficha real de la base de datos. Esta función es el camino honesto para
 * las especies fuera de catálogo: se construye la ficha con lo único que
 * sabemos de verdad —nombre común, nombre científico, familia, la foto que
 * acaba de hacer el usuario y Pl@ntNet como fuente—. No se inventan
 * descripciones ni curiosidades.
 */
export function fichaDesdeIdentificacion(
  match: PlantMatch,
  fotoCapturada: string | null = null,
  language: Language = 'es',
): FichaEspecie {
  const nombreComun = match.commonNames[0] ?? match.scientificName;

  return {
    commonName: nombreComun,
    scientificName: match.scientificName,
    family: match.family ?? undefined,
    photoUrl: fotoCapturada ?? undefined,
    photoAlt: fotoCapturada !== null
      ? dictionaries[language]['ficha.photoAlt'].replace('{name}', nombreComun)
      : undefined,
    sources: [fuentePlantNet(language)],
  };
}
