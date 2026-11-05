UT 932 - F04. Aviso sin red o límite diario

Se conservan los cinco enunciados recibidos. Los informes registran una verificación asistida en Chrome con red y respuestas simuladas, sin consumir cuota real. Se utiliza el máximo de 500 indicado en la especificación de UT 932.

PA 657 - Recuperación de la conexión

DESCRIPCIÓN DE LA PRUEBA

CONDICIONES
El dispositivo no tiene conexión a Internet y se ha mostrado el aviso correspondiente.

PASOS
1. Activar la conexión a Internet.
2. Volver a intentar la identificación de una planta.

RESULTADO
El aviso de falta de conexión ya no aparece y el usuario puede continuar con la identificación.

OBSERVACIONES
—

INFORME DE LA PRUEBA 657

Fecha: 05/11/2026
Colaborador: Kirill Nikolaev
Resultados: OK
Observaciones: Al simular la recuperación de la conexión y pulsar Reintentar, desaparece el aviso y se obtiene el resultado. Se reenvía la misma foto, comprobada mediante su hash.

PA 656 - Uso antes de alcanzar el límite diario

DESCRIPCIÓN DE LA PRUEBA

CONDICIONES
El usuario todavía no ha alcanzado el límite diario.

PASOS
1. Abrir la aplicación.
2. Ir a la función de identificación de plantas.
3. Realizar una identificación.

RESULTADO
No aparece el aviso de límite diario y el usuario puede continuar con la identificación.

OBSERVACIONES
—

INFORME DE LA PRUEBA 656

Fecha: 05/11/2026
Colaborador: Kirill Nikolaev
Resultados: OK
Observaciones: Con una respuesta correcta y cuota disponible, la identificación continúa sin aviso de límite. También se comprobó que una respuesta correcta con cero solicitudes restantes conserva su resultado.

PA 655 - Aviso al alcanzar el límite diario

DESCRIPCIÓN DE LA PRUEBA

CONDICIONES
El usuario ha alcanzado el límite diario permitido de identificaciones.

PASOS
1. Abrir la aplicación.
2. Ir a la función de identificación de plantas.
3. Intentar realizar una nueva identificación.

RESULTADO
La aplicación muestra un aviso indicando que se ha alcanzado el límite diario.

OBSERVACIONES
Tiene que ser en acuerdo con el documento maestro cuál es el número máximo de identificaciones diarias.

INFORME DE LA PRUEBA 655

Fecha: 05/11/2026
Colaborador: Kirill Nikolaev
Resultados: OK
Observaciones: Al simular HTTP 429, aparece el aviso de límite diario con referencia a las 500 identificaciones del plan gratuito. La foto se conserva y el botón Reintentar permite un nuevo intento.

PA 654 - No mostrar aviso cuando hay conexión

DESCRIPCIÓN DE LA PRUEBA

CONDICIONES
El dispositivo tiene conexión a Internet.

PASOS
1. Abrir la aplicación.
2. Ir a la función de identificación de plantas.
3. Intentar identificar una planta.

RESULTADO
No aparece el aviso de falta de conexión y el usuario puede continuar con la identificación.

OBSERVACIONES
—

INFORME DE LA PRUEBA 654

Fecha: 05/11/2026
Colaborador: Kirill Nikolaev
Resultados: OK
Observaciones: Con conexión y respuesta correcta simuladas, se muestra el resultado sin aviso de falta de conexión.

PA 653 - Aviso cuando no hay conexión

DESCRIPCIÓN DE LA PRUEBA

CONDICIONES
El dispositivo no tiene conexión a Internet.

PASOS
1. Abrir la aplicación.
2. Ir a la función de identificación de plantas.
3. Intentar identificar una planta.

RESULTADO
La aplicación muestra un aviso indicando que no hay conexión a Internet.

OBSERVACIONES
El mensaje debe ser claro y comprensible para el usuario.

INFORME DE LA PRUEBA 653

Fecha: 05/11/2026
Colaborador: Kirill Nikolaev
Resultados: OK
Observaciones: Con la aplicación cargada, se simula la falta de Internet y aparece un aviso claro con Reintentar. La fotografía permanece disponible.

Evidencias: docs/evidencias/ut-932/. Se han comprobado es/en a 320 px y va a 402 px.
