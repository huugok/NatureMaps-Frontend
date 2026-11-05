# Traducción de la interfaz — UT 921 (RF7)

Los textos de interfaz están separados por idioma:

| Fichero | Idioma |
|---|---|
| `src/i18n/locales/es.json` | Castellano, catálogo base de claves |
| `src/i18n/locales/va.json` | Valencià |
| `src/i18n/locales/en.json` | English |

Para corregir o traducir un texto existente basta con editar el valor en el JSON
correspondiente. No hay que modificar pantallas, componentes ni el backend.
Los ficheros son JSON UTF-8, con comillas dobles y sin comentarios ni comas finales.

## Editar traducciones

1. Buscar la clave del texto, por ejemplo `home.title` o `camera.pendingRetry`.
2. Cambiar su valor en el idioma deseado, conservando la clave.
3. Conservar exactamente los marcadores de variables: `{name}`, `{count}`, `{score}`,
   `{status}`, etc. Se pueden mover dentro de la frase, pero no traducir ni borrar.
4. Ejecutar `npm test -- src/i18n/strings.test.ts` para comprobar claves y variables.

Ejemplo:

```json
{
  "ficha.loadingDetail": "Loading the {name} card…",
  "ficha.specimens": "{count} specimens"
}
```

Para añadir una frase nueva, crear una clave con el mismo nombre en los tres JSON
y usar `t('clave')` o `t('clave', { name: valor })` en el componente que la necesita.
TypeScript comprueba las claves utilizadas; los tests comprueban que los tres
idiomas tengan las mismas claves y variables y que no haya traducciones vacías.

## Qué se traduce aquí

Se incluyen navegación, pantallas, controles, nombres accesibles, estados de carga,
errores de identificación, catálogo de componentes y laboratorios de color/tipografía.
Los nombres propios de las propuestas visuales se mantienen como identificadores
editoriales; sus descripciones y controles sí se traducen. Los nombres de componentes
del catálogo (`Button`, `Card`, etc.), fuentes, nombres científicos y créditos de
OpenStreetMap conservan su identidad original.

Los textos botánicos, nombres comunes, fuentes y créditos recibidos de la API son
contenido de los proveedores/editorial, no textos de interfaz. Se conservan sus
idiomas y procedencia. Los datos históricos de la demo en
`src/pages/FichaPlanta/constants.ts` tampoco son el catálogo de traducciones.

## Cómo se usan

`src/i18n/strings.ts` carga los JSON y exporta `StringKey`, `dictionaries` y
`translate()`. `AppContext` expone `t()` y mantiene la preferencia mediante
`services/languagePreference.ts`. Los componentes aislados sin proveedor usan el
mismo traductor en español. Si una traducción falta en tiempo de ejecución, se
usa el español; las verificaciones del repositorio detectan antes ese caso.

El código interno de idioma valenciano sigue siendo `va`; el atributo HTML `lang`
usa `ca` para lectores de pantalla. La elección persiste en localStorage.

La identificación comunica fallos mediante `IdentificationFailure` (`code` y
`status`), sin usar una frase española como señal de estado. Los avisos se resuelven
en `src/i18n/identification.ts` al renderizar, por lo que un cambio de idioma también
actualiza un error ya visible. El texto libre de error del backend no se muestra
como interfaz; no se cambió el contrato HTTP ni el código del backend.

## Verificación antes de integrar

```bash
npm run build
npm run lint
npm test
```

Revisar además la navegación y los textos largos en es/va/en con el marco móvil.
Las pruebas locales no necesitan Neon ni llamadas reales a Pl@ntNet.
La atribución completa/logo y las mejoras específicas de cuota/reintento pertenecen
a UT 933 y UT 932, respectivamente, con sus propias ramas.
