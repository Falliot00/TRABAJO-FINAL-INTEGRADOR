# Estado de implementación y roadmap de CILGAS

**Corte del análisis:** 07/10/2026, Argentina. **Base de código:** `5e08081f5097842f313d57233981ffedfb00c2db`.

CILGAS tiene la segunda entrega académica aprobada y está implementando el **incremento 2, servicio y documento**. Ya existe un recorrido que recupera un vehículo, prepara un borrador y confirma un trabajo con historia técnica, resultados, snapshot y obligaciones. Falta cerrar ese recorrido con PDF y rectificaciones. El circuito financiero, convenios y alertas todavía requieren implementación; la continuidad productiva está preparada parcialmente.

El siguiente paso recomendado es **completar M08 y la trazabilidad posterior de M07**, mientras se prepara el despliegue y se resuelven excepciones operativas concretas. Luego corresponde construir cobros, egresos y saldos, convenios y alertas. El criterio de avance será demostrar recorridos completos; contar tablas, pantallas o módulos no permite asignar un porcentaje fiable de terminación.

Este documento reúne el diagnóstico y propone el trabajo siguiente dentro del alcance aprobado. El calendario conserva los compromisos registrados del 14/11/2026 y 40 horas semanales combinadas mientras el equipo no comunique cambios.

## Cómo interpretar las fuentes

| Fuente                                                                                                                                           | Qué permite afirmar                                                                                                              |
| ------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| [Aprobación](segunda-entrega/APROBACION.md)                                                                                                      | La etapa 2 está aprobada según la devolución de la tutora aportada el 02/10. No certifica una aplicación final ni un despliegue. |
| [Módulos](segunda-entrega/MODULOS.md), [reglas](segunda-entrega/REGLAS_NEGOCIO.md), [relevamiento](segunda-entrega/RELEVAMIENTO_FICHAS.md) y ADR | Alcance, reglas, decisiones y criterios comprometidos. P0 y P1 son obligatorios para el MVP.                                     |
| [Guía de desarrollo](desarrollo.md), código, contratos y migraciones                                                                             | Capacidades incorporadas y límites actuales.                                                                                     |
| [SQL de diseño](../database/01-esquema.sql) y [diccionario](../database/DICCIONARIO_DATOS.md)                                                    | Modelo previsto. La presencia de una tabla o columna no acredita un flujo implementado.                                          |
| Pruebas y CI                                                                                                                                     | Comportamientos comprobados en los escenarios ejecutados. No sustituyen aceptación del taller, impresión física ni restauración. |

Se revisaron los **24 documentos Markdown versionados del proyecto**, detallados al final, y se contrastaron con código, SQL, configuración, pruebas e historial de GitHub. Las skills de `.agents/skills` son instrucciones de trabajo, no documentación funcional del sistema; se consultaron las aplicables. Las referencias al sistema original y a las cinco fotografías se analizaron mediante el relevamiento conservado en este repositorio: no se volvió a ejecutar aquel sistema ni se dispuso aquí de los originales fotográficos.

## Punto actual por incremento

| Incremento aprobado               | Estado al corte                                                             | Qué falta para cerrarlo                                                                                               |
| --------------------------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| 1. Base y acceso                  | Base funcional implementada y CI disponible.                                | No hay evidencia de despliegue online inicial; esa parte sigue pendiente con M15.                                     |
| 2. Servicio y documento           | Núcleo técnico implementado, recorrido documental incompleto.               | PDF, descarga, reintento, rectificación y registro externo manual; resolver los casos técnicos delimitados más abajo. |
| 3. Registro financiero            | Sólo están los proveedores y el nacimiento de obligaciones desde servicios. | Cobros, anticipos, devoluciones, pagos, gastos, consultas y saldos derivados.                                         |
| 4. Convenios y vencimientos       | Diseño disponible; flujos pendientes.                                       | Convenios, cupones, liquidaciones y alertas internas.                                                                 |
| 5. Validación final y continuidad | Infraestructura local y pruebas del núcleo como base.                       | Aceptación integral, HTTPS operativo, respaldo externo, restauración y entregables finales.                           |

El tramo incorporado más recientemente permite el **relevamiento inicial de un equipo existente** y usar sus antecedentes en M06. Esto resuelve una dependencia práctica para atender vehículos que ya llegan con GNC sin inventar un servicio histórico. Se conservan por separado los datos relevados y los resultados de trabajos confirmados.

