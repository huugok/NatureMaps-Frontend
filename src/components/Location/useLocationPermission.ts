import { useCallback, useEffect, useState } from 'react';

export type LocationPermissionStatus = 'prompt' | 'granted' | 'denied';

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
}

/**
 * Estado del permiso de ubicación, con el mismo flujo que la cámara: se
 * pregunta primero (aviso propio) y, si se deniega, se sigue sin ubicación y
 * con botón para reintentar. Mientras se consulta el estado inicial devuelve
 * `status === null`.
 *
 * Fallbacks:
 * - Sin `navigator.geolocation` → `'denied'` (no hay nada que pedir).
 * - Sin `navigator.permissions` (navegadores antiguos) → `'granted'`: el aviso
 *   nativo saldrá al pedir la posición, igual que con la cámara.
 */
export function useLocationPermission() {
  // El estado se resuelve al instante cuando se puede (sin geolocation o sin
  // Permissions API) y queda en `null` solo mientras se consulta el permiso.
  const [status, setStatus] = useState<LocationPermissionStatus | null>(() => {
    if (!navigator.geolocation) return 'denied';
    return navigator.permissions ? null : 'granted';
  });
  const [position, setPosition] = useState<LocationCoordinates | null>(null);

  useEffect(() => {
    if (status !== null) return;
    const permissions = navigator.permissions;
    if (!permissions) return;
    let cancelled = false;
    permissions
      .query({ name: 'geolocation' })
      .then((permission) => {
        if (cancelled) return;
        setStatus(permission.state === 'granted' ? 'granted' : permission.state === 'denied' ? 'denied' : 'prompt');
      })
      .catch(() => {
        if (!cancelled) setStatus('granted');
      });
    return () => {
      cancelled = true;
    };
  }, [status]);

  const allow = useCallback(() => {
    if (!navigator.geolocation) {
      setStatus('denied');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setPosition({ latitude: position.coords.latitude, longitude: position.coords.longitude });
        setStatus('granted');
      },
      () => setStatus('denied'),
      { enableHighAccuracy: true, timeout: 15_000 },
    );
  }, []);

  const deny = useCallback(() => setStatus('denied'), []);
  const retry = useCallback(() => setStatus('prompt'), []);

  // Si el permiso ya estaba concedido (usuario recurrente) el aviso no se
  // muestra: se pide la posición directamente para que la pantalla pueda usarla.
  useEffect(() => {
    if (status !== 'granted' || position || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (current) => setPosition({ latitude: current.coords.latitude, longitude: current.coords.longitude }),
      () => {
        // Sin posición no hay plantas cercanas; cada pantalla decide su estado.
      },
      { enableHighAccuracy: true, timeout: 15_000 },
    );
  }, [status, position]);

  return { status, position, allow, deny, retry };
}
