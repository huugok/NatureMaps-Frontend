import React, { useRef, useState, useEffect } from 'react';
import { ArrowLeft, X, Zap, ZapOff, RefreshCw, Image as ImageIcon, Download, Leaf, Landmark, Check, ScanSearch, Ban } from 'lucide-react';
import type { CameraMode } from './types';
import type { SavedPhoto } from './types';
import { useApp } from '../../context/useApp';
import type { IdentificationFailure, PlantIdentification, PlantMatch } from '../../types/identify';
import { CameraIdentificationResult } from './CameraIdentificationResult';
import { IdentificationNotice } from '../IdentificationNotice';

type IdentificationStatus = 'idle' | 'identifying' | 'completed' | 'error';

export interface CameraActiveProps {
  mode: CameraMode;
  onModeChange: (mode: CameraMode) => void;
  onClose: () => void;
  onSelectFromGallery: () => void;
  onPhotoCaptured?: (dataUrl: string, mode: CameraMode) => void;
  onIdentifyPhoto?: (dataUrl: string, mode: CameraMode) => void;
  /** Abre la ficha de la especie indicada (PA 1250). */
  onOpenSpecies?: (match: PlantMatch, photo: string | null) => void;
  onSavePhoto: (photo: SavedPhoto) => boolean;
  identificationStatus: IdentificationStatus;
  identificationResults: PlantIdentification | null;
  identificationError: IdentificationFailure | null;
  /** Foto capturada o elegida de la galería; `null` si todavía no hay ninguna. */
  photo: string | null;
  /** Cambia la foto activa (captura, galería o descarte). */
  onPhotoChange: (photo: string | null) => void;
}

