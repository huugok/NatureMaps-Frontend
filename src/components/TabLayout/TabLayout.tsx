import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import type { TabId } from '../../types/navigation'
import { BottomNavigation, DEFAULT_TABS } from '../BottomNavigation'

/** Las rutas de las pestañas coinciden con su id: /inicio, /mapa, /escanear, /rutas, /buscar. */
function tabFromPath(pathname: string): TabId {
  const id = pathname.split('/')[1]
  return DEFAULT_TABS.find((tab) => tab.id === id)?.id ?? 'inicio'
}

/** Pantallas principales: contenido + barra inferior. */
export function TabLayout() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const activeTab = tabFromPath(pathname)

  return (
    <>
      <main className="min-h-0 flex-1 overflow-y-auto">
        <div role="tabpanel" id={`tabpanel-${activeTab}`} aria-labelledby={`tab-${activeTab}`} className="h-full">
          <Outlet />
        </div>
      </main>
      <BottomNavigation position="relative" activeTab={activeTab} onChange={(tab) => navigate(`/${tab}`)} />
    </>
  )
}
