import { CloudDownload, MapPin, Trash2, TriangleAlert } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { useApp } from '../../context/useApp';
import { formatBytes, formatCount, formatDate, formatPercent } from '../../i18n/format';
import {
  cancelDownload, dismissDownload, getActiveDownloads, removeDownloads, startDownload, subscribeActive, subscribeLibrary,
} from '../../services/downloadRegistry';
import type { ActiveDownload } from '../../services/downloadRegistry';
import { listOfflineZones } from '../../services/offlineRead';
import { downloadedBytes, isLowStorage } from '../../services/offlineQuota';
import { freeStorageBytes, isOfflineSupported } from '../../services/offlineStorage';
import type { OfflineZoneRecord } from '../../types/offline';
import { ERROR_TEXT, PHASE_TEXT } from './messages';

type Confirming = { kind: 'one'; groupSlug: string } | { kind: 'all' } | null;

/**
 * Gestión de descargas en la pantalla Rutas (NM-17): lista de zonas con su estado
 * (descargando, con error o descargada), espacio ocupado y libre, aviso de poco
 * espacio y eliminación de una zona o de todas, siempre con confirmación.
 */
export function DownloadedZones() {
  const { t, lang } = useApp();
  const supported = isOfflineSupported();
  const [zones, setZones] = useState<OfflineZoneRecord[] | null>(null);
  const [active, setActive] = useState<readonly ActiveDownload[]>(() => getActiveDownloads());
  const [free, setFree] = useState<number | null>(null);
  const [confirming, setConfirming] = useState<Confirming>(null);

  const refreshFree = useCallback(() => {
    void freeStorageBytes().then(setFree);
  }, []);

  useEffect(() => {
    if (!supported) return;
    let cancelled = false;
    void listOfflineZones().then((list) => {
      if (!cancelled) setZones(list);
    });
    refreshFree();
    const offActive = subscribeActive(() => setActive(getActiveDownloads()));
    const offLibrary = subscribeLibrary((change) => {
      if (change.type === 'saved') {
        setZones((current) => [...(current ?? []).filter((zone) => zone.groupSlug !== change.record.groupSlug), change.record]);
      } else {
        setZones((current) => (current ?? []).filter((zone) => !change.groupSlugs.includes(zone.groupSlug)));
      }
      refreshFree();
    });
    return () => {
      cancelled = true;
      offActive();
      offLibrary();
    };
  }, [supported, refreshFree]);

  const remove = useCallback(async (groupSlugs: string[]) => {
    setConfirming(null);
    await removeDownloads(groupSlugs);
  }, []);

  if (!supported || zones === null) return null;

  const sorted = [...zones].sort((a, b) => b.downloadedAt.localeCompare(a.downloadedAt));
  const total = downloadedBytes(zones);
  const empty = sorted.length === 0 && active.length === 0;

  return (
    <section aria-labelledby="routes-downloads" className="mt-4">
      <h2 id="routes-downloads" className="font-display text-heading text-ink">{t('routes.downloads')}</h2>

      {zones.length > 0 && (
        <div className="mt-1">
          <p className="text-small text-muted">
            {t('routes.downloadsSummary', { count: formatCount(zones.length, lang), size: formatBytes(total, lang) })}
          </p>
          {free !== null && <p className="text-small text-muted">{t('routes.downloadsFree', { size: formatBytes(free, lang) })}</p>}
        </div>
      )}

      {isLowStorage(free) && free !== null && (
        <p role="status" className="mt-2 flex items-start gap-1.5 rounded-control bg-surface-2 p-3 text-small text-ink-2">
          <TriangleAlert size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          {t('routes.downloadsLow', { size: formatBytes(free, lang) })}
        </p>
      )}

      {empty ? (
        <p className="mt-2 text-small text-muted">{t('routes.downloadsEmpty')}</p>
      ) : (
        <ul className="mt-2 flex flex-col gap-2">
          {active.map((entry) => (
            <li key={`active-${entry.groupSlug}`}>
              <Card>
                <h3 className="text-body font-semibold text-ink">{entry.name}</h3>
                {entry.status === 'downloading' ? (
                  <>
                    <p role="status" className="mt-0.5 text-small text-muted">
                      {t('routes.downloadsDownloading')} · {t(PHASE_TEXT[entry.progress.phase])} · {formatPercent(entry.progress.fraction, lang)}
                    </p>
                    <div
                      role="progressbar"
                      aria-label={t('offline.progressAria')}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={Math.round(entry.progress.fraction * 100)}
                      aria-valuetext={formatPercent(entry.progress.fraction, lang)}
                      className="mt-2 h-2 overflow-hidden rounded-full bg-line"
                    >
                      <div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${Math.round(entry.progress.fraction * 100)}%` }} />
                    </div>
                    <div className="mt-3">
                      <Button size="sm" variant="secondary" aria-label={t('routes.downloadsCancel', { name: entry.name })} onClick={() => cancelDownload(entry.groupSlug)}>
                        {t('offline.cancel')}
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <p role="alert" className="mt-0.5 flex items-start gap-1.5 text-small text-danger">
                      <TriangleAlert size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                      {t('routes.downloadsFailed')} · {t(ERROR_TEXT[entry.error] ?? ERROR_TEXT.generic)}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button size="sm" icon={CloudDownload} onClick={() => void startDownload({ groupSlug: entry.groupSlug, lang: entry.lang, name: entry.name })}>
                        {t('routes.downloadsRetry')}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => dismissDownload(entry.groupSlug)}>{t('routes.downloadsDismiss')}</Button>
                    </div>
                  </>
                )}
              </Card>
            </li>
          ))}
          {sorted.map((zone) => (
            <li key={zone.groupSlug}>
              <Card>
                <h3 className="text-body font-semibold text-ink">{zone.name}</h3>
                <p className="mt-0.5 text-small text-muted">
                  {t('offline.savedMeta', {
                    date: formatDate(zone.downloadedAt, lang),
                    size: formatBytes(zone.tiles.bytes, lang),
                    count: formatCount(zone.plants.length, lang),
                  })}
                </p>
                {confirming?.kind === 'one' && confirming.groupSlug === zone.groupSlug ? (
                  <div role="alertdialog" aria-label={t('routes.downloadsRemove', { name: zone.name })} className="mt-3">
                    <p className="text-small text-ink">{t('routes.downloadsRemoveConfirm', { name: zone.name, size: formatBytes(zone.tiles.bytes, lang) })}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Button size="sm" icon={Trash2} onClick={() => void remove([zone.groupSlug])}>{t('routes.downloadsConfirmYes')}</Button>
                      <Button size="sm" variant="ghost" onClick={() => setConfirming(null)}>{t('routes.downloadsConfirmNo')}</Button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" icon={MapPin} to={`/mapa?zona=${zone.groupSlug}`}>{t('area.viewOnMap')}</Button>
                    <Button size="sm" variant="secondary" to={`/zona/${zone.groupSlug}`}>{t('routes.downloadsFicha')}</Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={Trash2}
                      aria-label={t('routes.downloadsRemove', { name: zone.name })}
                      onClick={() => setConfirming({ kind: 'one', groupSlug: zone.groupSlug })}
                    >
                      {t('offline.remove')}
                    </Button>
                  </div>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}

      {zones.length > 0 && (
        confirming?.kind === 'all' ? (
          <div role="alertdialog" aria-label={t('routes.downloadsRemoveAll')} className="mt-3">
            <p className="text-small text-ink">
              {t('routes.downloadsRemoveAllConfirm', { count: formatCount(zones.length, lang), size: formatBytes(total, lang) })}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button size="sm" icon={Trash2} onClick={() => void remove(zones.map((zone) => zone.groupSlug))}>{t('routes.downloadsConfirmYes')}</Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirming(null)}>{t('routes.downloadsConfirmNo')}</Button>
            </div>
          </div>
        ) : (
          <div className="mt-3">
            <Button size="sm" variant="ghost" icon={Trash2} onClick={() => setConfirming({ kind: 'all' })}>{t('routes.downloadsRemoveAll')}</Button>
          </div>
        )
      )}
    </section>
  );
}
