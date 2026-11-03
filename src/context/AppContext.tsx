import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Mode } from '../types'
import { AppContext, type AppState } from './state'

// Estado global: modo elegido. Se guarda en localStorage.
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

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ mode }))
    } catch {
      /* ignorar */
    }
    document.documentElement.dataset.mode = mode ?? 'none'
  }, [mode])

  const value = useMemo<AppState>(() => ({ mode, setMode }), [mode])

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
