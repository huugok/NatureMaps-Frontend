import type { Language } from '../types/language'
import es from './locales/es.json'
import va from './locales/va.json'
import en from './locales/en.json'

// Los textos se editan en locales/{es,va,en}.json. El español define las claves;
// los tests comprueban que todos los idiomas tienen las mismas variables y claves.
export type StringKey = keyof typeof es
type Dictionary = Record<StringKey, string>
export type StringVariables = Record<string, string | number>
export type Translator = (key: StringKey, vars?: StringVariables) => string

export const dictionaries: Record<Language, Dictionary> = { es, va, en }

/** Traducción compartida por el contexto y los mapeadores de datos. */
export function translate(language: Language, key: StringKey, vars?: StringVariables): string {
  let text = dictionaries[language][key] ?? dictionaries.es[key] ?? key
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      text = text.replaceAll(`{${name}}`, () => String(value))
    }
  }
  return text
}
