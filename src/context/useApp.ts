import { useContext } from 'react'
import { translate } from '../i18n/strings'
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
  t: (key, vars) => translate('es', key, vars),
}

export function useApp() {
  return useContext(AppContext) ?? fallback
}