## Estado por módulo

«Implementado en su alcance actual» significa que existen flujos, autorización y pruebas para las capacidades presentes; las integraciones con módulos futuros deben validarse al incorporarlos.

| Módulo                          | Estado                                     | Evidencia y límite principal                                                                                                                                                                                                                                                                                                                                                      |
| ------------------------------- | ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M01 Identidad y acceso          | Implementado en su alcance actual          | Sesiones, roles, cuentas, desactivación y revocación en [identity](../backend/src/modules/identity/users.service.ts) y [pruebas de acceso](../backend/test/access.test.ts). Quedan pruebas de autorización de los futuros flujos financieros y documentales.                                                                                                                      |
| M02 Configuración y referencias | Implementado en su alcance actual          | Taller, actores y modelos en [references](../backend/src/modules/references/references.service.ts) y [Configuración](../frontend/src/features/settings/Settings.tsx). La carga y validación de identidades regulatorias reales sigue a cargo de CILGAS.                                                                                                                           |
| M03 Personas y vehículos        | Implementado en su alcance actual          | Recuperación, edición y relaciones con vigencia en [people](../backend/src/modules/people/people.service.ts) y [vehicles](../backend/src/modules/people/vehicles.service.ts). Los roles del trabajo se conservan en el servicio.                                                                                                                                                  |
| M04 Equipos e historia          | Núcleo implementado                        | Identidad, configuraciones, exclusividad, parejas y relevamiento en [componentes](../backend/src/modules/components/components.service.ts), [efectos técnicos](../backend/src/modules/components/service-effects.ts) y [relevamiento inicial](../backend/src/modules/components/initial-survey.service.ts). Accesorios físicos e identidad insuficiente requieren cierre acotado. |
| M05 Catálogo                    | Implementado en su alcance actual          | Propuestas editables y valores históricos propios en [catálogo](../backend/src/modules/catalog/catalog.service.ts) y [borradores](../backend/src/modules/services/service-drafts.service.ts). No representa stock ni compras.                                                                                                                                                     |
| M06 Borrador y confirmación     | Núcleo implementado; cierre parcial        | Borradores compartidos, versión, confirmación atómica e idempotente en [confirmación](../backend/src/modules/services/service-confirmation.service.ts). Faltan renovación enlazada y cancelación operativa; M09 debe agregar controles sobre anticipos.                                                                                                                           |
| M07 Resultados técnicos         | Parcial                                    | PH, obleas, vencimientos y antecedentes implementados. Falta cargar SICGNC después del trabajo; revisar el caso de PH completamente rechazada sin habilitación. Ver [reglas técnicas](../backend/src/modules/services/confirmation-technical-rules.ts).                                                                                                                           |
| M08 Fichas y PDF                | Parcial; próximo cierre principal          | Hay snapshot inmutable y consulta en [fichas](../backend/src/modules/documents/service-sheets.service.ts). PDF permanece `PENDIENTE`; no hay render, archivo, descarga, reintento ni rectificación operativos.                                                                                                                                                                    |
| M09 Cobros                      | Pendiente                                  | No hay circuito de cobros, anticipos, pagos combinados o anulaciones. Los permisos previstos no constituyen implementación.                                                                                                                                                                                                                                                       |
| M10 Proveedores y egresos       | Parcial                                    | Maestros y [obligaciones originadas por confirmación](../backend/src/modules/suppliers/obligations.service.ts). Faltan pagos, asignaciones, gastos y devoluciones.                                                                                                                                                                                                                |
| M11 Perspectivas financieras    | Pendiente                                  | Las fórmulas están acordadas; no hay consultas operativas de saldos, deuda y movimientos.                                                                                                                                                                                                                                                                                         |
| M12 Convenios                   | Pendiente                                  | No hay flujos de cupones, agrupación, presentación y cobro de liquidaciones.                                                                                                                                                                                                                                                                                                      |
| M13 Alertas                     | Pendiente                                  | No hay selección configurable y autorizada de vencimientos técnicos y financieros.                                                                                                                                                                                                                                                                                                |
| M14 Auditoría                   | Implementada para las mutaciones presentes | Autoría y consulta administrativa en [audit](../backend/src/modules/audit/audit.service.ts). Se debe extender junto con cada nuevo hecho, rectificación y anulación.                                                                                                                                                                                                              |
| M15 Operación y continuidad     | Preparación local                          | [Compose](../compose.yaml), [Dockerfile](../infra/Dockerfile), Nginx y CI. HTTPS está ejemplificado; no se acredita despliegue real, respaldo externo automatizado ni restauración.                                                                                                                                                                                               |

