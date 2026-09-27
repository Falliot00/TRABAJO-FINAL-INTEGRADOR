# Revisión, publicación y aprobación

**Entrega:** 2 — Diseño y módulos · **Fecha de preparación:** 27/09/2026

**Equipo:** Fermín Alliot y Gabriel Antuña · **Grupo:** 213

**Tutora:** Sofía Carnevale

**Estado académico:** pendiente de aprobación explícita de la tutora y posterior comité.

**Estado de publicación:** contenido publicado en `main` y verificado en GitHub el **27/09/2026 a las 20:39 (UTC−03:00, Argentina)**.

## Lista de control

| Requisito | Evidencia | Estado |
| --- | --- | --- |
| Diseño sin implementación de aplicación | Carpetas de aplicación con `.gitkeep`; documentos y SQL declarativo | Publicado y comprobado |
| Modelo relacional completo | [Modelo](MODELO_DATOS.md), [diccionario](../../database/DICCIONARIO_DATOS.md) y [DDL](../../database/01-esquema.sql) | Publicado para revisión |
| Tablas, campos, tipos, PK, FK e índices | Diccionario y DDL | Publicado para revisión |
| Módulos con descripción y prioridad | [Módulos](MODULOS.md) | Publicado para revisión |
| Arquitectura y tecnologías | [Arquitectura](ARQUITECTURA.md) | Publicado para revisión |
| Carpetas `/frontend`, `/backend`, `/database`, `/docs` | Estructura versionada | Publicado y comprobado |
| README actualizado | [README principal](../../README.md) | Publicado |
| Contenido subido al repositorio único | URL y commit remoto verificados en el registro inferior | Publicado y comprobado |
| Aprobación previa y explícita de la tutora | Devolución identificable sobre una versión concreta | Pendiente |
| Cambios solicitados por la tutora | Registro de observaciones y commits | Pendiente de recibir devolución |
| Aprobación del comité | Constancia según procedimiento de la cátedra | Pendiente |
| Tarea del campus marcada como finalizada | Acción del equipo en el aula virtual | Pendiente |

La fecha de preparación no acredita la fecha de publicación. La condición de Regular y la habilitación para avanzar dependen de la evaluación académica; este documento no las declara otorgadas.

## Registro de publicación

- Repositorio: [Falliot00/TRABAJO-FINAL-INTEGRADOR](https://github.com/Falliot00/TRABAJO-FINAL-INTEGRADOR), rama `main`.
- Commit del contenido técnico revisado y publicado: [`32adc4381840414d293bff9bbf9bedf0979cde21`](https://github.com/Falliot00/TRABAJO-FINAL-INTEGRADOR/commit/32adc4381840414d293bff9bbf9bedf0979cde21).
- Publicación comprobada: **27/09/2026, 20:39, UTC−03:00** mediante `git ls-remote` y la API de GitHub; coincidencia del SHA y presencia de README, database, docs/segunda-entrega, frontend y backend.
- Se conservaron los cuatro commits originales del bundle (`8711787`, `0f7c230`, `3d089fc`, `3cd2c4e`) y se agregó la corrección verificada `32adc43`. Este registro de publicación se incorpora después de comprobar ese contenido en el remoto.
- La revisión no recibió una devolución de la tutora o del comité ni operó el campus. El equipo debe solicitar la revisión por el canal académico acordado.

## Puntos de validación con la tutora y CILGAS

| ID | Punto | Propuesta presentada | Responsable de validar |
| --- | --- | --- | --- |
| PV-01 | Alcance y factibilidad | Módulos y prioridades del MVP; capacidades avanzadas postergadas | Tutora y equipo |
| PV-02 | Diseño relacional | Identidad de componentes, configuración histórica e intervenciones separadas | Tutora y equipo |
| PV-03 | Interpretación de las fichas | Códigos de operación y MSDB, posiciones y relación entre acciones; resolver la impresión de cuatro recambios de válvula (ocho acciones frente a cuatro casillas, RF-02) sin perder hechos técnicos | CILGAS / responsables técnicos |
| PV-04 | Roles regulatorios | Identidades diferenciadas de TdM, PEC y CRPC | CILGAS / responsables técnicos |
| PV-05 | Confirmación y anticipos | Anticipo explícito vinculado a servicio, sin confirmación técnica automática | CILGAS y tutora |
| PV-06 | Rectificaciones | Nueva versión enlazada, sin sobrescritura ni ajuste económico implícito | CILGAS / responsables técnicos y tutora |
| PV-07 | Identificador SICGNC | Texto externo registrado manualmente; formato definitivo pendiente | CILGAS |
| PV-08 | Cilindros retirados | Trazabilidad de identidad y ubicación; sin inventario integral | CILGAS |
| PV-09 | Finanzas | Saldos derivados, pago de deuda sin doble descuento, liquidación básica | CILGAS y tutora |
| PV-10 | Decisiones técnicas de segunda entrega | Nginx y PDF servidor con Playwright/Chromium; estructura modular | Tutora y equipo |

Los pendientes regulatorios no se completan por inferencia de las fotografías. Una decisión que cambie el alcance o la integridad del modelo se documentará antes de implementar el módulo afectado.

## Registro de devolución

No se recibió ni se adjuntó una aprobación explícita para esta versión durante su preparación. Cuando exista una devolución, registrar:

| Fecha | Revisor y rol | URL / evidencia | Commit revisado | Resultado | Observaciones | Commit de resolución |
| --- | --- | --- | --- | --- | --- | --- |
| Pendiente | Tutora | Pendiente | Pendiente | Pendiente | Pendiente | Pendiente |
| Pendiente | Comité | Pendiente | Pendiente | Pendiente | Pendiente | Pendiente |

## Pasos de cierre a cargo del equipo

1. Publicación y comprobación en la rama principal: realizadas según el registro anterior.
2. Solicitar la revisión de la tutora indicando el índice de esta entrega y el commit publicado.
3. Registrar su devolución explícita y resolver las observaciones con cambios trazables.
4. Seguir la revisión del comité y el registro del campus previstos por la cátedra.
5. Iniciar la codificación sólo cuando corresponda según esas aprobaciones; las fechas tentativas del cronograma no sustituyen este requisito.
