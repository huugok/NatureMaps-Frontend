import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { dictionaries, type StringKey } from '../i18n/strings'
import { readLanguagePreference, saveLanguagePreference } from '../services/languagePreference'
import type { Mode } from '../types'
import type { Language } from '../types/language'
import { AppContext, type AppState } from './state'

// Estado global: modo e idioma. El modo se guarda en naturemaps:prefs; el
// idioma lo persiste siempre services/languagePreference.
const STORAGE_KEY = 'naturemaps:prefs'

function loadMode(): Mode | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return (JSON.parse(raw).mode as Mode | null) ?? null
  } catch {
    /* almacenamiento no disponible: usamos el valor por defecto */
  }
  return null
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<Mode | null>(loadMode)
  const [lang, setLangState] = useState<Language>(readLanguagePreference)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ mode }))
    } catch {
      /* ignorar */
    }
    document.documentElement.dataset.mode = mode ?? 'none'
  }, [mode])

  useEffect(() => {
    // El valenciano usa el código BCP-47 'ca' para lectores de pantalla.
    document.documentElement.lang = lang === 'va' ? 'ca' : lang
  }, [lang])

  const setLang = useCallback((next: Language) => {
    saveLanguagePreference(next)
    setLangState(next)
  }, [])

  const t = useCallback(
    (key: StringKey, vars?: Record<string, string | number>) => {
      let text = dictionaries[lang][key] ?? dictionaries.es[key] ?? key
      if (vars) {
        for (const [name, value] of Object.entries(vars)) {
          text = text.replaceAll(`{${name}}`, String(value))
        }
      }
      return text
    },
    [lang],
  )

  const value = useMemo<AppState>(
    () => ({ mode, setMode, lang, setLang, t }),
    [mode, lang, setLang, t],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
