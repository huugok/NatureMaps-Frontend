# AGENTS.md — NatureMaps-Frontend

Guía para agentes (y personas) que trabajen en este repositorio. Mantenerla actualizada cuando
cambien los comandos, la estructura o las convenciones.

> Última verificación: 2026-10-20 · `main` @ `f71c78e` (F16 y CI mergeados).

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

`main` contiene el scaffold (Vite + React + Tailwind + Oxlint), la navegación inferior de F16
(`BottomNavigation` con tests y Vitest) y el CI. El resto de pantallas (mapa, ficha de planta,
rutas, etc.) todavía no existe: llegan con sus propias UTs.

La UI está en español. Ajustes permite elegir idioma (es/va/en) y guarda la preferencia, pero **no
traduce los textos**: eso corresponde a otra UT (UT44). La capa de servicios/API tampoco existe
aún: el frontend no consume el backend.

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
src/pages/            Vistas por ruta (Settings: Ajustes e Idioma)
src/services/         Cliente HTTP / integración con el backend (y preferencia de idioma)
src/types/            Tipos compartidos (navigation.ts, language.ts)
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
  (`erasableSyntaxOnly` lo prohíbe).
- **Tailwind inline**, sin archivos CSS por componente. Paleta actual: `emerald` para activo,
  `neutral` para secundario, fondo `neutral-100`/`neutral-950`. Mobile-first.
- **Accesibilidad no negociable**: `role="tablist"`/`role="tab"`, `aria-selected`, `aria-label` en
  cada pestaña, roving `tabIndex`, navegación con flechas/Home/End, `focus-visible:ring`, área táctil
  mínima de 48px y `pb-[env(safe-area-inset-bottom,0px)]` para el notch.
- **Idioma de UI en español**; identificadores y código en inglés. El selector de Ajustes guarda
  una preferencia (`es`/`va`/`en`) en `localStorage`, pero no cambia los textos: la traducción es
  otra UT (UT44).
- Estilo: sin Prettier configurado; el scaffold usa comillas simples y sin punto y coma, la rama de
  feature usa punto y coma. Seguir el fichero que se toca y no reformatear código ajeno.

## Tests

- Vitest + Testing Library con `environment: 'jsdom'` y `globals: true`, configurado en
  `vite.config.ts`, con tipos `@testing-library/jest-dom/vitest` en `tsconfig.app.json`.
- Tests colocados: `Componente.test.tsx` junto al componente. Consultas por rol/aria
  (`getByRole('tab', { name: /ver mapa/i })`), no por clase CSS.
- Al añadir componentes interactivos, añadir tests de render, estado activo, callback y teclado.
- Los tests que lean o escriban la preferencia de idioma deben limpiar `localStorage`.

## Integración con el backend

- Backend en `http://localhost:3000` (CORS abierto, sin auth todavía).
- Endpoints disponibles: `GET /health`, `GET /trees`, `GET /trees/:id`, `POST /trees/import`,
  `GET /species`, `POST /species/enrich` (implementados en `origin/explore_open_data`).
- Las llamadas HTTP deben ir en `src/services/`, no dentro de componentes.
- Pendiente: no hay variable de entorno para la base URL de la API ni proxy en `vite.config.ts`.

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
