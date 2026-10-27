import { useRef, useState } from 'react';
import { Settings as SettingsIcon } from 'lucide-react';
import { BottomNavigation } from './components/BottomNavigation';
import { CameraScreen } from './components/Camera';
import type { CameraMode } from './components/Camera';
import { FichaPlantaPage, fichaDesdeIdentificacion } from './pages/FichaPlanta';
import type { FichaEspecie, IdentificacionFicha } from './pages/FichaPlanta';
import { LanguagePage, SettingsPage } from './pages/Settings';
import { identifyPlant } from './services/identify';
import { readLanguagePreference, saveLanguagePreference } from './services/languagePreference';
import type { Language } from './types/language';
import type { PlantIdentification, PlantMatch } from './types/identify';
import type { TabId } from './types/navigation';

type Screen = 'tabs' | 'settings' | 'language' | 'ficha';
type IdentificationStatus = 'idle' | 'identifying' | 'completed' | 'error';

/** Ficha abierta por encima de la pantalla actual. */
interface FichaAbierta {
  species: FichaEspecie;
  identification: IdentificacionFicha | null;
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, encoded] = dataUrl.split(',');
  if (!header || !encoded) throw new Error('La imagen capturada no tiene un formato válido');
  const mimeType = /^data:(.*?);base64$/.exec(header)?.[1] ?? 'image/jpeg';
  const binary = atob(encoded);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new Blob([bytes], { type: mimeType });
}

function App() {
  const [activeTab, setActiveTab] = useState<TabId>('inicio');
  const [screen, setScreen] = useState<Screen>('tabs');
  const [language, setLanguage] = useState<Language>(readLanguagePreference);
  const [identificationStatus, setIdentificationStatus] = useState<IdentificationStatus>('idle');
  const [identificationResults, setIdentificationResults] = useState<PlantIdentification | null>(null);
  const [identificationError, setIdentificationError] = useState<string | null>(null);
  /**
   * La ficha se pinta por encima del escaneo en vez de sustituirlo: así al
   * volver sigue la foto capturada, el resultado y la especie marcada.
   */
  const [ficha, setFicha] = useState<FichaAbierta | null>(null);
  const previousTab = useRef<TabId>('inicio');

  const handleTabChange = (tab: TabId) => {
    if (tab === 'escanear' && activeTab !== 'escanear') previousTab.current = activeTab;
    setActiveTab(tab);
    setScreen('tabs');
  };

  const handleSaveLanguage = (next: Language) => {
    saveLanguagePreference(next);
    setLanguage(next);
  };

  const handlePhotoCaptured = () => {
    setIdentificationResults(null);
    setIdentificationError(null);
    setIdentificationStatus('idle');
  };

  const handleIdentifyPhoto = async (dataUrl: string, mode: CameraMode) => {
    if (mode !== 'planta') return;

    setIdentificationStatus('identifying');
    setIdentificationResults(null);
    setIdentificationError(null);
    try {
      const image = dataUrlToBlob(dataUrl);
      const result = await identifyPlant(image, `captura.${image.type === 'image/png' ? 'png' : 'jpg'}`);
      setIdentificationResults(result);
      setIdentificationStatus('completed');
    } catch (error) {
      setIdentificationError(error instanceof Error ? error.message : 'Error inesperado al identificar la planta.');
      setIdentificationStatus('error');
    }
  };

  /** PA 1250: abre la ficha de la especie identificada con su confianza. */
  const handleOpenSpecies = (match: PlantMatch, photo: string | null) => {
    setFicha({
      species: fichaDesdeIdentificacion(match, photo),
      identification: { score: match.score },
    });
  };

  const handleViewOnMap = () => {
    setFicha(null);
    setActiveTab('mapa');
    setScreen('tabs');
  };

  return (
    <div className="h-dvh min-h-screen bg-black flex flex-col font-sans text-neutral-900 overflow-hidden">
      <div className="contents" inert={ficha !== null}>
        <main className="flex-1 min-h-0 flex flex-col w-full max-w-md mx-auto overflow-hidden relative">
          {screen === 'ficha' ? (
            <FichaPlantaPage onBack={() => setScreen('tabs')} onViewOnMap={handleViewOnMap} />
          ) : screen === 'settings' ? (
            <SettingsPage
              language={language}
              onBack={() => setScreen('tabs')}
              onOpenLanguage={() => setScreen('language')}
            />
          ) : screen === 'language' ? (
            <LanguagePage
              language={language}
              onBack={() => setScreen('settings')}
              onSave={handleSaveLanguage}
            />
          ) : activeTab === 'escanear' ? (
            <CameraScreen
              onClose={() => setActiveTab(previousTab.current)}
              onPhotoCaptured={handlePhotoCaptured}
              onIdentifyPhoto={handleIdentifyPhoto}
              onOpenSpecies={handleOpenSpecies}
              identificationStatus={identificationStatus}
              identificationResults={identificationResults}
              identificationError={identificationError}
            />
          ) : (
            <div className="flex-1 bg-neutral-950">
              <button
                type="button"
                onClick={() => setScreen('settings')}
                aria-label="Abrir Ajustes"
                className="fixed right-4 top-4 z-40 flex h-11 items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 text-neutral-700 shadow-md transition-colors hover:text-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2"
              >
                <SettingsIcon size={20} aria-hidden="true" />
                <span className="text-sm font-semibold">Ajustes</span>
              </button>
              <div className="mx-auto w-full max-w-md px-4 pt-20">
                <button
                  type="button"
                  onClick={() => setScreen('ficha')}
                  className="w-full rounded-2xl border border-neutral-200 bg-white p-4 text-left shadow-sm transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
                >
                  <span className="block text-base font-semibold text-neutral-900">Ficha de planta (vista previa)</span>
                  <span className="mt-1 block text-sm text-neutral-500">
                    Entrada provisional con datos de ejemplo (UT RF3): desaparecerá cuando existan el mapa y la búsqueda.
                  </span>
                </button>
              </div>
            </div>
          )}
        </main>

        <BottomNavigation activeTab={activeTab} onChange={handleTabChange} position="fixed" />
      </div>

      {ficha !== null && (
        <div className="fixed inset-0 z-[70] overflow-y-auto bg-neutral-100">
          <FichaPlantaPage
            species={ficha.species}
            identification={ficha.identification}
            onBack={() => setFicha(null)}
            onViewOnMap={handleViewOnMap}
          />
        </div>
      )}
    </div>
  );
}

export default App;
