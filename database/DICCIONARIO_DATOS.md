# Diccionario de datos — CILGAS

Diseño propuesto para revisión de la segunda entrega. Fecha: 27/09/2026. No representa aprobación de tutora/comité ni una base productiva.

Fuente de verdad estructural: [01-esquema.sql](01-esquema.sql). Este documento enumera todas las tablas y columnas del DDL, sus tipos, nulabilidad, claves y restricciones. Los diagramas y las reglas entre registros están en [MODELO_DATOS.md](../docs/segunda-entrega/MODELO_DATOS.md).

## Convenciones

- `bigint` con `GENERATED ALWAYS AS IDENTITY`: clave técnica generada por PostgreSQL; nunca tiene significado regulatorio.
- Importes `numeric(14,2)` en ARS. No se usan valores flotantes para dinero ni se almacenan saldos calculables.
- Fechas de calendario: `date`. Instantes: `timestamptz`; se muestran en America/Argentina/Buenos_Aires. Campos `*_mes`: `date` con día técnico 1, se muestran y capturan sólo como mes/año; NO afirman que el hecho ocurrió el primer día.
- Códigos, documentos, patentes y series: texto; conservan letras y ceros iniciales. La normalización de entrada pertenece al backend.
- Toda FK usa por defecto `NO ACTION`: no se propagan borrados sobre la historia. La aplicación usará bajas lógicas y anulaciones según el caso.
- PK = clave primaria; FK = clave foránea; UQ = restricción de unicidad. Las claves compuestas se detallan después de cada tabla.
- `Sí` en la columna Nulo permite ausencia; las PK siempre son no nulas aunque PostgreSQL lo deduzca.
- `JSONB` se reserva al contenido autocontenido de versiones de ficha; la preparación editable tiene tablas relacionales propias.

El esquema contiene **42 tablas**. Los índices de PK y UQ los crea PostgreSQL automáticamente. También se listan los índices explícitos de acceso y unicidad parcial.

## `roles`

| Campo | Tipo | Nulo | Claves / valor inicial | Significado |
| --- | --- | --- | --- | --- |
| `id` | `bigint` | No | PK; Identity | Identidad del rol. |
| `codigo` | `varchar(30)` | No | UQ | ADMINISTRADOR u OPERADOR. |
| `nombre` | `varchar(80)` | No | — | Nombre visible. |
| `descripcion` | `text` | No | — | Alcance general del rol. |

## `permisos`

| Campo | Tipo | Nulo | Claves / valor inicial | Significado |
| --- | --- | --- | --- | --- |
| `id` | `bigint` | No | PK; Identity | Identidad de capacidad autorizable. |
| `codigo` | `varchar(80)` | No | UQ | Código estable de capacidad. |
| `descripcion` | `text` | No | — | Acción habilitada. |

## `roles_permisos`

| Campo | Tipo | Nulo | Claves / valor inicial | Significado |
| --- | --- | --- | --- | --- |
| `rol_id` | `bigint` | No | PK compuesta; FK → `roles.id` | Rol que recibe la capacidad. |
| `permiso_id` | `bigint` | No | PK compuesta; FK → `permisos.id` | Capacidad concedida. |

Restricciones declarativas:

- `PRIMARY KEY (rol_id, permiso_id)`

## `usuarios`

| Campo | Tipo | Nulo | Claves / valor inicial | Significado |
| --- | --- | --- | --- | --- |
| `id` | `bigint` | No | PK; Identity | Identidad interna; no representa al cliente. |
| `rol_id` | `bigint` | No | FK → `roles.id` | Un rol por usuario en el MVP. |
| `nombre` | `varchar(120)` | No | — | Nombre del operador. |
| `email` | `varchar(254)` | No | — | Email normalizado para iniciar sesión. |
| `password_hash` | `text` | No | — | Hash seguro; nunca contraseña en claro. |
| `activo` | `boolean` | No | Default: `true` | Permite revocar el acceso sin borrar historia. |
| `creado_en` | `timestamptz` | No | Default: `CURRENT_TIMESTAMP` | Alta del usuario. |

Índices explícitos:

- `CREATE UNIQUE INDEX uq_usuarios_email ON usuarios (lower(email));`

## `sesiones`

| Campo | Tipo | Nulo | Claves / valor inicial | Significado |
| --- | --- | --- | --- | --- |
| `id` | `bigint` | No | PK; Identity | Identidad de sesión. |
| `usuario_id` | `bigint` | No | FK → `usuarios.id` | Usuario autenticado. |
| `token_hash` | `char(64)` | No | UQ | Huella del token opaco, no el token utilizable. |
| `creado_en` | `timestamptz` | No | Default: `CURRENT_TIMESTAMP` | Inicio de sesión. |
| `vence_en` | `timestamptz` | No | — | Expiración absoluta. |
| `revocado_en` | `timestamptz` | Sí | — | Cierre de sesión o revocación. |

Restricciones declarativas:

- `CHECK (vence_en > creado_en)`
- `CHECK (revocado_en IS NULL OR revocado_en >= creado_en)`

Índices explícitos:

- `CREATE INDEX ix_sesiones_usuario_vencimiento ON sesiones (usuario_id, vence_en);`

## `auditoria`

| Campo | Tipo | Nulo | Claves / valor inicial | Significado |
| --- | --- | --- | --- | --- |
| `id` | `bigint` | No | PK; Identity | Identidad de evento auditable. |
| `usuario_id` | `bigint` | Sí | FK → `usuarios.id` | Actor; puede faltar en un intento de acceso fallido. |
| `ocurrido_en` | `timestamptz` | No | Default: `CURRENT_TIMESTAMP` | Instante del hecho. |
| `accion` | `varchar(80)` | No | — | Acción sensible o evento de seguridad. |
| `entidad` | `varchar(80)` | No | — | Nombre del agregado afectado, como metadato de auditoría. |
| `entidad_clave` | `varchar(100)` | Sí | — | Identificador textual histórico; no sustituye una FK de negocio. |
| `resultado` | `varchar(15)` | No | — | Resultado del intento. |
| `detalle` | `text` | Sí | — | Motivo y diferencias mínimas; excluye contraseñas, tokens y fichas completas. |
| `correlacion_id` | `uuid` | Sí | — | Vincula eventos de una misma operación. |

Restricciones declarativas:

- `resultado`: `CHECK (resultado IN ('EXITO','RECHAZADO'))`

Índices explícitos:

- `CREATE INDEX ix_auditoria_fecha ON auditoria (ocurrido_en);`
- `CREATE INDEX ix_auditoria_entidad ON auditoria (entidad, entidad_clave, ocurrido_en);`

## `personas`

| Campo | Tipo | Nulo | Claves / valor inicial | Significado |
| --- | --- | --- | --- | --- |
| `id` | `bigint` | No | PK; Identity | Persona física o jurídica relacionada con servicios. |
| `tipo` | `varchar(10)` | No | — | Naturaleza de la persona. |
| `nombre_razon_social` | `varchar(180)` | No | — | Nombre completo o razón social. |
| `documento_tipo` | `varchar(20)` | No | — | DNI, CUIT u otro documento validado. |
| `documento_numero` | `varchar(30)` | No | — | Identificador conservado como texto. |
| `calle` | `varchar(180)` | Sí | — | Calle del domicilio, separada del número para imprimir la ficha. |
| `numero` | `varchar(20)` | Sí | — | Altura o indicación sin número, conservada como texto. |
| `piso_depto` | `varchar(40)` | Sí | — | Piso y departamento cuando corresponde. |
| `localidad` | `varchar(100)` | Sí | — | Localidad del domicilio. |
| `provincia` | `varchar(100)` | Sí | — | Provincia del domicilio. |
| `codigo_postal` | `varchar(15)` | Sí | — | Código postal alfanumérico. |
| `telefono` | `varchar(40)` | Sí | — | Contacto telefónico. |
| `email` | `varchar(254)` | Sí | — | Contacto de correo opcional. |
| `activo` | `boolean` | No | Default: `true` | Baja lógica del maestro. |
| `creado_en` | `timestamptz` | No | Default: `CURRENT_TIMESTAMP` | Alta. |

Restricciones declarativas:

- `tipo`: `CHECK (tipo IN ('FISICA','JURIDICA'))`
- `UNIQUE (documento_tipo, documento_numero)`

Índices explícitos:

- `CREATE INDEX ix_personas_nombre ON personas (nombre_razon_social);`

## `vehiculos`

