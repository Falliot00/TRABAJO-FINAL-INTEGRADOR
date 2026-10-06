-- Las configuraciones previas permanecen sin pareja conocida; no se deduce por posicion.
ALTER TABLE configuracion_componentes ADD COLUMN cilindro_id bigint;
ALTER TABLE configuracion_componentes ADD CONSTRAINT pareja_solo_valvula CHECK (cilindro_id IS NULL OR tipo = 'VALVULA');
ALTER TABLE configuracion_componentes ADD CONSTRAINT pareja_misma_configuracion FOREIGN KEY (configuracion_id, cilindro_id) REFERENCES configuracion_componentes(configuracion_id, componente_id) DEFERRABLE INITIALLY DEFERRED;
CREATE UNIQUE INDEX uq_valvula_por_cilindro ON configuracion_componentes(configuracion_id, cilindro_id) WHERE cilindro_id IS NOT NULL;
ALTER TABLE ficha_componentes ADD COLUMN cilindro_id bigint REFERENCES componentes(id);
CREATE TABLE bajas_componentes (
 componente_id bigint PRIMARY KEY REFERENCES componentes(id),
 servicio_id bigint NOT NULL REFERENCES servicios(id),
 ocurrida_en timestamptz NOT NULL,
 registrado_por bigint NOT NULL REFERENCES usuarios(id)
);
CREATE TRIGGER baja_inmutable BEFORE UPDATE OR DELETE ON bajas_componentes FOR EACH ROW EXECUTE FUNCTION impedir_cambio_hecho();
CREATE TRIGGER baja_origen_confirmado BEFORE INSERT ON bajas_componentes FOR EACH ROW EXECUTE FUNCTION impedir_hecho_tardio();
CREATE FUNCTION validar_pareja_y_disponibilidad() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF EXISTS (SELECT 1 FROM bajas_componentes WHERE componente_id = NEW.componente_id) THEN
  RAISE EXCEPTION 'Componente dado de baja no reutilizable' USING ERRCODE = '23514';
 END IF;
 IF NEW.cilindro_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM componentes WHERE id = NEW.cilindro_id AND tipo = 'CILINDRO') THEN
  RAISE EXCEPTION 'La pareja debe identificar un cilindro' USING ERRCODE = '23514';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER pareja_y_disponibilidad BEFORE INSERT ON configuracion_componentes FOR EACH ROW EXECUTE FUNCTION validar_pareja_y_disponibilidad();
