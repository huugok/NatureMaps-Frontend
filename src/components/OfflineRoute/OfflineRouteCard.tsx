import { useEffect, useRef, useState } from 'react';
import { Download, Trash2, X } from 'lucide-react';
import { useApp } from '../../context/useApp';
import { Button } from '../ui/Button';
import { formatBytes, formatDate, formatPercent } from '../../i18n/format';
import { downloadRoute } from '../../services/offlineRouteDownload';
import { isAbortError, OfflineError } from '../../services/offlineError';
import { notifyRouteDownloads, routeStore, supportsOfflineRoutes } from '../../services/offlineRouteStorage';
import type { OfflineRouteRecord, RouteDownloadProgress } from '../../types/offlineRoute';
import type { StringKey } from '../../i18n/strings';

const phaseKeys: Record<RouteDownloadProgress['phase'], StringKey> = {
  content: 'routeOffline.content', images: 'routeOffline.images', saving: 'offline.phase.saving',
};

export function OfflineRouteCard({ routeId }: { routeId: number }) {
  const { t, lang } = useApp();
  const [record, setRecord] = useState<OfflineRouteRecord>();
  const [progress, setProgress] = useState<RouteDownloadProgress>();
  const [error, setError] = useState<StringKey>();
  const [checking, setChecking] = useState(true);
  const [removing, setRemoving] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const supported = supportsOfflineRoutes();
  useEffect(() => {
    let active = true;
    void routeStore().get(routeId).then((saved) => { if (active) setRecord(saved); })
      .catch(() => { if (active) setError('routeOffline.error'); })
      .finally(() => { if (active) setChecking(false); });
    return () => { active = false; controller.current?.abort(); controller.current = null; };
  }, [routeId]);

  const download = async () => {
    if (controller.current) return;
    const job = new AbortController();
    controller.current = job;
    setError(undefined);
    try {
      const saved = await downloadRoute({ id: routeId, lang, signal: job.signal, onProgress: (value) => {
        if (controller.current === job) setProgress(value);
      } });
      notifyRouteDownloads();
      if (controller.current === job) setRecord(saved);
      void navigator.storage?.persist?.().catch(() => undefined);
    } catch (failure) {
      if (controller.current === job && !isAbortError(failure)) {
        setError(failure instanceof OfflineError && failure.code === 'storage-full' ? 'routeOffline.storage' : 'routeOffline.error');
      }
    } finally {
      if (controller.current === job) { controller.current = null; setProgress(undefined); }
    }
  };

  const remove = async () => {
    setRemoving(true);
    setError(undefined);
    try { await routeStore().delete(routeId); setRecord(undefined); notifyRouteDownloads(); }
    catch { setError('routeOffline.error'); }
    finally { setRemoving(false); }
  };

  return (
    <section aria-label={t('offline.title')} className="rounded-card bg-surface-2 p-4">
      {!supported ? <p className="text-small text-muted">{t('routeOffline.unsupported')}</p> : <>
        {error && <p role="alert" className="mb-2 text-small text-danger">{t(error)}</p>}
        {record && <p className="mb-2 text-small text-accent">{t('routeOffline.saved', {
          size: formatBytes(record.bytes, lang), date: formatDate(record.downloadedAt, lang), language: record.lang,
        })}</p>}
        {progress ? <>
          <p role="status" className="text-small">{t(phaseKeys[progress.phase])} {progress.phase === 'images' && `${progress.done}/${progress.total}`}</p>
          <progress className="mt-2 w-full accent-accent" aria-label={t('offline.progressAria')} value={progress.fraction} max={1} />
          <div className="mt-2 flex items-center justify-between">
            <span className="text-small tabular-nums">{formatPercent(progress.fraction, lang)}</span>
            <Button size="sm" variant="ghost" icon={X} disabled={progress.phase === 'saving'} onClick={() => controller.current?.abort()}>{t('offline.cancel')}</Button>
          </div>
        </> : <div className="flex flex-wrap gap-2">
          <Button icon={Download} disabled={checking || removing} onClick={() => void download()}>{t(record ? 'routeOffline.redownload' : 'routes.download')}</Button>
          {record && <Button icon={Trash2} variant="ghost" disabled={removing} onClick={() => void remove()}>{t('offline.remove')}</Button>}
        </div>}
        <p className="mt-2 text-small text-muted">{t('routeOffline.includes')}</p>
      </>}
    </section>
  );
}
