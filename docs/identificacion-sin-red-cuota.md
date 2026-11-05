# Avisos sin red y por cuota — UT 932 (RNF5)

La rama `feat/ut-932-identification-retry` parte de `upstream/main` y no depende
de que se integren UT 921 o UT 933. El backend ya devuelve HTTP 429 al agotar
la cuota y 504 si no puede contactar con Pl@ntNet; esta entrega no modifica
su código ni la base de datos.

## Comportamiento

- Un fallo de red se conserva como código `unreachable`, sin comparar textos
  traducidos. Si el navegador informa que está offline, se muestra la falta de
  Internet; si sigue online, se explica que no se alcanza el servidor.
- HTTP 429 muestra el límite diario y conserva la foto. Se explica el máximo
  gratuito de 500 indicado en la especificación. La cuota es la de la cuenta
  Pl@ntNet del servidor, compartida por sus usuarios; no es un contador local.
- HTTP 502/504 indica indisponibilidad del servicio, sin afirmar que el
  dispositivo no tiene Internet.
- Reintentar envía la foto actual. Mientras se procesa, se oculta el aviso
  anterior y el control de identificar queda deshabilitado. Un nuevo fallo
  permite reintentar otra vez; un éxito muestra el resultado y elimina el aviso.
- Un éxito con `remainingIdentificationRequests: 0` sigue siendo un éxito:
  corresponde a la última identificación permitida. Solo la respuesta de error
  del proveedor activa el aviso de cuota. No se realizan reintentos automáticos.

Pl@ntNet documenta la respuesta 429 por cuota y el reinicio a las 00:00 UTC en
[Quota management](https://my.plantnet.org/doc/api/quota). Reintentar antes de
disponer de cuota puede volver a mostrar el aviso; no se promete disponibilidad inmediata.

## Código y traducciones

`IdentificationFailure` y `IdentificationError` mantienen `code` y `status` hasta
la vista. El componente `src/components/IdentificationNotice/` contiene los
mensajes en `locales/es.json`, `va.json` y `en.json`, usando `lang` de AppContext.
La preferencia de idioma sigue gestionada por el servicio existente.

Los cambios de tipos y transporte comunes con UT 921 se mantienen iguales a
esa rama para facilitar su integración. El componente de cámara conserva los
controles de Reintentar y la presentación del resultado; no se modifica la
atribución de UT 933 ni los diccionarios generales de UT 921.

## Verificación

```bash
npm run build
npm run lint
npm test
```

`src/App.identification.test.tsx` recorre PA 653–657 con respuestas controladas,
la recuperación usando teclado, el éxito con cuota restante cero y la prevención
de otro envío mientras se procesa. Los tests de `IdentificationNotice` verifican
los mensajes es/va/en y la diferencia entre red del dispositivo y servicio.

La comprobación de navegador usa una foto sintética y compara hashes SHA-256
de cada envío para demostrar que Reintentar conserva sus bytes. Las evidencias
están en `docs/evidencias/ut-932/`; no se gastan 500 consultas reales.
Se ha comprobado además el contrato 429/504 del servicio backend con `fetch`
simulado y una clave ficticia, sin leer `.env` ni consultar Neon.

Resultado del 05/11/2026: build y lint correctos, 196 tests pasan en UT 932
aislada. Se han simulado los seis órdenes de squash-merge de UT 921, UT 932 y
UT 933: sin conflictos y con el mismo árbol final. La versión conjunta pasa
build, lint y 211 tests. El registro está en `docs/evidencias/ut-932/integration.json`.
La comprobación corresponde a las ramas actuales y a `main` en `b99e4db`.

Los cinco enunciados originales y sus informes, en texto sencillo y con sus
plantillas separadas, están en [Pruebas de aceptación](pruebas-aceptacion-ut-932.md).
El máximo de 500 procede del enunciado de UT 932; no se ha revisado un documento
maestro externo que no está adjunto al repositorio.

## Comprobación manual

1. Abrir `/escanear`, seleccionar una foto y mantener la aplicación cargada.
2. Bloquear la petición `/plants/identify` o desconectar la red; identificar
   y comprobar el aviso con la foto conservada.
3. Recuperar la red o quitar el bloqueo y pulsar Reintentar. Debe desaparecer
   el aviso al obtener un resultado.
4. Para la cuota, usar una respuesta HTTP 429 controlada. No hace falta agotar
   la cuota real. Deben aparecer el aviso diario, la foto y Reintentar.
5. Volver a una respuesta correcta: no debe persistir un aviso de red ni cuota.

La prueba sin red parte de la aplicación ya cargada; UT 932 no implementa una
PWA ni la descarga inicial de la aplicación sin conexión.