export const CameraActive: React.FC<CameraActiveProps> = ({
  mode,
  onModeChange,
  onClose,
  onSelectFromGallery,
  onPhotoCaptured,
  onIdentifyPhoto,
  onOpenSpecies,
  onSavePhoto,
  identificationStatus,
  identificationResults,
  identificationError,
  photo,
  onPhotoChange,
}) => {
  const { t } = useApp();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [flashOn, setFlashOn] = useState(false);
  const [hasRealStream, setHasRealStream] = useState(false);
  const [photoSaved, setPhotoSaved] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const isBackendConnectionError = identificationError?.code === 'unreachable';

  useEffect(() => {
    // Con una foto elegida (por ejemplo, desde la galería) no hace falta abrir
    // la cámara: se muestra la vista previa y el botón de identificar.
    if (photo !== null) {
      return;
    }

    let cancelled = false;

    async function initCamera() {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setHasRealStream(true);
      } catch {
        if (!cancelled) {
          setHasRealStream(false);
        }
      }
    }

    void initCamera();

    return () => {
      cancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [facingMode, photo]);

  const handleToggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  const handleToggleFlash = async () => {
    const newFlashState = !flashOn;
    setFlashOn(newFlashState);

    if (streamRef.current) {
      const track = streamRef.current.getVideoTracks()[0];
      if (track) {
        try {
          await track.applyConstraints({
            advanced: [{ torch: newFlashState } as MediaTrackConstraintSet],
          });
        } catch {
          // Si no está soportado el torch en el dispositivo
        }
      }
    }
  };

  const handleTakePhoto = () => {
    setPhotoSaved(false);
    setSaveError(false);
    if (videoRef.current && hasRealStream) {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        onPhotoChange(dataUrl);
        onPhotoCaptured?.(dataUrl, mode);
        return;
      }
    }

    // Captura simulada para entornos sin webcam física
    const dummyCanvas = document.createElement('canvas');
    dummyCanvas.width = 400;
    dummyCanvas.height = 400;
    const ctx = dummyCanvas.getContext('2d');
    if (ctx) {
      const palette = getComputedStyle(document.documentElement);
      ctx.fillStyle = palette
        .getPropertyValue(mode === 'planta' ? '--color-night' : '--color-ink-2')
        .trim();
      ctx.fillRect(0, 0, 400, 400);
      ctx.fillStyle = palette.getPropertyValue('--color-on-accent').trim();
      ctx.font = '18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(mode === 'planta' ? 'Foto de Planta' : 'Foto de Monumento', 200, 200);
      const dataUrl = dummyCanvas.toDataURL('image/jpeg');
      onPhotoChange(dataUrl);
      onPhotoCaptured?.(dataUrl, mode);
    }
  };

  const handleSavePhoto = () => {
    if (!photo) return;
    const downloadLink = document.createElement('a');
    downloadLink.href = photo;
    downloadLink.download = `${mode}-${new Date().toISOString().replace(/[:.]/g, '-')}.jpg`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    downloadLink.remove();

    const saved = onSavePhoto({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      dataUrl: photo,
      mode,
      label: '',
      createdAt: new Date().toISOString(),
    });
    setPhotoSaved(saved);
    setSaveError(!saved);
  };

  const handleDiscardPhoto = () => {
    onPhotoChange(null);
    // Reinicia el estado de identificación en App: la siguiente foto empieza
    // limpia aunque la anterior se quedara en error.
    onPhotoCaptured?.('', mode);
    setPhotoSaved(false);
    setSaveError(false);
  };

  const handleIdentify = () => {
    if (photo && identificationStatus !== 'identifying' && identificationStatus !== 'completed') {
      onIdentifyPhoto?.(photo, mode);
    }
  };

  const identificationResult = {
    status: identificationStatus,
    mode,
    results: identificationResults,
    // El aviso traducido se pinta aquí; el componente de resultado sigue siendo
    // compatible con su contrato anterior y con el cambio de idioma de UT 921.
    error: null,
    photo,
    onRetry: handleIdentify,
    onOpenSpecies: (match: PlantMatch) => onOpenSpecies?.(match, photo),
    // Volver desde el resultado devuelve a la cámara con la foto descartada,
    // no cierra el escáner entero: el usuario sigue en el mismo flujo.
    onBack: handleDiscardPhoto,
    onRepeatPhoto: handleDiscardPhoto,
  };

  return (
    <div className="absolute inset-0 z-[60] flex h-full min-h-0 w-full flex-col bg-night text-white overflow-hidden select-none">
      {/* 1. ZONA SUPERIOR: MEDIA PANTALLA CON CÁMARA Y CORCHETES BIEN CENTRADOS */}
      <div className="absolute inset-0 w-full h-full bg-night overflow-hidden flex flex-col">
        {/* Stream de video de la cámara */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
            hasRealStream ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {/* Fallback visual cuando no hay hardware de cámara física */}
        {!hasRealStream && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-night">
            <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-accent-2 mb-2 animate-pulse">
              {mode === 'planta' ? <Leaf size={30} /> : <Landmark size={30} />}
            </div>
            <p className="text-caption font-semibold text-white/90">
              {t('camera.active')} ({mode === 'planta' ? t('camera.modePlant') : t('camera.modeMonument')})
            </p>
          </div>
        )}

        {/* Destello de flash si está activo */}
        {flashOn && (
          <div className="absolute inset-0 bg-warm/15 pointer-events-none" />
        )}

        {/* Header superior: Cerrar (X), Título, Flash */}
        <div className="relative z-20 flex flex-col pt-[max(28px,calc(env(safe-area-inset-top)+var(--app-top-inset)))] px-4 pb-2 bg-gradient-to-b from-black/80 via-black/30 to-transparent">
          <div className="flex items-center justify-between w-full mb-2.5">
            <button
              type="button"
              onClick={onClose}
              aria-label={t('camera.close')}
              className="flex items-center justify-center w-11 h-11 rounded-full bg-black/50 hover:bg-black/65 text-white transition-colors cursor-pointer"
            >
              <X size={20} strokeWidth={2.2} />
            </button>

            <span aria-hidden="true" />

            <button
              type="button"
              onClick={() => void handleToggleFlash()}
              aria-label={flashOn ? t('camera.flashOff') : t('camera.flashOn')}
              className={`flex items-center justify-center w-11 h-11 rounded-full transition-colors cursor-pointer ${
                flashOn
                  ? 'bg-warm text-night font-bold'
                  : 'bg-black/40 hover:bg-black/60 text-white'
              }`}
            >
              {flashOn ? <Zap size={18} fill="currentColor" /> : <ZapOff size={18} />}
            </button>
          </div>

          {/* Selector Planta / Monumento o calle */}
          <div className="mx-auto inline-flex items-center bg-black/55 p-1 rounded-full border border-white/15 text-caption font-medium">
            <button
              type="button"
              onClick={() => onModeChange('planta')}
              className={`flex min-h-11 items-center gap-1.5 px-3.5 rounded-full transition duration-150 cursor-pointer ${
                mode === 'planta'
                  ? 'bg-surface text-ink font-bold shadow-xs'
                  : 'text-white/80 hover:text-white'
              }`}
            >
              <Leaf
                size={12}
                strokeWidth={2.5}
                className={mode === 'planta' ? 'text-accent' : 'text-accent-2'}
              />
              <span className="text-caption">{t('camera.modePlant')}</span>
            </button>

            <button
              type="button"
              onClick={() => onModeChange('monumento')}
              className={`flex min-h-11 items-center gap-1.5 px-3.5 rounded-full transition duration-150 cursor-pointer ${
                mode === 'monumento'
                  ? 'bg-surface text-ink font-bold shadow-xs'
                  : 'text-white/80 hover:text-white'
              }`}
            >
              <Landmark
                size={12}
                strokeWidth={2.2}
                className={mode === 'monumento' ? 'text-warm-strong' : 'text-white/70'}
              />
              <span className="text-caption">{t('camera.modeMonument')}</span>
            </button>
          </div>
        </div>

        {/* Marco de encuadre centrado en la zona visible de la cámara */}
        <div className="relative z-10 flex-1 flex items-center justify-center pointer-events-none pb-4">
          <div className="relative w-56 h-56 sm:w-64 sm:h-64 flex items-center justify-center">
            {/* 4 corchetes esquineros en amarillo bien visibles */}
            <div className="absolute top-0 left-0 w-8 h-8 border-t-3 border-l-3 border-warm rounded-tl-xl shadow-xs" />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-3 border-r-3 border-warm rounded-tr-xl shadow-xs" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-3 border-l-3 border-warm rounded-bl-xl shadow-xs" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-3 border-r-3 border-warm rounded-br-xl shadow-xs" />
          </div>
        </div>

        {/* Degradado a negro empezando justo debajo del marco de encuadre */}
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-b from-transparent via-black/80 to-black pointer-events-none" />
      </div>

      {/* 2. ZONA INFERIOR EN NEGRO: TEXTO Y CONTROLES PEGADOS A LA BARRA INFERIOR */}
      <div className="absolute z-10 bottom-0 left-0 right-0 flex flex-col justify-end bg-gradient-to-t from-black via-black/90 to-transparent px-6 pt-16 pb-6">
        {/* Texto de instrucción */}
        <div className="text-center mb-4">
          <p className="text-body font-bold text-white">
            {mode === 'monumento'
              ? t('camera.hintMonument')
              : t('camera.hint')}
          </p>
          <p className="text-small text-white/60 mt-0.5 font-medium">
            {mode === 'monumento'
              ? t('camera.hintMonumentSub')
              : t('camera.hintSub')}
          </p>
        </div>

        {/* Fila de controles de cámara justo encima de la barra inferior */}
        <div className="flex items-center justify-between px-4 pb-1">
          {/* Botón de galería */}
          <button
            type="button"
            onClick={onSelectFromGallery}
            aria-label={t('camera.galleryButton')}
            className="flex items-center justify-center w-12 h-12 rounded-2xl bg-night/90 hover:bg-night border border-white/15 text-white transition-colors cursor-pointer active:scale-95"
          >
            <ImageIcon size={22} strokeWidth={2} />
          </button>

          {/* Botón disparador central */}
          <button
            type="button"
            onClick={handleTakePhoto}
            aria-label={t('camera.takePhoto')}
            className="group relative flex items-center justify-center w-18 h-18 rounded-full border-4 border-white/95 p-1 transition-transform cursor-pointer active:scale-90 focus:outline-none"
          >
            <span className="w-full h-full rounded-full bg-white group-hover:bg-white/90 transition-colors shadow-inner" />
          </button>

          {/* Botón girar cámara */}
          <button
            type="button"
            onClick={handleToggleFacingMode}
            aria-label={t('camera.flip')}
            className="flex items-center justify-center w-12 h-12 rounded-full bg-night/90 hover:bg-night border border-white/15 text-white transition-colors cursor-pointer active:scale-95"
          >
            <RefreshCw size={20} strokeWidth={2.2} />
          </button>
        </div>
      </div>

      {/* Vista previa y opciones de guardado */}
      {photo && (
        <div className="absolute inset-0 z-30 bg-night text-white">
          <img src={photo} alt={t('camera.photoPreviewAlt')} className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/65 via-transparent to-black/75 pointer-events-none" />

          <header className="absolute top-0 left-0 right-0 z-10 grid grid-cols-[44px_1fr_44px] items-center px-4 pt-[max(28px,calc(env(safe-area-inset-top)+var(--app-top-inset)))] pb-4">
            <button
              type="button"
              onClick={handleDiscardPhoto}
              aria-label={t('camera.discard')}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-black/50 text-white transition-colors active:bg-black/65 cursor-pointer"
            >
              <X size={20} strokeWidth={2.2} />
            </button>
            <span className="flex justify-center text-white drop-shadow-sm" aria-label={mode === 'planta' ? t('camera.modePlant') : t('camera.modeMonument')}>
              {mode === 'planta' ? <Leaf size={19} /> : <Landmark size={19} />}
            </span>
            <span aria-hidden="true" />
          </header>

          {identificationStatus === 'completed' && <CameraIdentificationResult {...identificationResult} />}

          <div className="absolute bottom-0 left-0 right-0 z-10 px-7 pb-7 pt-20">
            {!isBackendConnectionError &&
              identificationStatus !== 'idle' &&
              identificationStatus !== 'completed' && (
                <div className="[&_button]:min-h-11 [&_button]:rounded-control [&_button]:px-3 [&_button]:focus-visible:ring-2 [&_button]:focus-visible:ring-accent">
                  {identificationStatus === 'error' && mode === 'planta' && (
                    <IdentificationNotice failure={identificationError} />
                  )}
                  <CameraIdentificationResult {...identificationResult} />
                </div>
              )}
            {(photoSaved || saveError) && (
              <p className={`mb-3 text-center text-caption ${photoSaved ? 'text-white/80' : 'text-warm'}`} role={saveError ? 'alert' : 'status'}>
                {photoSaved ? t('camera.saved') : t('camera.saveError')}
              </p>
            )}
            <div className="flex items-end justify-between">
              <button
                type="button"
                onClick={handleSavePhoto}
                disabled={photoSaved}
                aria-label={photoSaved ? t('camera.savedAria') : t('camera.save')}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-black/50 hover:bg-black/65 disabled:text-white/60 cursor-pointer disabled:cursor-default"
              >
                {photoSaved ? <Check size={22} /> : <Download size={22} />}
              </button>

              <button
                type="button"
                disabled={mode !== 'planta' || identificationStatus === 'identifying' || identificationStatus === 'completed'}
                onClick={handleIdentify}
                aria-label={mode !== 'planta' ? t('camera.identifyOnlyPlants') : identificationStatus === 'identifying' ? t('camera.identifying') : identificationStatus === 'completed' ? t('camera.identifyDone') : t('camera.identify')}
                title={mode === 'planta' ? t('camera.identifyTitle') : t('camera.identifyUnavailable')}
                className="flex h-[72px] w-[72px] items-center justify-center rounded-full border-4 border-white bg-accent text-on-accent disabled:cursor-not-allowed disabled:opacity-60"
              >
                {identificationStatus === 'identifying' ? (
                  <span className="h-7 w-7 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                ) : <ScanSearch size={28} />}
              </button>

              <button
                type="button"
                aria-label={t('camera.manualSoon')}
                title={t('camera.manualSoon')}
                disabled
                className="relative flex h-12 w-12 items-center justify-center rounded-full bg-black/50 text-white/70 cursor-not-allowed"
              >
                <ScanSearch size={22} />
                <Ban size={30} className="absolute text-danger" />
              </button>
            </div>
          </div>

          {/* Sin conexión con el backend se muestra una respuesta honesta:
              la foto se conserva y se puede reintentar sin perder el flujo. */}
          {isBackendConnectionError && identificationStatus === 'error' && mode === 'planta' && (
            <section className="absolute inset-0 z-40 flex flex-col overflow-y-auto overscroll-contain bg-app text-ink">
              <div className="relative h-64 w-full shrink-0 overflow-hidden bg-accent-soft">
                <img
                  src={photo}
                  alt={t('camera.pendingPhotoAlt')}
                  className="h-full w-full object-cover outline outline-1 -outline-offset-1 outline-black/10"
                />
                <header className="absolute inset-x-0 top-0 flex items-center gap-3 px-4 pt-[max(20px,calc(env(safe-area-inset-top)+var(--app-top-inset)))] pb-4">
                  <button
                    type="button"
                    onClick={handleDiscardPhoto}
                    aria-label={t('camera.pendingBackAria')}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface/90 text-ink shadow-raised transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    <ArrowLeft size={20} aria-hidden="true" />
                  </button>
                  <h1 className="font-display rounded-full bg-surface/90 px-4 py-2 text-heading text-ink shadow-raised">
                    {t('camera.pendingTitle')}
                  </h1>
                </header>
              </div>

              <div className="flex flex-1 flex-col px-4 pt-3 pb-4">
                <div className="rounded-card bg-surface p-5 text-center shadow-raised">
                  <span
                    aria-hidden="true"
                    className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-accent"
                  >
                    <ScanSearch size={24} />
                  </span>
                  <h2 className="font-display mt-3 text-heading text-ink">{t('camera.pendingHeading')}</h2>
                  <p className="mt-2 text-small text-muted text-pretty">{t('camera.pendingDesc')}</p>
                  <div className="mt-4 text-left">
                    <IdentificationNotice failure={identificationError} />
                  </div>
                  <button
                    type="button"
                    onClick={handleIdentify}
                    className="mt-5 flex min-h-12 w-full items-center justify-center rounded-card bg-accent px-4 text-body font-semibold text-on-accent transition-colors hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
                  >
                    {t('camera.pendingRetry')}
                  </button>
                  <button
                    type="button"
                    onClick={handleDiscardPhoto}
                    className="mt-2 flex min-h-12 w-full items-center justify-center rounded-card bg-surface px-4 text-body font-semibold text-ink shadow-raised transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    {t('camera.pendingBack')}
                  </button>
                </div>
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
};
