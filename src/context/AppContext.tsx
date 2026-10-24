import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { dictionaries, type StringKey } from '../i18n/strings'
import type { Lang, Mode } from '../types'
import { AppContext, type AppState } from './state'

// Estado global: modo elegido e idioma. Se guardan en localStorage.
const STORAGE_KEY = 'naturemaps:prefs' // solo { mode }
// Misma clave que usa el selector de idioma de Ajustes (feat/selector-idioma): texto 'es' | 'va' | 'en'
export const LANG_KEY = 'naturemaps.language'

interface Prefs {
  mode: Mode | null
  lang: Lang
}

function isLang(v: unknown): v is Lang {
  return v === 'es' || v === 'va' || v === 'en'
}

function loadPrefs(): Prefs {
  let mode: Mode | null = null
  let lang: Lang = 'es'
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) mode = JSON.parse(raw).mode ?? null
    const storedLang = localStorage.getItem(LANG_KEY)
    if (isLang(storedLang)) lang = storedLang
  } catch {
    /* almacenamiento no disponible: usamos valores por defecto */
  }
  return { mode, lang }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ mode: prefs.mode }))
      localStorage.setItem(LANG_KEY, prefs.lang)
    } catch {
      /* ignorar */
    }
    // El valenciano usa el código BCP-47 'ca' para lectores de pantalla y correctores.
    document.documentElement.lang = prefs.lang === 'va' ? 'ca' : prefs.lang
    document.documentElement.dataset.mode = prefs.mode ?? 'none'
  }, [prefs])

  const t = useCallback(
    (key: StringKey, vars?: Record<string, string | number>) => {
      let text = dictionaries[prefs.lang][key] ?? dictionaries.es[key] ?? key
      if (vars) for (const [k, v] of Object.entries(vars)) text = text.replaceAll(`{${k}}`, String(v))
      return text
    },
    [prefs.lang],
  )

  const value = useMemo<AppState>(
    () => ({
      ...prefs,
      setMode: (mode) => setPrefs((p) => ({ ...p, mode })),
      setLang: (lang) => setPrefs((p) => ({ ...p, lang })),
      t,
    }),
    [prefs, t],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
