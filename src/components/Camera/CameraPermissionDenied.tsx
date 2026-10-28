import React from 'react';
import { ArrowLeft, CameraOff } from 'lucide-react';
import type { CameraMode } from './types';

export interface CameraPermissionDeniedProps {
  mode: CameraMode;
  onModeChange: (mode: CameraMode) => void;
  onOpenSettings: () => void;
  onSelectFromGallery: () => void;
  onBack: () => void;
}

export const CameraPermissionDenied: React.FC<CameraPermissionDeniedProps> = ({
  mode,
  onModeChange,
  onOpenSettings,
  onSelectFromGallery,
  onBack,
}) => {
  return (
    <div className="relative flex flex-col h-full w-full bg-[#102416] text-white justify-between p-5 pt-8 overflow-hidden">
      {/* Top Header */}
      <div className="relative flex items-center justify-between w-full z-10">
        <button
          type="button"
          onClick={onBack}
          aria-label="Volver"
          className="flex items-center justify-center w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
        >
          <ArrowLeft size={20} strokeWidth={2.2} />
        </button>

        {/* Top selector Planta / Monumento o calle */}
        <div className="inline-flex items-center bg-black/40 backdrop-blur-md p-1 rounded-full border border-white/10 text-xs font-medium">
          <button
            type="button"
            onClick={() => onModeChange('planta')}
            className={`px-3 py-1 rounded-full transition-all duration-150 cursor-pointer ${
              mode === 'planta'
                ? 'bg-white text-neutral-900 font-bold shadow-xs'
                : 'text-white/80 hover:text-white'
            }`}
          >
            Planta
          </button>
          <button
            type="button"
            onClick={() => onModeChange('monumento')}
            className={`px-3 py-1 rounded-full transition-all duration-150 cursor-pointer ${
              mode === 'monumento'
                ? 'bg-white text-neutral-900 font-bold shadow-xs'
                : 'text-white/80 hover:text-white'
            }`}
          >
            Monumento o calle
          </button>
        </div>

        <div className="w-10" />
      </div>

      {/* Floating Dialog Card */}
      <div className="relative z-10 w-full max-w-xs mx-auto bg-white rounded-3xl p-6 shadow-2xl text-center text-neutral-900 my-auto">
        {/* Soft peach icon container */}
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#faebd7] text-amber-800 mb-3 shadow-xs">
          <CameraOff size={28} strokeWidth={2.2} />
        </div>

        {/* Title */}
        <h2 className="text-base font-bold text-neutral-900">
          La cámara está desactivada
        </h2>

        {/* Subtitle */}
        <p className="text-xs text-neutral-500 mt-2 mb-5 leading-relaxed">
          Sin permiso no podemos hacer la foto. Actívala en los ajustes del móvil o sube una foto que ya tengas.
        </p>

        {/* Action buttons */}
        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={onOpenSettings}
            className="w-full py-3 px-4 rounded-xl bg-[#1e5631] hover:bg-[#164326] text-white text-xs font-bold tracking-wide transition-all shadow-xs cursor-pointer active:scale-[0.98]"
          >
            Abrir ajustes del móvil
          </button>

          <button
            type="button"
            onClick={onSelectFromGallery}
            className="w-full py-3 px-4 rounded-xl bg-white border border-neutral-200 hover:bg-neutral-50 text-neutral-800 text-xs font-semibold tracking-wide transition-all shadow-2xs cursor-pointer active:scale-[0.98]"
          >
            Elegir de la galería
          </button>
        </div>
      </div>

      {/* Bottom disabled shutter button representation */}
      <div className="relative z-10 flex justify-center mb-24">
        <div
          aria-hidden="true"
          className="w-16 h-16 rounded-full border-2 border-neutral-700/60 bg-neutral-800/40 opacity-40 flex items-center justify-center cursor-not-allowed"
        >
          <div className="w-12 h-12 rounded-full bg-neutral-700/40" />
        </div>
      </div>
    </div>
  );
};

