/**
 * Forma de una especie tal y como la pinta la ficha de planta.
 *
 * Las fichas del catálogo del backend llegan completas (descripción,
 * curiosidad, fuentes, ubicaciones…), pero cuando la ficha se abre desde una
 * identificación de Pl@ntNet de una especie sin ficha solo se conocen nombre,
 * familia y la foto que acaba de hacer el usuario: por eso todo lo demás es
 * opcional y cada sección se pinta únicamente si tiene datos.
 */
export interface FichaFuente {
  name: string;
  description: string;
  url: string;
  /** Icono contextual: 'landmark' para fuentes institucionales, 'search' para el resto. */
  icon: 'search' | 'landmark';
}

export interface FichaUbicacion {
  /** Nombre que se muestra: barrio si se conoce y distrito en su defecto. */
  name: string;
  district?: string;
}

export interface FichaEspecie {
  /** Nombre común en el idioma de la ficha. */
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
  /** Ejemplares catalogados en total (solo fichas del backend con ubicaciones). */
  locationTotal?: number;
}

/** De dónde viene la ficha abierta: una identificación con su confianza. */
export interface IdentificacionFicha {
  /** Confianza de Pl@ntNet entre 0 y 1. */
  score: number;
}
