# Validación del diseño de la segunda entrega

Fecha: 27/09/2026. Esta revisión valida artefactos de análisis y diseño. No certifica el funcionamiento de una aplicación ni reemplaza la aprobación de la tutora.

## Fuentes contrastadas

| Fuente | Revisión realizada | Límite |
| --- | --- | --- |
| Repositorio único del TFI, base `236e36c3a0f0ac294f9691c9a1b23ff6d5041a45` | README, CONTEXT, instrucciones del repositorio, documentación de agentes y cuatro ADR de primera entrega | No se encontró una constancia de aprobación explícita de esta segunda entrega. |
| Chats compartidos «Propuesta técnica CILGAS» y «Preparar segunda entrega», aportados por el equipo | Lectura directa en navegador durante la revisión previa a publicar; contraste con alcance, finanzas, fichas y contenido del ZIP | La preparación original no pudo abrir el primer enlace. En esta revisión ambos fueron accesibles. Sus instrucciones históricas son contexto, no sustituyen el pedido actual ni acreditan aprobación académica. |
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

## Comprobaciones informadas durante la preparación del ZIP

Este apartado conserva la trazabilidad del informe incluido en el paquete con HEAD `3cd2c4e99fc141cdd12bd9f271c2a68e8d371ffd`. Sus 35 comprobaciones sintéticas no se adjuntaron como scripts reproducibles al ZIP; no se presentan como reejecutadas en esta revisión. Los controles nuevos y la corrección del resultado Mermaid se registran más abajo.

El DDL y los catálogos se ejecutaron en una base vacía y descartable con PostgreSQL 18.3 embebido mediante PGlite 0.5.8. La declaración de compatibilidad PostgreSQL 16+ no equivale a una prueba ejecutada en PostgreSQL 16 nativo. Las herramientas de comprobación y los datos sintéticos se ejecutan fuera del repositorio de entrega.

| Control | Resultado |
| --- | --- |
| DDL y catálogos en PostgreSQL aislado | Correcto: ambos scripts ejecutados sin errores; 42 tablas, 362 columnas, 42 PK, 82 FK y 112 restricciones CHECK. Se contabilizan 123 índices, incluidos los automáticos de PK/UNIQUE. |
| Restricciones representativas de integridad | 32 comprobaciones correctas sobre datos sintéticos secuenciales, más tres verificaciones específicas de renovación tras cancelar un borrador: claves, tipos, vigencia única, posiciones, importes, rectificaciones, estados PDF, PH, idempotencia, convenios, alertas y preservación de historia. |
| Sintaxis de diagramas Mermaid | El informe original declaraba 13 diagramas correctos. Ese resultado no pudo reproducirse con Mermaid 11.12.0: los tipos con coma, como `decimal(14,2)`, producen error de sintaxis. Se corrigieron durante la revisión previa a publicar, registrada más abajo. |
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

## Revisión independiente previa a publicar — 27/09/2026

Se extrajo el ZIP fuera del repositorio de trabajo y se clonó su bundle siguiendo `LEEME_PUBLICACION.md`. La base del repositorio único fue `236e36c3a0f0ac294f9691c9a1b23ff6d5041a45`; el remoto seguía en esa base al comenzar. El original privado se contrastó en `57be32e7e432b81b750d51ef935e871f70e3bf9f`, sin ejecutar su aplicación ni consultar datos productivos.

