# CILGAS

CILGAS administra servicios relacionados con equipos de GNC y necesita conservar una visión confiable de su operación.

## Lenguaje

**Trazabilidad integral**:
Capacidad de reconstruir de manera confiable la relación entre clientes, vehículos, equipos de GNC, trabajos realizados, documentación, vencimientos, cobros y obligaciones.
_Evitar_: Digitalización, sistema informático

**Prueba hidráulica**:
Ensayo técnico realizado sobre uno o más cilindros; puede formar parte de una revisión o de una conversión y no implica necesariamente reemplazarlos.
_Evitar_: Revisión quinquenal, cambio de cilindro

**Servicio de PH**:
Trabajo de CILGAS que incluye la prueba hidráulica y una oblea nueva; cuando se realiza por sí solo, se documenta como revisión anual con indicación de PH.
_Evitar_: Ensayo aislado sin oblea, reemplazo de cilindro

**Conversión**:
Instalación de un equipo de GNC desde cero en un vehículo. En el circuito informado por CILGAS incluye una prueba hidráulica y se documenta con la operación C y la indicación de PH.
_Evitar_: Componentes necesariamente nuevos, revisión anual

**Renovación de oblea**:
Trabajo que renueva la oblea del vehículo y se documenta como revisión anual, operación R; esa marca por sí sola no acredita una PH.
_Evitar_: Prueba hidráulica, revisión quinquenal

**Modificación**:
Intervención documentada con la operación M sobre un equipo o sus datos mientras la oblea aún está vigente, como un cambio de válvula, dominio o una corrección del trabajo.
_Evitar_: Montaje M de un componente, rectificación automática de una ficha confirmada

**Desmontaje**:
Retiro del equipo del vehículo, conservando la posibilidad de volver a montarlo.
_Evitar_: Baja definitiva

**Baja técnica**:
Retiro definitivo de uso del equipo o componente afectado, que no queda disponible para volver a montarse.
_Evitar_: Desmontaje reutilizable, desactivación de un usuario

**Marca MSDB**:
Indicación documental por componente: M se monta, S sigue instalado, D se desmonta y B se da de baja. Es distinta de la operación general de la ficha C/M/R/D/B.
_Evitar_: M significa modificación del componente, estado completo del equipo

**Revisión quinquenal**:
Servicio realizado cada cinco años para revisar uno o más cilindros y renovar la habilitación correspondiente. En CILGAS incluye la revisión anual y una oblea nueva; el reemplazo de válvulas es una propuesta habitual ajustable por cilindro según el trabajo efectivamente realizado.
_Evitar_: Prueba hidráulica, revisión anual

**Ficha técnica**:
Documento que deja constancia de la operación realizada y de los componentes del equipo de GNC involucrados.
_Evitar_: Ficha del cliente, estado actual del vehículo

**Ficha confirmada**:
Fotografía histórica inmutable de los datos técnicos y regulatorios de un servicio realizado; una corrección posterior se conserva como rectificación. La firma manuscrita se realiza sobre la ficha impresa después de generarla.
_Evitar_: Formulario editable, estado actual del equipo

**Servicio del catálogo**:
Oferta configurable de CILGAS que propone un trabajo, un precio y una composición habituales.
_Evitar_: Trabajo realizado, operación concreta

**Servicio realizado**:
Trabajo concreto que CILGAS efectúa para un vehículo bajo condiciones técnicas, comerciales y financieras propias.
_Evitar_: Servicio del catálogo, prestación

**Borrador de servicio**:
Registro preparatorio cuyo guardado no produce efectos técnicos, documentales ni financieros. Puede recibir un anticipo mediante una acción explícita de cobro independiente; si existen cobros vinculados, su edición y descarte deben respetarlos.
_Evitar_: Servicio realizado

**Borrador cancelado**:
Registro de un trabajo que finalmente no se realizó, conservado con su motivo y la historia de los anticipos recibidos y resueltos, si los hubo.
_Evitar_: Servicio realizado, servicio eliminado

**Configuración del equipo**:
Conjunto de componentes que integran el equipo de GNC de un vehículo durante un período de su historia; sólo una configuración puede estar vigente a la vez.
_Evitar_: Ficha técnica, lista mutable de componentes

**Rectificación**:
Nueva versión que corrige una ficha confirmada sin alterar ni ocultar la versión anterior.
_Evitar_: Edición, sobrescritura

**Persona relacionada con el servicio**:
Persona registrada como titular del vehículo, contacto o pagador, sin que ello le otorgue acceso al sistema.
_Evitar_: Usuario del sistema

**Usuario del sistema**:
Persona autorizada por CILGAS para acceder a la aplicación y ejecutar las acciones permitidas por su rol.
_Evitar_: Cliente, titular, pagador

## Comercial y finanzas

**Convenio**:
Acuerdo comercial con una entidad pagadora que autoriza trabajos mediante cupones y los cancela posteriormente mediante liquidaciones.
_Evitar_: Tipo de oblea, cliente particular

**Liquidación**:
Agrupación de cupones disponibles de un convenio que CILGAS presenta a la entidad correspondiente para su cobro.
_Evitar_: Cobro, cierre de caja

**Cobro**:
Ingreso de dinero efectivamente recibido y aplicado a un trabajo concreto.
_Evitar_: Venta, importe facturado

**Devolución al cliente**:
Salida de dinero que reintegra total o parcialmente un cobro recibido por un servicio concreto. Conserva la historia del ingreso y de su devolución.
_Evitar_: Anulación del cobro, eliminación del servicio

**Obligación con proveedor**:
Deuda que nace al realizarse un trabajo por un costo atribuible a un proveedor, aunque todavía no haya sido pagada.
_Evitar_: Pago, egreso efectivo

**Saldo real**:
Flujo neto acumulado desde la puesta en marcha, calculado exclusivamente con cobros y egresos efectivamente registrados.
_Evitar_: Dinero disponible, saldo bancario, saldo teórico

**Saldo teórico**:
Saldo real menos las obligaciones pendientes con proveedores: reconoce esas obligaciones desde que nacen y no vuelve a descontar sus pagos ya incluidos en los egresos efectivos.
_Evitar_: Saldo real, dinero disponible

## Actores regulatorios

**Productor de Equipos Completos (PEC)**:
Sujeto regulado responsable de las operaciones informadas sobre equipos completos de GNC.
_Evitar_: Proveedor de componentes

**Centro de Revisión Periódica de Cilindros (CRPC)**:
Sujeto regulado que revisa cilindros y emite el resultado técnico correspondiente.
_Evitar_: Taller de Montaje

**Taller de Montaje (TdM)**:
Sujeto regulado habilitado para intervenir sobre la instalación vehicular del equipo de GNC.
_Evitar_: CRPC, taller genérico
