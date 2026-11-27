import { useEffect, useState } from 'react';
import { useApp } from '../../context/useApp';
import { Button } from '../ui/Button';
import { formatBytes, formatDate } from '../../i18n/format';
import { notifyRouteDownloads, routeStore } from '../../services/offlineRouteStorage';
import type { OfflineRouteRecord } from '../../types/offlineRoute';

export function DownloadedRoutes() {
  const { t, lang } = useApp();
  const [records, setRecords] = useState<OfflineRouteRecord[]>([]);
  const [error, setError] = useState(false);
  const [removing, setRemoving] = useState<number>();
  useEffect(() => {
    let active = true;
    const refresh = () => { void routeStore().all().then((items) => {
      if (active) setRecords(items.sort((a, b) => b.downloadedAt.localeCompare(a.downloadedAt)));
    }).catch(() => { if (active) setError(true); }); };
    refresh();
    window.addEventListener('naturemaps-route-downloads', refresh);
    window.addEventListener('focus', refresh);
    return () => { active = false; window.removeEventListener('naturemaps-route-downloads', refresh); window.removeEventListener('focus', refresh); };
  }, []);
  const remove = async (id: number) => {
    setRemoving(id);
    try { await routeStore().delete(id); setRecords((items) => items.filter((item) => item.routeId !== id)); notifyRouteDownloads(); }
    catch { setError(true); }
    finally { setRemoving(undefined); }
  };
  if (!records.length && !error) return null;
  return <section className="mt-4" aria-label={t('routeOffline.downloads')}>
    <h2 className="font-display text-heading">{t('routeOffline.downloads')}</h2>
    {error && <p role="alert" className="text-small text-danger">{t('routeOffline.error')}</p>}
    <ul className="mt-2 flex flex-col gap-3">{records.map((record) => <li key={record.routeId} className="rounded-card bg-surface p-4">
      <h3 className="font-display text-body">{record.packet.route.name}</h3>
      <p className="my-2 text-small text-muted">{t(record.tiles ? 'routeOffline.saved' : 'routeOffline.legacy', { size: formatBytes(record.bytes, lang), date: formatDate(record.downloadedAt, lang), language: record.lang })}</p>
      <div className="flex flex-wrap gap-2">
        <Button to={`/rutas/${record.routeId}`} size="sm">{t('routes.downloadsFicha')}</Button>
        <Button variant="ghost" size="sm" disabled={removing !== undefined} aria-label={t('routeOffline.removeNamed', { name: record.packet.route.name })} onClick={() => void remove(record.routeId)}>{t('offline.remove')}</Button>
      </div>
    </li>)}</ul>
  </section>;
}
