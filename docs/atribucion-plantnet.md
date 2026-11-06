# Atribución de Pl@ntNet — UT 933

El resultado de identificación (`ResultadoEscaneo`) muestra el logo oficial,
la frase de atribución traducida y un enlace a `https://my.plantnet.org/`.
La atribución aparece también sin candidatas y sin abrir la ficha.
La explicación del porcentaje de confianza se conserva por separado.

## Procedencia

- Condiciones del API: <https://my.plantnet.org/terms_of_use>.
- Logo oficial: <https://my.plantnet.org/images/powered-by-plantnet-light.svg>.
- Copia local: `public/plantnet-logo.svg`, descargada el 5 de noviembre de 2026.
- SVG sin modificar; proporciones originales: 859 × 236. Sus colores son los
  oficiales de Pl@ntNet. No se le atribuye una licencia de textos/fotos.

## Traducciones y accesibilidad

El componente `src/components/PlantNetAttribution/` carga sus propios recursos
`locales/es.json`, `va.json` y `en.json`, con las claves `attribution` y `logoAlt`.
Usa `lang` de `AppContext`, por lo que sigue el idioma elegido y su persistencia.
Editar esos JSON permite traducir la atribución sin tocar el componente.
El texto se actualiza también si se cambia de idioma estando ya montado.

Este pequeño conjunto de recursos es independiente del catálogo general de UI.
Así UT 933 funciona sobre `main` antes de UT 921 y también después de su integración.
No modifica `src/i18n/strings.ts` ni los JSON generales de UT 921.

El enlace tiene foco visible y área táctil de al menos 44 px; abre otra pestaña
con `noopener noreferrer`. Logo y texto se ajustan al ancho disponible dentro
del scroll del resultado, por encima de la navegación inferior.

## Verificación

```bash
npm run build
npm run lint
npm test
```

Los tests del componente verifican es/va/en, enlace, logo y cambio de idioma.
El test de resultado verifica que la atribución permanece sin candidatas.
La prueba de navegador usa una respuesta simulada, sin consumir cuota Pl@ntNet
ni consultar Neon. Manualmente: identificar una foto, bajar al final del resultado
y comprobar logo, frase y enlace en los tres idiomas y en pantalla estrecha.

## Entrega independiente

`feat/ut-933-plantnet-attribution` parte de `upstream/main` (`b99e4db`).
Su PR va directamente a `huugok/NatureMaps-Frontend:main` y no requiere que
UT 921 se integre primero. Las dos tareas pueden revisarse y fusionarse en
cualquier orden, después de los checks y de actualizar sus ramas con `main`.

La implementación anterior dependiente se conserva únicamente como respaldo
local en `feat/ut-933-dependent-backup` (`941ccb2`); no es la rama de entrega.
