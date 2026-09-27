-- CILGAS / Segunda entrega: diseño físico de referencia, NO migración productiva.
-- PostgreSQL 16+. Ejecutar únicamente en una base vacía y descartable para validar el diseño.
-- Incluye estructura y restricciones declarativas; no contiene lógica de negocio.
BEGIN;

CREATE TABLE roles (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, -- Identidad del rol.
    codigo varchar(30) NOT NULL UNIQUE, -- ADMINISTRADOR u OPERADOR.
    nombre varchar(80) NOT NULL, -- Nombre visible.
    descripcion text NOT NULL -- Alcance general del rol.
);
CREATE TABLE permisos (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, -- Identidad de capacidad autorizable.
    codigo varchar(80) NOT NULL UNIQUE, -- Código estable de capacidad.
    descripcion text NOT NULL -- Acción habilitada.
);
CREATE TABLE roles_permisos (
    rol_id bigint NOT NULL REFERENCES roles(id), -- Rol que recibe la capacidad.
    permiso_id bigint NOT NULL REFERENCES permisos(id), -- Capacidad concedida.
    PRIMARY KEY (rol_id, permiso_id)
);
CREATE TABLE usuarios (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, -- Identidad interna; no representa al cliente.
    rol_id bigint NOT NULL REFERENCES roles(id), -- Un rol por usuario en el MVP.
    nombre varchar(120) NOT NULL, -- Nombre del operador.
    email varchar(254) NOT NULL, -- Email normalizado para iniciar sesión.
    password_hash text NOT NULL, -- Hash seguro; nunca contraseña en claro.
    activo boolean NOT NULL DEFAULT true, -- Permite revocar el acceso sin borrar historia.
    creado_en timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP -- Alta del usuario.
);
CREATE UNIQUE INDEX uq_usuarios_email ON usuarios (lower(email));
CREATE TABLE sesiones (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, -- Identidad de sesión.
    usuario_id bigint NOT NULL REFERENCES usuarios(id), -- Usuario autenticado.
    token_hash char(64) NOT NULL UNIQUE, -- Huella del token opaco, no el token utilizable.
    creado_en timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP, -- Inicio de sesión.
    vence_en timestamptz NOT NULL, -- Expiración absoluta.
    revocado_en timestamptz, -- Cierre de sesión o revocación.
    CHECK (vence_en > creado_en),
    CHECK (revocado_en IS NULL OR revocado_en >= creado_en)
);
CREATE INDEX ix_sesiones_usuario_vencimiento ON sesiones (usuario_id, vence_en);
CREATE TABLE auditoria (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, -- Identidad de evento auditable.
    usuario_id bigint REFERENCES usuarios(id), -- Actor; puede faltar en un intento de acceso fallido.
    ocurrido_en timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP, -- Instante del hecho.
    accion varchar(80) NOT NULL, -- Acción sensible o evento de seguridad.
    entidad varchar(80) NOT NULL, -- Nombre del agregado afectado, como metadato de auditoría.
    entidad_clave varchar(100), -- Identificador textual histórico; no sustituye una FK de negocio.
    resultado varchar(15) NOT NULL CHECK (resultado IN ('EXITO','RECHAZADO')), -- Resultado del intento.
    detalle text, -- Motivo y diferencias mínimas; excluye contraseñas, tokens y fichas completas.
    correlacion_id uuid -- Vincula eventos de una misma operación.
);
CREATE INDEX ix_auditoria_fecha ON auditoria (ocurrido_en);
CREATE INDEX ix_auditoria_entidad ON auditoria (entidad, entidad_clave, ocurrido_en);

CREATE TABLE personas (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, -- Persona física o jurídica relacionada con servicios.
    tipo varchar(10) NOT NULL CHECK (tipo IN ('FISICA','JURIDICA')), -- Naturaleza de la persona.
    nombre_razon_social varchar(180) NOT NULL, -- Nombre completo o razón social.
    documento_tipo varchar(20) NOT NULL, -- DNI, CUIT u otro documento validado.
    documento_numero varchar(30) NOT NULL, -- Identificador conservado como texto.
    calle varchar(180), -- Calle del domicilio, separada del número para imprimir la ficha.
    numero varchar(20), -- Altura o indicación sin número, conservada como texto.
    piso_depto varchar(40), -- Piso y departamento cuando corresponde.
    localidad varchar(100), -- Localidad del domicilio.
    provincia varchar(100), -- Provincia del domicilio.
    codigo_postal varchar(15), -- Código postal alfanumérico.
    telefono varchar(40), -- Contacto telefónico.
    email varchar(254), -- Contacto de correo opcional.
    activo boolean NOT NULL DEFAULT true, -- Baja lógica del maestro.
    creado_en timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP, -- Alta.
    UNIQUE (documento_tipo, documento_numero)
);
CREATE INDEX ix_personas_nombre ON personas (nombre_razon_social);
CREATE TABLE vehiculos (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, -- Identidad del vehículo.
    dominio varchar(15) NOT NULL UNIQUE, -- Patente normalizada como texto.
    marca varchar(80) NOT NULL, -- Marca del vehículo.
    modelo varchar(100) NOT NULL, -- Modelo comercial.
    anio smallint NOT NULL CHECK (anio BETWEEN 1900 AND 2200), -- Año del modelo.
    motor_numero varchar(80), -- Identificador del motor.
    chasis_numero varchar(80), -- Identificador del chasis.
    tipo varchar(15) CHECK (tipo IN ('TAXI','PICKUP','PARTICULAR','BUS','OFICIAL','OTROS')), -- Clasificación controlada observada en las casillas.
    tipo_otro_detalle varchar(100), -- Descripción obligatoria al seleccionar Otros.
    uso varchar(60), -- Uso particular u otro informado.
    inyeccion boolean, -- Sí, no o no informado; no confundir con el modelo de inyección.
    CHECK ((tipo = 'OTROS' AND tipo_otro_detalle IS NOT NULL) OR (tipo IS DISTINCT FROM 'OTROS' AND tipo_otro_detalle IS NULL)),
    activo boolean NOT NULL DEFAULT true -- Baja lógica.
);
CREATE TABLE vehiculo_personas (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, -- Relación histórica de titularidad o contacto.
    vehiculo_id bigint NOT NULL REFERENCES vehiculos(id), -- Vehículo relacionado.
    persona_id bigint NOT NULL REFERENCES personas(id), -- Titular o contacto.
    rol varchar(15) NOT NULL CHECK (rol IN ('TITULAR','CONTACTO')), -- Función de la persona.
    desde date NOT NULL, -- Inicio de vigencia conocido.
    hasta date, -- Fin de vigencia, exclusivo; nulo mientras continúa.
    CHECK (hasta IS NULL OR hasta > desde)
);
CREATE UNIQUE INDEX uq_vehiculo_titular_vigente ON vehiculo_personas (vehiculo_id) WHERE rol = 'TITULAR' AND hasta IS NULL;
CREATE INDEX ix_vehiculo_personas_persona ON vehiculo_personas (persona_id, vehiculo_id);
CREATE TABLE actores_regulatorios (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, -- Actor técnico, separado de proveedores.
    tipo varchar(5) NOT NULL CHECK (tipo IN ('PEC','TDM','CRPC')), -- Responsabilidad regulatoria informada.
    codigo varchar(40) NOT NULL, -- Matrícula o código como texto.
    nombre varchar(180) NOT NULL, -- Denominación.
    cuit varchar(20), -- CUIT cuando corresponde.
    domicilio varchar(220), -- Domicilio informado.
    localidad varchar(100), -- Localidad informada.
    telefono varchar(40), -- Contacto.
    responsable_tecnico varchar(140), -- Responsable que se imprimirá en el documento.
    matricula_responsable varchar(40), -- Matrícula profesional cuando corresponda.
    activo boolean NOT NULL DEFAULT true, -- Habilitado para nuevas selecciones.
    UNIQUE (tipo, codigo),
    UNIQUE (id, tipo)
);
CREATE TABLE proveedores (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, -- Proveedor comercial del costo.
    nombre_razon_social varchar(180) NOT NULL, -- Identificación comercial.
    cuit varchar(20) UNIQUE, -- Identificador fiscal opcional.
    telefono varchar(40), -- Contacto.
    email varchar(254), -- Correo de contacto.
    observaciones text, -- Condiciones operativas.
    activo boolean NOT NULL DEFAULT true -- Baja lógica sin borrar deudas.
);

