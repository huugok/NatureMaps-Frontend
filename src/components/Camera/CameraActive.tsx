import React, { useRef, useState, useEffect } from 'react';
import { X, Zap, ZapOff, RefreshCw, Image as ImageIcon, Download, Leaf, Landmark, Check, ScanSearch, Ban } from 'lucide-react';
import type { CameraMode } from './types';
import type { SavedPhoto } from './types';
import type { PlantIdentification, PlantMatch } from '../../types/identify';
import { CameraIdentificationResult } from './CameraIdentificationResult';

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
  identificationError: string | null;
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
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [flashOn, setFlashOn] = useState(false);
  const [hasRealStream, setHasRealStream] = useState(false);
  const [photoSaved, setPhotoSaved] = useState(false);
  const [saveError, setSaveError] = useState(false);

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
      ctx.fillStyle = mode === 'planta' ? '#1b4332' : '#264653';
      ctx.fillRect(0, 0, 400, 400);
      ctx.fillStyle = '#ffffff';
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
    setPhotoSaved(false);
    setSaveError(false);
  };

  const handleIdentify = () => {
    if (photo && identificationStatus !== 'identifying' && identificationStatus !== 'completed') {
      onIdentifyPhoto?.(photo, mode);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex h-[100dvh] min-h-0 w-full flex-col bg-black text-white overflow-hidden select-none">
      {/* 1. ZONA SUPERIOR: MEDIA PANTALLA CON CÁMARA Y CORCHETES BIEN CENTRADOS */}
      <div className="absolute inset-0 w-full h-full bg-neutral-950 overflow-hidden flex flex-col">
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
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-[#0f2818] via-[#1a3824] to-[#0c1f13]">
            <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-emerald-300 mb-2 animate-pulse">
              {mode === 'planta' ? <Leaf size={30} /> : <Landmark size={30} />}
            </div>
            <p className="text-xs font-semibold text-white/90">
              Cámara activa ({mode === 'planta' ? 'Planta' : 'Monumento o calle'})
            </p>
          </div>
        )}

        {/* Destello de flash si está activo */}
        {flashOn && (
          <div className="absolute inset-0 bg-yellow-200/15 pointer-events-none" />
        )}

        {/* Header superior: Cerrar (X), Título, Flash */}
        <div className="relative z-20 flex flex-col pt-5 px-4 pb-2 bg-gradient-to-b from-black/80 via-black/30 to-transparent">
          <div className="flex items-center justify-between w-full mb-2.5">
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar cámara"
              className="flex items-center justify-center w-9 h-9 rounded-full bg-black/40 backdrop-blur-md hover:bg-black/60 text-white transition-colors cursor-pointer"
            >
              <X size={20} strokeWidth={2.2} />
            </button>

            <span aria-hidden="true" />

            <button
              type="button"
              onClick={() => void handleToggleFlash()}
              aria-label={flashOn ? 'Desactivar flash' : 'Activar flash'}
              className={`flex items-center justify-center w-9 h-9 rounded-full backdrop-blur-md transition-colors cursor-pointer ${
                flashOn
                  ? 'bg-amber-400 text-neutral-900 font-bold'
                  : 'bg-black/40 hover:bg-black/60 text-white'
              }`}
            >
              {flashOn ? <Zap size={18} fill="currentColor" /> : <ZapOff size={18} />}
            </button>
          </div>

          {/* Selector Planta / Monumento o calle */}
          <div className="mx-auto inline-flex items-center bg-black/50 backdrop-blur-md p-1 rounded-full border border-white/15 text-xs font-medium shadow-md">
            <button
              type="button"
              onClick={() => onModeChange('planta')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full transition-all duration-150 cursor-pointer ${
                mode === 'planta'
                  ? 'bg-white text-neutral-900 font-bold shadow-xs'
                  : 'text-white/80 hover:text-white'
              }`}
            >
              <Leaf
                size={12}
                strokeWidth={2.5}
                className={mode === 'planta' ? 'text-emerald-700' : 'text-emerald-400'}
              />
              <span className="text-[11px]">Planta</span>
            </button>

            <button
              type="button"
              onClick={() => onModeChange('monumento')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full transition-all duration-150 cursor-pointer ${
                mode === 'monumento'
                  ? 'bg-white text-neutral-900 font-bold shadow-xs'
                  : 'text-white/80 hover:text-white'
              }`}
            >
              <Landmark
                size={12}
                strokeWidth={2.2}
                className={mode === 'monumento' ? 'text-amber-800' : 'text-neutral-300'}
              />
              <span className="text-[11px]">Monumento o calle</span>
            </button>
          </div>
        </div>

        {/* Marco de encuadre centrado en la zona visible de la cámara */}
        <div className="relative z-10 flex-1 flex items-center justify-center pointer-events-none pb-4">
          <div className="relative w-56 h-56 sm:w-64 sm:h-64 flex items-center justify-center">
            {/* 4 corchetes esquineros en amarillo bien visibles */}
            <div className="absolute top-0 left-0 w-8 h-8 border-t-3 border-l-3 border-amber-400 rounded-tl-xl shadow-xs" />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-3 border-r-3 border-amber-400 rounded-tr-xl shadow-xs" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-3 border-l-3 border-amber-400 rounded-bl-xl shadow-xs" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-3 border-r-3 border-amber-400 rounded-br-xl shadow-xs" />
          </div>
        </div>

        {/* Degradado a negro empezando justo debajo del marco de encuadre */}
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-b from-transparent via-black/80 to-black pointer-events-none" />
      </div>

      {/* 2. ZONA INFERIOR EN NEGRO: TEXTO Y CONTROLES PEGADOS A LA BARRA INFERIOR */}
      <div className="absolute z-10 bottom-0 left-0 right-0 flex flex-col justify-end bg-gradient-to-t from-black via-black/90 to-transparent px-6 pt-16 pb-[max(24px,env(safe-area-inset-bottom))]">
        {/* Texto de instrucción */}
        <div className="text-center mb-4">
          <p className="text-sm font-bold text-white tracking-tight">
            {mode === 'monumento'
              ? 'Encuadra el monumento o la calle'
              : 'Encuadra la hoja, flor o fruto'}
          </p>
          <p className="text-xs text-neutral-400 mt-0.5 font-medium">
            {mode === 'monumento'
              ? 'Te diremos qué es y su importancia cultural'
              : 'Te diremos qué especie es'}
          </p>
        </div>

        {/* Fila de controles de cámara justo encima de la barra inferior */}
        <div className="flex items-center justify-between px-4 pb-1">
          {/* Botón de galería */}
          <button
            type="button"
            onClick={onSelectFromGallery}
            aria-label="Elegir de la galería"
            className="flex items-center justify-center w-12 h-12 rounded-2xl bg-neutral-900/90 hover:bg-neutral-800 border border-neutral-700/80 text-white transition-all cursor-pointer active:scale-95 shadow-md"
          >
            <ImageIcon size={22} strokeWidth={2} />
          </button>

          {/* Botón disparador central */}
          <button
            type="button"
            onClick={handleTakePhoto}
            aria-label="Hacer foto"
            className="group relative flex items-center justify-center w-18 h-18 rounded-full border-4 border-white/95 p-1 transition-transform cursor-pointer active:scale-90 focus:outline-none shadow-lg"
          >
            <span className="w-full h-full rounded-full bg-white group-hover:bg-neutral-100 transition-colors shadow-inner" />
          </button>

          {/* Botón girar cámara */}
          <button
            type="button"
            onClick={handleToggleFacingMode}
            aria-label="Girar cámara"
            className="flex items-center justify-center w-12 h-12 rounded-full bg-neutral-900/90 hover:bg-neutral-800 border border-neutral-700/80 text-white transition-all cursor-pointer active:scale-95 shadow-md"
          >
            <RefreshCw size={20} strokeWidth={2.2} />
          </button>
        </div>
      </div>

      {/* Vista previa y opciones de guardado */}
      {photo && (
        <div className="absolute inset-0 z-30 bg-black text-white">
          <img src={photo} alt="Vista previa de la foto capturada" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/65 via-transparent to-black/75 pointer-events-none" />

          <header className="absolute top-0 left-0 right-0 z-10 grid grid-cols-[40px_1fr_40px] items-center px-4 pt-[max(20px,env(safe-area-inset-top))] pb-4">
            <button
              type="button"
              onClick={handleDiscardPhoto}
              aria-label="Descartar foto"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md hover:bg-black/60 cursor-pointer"
            >
              <X size={20} strokeWidth={2.2} />
            </button>
            <span className="flex justify-center text-white drop-shadow-sm" aria-label={mode === 'planta' ? 'Planta' : 'Monumento'}>
              {mode === 'planta' ? <Leaf size={19} /> : <Landmark size={19} />}
            </span>
            <span aria-hidden="true" />
          </header>

          <div className="absolute bottom-0 left-0 right-0 z-10 px-7 pb-[max(28px,env(safe-area-inset-bottom))] pt-20">
            {identificationStatus !== 'idle' && (
              <CameraIdentificationResult
                status={identificationStatus}
                mode={mode}
                results={identificationResults}
                error={identificationError}
                photo={photo}
                onRetry={handleIdentify}
                onOpenSpecies={(match) => onOpenSpecies?.(match, photo)}
                onBack={onClose}
                onRepeatPhoto={handleDiscardPhoto}
              />
            )}
            {(photoSaved || saveError) && (
              <p className={`mb-3 text-center text-xs ${photoSaved ? 'text-emerald-200' : 'text-amber-200'}`} role={saveError ? 'alert' : 'status'}>
                {photoSaved ? 'Foto guardada en este dispositivo' : 'No se pudo guardar en este dispositivo'}
              </p>
            )}
            <div className="flex items-end justify-between">
              <button
                type="button"
                onClick={handleSavePhoto}
                disabled={photoSaved}
                aria-label={photoSaved ? 'Foto guardada' : 'Guardar foto'}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-black/45 backdrop-blur-md hover:bg-black/65 disabled:text-emerald-300 cursor-pointer disabled:cursor-default"
              >
                {photoSaved ? <Check size={22} /> : <Download size={22} />}
              </button>

              <button
                type="button"
                disabled={mode !== 'planta' || identificationStatus === 'identifying' || identificationStatus === 'completed'}
                onClick={handleIdentify}
                aria-label={mode !== 'planta' ? 'Identificación disponible solo para plantas' : identificationStatus === 'identifying' ? 'Identificando foto' : identificationStatus === 'completed' ? 'Identificación completada' : 'Identificar foto'}
                title={mode === 'planta' ? 'Identificar la foto capturada' : 'La identificación está disponible solo en modo Planta'}
                className="flex h-[72px] w-[72px] items-center justify-center rounded-full border-4 border-white bg-emerald-600 text-white shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
              >
                {identificationStatus === 'identifying' ? (
                  <span className="h-7 w-7 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                ) : <ScanSearch size={28} />}
              </button>

              <button
                type="button"
                aria-label="Identificación manual próximamente"
                title="Identificación manual próximamente"
                disabled
                className="relative flex h-12 w-12 items-center justify-center rounded-full bg-black/45 text-white/70 backdrop-blur-md cursor-not-allowed"
              >
                <ScanSearch size={22} />
                <Ban size={30} className="absolute text-red-300" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
