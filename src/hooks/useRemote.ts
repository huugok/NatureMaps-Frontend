import { useCallback, useEffect, useRef, useState } from 'react';

export type RemoteState<T> =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; data: T };

/**
 * Carga remota con estados honestos (cargando / error / listo) y reintento.
 * `key` identifica la petición: al cambiar (otro idioma, otro filtro) se
 * cancela la anterior y se vuelve a pedir. Con `key` null no se pide nada.
 */
export function useRemote<T>(key: string | null, load: (signal: AbortSignal) => Promise<T>) {
  const [attempt, setAttempt] = useState(0);
  const request = key === null ? null : `${key}#${attempt}`;
  // El resultado guarda a qué petición pertenece: mientras no sea la vigente,
  // el estado es «cargando» sin necesidad de reiniciarlo en el efecto.
  const [result, setResult] = useState<{ request: string; state: RemoteState<T> } | null>(null);
  // El cargador se lee de una ref para que la petición dependa solo de `key`.
  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  });

  useEffect(() => {
    if (request === null) return;
    const controller = new AbortController();
    loadRef.current(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setResult({ request, state: { status: 'ready', data } });
      })
      .catch(() => {
        if (!controller.signal.aborted) setResult({ request, state: { status: 'error' } });
      });
    return () => controller.abort();
  }, [request]);

  const retry = useCallback(() => setAttempt((current) => current + 1), []);
  const state: RemoteState<T> = result !== null && result.request === request ? result.state : { status: 'loading' };
  return { state, retry };
}
