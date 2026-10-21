import React, { useRef, useState, useEffect } from 'react';
import { X, Zap, ZapOff, RefreshCw, Image as ImageIcon, Leaf, Landmark, Check } from 'lucide-react';
import type { CameraMode } from './types';

export interface CameraActiveProps {
  mode: CameraMode;
  onModeChange: (mode: CameraMode) => void;
  onClose: () => void;
  onSelectFromGallery: () => void;
  onPhotoCaptured?: (dataUrl: string, mode: CameraMode) => void;
}

export const CameraActive: React.FC<CameraActiveProps> = ({
  mode,
  onModeChange,
  onClose,
  onSelectFromGallery,
  onPhotoCaptured,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [flashOn, setFlashOn] = useState(false);
  const [hasRealStream, setHasRealStream] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);

  useEffect(() => {
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
  }, [facingMode]);

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
    if (videoRef.current && hasRealStream) {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setCapturedPhoto(dataUrl);
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
      setCapturedPhoto(dataUrl);
      onPhotoCaptured?.(dataUrl, mode);
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

            <h1 className="text-xs font-bold tracking-tight text-white drop-shadow-sm">
              {mode === 'planta' ? 'Identificar planta' : 'Identificar monumento'}
            </h1>

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

      {/* Overlay de vista previa si se tomó una foto */}
      {capturedPhoto && (
        <div className="absolute inset-0 z-30 bg-black/95 flex flex-col justify-between p-6 pt-10 pb-24">
          <div className="flex items-center justify-between text-white">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              Foto capturada ({mode === 'planta' ? 'Planta' : 'Monumento'})
            </span>
            <button
              type="button"
              onClick={() => setCapturedPhoto(null)}
              className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 cursor-pointer"
              aria-label="Cerrar vista previa"
            >
              <X size={18} />
            </button>
          </div>

          <div className="my-auto mx-auto max-w-xs max-h-[40vh] rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl">
            <img src={capturedPhoto} alt="Foto capturada" className="w-full h-full object-contain" />
          </div>

          <div className="flex flex-col gap-2 max-w-xs mx-auto w-full">
            <div className="p-3 bg-emerald-950/80 border border-emerald-600/40 rounded-xl text-emerald-200 text-xs text-center flex items-center justify-center gap-2">
              <Check size={16} className="text-emerald-400" />
              <span>Foto lista para identificar en {mode === 'planta' ? 'Planta' : 'Monumento o calle'}</span>
            </div>
            <button
              type="button"
              onClick={() => setCapturedPhoto(null)}
              className="py-3 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-semibold cursor-pointer"
            >
              Volver a hacer foto
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
