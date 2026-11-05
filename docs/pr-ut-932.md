La identificación muestra un aviso claro al fallar la red o agotarse la cuota diaria de Pl@ntNet (HTTP 429), con mensajes es/va/en y Reintentar. Conserva la fotografía y elimina el aviso al completar otro intento. Un éxito con cuota restante cero conserva su resultado.

UT 932 parte de `main`; no modifica los diccionarios de UT 921 ni la atribución de UT 933. El backend existente ya propaga 429/504, por lo que no requiere cambios.

Validación: build y lint correctos; 196 tests pasan en la rama independiente. Los seis órdenes de squash-merge de UT 921/932/933 se combinan sin conflictos y dan el mismo árbol; la versión conjunta pasa build, lint y 211 tests. Las PA 653–657 se comprueban en Chrome con respuestas simuladas, sin consumir cuota real. La recuperación reenvía los mismos bytes de la foto.

Pruebas originales e informes: `docs/pruebas-aceptacion-ut-932.md`. Detalles y evidencias: `docs/identificacion-sin-red-cuota.md` y `docs/evidencias/ut-932/`.
