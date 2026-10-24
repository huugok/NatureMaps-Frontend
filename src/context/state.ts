import { createContext } from 'react'
import type { Mode } from '../types'

export interface AppState {
  mode: Mode | null
  setMode: (mode: Mode | null) => void
}

export const AppContext = createContext<AppState | null>(null)
