import { DEFAULT_LANGUAGE, isLanguage, type Language } from '../types/language';

export const LANGUAGE_STORAGE_KEY = 'naturemaps.language';

export function readLanguagePreference(): Language {
  try {
    const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (isLanguage(stored)) {
      return stored;
    }
  } catch {
    // localStorage puede no estar disponible (modo privado, restricciones del navegador).
  }
  return DEFAULT_LANGUAGE;
}

export function saveLanguagePreference(language: Language): void {
  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    // Si no se puede persistir, la preferencia se mantiene solo en memoria.
  }
}
