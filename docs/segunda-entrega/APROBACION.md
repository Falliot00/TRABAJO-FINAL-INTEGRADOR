# Revisión, publicación y aprobación

**Entrega:** 2 — Diseño y módulos · **Fecha de preparación:** 27/09/2026

**Equipo:** Fermín Alliot y Gabriel Antuña · **Grupo:** 213

**Tutora:** Sofía Carnevale

**Estado académico:** etapa 2 aprobada, según la devolución de Sofía Carnevale aportada por el equipo el **02/10/2026**. La tutora indicó avanzar al código y preparar la entrega final.

**Estado de publicación:** contenido publicado en `main` y verificado en GitHub el **27/09/2026 a las 20:39 (UTC−03:00, Argentina)**.

## Lista de control

| Requisito | Evidencia | Estado |
| --- | --- | --- |
| Diseño sin implementación de aplicación | Carpetas de aplicación con `.gitkeep`; documentos y SQL declarativo | Publicado y comprobado |
| Modelo relacional completo | [Modelo](MODELO_DATOS.md), [diccionario](../../database/DICCIONARIO_DATOS.md) y [DDL](../../database/01-esquema.sql) | Incluido en la etapa 2 aprobada |
| Tablas, campos, tipos, PK, FK e índices | Diccionario y DDL | Incluido en la etapa 2 aprobada |
| Módulos con descripción y prioridad | [Módulos](MODULOS.md) | Incluido en la etapa 2 aprobada |
| Arquitectura y tecnologías | [Arquitectura](ARQUITECTURA.md) | Incluido en la etapa 2 aprobada |
| Carpetas `/frontend`, `/backend`, `/database`, `/docs` | Estructura versionada | Publicado y comprobado |
| README actualizado | [README principal](../../README.md) | Publicado |
| Contenido subido al repositorio único | URL y commit remoto verificados en el registro inferior | Publicado y comprobado |
| Aprobación previa y explícita de la tutora | Mensaje transcripto por el equipo en el registro inferior; no identifica un SHA | Aprobado de etapa 2 comunicado |
| Cambios solicitados por la tutora | Devolución aportada por el equipo | No se solicitan correcciones en el mensaje recibido |
| Constancia independiente del comité | No aportada en esta devolución | No verificada por separado; no se exige otra aprobación de etapa 2 para iniciar el código |
| Registro del campus | La tutora informa que el aprobado está asentado en la plataforma | Informado por la tutora; sin acceso ni comprobación directa del campus |

La fecha de preparación, la publicación y el registro de esta devolución son hechos distintos. El **02/10/2026** es la fecha en que el equipo aportó el mensaje para actualizar este registro; se desconoce la fecha exacta en que Sofía lo envió. La devolución permite continuar con la implementación. No se deducen una constancia independiente del comité, la condición de Regular ni acciones del equipo en el campus que no fueron verificadas.

## Registro de publicación

