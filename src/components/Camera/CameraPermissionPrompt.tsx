import React from 'react';
import { ArrowLeft, Camera, Check } from 'lucide-react';

export interface CameraPermissionPromptProps {
  onAllow: () => void;
  onDeny: () => void;
  onSelectFromGallery: () => void;
  onBack: () => void;
}

export const CameraPermissionPrompt: React.FC<CameraPermissionPromptProps> = ({
  onAllow,
  onDeny,
  onSelectFromGallery,
  onBack,
}) => {
  return (
    <div className="flex flex-col h-full w-full bg-white text-neutral-900 justify-between p-5 pt-8 overflow-y-auto">
      {/* Top back button */}
      <div>
        <button
          type="button"
          onClick={onBack}
          aria-label="Volver"
          className="flex items-center justify-center w-10 h-10 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-700 transition-colors cursor-pointer"
        >
          <ArrowLeft size={20} strokeWidth={2.2} />
        </button>
      </div>

      {/* Main illustration & explanation */}
      <div className="flex flex-col items-center text-center my-auto py-4 max-w-sm mx-auto">
        {/* Soft green icon container */}
        <div className="flex items-center justify-center w-20 h-20 rounded-2xl bg-[#e6efe4] text-[#1e5631] mb-5 shadow-xs">
          <Camera size={38} strokeWidth={2} />
        </div>

        {/* Title */}
        <h1 className="text-xl font-bold text-neutral-900 tracking-tight mb-2.5">
          Necesitamos tu cámara para reconocer plantas
        </h1>

        {/* Subtitle */}
        <p className="text-xs text-neutral-500 leading-relaxed max-w-xs mb-6">
          Haz una foto a la hoja, la flor o el fruto y te diremos qué especie es. Solo usamos la foto para identificarla; no se publica.
        </p>

        {/* Info checkmark cards */}
        <div className="w-full flex flex-col gap-2.5 text-left mb-2">
          <div className="flex items-center gap-3 p-3.5 rounded-xl border border-neutral-200/90 bg-neutral-50/60 shadow-2xs">
            <div className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 shrink-0">
              <Check size={14} strokeWidth={2.5} />
            </div>
            <span className="text-xs text-neutral-700 font-medium">
              Puedes cambiarlo cuando quieras en Ajustes
            </span>
          </div>

          <div className="flex items-center gap-3 p-3.5 rounded-xl border border-neutral-200/90 bg-neutral-50/60 shadow-2xs">
            <div className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 shrink-0">
              <Check size={14} strokeWidth={2.5} />
            </div>
            <span className="text-xs text-neutral-700 font-medium">
              Sin cámara, puedes elegir una foto de la galería
            </span>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col gap-2.5 w-full max-w-sm mx-auto pt-2 pb-24">
        <button
          type="button"
          onClick={onAllow}
          className="w-full py-3.5 px-4 rounded-xl bg-[#1e5631] hover:bg-[#164326] text-white text-sm font-semibold tracking-wide transition-all shadow-xs cursor-pointer active:scale-[0.98]"
        >
          Permitir cámara
        </button>

        <button
          type="button"
          onClick={onDeny}
          className="w-full py-3.5 px-4 rounded-xl bg-[#865727] hover:bg-[#724920] text-white text-sm font-semibold tracking-wide transition-all shadow-xs cursor-pointer active:scale-[0.98]"
        >
          No permitir cámara
        </button>

        <button
          type="button"
          onClick={onSelectFromGallery}
          className="w-full py-3.5 px-4 rounded-xl bg-white border border-neutral-200 hover:bg-neutral-50 text-neutral-800 text-sm font-semibold tracking-wide transition-all shadow-2xs cursor-pointer active:scale-[0.98]"
        >
          Elegir de la galería
        </button>
      </div>
    </div>
  );
};

