import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { CameraScreen } from './components/Camera';
import type { CameraMode } from './components/Camera';
import { FullLayout } from './components/FullLayout';
import { TabLayout } from './components/TabLayout';
import { useApp } from './context/useApp';
import { useAppFrameScale } from './hooks/useAppFrameScale';
import { Components } from './pages/Components';
import {
  FichaPlantaPage,
  FichaRoute,
  fichaDesdeIdentificacion,
} from './pages/FichaPlanta';
import type {
  FichaDetailState,
  FichaListState,
} from './pages/FichaPlanta';
import type { FichaEspecie, IdentificacionFicha } from './pages/FichaPlanta';
import { Home } from './pages/Home';
import { ModeSelect } from './pages/ModeSelect';
import { NotFound } from './pages/NotFound';
import { RoutesList } from './pages/RoutesList';
import { Search } from './pages/Search';
import { LanguageSettings, Settings } from './pages/Settings';
import { identifyPlant } from './services/identify';
import {
  findSpeciesIndexByScientificName,
  fichaDesdeDetalleConFuentes,
  fichaDesdeItemLista,
  fichaDesdePlanta,
  getSpeciesDetail,
  getSpeciesList,
} from './services/ficha';
import type { Language } from './types/language';
import type { PlantIdentification, PlantMatch } from './types/identify';
import type { PlantPin } from './types/plant';

type IdentificationStatus = 'idle' | 'identifying' | 'completed' | 'error';

/** Ficha abierta por encima del escaneo o del mapa: conserva foto, resultado y
 * especie marcada, y deja viva la pantalla que había debajo. */
interface FichaAbierta {
  species: FichaEspecie;
  identification: IdentificacionFicha | null;
  /** «mapa» cuando se abrió tocando un punto: ya se está en el mapa y no
   * tiene sentido ofrecer «Ver en el mapa». */
  origin?: 'mapa';
}

const MapPage = lazy(() =>
  import('./pages/Map').then((module) => ({ default: module.MapPage })),
);

const TypographyLab = lazy(() =>
  import('./pages/TypographyLab').then((module) => ({ default: module.TypographyLab })),
);

const ColorLab = lazy(() =>
  import('./pages/ColorLab').then((module) => ({ default: module.ColorLab })),
);

function LabFallback() {
  return (
    <p role="status" className="p-4 text-small text-muted">
      Cargando laboratorio…
    </p>
  );
}

function MapFallback() {
  const { t } = useApp();
  return (
    <div className="flex h-full flex-col bg-app">
      <header className="px-4 pt-5 pb-4">
        <h1 className="font-display text-title leading-tight font-bold">{t('map.title')}</h1>
      </header>
      <p role="status" className="grid flex-1 place-items-center text-small text-muted">
        {t('map.loading')}
      </p>
    </div>
  );
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, encoded] = dataUrl.split(',');
  if (!header || !encoded) throw new Error('La imagen capturada no tiene un formato válido');
  const mimeType = /^data:(.*?);base64$/.exec(header)?.[1] ?? 'image/jpeg';
  const binary = atob(encoded);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new Blob([bytes], { type: mimeType });
}