| Campo | Tipo | Nulo | Claves / valor inicial | Significado |
| --- | --- | --- | --- | --- |
| `id` | `bigint` | No | PK; Identity | Identidad del vehículo. |
| `dominio` | `varchar(15)` | No | UQ | Patente normalizada como texto. |
| `marca` | `varchar(80)` | No | — | Marca del vehículo. |
| `modelo` | `varchar(100)` | No | — | Modelo comercial. |
| `anio` | `smallint` | No | — | Año del modelo. |
| `motor_numero` | `varchar(80)` | Sí | — | Identificador del motor. |
| `chasis_numero` | `varchar(80)` | Sí | — | Identificador del chasis. |
| `tipo` | `varchar(15)` | Sí | — | Clasificación controlada observada en las casillas. |
| `tipo_otro_detalle` | `varchar(100)` | Sí | — | Descripción obligatoria al seleccionar Otros. |
| `uso` | `varchar(60)` | Sí | — | Uso particular u otro informado. |
| `inyeccion` | `boolean` | Sí | — | Sí, no o no informado; no confundir con el modelo de inyección. |
| `activo` | `boolean` | No | Default: `true` | Baja lógica. |

Restricciones declarativas:

- `anio`: `CHECK (anio BETWEEN 1900 AND 2200)`
- `tipo`: `CHECK (tipo IN ('TAXI','PICKUP','PARTICULAR','BUS','OFICIAL','OTROS'))`
- `CHECK ((tipo = 'OTROS' AND tipo_otro_detalle IS NOT NULL) OR (tipo IS DISTINCT FROM 'OTROS' AND tipo_otro_detalle IS NULL))`

## `vehiculo_personas`

| Campo | Tipo | Nulo | Claves / valor inicial | Significado |
| --- | --- | --- | --- | --- |
| `id` | `bigint` | No | PK; Identity | Relación histórica de titularidad o contacto. |
| `vehiculo_id` | `bigint` | No | FK → `vehiculos.id` | Vehículo relacionado. |
| `persona_id` | `bigint` | No | FK → `personas.id` | Titular o contacto. |
| `rol` | `varchar(15)` | No | — | Función de la persona. |
| `desde` | `date` | No | — | Inicio de vigencia conocido. |
| `hasta` | `date` | Sí | — | Fin de vigencia, exclusivo; nulo mientras continúa. |

Restricciones declarativas:

- `rol`: `CHECK (rol IN ('TITULAR','CONTACTO'))`
- `CHECK (hasta IS NULL OR hasta > desde)`

Índices explícitos:

- `CREATE UNIQUE INDEX uq_vehiculo_titular_vigente ON vehiculo_personas (vehiculo_id) WHERE rol = 'TITULAR' AND hasta IS NULL;`
- `CREATE INDEX ix_vehiculo_personas_persona ON vehiculo_personas (persona_id, vehiculo_id);`

## `actores_regulatorios`

| Campo | Tipo | Nulo | Claves / valor inicial | Significado |
| --- | --- | --- | --- | --- |
| `id` | `bigint` | No | PK; Identity | Actor técnico, separado de proveedores. |
| `tipo` | `varchar(5)` | No | — | Responsabilidad regulatoria informada. |
| `codigo` | `varchar(40)` | No | — | Matrícula o código como texto. |
| `nombre` | `varchar(180)` | No | — | Denominación. |
| `cuit` | `varchar(20)` | Sí | — | CUIT cuando corresponde. |
| `domicilio` | `varchar(220)` | Sí | — | Domicilio informado. |
| `localidad` | `varchar(100)` | Sí | — | Localidad informada. |
| `telefono` | `varchar(40)` | Sí | — | Contacto. |
| `responsable_tecnico` | `varchar(140)` | Sí | — | Responsable que se imprimirá en el documento. |
| `matricula_responsable` | `varchar(40)` | Sí | — | Matrícula profesional cuando corresponda. |
| `activo` | `boolean` | No | Default: `true` | Habilitado para nuevas selecciones. |

Restricciones declarativas:

- `tipo`: `CHECK (tipo IN ('PEC','TDM','CRPC'))`
- `UNIQUE (tipo, codigo)`
- `UNIQUE (id, tipo)`

## `proveedores`

| Campo | Tipo | Nulo | Claves / valor inicial | Significado |
| --- | --- | --- | --- | --- |
| `id` | `bigint` | No | PK; Identity | Proveedor comercial del costo. |
| `nombre_razon_social` | `varchar(180)` | No | — | Identificación comercial. |
| `cuit` | `varchar(20)` | Sí | UQ | Identificador fiscal opcional. |
| `telefono` | `varchar(40)` | Sí | — | Contacto. |
| `email` | `varchar(254)` | Sí | — | Correo de contacto. |
| `observaciones` | `text` | Sí | — | Condiciones operativas. |
| `activo` | `boolean` | No | Default: `true` | Baja lógica sin borrar deudas. |

## `modelos_componentes`

| Campo | Tipo | Nulo | Claves / valor inicial | Significado |
| --- | --- | --- | --- | --- |
| `id` | `bigint` | No | PK; Identity | Modelo técnico de componente serializado. |
| `tipo` | `varchar(15)` | No | — | Categoría técnica. |
| `codigo_homologacion` | `varchar(50)` | No | — | Código de homologación observado/documentado. |
| `marca` | `varchar(100)` | Sí | — | Marca cuando está disponible. |
| `modelo` | `varchar(100)` | Sí | — | Denominación del modelo. |
| `capacidad_litros` | `numeric(7,2)` | Sí | — | Capacidad nominal del cilindro, si corresponde. |
| `activo` | `boolean` | No | Default: `true` | Disponible para nuevas selecciones. |

Restricciones declarativas:

- `tipo`: `CHECK (tipo IN ('CILINDRO','VALVULA','REGULADOR'))`
- `UNIQUE (tipo, codigo_homologacion)`
- `UNIQUE (id, tipo)`
- `CHECK (capacidad_litros IS NULL OR (tipo = 'CILINDRO' AND capacidad_litros > 0))`

## `componentes`

| Campo | Tipo | Nulo | Claves / valor inicial | Significado |
| --- | --- | --- | --- | --- |
| `id` | `bigint` | No | PK; Identity | Identidad individual persistente. |
| `modelo_id` | `bigint` | No | — | Modelo del componente. |
| `tipo` | `varchar(15)` | No | — | Tipo validado contra el modelo mediante FK compuesta. |
| `numero_serie` | `varchar(80)` | No | — | Serie conservada como texto, incluso ceros iniciales. |
| `fabricacion_mes` | `date` | Sí | — | Mes de fabricación representado por el día 1. |
| `fecha_baja` | `date` | Sí | — | Baja definitiva; no equivale a retiro de un vehículo. |
| `observaciones` | `text` | Sí | — | Datos técnicos complementarios. |

Restricciones declarativas:

- `UNIQUE (modelo_id, numero_serie)`
- `UNIQUE (id, tipo)`
- `FOREIGN KEY (modelo_id, tipo) REFERENCES modelos_componentes(id, tipo)`
- `CHECK (fabricacion_mes IS NULL OR EXTRACT(DAY FROM fabricacion_mes) = 1)`

## `catalogo_servicios`

| Campo | Tipo | Nulo | Claves / valor inicial | Significado |
| --- | --- | --- | --- | --- |
| `id` | `bigint` | No | PK; Identity | Oferta configurable, no un trabajo concreto. |
| `codigo` | `varchar(40)` | No | UQ | Código estable comercial. |
| `nombre` | `varchar(140)` | No | — | Nombre de la oferta. |
| `descripcion` | `text` | No | — | Trabajo propuesto. |
| `tipo` | `varchar(25)` | No | — | Clasificación operativa propia, separada de códigos de ficha. |
| `precio_sugerido` | `numeric(14,2)` | No | — | Valor comercial de referencia en ARS. |
| `activo` | `boolean` | No | Default: `true` | Oferta seleccionable. |

Restricciones declarativas:

- `tipo`: `CHECK (tipo IN ('REVISION_ANUAL','REVISION_QUINQUENAL','CONVERSION','MODIFICACION','DESMONTAJE','OTRO'))`
- `precio_sugerido`: `CHECK (precio_sugerido >= 0)`

## `catalogo_items`

