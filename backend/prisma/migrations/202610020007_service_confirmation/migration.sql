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


CREATE TABLE confirmaciones_servicio (
 servicio_id bigint PRIMARY KEY REFERENCES servicios(id),
 clave_idempotencia uuid NOT NULL UNIQUE,
 version_borrador integer NOT NULL,
 configuracion_esperada_id bigint REFERENCES configuraciones(id),
 configuracion_resultado_id bigint REFERENCES configuraciones(id),
 evidencia_regulatoria jsonb NOT NULL CHECK (jsonb_typeof(evidencia_regulatoria) = 'object'),
 respuesta jsonb NOT NULL CHECK (jsonb_typeof(respuesta) = 'object')
);
CREATE TABLE componentes_instalados (
 componente_id bigint PRIMARY KEY REFERENCES componentes(id),
 configuracion_id bigint NOT NULL REFERENCES configuraciones(id)
);
CREATE FUNCTION conservar_instalacion_unica() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_TABLE_NAME = 'configuraciones' THEN
  IF NEW.vigente_hasta IS NOT NULL THEN DELETE FROM componentes_instalados WHERE configuracion_id = NEW.id; END IF;
 ELSE
  IF EXISTS (SELECT 1 FROM configuraciones WHERE id = NEW.configuracion_id AND vigente_hasta IS NULL) THEN
   INSERT INTO componentes_instalados VALUES (NEW.componente_id, NEW.configuracion_id);
  END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER configuracion_cerrada AFTER UPDATE ON configuraciones FOR EACH ROW EXECUTE FUNCTION conservar_instalacion_unica();
CREATE TRIGGER componente_instalado AFTER INSERT ON configuracion_componentes FOR EACH ROW EXECUTE FUNCTION conservar_instalacion_unica();
CREATE FUNCTION impedir_cambio_confirmado() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE sid bigint;
BEGIN
 IF TG_TABLE_NAME = 'servicios' THEN
  IF OLD.estado = 'CONFIRMADO' THEN RAISE EXCEPTION 'Servicio confirmado inmutable' USING ERRCODE = '23514'; END IF;
 ELSE
  sid := CASE WHEN TG_OP = 'DELETE' THEN OLD.servicio_id ELSE NEW.servicio_id END;
  IF EXISTS (SELECT 1 FROM servicios WHERE id = sid AND estado = 'CONFIRMADO') OR
   (TG_OP = 'UPDATE' AND EXISTS (SELECT 1 FROM servicios WHERE id = OLD.servicio_id AND estado = 'CONFIRMADO')) THEN
   -- Removing an optional catalog origin never changes the historical item.
   IF TG_TABLE_NAME = 'servicio_items' AND TG_OP = 'UPDATE' THEN
    IF NEW.catalogo_item_id IS NULL AND (to_jsonb(NEW) - 'catalogo_item_id') = (to_jsonb(OLD) - 'catalogo_item_id') THEN RETURN NEW; END IF;
   END IF;
   RAISE EXCEPTION 'Preparacion confirmada inmutable' USING ERRCODE = '23514';
  END IF;
 END IF;
 IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER servicio_confirmado_inmutable BEFORE UPDATE OR DELETE ON servicios FOR EACH ROW EXECUTE FUNCTION impedir_cambio_confirmado();
CREATE TRIGGER items_confirmados_inmutables BEFORE INSERT OR UPDATE OR DELETE ON servicio_items FOR EACH ROW EXECUTE FUNCTION impedir_cambio_confirmado();
CREATE TRIGGER costos_confirmados_inmutables BEFORE INSERT OR UPDATE OR DELETE ON servicio_costos FOR EACH ROW EXECUTE FUNCTION impedir_cambio_confirmado();
CREATE TRIGGER personas_confirmadas_inmutables BEFORE INSERT OR UPDATE OR DELETE ON servicio_personas FOR EACH ROW EXECUTE FUNCTION impedir_cambio_confirmado();
CREATE TRIGGER preparacion_confirmada_inmutable BEFORE INSERT OR UPDATE OR DELETE ON servicio_preparacion FOR EACH ROW EXECUTE FUNCTION impedir_cambio_confirmado();
CREATE TRIGGER intervenciones_confirmadas_inmutables BEFORE INSERT OR UPDATE OR DELETE ON servicio_intervenciones FOR EACH ROW EXECUTE FUNCTION impedir_cambio_confirmado();
CREATE FUNCTION impedir_cambio_hecho() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 RAISE EXCEPTION 'Hecho historico inmutable' USING ERRCODE = '23514';
END $$;