export default function App() {
  const { mode, lang, setLang, t } = useApp();
  const frameScale = useAppFrameScale();
  const navigate = useNavigate();
  const location = useLocation();
  const [identificationStatus, setIdentificationStatus] = useState<IdentificationStatus>('idle');
  const [identificationResults, setIdentificationResults] = useState<PlantIdentification | null>(null);
  const [identificationError, setIdentificationError] = useState<string | null>(null);

  const [fichaList, setFichaList] = useState<FichaListState>({ status: 'loading' });
  const [fichaListAttempt, setFichaListAttempt] = useState(0);
  const [fichaIndex, setFichaIndex] = useState(0);
  const [fichaDetail, setFichaDetail] = useState<FichaDetailState>({ status: 'loading' });
  const [fichaDetailAttempt, setFichaDetailAttempt] = useState(0);
  const [ficha, setFicha] = useState<FichaAbierta | null>(null);

  // Catálogo que alimenta la ficha y su navegación. Se recarga al cambiar idioma.
  useEffect(() => {
    let cancelled = false;
    getSpeciesList(lang)
      .then((items) => {
        if (!cancelled) setFichaList({ status: 'ready', items });
      })
      .catch(() => {
        if (!cancelled) setFichaList({ status: 'error' });
      });
    return () => {
      cancelled = true;
    };
  }, [lang, fichaListAttempt]);

  const fichaItems = fichaList.status === 'ready' ? fichaList.items : [];
  const index = fichaItems.length > 0 ? Math.min(fichaIndex, fichaItems.length - 1) : 0;
  const fichaItem = fichaItems[index];

  // Detalle de la especie abierta: al entrar en /ficha, al navegar y al cambiar idioma.
  useEffect(() => {
    if (location.pathname !== '/ficha' || !fichaItem) return;
    let cancelled = false;
    getSpeciesDetail(fichaItem.id, lang)
      .then((detail) => fichaDesdeDetalleConFuentes(detail, lang))
      .then((especie) => {
        if (!cancelled) setFichaDetail({ status: 'ready', especie });
      })
      .catch(() => {
        if (!cancelled) setFichaDetail({ status: 'error' });
      });
    return () => {
      cancelled = true;
    };
  }, [location.pathname, lang, fichaItem, fichaDetailAttempt]);

  const handleSaveLanguage = (next: Language) => {
    setLang(next);
    setFichaList({ status: 'loading' });
    setFichaDetail({ status: 'loading' });
  };

  const cambiarFicha = (nextIndex: number) => {
    setFichaIndex(nextIndex);
    setFichaDetail({ status: 'loading' });
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

  const handleIdentifyPhoto = async (dataUrl: string, cameraMode: CameraMode) => {
    if (cameraMode !== 'planta') return;

    setIdentificationStatus('identifying');
    setIdentificationResults(null);
    setIdentificationError(null);
    try {
      const image = dataUrlToBlob(dataUrl);
      const result = await identifyPlant(image, `captura.${image.type === 'image/png' ? 'png' : 'jpg'}`);
      setIdentificationResults(result);
      setIdentificationStatus('completed');
    } catch (error) {
      setIdentificationError(error instanceof Error ? error.message : t('camera.error'));
      setIdentificationStatus('error');
    }
  };

  /** Abre la ficha real si la especie está en el catálogo; si no, la de Pl@ntNet. */
  const handleOpenSpecies = (match: PlantMatch, photo: string | null) => {
    const identificacion = { score: match.score };
    const items = fichaList.status === 'ready' ? fichaList.items : null;
    const identifiedIndex = items
      ? findSpeciesIndexByScientificName(items, match.scientificName)
      : null;

    if (items === null || identifiedIndex === null) {
      setFicha({ species: fichaDesdeIdentificacion(match, photo, lang), identification: identificacion });
      return;
    }

    const item = items[identifiedIndex];
    setFicha({ species: fichaDesdeItemLista(item, lang), identification: identificacion });
    getSpeciesDetail(item.id, lang)
      .then((detail) => fichaDesdeDetalleConFuentes(detail, lang))
      .then((species) => {
        setFicha((actual) =>
          actual?.species.scientificName === species.scientificName
            ? { species, identification: actual.identification }
            : actual,
        );
      })
      .catch(() => {
        // La ficha instantánea ya es válida; el detalle solo añade ubicaciones.
      });
  };

  /** Abre la ficha de la planta tocada en el mapa (F03.1) como overlay: el
   * mapa sigue montado debajo, así que al volver conserva centro y zoom
   * (PA 691). Se pinta al instante con la lista del catálogo o, si aún no está
   * cargada, con el nombre del propio punto; el detalle la enriquece después. */
  const handleOpenPlantFromMap = useCallback((plant: PlantPin) => {
    const items = fichaList.status === 'ready' ? fichaList.items : [];
    const matchedIndex =
      plant.speciesId == null
        ? findSpeciesIndexByScientificName(items, plant.scientificName ?? null)
        : null;
    const item =
      plant.speciesId != null
        ? items.find((entry) => entry.id === plant.speciesId)
        : matchedIndex === null
          ? undefined
          : items[matchedIndex];
    // El inventario no enlaza todas sus plantas con el catálogo: si el nombre
    // científico reportado coincide (incluido «x»/«×»), se abre esa ficha.
    const speciesId = item?.id ?? plant.speciesId ?? undefined;
    setFicha({
      species: item ? fichaDesdeItemLista(item, lang) : fichaDesdePlanta(plant),
      identification: null,
      origin: 'mapa',
    });
    if (speciesId === undefined) return;

    getSpeciesDetail(speciesId, lang)
      .then((detail) => fichaDesdeDetalleConFuentes(detail, lang))
      .then((species) => {
        setFicha((actual) =>
          actual !== null && actual.species.id === speciesId
            ? { species, identification: actual.identification, origin: actual.origin }
            : actual,
        );
      })
      .catch(() => {
        // La ficha instantánea ya identifica la planta; el detalle solo añade contenido.
      });
  }, [fichaList, lang]);

  /** «Ver en el mapa» (RF3): al mapa; con especie de catálogo, pidiendo al
   * mapa que centre su ejemplar más cercano (parámetro de un solo uso). */
  const handleViewOnMap = (speciesId?: number) => {
    setFicha(null);
    navigate(speciesId === undefined ? '/mapa' : `/mapa?verEspecie=${speciesId}`);
  };

  return (
    <div className="app-shell">
      <div className="app-frame" style={{ zoom: frameScale }}>
        <div className="flex h-full flex-col" inert={ficha !== null}>
          <Routes>
            <Route path="/" element={<Navigate to={mode ? '/inicio' : '/modo'} replace />} />

            <Route element={<TabLayout />}>
              <Route path="/inicio" element={<Home />} />
              <Route
                path="/escanear"
                element={
                  <CameraScreen
                    onClose={() => navigate('/inicio')}
                    onPhotoCaptured={handlePhotoCaptured}
                    onIdentifyPhoto={handleIdentifyPhoto}
                    onOpenSpecies={handleOpenSpecies}
                    identificationStatus={identificationStatus}
                    identificationResults={identificationResults}
                    identificationError={identificationError}
                  />
                }
              />
              <Route
                path="/mapa"
                element={
                  <Suspense fallback={<MapFallback />}>
                    <MapPage onOpenPlant={handleOpenPlantFromMap} />
                  </Suspense>
                }
              />
              <Route path="/rutas" element={<RoutesList />} />
              <Route path="/buscar" element={<Search />} />
            </Route>

            <Route element={<FullLayout />}>
              <Route path="/modo" element={<ModeSelect />} />
              <Route
                path="/ajustes"
                element={
                  <Settings
                    language={lang}
                    onBack={() => navigate('/inicio')}
                  />
                }
              />
              <Route
                path="/ajustes/idioma"
                element={
                  <LanguageSettings
                    language={lang}
                    onBack={() => navigate('/ajustes')}
                    onSave={handleSaveLanguage}
                  />
                }
              />
              <Route
                path="/ficha"
                element={
                  <FichaRoute
                    list={fichaList}
                    index={index}
                    detail={fichaDetail}
                    onBack={() => navigate('/inicio')}
                    onRetryList={retryFichaList}
                    onRetryDetail={retryFichaDetail}
                    onPrevious={index > 0 ? () => cambiarFicha(index - 1) : undefined}
                    onNext={index < fichaItems.length - 1 ? () => cambiarFicha(index + 1) : undefined}
                    onViewOnMap={handleViewOnMap}
                  />
                }
              />
              <Route path="/componentes" element={<Components />} />
              <Route
                path="/tipografia"
                element={
                  <Suspense fallback={<LabFallback />}>
                    <TypographyLab />
                  </Suspense>
                }
              />
              <Route
                path="/color"
                element={
                  <Suspense fallback={<LabFallback />}>
                    <ColorLab />
                  </Suspense>
                }
              />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </div>

        {ficha !== null && (
          <div className="absolute inset-0 z-[70] overflow-y-auto overscroll-contain bg-surface-2">
            <FichaPlantaPage
              species={ficha.species}
              identification={ficha.identification}
              onBack={() => setFicha(null)}
              onViewOnMap={ficha.origin === 'mapa' ? undefined : handleViewOnMap}
            />
          </div>
        )}
      </div>
    </div>
  );
}