| Campo | Tipo | Nulo | Claves / valor inicial | Significado |
| --- | --- | --- | --- | --- |
| `id` | `bigint` | No | PK; Identity | Composición habitual de una oferta. |
| `catalogo_servicio_id` | `bigint` | No | FK → `catalogo_servicios.id` | Oferta propietaria. |
| `orden` | `smallint` | No | — | Orden de presentación. |
| `descripcion` | `varchar(180)` | No | — | Concepto sugerido. |
| `tipo` | `varchar(20)` | No | — | Naturaleza del ítem. |
| `cantidad` | `numeric(10,2)` | No | — | Cantidad propuesta. |
| `precio_unitario` | `numeric(14,2)` | No | — | Precio propuesto por unidad. |
| `proveedor_id` | `bigint` | Sí | FK → `proveedores.id` | Proveedor propuesto; no crea deuda. |
| `costo_unitario` | `numeric(14,2)` | No | Default: `0` | Costo propuesto; no crea egreso. |

Restricciones declarativas:

- `orden`: `CHECK (orden > 0)`
- `tipo`: `CHECK (tipo IN ('COMPONENTE','INSPECCION','ENSAYO_PH','OBLEA','MANO_OBRA','ACCESORIO','OTRO'))`
- `cantidad`: `CHECK (cantidad > 0)`
- `precio_unitario`: `CHECK (precio_unitario >= 0)`
- `costo_unitario`: `CHECK (costo_unitario >= 0)`
- `UNIQUE (catalogo_servicio_id, orden)`

## `servicios`

| Campo | Tipo | Nulo | Claves / valor inicial | Significado |
| --- | --- | --- | --- | --- |
| `id` | `bigint` | No | PK; Identity | Borrador o trabajo concreto. |
| `vehiculo_id` | `bigint` | No | FK → `vehiculos.id` | Vehículo atendido. |
| `catalogo_servicio_id` | `bigint` | No | FK → `catalogo_servicios.id` | Oferta de origen. |
| `antecedente_id` | `bigint` | Sí | FK → `servicios.id` | Servicio previo renovado; máximo un sucesor directo no cancelado. |
| `configuracion_base_id` | `bigint` | Sí | — | Configuración consultada al preparar el servicio; FK agregada más abajo. |
| `estado` | `varchar(15)` | No | — | Borrador editable, realizado confirmado o borrador cancelado. |
| `fecha_servicio` | `date` | No | — | Fecha efectiva de realización prevista o confirmada. |
| `descripcion` | `varchar(180)` | No | — | Descripción histórica, independiente del catálogo futuro. |
| `tipo` | `varchar(25)` | No | — | Tipo comercial fijado para este servicio. |
| `operacion_ficha` | `char(1)` | Sí | — | Marca del formulario, independiente de la existencia de PH. |
| `incluye_ph` | `boolean` | No | Default: `false` | Ensayo PH realizado como parte del trabajo. |
| `importe_total` | `numeric(14,2)` | No | — | Total pactado en ARS; al confirmar debe coincidir con ítems. |
| `observaciones` | `text` | Sí | — | Indicaciones del trabajo. |
| `creado_por` | `bigint` | No | FK → `usuarios.id` | Autor del borrador. |
| `creado_en` | `timestamptz` | No | Default: `CURRENT_TIMESTAMP` | Inicio del registro. |
| `confirmado_por` | `bigint` | Sí | FK → `usuarios.id` | Responsable de confirmación. |
| `confirmado_en` | `timestamptz` | Sí | — | Instante de confirmación. |
| `cancelado_en` | `timestamptz` | Sí | — | Cancelación de un borrador sin efectos automáticos. |
| `motivo_cancelacion` | `text` | Sí | — | Justificación de cancelación. |
| `identificador_sicgnc` | `varchar(100)` | Sí | — | Identificador externo cargado manualmente, incluso en operaciones sin oblea. |
| `registrado_sicgnc_en` | `timestamptz` | Sí | — | Fecha de carga manual de ese resultado externo. |

Restricciones declarativas:

- `estado`: `CHECK (estado IN ('BORRADOR','CONFIRMADO','CANCELADO'))`
- `tipo`: `CHECK (tipo IN ('REVISION_ANUAL','REVISION_QUINQUENAL','CONVERSION','MODIFICACION','DESMONTAJE','OTRO'))`
- `operacion_ficha`: `CHECK (operacion_ficha IN ('C','M','R','D','B'))`
- `importe_total`: `CHECK (importe_total >= 0)`
- `CHECK ((identificador_sicgnc IS NULL AND registrado_sicgnc_en IS NULL) OR (identificador_sicgnc IS NOT NULL AND registrado_sicgnc_en IS NOT NULL))`
- `UNIQUE (id, vehiculo_id)`
- `CHECK (antecedente_id IS NULL OR antecedente_id <> id)`
- `CHECK ((estado = 'CONFIRMADO' AND confirmado_en IS NOT NULL AND confirmado_por IS NOT NULL AND cancelado_en IS NULL) OR (estado = 'BORRADOR' AND confirmado_en IS NULL AND confirmado_por IS NULL AND cancelado_en IS NULL) OR (estado = 'CANCELADO' AND confirmado_en IS NULL AND confirmado_por IS NULL AND cancelado_en IS NOT NULL AND motivo_cancelacion IS NOT NULL))`
- `ALTER TABLE servicios ADD CONSTRAINT fk_servicio_configuracion_base FOREIGN KEY (configuracion_base_id, vehiculo_id) REFERENCES configuraciones(id, vehiculo_id);`

Índices explícitos:

- `CREATE UNIQUE INDEX uq_servicio_renovacion_activa ON servicios (antecedente_id) WHERE antecedente_id IS NOT NULL AND estado <> 'CANCELADO';`
- `CREATE INDEX ix_servicios_vehiculo_fecha ON servicios (vehiculo_id, fecha_servicio);`
- `CREATE INDEX ix_servicios_estado_fecha ON servicios (estado, fecha_servicio);`

## `servicio_personas`

| Campo | Tipo | Nulo | Claves / valor inicial | Significado |
| --- | --- | --- | --- | --- |
| `servicio_id` | `bigint` | No | PK compuesta; FK → `servicios.id` | Trabajo concreto. |
| `persona_id` | `bigint` | No | FK → `personas.id` | Persona que intervino. |
| `rol` | `varchar(15)` | No | PK compuesta | Una persona puede cumplir varios roles. |

Restricciones declarativas:

- `rol`: `CHECK (rol IN ('TITULAR','CONTACTO','PAGADOR'))`
- `PRIMARY KEY (servicio_id, rol)`

Índices explícitos:

- `CREATE INDEX ix_servicio_personas_persona ON servicio_personas (persona_id, servicio_id);`

## `servicio_items`

| Campo | Tipo | Nulo | Claves / valor inicial | Significado |
| --- | --- | --- | --- | --- |
| `id` | `bigint` | No | PK; Identity | Ítem real o propuesto del servicio. |
| `servicio_id` | `bigint` | No | FK → `servicios.id` | Servicio propietario. |
| `orden` | `smallint` | No | — | Orden de presentación. |
| `catalogo_item_id` | `bigint` | Sí | FK → `catalogo_items.id` | Origen opcional de la propuesta. |
| `descripcion` | `varchar(180)` | No | — | Descripción histórica independiente del catálogo. |
| `tipo` | `varchar(20)` | No | — | Naturaleza del concepto. |
| `componente_id` | `bigint` | Sí | FK → `componentes.id` | Componente individual cuando aplica. |
| `accion` | `varchar(15)` | Sí | — | Intervención real sobre componente. |
| `cantidad` | `numeric(10,2)` | No | — | Cantidad efectivamente pactada. |
| `precio_unitario` | `numeric(14,2)` | No | — | Precio histórico por unidad. |
| `descuento` | `numeric(14,2)` | No | Default: `0` | Descuento total del renglón. |
| `importe` | `numeric(14,2)` | No | — | Neto del renglón en ARS. |

Restricciones declarativas:

- `orden`: `CHECK (orden > 0)`
- `tipo`: `CHECK (tipo IN ('COMPONENTE','INSPECCION','ENSAYO_PH','OBLEA','MANO_OBRA','ACCESORIO','OTRO'))`
- `accion`: `CHECK (accion IN ('INSTALAR','RETIRAR','INSPECCIONAR','ENSAYAR','MANTENER'))`
- `cantidad`: `CHECK (cantidad > 0)`
- `precio_unitario`: `CHECK (precio_unitario >= 0)`
- `descuento`: `CHECK (descuento >= 0)`
- `importe`: `CHECK (importe >= 0)`
- `UNIQUE (servicio_id, orden)`
- `UNIQUE (id, servicio_id)`
- `CHECK (importe = round(cantidad * precio_unitario - descuento, 2))`
- `CHECK (componente_id IS NULL OR (cantidad = 1 AND accion IS NOT NULL))`