CREATE TABLE modelos_componentes (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, -- Modelo técnico de componente serializado.
    tipo varchar(15) NOT NULL CHECK (tipo IN ('CILINDRO','VALVULA','REGULADOR')), -- Categoría técnica.
    codigo_homologacion varchar(50) NOT NULL, -- Código de homologación observado/documentado.
    marca varchar(100), -- Marca cuando está disponible.
    modelo varchar(100), -- Denominación del modelo.
    capacidad_litros numeric(7,2), -- Capacidad nominal del cilindro, si corresponde.
    activo boolean NOT NULL DEFAULT true, -- Disponible para nuevas selecciones.
    UNIQUE (tipo, codigo_homologacion),
    UNIQUE (id, tipo),
    CHECK (capacidad_litros IS NULL OR (tipo = 'CILINDRO' AND capacidad_litros > 0))
);
CREATE TABLE componentes (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, -- Identidad individual persistente.
    modelo_id bigint NOT NULL, -- Modelo del componente.
    tipo varchar(15) NOT NULL, -- Tipo validado contra el modelo mediante FK compuesta.
    numero_serie varchar(80) NOT NULL, -- Serie conservada como texto, incluso ceros iniciales.
    fabricacion_mes date, -- Mes de fabricación representado por el día 1.
    fecha_baja date, -- Baja definitiva; no equivale a retiro de un vehículo.
    observaciones text, -- Datos técnicos complementarios.
    UNIQUE (modelo_id, numero_serie),
    UNIQUE (id, tipo),
    FOREIGN KEY (modelo_id, tipo) REFERENCES modelos_componentes(id, tipo),
    CHECK (fabricacion_mes IS NULL OR EXTRACT(DAY FROM fabricacion_mes) = 1)
);
CREATE TABLE catalogo_servicios (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, -- Oferta configurable, no un trabajo concreto.
    codigo varchar(40) NOT NULL UNIQUE, -- Código estable comercial.
    nombre varchar(140) NOT NULL, -- Nombre de la oferta.
    descripcion text NOT NULL, -- Trabajo propuesto.
    tipo varchar(25) NOT NULL CHECK (tipo IN ('REVISION_ANUAL','REVISION_QUINQUENAL','CONVERSION','MODIFICACION','DESMONTAJE','OTRO')), -- Clasificación operativa propia, separada de códigos de ficha.
    precio_sugerido numeric(14,2) NOT NULL CHECK (precio_sugerido >= 0), -- Valor comercial de referencia en ARS.
    activo boolean NOT NULL DEFAULT true -- Oferta seleccionable.
);
CREATE TABLE catalogo_items (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, -- Composición habitual de una oferta.
    catalogo_servicio_id bigint NOT NULL REFERENCES catalogo_servicios(id), -- Oferta propietaria.
    orden smallint NOT NULL CHECK (orden > 0), -- Orden de presentación.
    descripcion varchar(180) NOT NULL, -- Concepto sugerido.
    tipo varchar(20) NOT NULL CHECK (tipo IN ('COMPONENTE','INSPECCION','ENSAYO_PH','OBLEA','MANO_OBRA','ACCESORIO','OTRO')), -- Naturaleza del ítem.
    cantidad numeric(10,2) NOT NULL CHECK (cantidad > 0), -- Cantidad propuesta.
    precio_unitario numeric(14,2) NOT NULL CHECK (precio_unitario >= 0), -- Precio propuesto por unidad.
    proveedor_id bigint REFERENCES proveedores(id), -- Proveedor propuesto; no crea deuda.
    costo_unitario numeric(14,2) NOT NULL DEFAULT 0 CHECK (costo_unitario >= 0), -- Costo propuesto; no crea egreso.
    UNIQUE (catalogo_servicio_id, orden)
);
CREATE TABLE servicios (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, -- Borrador o trabajo concreto.
    vehiculo_id bigint NOT NULL REFERENCES vehiculos(id), -- Vehículo atendido.
    catalogo_servicio_id bigint NOT NULL REFERENCES catalogo_servicios(id), -- Oferta de origen.
    antecedente_id bigint REFERENCES servicios(id), -- Servicio previo renovado; máximo un sucesor directo no cancelado.
    configuracion_base_id bigint, -- Configuración consultada al preparar el servicio; FK agregada más abajo.
    estado varchar(15) NOT NULL CHECK (estado IN ('BORRADOR','CONFIRMADO','CANCELADO')), -- Borrador editable, realizado confirmado o borrador cancelado.
    fecha_servicio date NOT NULL, -- Fecha efectiva de realización prevista o confirmada.
    descripcion varchar(180) NOT NULL, -- Descripción histórica, independiente del catálogo futuro.
    tipo varchar(25) NOT NULL CHECK (tipo IN ('REVISION_ANUAL','REVISION_QUINQUENAL','CONVERSION','MODIFICACION','DESMONTAJE','OTRO')), -- Tipo comercial fijado para este servicio.
    operacion_ficha char(1) CHECK (operacion_ficha IN ('C','M','R','D','B')), -- Marca del formulario, independiente de la existencia de PH.
    incluye_ph boolean NOT NULL DEFAULT false, -- Ensayo PH realizado como parte del trabajo.
    importe_total numeric(14,2) NOT NULL CHECK (importe_total >= 0), -- Total pactado en ARS; al confirmar debe coincidir con ítems.
    observaciones text, -- Indicaciones del trabajo.
    creado_por bigint NOT NULL REFERENCES usuarios(id), -- Autor del borrador.
    creado_en timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP, -- Inicio del registro.
    confirmado_por bigint REFERENCES usuarios(id), -- Responsable de confirmación.
    confirmado_en timestamptz, -- Instante de confirmación.
    cancelado_en timestamptz, -- Cancelación de un borrador sin efectos automáticos.
    motivo_cancelacion text, -- Justificación de cancelación.
    identificador_sicgnc varchar(100), -- Identificador externo cargado manualmente, incluso en operaciones sin oblea.
    registrado_sicgnc_en timestamptz, -- Fecha de carga manual de ese resultado externo.
    CHECK ((identificador_sicgnc IS NULL AND registrado_sicgnc_en IS NULL) OR (identificador_sicgnc IS NOT NULL AND registrado_sicgnc_en IS NOT NULL)),
    UNIQUE (id, vehiculo_id),
    CHECK (antecedente_id IS NULL OR antecedente_id <> id),
    CHECK ((estado = 'CONFIRMADO' AND confirmado_en IS NOT NULL AND confirmado_por IS NOT NULL AND cancelado_en IS NULL) OR (estado = 'BORRADOR' AND confirmado_en IS NULL AND confirmado_por IS NULL AND cancelado_en IS NULL) OR (estado = 'CANCELADO' AND confirmado_en IS NULL AND confirmado_por IS NULL AND cancelado_en IS NOT NULL AND motivo_cancelacion IS NOT NULL))
);
CREATE UNIQUE INDEX uq_servicio_renovacion_activa ON servicios (antecedente_id) WHERE antecedente_id IS NOT NULL AND estado <> 'CANCELADO';
CREATE INDEX ix_servicios_vehiculo_fecha ON servicios (vehiculo_id, fecha_servicio);
CREATE INDEX ix_servicios_estado_fecha ON servicios (estado, fecha_servicio);
CREATE TABLE servicio_personas (
    servicio_id bigint NOT NULL REFERENCES servicios(id), -- Trabajo concreto.
    persona_id bigint NOT NULL REFERENCES personas(id), -- Persona que intervino.
    rol varchar(15) NOT NULL CHECK (rol IN ('TITULAR','CONTACTO','PAGADOR')), -- Una persona puede cumplir varios roles.
    PRIMARY KEY (servicio_id, rol)
);
CREATE INDEX ix_servicio_personas_persona ON servicio_personas (persona_id, servicio_id);
CREATE TABLE servicio_items (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, -- Ítem real o propuesto del servicio.
    servicio_id bigint NOT NULL REFERENCES servicios(id), -- Servicio propietario.
    orden smallint NOT NULL CHECK (orden > 0), -- Orden de presentación.
    catalogo_item_id bigint REFERENCES catalogo_items(id), -- Origen opcional de la propuesta.
    descripcion varchar(180) NOT NULL, -- Descripción histórica independiente del catálogo.
    tipo varchar(20) NOT NULL CHECK (tipo IN ('COMPONENTE','INSPECCION','ENSAYO_PH','OBLEA','MANO_OBRA','ACCESORIO','OTRO')), -- Naturaleza del concepto.
    componente_id bigint REFERENCES componentes(id), -- Componente individual cuando aplica.
    accion varchar(15) CHECK (accion IN ('INSTALAR','RETIRAR','INSPECCIONAR','ENSAYAR','MANTENER')), -- Intervención real sobre componente.
    cantidad numeric(10,2) NOT NULL CHECK (cantidad > 0), -- Cantidad efectivamente pactada.
    precio_unitario numeric(14,2) NOT NULL CHECK (precio_unitario >= 0), -- Precio histórico por unidad.
    descuento numeric(14,2) NOT NULL DEFAULT 0 CHECK (descuento >= 0), -- Descuento total del renglón.
    importe numeric(14,2) NOT NULL CHECK (importe >= 0), -- Neto del renglón en ARS.
    UNIQUE (servicio_id, orden),
    UNIQUE (id, servicio_id),
    CHECK (importe = round(cantidad * precio_unitario - descuento, 2)),
    CHECK (componente_id IS NULL OR (cantidad = 1 AND accion IS NOT NULL))
);
CREATE TABLE servicio_costos (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, -- Costo atribuido al trabajo; admite varios proveedores.
    servicio_id bigint NOT NULL REFERENCES servicios(id), -- Trabajo al que pertenece.
    servicio_item_id bigint, -- Renglón relacionado, si existe.
    proveedor_id bigint REFERENCES proveedores(id), -- Acreedor cuando el costo genera obligación.
    concepto varchar(180) NOT NULL, -- Concepto histórico del costo.
    tratamiento varchar(15) NOT NULL CHECK (tratamiento IN ('PROVEEDOR','ABSORBIDO')), -- Distingue deuda externa de costo interno informativo.
    importe numeric(14,2) NOT NULL CHECK (importe > 0), -- Costo histórico en ARS.
    UNIQUE (id, servicio_id, proveedor_id, importe),
    FOREIGN KEY (servicio_item_id, servicio_id) REFERENCES servicio_items(id, servicio_id),
    CHECK ((tratamiento = 'PROVEEDOR' AND proveedor_id IS NOT NULL) OR (tratamiento = 'ABSORBIDO' AND proveedor_id IS NULL))
);
CREATE INDEX ix_servicio_costos_servicio ON servicio_costos (servicio_id);
CREATE TABLE servicio_preparacion (
    servicio_id bigint PRIMARY KEY REFERENCES servicios(id), -- Cabecera técnica editable mientras el servicio es borrador.
    pec_id bigint, -- PEC propuesto para la ficha.
    pec_tipo varchar(5) NOT NULL DEFAULT 'PEC' CHECK (pec_tipo = 'PEC'), -- Discriminador de FK.
    tdm_id bigint, -- TdM propuesto para la ficha.
    tdm_tipo varchar(5) NOT NULL DEFAULT 'TDM' CHECK (tdm_tipo = 'TDM'), -- Discriminador de FK.
    oblea_anterior varchar(40), -- Número transcripto aunque sea anterior al corte.
    oblea_nueva varchar(40), -- Número preparado, todavía no emitido.
    habilitada_el date, -- Fecha preparada para la habilitación.
    vence_el date, -- Fecha preparada para vencimiento de oblea.
    observaciones_ficha text, -- Texto a imprimir en la ficha.
    FOREIGN KEY (pec_id, pec_tipo) REFERENCES actores_regulatorios(id, tipo),
    FOREIGN KEY (tdm_id, tdm_tipo) REFERENCES actores_regulatorios(id, tipo),
    CHECK (vence_el IS NULL OR habilitada_el IS NULL OR vence_el > habilitada_el)
);
CREATE TABLE servicio_intervenciones (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, -- Preparación de un renglón técnico; no instala ni ensaya por guardarse.
    servicio_id bigint NOT NULL REFERENCES servicios(id), -- Borrador propietario; se conserva al confirmar.
    tipo varchar(15) NOT NULL CHECK (tipo IN ('REGULADOR','CILINDRO','VALVULA','ACCESORIO')), -- Sección técnica del documento.
    renglon smallint NOT NULL CHECK (renglon > 0), -- Orden impreso, independiente de instalación final.
    componente_id bigint, -- Identidad individual conocida; FK tipada.
    codigo_homologacion varchar(50), -- Código preparado para imprimir.
    numero_serie varchar(80), -- Serie preparada para imprimir.
    condicion varchar(30), -- Estado nuevo/usado conforme a validación operativa.
    accion char(1) CHECK (accion IN ('M','S','D','B')), -- Marca documental, sin deducirla del estado actual.
    posicion_final smallint, -- Posición prevista si queda instalado; nulo para retirados/no instalados.
    fabricacion_mes date, -- Mes/año, representado internamente con día 1.
    revision_mes date, -- Mes/año que debe figurar en el formulario.
    crpc_id bigint, -- Centro propuesto si corresponde revisión.
    crpc_tipo varchar(5) NOT NULL DEFAULT 'CRPC' CHECK (crpc_tipo = 'CRPC'), -- Discriminador de FK.
    realiza_ph boolean NOT NULL DEFAULT false, -- El renglón de cilindro incluye un ensayo PH.
    fecha_ensayo date, -- Fecha del ensayo preparada antes de confirmar.
    vence_revision_el date, -- Próxima revisión preparada si corresponde.
    resultado_ph varchar(15) CHECK (resultado_ph IN ('APROBADO','RECHAZADO')), -- Resultado técnico preparado.
    numero_certificado varchar(80), -- Identificador preparado del certificado.
    descripcion varchar(180), -- Concepto/accesorio u observaciones del renglón.
    UNIQUE (servicio_id, tipo, renglon),
    FOREIGN KEY (componente_id, tipo) REFERENCES componentes(id, tipo),
    FOREIGN KEY (crpc_id, crpc_tipo) REFERENCES actores_regulatorios(id, tipo),
    CHECK ((tipo = 'REGULADOR' AND renglon BETWEEN 1 AND 3) OR (tipo IN ('CILINDRO','VALVULA') AND renglon BETWEEN 1 AND 4) OR tipo = 'ACCESORIO'),
    CHECK (tipo <> 'REGULADOR' OR accion IS NULL OR accion IN ('M','D','B')),
    CHECK (tipo <> 'ACCESORIO' OR componente_id IS NULL),
    CHECK (posicion_final IS NULL OR (tipo = 'REGULADOR' AND posicion_final = 1) OR (tipo IN ('CILINDRO','VALVULA') AND posicion_final BETWEEN 1 AND 4)),
    CHECK (NOT realiza_ph OR tipo = 'CILINDRO'),
    CHECK (fabricacion_mes IS NULL OR EXTRACT(DAY FROM fabricacion_mes) = 1),
    CHECK (revision_mes IS NULL OR EXTRACT(DAY FROM revision_mes) = 1),
    CHECK (vence_revision_el IS NULL OR fecha_ensayo IS NULL OR vence_revision_el > fecha_ensayo)
);
CREATE UNIQUE INDEX uq_intervencion_posicion_final ON servicio_intervenciones (servicio_id, tipo, posicion_final) WHERE posicion_final IS NOT NULL;
CREATE TABLE configuraciones (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, -- Versión histórica del equipo de GNC.
    vehiculo_id bigint NOT NULL REFERENCES vehiculos(id), -- Vehículo propietario de la versión.
    servicio_origen_id bigint, -- Servicio que creó la versión; nulo sólo para el relevamiento inicial.
    vigente_desde timestamptz NOT NULL, -- Inicio de validez, inclusivo.
    vigente_hasta timestamptz, -- Fin de validez, exclusivo; nulo para la versión vigente.
    observaciones text, -- Aclaración del relevamiento/configuración.
    UNIQUE (id, vehiculo_id),
    UNIQUE (servicio_origen_id),
    FOREIGN KEY (servicio_origen_id, vehiculo_id) REFERENCES servicios(id, vehiculo_id),
    CHECK (vigente_hasta IS NULL OR vigente_hasta > vigente_desde)
);
CREATE UNIQUE INDEX uq_configuracion_vigente ON configuraciones (vehiculo_id) WHERE vigente_hasta IS NULL;
ALTER TABLE servicios ADD CONSTRAINT fk_servicio_configuracion_base FOREIGN KEY (configuracion_base_id, vehiculo_id) REFERENCES configuraciones(id, vehiculo_id);
CREATE TABLE configuracion_componentes (
    configuracion_id bigint NOT NULL REFERENCES configuraciones(id), -- Versión del equipo.
    componente_id bigint NOT NULL, -- Componente individual instalado en esa versión.
    tipo varchar(15) NOT NULL, -- Tipo contrastado por FK con el componente real.
    posicion smallint NOT NULL, -- 1 para regulador; 1 a 4 para cilindro/válvula.
    PRIMARY KEY (configuracion_id, tipo, posicion),
    UNIQUE (configuracion_id, componente_id),
    FOREIGN KEY (componente_id, tipo) REFERENCES componentes(id, tipo),
    CHECK ((tipo = 'REGULADOR' AND posicion = 1) OR (tipo IN ('CILINDRO','VALVULA') AND posicion BETWEEN 1 AND 4))
);
CREATE INDEX ix_config_componentes_componente ON configuracion_componentes (componente_id, configuracion_id);
CREATE TABLE configuracion_accesorios (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, -- Accesorio no serializado de una versión.
    configuracion_id bigint NOT NULL REFERENCES configuraciones(id), -- Equipo al que pertenece.
    descripcion varchar(160) NOT NULL, -- Manómetro, mezclador, venteo, etcétera.
    codigo varchar(50), -- Código informado, si existe.
    numero_serie varchar(80), -- Serie informada en el accesorio cuando existe.
    cantidad smallint NOT NULL CHECK (cantidad > 0) -- Cantidad instalada.
);
CREATE INDEX ix_config_accesorios_config ON configuracion_accesorios (configuracion_id);
CREATE TABLE movimientos_componentes (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, -- Evento individual de trazabilidad técnica, sin stock comercial.
    componente_id bigint NOT NULL REFERENCES componentes(id), -- Componente que se mueve.
    servicio_id bigint NOT NULL REFERENCES servicios(id), -- Trabajo que origina la intervención.
    accion varchar(15) NOT NULL CHECK (accion IN ('INSTALAR','RETIRAR','DEVOLVER','DESCARTAR','RECIBIR')), -- Evento de ubicación/custodia.
    origen varchar(20) NOT NULL CHECK (origen IN ('VEHICULO','CILGAS','CLIENTE','PROVEEDOR','DESCONOCIDO')), -- Custodia de origen.
    destino varchar(20) NOT NULL CHECK (destino IN ('VEHICULO','CILGAS','CLIENTE','PROVEEDOR','DESCARTE','DESCONOCIDO')), -- Custodia de destino; no presume reventa.
    ocurrido_en timestamptz NOT NULL, -- Momento de la intervención.
    observaciones text, -- Contexto de retiro o destino pendiente.
    registrado_por bigint NOT NULL REFERENCES usuarios(id) -- Responsable del registro.
);
CREATE INDEX ix_movimientos_componente_fecha ON movimientos_componentes (componente_id, ocurrido_en);
CREATE INDEX ix_movimientos_servicio ON movimientos_componentes (servicio_id);

