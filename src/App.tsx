import { useEffect, useRef, useState } from 'react';
import { Settings as SettingsIcon, Trees } from 'lucide-react';
import { BottomNavigation } from './components/BottomNavigation';
import { CameraScreen } from './components/Camera';
import type { CameraMode } from './components/Camera';
import { FichaPlantaPage } from './pages/FichaPlanta';
import { LanguagePage, SettingsPage } from './pages/Settings';
import { identifyPlant } from './services/identify';
import { commonNameFor, findSpeciesIndexByScientificName, fichaDesdeDetalle, getSpeciesDetail, getSpeciesList } from './services/ficha';
import type { EspecieFicha, FichaListItem } from './services/ficha';
import { readLanguagePreference, saveLanguagePreference } from './services/languagePreference';
import type { Language } from './types/language';
import type { PlantIdentification } from './types/identify';
import type { TabId } from './types/navigation';

type Screen = 'tabs' | 'settings' | 'language' | 'ficha';
type IdentificationStatus = 'idle' | 'identifying' | 'completed' | 'error';

type FichaListState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; items: FichaListItem[] };
type FichaDetailState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; especie: EspecieFicha };

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, encoded] = dataUrl.split(',');
  if (!header || !encoded) throw new Error('La imagen capturada no tiene un formato válido');
  const mimeType = /^data:(.*?);base64$/.exec(header)?.[1] ?? 'image/jpeg';
  const binary = atob(encoded);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new Blob([bytes], { type: mimeType });
}

/** Pantalla simple de estado (carga o aviso) al estilo del resto de la app. */
function FichaEstado({ mensaje }: { mensaje: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-neutral-100 px-6 text-center" role="status">
      <Trees size={40} className="text-emerald-700" aria-hidden="true" />
      <p className="text-sm text-neutral-600">{mensaje}</p>
    </div>
  );
}

/** Pantalla de error con reintentar: sin datos falsos, la ficha es honesta
 * sobre lo que no puede cargar (el sin-conexión llega en otra UT). */
function FichaError({ mensaje, onBack, onRetry }: { mensaje: string; onBack: () => void; onRetry: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-neutral-100 px-6 text-center">
      <Trees size={40} className="text-neutral-400" aria-hidden="true" />
      <p role="alert" className="text-sm text-neutral-600">{mensaje}</p>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={onBack}
          className="min-h-11 rounded-xl border border-neutral-200 bg-white px-4 text-sm font-semibold text-neutral-700 shadow-sm hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
        >
          Volver
        </button>
        <button
          type="button"
          onClick={onRetry}
          className="min-h-11 rounded-xl bg-emerald-800 px-4 text-sm font-semibold text-white shadow-sm hover:bg-emerald-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
        >
          Reintentar
        </button>
      </div>
    </div>
  );
}

