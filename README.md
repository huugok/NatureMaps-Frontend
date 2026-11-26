# React + TypeScript + Vite

## Descarga de rutas sin conexión

El botón «Descargar ruta» guarda geometría, paradas, fichas de plantas y POIs,
imágenes y el mapa del entorno. Incluye progreso por fases, cancelación,
comprobación del espacio disponible, actualización y eliminación.

- `offlineRouteDownload.ts` obtiene el paquete del backend y descarga imágenes
  y teselas. Usa el planificador de las zonas: rectángulo con margen del 10 %,
  zoom 13–17 y un máximo de 2000 teselas. Si no cabe, reduce el zoom máximo hasta
  15; si sigue siendo demasiado grande, rechaza la descarga. Pide hasta dos
  teselas a la vez.
- `offlineRouteStorage.ts` guarda datos y fotografías en IndexedDB
  (`naturemaps-offline-routes`, almacén `routes`). `routeTileCache.ts` conserva
  las teselas con Cache API en `naturemaps-route-tiles-v1-*`.
- La ruta solo se confirma al terminar. Si falla o se cancela, se retira la
  caché temporal. Actualizar mantiene la versión anterior hasta confirmar la
  nueva; eliminar una ruta no borra parques ni otras rutas guardadas.
- La ficha y el mapa principal leen primero las teselas guardadas. Fuera del
  área descargada no hay mapa offline. Los niveles guardados permiten ampliar
  el mapa sin añadir detalle que no se haya descargado.
- El service worker del build conserva la aplicación para recargar o reabrir
  sin red. Los textos y las imágenes mantienen idioma, procedencia y créditos.

### Incumplimiento de la política de teselas de OSM

La fuente es `https://tile.openstreetmap.org/{z}/{x}/{y}.png`.
La sección 4, «Prohibited: bulk downloading (“scraping”) and offline use», de la
[política oficial](https://operations.osmfoundation.org/policies/tiles/#4-prohibited-bulk-downloading-scraping-and-offline-use)
prohíbe descargar por adelantado teselas que el usuario no está viendo para
usarlas offline. `planTiles()` enumera el rectángulo completo en varios niveles
de zoom y `downloadRoute()` solicita y guarda esas teselas al pulsar «Descargar
ruta». Por ello esta función incumple la sección 4. La descarga de parques
existente sigue ese mismo patrón. Dos peticiones simultáneas no constituyen
una excepción; mostrar la atribución tampoco autoriza la precarga.

Para un uso conforme es necesario sustituir la fuente por un proveedor que
permita expresamente la descarga offline. La visualización online del área
visible y este mecanismo de precarga son usos distintos según la política.

### Comprobación local

Con el backend iniciado, ejecuta:

```powershell
npm.cmd run build
npm.cmd run preview -- --host localhost --port 4174 --strictPort
```

Abre una ruta con conexión, descárgala y espera «Disponible sin conexión».
En DevTools → Network selecciona Offline y recarga. Comprueba mapa, recorrido,
paradas, fichas e imagen. Vuelve a activar la red, cancela una actualización y
comprueba que se conserva la descarga anterior. Elimina la descarga y verifica
su retirada de IndexedDB y Cache Storage.

`npm.cmd test -- --maxWorkers=2` ejecuta las suites. Después del build,
`npm.cmd run test:offline-browser` comprueba recarga offline, cancelación,
actualización del almacenamiento, fichas, imágenes, reapertura y eliminación,
incluida la conservación del caché de parques. Simula el proveedor y la API,
sin descargar teselas públicas. Requiere Playwright y Edge o Chrome;
`NATUREMAPS_PLAYWRIGHT_URL` permite usar una instalación externa de Playwright.

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
