# Reglas de negocio e invariantes del diseño

Fecha: 27/09/2026. Documento derivado de la propuesta del repositorio, sus ADRs y las fichas relevadas. Las precisiones nuevas se presentan a revisión del equipo y la tutora; no se atribuyen a una aprobación que aún no consta.

## Operación y documentación

| ID | Regla | Consecuencia en el diseño |
| --- | --- | --- |
| RN-01 | Titular, contacto y pagador pueden ser personas distintas; no son cuentas de acceso. | Personas relacionadas separadas de usuarios y roles por servicio. |
| RN-02 | El catálogo propone una composición; el trabajo concreto registra lo realizado. | Ítems históricos con descripción, cantidad, precio y costo propios; un cambio del catálogo no cambia trabajos anteriores. |
| RN-03 | Guardar un borrador no confirma un trabajo. | No origina por sí solo oblea, revisión, configuración vigente, ficha confirmada ni obligación con proveedor. |
| RN-04 | La confirmación representa un servicio ya realizado. | Una transacción comprueba su integridad y registra resultados técnicos, snapshot y obligaciones. No se agrega un circuito de estados de taller. |
| RN-05 | Un vehículo tiene como máximo una configuración vigente, además de su historia. | Versiones con intervalos de vigencia; el cambio no sobrescribe componentes anteriores. |
| RN-06 | Cilindros, válvulas y reguladores tienen identidad individual. | Se distingue identidad del componente, instalación y acción en una ficha. No se identifica un cilindro sólo por su renglón. |
| RN-07 | Una ficha admite hasta cuatro cilindros; una oferta comercial habitual puede incluir menos. | Límite documental de posiciones y composición comercial independientes. |
| RN-08 | PH es un ensayo de una revisión de cilindro; no implica cambiarlo. | Resultado de revisión por cilindro separado de operación de ficha y de reemplazo. |
| RN-09 | Las fichas aportadas incluyen anotaciones PH junto con distintas operaciones impresas. | No se deriva PH exclusivamente de la letra R ni se inventa un código oficial de operación. |
| RN-10 | Los renglones pueden registrar montajes, desmontajes, bajas o continuidad según el código validado. | La lista documental de intervenciones no equivale a la configuración final del vehículo. |
| RN-11 | El reemplazo de válvulas es política operativa indicada en la propuesta de CILGAS. | El servicio registra las válvulas concretas retiradas y colocadas; no se presenta como obligación normativa general. |
| RN-12 | Una ficha confirmada es inmutable. | Snapshot autocontenido versionado, plantilla identificada y rectificación enlazada con motivo, usuario y fecha. |
| RN-13 | Corregir una ficha no autoriza a modificar silenciosamente cobros, deudas ni historia técnica. | La rectificación documental y los ajustes económicos tienen acciones explícitas, permisos y auditoría propios. |
| RN-14 | La generación de PDF usa exclusivamente el snapshot confirmado. | Un error de generación permite reintentar sin reconfirmar el servicio ni duplicar sus efectos. |
| RN-15 | SICGNC se opera manualmente fuera de esta aplicación. | Se conserva la referencia externa cuando se conoce; sin integración, automatización ni presunción de habilitación oficial. |
| RN-16 | PEC, TdM y CRPC tienen identidades y responsabilidades diferentes. | El modelo distingue funciones regulatorias y responsables; no infiere habilitaciones de un código o sello. |

## Cobros y anticipos

Todo cobro representa dinero recibido y se aplica desde su registro a un servicio identificado. No existen saldos a favor generales ni cuentas corrientes de clientes en el MVP. Los pagos combinados se descomponen por medio y se registran de forma atómica, evitando que una parte quede guardada si la otra falla.

**Precisión de diseño para los anticipos:** se puede registrar un cobro explícito contra un servicio en borrador. Esto no es un efecto de guardar el borrador y no produce efectos técnicos. El borrador con cobros no puede borrarse físicamente. Si el trabajo no se realiza, el administrador debe resolver el cobro: anular un registro erróneo o registrar una devolución efectiva, según corresponda. Una devolución real es un egreso trazable; no se borra el ingreso que efectivamente ocurrió.

El backend deberá impedir que los cobros netos superen el total acordado del servicio y modificaciones del borrador que dejen cobros netos por encima de ese total. Para este control, cobros netos = cobros efectivos vigentes − devoluciones efectivas vigentes vinculadas al servicio. La devolución nunca puede superar el importe neto previamente recibido. Un anticipo requiere un total acordado, pagador, medio, fecha e importe. El servicio puede estar confirmado con saldo pendiente.

