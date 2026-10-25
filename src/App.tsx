import { useRef, useState } from 'react';
import { BottomNavigation } from './components/BottomNavigation';
import { CameraScreen } from './components/Camera';
import { FichaPlantaPage } from './pages/FichaPlanta';
import type { TabId } from './types/navigation';

type Screen = 'tabs' | 'ficha';

function App() {
  const [activeTab, setActiveTab] = useState<TabId>('inicio');
  const [screen, setScreen] = useState<Screen>('tabs');
  const previousTab = useRef<TabId>('inicio');

  const handleTabChange = (tab: TabId) => {
    if (tab === 'escanear' && activeTab !== 'escanear') {
      previousTab.current = activeTab;
    }
    setActiveTab(tab);
    setScreen('tabs');
  };

  const closeCamera = () => setActiveTab(previousTab.current);

  const handleViewOnMap = () => {
    setActiveTab('mapa');
    setScreen('tabs');
  };

  return (
    <div className="h-dvh min-h-screen bg-black flex flex-col font-sans text-neutral-900 overflow-hidden">
      <main className="flex-1 min-h-0 flex flex-col w-full max-w-md mx-auto overflow-hidden relative">
        {screen === 'ficha' ? (
          <FichaPlantaPage onBack={() => setScreen('tabs')} onViewOnMap={handleViewOnMap} />
        ) : activeTab === 'escanear' ? (
          <CameraScreen onClose={closeCamera} />
        ) : (
          <div className="flex-1 bg-neutral-950">
            <div className="mx-auto w-full max-w-md px-4 pt-20">
              <button
                type="button"
                onClick={() => setScreen('ficha')}
                className="w-full rounded-2xl border border-neutral-200 bg-white p-4 text-left shadow-sm transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
              >
                <span className="block text-base font-semibold text-neutral-900">
                  Ficha de planta (vista previa)
                </span>
                <span className="mt-1 block text-sm text-neutral-500">
                  Entrada provisional con datos de ejemplo (UT RF3): desaparecerá cuando
                  existan el mapa y la búsqueda.
                </span>
              </button>
            </div>
          </div>
        )}
      </main>

      <BottomNavigation activeTab={activeTab} onChange={handleTabChange} position="fixed" />
    </div>
  );
}

export default App;