## Hallazgos que cambian la planificación

### El diseño histórico no es un tablero de avance

La segunda entrega conserva evidencia del 27/09. Sus afirmaciones sobre carpetas vacías y validaciones futuras describen aquella entrega. Para conocer la aplicación actual deben usarse `docs/desarrollo.md`, el código y esta evaluación.

Hay frases que pueden inducir a error al leerlas sin ese contexto: «Los módulos todavía no están implementados» en MODULOS, «código actualmente bloqueado» en APROBACION y pendientes de relación cilindro–válvula o precisión de fechas en MODELO_DATOS. Esos últimos puntos ya tienen migraciones y comportamiento implementado. Conviene agregar referencias temporales y enlaces de estado actuales, preservando la evidencia original, en lugar de reescribir retrospectivamente la entrega.

### Hay garantías de base de datos que los próximos flujos deben respetar

El DDL de diseño contempla 42 tablas. Las 10 migraciones actuales crean 37 tablas; Prisma declara 22 modelos porque también se usa SQL parametrizado. Esas cifras no son un indicador de avance. Hay tablas nuevas de confirmación, instalación y relevamiento, mientras siguen pendientes partes del esquema de finanzas, convenios, alertas y accesorios.

La [migración de borradores](../backend/prisma/migrations/202610020006_service_drafts/migration.sql) anticipa columnas para SICGNC, cancelación y antecedente de renovación. Sin embargo, contratos y controladores no exponen esos recorridos.

La [migración de confirmación](../backend/prisma/migrations/202610020007_service_confirmation/migration.sql) impide modificar servicios confirmados y agregar fichas a un servicio que ya dejó de ser borrador. Por ello, **rectificar y cargar SICGNC después de confirmar requiere diseñar migraciones y operaciones explícitas**. No alcanza con añadir pantallas sobre las columnas existentes. Tampoco debe debilitarse globalmente la inmutabilidad. Los futuros pagos y anulaciones necesitan respetar de igual modo la protección de obligaciones.

### La calidad del núcleo tiene evidencia y una limitación concreta