## Finanzas sin doble contabilización

Los importes se almacenan con precisión decimal, en ARS, sin punto flotante. Fechas de hechos y de registro se conservan separadas cuando corresponda. No hay saldos iniciales migrados: el corte de puesta en marcha delimita el historial financiero.

Sean:

- **C:** suma de cobros efectivos vigentes.
- **E:** suma de egresos efectivos vigentes, incluidos pagos a proveedores y devoluciones.
- **O:** suma de obligaciones vigentes con proveedores.
- **P:** suma de pagos efectivos aplicados a esas obligaciones, que ya forman parte de E.

Entonces:

**Saldo real = C − E**

**Obligaciones pendientes = O − P**

**Saldo teórico = Saldo real − Obligaciones pendientes = C − (E − P) − O**

Las asignaciones de un egreso a obligaciones distribuyen un pago; no constituyen otro egreso. Una liquidación cobrada origina cobros aplicados a los servicios incluidos; su total no se suma nuevamente como un ingreso adicional.

| Caso acumulado | C | E | O | P | Real | Teórico |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Venta de $100.000, cobro parcial de $30.000 y obligación de $20.000 | 30.000 | 0 | 20.000 | 0 | 30.000 | 10.000 |
| Pago de $8.000 de esa obligación | 30.000 | 8.000 | 20.000 | 8.000 | 22.000 | 10.000 |
| Pago de los $12.000 restantes | 30.000 | 20.000 | 20.000 | 20.000 | 10.000 | 10.000 |
| Cobro de los $70.000 restantes del servicio | 100.000 | 20.000 | 20.000 | 20.000 | 80.000 | 80.000 |

El pago de una deuda ya reconocida no vuelve a reducir el teórico. Un costo absorbido por CILGAS no es por sí mismo ni una obligación externa ni una salida de dinero. La anulación de un pago erróneo revierte tanto el egreso como sus asignaciones en una operación auditada. Una salida real de dinero no se elimina mediante una anulación administrativa.

Las consultas por período distinguen **flujo del período** de **saldo acumulado a la fecha**: este último debe considerar todos los hechos desde el corte inicial hasta esa fecha. No se presentará el movimiento de un mes como saldo bancario ni como arqueo físico.

## Convenios y proveedores

| ID | Regla | Control previsto |
| --- | --- | --- |
| RF-01 | La obligación nace al confirmar el servicio cuyo costo corresponde a un proveedor. | Vínculo con origen, importe histórico y vencimiento. Un costo no se reconoce dos veces. |
| RF-02 | Una obligación puede recibir pagos parciales; un pago puede distribuirse entre obligaciones del mismo proveedor. | Asignación explícita, límites por obligación y por egreso, y bloqueo transaccional concurrente. |
| RF-03 | Registrar un cupón no equivale a cobrarlo. | La autorización comercial no genera ingreso efectivo. |
| RF-04 | Sólo cupones disponibles del mismo convenio ingresan en una liquidación. | Un cupón no puede pertenecer simultáneamente a dos liquidaciones vigentes. |
| RF-05 | El estado intermedio identifica la entrega al convenio. | Se distingue pendiente de entrega, entregado y cobrado. |
| RF-06 | El MVP contempla liquidación básica con cobro completo. | Cobros por servicio y medio; diferencias, quitas y parcialidades complejas se postergan. |
| RF-07 | Anulación no significa devolución. | Se corrige un registro que no representa el hecho; para dinero devuelto se conserva ingreso y egreso. |
| RF-08 | Las acciones sensibles deben ser atribuibles. | Usuario, fecha, motivo y relaciones de origen; permisos de administrador. |

## Límites de validación

El DDL incorpora claves, unicidad, referencias, rangos y coherencia dentro de una fila. Las sumas entre filas, transiciones de estado, autorización, inmutabilidad y coordinación entre módulos requieren lógica transaccional del backend en la etapa posterior. Se enumeran en el modelo para que no se confunda una regla documentada con una garantía ya implementada.

No se fijan por deducción presiones de ensayo, tolerancias, plazos regulatorios automáticos, equivalencia de códigos ni validez jurídica del PDF. Los datos reales y el criterio de emisión deben validarse con CILGAS y sus responsables técnicos. La documentación distingue las fechas de fabricación/revisión expresadas sólo como mes y año de las fechas completas; no inventa días del mes.
