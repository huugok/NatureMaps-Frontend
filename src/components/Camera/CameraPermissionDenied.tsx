import React from 'react';
import { ArrowLeft, CameraOff } from 'lucide-react';
import { useApp } from '../../context/useApp';
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
  const { t } = useApp();
  return (
    <div className="relative flex flex-col h-full w-full bg-night text-white justify-between p-5 pt-[max(40px,calc(env(safe-area-inset-top)+var(--app-top-inset)))] overflow-hidden">
      <div className="relative flex items-center justify-between w-full z-10">
        <button
          type="button"
          onClick={onBack}
          aria-label={t('common.back')}
          className="flex items-center justify-center w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
        >
          <ArrowLeft size={20} strokeWidth={2.2} />
        </button>

        <div className="inline-flex items-center bg-black/45 p-1 rounded-full border border-white/10 text-caption font-medium">
          <button
            type="button"
            onClick={() => onModeChange('planta')}
            className={`min-h-11 px-3 rounded-full transition duration-150 cursor-pointer ${
              mode === 'planta'
                ? 'bg-surface text-ink font-bold shadow-xs'
                : 'text-white/80 hover:text-white'
            }`}
          >
            {t('camera.modePlant')}
          </button>
          <button
            type="button"
            onClick={() => onModeChange('monumento')}
            className={`min-h-11 px-3 rounded-full transition duration-150 cursor-pointer ${
              mode === 'monumento'
                ? 'bg-surface text-ink font-bold shadow-xs'
                : 'text-white/80 hover:text-white'
            }`}
          >
            {t('camera.modeMonument')}
          </button>
        </div>

        <div className="w-10" />
      </div>

      <div className="relative z-10 w-full max-w-xs mx-auto bg-surface rounded-panel p-6 shadow-float text-center text-ink my-auto">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-warm/15 text-warm-strong mb-3 shadow-xs">
          <CameraOff size={28} strokeWidth={2.2} />
        </div>

        <h2 className="font-display text-heading text-balance text-ink">{t('camera.deniedTitle')}</h2>

        <p className="text-small text-muted text-pretty mt-2 mb-5">{t('camera.deniedDesc')}</p>

        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={onOpenSettings}
            className="w-full py-3 px-4 rounded-card bg-accent hover:brightness-95 text-on-accent text-body font-semibold transition shadow-raised cursor-pointer active:scale-[0.98]"
          >
            {t('camera.openSettings')}
          </button>

          <button
            type="button"
            onClick={onSelectFromGallery}
            className="w-full py-3 px-4 rounded-card bg-surface border border-line hover:bg-surface-2 text-ink text-body font-semibold transition shadow-raised cursor-pointer active:scale-[0.98]"
          >
            {t('camera.galleryButton')}
          </button>
        </div>
      </div>

      <div className="relative z-10 flex justify-center mb-[calc(24px+env(safe-area-inset-bottom,0px))]">
        <div
          aria-hidden="true"
          className="w-16 h-16 rounded-full border-2 border-white/20 bg-white/10 opacity-40 flex items-center justify-center cursor-not-allowed"
        >
          <div className="w-12 h-12 rounded-full bg-white/15" />
        </div>
      </div>
    </div>
  );
};
