# Servicios de mapas: problemas actuales y alternativas

Proyecto académico Nature MAPS. Revisión: 27/11/2026; frontend
`a5363fc`, rama `feat/descarga-ruta-offline`; comparación con
`main` en `7f8c01f`. Las referencias a main se fijan a ese commit.

**Estado actual:** la descarga de rutas y parques usa `tile.openstreetmap.org`.
Su §4 prohíbe esa precarga offline, también en un proyecto educativo.
Las alternativas de esta tabla son propuestas pendientes de implementar.

## Problemas, evidencia y cambios propuestos

| Punto | Comportamiento actual y problema | Cambio propuesto y servicio alternativo |
|---|---|---|
| **[§4 OSM: precarga offline](https://operations.osmfoundation.org/policies/tiles/#4-prohibited-bulk-downloading-scraping-and-offline-use)** | [src/services/offlineRouteDownload.ts:99](../src/services/offlineRouteDownload.ts#L99) llama a `planTiles(routeBounds(packet.route))`; [src/services/offlineDownload.ts:100](../src/services/offlineDownload.ts#L100) hace lo mismo para el parque. [src/services/offlineTiles.ts:111](../src/services/offlineTiles.ts#L111) enumera un rectángulo con margen en varios zooms. Ambos descargadores solicitan las teselas ausentes y las guardan para usarlas después. Incluyen zonas y escalas que el usuario no está viendo. **Es el patrón prohibido por §4.** Dos peticiones simultáneas y un máximo de 2000 teselas no constituyen una autorización. | Conservar la descarga del recorrido, las fichas y el mapa usando **[Geoapify Map Tiles](https://www.geoapify.com/map-tiles/)**, que permite almacenar y reutilizar sus teselas respetando cuotas y atribución. Cambiar el origen tanto en la descarga como en la capa Leaflet que las lee. Asociar fuente, estilo y créditos al mapa guardado, manteniendo progreso, cancelación y almacenamiento en el navegador. Coordinar por separado el cambio de la descarga de parques. |
| **[§3.2 OSM: caché HTTP](https://operations.osmfoundation.org/policies/tiles/#32-caching)** | [src/services/offlineStorage.ts:197](../src/services/offlineStorage.ts#L197) y [src/services/routeTileCache.ts:11](../src/services/routeTileCache.ts#L11) guardan el `Blob` en una `Response` nueva con solo `Content-Type`. Se pierden `Cache-Control`, `Expires` y `ETag`. La lectura por `match()` y [src/services/offlineRouteRead.ts:28](../src/services/offlineRouteRead.ts#L28) no comprueban la antigüedad, por lo que otra descarga online puede reutilizar indefinidamente esa copia. **La carencia está comprobada; no se ha medido una retención concreta inferior a siete días.** El caché HTTP del navegador también puede intervenir. | Conservar los metadatos necesarios y respetar los plazos de la fuente elegida. Si se mantiene OSM para visualización online, aplicar sus cabeceras o el mínimo de siete días cuando no puedan leerse, con revalidación al caducar. Al actualizar, conservar la descarga anterior hasta completar la nueva. Con Geoapify se aplican sus propias condiciones; no se trasladan automáticamente las restricciones del servidor OSM. Este punto requiere revisar el caché, no necesariamente contratar otro servicio. |
| **[§1 OSM: dirección de las teselas](https://operations.osmfoundation.org/policies/tiles/#1-correct-tile-url)** | [src/components/MapView/MapView.tsx:26](../src/components/MapView/MapView.tsx#L26) usa `https://{s}.tile.openstreetmap.org/...` en vez de la URL canónica sin `{s}`. No se encontraron usos activos de ese componente. El mapa de [main: src/pages/RouteDetail/RouteMap.tsx:33](https://github.com/huugok/NatureMaps-Frontend/blob/7f8c01fc85f841580e114b3182ea6c686b15eaa3/src/pages/RouteDetail/RouteMap.tsx#L33) también usa ese patrón. **En el mapa activo de esta rama ya se ha corregido** mediante la capa común. | Eliminar el componente sin uso o conectarlo a la configuración común. Para el servidor estándar OSM usar exactamente `https://tile.openstreetmap.org/{z}/{x}/{y}.png`; al adoptar Geoapify, usar su plantilla en los componentes correspondientes. No hace falta cambiar de servicio solo por este defecto de URL. |
| **[§2 OSM: autoría y licencia](https://operations.osmfoundation.org/policies/tiles/#2-attribution-and-licensing)** | El mapa de [main: src/pages/RouteDetail/RouteMap.tsx:30](https://github.com/huugok/NatureMaps-Frontend/blob/7f8c01fc85f841580e114b3182ea6c686b15eaa3/src/pages/RouteDetail/RouteMap.tsx#L30) establece `attributionControl: false`. El texto `attribution` del proveedor no se muestra por sí solo con el control desactivado. **Está corregido en esta rama:** [src/pages/RouteDetail/RouteMap.tsx:31](../src/pages/RouteDetail/RouteMap.tsx#L31) activa el control y [src/pages/Map/offlineTileLayer.ts:18](../src/pages/Map/offlineTileLayer.ts#L18) enlaza los créditos a la licencia. El mapa principal tiene además un enlace propio en [src/pages/Map/MapPage.tsx:1757](../src/pages/Map/MapPage.tsx#L1757). | Mantener créditos legibles y acceso a la licencia en las vistas de mapa. Si se adopta Geoapify, incluir la atribución exigida al plan y estilo seleccionados: Geoapify, OpenStreetMap y, cuando corresponda, OpenMapTiles. Cambiar de proveedor no sustituye este trabajo de interfaz. |
| **[Nominatim: frecuencia de búsqueda](https://operations.osmfoundation.org/policies/nominatim/#requirements)** | [src/pages/Map/MapPage.tsx:1292](../src/pages/Map/MapPage.tsx#L1292) espera un segundo mediante `lastNominatimSearchAt`, un ref local al componente. No coordina otras pestañas ni usuarios; el límite de Nominatim se aplica a toda la aplicación. **Existe riesgo de superar el límite agregado; no se ha demostrado un exceso real de tráfico.** | Como alternativa para el proyecto académico, estudiar **[Geoapify Geocoding API](https://www.geoapify.com/geocoding-api/)**. Mantener la búsqueda por botón, transformar su respuesta al formato que espera la interfaz y aplicar las cuotas y el caché de ese servicio. Si se conserva Nominatim, hace falta una cola común de peticiones y reutilizar resultados; la espera de un único navegador no resuelve el límite global. |
| **[Nominatim: cambio de proveedor](https://operations.osmfoundation.org/policies/nominatim/#websites-and-apps)** | [src/pages/Map/MapPage.tsx:1333](../src/pages/Map/MapPage.tsx#L1333) tiene la URL de Nominatim escrita directamente en el código. Sustituirla requiere cambiar y reconstruir el frontend. **No satisface el requisito de poder cambiar el servicio sin actualizar la aplicación.** | Si se conserva Nominatim, leer el proveedor desde una configuración en ejecución, con adaptadores para las fuentes previstas. `VITE_*` se incorpora al build y no basta por sí solo. Geoapify Geocoding API es una alternativa de búsqueda; reemplazar una URL fija por otra URL fija tampoco añade un mecanismo de cambio. |

## Alternativas concretas para este proyecto

**Cartografía: Geoapify Map Tiles.** Su [política de teselas abiertas](https://www.geoapify.com/map-tiles/)
permite generar, guardar y reutilizar teselas, con límites de peticiones y
atribución. Ofrece imágenes raster compatibles con Leaflet; por ejemplo:

```text
https://maps.geoapify.com/v1/tile/osm-bright-grey/{z}/{x}/{y}.png?apiKey=YOUR_API_KEY
```

El cambio debe abarcar la descarga y el dibujo: guardar imágenes de Geoapify
mientras el mapa sigue buscando claves de OSM dejaría la vista offline sin
fondo. Las rutas guardadas necesitan conservar la referencia a su fuente y
estilo. El recorrido, las paradas, las fichas y las imágenes siguen en el
almacenamiento del navegador.

**Búsqueda: Geoapify Geocoding API.** El [servicio de direcciones](https://www.geoapify.com/geocoding-api/)
puede sustituir la consulta de lugares; necesita adaptar los resultados que
consume la pantalla, además de cambiar el endpoint. Un ejemplo de URL es:

```text
https://api.geoapify.com/v1/geocode/search?text=Valencia&apiKey=YOUR_API_KEY
```

Ambos servicios requieren cuenta y clave de API. El [plan gratuito](https://www.geoapify.com/pricing/)
publica 3000 créditos diarios, sin tarjeta bancaria. Son créditos compartidos
de consumo, no 3000 mapas ni una descarga ilimitada. Deben respetarse las
cuotas y la atribución correspondiente al estilo y al plan.
Estas condiciones se han contrastado en la documentación oficial; la
integración y la prueba con una clave del proyecto quedan pendientes.

## Alcance de las propuestas

La tarea de esta rama es descargar rutas y su contenido. El cambio de la
descarga de parques debe coordinarse con su autora; las modificaciones del
buscador pueden tratarse como una tarea independiente. Corregir solo las rutas
no elimina el problema de la descarga de parques del proyecto.

No se ha encontrado autocompletado de Nominatim: la petición se envía al
confirmar el formulario. Tampoco se encontraron cabeceras de teselas que
fuercen `no-cache` o supriman expresamente el Referer. El atributo
`rel="noreferrer"` de un enlace de créditos afecta a ese enlace.
El service worker de [vite.config.ts:21](../vite.config.ts#L21) precarga archivos del build.

Los POIs de [src/pages/Map/MapPage.tsx:362](../src/pages/Map/MapPage.tsx#L362) usan Overpass, con
[condiciones propias](https://dev.overpass-api.de/overpass-doc/en/preface/commons.html).
El backend llama a [backend: src/services/valhalla.ts:18](https://github.com/huugok/NatureMaps-Backend/blob/8f79058043e468cdc41b238e27aa341758754e6d/src/services/valhalla.ts#L18) al generar el catálogo;
el [servidor demo Valhalla](https://valhalla.github.io/valhalla/start/introduction/#public-demo-server)
también tiene condiciones propias. Esos usos no se clasifican como infracción
del §4 del servidor de imágenes sin analizar sus respectivas condiciones y
su tráfico.

Las pruebas automáticas de descarga de rutas simulan la fuente de teselas.
Que pasen las pruebas funcionales no resuelve los problemas de condiciones
de servicio descritos aquí. Esta revisión no ha ejecutado una descarga masiva
contra los servicios públicos.
