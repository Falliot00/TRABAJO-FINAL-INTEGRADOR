# Listado de módulos — Segunda entrega

**Proyecto:** Sistema integral de gestión para CILGAS

**Equipo:** Fermín Alliot y Gabriel Antuña — Grupo 213

**Fecha:** 27/09/2026

**Estado:** etapa 2 aprobada según la devolución registrada en [APROBACION.md](APROBACION.md); precisiones del equipo confirmadas el 02/10/2026. Los módulos todavía no están implementados.

## 1. Alcance y prioridades

Los módulos organizan capacidades del negocio, no una pantalla o una tabla por módulo. Mantienen el alcance de la propuesta del [README](../../README.md), el vocabulario de [CONTEXT.md](../../CONTEXT.md) y los [ADR del proyecto](../adr/). El objetivo es conservar la operación de CILGAS y mejorar la trazabilidad técnica, documental y financiera.

El [relevamiento de fichas](RELEVAMIENTO_FICHAS.md), la [referencia funcional del sistema original](REFERENCIA_FUNCIONAL.md) y las [reglas de negocio](REGLAS_NEGOCIO.md) completan la fundamentación. El [índice de la entrega](README.md) reúne el diseño de datos, el diccionario y las evidencias de validación.

| Prioridad | Significado | Condición de entrega |
| --- | --- | --- |
| P0 — Núcleo | Base de seguridad y recorridos técnicos, documentales y financieros que sostienen la propuesta. | Obligatorio para el MVP; desarrollar primero o junto con sus dependencias. |
| P1 — Completa el MVP | Capacidades comprometidas que utilizan el núcleo. | También obligatorio para el MVP; la prioridad indica orden, no que sea opcional. |
| Posterior | Mejoras expresamente fuera del MVP. | No condicionan la entrega final del alcance acordado. |

Esta segunda entrega presenta el diseño. Las descripciones y criterios siguientes son compromisos de implementación futura, no funcionalidades ya disponibles. La devolución de la tutora habilita avanzar a la implementación.

## 2. Usuarios y permisos

Se definen dos roles iniciales: **administrador** y **operador**. El propietario y su hijo tienen cuentas individuales con rol administrador y las mismas facultades. El operador es un usuario futuro limitado; sus restricciones se diseñan desde el inicio. Ser titular, contacto, pagador, proveedor o representante de una entidad no concede acceso a la aplicación.

El 02/10/2026 el equipo confirmó que la información técnica y los borradores del taller se comparten entre usuarios autorizados: un operador puede continuar un borrador iniciado por el propietario o por otro usuario y consultar las fichas del vehículo. La autoría del registro no limita ese acceso técnico ni se reemplaza por quien lo continúa; cada acción conserva su autor. Compartir el trabajo no habilita rectificaciones al operador ni amplía su acceso a movimientos financieros ajenos, costos o saldos globales.

| Capacidad | Administrador — propietario e hijo | Operador |
| --- | --- | --- |
| Administrar cuentas, permisos y parámetros sensibles | Sí | No |
| Registrar y consultar personas, vehículos y equipos necesarios para atenderlos | Sí | Sí |
| Registrar y continuar borradores del taller, confirmar servicios y cargar resultados técnicos | Sí | Sí, según capacidades asignadas, aunque los haya iniciado otro usuario |
| Consultar, generar y descargar fichas de los vehículos atendidos por el taller | Sí | Sí, con acceso técnico compartido |
| Rectificar fichas confirmadas | Sí, con motivo y vínculo a la anterior | No |
| Registrar cobros de servicios y consultar movimientos originados por su operación | Sí | Sí |
| Anular cobros o movimientos efectivos | Sí, con motivo y auditoría | No |
| Administrar catálogo, precios, costos, proveedores y convenios | Sí | No |
| Consultar ofertas y precios de venta necesarios para registrar servicios | Sí | Sí, sin acceso a costos o administración del catálogo |
| Registrar cupones de convenios existentes vinculados a un servicio | Sí | Sí, sin crear ni operar liquidaciones |
| Consultar costos y perspectivas financieras globales, incluida Caja Real | Sí | No |
| Registrar obligaciones, pagos a proveedores, gastos generales y devoluciones | Sí | No |
| Crear, presentar o cobrar liquidaciones | Sí | No |
| Consultar alertas | Técnicas y financieras | Técnicas del taller, sin importes financieros restringidos |
| Consultar auditoría global y administrar continuidad | Sí | No |