## `servicio_costos`

| Campo | Tipo | Nulo | Claves / valor inicial | Significado |
| --- | --- | --- | --- | --- |
| `id` | `bigint` | No | PK; Identity | Costo atribuido al trabajo; admite varios proveedores. |
| `servicio_id` | `bigint` | No | FK → `servicios.id` | Trabajo al que pertenece. |
| `servicio_item_id` | `bigint` | Sí | — | Renglón relacionado, si existe. |
| `proveedor_id` | `bigint` | Sí | FK → `proveedores.id` | Acreedor cuando el costo genera obligación. |
| `concepto` | `varchar(180)` | No | — | Concepto histórico del costo. |
| `tratamiento` | `varchar(15)` | No | — | Distingue deuda externa de costo interno informativo. |
| `importe` | `numeric(14,2)` | No | — | Costo histórico en ARS. |

Restricciones declarativas:

- `tratamiento`: `CHECK (tratamiento IN ('PROVEEDOR','ABSORBIDO'))`
- `importe`: `CHECK (importe > 0)`
- `UNIQUE (id, servicio_id, proveedor_id, importe)`
- `FOREIGN KEY (servicio_item_id, servicio_id) REFERENCES servicio_items(id, servicio_id)`
- `CHECK ((tratamiento = 'PROVEEDOR' AND proveedor_id IS NOT NULL) OR (tratamiento = 'ABSORBIDO' AND proveedor_id IS NULL))`

Índices explícitos:

- `CREATE INDEX ix_servicio_costos_servicio ON servicio_costos (servicio_id);`

## `servicio_preparacion`

| Campo | Tipo | Nulo | Claves / valor inicial | Significado |
| --- | --- | --- | --- | --- |
| `servicio_id` | `bigint` | No | PK; FK → `servicios.id` | Cabecera técnica editable mientras el servicio es borrador. |
| `pec_id` | `bigint` | Sí | — | PEC propuesto para la ficha. |
| `pec_tipo` | `varchar(5)` | No | Default: `'PEC'` | Discriminador de FK. |
| `tdm_id` | `bigint` | Sí | — | TdM propuesto para la ficha. |
| `tdm_tipo` | `varchar(5)` | No | Default: `'TDM'` | Discriminador de FK. |
| `oblea_anterior` | `varchar(40)` | Sí | — | Número transcripto aunque sea anterior al corte. |
| `oblea_nueva` | `varchar(40)` | Sí | — | Número preparado, todavía no emitido. |
| `habilitada_el` | `date` | Sí | — | Fecha preparada para la habilitación. |
| `vence_el` | `date` | Sí | — | Fecha preparada para vencimiento de oblea. |
| `observaciones_ficha` | `text` | Sí | — | Texto a imprimir en la ficha. |

Restricciones declarativas:

- `pec_tipo`: `CHECK (pec_tipo = 'PEC')`
- `tdm_tipo`: `CHECK (tdm_tipo = 'TDM')`
- `FOREIGN KEY (pec_id, pec_tipo) REFERENCES actores_regulatorios(id, tipo)`
- `FOREIGN KEY (tdm_id, tdm_tipo) REFERENCES actores_regulatorios(id, tipo)`
- `CHECK (vence_el IS NULL OR habilitada_el IS NULL OR vence_el > habilitada_el)`

## `servicio_intervenciones`

| Campo | Tipo | Nulo | Claves / valor inicial | Significado |
| --- | --- | --- | --- | --- |
| `id` | `bigint` | No | PK; Identity | Preparación de un renglón técnico; no instala ni ensaya por guardarse. |
| `servicio_id` | `bigint` | No | FK → `servicios.id` | Borrador propietario; se conserva al confirmar. |
| `tipo` | `varchar(15)` | No | — | Sección técnica del documento. |
| `renglon` | `smallint` | No | — | Orden impreso, independiente de instalación final. |
| `componente_id` | `bigint` | Sí | — | Identidad individual conocida; FK tipada. |
| `codigo_homologacion` | `varchar(50)` | Sí | — | Código preparado para imprimir. |
| `numero_serie` | `varchar(80)` | Sí | — | Serie preparada para imprimir. |
| `condicion` | `varchar(30)` | Sí | — | Estado nuevo/usado conforme a validación operativa. |
| `accion` | `char(1)` | Sí | — | Marca documental, sin deducirla del estado actual. |
| `posicion_final` | `smallint` | Sí | — | Posición prevista si queda instalado; nulo para retirados/no instalados. |
| `fabricacion_mes` | `date` | Sí | — | Mes/año, representado internamente con día 1. |
| `revision_mes` | `date` | Sí | — | Mes/año de la última PH que figura en «Revisado»; es distinto de fabricación, puede ser antecedente y no acredita por sí solo un ensayo del servicio actual. |
| `crpc_id` | `bigint` | Sí | — | Centro propuesto si corresponde revisión. |
| `crpc_tipo` | `varchar(5)` | No | Default: `'CRPC'` | Discriminador de FK. |
| `realiza_ph` | `boolean` | No | Default: `false` | El renglón de cilindro incluye un ensayo PH. |
| `fecha_ensayo` | `date` | Sí | — | Fecha del ensayo preparada antes de confirmar. |
| `vence_revision_el` | `date` | Sí | — | Próxima revisión preparada si corresponde. |
| `resultado_ph` | `varchar(15)` | Sí | — | Resultado técnico preparado. |
| `numero_certificado` | `varchar(80)` | Sí | — | Identificador preparado del certificado. |
| `descripcion` | `varchar(180)` | Sí | — | Concepto/accesorio u observaciones del renglón. |

Restricciones declarativas:

- `tipo`: `CHECK (tipo IN ('REGULADOR','CILINDRO','VALVULA','ACCESORIO'))`
- `renglon`: `CHECK (renglon > 0)`
- `accion`: `CHECK (accion IN ('M','S','D','B'))`
- `crpc_tipo`: `CHECK (crpc_tipo = 'CRPC')`
- `resultado_ph`: `CHECK (resultado_ph IN ('APROBADO','RECHAZADO'))`
- `UNIQUE (servicio_id, tipo, renglon)`
- `FOREIGN KEY (componente_id, tipo) REFERENCES componentes(id, tipo)`
- `FOREIGN KEY (crpc_id, crpc_tipo) REFERENCES actores_regulatorios(id, tipo)`
- `CHECK ((tipo = 'REGULADOR' AND renglon BETWEEN 1 AND 3) OR (tipo IN ('CILINDRO','VALVULA') AND renglon BETWEEN 1 AND 4) OR tipo = 'ACCESORIO')`
- `CHECK (tipo <> 'REGULADOR' OR accion IS NULL OR accion IN ('M','D','B'))`
- `CHECK (tipo <> 'ACCESORIO' OR componente_id IS NULL)`
- `CHECK (posicion_final IS NULL OR (tipo = 'REGULADOR' AND posicion_final = 1) OR (tipo IN ('CILINDRO','VALVULA') AND posicion_final BETWEEN 1 AND 4))`
- `CHECK (NOT realiza_ph OR tipo = 'CILINDRO')`
- `CHECK (fabricacion_mes IS NULL OR EXTRACT(DAY FROM fabricacion_mes) = 1)`
- `CHECK (revision_mes IS NULL OR EXTRACT(DAY FROM revision_mes) = 1)`
- `CHECK (vence_revision_el IS NULL OR fecha_ensayo IS NULL OR vence_revision_el > fecha_ensayo)`

Índices explícitos:

- `CREATE UNIQUE INDEX uq_intervencion_posicion_final ON servicio_intervenciones (servicio_id, tipo, posicion_final) WHERE posicion_final IS NOT NULL;`

## `configuraciones`

| Campo | Tipo | Nulo | Claves / valor inicial | Significado |
| --- | --- | --- | --- | --- |
| `id` | `bigint` | No | PK; Identity | Versión histórica del equipo de GNC. |
| `vehiculo_id` | `bigint` | No | FK → `vehiculos.id` | Vehículo propietario de la versión. |
| `servicio_origen_id` | `bigint` | Sí | — | Servicio que creó la versión; nulo sólo para el relevamiento inicial. |
| `vigente_desde` | `timestamptz` | No | — | Inicio de validez, inclusivo. |
| `vigente_hasta` | `timestamptz` | Sí | — | Fin de validez, exclusivo; nulo para la versión vigente. |
| `observaciones` | `text` | Sí | — | Aclaración del relevamiento/configuración. |

