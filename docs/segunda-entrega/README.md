# Segunda entrega — Diseño y módulos

**Proyecto:** Sistema integral de gestión para CILGAS · **Grupo:** 213

**Integrantes:** Fermín Alliot y Gabriel Antuña

**Tutora:** Sofía Carnevale · **Fecha de preparación:** 27/09/2026

**Estado:** diseño publicado el 27/09/2026; etapa 2 aprobada según la devolución de Sofía Carnevale aportada por el equipo el 02/10/2026. La tutora indicó avanzar al código y preparar la entrega final.

## Objetivo de la entrega

Presentar el diseño relacional, los módulos funcionales, la arquitectura y la estructura inicial del repositorio único. Esta entrega desarrolla la propuesta de la primera instancia, conserva sus límites y utiliza las cinco fichas aportadas por CILGAS como evidencia del formulario real.

El repositorio original se consultó como referencia funcional por indicación del equipo. Sus funcionalidades no se incorporan automáticamente al alcance académico: se conserva la esencia del circuito de servicios y finanzas y se propone mejorar su trazabilidad mediante relaciones explícitas e historia documental.

No se incorpora implementación de frontend, backend ni lógica de negocio. Los scripts SQL describen el esquema y los catálogos de diseño requeridos por la consigna; no son migraciones productivas ni se aplican sobre una base de CILGAS. Los archivos `.gitkeep` permiten versionar carpetas vacías.

## Recorrido de revisión

| Orden | Documento | Contenido |
| --- | --- | --- |
| 1 | [Relevamiento de fichas](RELEVAMIENTO_FICHAS.md) | Campos visibles, variantes, trazabilidad y límites de interpretación. |
| 2 | [Referencia funcional](REFERENCIA_FUNCIONAL.md) | Continuidad y mejoras frente al sistema original. |
| 3 | [Reglas e invariantes](REGLAS_NEGOCIO.md) | Decisiones operativas y financieras, ejemplos y pendientes. |
| 4 | [Módulos](MODULOS.md) | Capacidades, prioridades, dependencias, roles y criterios de aceptación. |
| 5 | [Modelo de datos](MODELO_DATOS.md) | Diagramas entidad-relación y decisiones de modelado. |
| 6 | [Base de datos](../../database/README.md) | DDL, catálogos, diccionario exhaustivo, claves, restricciones e índices. |
| 7 | [Arquitectura](ARQUITECTURA.md) | Monolito modular, tecnologías, capas, seguridad y despliegue previsto. |
| 8 | [Validación del diseño](VALIDACION.md) | Comprobaciones realizadas y escenarios previstos para la implementación. |
| 9 | [Revisión y aprobación](APROBACION.md) | Lista de entrega, decisiones a validar y registro de devoluciones. |

## Estructura inicial

| Ruta | Finalidad en esta entrega |
| --- | --- |
| `/README.md` | Presentación del proyecto, estado e índice de documentación. |
| `/CONTEXT.md` | Glosario de términos del dominio. |
| `/docs/adr/` | Decisiones arquitectónicas de la primera entrega y precisiones posteriores. |
| `/docs/segunda-entrega/` | Diseño y documentación de esta instancia. |
| `/database/` | Esquema SQL declarativo, catálogos y diccionario de datos. |
| `/frontend/src/app/` | Carpeta reservada para composición y navegación. |
| `/frontend/src/features/` | Carpeta reservada para capacidades funcionales. |
| `/frontend/src/shared/` | Carpeta reservada para elementos compartidos de interfaz. |
| `/backend/src/modules/` | Carpeta reservada para módulos del monolito. |
| `/backend/src/common/` | Carpeta reservada para infraestructura transversal. |
| `/packages/contracts/` | Carpeta reservada para contratos de API; no contendrá reglas de negocio. |

Las carpetas de aplicación sólo contienen marcadores vacíos. No se generan aplicaciones, dependencias, controladores, pantallas, workflows, contenedores ni despliegues en esta instancia.

## Alcance de la aprobación

La publicación en el repositorio único de GitHub fue comprobada el 27/09/2026. El equipo aportó el 02/10/2026 la devolución de Sofía: «ya esta asentado el aprobado de la etapa 2 en la plataforma», junto con su indicación de trasladar el análisis al código. La aprobación de esta etapa permite continuar la implementación del diseño y los módulos acordados, sin solicitar una nueva aprobación de etapa 2.

El [registro de aprobación](APROBACION.md) conserva la publicación y la evidencia aportada. El 02/10/2026 es la fecha de registro de la devolución, no la fecha exacta de envío del mensaje, que se desconoce. No se accedió al campus ni se identificó el SHA revisado por la tutora o una constancia independiente del comité.

Las validaciones operativas y regulatorias de las fichas continúan con CILGAS y sus responsables técnicos antes de emitir documentación real de los casos afectados. La aprobación académica no sustituye esas verificaciones ni las pruebas de implementación.