| Control | Resultado observado |
| --- | --- |
| Integridad del paquete | PASS: `git bundle verify`, `git fsck --full` y ascendencia de la base; los 31 archivos de `archivos/` coinciden por SHA-256 con el contenido del commit del bundle. |
| Autor y committer | PASS: cuatro commits originales, alternados GaboAnt / Falliot00, con los nombres y correos solicitados. |
| Ejecución aislada de SQL y catálogos | PASS: PGlite 0.5.8, PostgreSQL 18.3 WASM en memoria; 42 tablas, 362 columnas, 42 PK, 82 FK, 43 UNIQUE, 112 CHECK y 123 índices. Catálogos: 2 roles, 18 permisos, 26 asignaciones, 2 medios y 4 reglas; sin usuarios ni personas antes de cargar fixtures sintéticos. |
| Integridad y casos representativos | PASS: 47 comprobaciones secuenciales, con casos aceptados y rechazos por restricciones esperadas. Cubren tipos y FK, identidad de componentes, fechas mes/año, configuración, renovación tras cancelación, estados PDF, rectificaciones, PH, costos/obligaciones, idempotencia, devoluciones, convenios y alertas. |
| Correspondencia DDL / diccionario / ER | PASS: mismas 42 tablas y 362 columnas; los tipos conservan su equivalencia SQL, incluida la leyenda numérica corregida. |
| Diagramas Mermaid | PASS tras corregir 19 tipos numéricos: 11 vistas ER y 2 diagramas de arquitectura aceptados por Mermaid 11.12.0. La notación `numeric_p_s` conserva precisión y escala mediante una leyenda explícita; el SQL no cambia. |
| Navegación documental | PASS: 87 destinos de enlaces locales existentes en los documentos de la tarea, incluido el nuevo enlace al registro de publicación. No incluye disponibilidad externa ni validación de anclas. |
| Estructura sin aplicación | PASS: frontend, backend y contratos contienen sólo seis `.gitkeep` vacíos. Herramientas y datos de prueba permanecen fuera del repositorio. |
| Revisión Standards | PASS tras precisar RN-09: F01 es evidencia de PH junto con revisión anual; F03 sigue pendiente de confirmación. Sin infracciones documentales pendientes detectadas. |
| Revisión Spec | PASS respecto de los artefactos exigidos y el alcance; se precisó la diferencia entre ocho acciones de recambio y cuatro renglones documentales, sin alterar la plantilla ni declarar resuelto RF-02/PV-03. |

La corrección de sintaxis sigue las [reglas de atributos de Mermaid](https://mermaid.js.org/syntax/entityRelationshipDiagram.html#attributes). Esta comprobación es del parser, no una prueba visual del renderizado de GitHub. El diccionario y el DDL siguen siendo la definición SQL exacta.

El caso financiero se volvió a comprobar independientemente: cobros de $30.000 y egresos de $8.000, con $12.000 de deuda pendiente, dan **saldo real $22.000 y saldo teórico $10.000**. El recambio de cuatro válvulas admite ocho ítems y ocho movimientos, cuatro cilindros y cuatro válvulas finales; se comprobó que una quinta fila documental es rechazada. Esto verifica almacenamiento y límites del diseño, no la suficiencia regulatoria de cuatro casillas.

Las 47 comprobaciones no prueban simultaneidad, permisos ejecutables ni inmutabilidad frente a una escritura SQL directa. La prueba de snapshot conserva la versión original al crear una rectificación y modificar un maestro; no afirma que el DDL impida todo `UPDATE` del contenido. Tampoco se ejecutó PostgreSQL 16 nativo, una aplicación ni generación real del PDF. Los pendientes del futuro backend y RF-02/PV-03 siguen vigentes.

Las revisiones cubrieron los cuatro commits del paquete y las correcciones posteriores desde la base indicada; no se usó un diff vacío. Typecheck, lint de aplicación, React Doctor, builds y E2E no se ejecutaron porque esta entrega no modifica ni incorpora aplicación React/Node. Publicación y aprobación se registran por separado en [APROBACION.md](APROBACION.md).

## Validación pendiente durante la implementación

Los escenarios de [MODULOS.md](MODULOS.md) y [ARQUITECTURA.md](ARQUITECTURA.md) son criterios futuros. Todavía no se realizaron pruebas de interfaz, API, autorización ejecutable, simultaneidad real, impresión de ficha generada, despliegue ni restauración. No se crearon usuarios, contraseñas, certificados ni datos productivos.

Las invariantes entre filas —sumas, límites acumulados, transiciones, correspondencia técnica, permisos e inmutabilidad— deberán implementarse y probarse en las transacciones del backend. El modelo identifica el control responsable y no presume que el DDL por sí solo resuelve todas esas reglas.

Los resultados de esta revisión se presentan a la tutora junto con [los puntos pendientes de aprobación](APROBACION.md). Una comprobación técnica exitosa no constituye aprobación académica ni valida por sí misma requisitos regulatorios.
