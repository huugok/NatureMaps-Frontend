/**
 * Umbrales y límites del resultado de la identificación (UT F05).
 * Los textos viven en `src/i18n/strings.ts`.
 */

/**
 * Confianza a partir de la cual la certeza se considera alta. Por debajo de
 * este valor la ficha principal avisa de que la identificación no es
 * concluyente y las alternativas cobran más peso (PA 689).
 */
export const CONFIANZA_ALTA = 0.75;

/**
 * Confianza mínima para considerar que la identificación es concluyente. Es el
 * mismo umbral que documentó la UT 931: por encima, Pl@ntNet suele acertar la
 * especie concreta.
 */
export const CONFIANZA_MINIMA = 0.5;

/**
 * Número máximo de alternativas que acompañan a la especie más probable. Con
 * la principal, la lista nunca muestra más de 5 especies a la vez.
 */
export const MAX_ALTERNATIVAS = 4;