Restricciones declarativas:

- `UNIQUE (id, vehiculo_id)`
- `UNIQUE (servicio_origen_id)`
- `FOREIGN KEY (servicio_origen_id, vehiculo_id) REFERENCES servicios(id, vehiculo_id)`
- `CHECK (vigente_hasta IS NULL OR vigente_hasta > vigente_desde)`

Índices explícitos:

- `CREATE UNIQUE INDEX uq_configuracion_vigente ON configuraciones (vehiculo_id) WHERE vigente_hasta IS NULL;`

## `configuracion_componentes`

| Campo | Tipo | Nulo | Claves / valor inicial | Significado |
| --- | --- | --- | --- | --- |
| `configuracion_id` | `bigint` | No | PK compuesta; FK → `configuraciones.id` | Versión del equipo. |
| `componente_id` | `bigint` | No | — | Componente individual instalado en esa versión. |
| `tipo` | `varchar(15)` | No | PK compuesta | Tipo contrastado por FK con el componente real. |
| `posicion` | `smallint` | No | PK compuesta | 1 para regulador; 1 a 4 para cilindro/válvula. |

Restricciones declarativas:

- `PRIMARY KEY (configuracion_id, tipo, posicion)`
- `UNIQUE (configuracion_id, componente_id)`
- `FOREIGN KEY (componente_id, tipo) REFERENCES componentes(id, tipo)`
- `CHECK ((tipo = 'REGULADOR' AND posicion = 1) OR (tipo IN ('CILINDRO','VALVULA') AND posicion BETWEEN 1 AND 4))`

Índices explícitos:

- `CREATE INDEX ix_config_componentes_componente ON configuracion_componentes (componente_id, configuracion_id);`

## `configuracion_accesorios`

| Campo | Tipo | Nulo | Claves / valor inicial | Significado |
| --- | --- | --- | --- | --- |
| `id` | `bigint` | No | PK; Identity | Accesorio no serializado de una versión. |
| `configuracion_id` | `bigint` | No | FK → `configuraciones.id` | Equipo al que pertenece. |
| `descripcion` | `varchar(160)` | No | — | Manómetro, mezclador, venteo, etcétera. |
| `codigo` | `varchar(50)` | Sí | — | Código informado, si existe. |
| `numero_serie` | `varchar(80)` | Sí | — | Serie informada en el accesorio cuando existe. |
| `cantidad` | `smallint` | No | — | Cantidad instalada. |

Restricciones declarativas:

- `cantidad`: `CHECK (cantidad > 0)`

Índices explícitos:

- `CREATE INDEX ix_config_accesorios_config ON configuracion_accesorios (configuracion_id);`

## `movimientos_componentes`

| Campo | Tipo | Nulo | Claves / valor inicial | Significado |
| --- | --- | --- | --- | --- |
| `id` | `bigint` | No | PK; Identity | Evento individual de trazabilidad técnica, sin stock comercial. |
| `componente_id` | `bigint` | No | FK → `componentes.id` | Componente que se mueve. |
| `servicio_id` | `bigint` | No | FK → `servicios.id` | Trabajo que origina la intervención. |
| `accion` | `varchar(15)` | No | — | Evento de ubicación/custodia. |
| `origen` | `varchar(20)` | No | — | Custodia de origen. |
| `destino` | `varchar(20)` | No | — | Custodia de destino; no presume reventa. |
| `ocurrido_en` | `timestamptz` | No | — | Momento de la intervención. |
| `observaciones` | `text` | Sí | — | Contexto de retiro o destino pendiente. |
| `registrado_por` | `bigint` | No | FK → `usuarios.id` | Responsable del registro. |

Restricciones declarativas:

- `accion`: `CHECK (accion IN ('INSTALAR','RETIRAR','DEVOLVER','DESCARTAR','RECIBIR'))`
- `origen`: `CHECK (origen IN ('VEHICULO','CILGAS','CLIENTE','PROVEEDOR','DESCONOCIDO'))`
- `destino`: `CHECK (destino IN ('VEHICULO','CILGAS','CLIENTE','PROVEEDOR','DESCARTE','DESCONOCIDO'))`

Índices explícitos:

- `CREATE INDEX ix_movimientos_componente_fecha ON movimientos_componentes (componente_id, ocurrido_en);`
- `CREATE INDEX ix_movimientos_servicio ON movimientos_componentes (servicio_id);`

## `documentos`

| Campo | Tipo | Nulo | Claves / valor inicial | Significado |
| --- | --- | --- | --- | --- |
| `id` | `bigint` | No | PK; Identity | Metadatos de un archivo técnico privado. |
| `clase` | `varchar(20)` | No | — | Tipo documental. |
| `clave_almacenamiento` | `varchar(300)` | No | UQ | Ruta opaca en almacenamiento privado, no URL pública. |
| `nombre_archivo` | `varchar(180)` | No | — | Nombre de descarga. |
| `mime_type` | `varchar(80)` | No | — | Tipo de archivo validado. |
| `tamanio_bytes` | `bigint` | No | — | Tamaño máximo a validar en aplicación. |
| `sha256` | `char(64)` | No | — | Huella para integridad y trazabilidad. |
| `creado_por` | `bigint` | No | FK → `usuarios.id` | Responsable de generación o carga. |
| `creado_en` | `timestamptz` | No | Default: `CURRENT_TIMESTAMP` | Fecha de creación. |

Restricciones declarativas:

- `clase`: `CHECK (clase IN ('FICHA_PDF','CERTIFICADO_PH','OTRO_TECNICO'))`
- `tamanio_bytes`: `CHECK (tamanio_bytes > 0)`
- `sha256`: `CHECK (sha256 ~ '^[0-9a-f]{64}$')`

## `fichas`

| Campo | Tipo | Nulo | Claves / valor inicial | Significado |
| --- | --- | --- | --- | --- |
| `id` | `bigint` | No | PK; Identity | Versión inmutable de una ficha emitida. |
| `servicio_id` | `bigint` | No | FK → `servicios.id` | Servicio documentado. |
| `version` | `smallint` | No | — | Secuencia documental por servicio. |
| `rectifica_id` | `bigint` | Sí | UQ | Versión anterior reemplazada; jamás se sobrescribe. |
| `motivo_rectificacion` | `text` | Sí | — | Explicación obligatoria para versiones posteriores. |
| `plantilla_version` | `varchar(40)` | No | — | Versión del diseño PDF. |
| `snapshot_version` | `smallint` | No | — | Versión del contrato del contenido JSONB. |
| `contenido` | `jsonb` | No | — | Fotografía completa de personas, vehículo, actores, componentes, fechas, datos de firmantes y espacios de firma; nunca firmas generadas. |
| `pdf_estado` | `varchar(15)` | No | Default: `'PENDIENTE'` | Progreso de generación; no cambia el contenido histórico. |
| `pdf_documento_id` | `bigint` | Sí | UQ; FK → `documentos.id` | PDF correspondiente a este snapshot, enlazado después de generarse. |
| `pdf_error` | `text` | Sí | — | Diagnóstico resumido del último fallo de generación, sin datos sensibles. |
| `pec_id` | `bigint` | No | — | PEC seleccionado al emitir; el snapshot conserva sus valores. |
| `pec_tipo` | `varchar(5)` | No | Default: `'PEC'` | Discriminador para FK tipada. |
| `tdm_id` | `bigint` | No | — | Taller seleccionado al emitir. |
| `tdm_tipo` | `varchar(5)` | No | Default: `'TDM'` | Discriminador para FK tipada. |
| `emitida_por` | `bigint` | No | FK → `usuarios.id` | Responsable de la emisión. |
| `emitida_en` | `timestamptz` | No | Default: `CURRENT_TIMESTAMP` | Momento de confirmación documental. |

Restricciones declarativas:

