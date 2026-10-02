# Modelo de datos — CILGAS

Segunda entrega · Diseño propuesto · 27/09/2026.

Este modelo desarrolla los conceptos acordados en [CONTEXT.md](../../CONTEXT.md), los [ADR 0002–0004](../adr/) y los campos observados en el [relevamiento de las cinco fichas](RELEVAMIENTO_FICHAS.md). La etapa 2 está aprobada según la devolución registrada en [APROBACION.md](APROBACION.md); las reglas regulatorias pendientes mantienen su validación específica.

## Documentos que componen el esquema

El [ER físico completo](../../database/DIAGRAMA_ER.md) incluye las 42 tablas, todos los campos, tipos y marcas PK/FK/UQ. Se divide en 11 vistas para facilitar su lectura; las relaciones que cruzan vistas se presentan en tablas. El [diccionario](../../database/DICCIONARIO_DATOS.md) completa nulabilidad, significados, restricciones e índices. El [DDL](../../database/01-esquema.sql) es la definición estructural verificable. No hay código de aplicación.

## Organización del modelo

| Área | Tablas | Responsabilidad |
| --- | --- | --- |
| Acceso y control | `roles`, `permisos`, `roles_permisos`, `usuarios`, `sesiones`, `auditoria` | Autenticación local, capacidades y trazabilidad de acciones. |
| Personas y contexto | `personas`, `vehiculos`, `vehiculo_personas`, `actores_regulatorios`, `proveedores` | Identidades separadas: usuario, titular/contacto/pagador, proveedor y PEC/TdM/CRPC. |
| Componentes individuales | `modelos_componentes`, `componentes` | Identidad persistente de cilindros, válvulas y reguladores. |
| Oferta y trabajo | `catalogo_servicios`, `catalogo_items`, `servicios`, `servicio_personas`, `servicio_items`, `servicio_costos` | Diferencia entre propuesta habitual y composición, precios y costos concretos. |
| Preparación técnica | `servicio_preparacion`, `servicio_intervenciones` | Datos editables de ficha, fechas, obleas, acciones y PH antes de confirmar. |
| Equipo e historia física | `configuraciones`, `configuracion_componentes`, `configuracion_accesorios`, `movimientos_componentes` | Versiones del equipo, instalación final y custodia/intervención de cada componente. |
| Documentación y resultados | `documentos`, `fichas`, `ficha_componentes`, `obleas`, `revisiones_cilindros` | Snapshots versionados, PDF, obleas y ensayos individuales. |
| Convenios | `convenios`, `cupones`, `liquidaciones` | Autorización, agrupación y presentación a una entidad pagadora. |
| Hechos financieros | `medios_pago`, `operaciones_cobro`, `cobros`, `obligaciones`, `operaciones_egreso`, `egresos`, `pagos_obligaciones` | Ingresos, salidas, deuda y aplicación de pagos sin duplicar dinero. |
| Alertas | `reglas_alerta`, `alertas` | Avisos internos con FK al hecho que vence y anticipación configurable. |

Las tablas responden a identidades, relaciones y hechos con ciclos distintos; no representan 42 módulos. No se agregan inventario comercial, compras, contabilidad formal, planes de cuotas ni integración automática con SICGNC.

## Relaciones y cardinalidades principales

