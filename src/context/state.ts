import { createContext } from 'react'
import type { StringKey } from '../i18n/strings'
import type { Lang, Mode } from '../types'

export interface AppState {
  mode: Mode | null
  lang: Lang
  setMode: (mode: Mode | null) => void
  setLang: (lang: Lang) => void
  /** Traduce una clave al idioma actual; admite variables: t('x', { n: 3 }) → "{n}". */
  t: (key: StringKey, vars?: Record<string, string | number>) => string
}

export const AppContext = createContext<AppState | null>(null)
