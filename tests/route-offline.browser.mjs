import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { stripTypeScriptTypes } from 'node:module'
import { preview } from 'vite'

const fixture = stripTypeScriptTypes(await readFile(new URL('../src/test/routeOfflineFixtures.ts', import.meta.url), 'utf8'))
const { routePacket } = await import(`data:text/javascript;base64,${Buffer.from(fixture).toString('base64')}`)

// Ejecutar después de npm run build. Playwright puede instalarse aparte y
// pasarse mediante NATUREMAPS_PLAYWRIGHT_URL (URL file: de index.mjs).
const { chromium } = await import(process.env.NATUREMAPS_PLAYWRIGHT_URL ?? 'playwright')
const root = fileURLToPath(new URL('../dist/', import.meta.url))
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aY9sAAAAASUVORK5CYII=', 'base64')
let imageDelay = 0
let legacyWorker = true
const legacyHtml = '<!doctype html><title>Nature MAPS anterior</title><p>Versión anterior sin mapa</p>'
const legacyScript = `
self.addEventListener('install', event => event.waitUntil(caches.open('naturemaps-shell-legacy').then(cache => cache.put(new URL('index.html', self.registration.scope), new Response(${JSON.stringify(legacyHtml)}, { headers: { 'content-type': 'text/html' } })))));
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', event => {
  if (event.request.mode === 'navigate') event.respondWith(fetch(event.request).catch(() => caches.match(new URL('index.html', self.registration.scope))));
});`
// Usar el mismo servidor que npm run preview: sus respuestas incluyen Vary:
// Origin, que distingue el precache de las peticiones de módulos del navegador.
const previewServer = await preview({
  root: fileURLToPath(new URL('../', import.meta.url)),
  preview: { host: '127.0.0.1', port: 0, strictPort: true },
  plugins: [{ name: 'offline-browser-fixtures', configurePreviewServer(server) {
    server.middlewares.use(async (req, res, next) => {
      try {
        if (legacyWorker && req.url.startsWith('/sw.js')) {
          res.writeHead(200, { 'content-type': 'text/javascript' }); res.end(legacyScript); return
        }
        if (req.url === '/_storage') { res.writeHead(200, { 'content-type': 'text/html' }); res.end('<!doctype html><title>Storage fixture</title>'); return }
        if (req.url.startsWith('/photo.png')) {
          if (imageDelay) await new Promise((done) => setTimeout(done, imageDelay))
          res.writeHead(200, { 'content-type': 'image/png' }); res.end(png); return
        }
        next()
      } catch { res.writeHead(500); res.end() }
    })
  } }],
})
const server = previewServer.httpServer
const origin = `http://127.0.0.1:${server.address().port}`
const packet = structuredClone(routePacket)
packet.images[0].url = `${origin}/photo.png`
packet.species[0].image = packet.images[0]
let offline = false
let tileDownloads = 0
const browser = await chromium.launch({ channel: process.env.NATUREMAPS_BROWSER ?? 'msedge', headless: true })
try {
  const context = await browser.newContext({ viewport: { width: 402, height: 874 } })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (error) => errors.push(error.stack ?? error.message))
  await context.route('http://localhost:3000/**', async (request) => {
    if (offline) { await request.abort('internetdisconnected'); return }
    const url = new URL(request.request().url())
    let data = {}
    if (url.pathname === '/routes/7/offline') data = packet
    else if (url.pathname === '/routes/8/offline') data = { ...packet, route: { ...packet.route, id: 8, name: 'Segunda ruta' } }
    else if (url.pathname === '/routes/7') data = packet.route
    else if (url.pathname === '/routes/8') data = { ...packet.route, id: 8, name: 'Segunda ruta' }
    else if (url.pathname === '/routes') data = { total: 1, routes: [packet.route] }
    else if (url.pathname === '/species/5') data = packet.species[0]
    else if (url.pathname === '/species') data = { species: packet.species }
    else if (url.pathname === '/green-areas') data = { areas: [], sources: [] }
    await request.fulfill({ json: data })
  })
  // No se descargan teselas públicas en la prueba: se simula el proveedor.
  await context.route('https://tile.openstreetmap.org/**', async (request) => {
    if (offline) { await request.abort('internetdisconnected'); return }
    tileDownloads++
    await request.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="#e8eadc"/><path d="M0 80H256M80 0V256" stroke="#fff" stroke-width="12"/><path d="M0 140L256 190" stroke="#afc7db" stroke-width="20"/><text x="90" y="70" font-size="12">Tesela de prueba</text></svg>' })
  })
  // Simula IndexedDB v2 con un PMTiles antiguo; se conservan fichas e imágenes.
  await page.goto(`${origin}/_storage`)
  await page.evaluate(async () => {
    await (await caches.open('naturemaps-tiles-v1')).put('https://example.test/park-sentinel.png', new Response('saved park tile'))
    await navigator.serviceWorker.register('/sw.js')
    await navigator.serviceWorker.ready
    if (!navigator.serviceWorker.controller) await new Promise((done) => navigator.serviceWorker.addEventListener('controllerchange', done, { once: true }))
  })
  legacyWorker = false
  await page.evaluate(async (route) => {
    const database = await new Promise((done) => {
      const request = indexedDB.open('naturemaps-offline-routes', 2)
      request.onupgradeneeded = () => { request.result.createObjectStore('routes', { keyPath: 'routeId' }); request.result.createObjectStore('maps', { keyPath: 'sha256' }) }
      request.onsuccess = () => done(request.result)
    })
    await new Promise((done) => {
      const transaction = database.transaction(['routes', 'maps'], 'readwrite')
      transaction.objectStore('routes').put({ routeId: 7, lang: 'es', downloadedAt: '2026-11-19T10:00:00Z', bytes: 100,
        packet: { ...route, schemaVersion: 2 }, map: { sha256: 'legacy' }, images: [{ url: route.images[0].url, blob: new Blob(['previous photo'], { type: 'image/png' }) }] })
      transaction.objectStore('maps').put({ sha256: 'legacy', blob: new Blob(['legacy archive']) })
      transaction.oncomplete = done
    })
    database.close()
  }, packet)
  await page.goto(`${origin}/rutas/7`)
  const scriptUrl = await page.locator('script[type=module]').getAttribute('src')
  const scriptResponse = await context.request.get(new URL(scriptUrl, origin).href)
  assert.match(scriptResponse.headers().vary ?? '', /Origin/i, 'se comprueba el Vary real de Vite preview')
  await page.getByText('Descarga anterior: vuelve a descargar para guardar el mapa por teselas.').waitFor()
  imageDelay = 1800
  await page.getByRole('button', { name: 'Volver a descargar', exact: true }).click()
  await page.getByRole('progressbar').waitFor()
  await page.getByRole('button', { name: 'Cancelar descarga' }).click()
  await page.getByRole('button', { name: 'Volver a descargar', exact: true }).waitFor()
  assert.deepEqual(await page.evaluate(async () => {
    const database = await new Promise((done) => { const request = indexedDB.open('naturemaps-offline-routes', 3); request.onsuccess = () => done(request.result) })
    const stores = [...database.objectStoreNames]
    const rows = await new Promise((done) => { const request = database.transaction('routes').objectStore('routes').getAll(); request.onsuccess = () => done(request.result) })
    database.close()
    return { count: rows.length, images: rows[0].images.length, stores }
  }), { count: 1, images: 1, stores: ['routes'] }, 'la migración y la cancelación conservan fichas y fotos; se retira el PMTiles antiguo')
  imageDelay = 0
  await page.getByRole('button', { name: 'Volver a descargar', exact: true }).click()
  await page.getByText(/Disponible sin conexión/).waitFor()
  // En escritorio el marco se dibuja también con los estilos de producción.
  await page.setViewportSize({ width: 1280, height: 960 })
  assert.equal(await page.locator('.app-frame').evaluate(frame => getComputedStyle(frame).borderTopWidth), '8px')
  await page.evaluate(() => navigator.serviceWorker.ready)
  const workerState = await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration()
    return { controller: navigator.serviceWorker.controller?.scriptURL,
      active: registration?.active?.scriptURL, waiting: registration?.waiting?.scriptURL }
  })
  console.log(JSON.stringify({ workerState }))
  assert.match(workerState.controller ?? '', /sw\.js\?version=/, 'la descarga espera al worker del build actual, aunque hubiera otra versión instalada')
  await page.goto(`${origin}/rutas/8`)
  await page.getByRole('button', { name: 'Descargar ruta', exact: true }).click()
  await page.getByText(/Disponible sin conexión/).waitFor()
  assert.ok(tileDownloads > 0, 'el proveedor simulado sirve teselas')
  await page.goto(`${origin}/rutas/7`)
  offline = true
  await context.setOffline(true)
  await page.reload()
  await page.getByRole('heading', { name: packet.route.name, exact: true }).waitFor()
  await page.getByText(/Disponible sin conexión/).waitFor()
  assert.equal(await page.locator('.app-frame').evaluate(frame => getComputedStyle(frame).borderTopWidth), '8px', 'el marco sigue visible tras recargar sin red')
  await page.screenshot({ path: resolve(root, 'offline-desktop.png'), fullPage: true })
  await page.setViewportSize({ width: 402, height: 874 })
  assert.equal(await page.locator('.app-frame').evaluate(frame => getComputedStyle(frame).borderTopWidth), '0px', 'en móvil se aprovecha toda la pantalla')
  assert.ok(await page.locator('.leaflet-overlay-pane svg path').count() > 0, 'la geometría sigue dibujada sin red')
  await page.waitForFunction(() => [...document.querySelectorAll('.leaflet-tile-pane img')].some(image => image.src.startsWith('blob:') && image.naturalWidth === 256))
  await page.getByRole('img', { name: packet.route.name }).scrollIntoViewIfNeeded()
  await page.screenshot({ path: resolve(root, 'offline-map.png'), fullPage: true })
  await page.getByRole('button', { name: 'Iniciar ruta', exact: true }).click()
  await page.waitForURL('**/mapa?verRuta=7')
  await page.waitForFunction(() => [...document.querySelectorAll('.leaflet-tile-pane img')].some(image => image.src.startsWith('blob:') && image.naturalWidth === 256))
  await page.goBack()
  await page.getByRole('heading', { name: packet.route.name, exact: true }).waitFor()
  await page.getByRole('region', { name: 'Paradas del recorrido', exact: true }).getByRole('button', { name: /Naranjo/ }).click()
  await page.getByRole('heading', { level: 1, name: packet.species[0].scientificName, exact: true }).waitFor()
  await page.waitForFunction(() => [...document.images].some((image) => image.src.startsWith('data:image/') && image.naturalWidth > 0))
  await page.getByRole('button', { name: 'Volver', exact: true }).last().click()
  await page.locator('summary').filter({ hasText: 'Naranjo' }).click()
  await page.getByText('Ficha del naranjo.', { exact: true }).waitFor()
  await page.waitForFunction(() => [...document.images].some((image) => image.alt === 'Naranjo' && image.naturalWidth > 0))
  await page.locator('summary').filter({ hasText: 'Torre' }).click()
  await page.getByText('Una torre histórica.', { exact: true }).waitFor()
  await page.screenshot({ path: resolve(root, 'offline-route.png'), fullPage: true })
  // La descarga sobrevive al cierre completo de la pestaña y se abre sin red.
  await page.close()
  const reopened = await context.newPage()
  await reopened.goto(`${origin}/rutas/7`)
  await reopened.getByRole('heading', { name: packet.route.name, exact: true }).waitFor()
  await reopened.getByRole('tab', { name: 'Ver Rutas botánicas y culturales', exact: true }).click()
  const downloads = reopened.getByRole('region', { name: 'Rutas descargadas', exact: true })
  await downloads.locator('a[href="/rutas/7"]').click()
  await reopened.getByRole('button', { name: 'Eliminar descarga', exact: true }).click()
  await reopened.getByRole('button', { name: 'Descargar ruta', exact: true }).waitFor()
  await reopened.reload()
  await reopened.getByRole('alert').filter({ hasText: 'No se pudieron cargar las rutas.' }).waitFor()
  await reopened.getByRole('tab', { name: 'Ver Rutas botánicas y culturales', exact: true }).click()
  await reopened.getByRole('link', { name: 'Ver ficha', exact: true }).click()
  await reopened.getByRole('heading', { name: 'Segunda ruta', exact: true }).waitFor()
  await reopened.waitForFunction(() => [...document.querySelectorAll('.leaflet-tile-pane img')].some(image => image.src.startsWith('blob:') && image.naturalWidth === 256))
  await reopened.getByRole('button', { name: 'Eliminar descarga', exact: true }).click()
  await reopened.waitForFunction(async () => !(await caches.keys()).some(name => name.startsWith('naturemaps-route-tiles-v1-')))
  assert.equal(await reopened.evaluate(async () => (await (await caches.open('naturemaps-tiles-v1')).match('https://example.test/park-sentinel.png')).text()), 'saved park tile', 'borrar todas las rutas conserva la caché de parques')
  assert.deepEqual(errors, [])
  console.log('PASS: teselas simuladas en Cache API, recarga offline, cancelación, migración IDB, fichas, imágenes, reapertura y eliminación')
} finally {
  await browser.close()
  await new Promise((done) => server.close(done))
}