CREATE TABLE documentos (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, -- Metadatos de un archivo técnico privado.
    clase varchar(20) NOT NULL CHECK (clase IN ('FICHA_PDF','CERTIFICADO_PH','OTRO_TECNICO')), -- Tipo documental.
    clave_almacenamiento varchar(300) NOT NULL UNIQUE, -- Ruta opaca en almacenamiento privado, no URL pública.
    nombre_archivo varchar(180) NOT NULL, -- Nombre de descarga.
    mime_type varchar(80) NOT NULL, -- Tipo de archivo validado.
    tamanio_bytes bigint NOT NULL CHECK (tamanio_bytes > 0), -- Tamaño máximo a validar en aplicación.
    sha256 char(64) NOT NULL CHECK (sha256 ~ '^[0-9a-f]{64}$'), -- Huella para integridad y trazabilidad.
    creado_por bigint NOT NULL REFERENCES usuarios(id), -- Responsable de generación o carga.
    creado_en timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP -- Fecha de creación.
);
CREATE TABLE fichas (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, -- Versión inmutable de una ficha emitida.
    servicio_id bigint NOT NULL REFERENCES servicios(id), -- Servicio documentado.
    version smallint NOT NULL CHECK (version > 0), -- Secuencia documental por servicio.
    rectifica_id bigint UNIQUE, -- Versión anterior reemplazada; jamás se sobrescribe.
    motivo_rectificacion text, -- Explicación obligatoria para versiones posteriores.
    plantilla_version varchar(40) NOT NULL, -- Versión del diseño PDF.
    snapshot_version smallint NOT NULL CHECK (snapshot_version > 0), -- Versión del contrato del contenido JSONB.
    contenido jsonb NOT NULL CHECK (jsonb_typeof(contenido) = 'object'), -- Fotografía completa de personas, vehículo, actores, componentes, fechas, datos de firmantes y espacios de firma; nunca firmas generadas.
    pdf_estado varchar(15) NOT NULL DEFAULT 'PENDIENTE' CHECK (pdf_estado IN ('PENDIENTE','GENERADO','ERROR')), -- Progreso de generación; no cambia el contenido histórico.
    pdf_documento_id bigint UNIQUE REFERENCES documentos(id), -- PDF correspondiente a este snapshot, enlazado después de generarse.
    pdf_error text, -- Diagnóstico resumido del último fallo de generación, sin datos sensibles.
    pec_id bigint NOT NULL, -- PEC seleccionado al emitir; el snapshot conserva sus valores.
    pec_tipo varchar(5) NOT NULL DEFAULT 'PEC' CHECK (pec_tipo = 'PEC'), -- Discriminador para FK tipada.
    tdm_id bigint NOT NULL, -- Taller seleccionado al emitir.
    tdm_tipo varchar(5) NOT NULL DEFAULT 'TDM' CHECK (tdm_tipo = 'TDM'), -- Discriminador para FK tipada.
    emitida_por bigint NOT NULL REFERENCES usuarios(id), -- Responsable de la emisión.
    emitida_en timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP, -- Momento de confirmación documental.
    CHECK ((pdf_estado = 'GENERADO' AND pdf_documento_id IS NOT NULL AND pdf_error IS NULL) OR (pdf_estado = 'PENDIENTE' AND pdf_documento_id IS NULL AND pdf_error IS NULL) OR (pdf_estado = 'ERROR' AND pdf_documento_id IS NULL AND pdf_error IS NOT NULL)),
    UNIQUE (servicio_id, version),
    UNIQUE (id, servicio_id),
    FOREIGN KEY (rectifica_id, servicio_id) REFERENCES fichas(id, servicio_id),
    FOREIGN KEY (pec_id, pec_tipo) REFERENCES actores_regulatorios(id, tipo),
    FOREIGN KEY (tdm_id, tdm_tipo) REFERENCES actores_regulatorios(id, tipo),
    CHECK ((version = 1 AND rectifica_id IS NULL AND motivo_rectificacion IS NULL) OR (version > 1 AND rectifica_id IS NOT NULL AND motivo_rectificacion IS NOT NULL)),
    CHECK (rectifica_id IS NULL OR rectifica_id <> id)
);
CREATE UNIQUE INDEX uq_ficha_original_servicio ON fichas (servicio_id) WHERE rectifica_id IS NULL;
CREATE TABLE ficha_componentes (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, -- Renglón documental; NO implica componente instalado al final.
    ficha_id bigint NOT NULL REFERENCES fichas(id), -- Versión documental propietaria.
    tipo varchar(15) NOT NULL CHECK (tipo IN ('REGULADOR','CILINDRO','VALVULA','ACCESORIO')), -- Sección de la ficha.
    renglon smallint NOT NULL CHECK (renglon > 0), -- Posición impresa, sin emparejamiento automático cilindro-válvula.
    componente_id bigint, -- Componente conocido; opcional para transcripción histórica incompleta.
    codigo_homologacion varchar(50), -- Valor histórico mostrado en esa versión.
    numero_serie varchar(80), -- Serie histórica impresa.
    condicion varchar(30), -- Condición tal como se validó para el formulario.
    accion char(1) CHECK (accion IN ('M','S','D','B')), -- Marca del renglón; su significado definitivo se valida con CILGAS.
    fabricacion_mes date, -- Fabricación con precisión mes/año.
    revision_mes date, -- Revisión con precisión mes/año impresa en la ficha.
    crpc_codigo varchar(40), -- Código histórico del CRPC impreso.
    descripcion varchar(180), -- Nombre o detalle adicional/accesorio.
    UNIQUE (ficha_id, tipo, renglon),
    FOREIGN KEY (componente_id, tipo) REFERENCES componentes(id, tipo),
    CHECK ((tipo = 'REGULADOR' AND renglon BETWEEN 1 AND 3) OR (tipo IN ('CILINDRO','VALVULA') AND renglon BETWEEN 1 AND 4) OR tipo = 'ACCESORIO'),
    CHECK (tipo <> 'ACCESORIO' OR componente_id IS NULL),
    CHECK (tipo <> 'REGULADOR' OR accion IS NULL OR accion IN ('M','D','B')),
    CHECK (fabricacion_mes IS NULL OR EXTRACT(DAY FROM fabricacion_mes) = 1),
    CHECK (revision_mes IS NULL OR EXTRACT(DAY FROM revision_mes) = 1)
);
CREATE TABLE obleas (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, -- Resultado técnico de habilitación/oblea.
    servicio_id bigint NOT NULL UNIQUE REFERENCES servicios(id), -- Servicio emisor.
    numero varchar(40) NOT NULL UNIQUE, -- Oblea nueva, como identificador textual.
    numero_anterior varchar(40), -- Oblea previa transcripta incluso si es anterior al sistema.
    habilitada_el date NOT NULL, -- Fecha de habilitación informada.
    vence_el date NOT NULL, -- Vencimiento confirmado, no inferido de forma irreversible.
    CHECK (vence_el > habilitada_el)
);
CREATE INDEX ix_obleas_vencimiento ON obleas (vence_el);
CREATE TABLE revisiones_cilindros (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, -- Ensayo PH individual; no es la revisión quinquenal comercial.
    servicio_id bigint NOT NULL REFERENCES servicios(id), -- Trabajo que lo incluye.
    componente_id bigint NOT NULL, -- Cilindro ensayado.
    componente_tipo varchar(15) NOT NULL DEFAULT 'CILINDRO' CHECK (componente_tipo = 'CILINDRO'), -- Discriminador de FK técnica.
    crpc_id bigint NOT NULL, -- Centro que realizó la revisión.
    crpc_tipo varchar(5) NOT NULL DEFAULT 'CRPC' CHECK (crpc_tipo = 'CRPC'), -- Discriminador de FK regulatoria.
    fecha_ensayo date NOT NULL, -- Día conocido del ensayo.
    vence_el date, -- Próxima revisión según dato validado; puede no aplicar si fue rechazado.
    resultado varchar(15) NOT NULL CHECK (resultado IN ('APROBADO','RECHAZADO')), -- Resultado técnico documentado.
    numero_certificado varchar(80), -- Identificación textual de certificado externo.
    certificado_documento_id bigint REFERENCES documentos(id), -- Archivo técnico si fue entregado.
    observaciones text, -- Hallazgos o motivo de rechazo.
    UNIQUE (servicio_id, componente_id),
    FOREIGN KEY (componente_id, componente_tipo) REFERENCES componentes(id, tipo),
    FOREIGN KEY (crpc_id, crpc_tipo) REFERENCES actores_regulatorios(id, tipo),
    CHECK (vence_el IS NULL OR vence_el > fecha_ensayo)
);
CREATE INDEX ix_revisiones_componente_fecha ON revisiones_cilindros (componente_id, fecha_ensayo);
CREATE INDEX ix_revisiones_vencimiento ON revisiones_cilindros (vence_el) WHERE resultado = 'APROBADO';

