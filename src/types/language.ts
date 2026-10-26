export type Language = 'es' | 'va' | 'en';

/** Idiomas que ofrece el selector, en el orden en que se muestran. */
export const LANGUAGES: readonly Language[] = ['es', 'va', 'en'];

/** Nombre de cada idioma en su propia lengua. */
export const LANGUAGE_NAMES: Record<Language, string> = {
  es: 'Español',
  va: 'Valencià',
  en: 'English',
};

export const DEFAULT_LANGUAGE: Language = 'es';

export function isLanguage(value: unknown): value is Language {
  return typeof value === 'string' && LANGUAGES.includes(value as Language);
}
