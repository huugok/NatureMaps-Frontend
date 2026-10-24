import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { FullLayout } from './components/FullLayout'
import { Page } from './components/Page'
import { TabLayout } from './components/TabLayout'
import { useApp } from './context/useApp'
import { Components } from './pages/Components'
import { Home } from './pages/Home'
import { ModeSelect } from './pages/ModeSelect'
import { NotFound } from './pages/NotFound'
import { PermisoCamara } from './pages/PermisoCamara'
import { RoutesList } from './pages/RoutesList'
import { Scan } from './pages/Scan'
import { Search } from './pages/Search'
import { Settings } from './pages/Settings'

// Leaflet pesa mucho: el mapa se descarga solo cuando se entra en /mapa.
const MapScreen = lazy(() => import('./pages/MapScreen').then((m) => ({ default: m.MapScreen })))

function MapFallback() {
  return (
    <Page title="Mapa" flush>
      <p role="status" className="grid flex-1 place-items-center text-small text-muted">
        Cargando mapa…
      </p>
    </Page>
  )
}

// Mapa de rutas de la app. Para añadir una pantalla:
// 1) crea src/pages/MiPantalla/ (MiPantalla.tsx, MiPantalla.test.tsx, index.ts) usando <Page>
// 2) añade aquí su <Route>.
export default function App() {
  const { mode } = useApp()
  return (
    <div className="mx-auto flex h-dvh max-w-[480px] flex-col overflow-hidden bg-app min-[560px]:mt-4 min-[560px]:h-[min(900px,calc(100dvh-32px))] min-[560px]:rounded-[32px] min-[560px]:shadow-[0_0_0_8px_#17241b,0_20px_50px_rgba(0,0,0,0.25)]">
      <Routes>
        <Route path="/" element={<Navigate to={mode ? '/inicio' : '/modo'} replace />} />

        {/* Con barra inferior */}
        <Route element={<TabLayout />}>
          <Route path="/inicio" element={<Home />} />
          <Route
            path="/mapa"
            element={
              <Suspense fallback={<MapFallback />}>
                <MapScreen />
              </Suspense>
            }
          />
          <Route path="/escanear" element={<Scan />} />
          <Route path="/rutas" element={<RoutesList />} />
          <Route path="/buscar" element={<Search />} />
        </Route>

        {/* Sin barra inferior */}
        <Route element={<FullLayout />}>
          <Route path="/modo" element={<ModeSelect />} />
          <Route path="/permiso-camara" element={<PermisoCamara />} />
          <Route path="/ajustes" element={<Settings />} />
          <Route path="/componentes" element={<Components />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </div>
  )
}