| Relación | Cardinalidad / restricción | Interpretación |
| --- | --- | --- |
| Rol–usuario | 1 a N; un rol por usuario | Propietario e hijo comparten capacidades administrativas, conservando usuarios individuales. |
| Rol–permiso | N a M | Capacidades configuradas en la tabla intermedia. |
| Persona–vehículo | N a M a lo largo del tiempo | Relaciones con fecha; un único titular vigente en el MVP. Titular/contacto/pagador del servicio se registran por separado. |
| Vehículo–servicio | 1 a N | El historial no vive dentro de la persona y no cambia al transferir el vehículo. |
| Catálogo–servicio | 1 a N | El servicio copia valores; cambios futuros del catálogo no recalculan el pasado. |
| Servicio–antecedente | 0..1 antecedente por servicio; máximo un sucesor directo no cancelado | Una renovación es otro servicio. Puede haber borradores cancelados históricos y un único sucesor activo; no extiende silenciosamente el vencimiento anterior. |
| Servicio–ítem/costo | 1 a N | Composición variable y varios proveedores para un mismo trabajo. |
| Servicio–preparación | 1 a 0..1 cabecera y 0..N intervenciones | Puede estar incompleto mientras es borrador. La confirmación exige lo aplicable al trabajo. |
| Vehículo–configuración | 1 a N; máximo una vigente | Cada versión describe un período; la primera puede ser un relevamiento sin servicio ficticio. |
| Configuración–componente | N a M histórico | Un componente conserva identidad al pasar por configuraciones; no puede quedar instalado simultáneamente en dos vehículos. |
| Configuración–regulador | 0..1 | El máximo aplica a la instalación final. |
| Configuración–cilindro/válvula | 0..4 por tipo | En un equipo habilitado, cilindro y válvula instalados se vinculan por posición; el backend valida los pares y las excepciones por operación. |
| Ficha–regulador documentado | 0..3 renglones | Permite registrar montaje, desmontaje y baja por separado. No limita a uno los componentes intervenidos en un trabajo. |
| Ficha–cilindro/válvula documentado | 0..4 por sección | Los renglones de cilindro y válvula son independientes; no se emparejan por el mero orden impreso. |
| Ficha–accesorio | 0..N | Se contemplan todos los sectores de accesorios observados; no se les aplica el límite de cuatro. |
| Servicio–ficha | 1 a N versiones | Una versión inicial y una cadena de rectificaciones, sin bifurcaciones. |
| Servicio–oblea | 1 a 0..1 | Operaciones como desmontaje/baja pueden no generar oblea nueva. |
| Servicio–revisión de cilindro | 1 a 0..4 en el MVP | Un ensayo por cilindro en ese trabajo. PH es independiente de la marca C/M/R/D/B. |
| Convenio–cupón | 1 a N | Un cupón autoriza un servicio; la entidad pagadora no altera el tipo técnico de oblea. |
| Liquidación–cupón | 1 a N al entregar | Sólo cupones disponibles del mismo convenio; en borrador puede estar vacía. |
| Liquidación–operación de cobro | 1 a 0..1 activa | El MVP cobra el total del lote; los importes se distribuyen a los servicios de sus cupones. |
| Operación–cobro | 1 a N | Permite efectivo y transferencia; cada fracción apunta desde el inicio a un servicio. |
| Costo de proveedor–obligación | 1 a 0..1 | Al confirmar se crea exactamente una deuda por costo externo; el borrador no la crea. |
| Operación de egreso–egreso | 1 a N | Un pago puede salir por varios medios; se anula el grupo completo si hubo error de registro. |
| Egreso–obligación | N a M por `pagos_obligaciones` | Un desembolso paga varias deudas y una deuda admite pagos parciales. La aplicación no es otro egreso. |

## Preparación, confirmación y resultados

`servicios`, `servicio_personas`, `servicio_items`, `servicio_costos`, `servicio_preparacion` y `servicio_intervenciones` permiten guardar un borrador completo sin producir resultados. Los campos parciales admiten ausencia; al confirmar, el backend deberá exigir identidad y datos suficientes según el tipo de operación validado con CILGAS.

La cabecera de preparación conserva PEC, TdM, oblea anterior/nueva y fechas. Cada intervención conserva sección, renglón, componente, código, serie, condición, marca M/S/D/B, fechas mes/año, CRPC y resultados PH. `posicion_final` indica la instalación prevista cuando corresponda; **no se deriva automáticamente de la marca documental**. Los accesorios conservan código/serie en los renglones y en la configuración correspondiente.

