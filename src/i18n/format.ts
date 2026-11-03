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
