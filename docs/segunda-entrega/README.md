# Segunda entrega — Diseño y módulos

**Proyecto:** Sistema integral de gestión para CILGAS · **Grupo:** 213

**Integrantes:** Fermín Alliot y Gabriel Antuña

**Tutora:** Sofía Carnevale · **Fecha de preparación:** 27/09/2026

**Estado:** propuesta de diseño preparada para revisión; aprobación académica pendiente.

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

La preparación de estos archivos no equivale a la entrega efectiva ni a la aprobación. La entrega será efectiva cuando los archivos estén publicados y actualizados en el repositorio único de GitHub. La tutora debe aprobar explícitamente el diseño y el listado de módulos, y luego debe intervenir el comité conforme a la consigna. Las observaciones recibidas se registrarán y resolverán antes de iniciar la etapa de implementación.

La tarea del campus se utilizará para asentar la devolución y deberá marcarse como finalizada según el procedimiento de la cátedra. El contenido se revisa en GitHub.
