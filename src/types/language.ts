import es from '../i18n/locales/es.json';
import va from '../i18n/locales/va.json';
import en from '../i18n/locales/en.json';

export type Language = 'es' | 'va' | 'en';

/** Idiomas que ofrece el selector, en el orden en que se muestran. */
export const LANGUAGES: readonly Language[] = ['es', 'va', 'en'];

/** Nombre de cada idioma en su propia lengua. */
export const LANGUAGE_NAMES: Record<Language, string> = {
  es: es['language.selfName'],
  va: va['language.selfName'],
  en: en['language.selfName'],
};

export const DEFAULT_LANGUAGE: Language = 'es';

export function isLanguage(value: unknown): value is Language {
  return typeof value === 'string' && LANGUAGES.includes(value as Language);
}
