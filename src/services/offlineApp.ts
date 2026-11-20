let ready: Promise<void> | undefined;

/** Solo producción: Vite genera un SW con los assets exactos de este build. */
export function prepareOfflineApp(signal?: AbortSignal): Promise<void> {
  if (!import.meta.env.PROD) return Promise.resolve();
  if (!('serviceWorker' in navigator)) return Promise.reject(new Error('Service worker unavailable'));
  ready ??= navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`)
    .then(async (registration) => {
      if (registration.active) return;
      const worker = registration.installing ?? registration.waiting;
      if (!worker) throw new Error('Offline app installation failed');
      if (worker.state === 'activated') return;
      await new Promise<void>((resolve, reject) => {
        const changed = () => {
          if (worker.state === 'activated' || worker.state === 'redundant') {
            worker.removeEventListener('statechange', changed);
            if (worker.state === 'activated') resolve();
            else reject(new Error('Offline app installation failed'));
          }
        };
        worker.addEventListener('statechange', changed);
        changed();
      });
    }).catch((error: unknown) => { ready = undefined; throw error; });
  if (!signal) return ready;
  signal.throwIfAborted();
  return new Promise<void>((resolve, reject) => {
    const abort = () => reject(signal.reason);
    signal.addEventListener('abort', abort, { once: true });
    ready!.then(resolve, reject).finally(() => signal.removeEventListener('abort', abort));
  });
}