- `version`: `CHECK (version > 0)`
- `snapshot_version`: `CHECK (snapshot_version > 0)`
- `contenido`: `CHECK (jsonb_typeof(contenido) = 'object')`
- `pdf_estado`: `CHECK (pdf_estado IN ('PENDIENTE','GENERADO','ERROR'))`
- `pec_tipo`: `CHECK (pec_tipo = 'PEC')`
- `tdm_tipo`: `CHECK (tdm_tipo = 'TDM')`
- `CHECK ((pdf_estado = 'GENERADO' AND pdf_documento_id IS NOT NULL AND pdf_error IS NULL) OR (pdf_estado = 'PENDIENTE' AND pdf_documento_id IS NULL AND pdf_error IS NULL) OR (pdf_estado = 'ERROR' AND pdf_documento_id IS NULL AND pdf_error IS NOT NULL))`
- `UNIQUE (servicio_id, version)`
- `UNIQUE (id, servicio_id)`
- `FOREIGN KEY (rectifica_id, servicio_id) REFERENCES fichas(id, servicio_id)`
- `FOREIGN KEY (pec_id, pec_tipo) REFERENCES actores_regulatorios(id, tipo)`
- `FOREIGN KEY (tdm_id, tdm_tipo) REFERENCES actores_regulatorios(id, tipo)`
- `CHECK ((version = 1 AND rectifica_id IS NULL AND motivo_rectificacion IS NULL) OR (version > 1 AND rectifica_id IS NOT NULL AND motivo_rectificacion IS NOT NULL))`
- `CHECK (rectifica_id IS NULL OR rectifica_id <> id)`

Índices explícitos:

- `CREATE UNIQUE INDEX uq_ficha_original_servicio ON fichas (servicio_id) WHERE rectifica_id IS NULL;`

## `ficha_componentes`

| Campo | Tipo | Nulo | Claves / valor inicial | Significado |
| --- | --- | --- | --- | --- |
| `id` | `bigint` | No | PK; Identity | Renglón documental; NO implica componente instalado al final. |
| `ficha_id` | `bigint` | No | FK → `fichas.id` | Versión documental propietaria. |
| `tipo` | `varchar(15)` | No | — | Sección de la ficha. |
| `renglon` | `smallint` | No | — | Posición impresa. Q6 del 05/10/2026 define una pareja cilindro–válvula por fila para las nuevas fichas; su asociación se valida explícitamente y no reinterpreta snapshots previos. |
| `componente_id` | `bigint` | Sí | — | Componente conocido; opcional para transcripción histórica incompleta. |
| `codigo_homologacion` | `varchar(50)` | Sí | — | Valor histórico mostrado en esa versión. |
| `numero_serie` | `varchar(80)` | Sí | — | Serie histórica impresa. |
| `condicion` | `varchar(30)` | Sí | — | Condición tal como se validó para el formulario. |
| `accion` | `char(1)` | Sí | — | Marca MSDB del renglón: M monta, S sigue instalado, D desmonta y B baja, según definición del equipo del 05/10/2026. |
| `fabricacion_mes` | `date` | Sí | — | Fabricación con precisión mes/año. |
| `revision_mes` | `date` | Sí | — | Última PH con precisión mes/año impresa en «Revisado», conservada como valor histórico de la ficha. |
| `crpc_codigo` | `varchar(40)` | Sí | — | Código histórico del CRPC impreso. |
| `descripcion` | `varchar(180)` | Sí | — | Nombre o detalle adicional/accesorio. |

Restricciones declarativas:

- `tipo`: `CHECK (tipo IN ('REGULADOR','CILINDRO','VALVULA','ACCESORIO'))`
- `renglon`: `CHECK (renglon > 0)`
- `accion`: `CHECK (accion IN ('M','S','D','B'))`
- `UNIQUE (ficha_id, tipo, renglon)`
- `FOREIGN KEY (componente_id, tipo) REFERENCES componentes(id, tipo)`
- `CHECK ((tipo = 'REGULADOR' AND renglon BETWEEN 1 AND 3) OR (tipo IN ('CILINDRO','VALVULA') AND renglon BETWEEN 1 AND 4) OR tipo = 'ACCESORIO')`
- `CHECK (tipo <> 'ACCESORIO' OR componente_id IS NULL)`
- `CHECK (tipo <> 'REGULADOR' OR accion IS NULL OR accion IN ('M','D','B'))`
- `CHECK (fabricacion_mes IS NULL OR EXTRACT(DAY FROM fabricacion_mes) = 1)`
- `CHECK (revision_mes IS NULL OR EXTRACT(DAY FROM revision_mes) = 1)`

## `obleas`

| Campo | Tipo | Nulo | Claves / valor inicial | Significado |
| --- | --- | --- | --- | --- |
| `id` | `bigint` | No | PK; Identity | Resultado técnico de habilitación/oblea. |
| `servicio_id` | `bigint` | No | UQ; FK → `servicios.id` | Servicio emisor. |
| `numero` | `varchar(40)` | No | UQ | Oblea nueva, como identificador textual. |
| `numero_anterior` | `varchar(40)` | Sí | — | Oblea previa transcripta incluso si es anterior al sistema. |
| `habilitada_el` | `date` | No | — | Fecha de habilitación informada. |
| `vence_el` | `date` | No | — | Vencimiento confirmado, no inferido de forma irreversible. |

Restricciones declarativas:

- `CHECK (vence_el > habilitada_el)`

Índices explícitos:

- `CREATE INDEX ix_obleas_vencimiento ON obleas (vence_el);`

## `revisiones_cilindros`

| Campo | Tipo | Nulo | Claves / valor inicial | Significado |
| --- | --- | --- | --- | --- |
| `id` | `bigint` | No | PK; Identity | Ensayo PH individual; no es la revisión quinquenal comercial. |
| `servicio_id` | `bigint` | No | FK → `servicios.id` | Trabajo que lo incluye. |
| `componente_id` | `bigint` | No | — | Cilindro ensayado. |
| `componente_tipo` | `varchar(15)` | No | Default: `'CILINDRO'` | Discriminador de FK técnica. |
| `crpc_id` | `bigint` | No | — | Centro que realizó la revisión. |
| `crpc_tipo` | `varchar(5)` | No | Default: `'CRPC'` | Discriminador de FK regulatoria. |
| `fecha_ensayo` | `date` | No | — | Día conocido del ensayo. |
| `vence_el` | `date` | Sí | — | Próxima revisión según dato validado; puede no aplicar si fue rechazado. |
| `resultado` | `varchar(15)` | No | — | Resultado técnico documentado. |
| `numero_certificado` | `varchar(80)` | Sí | — | Identificación textual de certificado externo. |
| `certificado_documento_id` | `bigint` | Sí | FK → `documentos.id` | Archivo técnico si fue entregado. |
| `observaciones` | `text` | Sí | — | Hallazgos o motivo de rechazo. |

Restricciones declarativas:

- `componente_tipo`: `CHECK (componente_tipo = 'CILINDRO')`
- `crpc_tipo`: `CHECK (crpc_tipo = 'CRPC')`
- `resultado`: `CHECK (resultado IN ('APROBADO','RECHAZADO'))`
- `UNIQUE (servicio_id, componente_id)`
- `FOREIGN KEY (componente_id, componente_tipo) REFERENCES componentes(id, tipo)`
- `FOREIGN KEY (crpc_id, crpc_tipo) REFERENCES actores_regulatorios(id, tipo)`
- `CHECK (vence_el IS NULL OR vence_el > fecha_ensayo)`

Índices explícitos:

- `CREATE INDEX ix_revisiones_componente_fecha ON revisiones_cilindros (componente_id, fecha_ensayo);`
- `CREATE INDEX ix_revisiones_vencimiento ON revisiones_cilindros (vence_el) WHERE resultado = 'APROBADO';`

## `medios_pago`

| Campo | Tipo | Nulo | Claves / valor inicial | Significado |
| --- | --- | --- | --- | --- |
| `id` | `bigint` | No | PK; Identity | Medio efectivo de ingreso o egreso. |
| `codigo` | `varchar(25)` | No | UQ | EFECTIVO o TRANSFERENCIA en el MVP. |
| `nombre` | `varchar(80)` | No | — | Etiqueta visible. |
| `activo` | `boolean` | No | Default: `true` | Habilitado para nuevos hechos. |

## `convenios`

| Campo | Tipo | Nulo | Claves / valor inicial | Significado |
| --- | --- | --- | --- | --- |
| `id` | `bigint` | No | PK; Identity | Acuerdo con entidad pagadora; no tipo de oblea. |
| `entidad_persona_id` | `bigint` | No | FK → `personas.id` | Persona jurídica que paga. |
| `nombre` | `varchar(120)` | No | UQ | Identificación del convenio. |
| `condiciones` | `text` | Sí | — | Condiciones comerciales básicas. |
| `plazo_pago_dias` | `integer` | No | Default: `0` | Referencia para vencimiento de liquidaciones. |
| `activo` | `boolean` | No | Default: `true` | Seleccionable para nuevas autorizaciones. |

Restricciones declarativas:

- `plazo_pago_dias`: `CHECK (plazo_pago_dias >= 0)`

## `liquidaciones`

