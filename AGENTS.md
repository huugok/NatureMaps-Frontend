# AGENTS.md — NatureMaps-Frontend

Guía para agentes (y personas) que trabajen en este repositorio. Mantenerla actualizada cuando
cambien los comandos, la estructura o las convenciones.

> Última verificación: 2026-11-12 · rama `feat/rutas-catalogo` (desde `main` @ `0f8b6ef`).
> Pestaña `/rutas` conectada al catálogo de rutas del backend y ficha `/rutas/:id` con el
> recorrido en Leaflet (UT de rutas predefinidas).
> `main` trae además flora y zonas verdes (NM-08): capa de parques, fichas de zona y artículos.

## Qué es este proyecto

**Nature MAPS** es una guía botánica turística multilingüe centrada en Valencia (mapa de árboles y
especies, identificación por foto, rutas botánicas, contexto cultural). Este repositorio es el
**frontend**: SPA con React 19 + TypeScript + Tailwind 4 sobre Vite.

- Frontend (este repo): `github.com/huugok/NatureMaps-Frontend`
- Backend (repo hermano, misma carpeta padre): `github.com/huugok/NatureMaps-Backend`,
  API Express en `http://localhost:3000` con CORS abierto.
- Documentación de producto: `../docs/` (requisitos, DAFO, competidores, proyección).
- Convenciones para agentes: `docs/agents/` (`issue-tracker.md`, `domain.md`)

No hay monorepo ni workspace: cada repo se instala y ejecuta por separado con `npm`.

## Estado de ramas (leer antes de empezar)

`main` contiene el scaffold (Vite + React + Tailwind + Oxlint) y el CI, además de:

