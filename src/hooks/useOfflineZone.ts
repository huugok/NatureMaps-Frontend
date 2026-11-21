import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { downloadZone, removeZone } from '../services/offlineDownload';
import { isAbortError, OfflineError } from '../services/offlineError';
import { getOfflineZone } from '../services/offlineRead';
import { isOfflineSupported } from '../services/offlineStorage';
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
 * peso sale de la caja de la zona, sin tocar la red.
 */
export function useOfflineZone(
  groupSlug: string,
  lang: Language,
  bbox: Bbox,
  plantCount = 0,
  onSaved?: (record: OfflineZoneRecord) => void,
) {
  const supported = isOfflineSupported();
  const [state, setState] = useState<OfflineZoneState>(supported ? { status: 'checking' } : { status: 'unsupported' });
  const controllerRef = useRef<AbortController | null>(null);
  // El aviso de «descargada» se lee de una ref: cambiar de callback no reinicia nada.
  const onSavedRef = useRef(onSaved);
  useEffect(() => {
    onSavedRef.current = onSaved;
  });

  useEffect(() => {
    if (!supported) return;
    let cancelled = false;
    void getOfflineZone(groupSlug).then((record) => {
      if (!cancelled) setState(record ? { status: 'saved', record } : { status: 'idle', error: null });
    });
    return () => {
      cancelled = true;
      controllerRef.current?.abort();
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

  const download = useCallback(async () => {
    const controller = new AbortController();
    controllerRef.current = controller;
    setState({ status: 'downloading', progress: { phase: 'detail', done: 0, total: 1, fraction: 0 } });
    try {
      const record = await downloadZone({
        groupSlug,
        lang,
        signal: controller.signal,
        onProgress: (progress) => {
          if (!controller.signal.aborted) setState({ status: 'downloading', progress });
        },
      });
      // Si el usuario se fue de la pantalla, el estado ya no importa (el efecto aborta).
      setState({ status: 'saved', record });
      onSavedRef.current?.(record);
      void navigator.storage?.persist?.().catch(() => undefined);
    } catch (error) {
      if (isAbortError(error)) {
        setState({ status: 'idle', error: null });
      } else {
        setState({ status: 'idle', error: error instanceof OfflineError ? error.code : 'generic' });
      }
    } finally {
      if (controllerRef.current === controller) controllerRef.current = null;
    }
  }, [groupSlug, lang]);

  const cancel = useCallback(() => controllerRef.current?.abort(), []);

  const remove = useCallback(async () => {
    await removeZone(groupSlug);
    setState({ status: 'idle', error: null });
  }, [groupSlug]);

  return { state, estimate, download, cancel, remove };
}
