UT 924 - Fuentes de información

PRUEBA 1 - Datos de la fuente

DESCRIPCIÓN DE LA PRUEBA
Comprobar la entidad responsable, la fecha o versión y el enlace.

CONDICIONES
La aplicación y el backend UT 924 están abiertos con conexión a la base de datos.

PASOS
1. Abrir una ficha de planta.
2. Ir a Fuentes de información.
3. Revisar sus metadatos y pulsar un enlace.

RESULTADO
Cada fuente indica su entidad, fecha o versión y enlace. El enlace se abre en otra pestaña.

OBSERVACIONES
Una importación o consulta no es la fecha de publicación de la fuente.

INFORME DE LA PRUEBA 1
Fecha: 05/11/2026
Colaborador: Kirill Nikolaev
Resultados: OK
Observaciones: Verificación automatizada en navegador con API real: ficha Phoenix canariensis, tres fuentes con entidad y fecha, créditos conservados y enlace municipal abierto en otra pestaña.


PRUEBA 2 - Fuente asociada a cada planta

DESCRIPCIÓN DE LA PRUEBA
Comprobar que plantas y especies conservan al menos una fuente.

CONDICIONES
El catálogo contiene plantas importadas y especies con referencias editoriales.

PASOS
1. Consultar el catálogo y las fuentes de las plantas en la base de datos.
2. Consultar las especies mediante GET /species.
3. Abrir el detalle de una planta y de una especie.

RESULTADO
Cada planta y especie tiene una fuente asociada con entidad, enlace y fecha o versión.

OBSERVACIONES
Las referencias editoriales antiguas también se reconocen sin modificar los registros.

INFORME DE LA PRUEBA 2
Fecha: 05/11/2026
Colaborador: Kirill Nikolaev
Resultados: OK
Observaciones: SELECT verificó 67 538 plantas sin carencias de fuente, enlace o fecha; GET verificó las 265 especies con al menos una fuente completa y una muestra de tres plantas. Los tests aislados verificaron referencias editoriales antiguas y especies sin ubicaciones.


PRUEBA 3 - Idiomas y pantalla estrecha

DESCRIPCIÓN DE LA PRUEBA
Comprobar la legibilidad y traducción de las etiquetas de fuentes.

CONDICIONES
La ficha contiene fuentes con metadatos.

PASOS
1. Abrir la ficha en español, valenciano e inglés.
2. Ir a Fuentes de información.
3. Revisar las etiquetas, fechas y enlaces en una pantalla estrecha.

RESULTADO
Las etiquetas se traducen, las fechas son legibles y los enlaces no desbordan la pantalla.

OBSERVACIONES
Los nombres propios, créditos y contenidos originales conservan su idioma.

INFORME DE LA PRUEBA 3
Fecha: 05/11/2026
Colaborador: Kirill Nikolaev
Resultados: OK
Observaciones: Verificación automatizada en navegador con API real: español e inglés a 320 px y valenciano a 402 px, sin desbordamiento horizontal ni errores de ejecución. Enlaces accesibles por foco y con área táctil mínima de 44 px.
