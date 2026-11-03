import React from 'react';
import { ArrowLeft, Camera, Check } from 'lucide-react';
import { useApp } from '../../context/useApp';

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
  const { t } = useApp();
  return (
    <div className="flex flex-col h-full w-full bg-surface text-ink justify-between p-5 pt-[max(40px,calc(env(safe-area-inset-top)+var(--app-top-inset)))] overflow-y-auto overscroll-contain">
      <div>
        <button
          type="button"
          onClick={onBack}
          aria-label={t('common.back')}
          className="flex items-center justify-center w-11 h-11 rounded-full bg-surface-2 hover:bg-line-strong/40 text-ink transition-colors cursor-pointer"
        >
          <ArrowLeft size={20} strokeWidth={2.2} />
        </button>
      </div>

      <div className="flex flex-col items-center text-center my-auto py-4 max-w-sm mx-auto">
        <div className="flex items-center justify-center w-20 h-20 rounded-2xl bg-accent-soft text-accent mb-5 shadow-xs">
          <Camera size={38} strokeWidth={2} />
        </div>

        <h1 className="font-display text-heading text-balance text-ink mb-2.5">
          {t('camera.promptTitle')}
        </h1>

        <p className="text-small text-muted text-pretty max-w-xs mb-6">
          {t('camera.promptDesc')}
        </p>

        <div className="w-full flex flex-col gap-2.5 text-left mb-2">
          <div className="flex items-center gap-3 p-3.5 rounded-card bg-surface-2 shadow-raised">
            <div className="flex items-center justify-center w-5 h-5 rounded-full bg-accent-soft text-accent shrink-0">
              <Check size={14} strokeWidth={2.5} />
            </div>
            <span className="text-small font-medium text-ink-2">{t('camera.promptSetting')}</span>
          </div>

          <div className="flex items-center gap-3 p-3.5 rounded-card bg-surface-2 shadow-raised">
            <div className="flex items-center justify-center w-5 h-5 rounded-full bg-accent-soft text-accent shrink-0">
              <Check size={14} strokeWidth={2.5} />
            </div>
            <span className="text-small font-medium text-ink-2">{t('camera.promptGallery')}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2.5 w-full max-w-sm mx-auto pt-2 pb-[calc(24px+env(safe-area-inset-bottom,0px))]">
        <button
          type="button"
          onClick={onAllow}
          className="w-full py-3.5 px-4 rounded-card bg-accent hover:brightness-95 text-on-accent text-body font-semibold transition shadow-raised cursor-pointer active:scale-[0.98]"
        >
          {t('camera.allowButton')}
        </button>

        <button
          type="button"
          onClick={onDeny}
          className="w-full py-3.5 px-4 rounded-card bg-warm-strong hover:brightness-95 text-on-accent text-body font-semibold transition shadow-raised cursor-pointer active:scale-[0.98]"
        >
          {t('camera.denyButton')}
        </button>

        <button
          type="button"
          onClick={onSelectFromGallery}
          className="w-full py-3.5 px-4 rounded-card bg-surface shadow-raised hover:bg-surface-2 text-ink text-body font-semibold transition cursor-pointer active:scale-[0.98]"
        >
          {t('camera.galleryButton')}
        </button>
      </div>
    </div>
  );
};
