import { MapPin, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { useApp } from '../../context/useApp';
import { formatBytes, formatCount, formatDate } from '../../i18n/format';
import { removeZone } from '../../services/offlineDownload';
import { listOfflineZones } from '../../services/offlineRead';
import { isOfflineSupported } from '../../services/offlineStorage';
import type { OfflineZoneRecord } from '../../types/offline';

/**
 * Zonas descargadas para usar sin conexión, en la pantalla Rutas: abrir el mapa
 * o la ficha de cada parque y eliminar la descarga. La gestión global de
 * descargas (espacio total, actualizar, borrar todas) es NM-17.
 */
export function DownloadedZones() {
  const { t, lang } = useApp();
  const supported = isOfflineSupported();
  const [zones, setZones] = useState<OfflineZoneRecord[] | null>(null);

  useEffect(() => {
    if (!supported) return;
    let cancelled = false;
    void listOfflineZones().then((list) => {
      if (!cancelled) setZones([...list].sort((a, b) => b.downloadedAt.localeCompare(a.downloadedAt)));
    });
    return () => {
      cancelled = true;
    };
  }, [supported]);

  const remove = useCallback(async (groupSlug: string) => {
    await removeZone(groupSlug);
    setZones((current) => (current ?? []).filter((zone) => zone.groupSlug !== groupSlug));
  }, []);

  if (!supported || zones === null) return null;

  return (
    <section aria-labelledby="routes-downloads" className="mt-4">
      <h2 id="routes-downloads" className="font-display text-heading text-ink">{t('routes.downloads')}</h2>
      {zones.length === 0 ? (
        <p className="mt-2 text-small text-muted">{t('routes.downloadsEmpty')}</p>
      ) : (
        <ul className="mt-2 flex flex-col gap-2">
          {zones.map((zone) => (
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
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" icon={MapPin} to={`/mapa?zona=${zone.groupSlug}`}>{t('area.viewOnMap')}</Button>
                  <Button size="sm" variant="secondary" to={`/zona/${zone.groupSlug}`}>{t('routes.downloadsFicha')}</Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={Trash2}
                    aria-label={t('routes.downloadsRemove', { name: zone.name })}
                    onClick={() => void remove(zone.groupSlug)}
                  >
                    {t('offline.remove')}
                  </Button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
