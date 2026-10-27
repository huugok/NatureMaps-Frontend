/**
 * Valores y textos por defecto del resultado de la identificación (UT F05).
 * Se centralizan aquí para poder ajustarlos sin tocar los componentes ni la
 * pantalla que los usa.
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

/** Cabecera de la tarjeta principal. */
export const ETIQUETA_ESPECIE_MAS_PROBABLE = 'Especie más probable';

/** Cabecera de la lista de alternativas. */
export const TITULO = '¿No es esta? Otras posibles';

/** Etiqueta de la foto escaneada sobre la cabecera verde. */
export const ETIQUETA_TU_FOTO = 'Tu foto';

/** Botón de la tarjeta principal que abre la ficha de la especie. */
export const BOTON_VER_FICHA = 'Ver ficha';

/** Acción para descartar el resultado y hacer otra foto. */
export const TEXTO_REPETIR_FOTO = 'Ninguna coincide · repetir foto';

/** Texto de la confirmación tras elegir una alternativa. */
export const CONFIRMACION_ELECCION = 'Especie elegida';

/** Estado cuando Pl@ntNet no devuelve ninguna candidata. */
export const SIN_COINCIDENCIAS = 'Pl@ntNet no ha encontrado candidatas para esta foto.';

/** Pie que explica de dónde sale el porcentaje. */
export const PIE_IDENTIFICACION =
  'Resultados de Pl@ntNet. El % indica la certeza del reconocimiento.';

/** Certeza de la especie principal según su confianza. */
export const CERTEZA_ALTA = 'Certeza alta';
export const CERTEZA_MEDIA = 'Certeza media';
export const CERTEZA_BAJA = 'Certeza baja';