`servicio_intervenciones` y `ficha_componentes` representan renglones documentales, no el registro exhaustivo de acciones técnicas. Los `servicio_items` identifican todas las acciones concretas y, al confirmar, `movimientos_componentes` conserva cada retiro e instalación. Por ejemplo, reemplazar las válvulas de cuatro cilindros admite ocho ítems y ocho movimientos —cuatro retiros y cuatro instalaciones—, aunque la configuración final tenga sólo cuatro válvulas. Un ítem de retiro puede tener importe cero: registrar la acción no crea un cargo ficticio.

La correspondencia de esas ocho acciones con las cuatro casillas de válvulas del formulario debe validarse con CILGAS en RF-02/PV-03 antes de implementar la emisión. No se presume qué acciones pueden omitirse del papel ni se inventan anexos o páginas adicionales. Si los renglones obligatorios según la matriz validada no caben en la plantilla, el futuro backend deberá impedir confirmar o emitir una ficha incompleta hasta resolver el formato con el responsable técnico. El diseño conserva los hechos técnicos, pero no declara validada la impresión de ese caso.

La confirmación deberá ejecutarse en una transacción, con bloqueo del servicio, vehículo y componentes afectados:

1. Revalidar permisos, estado, importes, antecedentes y completitud técnica.
2. Fijar composición, precio, costos y personas del trabajo concreto.
3. Cerrar la configuración anterior si cambia el equipo y registrar la nueva versión y movimientos. Cuando el equipo no cambia, conservar la versión vigente.
4. Crear oblea y ensayos aplicables, sin confundir ensayo PH con recambio del cilindro ni con el servicio comercial de revisión quinquenal.
5. Crear obligaciones sólo por costos con proveedor. Un costo absorbido queda como dato informativo y no fabrica una salida de dinero.
6. Crear el snapshot y los renglones de la ficha confirmada; marcar su PDF pendiente y registrar auditoría.
7. Confirmar conjuntamente la transacción. Después, generar y vincular el PDF a partir del snapshot comprometido.

Ante un fallo de PDF, el trabajo permanece confirmado con `pdf_estado = ERROR`; el reintento usa el mismo contenido y la misma plantilla versionada. Los metadatos de generación pueden completarse sin alterar el contenido histórico. Una corrección de datos documentales emite otra versión de ficha.

Un anticipo es una **operación financiera explícita**, permitida contra un borrador con importe acordado. No es un efecto de guardar el borrador. Si se cancela el trabajo, sus cobros se resuelven según las [reglas financieras](REGLAS_NEGOCIO.md); no se borra el servicio con historia económica.

## Identidad, meses y movimientos

Los componentes serializados usan un modelo común con `tipo` y FK compuestas `(id, tipo)`. Esto impide enlazar una válvula como cilindro en un ensayo o mezclar un CRPC con un PEC. No hay columnas de negocio `tipo_entidad/id_entidad` que sustituyan una FK.

`fabricacion_mes` y `revision_mes` representan mes/año. El día 1 es una codificación técnica necesaria por el tipo `date`, nunca un dato leído del papel. La UI y el PDF deben solicitar/mostrar sólo mes y año. Las fechas de ensayo y habilitación, cuando se conocen completas, usan columnas `date` diferentes.

Los movimientos registran procedencia/destino como vehículo, CILGAS, cliente, proveedor o descarte. Retirar no significa dar de baja ni incorporar a stock comercial. El destino posterior de cilindros usados es un pendiente de validación; se permite documentar destino desconocido con observación, sin inventar reglas de reventa.

Los códigos de homologación, matrículas, documentos, patentes y series permanecen como texto. La identidad de componente se deduplica por modelo y serie; si los responsables técnicos confirman otra regla de unicidad, se ajustará antes de implementar.

## Contrato del snapshot de ficha

