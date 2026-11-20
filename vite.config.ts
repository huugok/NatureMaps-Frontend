/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { randomUUID } from 'node:crypto'
import type { Plugin } from 'vite'

// El cliente y el worker identifican el mismo build, incluso si ya había una
// versión anterior activa en el navegador.
const offlineBuildId = randomUUID();

function offlineShell(): Plugin {
  return {
    name: 'naturemaps-offline-shell',
    apply: 'build',
    enforce: 'post',
    generateBundle(_options, bundle) {
      const files = Object.keys(bundle).filter((file) => !file.endsWith('.map'));
      const version = offlineBuildId;
      this.emitFile({ type: 'asset', fileName: 'sw.js', source: `
const CACHE = 'naturemaps-shell-${version}';
const FILES = ${JSON.stringify(files)};
const urls = FILES.map(file => new URL(file, self.registration.scope).href);
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(urls)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  // Conserva también el build anterior para las pestañas que siguen abiertas.
  event.waitUntil(caches.keys().then(keys => {
    const shells = keys.filter(key => key.startsWith('naturemaps-shell-'));
    const previous = shells.filter(key => key !== CACHE).at(-1);
    return Promise.all(shells.filter(key => key !== CACHE && key !== previous).map(key => caches.delete(key)));
  }).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).catch(async () => {
      const cached = await (await caches.open(CACHE)).match(new URL('index.html', self.registration.scope).href);
      return cached || new Response('La aplicación no está disponible sin conexión. Ábrela con conexión y vuelve a descargar la ruta.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    }));
  } else if (urls.includes(event.request.url) || event.request.url.startsWith(new URL('assets/', self.registration.scope).href)) {
    event.respondWith(caches.open(CACHE).then(cache => cache.match(event.request)).then(async cached => {
      if (cached) return cached;
      const keys = (await caches.keys()).filter(key => key.startsWith('naturemaps-shell-') && key !== CACHE);
      for (const key of keys.reverse()) {
        const previous = await (await caches.open(key)).match(event.request);
        if (previous) return previous;
      }
      return fetch(event.request);
    }));
  }
});
` });
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  define: { 'import.meta.env.VITE_OFFLINE_BUILD_ID': JSON.stringify(offlineBuildId) },
  plugins: [react(), tailwindcss(), offlineShell()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
})
