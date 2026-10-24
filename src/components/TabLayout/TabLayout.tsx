import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useApp } from '../../context/useApp'
import type { StringKey } from '../../i18n/strings'
import type { TabConfig, TabId } from '../../types/navigation'
import { BottomNavigation, DEFAULT_TABS } from '../BottomNavigation'

// Textos traducibles de cada pestaña (nombre visible y nombre accesible).
const TAB_TEXT: Record<TabId, { label: StringKey; aria: StringKey }> = {
  inicio: { label: 'nav.home', aria: 'nav.home.aria' },
  mapa: { label: 'nav.map', aria: 'nav.map.aria' },
  escanear: { label: 'nav.scan', aria: 'nav.scan.aria' },
  rutas: { label: 'nav.routes', aria: 'nav.routes.aria' },
  buscar: { label: 'nav.search', aria: 'nav.search.aria' },
}

/** Las rutas de las pestañas coinciden con su id: /inicio, /mapa, /escanear, /rutas, /buscar. */
function tabFromPath(pathname: string): TabId {
  const id = pathname.split('/')[1]
  return DEFAULT_TABS.find((tab) => tab.id === id)?.id ?? 'inicio'
}

/** Pantallas principales: contenido + barra inferior. */
export function TabLayout() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { t } = useApp()
  const activeTab = tabFromPath(pathname)
  const tabs: TabConfig[] = DEFAULT_TABS.map((tab) => ({
    ...tab,
    label: t(TAB_TEXT[tab.id].label),
    ariaLabel: t(TAB_TEXT[tab.id].aria),
  }))

  return (
    <>
      <main className="min-h-0 flex-1 overflow-y-auto">
        <div role="tabpanel" id={`tabpanel-${activeTab}`} aria-labelledby={`tab-${activeTab}`} className="h-full">
          <Outlet />
        </div>
      </main>
      <BottomNavigation
        position="relative"
        tabs={tabs}
        navLabel={t('nav.label')}
        activeText={t('nav.active')}
        activeTab={activeTab}
        onChange={(tab) => navigate(`/${tab}`)}
      />
    </>
  )
}