`fichas.contenido` es JSONB **autocontenido**, no una colección de IDs a maestros mutables. `snapshot_version = 1` identifica el siguiente contrato inicial propuesto. Las claves agrupadoras son objetos; las colecciones son listas. Los datos ausentes se expresan con `null` cuando el campo corresponde pero no se conoce, o con una lista vacía cuando no hay elementos. El futuro backend validará estructura, tipos, obligatoriedad por operación y coherencia con las filas relacionadas antes de confirmar.

| Grupo / claves | Tipos y contenido histórico | Fuente |
| --- | --- | --- |
| `documento` | `numero` texto interno, `version` entero, `plantillaVersion` texto, `emitidaEn` instante ISO 8601, `observaciones` texto/nulo | Versión de ficha y preparación. |
| `servicio` | `id` identificador de trazabilidad, `fecha` fecha ISO, `descripcion` texto, `tipoComercial` texto, `operacionCodigo` C/M/R/D/B, `operacionDescripcion` texto, `incluyePH` booleano | Servicio concreto. No inferir PH sólo de R. |
| `habilitacion` | `fecha` y `vencimiento` fecha/nulo, `obleaAnterior` y `obleaNueva` texto/nulo | Preparación y resultado de oblea. |
| `pec` y `taller` | `codigo`, `nombre`, `cuit`, `domicilio`, `localidad`, `telefono`, `responsableTecnico`, `matriculaResponsable`: textos/nulo según corresponda | Copia de actor seleccionado, no lectura dinámica al reimprimir. |
| `titular` | `nombreRazonSocial`, `documentoTipo`, `documentoNumero`, `calle`, `numero`, `pisoDepto`, `localidad`, `provincia`, `codigoPostal`, `telefono`, `email`: textos/nulo | Persona titular del servicio. |
| `contacto` y `pagador` | Objetos persona con identidad documental y contacto, o nulo si no corresponde | Roles del servicio; no implica que se impriman datos innecesarios. |
| `vehiculo` | `dominio`, `marca`, `modelo`, `motorNumero`, `chasisNumero`, `tipo`, `tipoOtroDetalle`, `uso`: textos/nulo; `anio`: entero; `inyeccion`: booleano/nulo | Copia de vehículo. Inyección conserva Sí/No/Sin informar. |
| `reguladores` | Hasta tres objetos con `renglon`, `codigoHomologacion`, `numeroSerie`, `condicion`, `accion` M/D/B | Intervenciones en reguladores. |
| `cilindros` | Hasta cuatro objetos con `renglon`, `codigoHomologacion`, `numeroSerie`, `condicion`, `fabricacionMes` y `revisionMes` (`YYYY-MM`), `crpcCodigo`, `accion` M/S/D/B | Intervenciones en cilindros. |
| `valvulas` | Hasta cuatro objetos con `renglon`, `codigoHomologacion`, `numeroSerie`, `accion` M/S/D/B | Intervenciones en válvulas, sin deducir correspondencia por renglón. |
| `accesorios` | Lista de objetos `renglon`, `descripcion`, `codigoHomologacion`, `numeroSerie`; no límite de cuatro | Sectores de manómetro, tubería, sujeción, electroválvulas, mezclador, venteo, carga, etc. observados. |
| `revisionesPH` | Lista de `cilindroCodigo`, `cilindroSerie`, `fechaEnsayo`, `venceEl`, `resultado`, `crpcCodigo`, `numeroCertificado`; campos de fecha/texto según aplique | Ensayos. Datos de certificado son propuesta de diseño, no campos acreditados por las fotografías. |
| `firmantes` | Lista de `rol`, `nombre`, `matricula` y `requiereEspacioFirma` booleano | Datos de identificación y espacios de firma. **No se inventan firmas ni se genera una firma digital.** |
| `rectificacion` | Nulo en versión inicial; objeto `versionAnterior` entero y `motivo` texto en una corrección | Cadena documental del mismo servicio. |

Las columnas relacionales de `ficha_componentes` son una proyección del mismo contenido para trazabilidad y consulta; se crean en la misma transacción y no son otra fuente editable. El PDF se genera exclusivamente desde el snapshot. Su clave privada, hash SHA-256, tamaño y MIME viven en `documentos`.

