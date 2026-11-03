import React from 'react';
import { Check, MapPin } from 'lucide-react';
import { useApp } from '../../context/useApp';

export interface LocationPermissionPromptProps {
  /** El usuario acepta dar acceso a su ubicación. */
  onAllow: () => void;
  /** El usuario rechaza el permiso: se sigue sin plantas cercanas. */
  onDeny: () => void;
}

/**
 * Aviso previo al permiso de ubicación del navegador, con el mismo flujo que
 * el de la cámara: explica para qué se pide antes de disparar el aviso nativo.
 */
export const LocationPermissionPrompt: React.FC<LocationPermissionPromptProps> = ({ onAllow, onDeny }) => {
  const { t } = useApp();
  return (
    <div className="flex flex-col h-full w-full bg-surface text-ink justify-between p-5 pt-[max(40px,calc(env(safe-area-inset-top)+var(--app-top-inset)))] overflow-y-auto overscroll-contain">
      <div className="flex flex-col items-center text-center my-auto py-4 max-w-sm mx-auto">
        <div className="flex items-center justify-center w-20 h-20 rounded-2xl bg-accent-soft text-accent mb-5 shadow-xs">
          <MapPin size={38} strokeWidth={2} />
        </div>

        <h1 className="font-display text-heading text-balance text-ink mb-2.5">
          {t('location.promptTitle')}
        </h1>

        <p className="text-small text-muted text-pretty max-w-xs mb-6">
          {t('location.promptDesc')}
        </p>

        <div className="w-full flex flex-col gap-2.5 text-left mb-2">
          <div className="flex items-center gap-3 p-3.5 rounded-card bg-surface-2 shadow-raised">
            <div className="flex items-center justify-center w-5 h-5 rounded-full bg-accent-soft text-accent shrink-0">
              <Check size={14} strokeWidth={2.5} />
            </div>
            <span className="text-small font-medium text-ink-2">{t('location.promptSetting')}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2.5 w-full max-w-sm mx-auto pt-2 pb-6">
        <button
          type="button"
          onClick={onAllow}
          className="w-full py-3.5 px-4 rounded-card bg-accent hover:brightness-95 text-on-accent text-body font-semibold transition shadow-raised cursor-pointer active:scale-[0.98]"
        >
          {t('location.allowButton')}
        </button>

        <button
          type="button"
          onClick={onDeny}
          className="w-full py-3.5 px-4 rounded-card bg-warm-strong hover:brightness-95 text-on-accent text-body font-semibold transition shadow-raised cursor-pointer active:scale-[0.98]"
        >
          {t('location.denyButton')}
        </button>
      </div>
    </div>
  );
};
