CREATE TABLE servicios (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, -- Borrador o trabajo concreto.
    vehiculo_id bigint NOT NULL REFERENCES vehiculos(id), -- Vehículo atendido.
    catalogo_servicio_id bigint NOT NULL REFERENCES catalogo_servicios(id), -- Oferta de origen.
    antecedente_id bigint REFERENCES servicios(id), -- Servicio previo renovado; máximo un sucesor directo no cancelado.
    configuracion_base_id bigint, -- Campo reservado para confirmación; la configuración y su FK se incorporarán en ese tramo.
    version integer NOT NULL DEFAULT 1 CHECK (version > 0),
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
    catalogo_item_id bigint REFERENCES catalogo_items(id) ON DELETE SET NULL, -- Origen opcional de la propuesta.
    descripcion varchar(180) NOT NULL, -- Descripción histórica independiente del catálogo.
    tipo varchar(20) NOT NULL CHECK (tipo IN ('COMPONENTE','INSPECCION','ENSAYO_PH','OBLEA','MANO_OBRA','ACCESORIO','OTRO')), -- Naturaleza del concepto.
    componente_id bigint REFERENCES componentes(id), -- Componente individual cuando aplica.
    accion varchar(15) CHECK (accion IN ('INSTALAR','RETIRAR','INSPECCIONAR','ENSAYAR','MANTENER')), -- Intervención real sobre componente.
    cantidad numeric(10,2) NOT NULL CHECK (cantidad > 0), -- Cantidad efectivamente pactada.
    precio_unitario numeric(14,2) NOT NULL CHECK (precio_unitario >= 0), -- Precio histórico por unidad.
    descuento numeric(14,2) NOT NULL DEFAULT 0 CHECK (descuento >= 0), -- Descuento total del renglón.
    importe numeric(14,2) NOT NULL CHECK (importe >= 0), -- Neto del renglón en ARS.
    UNIQUE (servicio_id, orden) DEFERRABLE INITIALLY IMMEDIATE,
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
