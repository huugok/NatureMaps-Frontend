import { Outlet } from 'react-router-dom'

/** Pantallas secundarias (ajustes, detalle…): sin barra inferior. */
export function FullLayout() {
  return (
    <main className="min-h-0 flex-1 overflow-y-auto">
      <Outlet />
    </main>
  )
}