Esta matriz concreta la separación general de la propuesta y la colaboración técnica confirmada por el equipo. La autorización se verifica en el backend, tanto por acción como por registro y campos sensibles. Una pantalla oculta o una ruta protegida sólo en el navegador no satisfacen el requisito. Los cambios de permisos y la baja de una cuenta no eliminan la autoría histórica.

## 3. Módulos comprometidos

| ID | Módulo | Prioridad | Responsabilidad y límites | Dependencias principales |
| --- | --- | --- | --- | --- |
| M01 | Identidad, autenticación y autorización | P0 | Inicio y cierre de sesión local, cuentas individuales, activación/desactivación, roles y permisos. No ofrece registro público ni acceso a clientes. | Auditoría M14 y persistencia. |
| M02 | Configuración del taller y referencias regulatorias | P0 | Datos de CILGAS, TdM, PEC, CRPC, responsables técnicos, referencias de marcas/modelos y parámetros utilizados en documentos. Distingue sujetos regulatorios de proveedores comerciales. No certifica habilitaciones externas. | M01, M14. |
| M03 | Personas y vehículos | P0 | Alta, consulta y actualización de personas y vehículos; identificación del titular, contacto y pagador, que pueden ser distintos. Recuperación por identificadores para evitar duplicación. Los datos actuales no reemplazan snapshots históricos. | M01, M14. |
| M04 | Equipos y componentes con historia | P0 | Identidad de reguladores, cilindros y válvulas; configuración vigente y configuraciones anteriores del vehículo; instalación, retiro e inspección vinculados al servicio. El alcance inicial contempla hasta cuatro cilindros y distingue renglones documentales de componentes que permanecen instalados. No incluye compras ni stock integral. | M02, M03, M14; cambios confirmados por M06. |
| M05 | Catálogo de servicios y composición propuesta | P0 | Ofertas, precios y composición habitual; cantidades, costos y proveedores sugeridos. Incluye revisión anual y revisión quinquenal. El catálogo propone; el trabajo realizado conserva sus valores propios. | M02, M10, M14. |
| M06 | Servicios: borrador y confirmación | P0 | Selección del vehículo, personas, oferta e ítems; preparación editable de la ficha y sus intervenciones; ajuste a lo realmente realizado; confirmación de un servicio ya efectuado. Coordina efectos técnicos, documentales y obligaciones en una transacción. No modela estados de taller o agenda. | M03–M05; coordina M07, M08, M10 y M14. |
| M07 | Resultados técnicos, obleas y revisiones | P0 | Obleas anteriores/nuevas cuando corresponda, revisión anual, revisión quinquenal, ensayo PH por cilindro, resultados, certificados y vencimientos. Registra el identificador externo que se obtiene al cargar manualmente en SICGNC. No integra ni automatiza SICGNC. | M02, M04, M06, M14. |
| M08 | Fichas técnicas, PDF y rectificaciones | P0 | Ficha acorde con el modelo aportado, snapshot autocontenido, versión de plantilla, PDF descargable e imprimible y rectificaciones enlazadas. Una ficha confirmada no se sobrescribe. La conservación de documentos firmados digitalizados es posterior. | M02–M04, M06, M07, M14. |
| M09 | Cobros y deuda del servicio | P0 | Cobros completos, parciales, anticipos y pagos combinados por medio de pago, aplicados desde su origen a un servicio concreto. Saldo pendiente por servicio y anulaciones administrativas auditadas. No mantiene saldos generales a favor de clientes. | M01, M03, M06, M14; recibe aplicaciones de M12. |
| M10 | Proveedores, obligaciones, pagos y gastos | P0 | Proveedores, costos atribuibles, obligaciones nacidas de servicios confirmados, pagos efectivos y gastos generales. Distingue costo, deuda y egreso. No es un sistema de compras, impuestos ni contabilidad formal. | M01, M06, M14. |
| M11 | Perspectivas financieras y consultas básicas | P0 | Consulta de cobros, egresos, deuda por servicio/proveedor y saldos real y teórico derivados de hechos, con filtros de fecha y detalle de origen. No permite editar saldos, conciliar bancos ni registrar apertura histórica. | M09, M10, M12, M14. |
| M12 | Convenios, cupones y liquidaciones básicas | P1 | Entidades pagadoras, convenios, cupones ligados a servicios, agrupación de cupones disponibles, presentación y cobro completo de liquidaciones con asignación a los servicios incluidos. Excluye diferencias y pagos parciales complejos. | M03, M06, M09, M14. |
| M13 | Vencimientos y alertas internas | P1 | Alertas técnicas y financieras calculadas desde vencimientos registrados; anticipación configurable y consulta en la aplicación según permisos. No envía WhatsApp/email ni inventa vencimientos faltantes. | M01, M07, M09, M10, M12. |
| M14 | Auditoría y trazabilidad transversal | P0 | Autor, fecha, acción, entidad, motivo y vínculo entre confirmaciones, rectificaciones, cobros, anulaciones, pagos y cambios de permisos. Consulta administrativa. No sustituye los hechos de negocio ni almacena secretos. | Identidad M01 y todos los módulos mutadores. |
| M15 | Operación, despliegue y copias de seguridad | P1 | Capacidad técnica transversal: despliegue online, HTTPS, respaldo automático externo, retención y restauración comprobada. No representa un módulo comercial ni obliga a desarrollar una pantalla de gestión del servidor. | Aplicación completa, PostgreSQL y archivo privado de PDF. |

