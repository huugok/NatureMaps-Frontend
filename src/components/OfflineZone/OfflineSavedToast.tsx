import { CheckCircle2, X } from 'lucide-react';
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { IconButton } from '../ui/IconButton';
import { useApp } from '../../context/useApp';

/** Lo que dura el aviso de zona descargada antes de desaparecer solo. */
export const SAVED_TOAST_MS = 20_000;

export interface OfflineSavedToastProps {
  /** Nombre del parque descargado. */
  name: string;
  onClose: () => void;
  durationMs?: number;
}

/**
 * Aviso emergente de «parque descargado, lo encuentras en Rutas». Se quita solo
 * a los 20 segundos para dejar el mapa limpio, o antes con el botón de cerrar.
 */
export function OfflineSavedToast({ name, onClose, durationMs = SAVED_TOAST_MS }: OfflineSavedToastProps) {
  const { t } = useApp();
  useEffect(() => {
    const timer = setTimeout(onClose, durationMs);
    return () => clearTimeout(timer);
  }, [onClose, durationMs]);

  return (
    <div role="status" aria-live="polite" className="flex items-start gap-3 rounded-card bg-night p-3 text-on-accent shadow-float">
      <CheckCircle2 size={20} className="mt-0.5 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-small font-semibold">{t('offline.toast', { name })}</p>
        <Link to="/rutas" onClick={onClose} className="mt-0.5 inline-block min-h-6 text-small font-semibold underline">
          {t('offline.toast.open')}
        </Link>
      </div>
      <IconButton icon={X} label={t('offline.toast.close')} onClick={onClose} className="-my-1 -mr-1 bg-transparent text-on-accent shadow-none hover:bg-white/10" />
    </div>
  );
}
