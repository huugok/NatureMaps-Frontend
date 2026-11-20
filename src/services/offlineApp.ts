let ready: Promise<void> | undefined;

/** Un worker antiguo activo no demuestra que el JS/CSS actuales estén guardados.
 * Esperamos a que el worker de este build esté activado Y controle esta pestaña. */
export function waitForOfflineBuild(registration: ServiceWorkerRegistration, scriptUrl: string,
  container: ServiceWorkerContainer): Promise<void> {
  return new Promise((resolve, reject) => {
    const watched = new Set<ServiceWorker>();
    const clean = () => {
      clearTimeout(timer);
      registration.removeEventListener('updatefound', check);
      container.removeEventListener('controllerchange', check);
      watched.forEach((worker) => worker.removeEventListener('statechange', check));
    };
    const check = () => {
      for (const worker of [registration.installing, registration.waiting, registration.active]) {
        if (!worker || worker.scriptURL !== scriptUrl || watched.has(worker)) continue;
        watched.add(worker);
        worker.addEventListener('statechange', check);
      }
      if ([...watched].some((worker) => worker.state === 'redundant')) {
        clean(); reject(new Error('Offline app installation failed')); return;
      }
      if (registration.active?.scriptURL === scriptUrl && registration.active.state === 'activated'
        && container.controller?.scriptURL === scriptUrl) {
        clean(); resolve();
      }
    };
    const timer = setTimeout(() => { clean(); reject(new Error('Offline app installation timed out')); }, 60_000);
    registration.addEventListener('updatefound', check);
    container.addEventListener('controllerchange', check);
    check();
  });
}

/** Solo producción: Vite genera un SW con los assets exactos de este build. */
export function prepareOfflineApp(signal?: AbortSignal): Promise<void> {
  if (!import.meta.env.PROD) return Promise.resolve();
  if (!('serviceWorker' in navigator)) return Promise.reject(new Error('Service worker unavailable'));
  const version = encodeURIComponent(import.meta.env.VITE_OFFLINE_BUILD_ID as string);
  const scriptUrl = new URL(`${import.meta.env.BASE_URL}sw.js?version=${version}`, window.location.href).href;
  ready ??= navigator.serviceWorker.register(scriptUrl, { updateViaCache: 'none' })
    .then((registration) => waitForOfflineBuild(registration, scriptUrl, navigator.serviceWorker))
    .catch((error: unknown) => { ready = undefined; throw error; });
  if (!signal) return ready;
  signal.throwIfAborted();
  return new Promise<void>((resolve, reject) => {
    const abort = () => reject(signal.reason);
    signal.addEventListener('abort', abort, { once: true });
    ready!.then(resolve, reject).finally(() => signal.removeEventListener('abort', abort));
  });
}