| Campo | Tipo | Nulo | Claves / valor inicial | Significado |
| --- | --- | --- | --- | --- |
| `id` | `bigint` | No | PK; Identity | Lote presentado a una entidad, todavía no es un cobro. |
| `convenio_id` | `bigint` | No | FK → `convenios.id` | Convenio del lote. |
| `numero` | `varchar(60)` | No | — | Número interno de presentación. |
| `estado` | `varchar(15)` | No | — | Ciclo básico del lote. |
| `entregada_el` | `date` | Sí | — | Fecha de presentación. |
| `vence_el` | `date` | Sí | — | Vencimiento financiero acordado. |
| `importe_total` | `numeric(14,2)` | No | — | Total cerrado al presentar, igual a cupones incluidos. |
| `creada_por` | `bigint` | No | FK → `usuarios.id` | Responsable del lote. |
| `creada_en` | `timestamptz` | No | Default: `CURRENT_TIMESTAMP` | Alta. |
| `observaciones` | `text` | Sí | — | Referencia de presentación o anulación. |

Restricciones declarativas:

- `estado`: `CHECK (estado IN ('BORRADOR','ENTREGADA','COBRADA','ANULADA'))`
- `importe_total`: `CHECK (importe_total >= 0)`
- `UNIQUE (convenio_id, numero)`
- `UNIQUE (id, convenio_id)`
- `CHECK (estado NOT IN ('ENTREGADA','COBRADA') OR entregada_el IS NOT NULL)`
- `CHECK (vence_el IS NULL OR (entregada_el IS NOT NULL AND vence_el >= entregada_el))`

Índices explícitos:

- `CREATE INDEX ix_liquidaciones_estado_vencimiento ON liquidaciones (estado, vence_el);`

## `cupones`

| Campo | Tipo | Nulo | Claves / valor inicial | Significado |
| --- | --- | --- | --- | --- |
| `id` | `bigint` | No | PK; Identity | Autorización comercial de un trabajo. |
| `convenio_id` | `bigint` | No | FK → `convenios.id` | Convenio emisor. |
| `servicio_id` | `bigint` | No | UQ; FK → `servicios.id` | Un cupón por servicio en el MVP. |
| `numero` | `varchar(80)` | No | — | Referencia de autorización. |
| `importe_autorizado` | `numeric(14,2)` | No | — | Importe imputable a la entidad. |
| `autorizado_el` | `date` | No | — | Fecha de autorización. |
| `liquidacion_id` | `bigint` | Sí | — | Lote al que pertenece; nulo mientras está disponible. |
| `anulado_en` | `timestamptz` | Sí | — | Anulación auditable del cupón. |
| `motivo_anulacion` | `text` | Sí | — | Motivo de anulación. |

Restricciones declarativas:

- `importe_autorizado`: `CHECK (importe_autorizado > 0)`
- `UNIQUE (convenio_id, numero)`
- `FOREIGN KEY (liquidacion_id, convenio_id) REFERENCES liquidaciones(id, convenio_id)`
- `CHECK ((anulado_en IS NULL AND motivo_anulacion IS NULL) OR (anulado_en IS NOT NULL AND motivo_anulacion IS NOT NULL))`

Índices explícitos:

- `CREATE INDEX ix_cupones_disponibles ON cupones (convenio_id) WHERE liquidacion_id IS NULL AND anulado_en IS NULL;`
- `CREATE INDEX ix_cupones_liquidacion ON cupones (liquidacion_id);`

## `operaciones_cobro`

| Campo | Tipo | Nulo | Claves / valor inicial | Significado |
| --- | --- | --- | --- | --- |
| `id` | `bigint` | No | PK; Identity | Operación atómica que agrupa medios y asignaciones a servicios. |
| `clave_idempotencia` | `uuid` | No | UQ | Evita duplicar una recepción al reintentar. |
| `origen` | `varchar(15)` | No | — | Procedencia comercial del dinero. |
| `liquidacion_id` | `bigint` | Sí | FK → `liquidaciones.id` | Lote pagado; nunca se suma como un ingreso adicional. |
| `pagador_id` | `bigint` | Sí | FK → `personas.id` | Persona que entrega o transfiere el dinero. |
| `recibido_en` | `timestamptz` | No | — | Fecha efectiva de recepción. |
| `importe_total` | `numeric(14,2)` | No | — | Control del total de sus cobros hijos. |
| `referencia` | `varchar(140)` | Sí | — | Comprobante externo o nota. |
| `creado_por` | `bigint` | No | FK → `usuarios.id` | Responsable del registro. |
| `anulado_en` | `timestamptz` | Sí | — | Anulación completa por error; no representa devolución de dinero. |
| `anulado_por` | `bigint` | Sí | FK → `usuarios.id` | Administrador que autoriza anular. |
| `motivo_anulacion` | `text` | Sí | — | Motivo obligatorio. |

Restricciones declarativas:

- `origen`: `CHECK (origen IN ('PARTICULAR','LIQUIDACION'))`
- `importe_total`: `CHECK (importe_total > 0)`
- `CHECK ((origen = 'PARTICULAR' AND liquidacion_id IS NULL) OR (origen = 'LIQUIDACION' AND liquidacion_id IS NOT NULL))`
- `CHECK ((anulado_en IS NULL AND anulado_por IS NULL AND motivo_anulacion IS NULL) OR (anulado_en IS NOT NULL AND anulado_por IS NOT NULL AND motivo_anulacion IS NOT NULL))`

Índices explícitos:

- `CREATE UNIQUE INDEX uq_pago_activo_liquidacion ON operaciones_cobro (liquidacion_id) WHERE liquidacion_id IS NOT NULL AND anulado_en IS NULL;`
- `CREATE INDEX ix_operaciones_cobro_fecha ON operaciones_cobro (recibido_en);`

## `cobros`

| Campo | Tipo | Nulo | Claves / valor inicial | Significado |
| --- | --- | --- | --- | --- |
| `id` | `bigint` | No | PK; Identity | Fracción efectivamente recibida e imputada desde el inicio a un servicio. |
| `operacion_id` | `bigint` | No | FK → `operaciones_cobro.id` | Cabecera común para ingreso combinado o liquidación. |
| `servicio_id` | `bigint` | No | FK → `servicios.id` | Servicio concreto, incluso borrador en un anticipo explícito. |
| `medio_pago_id` | `bigint` | No | FK → `medios_pago.id` | Medio de esta fracción. |
| `tipo` | `varchar(15)` | No | — | Naturaleza de la aplicación. |
| `importe` | `numeric(14,2)` | No | — | Único importe que se suma a ingresos reales. |
| `referencia` | `varchar(140)` | Sí | — | Referencia de transferencia u otra fracción. |

Restricciones declarativas:

- `tipo`: `CHECK (tipo IN ('ANTICIPO','PAGO','CONVENIO'))`
- `importe`: `CHECK (importe > 0)`
- `UNIQUE (operacion_id, servicio_id, medio_pago_id)`

Índices explícitos:

- `CREATE INDEX ix_cobros_servicio ON cobros (servicio_id, operacion_id);`

## `obligaciones`

| Campo | Tipo | Nulo | Claves / valor inicial | Significado |
| --- | --- | --- | --- | --- |
| `id` | `bigint` | No | PK; Identity | Deuda nacida al confirmar un costo de proveedor. |
| `servicio_costo_id` | `bigint` | No | UQ | Costo de origen: como máximo una obligación. |
| `servicio_id` | `bigint` | No | — | Trabajo concreto de origen. |
| `proveedor_id` | `bigint` | No | — | Acreedor fijado por el costo. |
| `importe` | `numeric(14,2)` | No | — | Importe original; pendiente se deriva, no se almacena. |
| `nacida_en` | `timestamptz` | No | — | Confirmación del trabajo que origina la deuda. |
| `vence_el` | `date` | Sí | — | Vencimiento pactado opcional. |
| `anulada_en` | `timestamptz` | Sí | — | Anulación correctiva, sólo sin aplicaciones activas. |
| `anulada_por` | `bigint` | Sí | FK → `usuarios.id` | Administrador responsable. |
| `motivo_anulacion` | `text` | Sí | — | Motivo obligatorio. |

Restricciones declarativas:

- `importe`: `CHECK (importe > 0)`
- `FOREIGN KEY (servicio_costo_id, servicio_id, proveedor_id, importe) REFERENCES servicio_costos(id, servicio_id, proveedor_id, importe)`
- `CHECK ((anulada_en IS NULL AND anulada_por IS NULL AND motivo_anulacion IS NULL) OR (anulada_en IS NOT NULL AND anulada_por IS NOT NULL AND motivo_anulacion IS NOT NULL))`