El identificador de SICGNC se registra manualmente en `servicios`, con fecha de carga: aplica también a desmontaje/baja sin oblea nueva. Esa carga posterior no modifica silenciosamente el snapshot. Si fuera necesario que aparezca en una nueva versión documental, deberá seguir el circuito de emisión/rectificación validado por el responsable técnico.

## Modelo financiero sin doble contabilización

Las cabeceras de operaciones coordinan fecha, responsable, total de control e idempotencia. Las tablas `cobros` y `egresos` contienen las fracciones efectivas por medio. **Las cabeceras no se suman otra vez**, y una liquidación entregada tampoco es ingreso.

Para hechos vigentes desde la puesta en marcha:

- Ingresos efectivos = suma de `cobros.importe` cuyas operaciones no están anuladas.
- Egresos efectivos = suma de `egresos.importe` cuyas operaciones no están anuladas.
- Pago aplicado a una obligación = suma de `pagos_obligaciones.importe_aplicado` vinculadas a egresos con operación vigente.
- Obligación pendiente = importe original de obligación vigente menos pagos aplicados vigentes.
- **Saldo real = ingresos efectivos − egresos efectivos.**
- **Saldo teórico = saldo real − suma de obligaciones pendientes.**

No se almacenan saldo real, saldo teórico, monto pagado ni deuda pendiente como columnas editables. No se exige que estos saldos sean positivos. Una obligación nace al confirmar; pagarla reduce real y pendiente por el mismo importe, por lo que no vuelve a descontarse en el teórico.

Una operación de cobro por liquidación distribuye el total a los servicios autorizados y admite medios combinados. La consulta suma sólo sus `cobros`; el cambio a COBRADA es un estado comercial. Pagos parciales complejos de liquidaciones siguen fuera del MVP.

Una devolución real mantiene el cobro original y agrega una operación de egreso `DEVOLUCION_CLIENTE` vinculada al cobro. Anular corrige un registro erróneo y no representa devolución. Anular un egreso de proveedor revierte simultáneamente la vigencia de sus aplicaciones, recuperando el pendiente; no se editan saldos manualmente.

Los filtros por período muestran flujos del período. Para un saldo acumulado a una fecha se consideran los hechos acumulados hasta ese corte; no se mezcla un flujo mensual con obligaciones de otro corte. La interfaz deberá indicar si una consulta histórica está reexpresada por anulaciones correctivas posteriores y permitir consultar la auditoría.

## Invariantes y responsabilidad de validación