Las dependencias expresan colaboración y orden de construcción. M01 y M14 comparten contratos internos de identidad/auditoría, sin importaciones circulares. M06 actúa como coordinador y las demás capacidades exponen operaciones explícitas; ninguna escribe directamente en las tablas de otra por conveniencia.

## 4. Criterios verificables por módulo

| ID | Evidencia esperada al implementar |
| --- | --- |
| M01 | Una cuenta desactivada no inicia nuevas sesiones y se revocan sus sesiones vigentes. Una petición directa de operador a Caja Real o anulación de cobros es rechazada aunque se fabrique fuera de la interfaz. Puede continuar un borrador ajeno y consultar la historia técnica del vehículo, sin recibir costos ni movimientos financieros ajenos en esas respuestas. Cada acción conserva su usuario real. |
| M02 | Se configura el taller y sus sujetos relacionados sin convertir automáticamente un PEC/CRPC en proveedor. Modificar una referencia no altera la ficha ya confirmada; la próxima ficha toma los valores vigentes. |
| M03 | Se recupera una persona y su vehículo sin volver a ingresar datos existentes. Se puede documentar titular, contacto y pagador diferentes. Los identificadores presentes se validan y los posibles duplicados se muestran antes de crear nuevos registros. |
| M04 | Un vehículo no conserva dos configuraciones vigentes. Un componente individual no figura instalado simultáneamente en dos vehículos. Cada válvula se vincula explícitamente con su cilindro, conservando identidad e historia de sus recambios. Se reconstruye la configuración utilizada en un servicio anterior y se representan hasta cuatro cilindros. |
| M05 | Cambiar el precio o la composición de una oferta no modifica los servicios ya confirmados. Un servicio puede registrar cantidades o componentes reales diferentes a la propuesta comercial y conserva su descripción e importes históricos. |
| M06 | Guardar y recuperar un borrador conserva su preparación técnica/documental editable, pero no emite oblea, confirma una revisión, modifica la configuración ni crea obligación con proveedor. Una confirmación exitosa crea todos sus hechos dependientes una sola vez; un error antes del commit los revierte juntos y dos solicitudes concurrentes no duplican el trabajo. |
| M07 | Se distingue PH de reemplazo de cilindro. PH/quinquenal por sí sola usa R y oblea nueva; conversión usa C e incluye PH; modificación también emite nueva oblea. PH motivada por vencimiento de la última prueba usa R aun con oblea vigente, que también se renueva. Habilitación es la fecha del trabajo; duraciones de oblea y PH: uno y cinco años, con vigencia hasta el último día del mes indicado inclusive. Conservar precisión conocida sin inventar días de ensayo. «Revisado» muestra la última PH. Conservar una válvula no crea acciones ni costos ficticios. Confirmar PH exige resultado real; certificado opcional si no está disponible, manteniendo el CRPC requerido por el modelo. |
| M08 | El PDF conserva los grupos aplicables y hasta cuatro pares cilindro–válvula, uno por fila; en recambio imprime la pareja resultante y la saliente en Observaciones con código, serie y D/B, identificando el cilindro. Conserva ambas válvulas y su vínculo histórico. Se imprime sin cortes, incluidos hasta cuatro recambios, y con espacios para firmas y sellos manuales posteriores, sin exigir firma digital ni imágenes. Cambiar maestros no altera snapshot ni PDF archivado. Rectificar crea una versión enlazada con motivo. Un fallo del generador permite reintentar sin duplicar el servicio. |
| M09 | Para un servicio de ARS 100.000, un cobro de ARS 30.000 deja ARS 70.000 pendientes. Un cobro combinado conserva el importe de cada medio y suma el total registrado. Cada anticipo referencia un servicio concreto. La anulación conserva el movimiento original y sólo la realiza un administrador. |
| M10 | Un costo de proveedor de ARS 20.000 genera una obligación al confirmar el servicio. Pagar ARS 8.000 deja ARS 12.000 pendientes. Si se paga ARS 3.000 en efectivo y ARS 5.000 por transferencia, ambas fracciones integran una operación atómica y se descuentan una sola vez; su cabecera y asignaciones no agregan otros egresos. Un costo absorbido no produce un pago ficticio. Un gasto general efectivo conserva concepto, fecha y autor. |
| M11 | Cada total se explica por movimientos identificables. Con ARS 30.000 cobrados, ARS 20.000 de obligación y ARS 8.000 pagados al proveedor, sin otros hechos: saldo real ARS 22.000 y saldo teórico ARS 10.000. Pagar los ARS 12.000 restantes deja ambos en ARS 10.000, sin descontar dos veces la obligación. |
| M12 | Un cupón no integra dos liquidaciones activas ni se liquida para otra entidad. Agrupar/presentar no crea un cobro efectivo. Al registrar el cobro completo, el total distribuido a los servicios coincide con el dinero recibido y se registra una sola vez. |
| M13 | Para una fecha y anticipación configuradas, aparecen todos los vencimientos registrados del ámbito autorizado que cumplen el criterio, incluidos vencidos. Cambiar el plazo modifica la selección. Un operador no obtiene importes de deuda global mediante el endpoint de alertas. |
| M14 | Una confirmación, una rectificación y una anulación se rastrean hasta usuario, momento y entidad afectada. El usuario no puede editar o borrar su auditoría. Los registros no contienen contraseñas, cookies ni tokens completos. |
| M15 | El sistema se accede por HTTPS, la base no se expone públicamente, un respaldo incluye datos y PDF y una restauración en entorno aislado recupera una muestra consistente. Quedan fecha, duración, resultado y desvíos respecto de RPO de 24 horas y RTO de 4 horas. |

