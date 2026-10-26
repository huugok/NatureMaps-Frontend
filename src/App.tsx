import { useState } from 'react';
import { Settings as SettingsIcon } from 'lucide-react';
import { BottomNavigation } from './components/BottomNavigation';
import { FichaPlantaPage } from './pages/FichaPlanta';
import { ScanPage } from './pages/Scan';
import { LanguagePage, SettingsPage } from './pages/Settings';
import { readLanguagePreference, saveLanguagePreference } from './services/languagePreference';
import type { Language } from './types/language';
import type { TabId } from './types/navigation';

type Screen = 'tabs' | 'settings' | 'language' | 'ficha';

function App() {
  const [activeTab, setActiveTab] = useState<TabId>('mapa');
  const [screen, setScreen] = useState<Screen>('tabs');
  const [language, setLanguage] = useState<Language>(readLanguagePreference);

  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab);
    setScreen('tabs');
  };

  const handleSaveLanguage = (next: Language) => {
    saveLanguagePreference(next);
    setLanguage(next);
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
        {screen === 'tabs' && (
          <>
            <button
              type="button"
              onClick={() => setScreen('settings')}
              aria-label="Abrir Ajustes"
              className="fixed right-4 top-4 z-40 flex h-11 items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 text-neutral-700 shadow-md transition-colors hover:text-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2"
            >
              <SettingsIcon size={20} aria-hidden="true" />
              <span className="text-sm font-semibold">Ajustes</span>
            </button>

            {activeTab === 'escanear' ? (
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
            )}
          </>
        )}

        {screen === 'settings' && (
          <SettingsPage
            language={language}
            onBack={() => setScreen('tabs')}
            onOpenLanguage={() => setScreen('language')}
          />
        )}

        {screen === 'language' && (
          <LanguagePage
            language={language}
            onBack={() => setScreen('settings')}
            onSave={handleSaveLanguage}
          />
        )}

        {screen === 'ficha' && (
          <FichaPlantaPage onBack={() => setScreen('tabs')} onViewOnMap={handleViewOnMap} />
        )}
      </div>

      <BottomNavigation activeTab={activeTab} onChange={handleTabChange} />
    </main>
  );
}

export default App;
