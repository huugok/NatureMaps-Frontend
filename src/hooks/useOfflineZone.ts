import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  cancelDownload, getActiveDownloads, removeDownloads, startDownload, subscribeActive, subscribeLibrary,
} from '../services/downloadRegistry';
import type { ActiveDownload } from '../services/downloadRegistry';
import { getOfflineZone } from '../services/offlineRead';
import { freeStorageBytes, isOfflineSupported } from '../services/offlineStorage';
import { assessStorage, bytesNeeded } from '../services/offlineQuota';
import { countTiles, estimateBytes } from '../services/offlineTiles';
import type { Language } from '../types/language';
import type { Bbox, DownloadProgress, OfflineErrorCode, OfflineZoneRecord } from '../types/offline';

export type OfflineZoneState =
  | { status: 'checking' }
  | { status: 'unsupported' }
  | { status: 'idle'; error: OfflineErrorCode | 'generic' | null }
  | { status: 'downloading'; progress: DownloadProgress }
  | { status: 'saved'; record: OfflineZoneRecord };

/**
 * Estado de la descarga de una zona: si ya está guardada, su progreso mientras
 * se descarga y las acciones de descargar, cancelar y borrar. La estimación de
 * peso sale de la caja de la zona, sin tocar la red. La descarga vive en el
 * registro compartido (NM-17): sigue aunque se cambie de pantalla y Rutas la ve.
 */
export function useOfflineZone(
  groupSlug: string,
  lang: Language,
  bbox: Bbox,
  plantCount = 0,
  onSaved?: (record: OfflineZoneRecord) => void,
  name?: string,
) {
  const supported = isOfflineSupported();
  // `undefined`: aún sin leer del dispositivo; `null`: la zona no está guardada.
  // Se guarda con su slug: al cambiar de zona el valor anterior deja de valer sin reiniciar nada.
  const [loaded, setLoaded] = useState<{ groupSlug: string; record: OfflineZoneRecord | null } | null>(null);
  const [activeList, setActiveList] = useState<readonly ActiveDownload[]>(() => getActiveDownloads());
  const record = loaded?.groupSlug === groupSlug ? loaded.record : undefined;
  const active = activeList.find((entry) => entry.groupSlug === groupSlug) ?? null;
  const [free, setFree] = useState<number | null>(null);
  const mountedRef = useRef(true);
  // El aviso de «descargada» se lee de una ref: cambiar de callback no reinicia nada.
  const onSavedRef = useRef(onSaved);
  useEffect(() => {
    onSavedRef.current = onSaved;
  });
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!supported) return;
    let cancelled = false;
    void getOfflineZone(groupSlug).then((saved) => {
      if (!cancelled) setLoaded({ groupSlug, record: saved ?? null });
    });
    const offActive = subscribeActive(() => setActiveList(getActiveDownloads()));
    const offLibrary = subscribeLibrary((change) => {
      if (change.type === 'saved' && change.record.groupSlug === groupSlug) setLoaded({ groupSlug, record: change.record });
      if (change.type === 'removed' && change.groupSlugs.includes(groupSlug)) setLoaded({ groupSlug, record: null });
    });
    return () => {
      cancelled = true;
      offActive();
      offLibrary();
    };
  }, [groupSlug, supported]);

  const estimate = useMemo(() => {
    try {
      const { count, maxZoom } = countTiles(bbox);
      return { tooLarge: false, tiles: count, maxZoom, bytes: estimateBytes(count, plantCount) };
    } catch {
      return { tooLarge: true, tiles: 0, maxZoom: 0, bytes: 0 };
    }
  }, [bbox, plantCount]);

  // Espacio libre, para avisar antes de descargar. Se relee al volver a estar lista para descargar.
  const idle = supported && record === null && active === null;
  useEffect(() => {
    if (!idle) return;
    let cancelled = false;
    void freeStorageBytes().then((bytes) => {
      if (!cancelled) setFree(bytes);
    });
    return () => {
      cancelled = true;
    };
  }, [idle]);
  const storage = useMemo(() => assessStorage(estimate.bytes, free), [estimate.bytes, free]);
  const storageInfo = { level: storage, free, needed: bytesNeeded(estimate.bytes) };

  const state: OfflineZoneState = useMemo(() => {
    if (!supported) return { status: 'unsupported' };
    if (active?.status === 'downloading') return { status: 'downloading', progress: active.progress };
    if (record === undefined) return { status: 'checking' };
    if (active?.status === 'error') return { status: 'idle', error: active.error };
    if (record) return { status: 'saved', record };
    return { status: 'idle', error: null };
  }, [supported, active, record]);

  const download = useCallback(async () => {
    const saved = await startDownload({ groupSlug, lang, name });
    if (saved && mountedRef.current) onSavedRef.current?.(saved);
  }, [groupSlug, lang, name]);

  const cancel = useCallback(() => cancelDownload(groupSlug), [groupSlug]);

  const remove = useCallback(() => removeDownloads([groupSlug]), [groupSlug]);

  return { state, estimate, storage: storageInfo, download, cancel, remove };
}
