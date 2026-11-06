## UT 924 — Entidad, fecha y enlace de las fuentes

La ficha solo mostraba referencias en texto libre y algunas especies sin perfil editorial no mostraban su fuente municipal. Ahora Fuentes presenta la entidad responsable, la fecha de consulta/recuperación/importación o versión y el enlace, conservando créditos y licencias.

Requiere el backend UT 924 para disponer de todos los metadatos (`feat/ut-924-source-provenance` en NatureMaps-Backend). El contrato es aditivo y ambos clientes mantienen compatibilidad con la versión anterior. No requiere migraciones ni ejecutar el seed. Las etiquetas están traducidas a es/va/en.

Validación: build, lint y 198 tests del frontend; build y 23 tests del backend con PostgreSQL aislado. Auditoría SELECT de 67 538 plantas y comprobación GET de 265 especies. Navegador con API real en es/en a 320 px y va a 402 px: entidades y fechas visibles, créditos conservados, enlace en nueva pestaña y sin desbordamiento.

Tras revisar la ficha, se evita que el panel tape los créditos de la foto y se elige un nombre legible cuando el inventario devuelve también duplicados con codificación dañada (Canària). Verificado con API real a 320/402 px, sin modificar la base de datos.

La frase de atribución municipal de Nature MAPS también se traduce a es/va/en; se conservan el nombre de la entidad y los créditos originales de otros contenidos.

Las ramas UT 921, 932, 933 y 924 se han combinado en los 24 órdenes posibles sin conflictos y con el mismo árbol final. Esta comprobación corresponde a los commits registrados en `docs/evidencias/ut-924/integration.json`; cambios posteriores en main u otras PR requieren revisarla.

La combinación de las cuatro tareas también pasa build, lint y 222 tests.

Guía manual: `docs/fuentes-informacion-ut-924.md`. Pruebas e informes: `docs/pruebas-aceptacion-ut-924.md`. Evidencias: `docs/evidencias/ut-924/`.
