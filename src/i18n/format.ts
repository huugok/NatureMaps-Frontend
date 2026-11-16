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

/**
 * Duración de una ruta a pie: minutos por debajo de una hora y horas con los
 * minutos de sobra a partir de ella («45 min», «1 h 15 min»). Los minutos
 * redondeados a 5 evitan el «1 h 1 min» de las duraciones redondeadas.
 */
export function formatDuration(seconds: number, lang: Language): string {
  const totalMinutes = Math.max(0, Math.round(seconds / 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const format = (value: number) => new Intl.NumberFormat(LOCALES[lang], { maximumFractionDigits: 0 }).format(value);
  if (hours === 0) return `${format(minutes)} min`;
  if (minutes === 0) return `${format(hours)} h`;
  return `${format(hours)} h ${format(minutes)} min`;
}

/**
 * Superficie de una zona verde: metros cuadrados por debajo de una hectárea y
 * hectáreas con un decimal a partir de ella.
 */
export function formatArea(squareMeters: number, lang: Language): string {
  if (squareMeters < 10_000) {
    return `${new Intl.NumberFormat(LOCALES[lang], { maximumFractionDigits: 0 }).format(squareMeters)} m²`;
  }
  return `${new Intl.NumberFormat(LOCALES[lang], { maximumFractionDigits: 1 }).format(squareMeters / 10_000)} ha`;
}

/** Número entero con el separador de miles del idioma. */
export function formatCount(value: number, lang: Language): string {
  return new Intl.NumberFormat(LOCALES[lang], { maximumFractionDigits: 0 }).format(value);
}
