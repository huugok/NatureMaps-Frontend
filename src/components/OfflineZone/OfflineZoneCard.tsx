import { CloudDownload, CloudOff, Trash2, X } from 'lucide-react';
import { IconButton } from '../ui/IconButton';
import { Button } from '../ui/Button';
import { useApp } from '../../context/useApp';
import { useOfflineZone } from '../../hooks/useOfflineZone';
import { formatBytes, formatCount, formatDate, formatPercent } from '../../i18n/format';
import type { StringKey } from '../../i18n/strings';
import type { Bbox, OfflineZoneRecord } from '../../types/offline';

export interface OfflineZoneCardProps {
  /** Identificador de la zona (`groupSlug` del backend). */
  groupSlug: string;
  /** Caja de la zona [oeste, sur, este, norte]: de ella salen las teselas a guardar. */
  bbox: Bbox;
  /** Ejemplares de la zona, solo para estimar el peso antes de descargar. */
  plantCount?: number;
  /**
   * Versión para flotar sobre el mapa: compacta, con botón para cerrarla y sin
   * contenido una vez descargada (el mapa queda limpio; el aviso lo da `onSaved`).
   */
  floating?: boolean;
  /** Se llama una vez guardada la zona (la ficha o el mapa avisan al usuario). */
  onSaved?: (record: OfflineZoneRecord) => void;
  /** Cierra la tarjeta flotante sin descargar. */
  onClose?: () => void;
}

const PHASE_TEXT: Record<'detail' | 'plants' | 'tiles' | 'saving', StringKey> = {
  detail: 'offline.phase.detail',
  plants: 'offline.phase.plants',
  tiles: 'offline.phase.tiles',
  saving: 'offline.phase.saving',
};

const ERROR_TEXT: Record<string, StringKey> = {
  network: 'offline.error.network',
  'storage-full': 'offline.error.storage',
  'too-large': 'offline.error.tooLarge',
  unsupported: 'offline.error.unsupported',
  generic: 'offline.error.generic',
};

/**
 * Descarga una zona verde para consultarla sin conexión: estima el peso, enseña
 * el progreso (con cancelar) y, una vez guardada, permite borrarla. Se usa en la
 * ficha de la zona y sobre el mapa. La gestión de todas las descargas es NM-17.
 */
export function OfflineZoneCard({ groupSlug, bbox, plantCount = 0, floating = false, onSaved, onClose }: OfflineZoneCardProps) {
  const { t, lang } = useApp();
  const { state, estimate, download, cancel, remove } = useOfflineZone(groupSlug, lang, bbox, plantCount, onSaved);
  const frame = floating ? 'rounded-card bg-surface p-3 shadow-float' : 'mt-3 rounded-card bg-surface-2 p-4';

  if (state.status === 'checking') return null;
  // Sobre el mapa, una zona ya descargada no deja ninguna tarjeta: se gestiona desde Rutas.
  if (floating && state.status === 'saved') return null;

  if (state.status === 'unsupported') {
    return floating ? null : (
      <section aria-labelledby={`offline-${groupSlug}`} className={frame}>
        <h2 id={`offline-${groupSlug}`} className="text-caption font-semibold uppercase tracking-wider text-muted">{t('offline.title')}</h2>
        <p className="mt-1 text-small text-muted">{t('offline.unsupported')}</p>
      </section>
    );
  }

  return (
    <section aria-labelledby={`offline-${groupSlug}`} className={frame}>
      <div className="flex items-center justify-between gap-2">
        <h2 id={`offline-${groupSlug}`} className="flex items-center gap-1.5 text-caption font-semibold uppercase tracking-wider text-muted">
          <CloudOff size={14} aria-hidden="true" />
          {t('offline.title')}
        </h2>
        {floating && onClose && state.status !== 'downloading' && (
          <IconButton icon={X} label={t('offline.close')} onClick={onClose} className="-my-2 -mr-2 shadow-none" />
        )}
      </div>

      {state.status === 'idle' && (
        <>
          {state.error && <p role="alert" className="mt-2 text-small text-danger">{t(ERROR_TEXT[state.error] ?? 'offline.error.generic')}</p>}
          {estimate.tooLarge ? (
            <p className="mt-2 text-small text-muted">{t('offline.error.tooLarge')}</p>
          ) : (
            <>
              {!floating && <p className="mt-1 text-small text-ink-2">{t('offline.estimate', { size: formatBytes(estimate.bytes, lang) })}</p>}
              <Button className="mt-2" block size={floating ? 'sm' : 'md'} icon={CloudDownload} onClick={() => void download()}>
                {floating ? `${t('offline.download')} · ${formatBytes(estimate.bytes, lang)}` : t('offline.download')}
              </Button>
            </>
          )}
        </>
      )}

      {state.status === 'downloading' && (
        <>
          <p role="status" className="mt-1 text-small text-ink-2">{t(PHASE_TEXT[state.progress.phase])}</p>
          <div
            role="progressbar"
            aria-label={t('offline.progressAria')}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(state.progress.fraction * 100)}
            aria-valuetext={formatPercent(state.progress.fraction, lang)}
            className="mt-2 h-2 overflow-hidden rounded-full bg-line"
          >
            <div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${Math.round(state.progress.fraction * 100)}%` }} />
          </div>
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="text-small tabular-nums text-muted">{formatPercent(state.progress.fraction, lang)}</span>
            <Button variant="ghost" size="sm" icon={X} onClick={cancel}>{t('offline.cancel')}</Button>
          </div>
        </>
      )}

      {state.status === 'saved' && (
        <>
          <p className="mt-1 text-small font-semibold text-accent">{t('offline.saved')}</p>
          <p className="mt-1 text-small text-muted">
            {t('offline.savedMeta', {
              date: formatDate(state.record.downloadedAt, lang),
              size: formatBytes(state.record.tiles.bytes, lang),
              count: formatCount(state.record.plants.length, lang),
            })}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" to="/rutas">{t('offline.seeInRoutes')}</Button>
            <Button variant="ghost" size="sm" icon={Trash2} onClick={() => void remove()}>
              {t('offline.remove')}
            </Button>
          </div>
        </>
      )}
    </section>
  );
}