CREATE TRIGGER ficha_componentes_inmutables BEFORE UPDATE OR DELETE ON ficha_componentes FOR EACH ROW EXECUTE FUNCTION impedir_cambio_hecho();
CREATE TRIGGER oblea_inmutable BEFORE UPDATE OR DELETE ON obleas FOR EACH ROW EXECUTE FUNCTION impedir_cambio_hecho();
CREATE TRIGGER revision_inmutable BEFORE UPDATE OR DELETE ON revisiones_cilindros FOR EACH ROW EXECUTE FUNCTION impedir_cambio_hecho();
CREATE TRIGGER movimientos_inmutables BEFORE UPDATE OR DELETE ON movimientos_componentes FOR EACH ROW EXECUTE FUNCTION impedir_cambio_hecho();
CREATE TRIGGER obligaciones_inmutables BEFORE UPDATE OR DELETE ON obligaciones FOR EACH ROW EXECUTE FUNCTION impedir_cambio_hecho();
CREATE TRIGGER confirmacion_inmutable BEFORE UPDATE OR DELETE ON confirmaciones_servicio FOR EACH ROW EXECUTE FUNCTION impedir_cambio_hecho();
CREATE TRIGGER composicion_inmutable BEFORE UPDATE OR DELETE ON configuracion_componentes FOR EACH ROW EXECUTE FUNCTION impedir_cambio_hecho();

CREATE FUNCTION proteger_ficha() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP = 'DELETE' OR (to_jsonb(NEW) - ARRAY['pdf_estado','pdf_documento_id','pdf_error']) IS DISTINCT FROM (to_jsonb(OLD) - ARRAY['pdf_estado','pdf_documento_id','pdf_error']) THEN
  RAISE EXCEPTION 'Snapshot inmutable' USING ERRCODE = '23514';
 END IF;
 IF OLD.pdf_estado = 'GENERADO' AND NEW IS DISTINCT FROM OLD THEN RAISE EXCEPTION 'PDF archivado inmutable' USING ERRCODE = '23514'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER ficha_inmutable BEFORE UPDATE OR DELETE ON fichas FOR EACH ROW EXECUTE FUNCTION proteger_ficha();
CREATE FUNCTION proteger_configuracion() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP = 'DELETE' OR OLD.vigente_hasta IS NOT NULL OR NEW.vigente_hasta IS NULL OR (to_jsonb(NEW) - 'vigente_hasta') IS DISTINCT FROM (to_jsonb(OLD) - 'vigente_hasta') THEN
  RAISE EXCEPTION 'Configuracion historica inmutable' USING ERRCODE = '23514';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER configuracion_historica BEFORE UPDATE OR DELETE ON configuraciones FOR EACH ROW EXECUTE FUNCTION proteger_configuracion();
CREATE FUNCTION impedir_hecho_tardio() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE sid bigint;
BEGIN
 IF TG_TABLE_NAME = 'configuracion_componentes' THEN
  SELECT servicio_origen_id INTO sid FROM configuraciones WHERE id = NEW.configuracion_id;
 ELSIF TG_TABLE_NAME = 'ficha_componentes' THEN
  SELECT servicio_id INTO sid FROM fichas WHERE id = NEW.ficha_id;
 ELSIF TG_TABLE_NAME = 'configuraciones' THEN
  sid := NEW.servicio_origen_id;
 ELSE
  sid := NEW.servicio_id;
 END IF;
 IF EXISTS (SELECT 1 FROM servicios WHERE id = sid AND estado <> 'BORRADOR') THEN
  RAISE EXCEPTION 'No se pueden agregar hechos a un servicio confirmado' USING ERRCODE = '23514';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER composicion_confirmada BEFORE INSERT ON configuracion_componentes FOR EACH ROW EXECUTE FUNCTION impedir_hecho_tardio();
CREATE TRIGGER renglones_confirmados BEFORE INSERT ON ficha_componentes FOR EACH ROW EXECUTE FUNCTION impedir_hecho_tardio();
CREATE TRIGGER configuracion_origen_confirmado BEFORE INSERT ON configuraciones FOR EACH ROW EXECUTE FUNCTION impedir_hecho_tardio();
CREATE TRIGGER ficha_origen_confirmado BEFORE INSERT ON fichas FOR EACH ROW EXECUTE FUNCTION impedir_hecho_tardio();
CREATE TRIGGER oblea_origen_confirmado BEFORE INSERT ON obleas FOR EACH ROW EXECUTE FUNCTION impedir_hecho_tardio();
CREATE TRIGGER revision_origen_confirmado BEFORE INSERT ON revisiones_cilindros FOR EACH ROW EXECUTE FUNCTION impedir_hecho_tardio();
CREATE TRIGGER movimiento_origen_confirmado BEFORE INSERT ON movimientos_componentes FOR EACH ROW EXECUTE FUNCTION impedir_hecho_tardio();
CREATE TRIGGER obligacion_origen_confirmado BEFORE INSERT ON obligaciones FOR EACH ROW EXECUTE FUNCTION impedir_hecho_tardio();
