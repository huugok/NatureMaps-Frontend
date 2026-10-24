import { render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { AppProvider } from '../context/AppContext'

interface Options {
  /** Ruta inicial. */
  route?: string
  /** Historial completo (para probar "volver"); tiene prioridad sobre route. */
  entries?: string[]
  index?: number
}

/** Renderiza dentro de un router en memoria y del estado global de la app. */
export function renderWithProviders(ui: ReactElement, { route = '/', entries, index }: Options = {}) {
  return render(
    <MemoryRouter initialEntries={entries ?? [route]} initialIndex={index}>
      <AppProvider>{ui}</AppProvider>
    </MemoryRouter>,
  )
}
