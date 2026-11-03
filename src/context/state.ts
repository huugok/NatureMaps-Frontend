import { createContext } from 'react'
import type { Mode } from '../types'
import type { Language } from '../types/language'
import type { StringKey } from '../i18n/strings'

export interface AppState {
  mode: Mode | null
  setMode: (mode: Mode | null) => void
  lang: Language
  setLang: (lang: Language) => void
  t: (key: StringKey, vars?: Record<string, string | number>) => string
}

export const AppContext = createContext<AppState | null>(null)
