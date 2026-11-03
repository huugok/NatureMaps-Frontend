import { useContext } from 'react'
import { dictionaries } from '../i18n/strings'
import type { AppState } from './state'
import { AppContext } from './state'

/**
 * Contexto por defecto para tests aislados de componentes y stories.
 * La app real siempre se monta dentro de <AppProvider>.
 */
const fallback: AppState = {
  mode: null,
  setMode: () => {},
  lang: 'es',
  setLang: () => {},
  t: (key, vars) => {
    let text = dictionaries.es[key] ?? key
    if (vars) {
      for (const [name, value] of Object.entries(vars)) {
        text = text.replaceAll(`{${name}}`, String(value))
      }
    }
    return text
  },
}

export function useApp() {
  return useContext(AppContext) ?? fallback
}