function App() {
  const [activeTab, setActiveTab] = useState<TabId>('inicio');
  const [screen, setScreen] = useState<Screen>('tabs');
  const [language, setLanguage] = useState<Language>(readLanguagePreference);
  const [identificationStatus, setIdentificationStatus] = useState<IdentificationStatus>('idle');
  const [identificationResults, setIdentificationResults] = useState<PlantIdentification | null>(null);
  const [identificationError, setIdentificationError] = useState<string | null>(null);
  const [fichaList, setFichaList] = useState<FichaListState>({ status: 'loading' });
  const [fichaListAttempt, setFichaListAttempt] = useState(0);
  const [fichaIndex, setFichaIndex] = useState(0);
  const [fichaDetail, setFichaDetail] = useState<FichaDetailState>({ status: 'loading' });
  const [fichaDetailAttempt, setFichaDetailAttempt] = useState(0);
  const previousTab = useRef<TabId>('inicio');

  // La lista del catálogo alimenta la ficha y su navegación: se carga al montar
  // y se vuelve a pedir si cambia el idioma (no hay traducción automática).
  // El estado de carga lo ponen los eventos (montaje inicial, idioma, reintento);
  // el efecto solo fija el resultado.
  useEffect(() => {
    let cancelled = false;
    getSpeciesList(language)
      .then((items) => { if (!cancelled) setFichaList({ status: 'ready', items }); })
      .catch(() => { if (!cancelled) setFichaList({ status: 'error' }); });
    return () => { cancelled = true; };
  }, [language, fichaListAttempt]);

  const fichaItems = fichaList.status === 'ready' ? fichaList.items : [];
  // Índice a prueba de cambios de lista (p. ej. menos especies tras un refetch).
  const index = fichaItems.length > 0 ? Math.min(fichaIndex, fichaItems.length - 1) : 0;
  const fichaItem = fichaItems[index];

  // Detalle de la especie abierta: se pide al entrar en la ficha, al navegar
  // con las flechas y cuando cambia el idioma (carga ya puesta por el evento).
  useEffect(() => {
    if (screen !== 'ficha' || !fichaItem) return;
    let cancelled = false;
    getSpeciesDetail(fichaItem.id, language)
      .then((detail) => { if (!cancelled) setFichaDetail({ status: 'ready', especie: fichaDesdeDetalle(detail, language) }); })
      .catch(() => { if (!cancelled) setFichaDetail({ status: 'error' }); });
    return () => { cancelled = true; };
  }, [screen, language, fichaItem, fichaDetailAttempt]);

  const handleTabChange = (tab: TabId) => {
    if (tab === 'escanear' && activeTab !== 'escanear') previousTab.current = activeTab;
    setActiveTab(tab);
    setScreen('tabs');
  };

  const handleSaveLanguage = (next: Language) => {
    saveLanguagePreference(next);
    setLanguage(next);
    // Recarga lista y ficha en el nuevo idioma (el efecto lo pide; aquí solo
    // se vuelve al estado de carga para no mostrar contenido en otro idioma).
    setFichaList({ status: 'loading' });
    setFichaDetail({ status: 'loading' });
  };

  /** Entra en la ficha en la posición dada, siempre con carga fresca. */
  const abrirFicha = (nextIndex: number) => {
    setFichaIndex(nextIndex);
    setFichaDetail({ status: 'loading' });
    setScreen('ficha');
  };

  const retryFichaList = () => {
    setFichaList({ status: 'loading' });
    setFichaListAttempt((intentos) => intentos + 1);
  };

  const retryFichaDetail = () => {
    setFichaDetail({ status: 'loading' });
    setFichaDetailAttempt((intentos) => intentos + 1);
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

  // Pl@ntNet -> ficha: si la especie identificada existe en el catálogo cargado,
  // se ofrece abrir su ficha (match client-side por nombre científico).
  const identifiedIndex = identificationStatus === 'completed' && identificationResults && fichaList.status === 'ready'
    ? findSpeciesIndexByScientificName(fichaList.items, identificationResults.bestMatch)
    : null;
  const identifiedSpeciesName = identifiedIndex !== null && fichaList.status === 'ready'
    ? commonNameFor(fichaList.items[identifiedIndex]?.names ?? [], language) ?? fichaList.items[identifiedIndex]?.scientificName ?? null
    : null;

  const handleOpenSpeciesFicha = identifiedIndex !== null
    ? () => { abrirFicha(identifiedIndex); }
    : undefined;

  const handleViewOnMap = () => {
    setActiveTab('mapa');
    setScreen('tabs');
  };

  return (
    <div className="h-dvh min-h-screen bg-neutral-100 flex flex-col font-sans text-neutral-900 overflow-hidden">
      <main className="flex-1 min-h-0 flex flex-col w-full max-w-md mx-auto overflow-hidden relative">
        {screen === 'ficha' ? (
          fichaList.status === 'loading' ? (
            <FichaEstado mensaje="Cargando el catálogo de especies…" />
          ) : fichaList.status === 'error' ? (
            <FichaError
              mensaje="No se ha podido cargar el catálogo de especies."
              onBack={() => setScreen('tabs')}
              onRetry={retryFichaList}
            />
          ) : fichaList.items.length === 0 ? (
            <FichaEstado mensaje="El catálogo todavía no tiene especies." />
          ) : fichaDetail.status === 'loading' ? (
            <FichaEstado mensaje={`Cargando la ficha de ${fichaItem?.scientificName ?? 'la especie'}…`} />
          ) : fichaDetail.status === 'error' ? (
            <FichaError
              mensaje="No se ha podido cargar la ficha de la especie."
              onBack={() => setScreen('tabs')}
              onRetry={retryFichaDetail}
            />
          ) : (
            <div
              key={fichaDetail.especie.id}
              className="mb-[calc(62px+env(safe-area-inset-bottom,0px))] flex-1 min-h-0 overflow-y-auto"
            >
              {/* El main lleva overflow-hidden (la cámara ocupa pantalla fija),
                  así que la ficha necesita su propio scroll. La key remonta el
                  contenedor por especie: al navegar con las flechas, el scroll
                  empieza arriba en lugar de quedarse a media ficha. El margen
                  inferior deja fuera de la zona de scroll los 62px que ocupa la
                  barra de navegación fija: si no, la barra de scroll se corta
                  detrás de la nav. */}
              <FichaPlantaPage
                species={fichaDetail.especie}
                position={index}
                total={fichaList.items.length}
                onBack={() => setScreen('tabs')}
                onViewOnMap={handleViewOnMap}
                onPrevious={index > 0 ? () => setFichaIndex(index - 1) : undefined}
                onNext={index < fichaList.items.length - 1 ? () => setFichaIndex(index + 1) : undefined}
              />
            </div>
          )
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
            identificationStatus={identificationStatus}
            identificationResults={identificationResults}
            identificationError={identificationError}
            identifiedSpecies={identifiedSpeciesName ? { name: identifiedSpeciesName } : null}
            onOpenSpeciesFicha={handleOpenSpeciesFicha}
          />
        ) : (
          <div className="flex-1 bg-neutral-100">
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
                onClick={() => abrirFicha(0)}
                className="w-full rounded-2xl border border-neutral-200 bg-white p-4 text-left shadow-sm transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
              >
                <span className="block text-base font-semibold text-neutral-900">Ficha de planta</span>
                <span className="mt-1 block text-sm text-neutral-500">
                  Ficha botánica conectada al catálogo real del backend (UT RF3).
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
