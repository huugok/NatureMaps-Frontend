/**
 * Especie candidata devuelta por la identificación (normalizada por el backend,
 * ver src/services/plantnet.ts en NatureMaps-Backend).
 */
export interface PlantMatch {
  /** Confianza de Pl@ntNet, entre 0 y 1. */
  score: number;
  /** Nombre binomial sin autor (clave, viene normalizado). */
  scientificName: string;
  /** Autoría científica, si Pl@ntNet la incluye. */
  author: string | null;
  /** Familia botánica de la especie. */
  family: string | null;
  /** Género botánico de la especie. */
  genus: string | null;
  /** Nombres comunes en el idioma pedido (por defecto español). */
  commonNames: string[];
  /** Id del taxón en GBIF, si Pl@ntNet lo devuelve. */
  gbifId: string | null;
}

/** Respuesta completa de la identificación de una foto. */
export interface PlantIdentification {
  /** Especie elegida por Pl@ntNet como más probable, si hay suficiente confianza. */
  bestMatch: string | null;
  /** Peticiones de identificación que quedan en la cuota de Pl@ntNet. */
  remainingIdentificationRequests: number | null;
  /** Especies candidatas ordenadas por puntuación (de mayor a menor). */
  results: PlantMatch[];
}
