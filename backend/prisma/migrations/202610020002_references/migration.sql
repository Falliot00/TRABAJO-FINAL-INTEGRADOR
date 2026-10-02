CREATE TABLE actores_regulatorios (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tipo varchar(5) NOT NULL CHECK (tipo IN ('PEC','TDM','CRPC')),
    codigo varchar(40) NOT NULL,
    nombre varchar(180) NOT NULL,
    cuit varchar(20),
    domicilio varchar(220),
    localidad varchar(100),
    telefono varchar(40),
    responsable_tecnico varchar(140),
    matricula_responsable varchar(40),
    activo boolean NOT NULL DEFAULT true,
    UNIQUE (tipo, codigo),
    UNIQUE (id, tipo)
);
CREATE TABLE modelos_componentes (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tipo varchar(15) NOT NULL CHECK (tipo IN ('CILINDRO','VALVULA','REGULADOR')),
    codigo_homologacion varchar(50) NOT NULL,
    marca varchar(100),
    modelo varchar(100),
    capacidad_litros numeric(7,2),
    activo boolean NOT NULL DEFAULT true,
    UNIQUE (tipo, codigo_homologacion),
    UNIQUE (id, tipo),
    CHECK (capacidad_litros IS NULL OR (tipo = 'CILINDRO' AND capacidad_litros > 0))
);
CREATE TABLE configuracion_taller (
    id bigint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    nombre varchar(180) NOT NULL,
    cuit varchar(20),
    domicilio varchar(220),
    localidad varchar(100),
    provincia varchar(100),
    telefono varchar(40),
    email varchar(254),
    tdm_id bigint,
    tdm_tipo varchar(5) NOT NULL DEFAULT 'TDM' CHECK (tdm_tipo = 'TDM'),
    FOREIGN KEY (tdm_id, tdm_tipo) REFERENCES actores_regulatorios(id, tipo)
);
INSERT INTO permisos (codigo, descripcion) VALUES
('configuracion.administrar', 'Administrar datos del taller y referencias regulatorias y técnicas.');
INSERT INTO roles_permisos (rol_id, permiso_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permisos p
WHERE r.codigo = 'ADMINISTRADOR' AND p.codigo = 'configuracion.administrar';