| Invariante | PostgreSQL declarativo | Futuro backend transaccional / autorización |
| --- | --- | --- |
| Una configuración vigente por vehículo | Índice único parcial. | Cerrar/crear versión en la misma transacción, evitar solapamientos históricos y bloquear el vehículo. |
| Componente del tipo correcto | FK compuesta componente/modelo/tipo. | Validar estado técnico y ausencia de instalación simultánea en otro vehículo; bloquear los componentes involucrados. |
| Hasta cuatro cilindros/válvulas finales | CHECK de posición y PK por configuración/tipo/posición. | Comprobar pares por posición y compatibilidad de configuración según operación. |
| Regulador documental ≠ instalación final | Hasta tres renglones documentales; configuración admite uno. | Interpretar M/D/B sin instalar automáticamente todo lo impreso. |
| Un servicio confirmado es completo | CHECK de estado/fecha/usuario de confirmación. | Verificar campos requeridos, ítems, total, PH y documentos; no confirmar dos veces ni permitir edición ordinaria después. |
| Borrador técnico sin efectos | Tablas separadas de preparación y resultado. | No crear resultados/configuraciones/obligaciones al guardar; copiar en confirmación atómica. |
| Original y rectificación del mismo servicio | FK compuesta; versión única; un original; un sucesor por ficha. | Exigir anterior inmediato, secuencia continua y motivo válido; impedir modificar/borrar contenido emitido. |
| PDF reproducible | Estado, vínculo único y CHECK de metadatos. | Renderizar mismo snapshot/plantilla; sólo modificar estado/error/enlace, nunca contenido histórico. |
| Deuda corresponde al costo/proveedor/importe | FK compuesta y UQ sobre costo de origen. | Crear exactamente una por cada costo externo al confirmar; impedir deudas sobre borradores y cambios posteriores del costo. |
| Totales de operaciones exactos | Importes positivos y fracciones únicas por medio/servicio. | Comparar cabecera con suma de fracciones dentro de la transacción; idempotencia y anulación de todo el grupo. |
| No hay sobrecobro ni devolución excesiva | FK de cobro a servicio y de devolución al cobro. | Bloquear servicio/cobro, calcular cobros netos, impedir exceder total acordado o devolver más de lo recibido. |
| No hay sobrepago a proveedor | FK y PK de aplicación, importe positivo. | Bloquear deudas, mismo proveedor, operación PAGO_PROVEEDOR, aplicaciones = egreso y pagos ≤ deuda. |
| Obligación anulada no mantiene pagos vigentes | Metadatos coherentes de anulación. | Rechazar anulación mientras existan aplicaciones activas; resolver primero el hecho de pago según corresponda. |
| Cupón elegible, del mismo convenio y sin duplicación | FK compuesta a liquidación; servicio único; número único por convenio. | Sólo confirmados/autorizados no anulados, importes coherentes, lote no vacío al entregar; congelar al entregar. |
| Cobro del convenio único y repartido correctamente | Máximo una operación de cobro activa por liquidación. | Liquidación ENTREGADA, total completo, distribución exactamente a sus cupones/servicios, sin nuevo ingreso por estado COBRADA. |
| Alerta apunta a un solo objeto real | Cuatro FK alternativas + CHECK exactamente una + índices únicos. | Corresponder tipo de regla y FK, sólo resultados vigentes y vencimientos todavía aplicables; limitar ámbito por rol. |
| Renovación conserva el antecedente | FK al servicio previo e índice único parcial de sucesor no cancelado. | Mismo vehículo, anterior confirmado e impedir ciclos. Cancelar un borrador conserva su relación histórica y permite preparar otra renovación; reactivarlo exige que no exista otro sucesor activo. |
| Acceso mínimo e historia protegida | FK a usuarios, roles y capacidades. | Hash seguro/sesiones, acceso técnico compartido y movimientos financieros propios del operador, permisos de anulación/rectificación, auditoría y restricciones de escritura. |

No se incluyen triggers ni funciones de negocio en esta entrega. La inmutabilidad no se promete por un `CHECK`: deberá implementarse con rutas autorizadas, transacciones, permisos y pruebas de integración. La cuenta cotidiana de la aplicación no tendrá permisos administrativos sobre el esquema.

## Índices y decisiones prácticas

El DDL incluye los índices únicos de identidades de negocio, la unicidad parcial de configuración vigente y los accesos principales: servicios por vehículo/fecha y estado, componentes por configuración/historia, obligaciones por proveedor y vencimiento, movimientos por fecha, cupones disponibles, alertas pendientes y auditoría por agregado/fecha.

No se agrega un índice GIN general sobre los snapshots: las consultas operativas usan relaciones e índices conocidos; el JSONB se recupera por ficha para reproducción documental. Se revisará el plan de las consultas reales antes de añadir índices secundarios indiscriminadamente.

Las ventanas iniciales de alerta y la clasificación única del vehículo son propuestas revisables. La obligación documental por operación, las firmas, los códigos exactos, la identidad jurídica de PEC/TdM/CRPC y las excepciones de rectificación deben validarse conforme al [relevamiento](RELEVAMIENTO_FICHAS.md). Nada de esta documentación constituye certificación regulatoria ni aprobación académica.
