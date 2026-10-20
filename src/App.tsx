import { useState } from 'react';
import { Settings as SettingsIcon } from 'lucide-react';
import { BottomNavigation } from './components/BottomNavigation';
import { LanguagePage, SettingsPage } from './pages/Settings';
import { readLanguagePreference, saveLanguagePreference } from './services/languagePreference';
import type { Language } from './types/language';
import type { TabId } from './types/navigation';

type Screen = 'tabs' | 'settings' | 'language';

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

  return (
    <main className="min-h-screen bg-neutral-100 flex flex-col">
      <div className="flex-1">
        {screen === 'tabs' && (
          <button
            type="button"
            onClick={() => setScreen('settings')}
            aria-label="Abrir Ajustes"
            className="fixed right-4 top-4 z-40 flex h-11 items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 text-neutral-700 shadow-md transition-colors hover:text-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2"
          >
            <SettingsIcon size={20} aria-hidden="true" />
            <span className="text-sm font-semibold">Ajustes</span>
          </button>
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
      </div>

      <BottomNavigation activeTab={activeTab} onChange={handleTabChange} />
    </main>
  );
}

export default App;