- Repositorio: [Falliot00/TRABAJO-FINAL-INTEGRADOR](https://github.com/Falliot00/TRABAJO-FINAL-INTEGRADOR), rama `main`.
- Commit del contenido técnico revisado y publicado: [`32adc4381840414d293bff9bbf9bedf0979cde21`](https://github.com/Falliot00/TRABAJO-FINAL-INTEGRADOR/commit/32adc4381840414d293bff9bbf9bedf0979cde21).
- Publicación comprobada: **27/09/2026, 20:39, UTC−03:00** mediante `git ls-remote` y la API de GitHub; coincidencia del SHA y presencia de README, database, docs/segunda-entrega, frontend y backend.
- Se conservaron los cuatro commits originales del bundle (`8711787`, `0f7c230`, `3d089fc`, `3cd2c4e`) y se agregó la corrección verificada `32adc43`. Este registro de publicación se incorpora después de comprobar ese contenido en el remoto.
- Al cerrar la revisión del 27/09/2026 todavía no se había recibido una devolución de la tutora o del comité ni se había operado el campus. La devolución posterior se registra más abajo, conservando ese antecedente.

## Diseño aprobado y validaciones operativas pendientes

| ID | Punto | Diseño y estado actual | Responsable de la validación pendiente |
| --- | --- | --- | --- |
| PV-01 | Alcance y factibilidad | Módulos y prioridades del MVP incluidos en la etapa 2 aprobada; capacidades avanzadas postergadas | Sin nueva aprobación de alcance requerida |
| PV-02 | Diseño relacional | Identidad de componentes, configuración histórica e intervenciones separadas incluidas en el diseño aprobado | Equipo: verificar su implementación |
| PV-03 | Interpretación de las fichas | MSDB, matriz de operaciones con PH y pareja cilindro–válvula por fila precisados el 05/10/2026. Resta representar la válvula saliente en los recambios y precisar datos/fechas del ensayo y antecedente de vencimiento de M/R (Q8–Q11) | Equipo: implementar definiciones; CILGAS / responsables técnicos: resolver sólo las precisiones restantes |
| PV-04 | Roles regulatorios | Identidades diferenciadas de TdM, PEC y CRPC; pendientes datos vigentes y responsabilidades concretas | CILGAS / responsables técnicos |
| PV-05 | Confirmación y anticipos | Anticipo explícito vinculado a servicio, sin confirmación técnica automática; política ratificada por el equipo el 02/10/2026 | Equipo: implementar los controles acordados |
| PV-06 | Rectificaciones | Nueva versión enlazada, sin sobrescritura ni ajuste económico implícito; pendiente el circuito externo aceptado | CILGAS / responsables técnicos |
| PV-07 | Identificador SICGNC | Texto externo registrado manualmente; formato definitivo pendiente | CILGAS |
| PV-08 | Cilindros retirados | Trazabilidad de identidad y ubicación; sin inventario integral; pendiente el circuito posterior de custodia | CILGAS |
| PV-09 | Finanzas | Saldos derivados, pago de deuda sin doble descuento y liquidación básica incluidos en el diseño aprobado | Equipo: verificar reglas e invariantes al implementar |
| PV-10 | Decisiones técnicas de segunda entrega | Nginx y PDF servidor con Playwright/Chromium aceptados dentro del diseño aprobado; estructura modular | Equipo: validar generación, impresión y operación |

La aprobación académica permite avanzar con el diseño acordado. Los pendientes regulatorios no se completan por inferencia de las fotografías: el equipo confirmó que los revisará con los responsables antes de emitir documentación real de los casos afectados. Una decisión que cambie el alcance o la integridad del modelo se documentará antes de implementar la regla afectada.

El 05/10/2026 el equipo aportó [precisiones operativas](RELEVAMIENTO_FICHAS.md#definiciones-operativas-confirmadas-el-05102026) sobre MSDB, PH/conversión, número de oblea nueva y firma en papel posterior a la impresión. Se registran como respuestas del equipo y se actualizan sólo los pendientes que resuelven; no constituyen una nueva devolución académica ni habilitan por sí solas el código actualmente bloqueado.

En la segunda ronda confirmó datos base y teléfono obligatorios; piso/depto y observaciones opcionales; domicilio sin número; habilitación igual a fecha del trabajo; oblea de un año y PH de cinco; «Revisado» como última PH; accesorios según corresponda; firmas y sellos manuales; pareja cilindro–válvula por fila; nueva oblea y vencimiento en modificación. Las preguntas aún abiertas se acotan a Q8–Q11, sin reiterar esas decisiones.

## Registro de devolución

El equipo aportó el 02/10/2026 la siguiente devolución de Sofía Carnevale:

> ya esta asentado el aprobado de la etapa 2 en la plataforma

En el mismo mensaje, la tutora indicó: «Ahora, con todo este hermoso análisis toca trasladarlo al código y ya pensando en la entrega final», y ofreció responder dudas o reunirse.

| Fecha de registro | Revisor y rol | Evidencia | Commit revisado | Resultado | Observaciones | Commit de resolución |
| --- | --- | --- | --- | --- | --- | --- |
| 02/10/2026; fecha exacta del mensaje no informada | Sofía Carnevale, tutora | Transcripción aportada por el equipo en la sesión de trabajo de esa fecha | No identificado en el mensaje; el registro de publicación no acredita qué SHA revisó la tutora | Etapa 2 aprobada y asentada en plataforma según la tutora; continuar con el código | Sin correcciones solicitadas; no se accedió al campus ni se aportó constancia independiente del comité | No aplica: no se solicitaron correcciones en la devolución |

## Pasos de cierre a cargo del equipo

1. Publicación y comprobación en la rama principal: realizadas según el registro anterior.
2. Aprobación de etapa 2 y devolución de la tutora: registradas según el mensaje aportado el 02/10/2026.
3. Continuar la implementación por los incrementos de [MODULOS.md](MODULOS.md), con sus criterios de aceptación y validaciones.
4. Resolver con CILGAS y sus responsables técnicos los puntos pendientes antes de emitir la documentación real afectada.
5. Preparar la entrega final y atender los trámites académicos que correspondan, sin exigir otra aprobación de etapa 2 para comenzar la implementación.
