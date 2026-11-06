# UT 924 — Fuentes de información (RF23, RNF6)

Cada planta debe tener al menos una fuente con entidad responsable, enlace y fecha o versión. Se trabaja en `feat/ut-924-source-provenance`, creada desde `main` en cada repositorio. Las PR de frontend y backend serán separadas.

## Plan por etapas

1. Auditar datos y definir el contrato. Registrar el resultado y hacer un commit de documentación.
2. Backend: normalizar las fuentes existentes, añadirlas a las respuestas del catálogo y documentar la semántica de las fechas. Ejecutar build y pruebas con PostgreSQL aislado antes de hacer commit.
3. Frontend: mostrar entidad, fecha o versión y enlace en Fuentes, manteniendo compatibilidad con la API anterior. Traducir las etiquetas a es/va/en; ejecutar pruebas, build y lint antes de hacer commit.
4. Verificar el flujo completo en navegador, preparar pruebas de aceptación e instrucciones manuales y comprobar la combinación con UT 921, 932 y 933. Hacer commit de la evidencia y documentación final.

## Auditoría inicial — 05/11/2026

Consultas SELECT, sin modificar la base de datos:

- 67 538 plantas: todas tienen código de fuente, enlace y fecha de importación.
- 265 especies: todas tienen ubicaciones, enriquecimiento o referencias editoriales.
- 6 perfiles editoriales, con 18 referencias. La entidad y la fecha de consulta aún están en texto libre; no se ofrecen como metadatos estructurados.
- Inventario: `VALENCIA_ARBOLADO`, Ajuntament de València; importaciones entre 25/10/2026 y 31/10/2026.

No se necesita migración ni ejecutar el seed contra la base compartida. La procedencia ya se almacena; falta ofrecerla de forma uniforme y mostrarla.

## Contrato acordado

Campo aditivo `provenance` en árboles y especies, con referencias:

| Campo | Significado |
|---|---|
| `name` | Nombre de la fuente. |
| `provider` | Entidad responsable de la plataforma o del conjunto de datos; `null` si no consta. No sustituye los créditos de autoría. |
| `url` | Enlace a la fuente consultada. |
| `date` | Fecha ISO de importación, recuperación o consulta; `null` si no consta. |
| `dateType` | `imported`, `retrieved` o `consulted`; `null` si no consta. |
| `version` | Versión declarada; `null` cuando no se conoce. |
| `scope` | `inventory`, `editorial` o `image`. |
| `description` | Descripción y créditos conservados de la fuente. |

Las fechas de importación/consulta no se presentan como fecha de publicación o revisión del proveedor. La fecha del inventario de una especie es la última importación de sus ejemplares. Las referencias antiguas se normalizan al leerlas; no se inventan fechas ni entidades para URLs desconocidas. Las licencias y créditos actuales se conservan.

El frontend nuevo acepta una API anterior. Para ver todos los metadatos debe estar desplegado también el backend de UT 924. La identificación efímera de Pl@ntNet conserva su atribución propia (UT 933); no se crean registros de observaciones.

## Avance verificado

- Etapa 1: completada, commit `7301a08` (plan y auditoría).
- Etapa 2: completada, backend `bb8e67a`; build correcto, 23 pruebas correctas con base aislada.
- Etapa 3: completada, frontend `58ac2c1`; build y lint correctos, 194 pruebas correctas.
- Etapa 4: completada. Navegador con API real en es/en a 320 px y va a 402 px; entidades, fechas, créditos y enlaces correctos. GET de las 265 especies sin ninguna sin fuente completa. Los 24 órdenes de unión de UT 921/932/933/924 no presentan conflictos y producen el mismo árbol. La combinación pasa build, lint y 222 pruebas.

Instrucciones manuales en [fuentes-informacion-ut-924.md](fuentes-informacion-ut-924.md); pruebas e informes en `pruebas-aceptacion-ut-924.md`; evidencias en `evidencias/ut-924/`. Los commits comprobados constan en `integration.json`; futuros cambios de otras ramas requieren volver a comprobar su compatibilidad. Se han preparado los textos de ambas PR; no se ha hecho push ni abierto ninguna PR de UT 924.
