ALTER TABLE servicios ADD COLUMN motivo_ph varchar(20) CHECK (motivo_ph IN ('VENCIMIENTO','MODIFICACION','CONVERSION','SERVICIO_PH'));
ALTER TABLE servicio_preparacion ADD COLUMN oblea_anterior_vence_el date;
ALTER TABLE servicio_intervenciones ADD COLUMN cilindro_id bigint REFERENCES componentes(id);
ALTER TABLE servicio_intervenciones ADD CONSTRAINT vinculo_valvula CHECK (cilindro_id IS NULL OR tipo = 'VALVULA');
-- Se conserva toda fecha histórica conocida; los ensayos mensuales futuros no inventan día.
DO $$ DECLARE rule record; BEGIN
 FOR rule IN SELECT conname, conrelid::regclass AS tab FROM pg_constraint
 WHERE conrelid IN ('servicio_intervenciones'::regclass, 'revisiones_cilindros'::regclass, 'ficha_componentes'::regclass)
 AND contype = 'c' AND (pg_get_constraintdef(oid) LIKE '%fecha_ensayo%' OR pg_get_constraintdef(oid) LIKE '%renglon%REGULADOR%' OR pg_get_constraintdef(oid) LIKE '%REGULADOR%renglon%' OR pg_get_constraintdef(oid) LIKE '%REGULADOR%accion%')
 LOOP EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', rule.tab, rule.conname); END LOOP;
END $$;
ALTER TABLE servicio_intervenciones ALTER COLUMN fecha_ensayo TYPE varchar(10) USING to_char(fecha_ensayo, 'YYYY-MM-DD');
ALTER TABLE revisiones_cilindros ALTER COLUMN fecha_ensayo TYPE varchar(10) USING to_char(fecha_ensayo, 'YYYY-MM-DD');
ALTER TABLE servicio_intervenciones ADD CHECK (fecha_ensayo IS NULL OR fecha_ensayo ~ '^[0-9]{4}-(0[1-9]|1[0-2])(-[0-9]{2})?$');
ALTER TABLE revisiones_cilindros ADD CHECK (fecha_ensayo ~ '^[0-9]{4}-(0[1-9]|1[0-2])(-[0-9]{2})?$');
ALTER TABLE servicio_intervenciones ADD CHECK ((tipo = 'REGULADOR' AND renglon BETWEEN 1 AND 3) OR (tipo = 'CILINDRO' AND renglon BETWEEN 1 AND 4) OR (tipo = 'VALVULA' AND renglon BETWEEN 1 AND 8) OR tipo = 'ACCESORIO');
ALTER TABLE ficha_componentes ADD CHECK ((tipo = 'REGULADOR' AND renglon BETWEEN 1 AND 3) OR (tipo = 'CILINDRO' AND renglon BETWEEN 1 AND 4) OR (tipo = 'VALVULA' AND renglon BETWEEN 1 AND 8) OR tipo = 'ACCESORIO');