## 5. Reglas que atraviesan varios módulos

### 5.1 Anticipos y borradores

La propuesta compromete anticipos por servicio y establece que guardar un borrador no produce efectos financieros. El diseño distingue dos acciones: **preparar el servicio** y **registrar dinero recibido**. Un anticipo requiere un servicio identificado, que puede estar en borrador; lo registra explícitamente M09 como hecho efectivo. No lo genera guardar o confirmar el borrador.

El anticipo requiere total acordado, pagador, medio, fecha e importe. Los cobros netos no pueden superar el total acordado; una edición del borrador no puede dejarlo por debajo de lo ya cobrado sin resolver explícitamente la diferencia.

Un borrador con cobros vinculados no puede eliminarse silenciosamente. Si el registro de cobro era erróneo, el administrador puede anularlo con trazabilidad. Si hubo dinero recibido y luego devuelto, se conserva el ingreso y se registra la devolución como egreso: anular un registro no representa una devolución real. No se traslada el importe a un saldo general del cliente. El equipo ratificó esta regla el 02/10/2026 y pidió resolver el caso excepcional mediante los egresos existentes, sin desarrollar un módulo independiente. El egreso conserva el vínculo al cobro; una vez resuelto el anticipo se cancela el borrador, preservando su motivo, autoría e historia y retirándolo de los pendientes operativos. Los permisos de devolución y anulación siguen reservados al administrador.

### 5.2 Confirmación y documentos

Antes de confirmar, el servicio puede conservar datos incompletos de preparación de ficha e intervenciones propuestas, incluidos resultados ingresados para revisión. Estos datos siguen editables y no son resultados confirmados. Confirmar representa un trabajo ya realizado: valida la preparación y la transacción guarda servicio, ítems históricos, cambios técnicos, resultados, snapshot y obligaciones aplicables. La producción del archivo PDF ocurre después, desde el snapshot persistido; su fallo no vuelve a ejecutar los hechos del servicio. La arquitectura detalla el reintento y la conservación del documento.

