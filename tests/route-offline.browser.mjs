import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { stripTypeScriptTypes } from 'node:module'

const fixture = stripTypeScriptTypes(await readFile(new URL('../src/test/routeOfflineFixtures.ts', import.meta.url), 'utf8'))
const { routePacket } = await import(`data:text/javascript;base64,${Buffer.from(fixture).toString('base64')}`)

// Ejecutar después de npm run build. Playwright puede instalarse aparte y
// pasarse mediante NATUREMAPS_PLAYWRIGHT_URL (URL file: de index.mjs).
const { chromium } = await import(process.env.NATUREMAPS_PLAYWRIGHT_URL ?? 'playwright')
const root = fileURLToPath(new URL('../dist/', import.meta.url))
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aY9sAAAAASUVORK5CYII=', 'base64')
let imageDelay = 0
const server = createServer(async (req, res) => {
  try {
    if (req.url.startsWith('/photo.png')) {
      if (imageDelay) await new Promise((done) => setTimeout(done, imageDelay))
      res.writeHead(200, { 'content-type': 'image/png' }); res.end(png); return
    }
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname)
    const file = resolve(root, `.${pathname}`)
    if (!file.startsWith(root.endsWith(sep) ? root : `${root}${sep}`)) { res.writeHead(403); res.end(); return }
    let body
    let extension = extname(file)
    try { body = await readFile(file) } catch { body = await readFile(resolve(root, 'index.html')); extension = '.html' }
    const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff': 'font/woff', '.woff2': 'font/woff2' }
    res.writeHead(200, { 'content-type': types[extension] ?? 'application/octet-stream' }); res.end(body)
  } catch { res.writeHead(500); res.end() }
})
await new Promise((done) => server.listen(0, '127.0.0.1', done))
const origin = `http://127.0.0.1:${server.address().port}`
const packet = structuredClone(routePacket)
packet.images[0].url = `${origin}/photo.png`
packet.species[0].image = packet.images[0]
let offline = false
const browser = await chromium.launch({ channel: process.env.NATUREMAPS_BROWSER ?? 'msedge', headless: true })
try {
  const context = await browser.newContext({ viewport: { width: 402, height: 874 } })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.route('http://localhost:3000/**', async (request) => {
    if (offline) { await request.abort('internetdisconnected'); return }
    const url = new URL(request.request().url())
    let data = {}
    if (url.pathname === '/routes/7/offline') data = packet
    else if (url.pathname === '/routes/7') data = packet.route
    else if (url.pathname === '/routes') data = { total: 1, routes: [packet.route] }
    else if (url.pathname === '/species/5') data = packet.species[0]
    else if (url.pathname === '/species') data = { species: packet.species }
    else if (url.pathname === '/green-areas') data = { areas: [], sources: [] }
    await request.fulfill({ json: data })
  })
  await page.route('https://tile.openstreetmap.org/**', (request) => request.abort())
  await page.goto(`${origin}/rutas/7`)
  await page.getByRole('button', { name: 'Descargar ruta', exact: true }).waitFor()
  imageDelay = 1800
  await page.getByRole('button', { name: 'Descargar ruta', exact: true }).click()
  await page.getByRole('progressbar').waitFor()
  await page.getByRole('button', { name: 'Cancelar descarga' }).click()
  await page.getByRole('button', { name: 'Descargar ruta', exact: true }).waitFor()
  assert.equal(await page.evaluate(async () => {
    const database = await new Promise((done) => { const request = indexedDB.open('naturemaps-offline-routes', 1); request.onsuccess = () => done(request.result) })
    return new Promise((done) => { const request = database.transaction('routes').objectStore('routes').count(); request.onsuccess = () => { done(request.result); database.close() } })
  }), 0)
  imageDelay = 0
  await page.getByRole('button', { name: 'Descargar ruta', exact: true }).click()
  await page.getByText(/Disponible sin conexión/).waitFor()
  await page.evaluate(() => navigator.serviceWorker.ready)
  offline = true
  await context.setOffline(true)
  await page.reload()
  await page.getByRole('heading', { name: packet.route.name, exact: true }).waitFor()
  await page.getByText(/Disponible sin conexión/).waitFor()
  assert.ok(await page.locator('.leaflet-overlay-pane svg path').count() > 0, 'la geometría sigue dibujada sin red')
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
  await downloads.getByRole('link', { name: 'Ver ficha', exact: true }).click()
  await reopened.getByRole('button', { name: 'Eliminar descarga', exact: true }).click()
  await reopened.getByRole('button', { name: 'Descargar ruta', exact: true }).waitFor()
  await reopened.reload()
  await reopened.getByRole('alert').filter({ hasText: 'No se pudieron cargar las rutas.' }).waitFor()
  assert.deepEqual(errors, [])
  console.log('PASS: cancelación, IndexedDB real, imágenes, recarga y reapertura sin red, eliminación')
} finally {
  await browser.close()
  await new Promise((done) => server.close(done))
}
