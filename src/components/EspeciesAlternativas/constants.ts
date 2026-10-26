/**
 * Valores y textos por defecto de la lista de especies alternativas (UT F05).
 * Se centralizan aquí para poder ajustarlos sin tocar el componente ni la
 * pantalla que lo usa.
 */

/**
 * Confianza mínima para considerar que la identificación es clara. Por debajo
 * de este valor se ofrecen especies alternativas para que el usuario elija
 * (PA 689). 0.5 es el mismo umbral que documentó la UT 931: por encima,
 * Pl@ntNet suele acertar la especie concreta.
 */
export const CONFIANZA_MINIMA = 0.5;

/** Número máximo de alternativas que se muestran a la vez. */
export const MAX_ALTERNATIVAS = 5;

/** A partir de esta confianza la tarjeta se etiqueta como «Muy parecido». */
export const MUY_PARECIDO = 0.9;

/** Cabecera de la sección. */
export const TITULO = 'Especies alternativas';

/** Texto de apoyo bajo la cabecera. */
export const SUBTITULO = 'Posibles alternativas';

/** Etiqueta de la tarjeta cuando la confianza es muy alta. */
export const ETIQUETA_MUY_PARECIDO = 'Muy parecido';

/** Cabecera cuando la identificación sí es concluyente. */
export const TITULO_CANDIDATAS = 'Especies candidatas';

/** Texto de apoyo cuando la identificación sí es concluyente. */
export const SUBTITULO_CANDIDATAS = 'Coincidencias más probables';

/** Aviso que explica por qué se ofrecen alternativas (PA 689). */
export const AVISO_CONFIANZA_BAJA =
  'La confianza de la mejor coincidencia es baja: elige la especie que te parezca correcta.';

/** Texto de la confirmación tras elegir una especie. */
export const CONFIRMACION_ELECCION = 'Especie elegida';