### 5.3 Finanzas explicables

Los medios de pago describen cobros o egresos efectivos. Un cupón, una liquidación presentada, una venta y una obligación no son dinero recibido. El saldo teórico descuenta la deuda con proveedores pendiente; al pagar, la disminución del dinero y la de esa deuda se compensan, evitando computar dos veces el costo. El sistema comienza en la fecha de corte, sin saldos históricos ni conciliación bancaria.

### 5.4 Responsabilidad regulatoria

El formulario aportado sirve como fuente de requisitos y como referencia visual. El sistema asiste el registro y la impresión; no aprueba ensayos, habilita vehículos ni reemplaza SICGNC. El significado final del identificador externo y las excepciones admitidas para rectificar documentos se validarán con la tutora y los responsables del circuito antes de implementar esas reglas.

### 5.5 Interfaz operativa

El equipo confirmó el 02/10/2026 una interfaz con temas oscuro y claro, acento amarillo, menú lateral adaptable y tablas de consulta. Los formularios pueden reorganizarse para el flujo aprobado, priorizando búsqueda rápida, recuperación de datos y claridad al confirmar un servicio. La colaboración técnica debe permitir retomar un borrador sin duplicar personas, vehículos ni trabajos.

## 6. Orden de construcción posterior a la aprobación

| Incremento | Módulos involucrados | Recorrido completo que debe quedar verificable |
| --- | --- | --- |
| 1. Base y acceso | M01, M14 y base de M15 | Acceso autorizado, permisos efectivos, persistencia y despliegue inicial con trazabilidad. |
| 2. Servicio y documento | M02–M08, con la parte de M10 necesaria para registrar costos/obligaciones | Recuperar vehículo, preparar y confirmar trabajo, conservar historia y descargar ficha. |
| 3. Registro financiero | M09–M11 | Cobrar parcial o combinado, registrar costos/deudas, pagar y explicar los dos saldos. |
| 4. Convenios y vencimientos | M12, M13 | Liquidar cupones de forma básica y consultar alertas derivadas. |
| 5. Validación final y continuidad | Todos, con M15 completo | Recorridos críticos, permisos, PDF impreso y restauración documentada. |

Las pruebas, la auditoría y la documentación acompañan cada incremento. El orden no autoriza omitir módulos P1 ni ampliar el alcance. El equipo confirmó el 02/10/2026 la entrega final del 14/11/2026 y 40 horas semanales combinadas, con la última semana reservada para estabilización, informe, manuales y video. Los pendientes de interpretación de fichas se revisarán con el propietario y el responsable técnico antes de cerrar los servicios y la emisión de PDF afectados; no impiden construir la base y el acceso.

## 7. Capacidades posteriores y exclusiones

| Capacidad posterior | Límite del MVP que se mantiene |
| --- | --- |
| Planes de cuotas con calendarios avanzados | Cobros parciales por servicio sin motor de financiación. |
| Diferencias, retenciones y pagos parciales complejos de liquidaciones | Cobro básico completo de cupones agrupados. |
| Inventario integral de componentes | Identidad e historia técnica; sin gestión integral de existencias o compras. |
| Informes y exportaciones avanzadas | Consultas y totales básicos explicables. |
| Digitalización de documentación firmada | Snapshot y PDF generado por el sistema. |
| WhatsApp/email automáticos | Alertas internas. |
| Métricas y tableros avanzados | Información operativa y financiera necesaria para el MVP. |

Continúan fuera de alcance la facturación fiscal/ARCA, contabilidad formal, automatización de SICGNC, aplicación nativa, portal de clientes, microservicios, migración masiva en papel y cuentas corrientes generales. Ninguna carpeta, entidad o decisión técnica incorpora por sí sola una de estas funcionalidades.

## 8. Aprobación

El listado se interpreta junto con el [diseño de datos](MODELO_DATOS.md) y la [arquitectura](ARQUITECTURA.md). La devolución de la tutora y la distinción entre aprobación académica, precisiones del equipo y validaciones técnicas pendientes están registradas en [APROBACION.md](APROBACION.md).