La [CI de HEAD, intento 2](https://github.com/Falliot00/TRABAJO-FINAL-INTEGRADOR/actions/runs/37403608408/attempts/2) terminó correctamente: backend 19 suites y 79 pruebas; frontend 11 archivos y 63 pruebas; E2E 16 pruebas. También aprobó formato, lint, tipos, build y la comprobación de migraciones/arranque Docker con API detrás de Nginx.

El [intento 1](https://github.com/Falliot00/TRABAJO-FINAL-INTEGRADOR/actions/runs/37403608408/attempts/1) falló en la prueba de desactivación concurrente de administradores: esperaba respuestas 200/409 y obtuvo 200/401; luego fallaron dos accesos dependientes. El test y el servicio de usuarios no cambiaron en el último incremento. La intermitencia es anterior a este análisis y está documentada en la [PR 2](https://github.com/Falliot00/TRABAJO-FINAL-INTEGRADOR/pull/2), pero el reintento exitoso no demuestra que esté resuelta. Debe diagnosticarse antes de usar repetidos reintentos como criterio de calidad.

GitHub no tenía issues abiertas ni cerradas al corte. Las [convenciones](agents/issue-tracker.md) ubican allí las specs, de modo que falta convertir los tramos siguientes en tickets con criterios verificables y dependencias. No se crearon issues durante este análisis.

### Quedan preguntas acotadas de operación

Las definiciones Q1–Q11 del 05/10 están resueltas. No corresponde volver a bloquear los servicios completos por MSDB, operación R/C/M, nueva oblea, fin de mes, resultado PH, certificado opcional, firmas manuales o pareja cilindro–válvula.

| Punto por resolver                                                                               | Responsable                    | Capacidad que condiciona                                                                                                                           |
| ------------------------------------------------------------------------------------------------ | ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Datos vigentes y responsabilidades concretas de TdM, PEC y CRPC                                  | CILGAS y responsables técnicos | Carga de maestros y emisión real.                                                                                                                  |
| Significado, formato y momento de registro del identificador SICGNC                              | CILGAS                         | Carga manual posterior; no integración automática.                                                                                                 |
| Rectificación de una ficha ya presentada, incluida su relación con oblea                         | CILGAS y responsables técnicos | Reglas de corrección externa. La preservación de la versión previa ya está acordada.                                                               |
| RF-06: identidad modelo+serie y piezas sin serie suficiente                                      | CILGAS y equipo                | Validar la combinación identificadora que ya exige el código y resolver los casos sin identidad suficiente, sin inventar series.                   |
| RF-11: exclusividad de categorías del vehículo y diferencia entre tubería y caño de alta presión | CILGAS y responsables técnicos | Validar los criterios documentales actuales; el código ya representa un tipo único de vehículo.                                                    |
| Instalaciones y retiros físicos de accesorios                                                    | CILGAS y equipo                | Completar su representación técnica explícita cuando corresponda, sin ampliar a stock integral.                                                    |
| PH completamente rechazada sin componentes habilitados restantes                                 | CILGAS y responsables técnicos | Determinar cómo conservar ensayo y resultado sin inventar una habilitación. Es un caso descubierto al contrastar código, no una regla ya acordada. |
| Custodia posterior de cilindros retirados                                                        | CILGAS                         | Delimitar trazabilidad mínima sin incorporar gestión de inventario.                                                                                |

## Roadmap por resultados verificables

### Paso 0 Fijar una base de trabajo confiable

**Resultado:** backlog trazable y próximos recorridos listos para implementar.

- Diagnosticar la intermitencia de acceso concurrente, aislar el caso y corregir únicamente el defecto demostrado en código o prueba; preservar la garantía de no perder el último administrador activo.
- Separar estado actual y evidencia histórica en los enlaces de documentación. Incorporar «relevamiento inicial» al glosario cuando se consolide su definición, sin convertir CONTEXT en una spec.
- Preparar tickets en el orden siguiente, con aceptación, dependencias, pruebas y un responsable principal por tramo. El roadmap organiza; las specs detalladas pertenecen a GitHub Issues.
- Obtener las decisiones operativas de la tabla anterior en paralelo con el PDF para los casos ya definidos.

**Cierre:** el fallo tiene causa y comprobación focalizada; el siguiente ticket puede implementarse sin inventar reglas; los puntos externos tienen responsable y fecha objetivo.

### Paso 1 Completar ficha PDF y trazabilidad documental

**Módulos:** M08, cierre de M07 y partes de M06/M14. **Depende de:** snapshot y confirmación existentes.

1. Construir una plantilla HTML/CSS versionada, conforme al [ADR 0005](adr/0005-precisar-pdf-y-proxy-para-la-segunda-entrega.md), que use exclusivamente el snapshot confirmado. Seleccionar el render según `snapshotVersion` y `templateVersion`; verificar snapshots históricos v1 y actuales v2, sin completar datos desde maestros ni reinterpretar relaciones antiguas con las parejas actuales.
2. Generar PDF con Playwright/Chromium después del commit; persistir estado y referencia de archivo privado; controlar concurrencia y permitir reintentos sin reconfirmar.
3. Agregar descarga autorizada y mensajes de pendiente/error/reintento para el usuario. Incorporar el archivo a la estrategia de respaldo.
4. Probar impresión con cuatro parejas cilindro–válvula, cuatro recambios, salientes en Observaciones, datos largos y espacios para firmas y sellos manuales. Validar con el formulario original y el taller.
5. Implementar rectificaciones versionadas con motivo y autor, lectura de versiones y vínculos a la anterior, respetando el circuito externo que se acuerde. No modificar hechos técnicos o financieros de manera implícita.
6. Completar el registro manual SICGNC posterior y la renovación enlazada a un servicio anterior. Renovar no debe duplicar hechos ni permitir dos sucesores no cancelados para el mismo antecedente, conforme al diseño.
7. Resolver y probar los casos técnicos acotados que entren en la operación aceptada; dejar documentado el tratamiento de los restantes antes de usarlos con datos reales.

**Cierre:** un servicio se prepara, confirma, imprime y vuelve a descargar; cambiar maestros no cambia el documento archivado; un fallo de render se recupera sin nuevos hechos; una rectificación conserva ambas versiones; SICGNC puede registrarse cuando se conoce. Un administrador y un operador demuestran sus límites respectivos. Recién aquí queda cerrado el recorrido documental del incremento 2.

### Paso 2 Registrar dinero y resolver anticipos completos

**Módulos:** M09, M10, M06 y M14. **Depende de:** servicios y obligaciones existentes. Puede comenzar en paralelo con la validación visual del PDF una vez fijados los contratos de cada tramo.

1. Implementar cobros por servicio, parciales, completos y combinados, con pagador, fecha, medio e importe. Usar precisión decimal y operaciones atómicas e idempotentes.
2. Incorporar anticipos explícitos sobre borradores. Impedir sobrecobros y cambios del total que queden por debajo del cobro neto vigente; preservar historial y autoría.
3. Implementar egresos, pagos parciales a proveedores y asignación a obligaciones del mismo proveedor; agregar gastos generales. Cabecera, fracciones por medio y asignaciones no deben contarse varias veces.
4. Completar anulaciones administrativas por errores de registro, devoluciones reales vinculadas al cobro y cancelación trazable del borrador una vez resuelto el anticipo. La devolución reutiliza egresos: no agrega un módulo independiente.
5. Aplicar los permisos por acción, origen del movimiento y campos sensibles; extender auditoría en las mismas transacciones.

**Cierre:** cobrar 30.000 de un servicio de 100.000 deja 70.000 pendientes; un pago de proveedor de 8.000 sobre una obligación de 20.000 deja 12.000. Un pago combinado falla o se registra completo. Un anticipo devuelto conserva ingreso y egreso y permite cancelar el borrador sin borrar historia. Las solicitudes concurrentes no duplican ni exceden importes. El operador no anula, devuelve ni accede a finanzas globales.

### Paso 3 Explicar deuda y saldos

**Módulo:** M11. **Depende de:** cobros y egresos del paso 2; se amplía al incorporar liquidaciones.

- Consultar movimientos identificables, deuda por servicio/proveedor y filtros temporales.
- Calcular saldo real como cobros menos egresos; saldo teórico como saldo real menos obligaciones pendientes.
- Diferenciar flujo de un período de saldo acumulado desde la fecha de corte. No permitir editar saldos ni incorporar apertura histórica o conciliación bancaria.

**Cierre:** con cobros de 30.000, obligación de 20.000 y pago de 8.000, mostrar real 22.000 y teórico 10.000. Al pagar los 12.000 restantes, ambos quedan en 10.000. Cada cifra se explica por sus hechos de origen y respeta permisos. Probar también anulaciones y devoluciones.

### Paso 4 Completar convenios y liquidaciones básicas

**Módulos:** M12, M09, M11 y M14. **Depende de:** servicio y cobros; comparte los mismos hechos financieros.

- Administrar entidades y convenios; registrar cupones asociados a servicios.
- Agrupar exclusivamente cupones disponibles del mismo convenio, presentar la liquidación y registrar su cobro completo.
- Distribuir el dinero entre servicios con una operación atómica y trazable; actualizar las consultas financieras sin sumar de nuevo la cabecera de liquidación.
- Mantener fuera del MVP quitas, retenciones y parcialidades complejas.

**Cierre:** un cupón no integra dos liquidaciones activas; presentar no genera dinero; el cobro completo se registra una vez y distribuye exactamente el total recibido. Dos solicitudes concurrentes no duplican cupones ni cobros. El operador registra cupones permitidos, pero no opera liquidaciones.

### Paso 5 Mostrar vencimientos y alertas autorizadas

**Módulo:** M13. **Depende de:** resultados técnicos y hechos financieros. Las alertas técnicas pueden desarrollarse antes; el cierre incluye ambos ámbitos.

- Calcular vencimientos registrados, incluidos vencidos, con anticipación configurable.
- Usar el mismo límite de fin de mes que la confirmación; no inventar fechas ausentes ni reutilizar resultados sin vigencia válida.
- Separar el alcance técnico del operador de los importes financieros reservados a administración.

**Cierre:** para una fecha y plazo dados se muestra el conjunto completo de vencimientos esperados; cambiar el plazo modifica correctamente la selección. Los endpoints no filtran deuda global hacia el operador. No se agregan avisos por WhatsApp o email.

### Trabajo paralelo Operación y continuidad desde ahora

**Módulo:** M15. No conviene esperar al último incremento para empezar.

1. Relevar acceso autorizado, servicios existentes del VPS, dominio, puertos y destino externo de respaldos. Conservar la convivencia prevista en [desarrollo](desarrollo.md).
2. Preparar un entorno online con configuración de producción, HTTPS, cookies seguras, secretos externos y PostgreSQL sin exposición pública. Comprobar migraciones y arranque reproducibles.
3. Incorporar el runtime de Chromium y el almacenamiento privado del PDF cuando se cierre M08.
4. Automatizar respaldos diarios externos de PostgreSQL y PDF, con retención mínima de 30 días; conservar las versiones de plantilla necesarias.
5. Restaurar en un entorno aislado una muestra consistente de personas, servicios, historia, finanzas y documentos. Medir fecha, duración, resultado y desvíos frente a RPO 24 h y RTO 4 h.

**Cierre:** HTTPS comprobado, permisos y cookies operativos, copia externa recuperable y restauración documentada. Docker local y un volumen persistente no satisfacen este criterio. El despliegue online y la restauración son parte del MVP académico; habilitar el uso cotidiano con datos reales añade la aceptación operativa de CILGAS.

### Paso final Validación integral y entrega

**Depende de:** todos los cierres anteriores; preparar informe y manuales durante los incrementos.

- Recorrer con datos sintéticos revisión anual, quinquenal, conversión, modificación, recambios, relevamiento inicial y casos de rechazo definidos.
- Demostrar PDF y rectificación, anticipo/cancelación/devolución, pagos y saldos, liquidación y alertas; comprobar denegaciones por API y concurrencia en hechos monetarios.
- Completar aceptación con propietario/hijo, impresión física y ensayo de contingencia/restauración.
- Entregar aplicación online, informe, manual de usuario, manual de operación/restauración y video; comprobar la consigna final que el equipo reciba.

**Cierre:** matriz de criterios M01–M15 con evidencia, incidencias obligatorias resueltas y entrega académica preparada. No se declara terminado el MVP si falta un P1 comprometido.

## Calendario propuesto hasta el 14 de noviembre

La siguiente secuencia conserva las ventanas del [plan original](../README.md). Es una propuesta de hitos, no una estimación cerrada de esfuerzo por ticket. Con 40 horas semanales combinadas no deben asignarse 40 horas a cada integrante; quedan aproximadamente cuatro semanas y media de construcción antes de la semana reservada al cierre.

| Ventana     | Objetivo principal                                                       | Trabajo paralelo y control                                                   |
| ----------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| 07–11/10    | Base confiable y primer PDF completo desde snapshot.                     | Resolver preguntas operativas; preparar VPS y respaldo.                      |
| 12–18/10    | Cerrar PDF, descarga, reintento, rectificación y trazabilidad posterior. | Iniciar contratos y primer recorrido de cobro; ensayo online temprano.       |
| 19–25/10    | Cerrar cobros, anticipos, pagos, gastos y devolución/cancelación.        | Consultas financieras sobre hechos ya terminados; documentación incremental. |
| 26/10–01/11 | Cerrar saldos y convenios/liquidaciones.                                 | Alertas técnicas; respaldos de datos y PDF en el entorno online.             |
| 02–08/11    | Completar alertas, integración, aceptación y restauración.               | Corregir defectos de los recorridos y preparar la demostración.              |
| 09–14/11    | Estabilización y entrega.                                                | Informe, manuales, video y contingencia; evitar comenzar módulos pendientes. |

Para repartir trabajo entre dos integrantes, conviene que uno sea responsable principal del recorrido documental y el otro de operación/pruebas y luego del circuito financiero. Es una propuesta de organización, no una asignación nominal. Cada recorrido necesita API, interfaz y pruebas coherentes; los cambios sobre confirmación y migraciones deben coordinarse explícitamente.

**Puntos de control:** si el 18/10 no se puede descargar una ficha válida, o el 25/10 no existe el circuito completo de dinero, hay riesgo para el cierre del 08/11. Reestimar tickets y capacidad con el equipo en ese momento. Eliminar primero ampliaciones fuera del MVP; quitar convenios, alertas o continuidad requiere una renegociación explícita del alcance comprometido.

## Orden concreto de las próximas unidades de trabajo

1. Diagnóstico focalizado de concurrencia en acceso y definición verificable de M08.
2. PDF desde snapshot con archivo privado, descarga y recuperación de errores.
3. Rectificaciones, SICGNC manual y renovación enlazada; cerrar excepciones técnicas acordadas.
4. Cobros por servicio y anticipos con autorización e idempotencia.
5. Egresos, pagos/asignaciones y devolución/cancelación de borradores.
6. Consultas de deuda y saldos con los ejemplos financieros acordados.
7. Convenios, cupones y cobro completo de liquidaciones.
8. Alertas internas, integración y aceptación final.

M15 acompaña desde la primera unidad. M14, pruebas y documentación acompañan cada una. No se propone cambiar el stack, rediseñar la arquitectura, rehacer los módulos existentes ni ampliar a inventario, contabilidad o automatización SICGNC.

## Validaciones y límites de este análisis

| Control                                              | Resultado                            | Alcance                                                                                                                         |
| ---------------------------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| Inventario documental y contraste con implementación | PASS                                 | Documentos del inventario inferior, código y configuración correspondientes a la base indicada.                                 |
| `pnpm typecheck`                                     | PASS                                 | Ejecutado localmente el 07/10: contratos, backend, frontend y E2E.                                                              |
| `pnpm lint`                                          | PASS                                 | Ejecutado localmente el 07/10, cero advertencias permitidas.                                                                    |
| CI sobre `5e08081`                                   | PASS en intento 2; FAIL en intento 1 | Resultado histórico consultado y límites de intermitencia explicados arriba. No se presenta como ejecución local de esta tarea. |
| Tests, build y E2E locales                           | NO EJECUTADO                         | Análisis documental sin cambios de aplicación; se consultó la CI del mismo HEAD y no se duplicó su ejecución.                   |
| React Doctor                                         | NO EJECUTADO                         | No se modificó React. La CI consultada no contiene este paso.                                                                   |
| Impresión real, operación en VPS y restauración      | NO EJECUTADO                         | No hay evidencia suficiente para darlos por cumplidos; integran los hitos pendientes.                                           |

No se comprobó el campus ni se contactó a CILGAS o a la tutora. Los pendientes de aceptación externa conservan sus responsables. El diagnóstico de arquitectura se apoya en el repositorio; no es una certificación regulatoria ni una auditoría de un servidor productivo.

El roadmap y su enlace desde README también pasaron revisión factual independiente, formato con Prettier y comprobación de 75 destinos locales existentes. Esta comprobación de enlaces no incluye anclas ni disponibilidad de sitios externos.

## Inventario documental revisado

| Grupo           | Documentos                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Raíz            | [README](../README.md), [CONTEXT](../CONTEXT.md), [AGENTS](../AGENTS.md).                                                                                                                                                                                                                                                                                                                                                                        |
| Operación       | [Desarrollo](desarrollo.md).                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Decisiones      | [ADR 0001 monolito](adr/0001-adoptar-un-monolito-modular-en-monorepo.md), [0002 PostgreSQL](adr/0002-usar-postgresql-como-fuente-persistente.md), [0003 snapshots](adr/0003-preservar-fichas-confirmadas-como-snapshots.md), [0004 finanzas](adr/0004-derivar-perspectivas-financieras-desde-hechos.md), [0005 PDF y proxy](adr/0005-precisar-pdf-y-proxy-para-la-segunda-entrega.md).                                                           |
| Segunda entrega | [Índice](segunda-entrega/README.md), [aprobación](segunda-entrega/APROBACION.md), [arquitectura](segunda-entrega/ARQUITECTURA.md), [modelo de datos](segunda-entrega/MODELO_DATOS.md), [módulos](segunda-entrega/MODULOS.md), [referencia funcional](segunda-entrega/REFERENCIA_FUNCIONAL.md), [reglas](segunda-entrega/REGLAS_NEGOCIO.md), [relevamiento](segunda-entrega/RELEVAMIENTO_FICHAS.md), [validación](segunda-entrega/VALIDACION.md). |
| Datos           | [README de base de datos](../database/README.md), [diccionario](../database/DICCIONARIO_DATOS.md), [diagramas ER](../database/DIAGRAMA_ER.md).                                                                                                                                                                                                                                                                                                   |
| Proceso         | [Dominio](agents/domain.md), [issue tracker](agents/issue-tracker.md), [etiquetas](agents/triage-labels.md).                                                                                                                                                                                                                                                                                                                                     |

Además se contrastaron los dos scripts de diseño SQL, las migraciones y Prisma, backend/frontend/contratos, pruebas backend/frontend/E2E, scripts y versiones del workspace, CI, Docker/Compose/Nginx, Git y las dos PR fusionadas. Este inventario permite distinguir la cobertura del análisis de la cobertura funcional todavía pendiente.
