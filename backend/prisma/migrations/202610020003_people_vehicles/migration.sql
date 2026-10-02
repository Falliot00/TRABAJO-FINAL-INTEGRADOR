CREATE TABLE personas (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tipo varchar(10) NOT NULL CHECK (tipo IN ('FISICA','JURIDICA')),
    nombre_razon_social varchar(180) NOT NULL,
    documento_tipo varchar(20) NOT NULL,
    documento_numero varchar(30) NOT NULL,
    calle varchar(180),
    numero varchar(20),
    piso_depto varchar(40),
    localidad varchar(100),
    provincia varchar(100),
    codigo_postal varchar(15),
    telefono varchar(40),
    email varchar(254),
    activo boolean NOT NULL DEFAULT true,
    creado_en timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (documento_tipo, documento_numero)
);
CREATE INDEX ix_personas_nombre ON personas (nombre_razon_social);

CREATE TABLE vehiculos (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    dominio varchar(15) NOT NULL UNIQUE,
    marca varchar(80) NOT NULL,
    modelo varchar(100) NOT NULL,
    anio smallint NOT NULL CHECK (anio BETWEEN 1900 AND 2200),
    motor_numero varchar(80),
    chasis_numero varchar(80),
    tipo varchar(15) CHECK (tipo IN ('TAXI','PICKUP','PARTICULAR','BUS','OFICIAL','OTROS')),
    tipo_otro_detalle varchar(100),
    uso varchar(60),
    inyeccion boolean,
    activo boolean NOT NULL DEFAULT true,
    CHECK ((tipo = 'OTROS' AND tipo_otro_detalle IS NOT NULL) OR (tipo IS DISTINCT FROM 'OTROS' AND tipo_otro_detalle IS NULL))
);

CREATE TABLE vehiculo_personas (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    vehiculo_id bigint NOT NULL REFERENCES vehiculos(id),
    persona_id bigint NOT NULL REFERENCES personas(id),
    rol varchar(15) NOT NULL CHECK (rol IN ('TITULAR','CONTACTO')),
    desde date NOT NULL,
    hasta date,
    CHECK (hasta IS NULL OR hasta > desde)
);
CREATE UNIQUE INDEX uq_vehiculo_titular_vigente ON vehiculo_personas (vehiculo_id) WHERE rol = 'TITULAR' AND hasta IS NULL;
CREATE INDEX ix_vehiculo_personas_persona ON vehiculo_personas (persona_id, vehiculo_id);