CREATE TABLE medios_pago (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, -- Medio efectivo de ingreso o egreso.
    codigo varchar(25) NOT NULL UNIQUE, -- EFECTIVO o TRANSFERENCIA en el MVP.
    nombre varchar(80) NOT NULL, -- Etiqueta visible.
    activo boolean NOT NULL DEFAULT true -- Habilitado para nuevos hechos.
);
CREATE TABLE convenios (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, -- Acuerdo con entidad pagadora; no tipo de oblea.
    entidad_persona_id bigint NOT NULL REFERENCES personas(id), -- Persona jurídica que paga.
    nombre varchar(120) NOT NULL UNIQUE, -- Identificación del convenio.
    condiciones text, -- Condiciones comerciales básicas.
    plazo_pago_dias integer NOT NULL DEFAULT 0 CHECK (plazo_pago_dias >= 0), -- Referencia para vencimiento de liquidaciones.
    activo boolean NOT NULL DEFAULT true -- Seleccionable para nuevas autorizaciones.
);
CREATE TABLE liquidaciones (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, -- Lote presentado a una entidad, todavía no es un cobro.
    convenio_id bigint NOT NULL REFERENCES convenios(id), -- Convenio del lote.
    numero varchar(60) NOT NULL, -- Número interno de presentación.
    estado varchar(15) NOT NULL CHECK (estado IN ('BORRADOR','ENTREGADA','COBRADA','ANULADA')), -- Ciclo básico del lote.
    entregada_el date, -- Fecha de presentación.
    vence_el date, -- Vencimiento financiero acordado.
    importe_total numeric(14,2) NOT NULL CHECK (importe_total >= 0), -- Total cerrado al presentar, igual a cupones incluidos.
    creada_por bigint NOT NULL REFERENCES usuarios(id), -- Responsable del lote.
    creada_en timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP, -- Alta.
    observaciones text, -- Referencia de presentación o anulación.
    UNIQUE (convenio_id, numero),
    UNIQUE (id, convenio_id),
    CHECK (estado NOT IN ('ENTREGADA','COBRADA') OR entregada_el IS NOT NULL),
    CHECK (vence_el IS NULL OR (entregada_el IS NOT NULL AND vence_el >= entregada_el))
);
CREATE INDEX ix_liquidaciones_estado_vencimiento ON liquidaciones (estado, vence_el);
CREATE TABLE cupones (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, -- Autorización comercial de un trabajo.
    convenio_id bigint NOT NULL REFERENCES convenios(id), -- Convenio emisor.
    servicio_id bigint NOT NULL UNIQUE REFERENCES servicios(id), -- Un cupón por servicio en el MVP.
    numero varchar(80) NOT NULL, -- Referencia de autorización.
    importe_autorizado numeric(14,2) NOT NULL CHECK (importe_autorizado > 0), -- Importe imputable a la entidad.
    autorizado_el date NOT NULL, -- Fecha de autorización.
    liquidacion_id bigint, -- Lote al que pertenece; nulo mientras está disponible.
    anulado_en timestamptz, -- Anulación auditable del cupón.
    motivo_anulacion text, -- Motivo de anulación.
    UNIQUE (convenio_id, numero),
    FOREIGN KEY (liquidacion_id, convenio_id) REFERENCES liquidaciones(id, convenio_id),
    CHECK ((anulado_en IS NULL AND motivo_anulacion IS NULL) OR (anulado_en IS NOT NULL AND motivo_anulacion IS NOT NULL))
);
CREATE INDEX ix_cupones_disponibles ON cupones (convenio_id) WHERE liquidacion_id IS NULL AND anulado_en IS NULL;
CREATE INDEX ix_cupones_liquidacion ON cupones (liquidacion_id);
CREATE TABLE operaciones_cobro (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, -- Operación atómica que agrupa medios y asignaciones a servicios.
    clave_idempotencia uuid NOT NULL UNIQUE, -- Evita duplicar una recepción al reintentar.
    origen varchar(15) NOT NULL CHECK (origen IN ('PARTICULAR','LIQUIDACION')), -- Procedencia comercial del dinero.
    liquidacion_id bigint REFERENCES liquidaciones(id), -- Lote pagado; nunca se suma como un ingreso adicional.
    pagador_id bigint REFERENCES personas(id), -- Persona que entrega o transfiere el dinero.
    recibido_en timestamptz NOT NULL, -- Fecha efectiva de recepción.
    importe_total numeric(14,2) NOT NULL CHECK (importe_total > 0), -- Control del total de sus cobros hijos.
    referencia varchar(140), -- Comprobante externo o nota.
    creado_por bigint NOT NULL REFERENCES usuarios(id), -- Responsable del registro.
    anulado_en timestamptz, -- Anulación completa por error; no representa devolución de dinero.
    anulado_por bigint REFERENCES usuarios(id), -- Administrador que autoriza anular.
    motivo_anulacion text, -- Motivo obligatorio.
    CHECK ((origen = 'PARTICULAR' AND liquidacion_id IS NULL) OR (origen = 'LIQUIDACION' AND liquidacion_id IS NOT NULL)),
    CHECK ((anulado_en IS NULL AND anulado_por IS NULL AND motivo_anulacion IS NULL) OR (anulado_en IS NOT NULL AND anulado_por IS NOT NULL AND motivo_anulacion IS NOT NULL))
);
CREATE UNIQUE INDEX uq_pago_activo_liquidacion ON operaciones_cobro (liquidacion_id) WHERE liquidacion_id IS NOT NULL AND anulado_en IS NULL;
CREATE TABLE cobros (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, -- Fracción efectivamente recibida e imputada desde el inicio a un servicio.
    operacion_id bigint NOT NULL REFERENCES operaciones_cobro(id), -- Cabecera común para ingreso combinado o liquidación.
    servicio_id bigint NOT NULL REFERENCES servicios(id), -- Servicio concreto, incluso borrador en un anticipo explícito.
    medio_pago_id bigint NOT NULL REFERENCES medios_pago(id), -- Medio de esta fracción.
    tipo varchar(15) NOT NULL CHECK (tipo IN ('ANTICIPO','PAGO','CONVENIO')), -- Naturaleza de la aplicación.
    importe numeric(14,2) NOT NULL CHECK (importe > 0), -- Único importe que se suma a ingresos reales.
    referencia varchar(140), -- Referencia de transferencia u otra fracción.
    UNIQUE (operacion_id, servicio_id, medio_pago_id)
);
CREATE INDEX ix_cobros_servicio ON cobros (servicio_id, operacion_id);
CREATE INDEX ix_operaciones_cobro_fecha ON operaciones_cobro (recibido_en);
CREATE TABLE obligaciones (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, -- Deuda nacida al confirmar un costo de proveedor.
    servicio_costo_id bigint NOT NULL UNIQUE, -- Costo de origen: como máximo una obligación.
    servicio_id bigint NOT NULL, -- Trabajo concreto de origen.
    proveedor_id bigint NOT NULL, -- Acreedor fijado por el costo.
    importe numeric(14,2) NOT NULL CHECK (importe > 0), -- Importe original; pendiente se deriva, no se almacena.
    nacida_en timestamptz NOT NULL, -- Confirmación del trabajo que origina la deuda.
    vence_el date, -- Vencimiento pactado opcional.
    anulada_en timestamptz, -- Anulación correctiva, sólo sin aplicaciones activas.
    anulada_por bigint REFERENCES usuarios(id), -- Administrador responsable.
    motivo_anulacion text, -- Motivo obligatorio.
    FOREIGN KEY (servicio_costo_id, servicio_id, proveedor_id, importe) REFERENCES servicio_costos(id, servicio_id, proveedor_id, importe),
    CHECK ((anulada_en IS NULL AND anulada_por IS NULL AND motivo_anulacion IS NULL) OR (anulada_en IS NOT NULL AND anulada_por IS NOT NULL AND motivo_anulacion IS NOT NULL))
);
CREATE INDEX ix_obligaciones_proveedor ON obligaciones (proveedor_id, nacida_en);
CREATE INDEX ix_obligaciones_vencimiento ON obligaciones (vence_el) WHERE anulada_en IS NULL;
CREATE TABLE operaciones_egreso (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, -- Operación atómica de salida con uno o varios medios.
    clave_idempotencia uuid NOT NULL UNIQUE, -- Control de reintentos de la operación completa.
    tipo varchar(25) NOT NULL CHECK (tipo IN ('PAGO_PROVEEDOR','GASTO_GENERAL','DEVOLUCION_CLIENTE')), -- Clase del egreso.
    proveedor_id bigint REFERENCES proveedores(id), -- Receptor cuando es pago de obligaciones.
    cobro_origen_id bigint REFERENCES cobros(id), -- Ingreso al que corresponde una devolución real.
    ocurrido_en timestamptz NOT NULL, -- Fecha real del desembolso.
    concepto varchar(180) NOT NULL, -- Descripción histórica.
    importe_total numeric(14,2) NOT NULL CHECK (importe_total > 0), -- Control del total de fracciones; no se suma otra vez a caja.
    referencia varchar(140), -- Comprobante o nota de la operación.
    creado_por bigint NOT NULL REFERENCES usuarios(id), -- Responsable del registro.
    anulado_en timestamptz, -- Corrección completa del registro erróneo.
    anulado_por bigint REFERENCES usuarios(id), -- Administrador responsable.
    motivo_anulacion text, -- Motivo obligatorio.
    CHECK ((tipo = 'PAGO_PROVEEDOR' AND proveedor_id IS NOT NULL AND cobro_origen_id IS NULL) OR (tipo = 'GASTO_GENERAL' AND proveedor_id IS NULL AND cobro_origen_id IS NULL) OR (tipo = 'DEVOLUCION_CLIENTE' AND proveedor_id IS NULL AND cobro_origen_id IS NOT NULL)),
    CHECK ((anulado_en IS NULL AND anulado_por IS NULL AND motivo_anulacion IS NULL) OR (anulado_en IS NOT NULL AND anulado_por IS NOT NULL AND motivo_anulacion IS NOT NULL))
);
CREATE INDEX ix_operaciones_egreso_fecha ON operaciones_egreso (ocurrido_en);
CREATE INDEX ix_operaciones_egreso_proveedor ON operaciones_egreso (proveedor_id, ocurrido_en);
CREATE TABLE egresos (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, -- Fracción efectivamente desembolsada y contada una sola vez.
    operacion_id bigint NOT NULL REFERENCES operaciones_egreso(id), -- Cabecera común del pago mixto.
    medio_pago_id bigint NOT NULL REFERENCES medios_pago(id), -- Medio efectivo de esta fracción.
    importe numeric(14,2) NOT NULL CHECK (importe > 0), -- Único importe que se resta del saldo real.
    referencia varchar(140), -- Referencia del medio o transferencia.
    UNIQUE (operacion_id, medio_pago_id)
);
CREATE TABLE pagos_obligaciones (
    egreso_id bigint NOT NULL REFERENCES egresos(id), -- Egreso existente; la aplicación no crea otro movimiento.
    obligacion_id bigint NOT NULL REFERENCES obligaciones(id), -- Deuda cancelada total o parcialmente.
    importe_aplicado numeric(14,2) NOT NULL CHECK (importe_aplicado > 0), -- Parte del egreso que cancela esta deuda.
    PRIMARY KEY (egreso_id, obligacion_id)
);
CREATE INDEX ix_pagos_obligacion ON pagos_obligaciones (obligacion_id);

