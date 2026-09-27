# Validación del diseño de la segunda entrega

Fecha: 27/09/2026. Esta revisión valida artefactos de análisis y diseño. No certifica el funcionamiento de una aplicación ni reemplaza la aprobación de la tutora.

## Fuentes contrastadas

| Fuente | Revisión realizada | Límite |
| --- | --- | --- |
| Repositorio único del TFI, base `236e36c3a0f0ac294f9691c9a1b23ff6d5041a45` | README, CONTEXT, instrucciones del repositorio, documentación de agentes y cuatro ADR de primera entrega | No se encontró una constancia de aprobación explícita de esta segunda entrega. |
| Chat «Propuesta tecnica CILGAS» indicado por el equipo | Recuperación de contexto anterior y contraste con las decisiones versionadas | El enlace compartido no pudo abrirse directamente; la documentación actual del TFI es la autoridad para alcance y stack. |
| Repositorio original `sistema-cilgas` | Documentación, esquema y estructura según [registro de referencia](REFERENCIA_FUNCIONAL.md) | Sólo lectura; no ejecución del sistema ni consulta de su base productiva. |
| Cinco fotografías de fichas | Inspección visual, campos y variantes según [relevamiento](RELEVAMIENTO_FICHAS.md) | Datos manuscritos ambiguos no se convierten en reglas; no se publican fotos ni datos personales. |
| Consigna de segunda entrega aportada por el equipo | Matriz de requisitos y aprobación | Fecha de preparación y publicación efectiva son hechos diferentes. |

## Cobertura del diseño

| Necesidad | Artefactos relacionados | Comprobación de revisión |
| --- | --- | --- |
| Registrar personas y vehículos sin repetir datos | M03; tablas de personas, vehículos y vínculos | Separa usuarios, titular, contacto y pagador; mantiene historia documental. |
| Conservar equipo e intervenciones | M04, M06, M07; configuraciones, componentes e intervenciones | Diferencia componente, renglón y configuración final; hasta cuatro cilindros en el alcance. |
| Registrar obleas y PH | M07; obleas y revisiones por cilindro | Una PH no implica cambio de cilindro ni se deduce sólo de la operación R. |
| Generar fichas fieles e inmutables | M08; ficha, snapshot y archivo | Campos visibles trazados; PDF post-commit y rectificación sin sobrescritura. |
| Explicar cobros y deuda | M09–M11; hechos e imputaciones | Anticipos explícitos, pagos combinados y saldos sin doble contabilización. |
| Gestionar convenios | M12; convenio, cupón, liquidación y cobros | Autorizar o entregar no equivale a recibir dinero; no se duplica cupón. |
| Controlar acceso y acciones sensibles | M01 y M14; usuarios, sesiones, permisos y auditoría | Matriz de capacidades explícita y control obligatorio del backend. |
| Avisar vencimientos | M13; resultados y obligaciones con vencimiento | Umbrales configurables; las fechas faltantes requieren tratamiento explícito. |
| Continuidad del servicio | M15; arquitectura | Plan de respaldos y restauración; los objetivos todavía no están medidos. |

## Comprobaciones técnicas efectuadas

El DDL y los catálogos se ejecutaron en una base vacía y descartable con PostgreSQL 18.3 embebido mediante PGlite 0.5.8. La declaración de compatibilidad PostgreSQL 16+ no equivale a una prueba ejecutada en PostgreSQL 16 nativo. Las herramientas de comprobación y los datos sintéticos se ejecutan fuera del repositorio de entrega.

| Control | Resultado |
| --- | --- |
| DDL y catálogos en PostgreSQL aislado | Correcto: ambos scripts ejecutados sin errores; 42 tablas, 362 columnas, 42 PK, 82 FK y 112 restricciones CHECK. Se contabilizan 123 índices, incluidos los automáticos de PK/UNIQUE. |
| Restricciones representativas de integridad | 32 comprobaciones correctas sobre datos sintéticos secuenciales, más tres verificaciones específicas de renovación tras cancelar un borrador: claves, tipos, vigencia única, posiciones, importes, rectificaciones, estados PDF, PH, idempotencia, convenios, alertas y preservación de historia. |
| Sintaxis de diagramas Mermaid | Correcta en las 11 vistas ER y los 2 diagramas de arquitectura. El ER y el diccionario cubren exactamente las 42 tablas y sus 362 columnas. |
| Enlaces locales y correspondencia entre archivos | 86 enlaces locales comprobados, sin destinos inexistentes. |
| Ausencia de implementación nueva en frontend/backend | Sólo seis marcadores de directorio vacíos en frontend, backend y contratos; no se agregó lógica de aplicación. |

La comprobación financiera insertó hechos sintéticos de un cobro de $30.000, una obligación de $20.000 y un egreso mixto de $8.000 ($3.000 efectivo + $5.000 transferencia). Las consultas de verificación obtuvieron **saldo real $22.000, deuda pendiente $12.000 y saldo teórico $10.000**. Esto comprueba que el modelo puede representar el caso sin doble contabilización; no afirma que exista ya un servicio de cálculo implementado.

También se verificó que registrar la preparación técnica de un borrador no crea automáticamente resultados ni hechos financieros, que una ficha admite los renglones separados del regulador y que no se puede asociar una configuración de otro vehículo a un servicio. Los datos sintéticos y las herramientas temporales no se incluyen como implementación en esta entrega.

**Límites de las comprobaciones:** no se ejecutó un servidor PostgreSQL 16 nativo ni pruebas concurrentes; no se validaron permisos de una aplicación, protección efectiva de snapshots ni generación real de PDF. Esas garantías requieren la etapa de implementación. El tipo JSONB comprueba la forma general de objeto, pero el contrato de sus campos debe validarse en el backend.

## Correcciones surgidas de la revisión

- Se explicitó la diferencia entre guardar un borrador y registrar un anticipo; la edición de un borrador con cobros tiene límites.
- Se definió el cobro neto de devoluciones para impedir sobrecobros sin confundir una devolución real con una anulación.
- Se precisó la fórmula del saldo teórico para que pagar una obligación no vuelva a descontarla.
- Se evitó generalizar la anotación PH de una sola ficha a todas las operaciones.
- Se separaron los componentes documentados de los que quedan instalados, incluyendo regulador retirado y montado en una misma operación.
- Se revisaron domicilio desglosado, inyección, series de accesorios y precisión mes/año contra el formulario real.
- Se distinguió el snapshot inmutable del estado recuperable de generación del PDF.
- Se limitó a uno el sucesor de renovación no cancelado, permitiendo reemplazar un borrador cancelado sin borrar su historia.

## Validación pendiente durante la implementación

Los escenarios de [MODULOS.md](MODULOS.md) y [ARQUITECTURA.md](ARQUITECTURA.md) son criterios futuros. Todavía no se realizaron pruebas de interfaz, API, autorización ejecutable, simultaneidad real, impresión de ficha generada, despliegue ni restauración. No se crearon usuarios, contraseñas, certificados ni datos productivos.

Las invariantes entre filas —sumas, límites acumulados, transiciones, correspondencia técnica, permisos e inmutabilidad— deberán implementarse y probarse en las transacciones del backend. El modelo identifica el control responsable y no presume que el DDL por sí solo resuelve todas esas reglas.

Los resultados de esta revisión se presentan a la tutora junto con [los puntos pendientes de aprobación](APROBACION.md). Una comprobación técnica exitosa no constituye aprobación académica ni valida por sí misma requisitos regulatorios.
