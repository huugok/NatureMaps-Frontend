import { useState } from 'react';
import { BottomNavigation } from './components/BottomNavigation';
import { FichaPlantaPage } from './pages/FichaPlanta';
import { ScanPage } from './pages/Scan';
import type { TabId } from './types/navigation';

type Screen = 'tabs' | 'ficha';

function App() {
  const [activeTab, setActiveTab] = useState<TabId>('mapa');
  const [screen, setScreen] = useState<Screen>('tabs');

  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab);
    setScreen('tabs');
  };

  const handleViewOnMap = () => {
    // La pantalla de mapa todavía no existe: se deja la pestaña activa para que
    // el "Ver en el mapa" de la ficha tenga sentido cuando llegue su UT.
    setActiveTab('mapa');
    setScreen('tabs');
  };

  return (
    <main className="min-h-screen bg-neutral-100 flex flex-col justify-end">
      <div className="flex-1">
        {screen === 'tabs' &&
          (activeTab === 'escanear' ? (
            <ScanPage />
          ) : (
            <div className="mx-auto w-full max-w-md px-4 pt-20">
              {/* Entrada provisional a la ficha: todavía no existen las pantallas de mapa
                  ni de búsqueda, que serán las que abran una ficha de verdad. Esta tarjeta
                  desaparece en cuanto lleguen. */}
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
          ))}

        {screen === 'ficha' && (
          <FichaPlantaPage onBack={() => setScreen('tabs')} onViewOnMap={handleViewOnMap} />
        )}
      </div>

      <BottomNavigation activeTab={activeTab} onChange={handleTabChange} />
    </main>
  );
}

export default App;
