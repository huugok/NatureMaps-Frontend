/**
 * Pl@ntNet y el catálogo escriben los híbridos distinto ('Citrus × aurantium'
 * vs 'Citrus x aurantium'): se comparan sin la '×' ni mayúsculas.
 *
 * Único criterio de comparación de nombres científicos de la app: lo usan el
 * emparejamiento con el catálogo y la foto propia de cada especie (PA 2941).
 */
export function normalizarNombreCientifico(nombre: string): string {
  // El inventario escribe los híbridos con «x» y el catálogo con «×».
  return nombre
    .toLowerCase()
    .replaceAll('×', ' ')
    .replace(/\sx\s/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