CREATE TABLE reglas_alerta (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, -- Parámetro configurable por clase de vencimiento.
    tipo varchar(20) NOT NULL UNIQUE CHECK (tipo IN ('OBLEA','REVISION_PH','OBLIGACION','LIQUIDACION')), -- Hecho al que se aplica.
    dias_anticipacion integer NOT NULL CHECK (dias_anticipacion BETWEEN 0 AND 3650), -- Días previos para advertir.
    activa boolean NOT NULL DEFAULT true, -- Activación de la regla.
    actualizada_por bigint REFERENCES usuarios(id), -- Autor del último ajuste; nulo para catálogo inicial.
    actualizada_en timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP -- Último cambio.
);
CREATE TABLE alertas (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, -- Aviso interno, sin mensajería externa.
    regla_id bigint NOT NULL REFERENCES reglas_alerta(id), -- Regla que produjo el aviso.
    oblea_id bigint REFERENCES obleas(id), -- Vencimiento de oblea, si corresponde.
    revision_id bigint REFERENCES revisiones_cilindros(id), -- Vencimiento de ensayo, si corresponde.
    obligacion_id bigint REFERENCES obligaciones(id), -- Vencimiento de deuda, si corresponde.
    liquidacion_id bigint REFERENCES liquidaciones(id), -- Vencimiento de lote, si corresponde.
    vence_el date NOT NULL, -- Vencimiento que originó el aviso.
    creada_en timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP, -- Creación del aviso.
    atendida_en timestamptz, -- Lectura/atención manual, sin modificar el hecho origen.
    atendida_por bigint REFERENCES usuarios(id), -- Usuario que atendió el aviso.
    CHECK (num_nonnulls(oblea_id, revision_id, obligacion_id, liquidacion_id) = 1),
    CHECK ((atendida_en IS NULL AND atendida_por IS NULL) OR (atendida_en IS NOT NULL AND atendida_por IS NOT NULL))
);
CREATE UNIQUE INDEX uq_alerta_oblea ON alertas (regla_id, oblea_id, vence_el) WHERE oblea_id IS NOT NULL;
CREATE UNIQUE INDEX uq_alerta_revision ON alertas (regla_id, revision_id, vence_el) WHERE revision_id IS NOT NULL;
CREATE UNIQUE INDEX uq_alerta_obligacion ON alertas (regla_id, obligacion_id, vence_el) WHERE obligacion_id IS NOT NULL;
CREATE UNIQUE INDEX uq_alerta_liquidacion ON alertas (regla_id, liquidacion_id, vence_el) WHERE liquidacion_id IS NOT NULL;
CREATE INDEX ix_alertas_pendientes ON alertas (vence_el) WHERE atendida_en IS NULL;

COMMIT;
