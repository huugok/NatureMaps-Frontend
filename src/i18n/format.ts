import type { Language } from '../types/language';

// Locale de Intl para cada idioma de la app: números, fechas y unidades se
// formatean siempre con el idioma activo, nunca a mano en las pantallas.
const LOCALES: Record<Language, string> = {
  es: 'es-ES',
  va: 'ca-ES',
  en: 'en-GB',
};

export function languageLocale(lang: Language): string {
  return LOCALES[lang];
}

/**
 * Formato único de distancias en toda la app (mapa, búsqueda…).
 * La unidad canónica es el metro; la presentación es adaptativa: metros por
 * debajo de 1 km y kilómetros con un decimal a partir de él.
 */
export function formatDistance(meters: number, lang: Language): string {
  if (meters < 1000) {
    return `${new Intl.NumberFormat(LOCALES[lang], { maximumFractionDigits: 0 }).format(meters)} m`;
  }
  return `${new Intl.NumberFormat(LOCALES[lang], { maximumFractionDigits: 1 }).format(meters / 1000)} km`;
}

/** Repara texto UTF-8 que algunos registros del catálogo guardaron como Latin-1. */
export function repairTextEncoding(value: string): string {
  const brokenSequences = /(?:Ã[\u0080-\u00ff]|Â[\u0080-\u00ff]|â[\u0080-\uFFFF]{1,2})+/g;
  const decoder = new TextDecoder('utf-8');
  const windows1252Bytes: Record<number, number> = {
    0x20ac: 0x80, 0x201a: 0x82, 0x0192: 0x83, 0x201e: 0x84, 0x2026: 0x85,
    0x2020: 0x86, 0x2021: 0x87, 0x02c6: 0x88, 0x2030: 0x89, 0x0160: 0x8a,
    0x2039: 0x8b, 0x0152: 0x8c, 0x017d: 0x8e, 0x2018: 0x91, 0x2019: 0x92,
    0x201c: 0x93, 0x201d: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97,
    0x02dc: 0x98, 0x2122: 0x99, 0x0161: 0x9a, 0x203a: 0x9b, 0x0153: 0x9c,
    0x017e: 0x9e, 0x0178: 0x9f,
  };
  let repaired = value;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    repaired = repaired.replace(brokenSequences, (sequence) =>
      decoder.decode(Uint8Array.from(Array.from(sequence, (character) => {
        const codePoint = character.codePointAt(0)!;
        return windows1252Bytes[codePoint] ?? (codePoint & 0xff);
      }))),
    );
  }
  return repaired;
}