- la navegación inferior de F16 (PR #1, `src/components/BottomNavigation/` con tests y Vitest);
- la pantalla de ficha de planta de RF3 (PR #8, `src/pages/FichaPlanta/`);
- el envío de foto al backend para identificar con Pl@ntNet, UT F04 (PR #9,
  `src/pages/Scan/`, `src/services/identify.ts` y `src/types/identify.ts`);
- el contenido de las 6 especies de la demo, UT 918 - F06 (PR #14,
  `src/pages/FichaPlanta/constants.ts` y `docs/contenido-especies-demo.md`).

El resto de pantallas (mapa, rutas, búsqueda…) llegan con sus propias UTs.

**Rama de conciliación** (`feat/concilacion-ui`, worktree `wt-concilacion-ui`): integra las
pantallas de #11, la ficha de #21, el escáner real, la traducción es/va/en, el mapa interactivo
(#22), la respuesta sin conexión (#20), la confianza en ficha/alternativas (#23), la tipografía
“Guía para todos” y la paleta “Verde dehesa”. Las PRs #11, #20, #22 y #23 ya son ancestros de
la rama; #12 (traducción) y #19 (ficha desde alternativa) están superadas y no se pueden
mergear sin rehacerlas. **Todo va en una sola PR.** No se ha hecho push.

Pantallas actuales: `/inicio`, `/mapa` (`MapPage`), `/rutas`, `/buscar`, `/escanear`
(`CameraScreen`), `/modo`, `/ajustes`, `/ajustes/idioma`, `/ficha` (`FichaRoute`) y
`/componentes`; laboratorios internos `/tipografia` y `/color`. `ScanPage` y su carpeta
`src/pages/Scan/` se eliminaron: el escaneo es `CameraScreen` directo y la ficha se abre como
overlay sobre él o en `/ficha`.

`/escanear` es una pestaña de `TabLayout`: la cámara ocupa el área sobre `BottomNavigation`,
que conserva su fila de 62 px y añade el safe-area inferior debajo. Los controles de cámara no
deben volver a sumar el inset inferior, porque ya quedan por encima de la barra.

Ramas con PR abierta (a 3/11/2026): #12 (`feat/traduccion-pantallas`, superada), #19
(`feat/ficha-desde-alternativa`, superada) y la PR de backend #12 (`feat/arbolado-licencia`,
fuera de este repo). #11, #20, #22 y #23 se pueden cerrar cuando entre la PR nueva.

La ficha está **conectada al backend** (UT F06): `src/services/ficha.ts` consume `GET /species`
(lista para la navegación Anterior/Siguiente) y `GET /species/:id` (ficha completa con
ubicaciones paginadas), y mapea la respuesta al modelo de vista `EspecieFicha` que pinta
`FichaPlantaPage` (pantalla presentacional: recibe `species` por props, no carga nada). App
gestiona los estados de lista y detalle (loading/error/ready, con Reintentar) y vuelve a pedir
los datos si cambia el idioma. **No hay fallback a `constants.ts`**: si la API falla, la ficha
muestra el error; la UT de sin-conexión decidirá el modo offline. Los textos curados ya viven
en la base de datos (tabla `species_profiles` del backend, sembrada con `npm run db:seed`,
idempotente); `constants.ts` conserva solo `IDENTIFICATION_NOTICE` y los datos de ejemplo
quedan sin usar de reserva para esa UT, con su trazabilidad en
`docs/contenido-especies-demo.md`. La ficha se abre desde el escaneo como overlay (conserva
foto, resultado y especie marcada) o en la ruta `/ficha` con navegación Anterior/Siguiente.

Cuando Pl@ntNet identifica una foto, App busca el nombre científico del resultado en el
catálogo ya cargado (match client-side, `findSpeciesIndexByScientificName`, inmune a
mayúsculas y a la notación de híbrido `×`): si hay ficha, «Ver ficha» abre la especie real; si
no, se construye una ficha honesta con `fichaDesdeIdentificacion`. Tocar una alternativa abre
su ficha y la deja marcada.

El resultado de la identificación ofrece también «Usar esta foto en la ficha» (PA 2941):
guarda la captura como imagen de la especie con `src/services/speciesPhoto.ts` (único escritor
de `naturemaps.speciesPhotos`) y abre su ficha con esa cabecera. La foto se queda en el
dispositivo —el backend todavía no acepta fotos de usuario— y App la aplica al construir
cualquier ficha (escaneo, mapa o `/ficha`), por encima de la imagen del catálogo y de sus
créditos. Se conservan las 6 capturas más recientes; si localStorage la rechaza (modo privado,
cuota llena), la ficha se abre igualmente con la foto, pero no persiste.

Ajustes (`src/pages/Settings/`) permite elegir idioma (es/va/en) y guarda la preferencia en
`localStorage` con `languagePreference`; la UI está traducida con `t()` y los diccionarios de
`src/i18n/strings.ts`. El frontend consume el backend para la identificación por foto
(`src/services/identify.ts` → `POST /plants/identify`) y para la ficha
(`src/services/ficha.ts` → `GET /species` y `GET /species/:id`).

## Flora y zonas verdes (NM-08)

Rama `feat/contenido-flora-zonas-verdes` (PA 3011, 3012 y 3013). Necesita el backend de la
misma rama (migración `0004`, `npm run import:zonas-verdes` y `npm run db:seed:editorial`).

- **Capa de zonas verdes del mapa** (`src/pages/Map/greenAreasLayer.ts`): apagada por defecto,
  se enciende con el botón del árbol o con `/mapa?zona=<grupo>`, que además resalta ese parque
  y encuadra el mapa. Solo contorno, sin relleno opaco, en un pane propio por debajo de los
  marcadores. Por zoom: punto (< 14), contorno (≥ 14), contorno y nombre (≥ 16). Los estilos
  están en `src/index.css` (`.green-area-*`). La capa se pide una vez por sesión
  (`fetchGreenAreas`, `GET /green-areas`).
- **Agrupación por parque** (`src/pages/Map/parkClusters.ts`): por debajo del zoom 17, las
  plantas que caen dentro de una zona verde se sustituyen por un marcador del parque con su
  nombre y el total de ejemplares del inventario (en Viveros o el Turia son cientos y tapaban
  el mapa). Al tocarlo se abre `/zona/:grupo`. Las de calle y las de una zona que no está en la
  capa se siguen pintando una a una. El umbral es 17 y no 16 porque el mapa centra al usuario
  con zoom 16. Para esto, `GET /trees` y `/trees/nearby` traen `greenAreaId` y la capa
  `plants`; las zonas se piden al abrir el mapa aunque la capa esté apagada.
- **`/zona/:grupo`** (`src/pages/GreenArea/`): ficha de zona con superficie, flora más
  frecuente, POIs de dentro, artículos y fuente con licencia.
- **`/descubre`** y **`/descubre/:slug`** (`src/pages/Discover/`): contenido editorial por
  secciones (flora, parques, jardines, paisajismo). `?tema=` abre una sección y `?zona=` deja
  los artículos de una zona. Se entra desde Inicio.
- **Ficha de planta**: sección «Zonas verdes donde encontrarla» (`greenAreas` de
  `GET /species/:id`) y acceso al artículo de flora. Si la ficha es un overlay, App la aparta
  (`awayKey`) en lugar de cerrarla: al volver atrás reaparece.
- **`GreenAreaContext`** (`src/components/GreenAreaContext/`): bloque «Entorno verde» para
  cualquier ficha con coordenadas; resuelve la zona con `GET /green-areas/at`. **Pendiente de
  colocar en la ficha de POI** cuando la UT de NM-06 traiga esa ficha a `main`
  (`<GreenAreaContext latitude={poi.latitude} longitude={poi.longitude} />`).
- Los artículos están redactados en castellano, valenciano e inglés. Si algún día falta una
  traducción, la pantalla sirve el español y lo avisa (`isFallbackLanguage`). Los nombres comunes
  de las especies vienen del inventario municipal, que solo los publica en castellano y valenciano.
- `useRemote` (`src/hooks/`) y `RemoteLoading`/`RemoteError` (`src/components/RemoteStatus.tsx`)
  dan los estados cargando/error/reintentar de estas pantallas.

## Zonas sin conexión (descarga offline)

Rama `feat/descarga-zona-offline`. Permite descargar una zona verde (parque o jardín) para
consultarla sin conexión: ficha, plantas y mapa. Necesita el endpoint del backend
`GET /green-areas/group/:slug/plants` (misma rama del backend). La gestión global de descargas
(listar, borrar todas, actualizar) es NM-17 y **no** está aquí.

- **Dónde se descarga**: `OfflineZoneCard` (`src/components/OfflineZone/`) en la ficha de la zona
  (`/zona/:grupo`) y flotando sobre el mapa cuando hay una zona resaltada (`/mapa?zona=<grupo>`).
  Muestra el peso estimado, la barra de progreso (con cancelar), el estado «disponible sin
  conexión» y el borrado. El estado vive en `useOfflineZone` (`src/hooks/`). Sobre el mapa la
  tarjeta (`floating`) se puede cerrar y desaparece al terminar: en su lugar `OfflineSavedToast`
  avisa 20 s («Parque descargado… Verlo en Rutas») para dejar el mapa limpio.
- **Dónde se gestionan**: `DownloadedZones` en la pantalla Rutas (`/rutas`) lista las zonas
  descargadas (nombre, peso, fecha), con enlaces al mapa y a la ficha y el borrado. Es la lista
  mínima: espacio total, actualizar y borrar todas son NM-17.
- **Capa de parques del mapa**: el botón se llama «Mostrar/Ocultar parques» (no «zonas verdes»,
  que se confundía con las plantas). Al apagar la capa se recuerda el parque resaltado y al
  encenderla vuelve a resaltarse.
- **Almacenamiento** (`src/services/offlineStorage.ts`, único sitio que toca IndexedDB y la Cache
  API): IndexedDB `naturemaps-offline` (almacén `zones`, una entrada por `groupSlug` con la ficha,
  las plantas y los textos en el idioma en que se descargó) y Cache API `naturemaps-tiles-v1`
  (teselas de OSM). Sin soporte (modo privado, navegadores antiguos) la tarjeta lo dice y las
  lecturas devuelven vacío. En tests se sustituye con `setOfflineStorage({ store, tiles })`
  usando `createMemoryStore()` y `createMemoryTileCache()`; no hay dependencias nuevas.
- **Descarga** (`offlineDownload.ts`): ficha → plantas paginadas (500 por página) → teselas del
  rectángulo de la zona con un 10 % de margen, zoom 13–17 (si no cabe en 2000 teselas baja el
  zoom máximo hasta 15; por debajo, la zona se rechaza). Solo 2 teselas a la vez para no saturar
  OSM. La zona se guarda **al final**: si se cancela o falla, se retiran las teselas descargadas
  y no queda nada a medias. Se comprueba el espacio libre (`navigator.storage.estimate`).
- **Teselas** (`offlineTiles.ts`): la URL de tesela es `https://tile.openstreetmap.org/{z}/{x}/{y}.png`
  **sin subdominios** (`{s}`), porque es la clave de la caché; no volver a poner `{s}` en
  `MapPage`. `src/pages/Map/offlineTileLayer.ts` mira primero la caché y luego la red.
- **Lectura sin conexión** (`offlineRead.ts`): `fetchGreenAreaDetail`, `fetchGreenAreas` y
  `fetchNearbyTrees` piden al backend y, **solo si falla la red o el servidor da 5xx** (no un 404),
  sirven lo descargado. Sin zonas descargadas conservan su error de siempre.
- **Límites conocidos**: la app en sí (JS/HTML) no se guarda: sin service worker, abrirla en frío
  sin red depende de la caché HTTP del navegador. Los POIs del mapa (Overpass/Nominatim) y las
  fichas de especie no se guardan; los textos quedan en el idioma de la descarga.

## Stack

- Vite 8 + `@vitejs/plugin-react`, React 19, TypeScript ~6.0 (build con `tsc -b`).
- Tailwind CSS 4 mediante el plugin `@tailwindcss/vite`; se importa en `src/index.css`
  (`@import "tailwindcss";`). No hay `tailwind.config.js` (configuración CSS-first).
- Oxlint (`.oxlintrc.json`, plugins react/typescript/oxc).
- `lucide-react` para iconos; Vitest 5 + Testing Library (`jsdom`) para tests.

## Comandos

```bash
npm install
npm run dev       # servidor Vite con HMR
npm run build     # tsc -b && vite build
npm run lint      # oxlint
npm run preview   # sirve dist/
npm test          # vitest run
```

No hay Prettier ni ESLint. `npm run build` es la verificación de tipos (no hay script `typecheck`
aparte); falla si quedan variables/imports sin usar.

## Estructura

```
index.html
src/main.tsx          Bootstrap: createRoot + <StrictMode>
src/App.tsx           Shell de la app
src/index.css         @import "tailwindcss"
src/components/       Componentes (una carpeta por componente)
src/pages/            Vistas por ruta (Home, Map, RoutesList, Search, FichaPlanta,
                      Camera dentro de components/, Settings, ModeSelect, Components)
src/services/         Cliente HTTP / integración con el backend (identificación, preferencia de
                      idioma, foto propia de la especie en localStorage)
src/types/            Tipos compartidos (navigation.ts, language.ts)
src/utils/            Utilidades sin estado (cn.ts, speciesName.ts)
public/               Assets estáticos (favicon, icons.svg)
docs/agents/          Convenciones para agentes (issue tracker, domain docs)
```

Patrón del componente existente (`src/components/BottomNavigation/`), a replicar en componentes
nuevos:

```
BottomNavigation/
  BottomNavigation.tsx        componente + interfaz de props exportada
  BottomNavigation.test.tsx   tests colocados junto al componente
  constants.ts                datos por defecto (pestañas, configuración)
  icons.tsx                   iconos SVG propios
  index.ts                    barrel: reexporta componente, tipos y constantes
```

## Convenciones

- **Componentes funcionales** con `export const X: React.FC<Props>` o función + `export default`;
  props como `interface` exportada (`BottomNavigationProps`) y documentadas.
- **Barrel `index.ts`** por componente; los imports desde fuera usan la carpeta
  (`from './components/BottomNavigation'`), no el fichero interno.
- **Tipos compartidos** en `src/types/` (`navigation.ts`: `TabId`/`TabConfig`; `language.ts`:
  `Language` y nombres de idioma). Reutilizar uniones de literales en vez de `enum`
  (`erasableSyntaxOnly` lo prohíbe). No añadir tipos de entidades que el modelo de dominio todavía
  no define.
- **Tailwind inline**, sin archivos CSS por componente. La paleta es **Verde dehesa** y no
  cambia por modo; no introducir colores nuevos a mano. Mobile-first.
- **Accesibilidad no negociable**: `role="tablist"`/`role="tab"`, `aria-selected`, `aria-label` en
  cada pestaña, roving `tabIndex`, navegación con flechas/Home/End, `focus-visible:ring`, área táctil
  mínima de 48px y `pb-[env(safe-area-inset-bottom,0px)]` para el notch.
- **Idioma de UI traducido a es/va/en**; identificadores y código en inglés. El idioma vive en
  `AppContext` y se persiste siempre con `services/languagePreference.ts`.
- Estilo: sin Prettier configurado; el scaffold usa comillas simples y sin punto y coma, la rama de
  feature usa punto y coma. Seguir el fichero que se toca y no reformatear código ajeno.

## Layout y tamaño de pantalla

- Todas las pantallas viven dentro de `.app-frame` (`src/App.tsx` + `src/index.css`).
- `/escanear` vive en `TabLayout`, como las otras pestañas: la cámara ocupa solo el área sobre
  el selector inferior; el botón Cerrar vuelve a Inicio y el selector permite cambiar de vista.
- Marco de tamaño **constante**: **402×874** (iPhone 17/18, 6,3"). No escala con la altura de la
  ventana: si no cabe, la página hace scroll. En móvil ocupa `100vw × 100dvh`.
- Los componentes usan px/rem con raíz fija de 16 px. No usar `vw`/`vh` para tipografía ni
  tamaños de componente; el zoom del navegador escala todo por igual, sin recomponer el layout.
- Los inputs van a 16 px para evitar el zoom automático de iOS.
- Solo `.app-frame` puede usar `dvh`. Las pantallas usan `h-full`/`min-h-full`; nunca `h-dvh`,
  `100dvh` ni `min-h-screen`.
- Prohibido `position: fixed` dentro de la app: cámara, resultado, ficha y overlays usan
  `absolute` sobre `.app-frame`.
- Los contenedores de pantalla van a `w-full`; no añadir `max-w-*` a nivel de pantalla. Los
  `max-w-*` solo valen para tarjetas o modales internos.
- Padding horizontal de pantalla: **16 px** (`px-4`), preferiblemente a través de `Page`.
- `--app-top-inset` vale **8 px** en escritorio y **0** en móvil; se aplica en las cabeceras,
  no en el contenedor, para que cámara y ficha lleguen al borde del marco.
- La paleta es **Verde dehesa** y no cambia por modo. Los radios siguen pendientes de unificar.

## Tipografía

Dirección **“Guía para todos”**: Literata para titulares y lectura, Atkinson Hyperlegible para
la interfaz. Las fuentes se autoalojan con `@fontsource` (`main.tsx`), no se cargan desde un CDN
en producto. El laboratorio `/tipografia` conserva las demás direcciones para comparar.

- Tokens en `@theme`:
  - `--font-sans`: `Atkinson Hyperlegible` (controles, labels, navegación, cifras).
  - `--font-display`: `Literata Variable` (titulares).
  - `--font-body`: `Literata Variable` (prosa de ficha y curiosidades).
  - `text-title` 27/1.15/600/tracking 0; `text-heading` 19/1.3/600/tracking 0;
    `text-body` 16.5/1.6; `text-small` 14/1.45; `text-caption` 12.5/1.2/700.
- Los titulares llevan `font-display`; la prosa larga, `font-body`. La interfaz hereda
  `--font-sans` del `body`; no hace falta clase.
- `font-synthesis: none` y `font-optical-sizing: auto` en `body`.
- Los títulos usan `text-balance`; los párrafos, `text-pretty`.
- Las etiquetas en mayúsculas usan `text-caption uppercase tracking-wider`.
- Los números (porcentajes, posiciones, recuentos) usan `tabular-nums`.
- Los nombres científicos en prosa van en `<em>` (Literata tiene cursiva real).
- No usar `text-sm`, `text-xs`, `text-base`, `text-lg` ni `text-2xl` en pantallas; excepción:
  el `<input>` va a 16 px para evitar el zoom de iOS.
- Bordes con `border-line` (negro al 8 %), no hex sólidos.

## Color

Paleta **Verde dehesa**, en OKLCH. Tokens en `@theme` (`src/index.css`):

- Marca: `accent` (verde dehesa), `accent-2` (verde claro), `accent-soft` (salvia pálida),
  `on-accent` (blanco), `warm` (ocre), `warm-strong` (ocre profundo), `night` (verde noche).
- Texto: `ink`, `ink-2`, `muted`, `muted-2`.
- Superficies: `app` (papel cálido), `surface` (blanco), `surface-2` (papel secundario),
  `canvas` (fondo del marco en escritorio), `line`, `line-strong`.
- Semánticos: `danger` para errores.
- Mapa: `location` (azul funcional) y `place` (ocre de la paleta).

Reglas:

- Nada de `neutral-*`, `bg-white`, `text-white`, `amber-*`, `pink-*` ni `rose-*` en pantallas:
  usar los tokens anteriores. `text-white` solo se admite sobre cámara/foto oscura.
- Los estados de floración y curiosidad usan `warm`/`warm-strong`; los errores, `danger`.
- No introducir hex en JSX; los valores nuevos van en OKLCH en `@theme`.
- Security/contraste: AA 4.5:1 para texto normal. El laboratorio `/color` conserva las
  alternativas y sus ratios.

## Superficies

- Sin gradientes decorativos. Solo se admiten scrims funcionales sobre cámara o foto para que
  el texto sea legible.
- Sin `backdrop-blur` ni glassmorphism: fondos sólidos con opacidad.
- Tarjetas y paneles usan `shadow-raised`; diálogos, `shadow-float`. Nada de sombras pesadas sueltas.
- Colores siempre con tokens (`accent`, `warm`, `night`, `line`, `surface-2`); nada de hex en
  JSX salvo el canvas de la cámara.
- Las fotos llevan un outline interior de 1 px negro al 10 %.

## Móvil

- `viewport` con `viewport-fit=cover` e `interactive-widget=resizes-content`; `theme-color`
  a juego con el fondo de la app.
- Safe areas con `env(safe-area-inset-*)` en `Page`, barra inferior, ficha y overlays fullscreen.
  `BottomNavigation` añade el inset debajo de su fila de 62px. La cámara-tab queda encima de
  esa barra: sus controles usan un padding fijo, sin sumar otra vez el inset inferior.
- Área táctil mínima de 44 px: `IconButton` es `size-11`; la barra inferior, 48 px.
- Inputs a 16 px; `touch-action: manipulation`; sin tap highlight; `user-select: none` solo en
  controles.
- `overscroll-behavior: contain` en los scrolls internos y `none` en el body.
- Hover solo con el variante `hover:` de Tailwind (ya va bajo `@media (hover: hover)`).
- Respetar `prefers-reduced-motion`.

## Tests

- Vitest + Testing Library con `environment: 'jsdom'` y `globals: true`, configurado en
  `vite.config.ts`, con tipos `@testing-library/jest-dom/vitest` en `tsconfig.app.json`.
- Tests colocados: `Componente.test.tsx` junto al componente. Consultas por rol/aria
  (`getByRole('tab', { name: /ver mapa/i })`), no por clase CSS.
- Al añadir componentes interactivos, añadir tests de render, estado activo, callback y teclado.
- Los tests que lean o escriban la preferencia de idioma deben limpiar `localStorage`.

## Integración con el backend

- Backend en `http://localhost:3000` (CORS abierto, sin auth todavía).
- Endpoints disponibles: `GET /health`, `GET /trees`, `GET /trees/nearby`, `GET /trees/:id`,
  `POST /trees/import`, `GET /species`, `POST /species/enrich`, `GET /pois/nearby`,
  `GET /pois/:id`, `GET /routes` y `GET /routes/:id`.
- Las llamadas HTTP deben ir en `src/services/`, no dentro de componentes.
- La identificación por foto (`src/services/identify.ts`) consume `POST /plants/identify` con la
  base URL `VITE_API_URL` (por defecto `http://localhost:3000`).
- La ficha (`src/services/ficha.ts`) consume `GET /species` y `GET /species/:id` con la misma
  base URL. El contenido editorial (descripciones, curiosidades, fuentes) lo sirve el backend.
- La foto que guarda el usuario en una ficha (PA 2941) **no** se envía al backend: vive en
  `localStorage` (`naturemaps.speciesPhotos`) mediante `src/services/speciesPhoto.ts`, que es su
  único escritor. No leer esa clave desde componentes.
- El mapa (`src/pages/Map/MapPage.tsx`) llama a servicios externos (teselas de OpenStreetMap y
  búsqueda en Nominatim) y al backend: `src/services/nearby.ts` consume `GET /trees/nearby`  (plantas cercanas, distancia en metros) para los marcadores del mapa y «Cerca de ti» en
  Buscar. El permiso de ubicación sigue el patrón de la cámara
  (`src/components/Location/`, aviso propio antes del nativo, con reintento si se deniega);
  el radio (100–10000 m) se guarda en `naturemaps:radius` y se configura en Ajustes
  (el modo aventura usa un radio fijo de 1000 m). Las plantas cercanas del mismo
  tipo encadenadas por proximidad se agrupan en un marcador con recuento
  (`src/pages/Map/plantGroups.ts`): al pulsarlo se pinta el círculo que cubre a
  sus miembros. Tocar cualquier marcador de planta abre su ficha (F03.1) como
  overlay de App: el mapa sigue montado debajo y al volver conserva centro y
  zoom (PA 691); la ficha se resuelve por `speciesId` o, si el inventario no
  enlaza la especie, por el nombre científico reportado. Sin posición, el mapa
  pinta las plantas globales de
  `src/services/plants.ts` (UT 908). El círculo azul sobre el usuario muestra el
  área de búsqueda (radio efectivo del modo), no la precisión del GPS.
- Rutas predefinidas (`src/services/routes.ts`): `GET /routes` (listado ligero)
  y `GET /routes/:id` (ficha con paradas y `path`). El listado (`/rutas`,
  `RoutesList`) pinta una tarjeta por ruta con nombre, **tema y forma**
  (botánica/cultural/mixta y circular/lineal: con las dos se distinguen todas
  las del catálogo), longitud, duración y nº de paradas; sin filtros. Guarda la
  posición del scroll y la restaura al volver, para que el listado se lea como
  un scroll continuo. La ficha
  (`/rutas/:id`, `RouteDetail` + `RouteMap`) pinta el recorrido como polilínea
  con el punto de partida y las paradas: las de planta usan el mismo pin de hoja
  del mapa y se pulsan para abrir la ficha de la planta; las de POI son un punto
  de la paleta con su nombre en el `title`, **sin ficha todavía** (ver abajo).
  La ficha repite los datos principales del listado e incluye los botones
  «Iniciar ruta» y «Descargar ruta» como marcadores de posición (la UT del
  guía de recorrido y la descarga llegan más adelante).
  El botón «Iniciar ruta» de la ficha lleva a `/mapa?verRuta=<id>`: el
  mapa principal pinta la ruta (`src/pages/Map/routeOverlay.ts`, el mismo
  dibujado que la ficha) y muestra un botón de solo icono «Limpiar mapa»
  (`map.clearMap`) que quita la capa. El frontend nunca llama a Valhalla: la
  geometría ya viene guardada en BD. El error de `apiGet` lleva `status` para
  distinguir 404 («no existe») de fallo de red («reintenta»).
  - **Ficha de POI (pendiente, UT posterior)**: las paradas de POI ya viajan
    con `id`, nombre y coordenadas, y el dibujado (`addRouteOverlay`) ya las
    pinta; lo que falta es la pantalla. El punto de extensión está en
    `handleOpenRouteStop` (`src/App.tsx`): hoy ignora las paradas `kind: 'poi'`
    y solo abre la ficha de planta. Cuando exista la ficha de POI, se abre ahí
    (mismo patrón overlay que la planta: `FichaAbierta.origin` admite ya
    `'ruta'`).
- Pendiente: no hay proxy en `vite.config.ts` (la URL del API es absoluta).

## Git

`main` está protegida: **no se pushea directo ni se mergea sin PR**. El flujo completo, la
configuración de protección y el versionado están en `docs/agents/git-workflow.md`.

- Rama por cambio: `feat/<slug>`, `fix/<slug>`, `docs/<slug>` o `chore/<slug>`, siempre desde
  `main` actualizado.
- PR obligatoria contra `main`; merge con **squash** y borrado de la rama. Nada de force-push ni de
  borrar `main`.
- Una PR debe pasar build/tipos/lint/tests y estar al día con `main` antes del merge.
- Commits en imperativo con prefijo `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`.
- Versionado por tags semver `vX.Y.Z` en cada repo; subir `package.json` solo en la PR de release.
- Issues: GitHub Issues vía `gh`, repo inferido del remote (`docs/agents/issue-tracker.md`).
  Bloqueos y sub-issues con `scripts/tickets.sh` (`link`, `parent`, `show`).
- No commitear `node_modules` ni `dist` (ya ignorados).
- Este checkout es el principal del repo: para trabajo en paralelo, usar worktrees.
- No hacer `git push` ni abrir PRs sin que lo pida el usuario.

## Agent skills

### Issue tracker

GitHub Issues vía `gh` (repo inferido del remote). See `docs/agents/issue-tracker.md`.

### Triage labels

Cinco roles canónicos, con el mismo nombre como label. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `GLOSSARY.md` + `docs/adr/` en la raíz. See `docs/agents/domain.md`.

- **Especie dentro de un parque**: la ficha de zona enlaza cada especie a `/mapa?zona=<slug>&verEspecie=<id>`. El mapa pide las plantas de la zona (`fetchGreenAreaPlants`, con copia descargada sin red), muestra solo los ejemplares de esa especie (agrupados si son muchos), los encuadra, oculta la tarjeta de descarga y pone un chip con la X para quitar el filtro. Sin `zona`, `verEspecie` sigue buscando entre las plantas cercanas.