Índices explícitos:

- `CREATE INDEX ix_obligaciones_proveedor ON obligaciones (proveedor_id, nacida_en);`
- `CREATE INDEX ix_obligaciones_vencimiento ON obligaciones (vence_el) WHERE anulada_en IS NULL;`

## `operaciones_egreso`

| Campo | Tipo | Nulo | Claves / valor inicial | Significado |
| --- | --- | --- | --- | --- |
| `id` | `bigint` | No | PK; Identity | Operación atómica de salida con uno o varios medios. |
| `clave_idempotencia` | `uuid` | No | UQ | Control de reintentos de la operación completa. |
| `tipo` | `varchar(25)` | No | — | Clase del egreso. |
| `proveedor_id` | `bigint` | Sí | FK → `proveedores.id` | Receptor cuando es pago de obligaciones. |
| `cobro_origen_id` | `bigint` | Sí | FK → `cobros.id` | Ingreso al que corresponde una devolución real. |
| `ocurrido_en` | `timestamptz` | No | — | Fecha real del desembolso. |
| `concepto` | `varchar(180)` | No | — | Descripción histórica. |
| `importe_total` | `numeric(14,2)` | No | — | Control del total de fracciones; no se suma otra vez a caja. |
| `referencia` | `varchar(140)` | Sí | — | Comprobante o nota de la operación. |
| `creado_por` | `bigint` | No | FK → `usuarios.id` | Responsable del registro. |
| `anulado_en` | `timestamptz` | Sí | — | Corrección completa del registro erróneo. |
| `anulado_por` | `bigint` | Sí | FK → `usuarios.id` | Administrador responsable. |
| `motivo_anulacion` | `text` | Sí | — | Motivo obligatorio. |

Restricciones declarativas:

- `tipo`: `CHECK (tipo IN ('PAGO_PROVEEDOR','GASTO_GENERAL','DEVOLUCION_CLIENTE'))`
- `importe_total`: `CHECK (importe_total > 0)`
- `CHECK ((tipo = 'PAGO_PROVEEDOR' AND proveedor_id IS NOT NULL AND cobro_origen_id IS NULL) OR (tipo = 'GASTO_GENERAL' AND proveedor_id IS NULL AND cobro_origen_id IS NULL) OR (tipo = 'DEVOLUCION_CLIENTE' AND proveedor_id IS NULL AND cobro_origen_id IS NOT NULL))`
- `CHECK ((anulado_en IS NULL AND anulado_por IS NULL AND motivo_anulacion IS NULL) OR (anulado_en IS NOT NULL AND anulado_por IS NOT NULL AND motivo_anulacion IS NOT NULL))`

Índices explícitos:

- `CREATE INDEX ix_operaciones_egreso_fecha ON operaciones_egreso (ocurrido_en);`
- `CREATE INDEX ix_operaciones_egreso_proveedor ON operaciones_egreso (proveedor_id, ocurrido_en);`

## `egresos`

| Campo | Tipo | Nulo | Claves / valor inicial | Significado |
| --- | --- | --- | --- | --- |
| `id` | `bigint` | No | PK; Identity | Fracción efectivamente desembolsada y contada una sola vez. |
| `operacion_id` | `bigint` | No | FK → `operaciones_egreso.id` | Cabecera común del pago mixto. |
| `medio_pago_id` | `bigint` | No | FK → `medios_pago.id` | Medio efectivo de esta fracción. |
| `importe` | `numeric(14,2)` | No | — | Único importe que se resta del saldo real. |
| `referencia` | `varchar(140)` | Sí | — | Referencia del medio o transferencia. |

Restricciones declarativas:

- `importe`: `CHECK (importe > 0)`
- `UNIQUE (operacion_id, medio_pago_id)`

## `pagos_obligaciones`

| Campo | Tipo | Nulo | Claves / valor inicial | Significado |
| --- | --- | --- | --- | --- |
| `egreso_id` | `bigint` | No | PK compuesta; FK → `egresos.id` | Egreso existente; la aplicación no crea otro movimiento. |
| `obligacion_id` | `bigint` | No | PK compuesta; FK → `obligaciones.id` | Deuda cancelada total o parcialmente. |
| `importe_aplicado` | `numeric(14,2)` | No | — | Parte del egreso que cancela esta deuda. |

Restricciones declarativas:

- `importe_aplicado`: `CHECK (importe_aplicado > 0)`
- `PRIMARY KEY (egreso_id, obligacion_id)`

Índices explícitos:

- `CREATE INDEX ix_pagos_obligacion ON pagos_obligaciones (obligacion_id);`

## `reglas_alerta`

| Campo | Tipo | Nulo | Claves / valor inicial | Significado |
| --- | --- | --- | --- | --- |
| `id` | `bigint` | No | PK; Identity | Parámetro configurable por clase de vencimiento. |
| `tipo` | `varchar(20)` | No | UQ | Hecho al que se aplica. |
| `dias_anticipacion` | `integer` | No | — | Días previos para advertir. |
| `activa` | `boolean` | No | Default: `true` | Activación de la regla. |
| `actualizada_por` | `bigint` | Sí | FK → `usuarios.id` | Autor del último ajuste; nulo para catálogo inicial. |
| `actualizada_en` | `timestamptz` | No | Default: `CURRENT_TIMESTAMP` | Último cambio. |

Restricciones declarativas:

- `tipo`: `CHECK (tipo IN ('OBLEA','REVISION_PH','OBLIGACION','LIQUIDACION'))`
- `dias_anticipacion`: `CHECK (dias_anticipacion BETWEEN 0 AND 3650)`

## `alertas`

| Campo | Tipo | Nulo | Claves / valor inicial | Significado |
| --- | --- | --- | --- | --- |
| `id` | `bigint` | No | PK; Identity | Aviso interno, sin mensajería externa. |
| `regla_id` | `bigint` | No | FK → `reglas_alerta.id` | Regla que produjo el aviso. |
| `oblea_id` | `bigint` | Sí | FK → `obleas.id` | Vencimiento de oblea, si corresponde. |
| `revision_id` | `bigint` | Sí | FK → `revisiones_cilindros.id` | Vencimiento de ensayo, si corresponde. |
| `obligacion_id` | `bigint` | Sí | FK → `obligaciones.id` | Vencimiento de deuda, si corresponde. |
| `liquidacion_id` | `bigint` | Sí | FK → `liquidaciones.id` | Vencimiento de lote, si corresponde. |
| `vence_el` | `date` | No | — | Vencimiento que originó el aviso. |
| `creada_en` | `timestamptz` | No | Default: `CURRENT_TIMESTAMP` | Creación del aviso. |
| `atendida_en` | `timestamptz` | Sí | — | Lectura/atención manual, sin modificar el hecho origen. |
| `atendida_por` | `bigint` | Sí | FK → `usuarios.id` | Usuario que atendió el aviso. |

Restricciones declarativas:

- `CHECK (num_nonnulls(oblea_id, revision_id, obligacion_id, liquidacion_id) = 1)`
- `CHECK ((atendida_en IS NULL AND atendida_por IS NULL) OR (atendida_en IS NOT NULL AND atendida_por IS NOT NULL))`

Índices explícitos:

- `CREATE UNIQUE INDEX uq_alerta_oblea ON alertas (regla_id, oblea_id, vence_el) WHERE oblea_id IS NOT NULL;`
- `CREATE UNIQUE INDEX uq_alerta_revision ON alertas (regla_id, revision_id, vence_el) WHERE revision_id IS NOT NULL;`
- `CREATE UNIQUE INDEX uq_alerta_obligacion ON alertas (regla_id, obligacion_id, vence_el) WHERE obligacion_id IS NOT NULL;`
- `CREATE UNIQUE INDEX uq_alerta_liquidacion ON alertas (regla_id, liquidacion_id, vence_el) WHERE liquidacion_id IS NOT NULL;`
- `CREATE INDEX ix_alertas_pendientes ON alertas (vence_el) WHERE atendida_en IS NULL;`

## Alcance de las restricciones

El DDL asegura integridad de referencias, tipos, importes, unicidad declarada y consistencia de cada registro. No implementa permisos, transiciones, bloqueo de concurrencia ni comprobaciones que comparan conjuntos de filas. La matriz de [invariantes](../docs/segunda-entrega/MODELO_DATOS.md#invariantes-y-responsabilidad-de-validación) especifica esos controles futuros; no se afirma que el esquema, por sí solo, los impida.
