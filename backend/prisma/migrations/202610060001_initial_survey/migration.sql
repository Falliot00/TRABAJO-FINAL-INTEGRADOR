-- Observaciones iniciales: no representan servicios, emisiones ni ensayos del taller.
CREATE TABLE relevamientos_iniciales (
  configuracion_id bigint PRIMARY KEY,
  vehiculo_id bigint NOT NULL UNIQUE REFERENCES vehiculos(id),
  clave_idempotencia uuid NOT NULL UNIQUE,
  solicitud jsonb NOT NULL CHECK (jsonb_typeof(solicitud) = 'object'),
  respuesta jsonb NOT NULL CHECK (jsonb_typeof(respuesta) = 'object'),
  registrado_por bigint NOT NULL REFERENCES usuarios(id),
  registrado_en timestamptz NOT NULL,
  FOREIGN KEY (configuracion_id, vehiculo_id) REFERENCES configuraciones(id, vehiculo_id)
);
CREATE TABLE antecedentes_ph_relevados (
  configuracion_id bigint NOT NULL REFERENCES relevamientos_iniciales(configuracion_id),
  componente_id bigint NOT NULL,
  tipo varchar(15) NOT NULL DEFAULT 'CILINDRO' CHECK (tipo = 'CILINDRO'),
  fecha_ensayo varchar(10),
  vence_el date,
  crpc_id bigint,
  crpc_tipo varchar(5) NOT NULL DEFAULT 'CRPC' CHECK (crpc_tipo = 'CRPC'),
  resultado varchar(15) CHECK (resultado IN ('APROBADO', 'RECHAZADO')),
  numero_certificado varchar(80),
  PRIMARY KEY (configuracion_id, componente_id),
  FOREIGN KEY (configuracion_id, componente_id) REFERENCES configuracion_componentes(configuracion_id, componente_id),
  FOREIGN KEY (componente_id, tipo) REFERENCES componentes(id, tipo),
  FOREIGN KEY (crpc_id, crpc_tipo) REFERENCES actores_regulatorios(id, tipo),
  CHECK (fecha_ensayo IS NULL OR fecha_ensayo ~ '^[0-9]{4}-(0[1-9]|1[0-2])(-[0-9]{2})?$'),
  CHECK (resultado IS DISTINCT FROM 'RECHAZADO' OR vence_el IS NULL)
);
CREATE INDEX ix_antecedentes_ph_componente ON antecedentes_ph_relevados(componente_id);
CREATE TABLE antecedentes_oblea_relevados (
  configuracion_id bigint PRIMARY KEY REFERENCES relevamientos_iniciales(configuracion_id),
  numero varchar(40),
  habilitada_el date,
  vence_el date,
  CHECK (habilitada_el IS NULL OR vence_el IS NULL OR vence_el > habilitada_el)
);
CREATE TRIGGER relevamiento_inmutable BEFORE UPDATE OR DELETE ON relevamientos_iniciales FOR EACH ROW EXECUTE FUNCTION impedir_cambio_hecho();
CREATE TRIGGER antecedente_ph_inmutable BEFORE UPDATE OR DELETE ON antecedentes_ph_relevados FOR EACH ROW EXECUTE FUNCTION impedir_cambio_hecho();
CREATE TRIGGER antecedente_oblea_inmutable BEFORE UPDATE OR DELETE ON antecedentes_oblea_relevados FOR EACH ROW EXECUTE FUNCTION impedir_cambio_hecho();
