import { describe, expect, it } from 'vitest';
import { waitForOfflineBuild } from './offlineApp';

class Worker extends EventTarget {
  scriptURL: string;
  state: ServiceWorkerState;
  constructor(url: string, state: ServiceWorkerState) { super(); this.scriptURL = url; this.state = state; }
  change(state: ServiceWorkerState) { this.state = state; this.dispatchEvent(new Event('statechange')); }
}

function state() {
  const old = new Worker('https://naturemaps.test/sw.js', 'activated');
  const current = new Worker('https://naturemaps.test/sw.js?version=new', 'installing');
  const registration = Object.assign(new EventTarget(), { active: old as Worker | null,
    installing: current as Worker | null, waiting: null as Worker | null });
  const container = Object.assign(new EventTarget(), { controller: old as Worker | null });
  const wait = () => waitForOfflineBuild(registration as unknown as ServiceWorkerRegistration,
    current.scriptURL, container as unknown as ServiceWorkerContainer);
  return { old, current, registration, container, wait };
}

describe('instalación del shell offline del build actual', () => {
  it('no anuncia éxito por tener otro worker activo; espera instalación y control de la pestaña', async () => {
    const { current, registration, container, wait } = state();
    let ready = false;
    const promise = wait().then(() => { ready = true; });
    await Promise.resolve(); expect(ready).toBe(false);
    registration.active = current; registration.installing = null;
    current.change('activated');
    await Promise.resolve(); expect(ready).toBe(false);
    container.controller = current; container.dispatchEvent(new Event('controllerchange'));
    await promise; expect(ready).toBe(true);
  });

  it('un fallo de la nueva instalación no queda oculto por el worker antiguo', async () => {
    const { current, wait } = state();
    const promise = wait();
    current.change('redundant');
    await expect(promise).rejects.toThrow('installation failed');
  });

  it('acepta el mismo build ya instalado y controlando la pestaña', async () => {
    const { current, registration, container, wait } = state();
    current.state = 'activated'; registration.active = current; registration.installing = null; container.controller = current;
    await expect(wait()).resolves.toBeUndefined();
  });

  it('espera la primera instalación aunque el control llegue antes de terminar la activación', async () => {
    const { current, registration, container, wait } = state();
    registration.active = null; container.controller = null;
    let ready = false;
    const promise = wait().then(() => { ready = true; });
    registration.active = current; registration.installing = null;
    container.controller = current; current.change('activating');
    container.dispatchEvent(new Event('controllerchange'));
    await Promise.resolve(); expect(ready).toBe(false);
    current.change('activated');
    await promise; expect(ready).toBe(true);
  });

  it('detecta un worker que aparece después de registrar los listeners', async () => {
    const { current, registration, container, wait } = state();
    registration.installing = null;
    const promise = wait();
    registration.installing = current; registration.dispatchEvent(new Event('updatefound'));
    registration.active = current; container.controller = current; current.change('activated');
    await expect(promise).resolves.toBeUndefined();
  });
});
