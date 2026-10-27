/**
 * Forma de una especie tal y como la pinta la ficha de planta.
 *
 * Los datos completos (descripción, curiosidad, fuentes…) solo existen para
 * las especies de la demo; cuando la ficha se abre desde una identificación de
 * Pl@ntNet puede llegar una especie de la que únicamente conocemos nombre,
 * familia y foto, por eso todo lo demás es opcional.
 */
export interface FichaFuente {
  name: string;
  description: string;
  url: string;
  icon: 'search' | 'landmark';
}

export interface FichaUbicacion {
  name: string;
  district: string;
}

export interface FichaEspecie {
  /** Nombre común en español. */
  commonName: string;
  /** Nombre binomial sin autoría. */
  scientificName: string;
  /** Familia botánica, si se conoce. */
  family?: string;
  /** Foto de cabecera. Sin ella la ficha pinta un marcador con un árbol. */
  photoUrl?: string;
  photoAlt?: string;
  photoCredit?: string;
  /** Texto largo de la ficha. */
  description?: string;
  /** Época de floración (vacío o ausente si no se conoce). */
  flowering?: string;
  curiosity?: { label: string; text: string };
  locations?: FichaUbicacion[];
  sources?: FichaFuente[];
}

/** De dónde viene la ficha abierta: una identificación con su confianza. */
export interface IdentificacionFicha {
  /** Confianza de Pl@ntNet entre 0 y 1. */
  score: number;
}
