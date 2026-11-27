# React + TypeScript + Vite

## Incumplimientos y riesgos en el uso de OpenStreetMap

**La descarga offline de rutas y parques incumple la sección 4 de la política
de `tile.openstreetmap.org`: precarga fragmentos del mapa (teselas) que el
usuario no está viendo para guardarlos y utilizarlos después sin conexión.**

Revisión del 27/11/2026: frontend `add2818`, rama
`feat/descarga-ruta-offline`; comparación con `main` en
`7f8c01f`. Los enlaces a código de la otra rama usan esa revisión
concreta para distinguir problemas pendientes de correcciones ya incorporadas.

### Infracciones y evidencia en el código

| Punto de la política | Código y comportamiento comprobado | Estado y cambio necesario |
|---|---|---|
| [§4: precarga para uso offline](https://operations.osmfoundation.org/policies/tiles/#4-prohibited-bulk-downloading-scraping-and-offline-use), **rutas** | [src/services/offlineRouteDownload.ts:99](src/services/offlineRouteDownload.ts#L99) calcula `planTiles(routeBounds(packet.route))`; las líneas 117–137 convierten el plan a URLs, descargan las teselas ausentes y las guardan con `cache.put()`. [src/services/offlineTiles.ts:111](src/services/offlineTiles.ts#L111) recorre el rectángulo completo en varios zooms; no usa solo el área visible de la pantalla. | **Incumplimiento confirmado.** El botón «Descargar ruta» habilita precisamente esa precarga. Cambiar la fuente por una que autorice este uso. |
| [§4](https://operations.osmfoundation.org/policies/tiles/#4-prohibited-bulk-downloading-scraping-and-offline-use), **parques y zonas** | [src/services/offlineDownload.ts:100](src/services/offlineDownload.ts#L100) ejecuta `planTiles(detail.bbox)`; las líneas 118–119 llaman a `fetchTile()` y `tiles.put()`. El fetch público está en la línea 43. Usa la misma fuente definida en [src/services/offlineTiles.ts:11](src/services/offlineTiles.ts#L11). | **Incumplimiento confirmado en la funcionalidad existente**, tanto en main como en esta rama. La descarga de rutas no modifica el código de parques, pero este problema también debe comunicarse al equipo. |
| [§3.2: gestión de caché HTTP](https://operations.osmfoundation.org/policies/tiles/#32-caching) | [src/services/offlineStorage.ts:197](src/services/offlineStorage.ts#L197) y [src/services/routeTileCache.ts:11](src/services/routeTileCache.ts#L11) guardan un `Blob` en una `Response` nueva con solo `Content-Type`. Pierden `Cache-Control`, `Expires` y `ETag`; la lectura por `match()` no comprueba antigüedad. [src/services/offlineRouteRead.ts:28](src/services/offlineRouteRead.ts#L28) puede reutilizar esa copia en una nueva descarga online sin revalidarla. | **Carencia comprobada; incumplimiento temporal no medido.** La capa no implementa la caducidad/revalidación de la fuente. Deben conservarse metadatos y respetarse sus plazos, o aplicarse el mínimo de siete días cuando no puedan leerse. No se ha demostrado una retención concreta inferior a siete días; el caché HTTP del navegador también puede intervenir. |
| [§1: URL canónica](https://operations.osmfoundation.org/policies/tiles/#1-correct-tile-url) | [src/components/MapView/MapView.tsx:26](src/components/MapView/MapView.tsx#L26) aún configura `https://{s}.tile.openstreetmap.org/...` en vez de `https://tile.openstreetmap.org/...`. No se encontraron usos activos de ese componente. [main: src/pages/RouteDetail/RouteMap.tsx:33](https://github.com/huugok/NatureMaps-Frontend/blob/7f8c01fc85f841580e114b3182ea6c686b15eaa3/src/pages/RouteDetail/RouteMap.tsx#L33) también usa `{s}` y sí pertenece a la ficha de ruta de main. | **Configuración no conforme en código heredado; uso activo en la ficha de main.** En esta rama, `RouteMap` ya usa la capa común y la URL canónica. Corregir también `MapView` antes de volver a utilizarlo. |
| [§2: atribución visible](https://operations.osmfoundation.org/policies/tiles/#2-attribution-and-licensing) y [guía de atribución](https://osmfoundation.org/wiki/Licence/Attribution_Guidelines#Interactive_maps) | [main: src/pages/RouteDetail/RouteMap.tsx:30](https://github.com/huugok/NatureMaps-Frontend/blob/7f8c01fc85f841580e114b3182ea6c686b15eaa3/src/pages/RouteDetail/RouteMap.tsx#L30) desactiva `attributionControl`: declarar un texto `attribution` en la capa no lo muestra por sí solo. En esta rama, [src/pages/RouteDetail/RouteMap.tsx:31](src/pages/RouteDetail/RouteMap.tsx#L31) activa el control y [src/pages/Map/offlineTileLayer.ts:18](src/pages/Map/offlineTileLayer.ts#L18) enlaza los créditos a la licencia. El mapa principal también conserva su enlace en [src/pages/Map/MapPage.tsx:1757](src/pages/Map/MapPage.tsx#L1757). | **Problema comprobado en la ficha de main, corregido en esta rama.** No se atribuye esta falta al mapa principal, que tiene créditos propios. Mantener la atribución visible y el acceso a la licencia. |

El límite de dos peticiones simultáneas y el máximo de 2000 teselas son límites
de la aplicación, no una autorización del proveedor. Añadir créditos o corregir
el caché tampoco autoriza la precarga prohibida por §4. La infracción se produce
al solicitar por adelantado las teselas; guardarlas en Cache API, IndexedDB u
otro soporte no cambia ese patrón.

### Búsqueda de lugares: Nominatim tiene otra política

La búsqueda de [src/pages/Map/MapPage.tsx:1279](src/pages/Map/MapPage.tsx#L1279) usa el servicio
`nominatim.openstreetmap.org`, no el servidor de imágenes del mapa:

- **Límite global:** [Requirements y Websites and Apps](https://operations.osmfoundation.org/policies/nominatim/#requirements)
  establecen un máximo de una petición por segundo para el conjunto de la
  aplicación. Las líneas 1292–1295 esperan un segundo mediante
  `lastNominatimSearchAt`, un ref local al componente. No coordinan otras
  pestañas ni otros usuarios. **Existe un riesgo de superar el límite agregado;
  esta revisión no demuestra que ya se haya superado.**
- **Cambio de proveedor sin actualizar la app:** [Websites and Apps](https://operations.osmfoundation.org/policies/nominatim/#websites-and-apps)
  exige esa capacidad. La URL está escrita directamente en
  [src/pages/Map/MapPage.tsx:1333](src/pages/Map/MapPage.tsx#L1333), sin configuración en ejecución.
  **La implementación no satisface ese requisito**: sustituir el endpoint exige
  cambiar y volver a distribuir el frontend.
- **Autocompletado:** la petición se ejecuta al enviar el formulario, no con
  cada tecla. No se ha encontrado el uso prohibido de autocompletado.

### Comprobaciones que no deben confundirse con infracciones

- En las solicitudes de teselas revisadas no se encontraron cabeceras
  `Cache-Control: no-cache`/`Pragma: no-cache` ni una política de fetch que
  suprima expresamente el Referer. `rel="noreferrer"` en un enlace de créditos
  afecta a la navegación por ese enlace, no a la descarga de imágenes.
- El service worker de [vite.config.ts:21](vite.config.ts#L21) precarga archivos del
  build. La instalación del worker no recorre ni descarga teselas OSM.
- Los POIs de [src/pages/Map/MapPage.tsx:362](src/pages/Map/MapPage.tsx#L362) se consultan en Overpass
  y tienen un caché temporal. Sus [condiciones de recursos compartidos](https://dev.overpass-api.de/overpass-doc/en/preface/commons.html)
  son independientes: no se clasifican como infracción del §4 de teselas.
- El backend usa [src/services/valhalla.ts:18](https://github.com/huugok/NatureMaps-Backend/blob/2e370016cd985620b4e6f75414e738e5f8945d8d/src/services/valhalla.ts#L18) al generar el
  catálogo con [src/db/seedRoutes.ts:87](https://github.com/huugok/NatureMaps-Backend/blob/2e370016cd985620b4e6f75414e738e5f8945d8d/src/db/seedRoutes.ts#L87); los GET leen después
  la geometría guardada. El [servidor demo Valhalla](https://valhalla.github.io/valhalla/start/introduction/#public-demo-server)
  tiene condiciones propias. Sin medir su tráfico no se afirma un exceso de
  uso; no descarga los PNG de `tile.openstreetmap.org`.

Esta revisión documenta el estado del código; no ha ejecutado una descarga
masiva contra los servicios públicos. Las pruebas automáticas de la descarga
de rutas simulan la fuente de teselas. Los incumplimientos y riesgos anteriores
no se consideran resueltos porque las pruebas funcionales pasen.

## Descarga de rutas sin conexión

El botón «Descargar ruta» guarda geometría, paradas, fichas de plantas y POIs,
imágenes y el mapa del entorno. Conserva también el nombre comercial y la
ubicación básica de las paradas patrocinadas. Incluye progreso por fases, cancelación,
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
