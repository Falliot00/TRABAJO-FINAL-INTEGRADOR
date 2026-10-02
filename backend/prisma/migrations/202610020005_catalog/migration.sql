CREATE TABLE proveedores (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre_razon_social varchar(180) NOT NULL,
    cuit varchar(20) UNIQUE,
    telefono varchar(40),
    email varchar(254),
    observaciones text,
    activo boolean NOT NULL DEFAULT true
);
CREATE TABLE catalogo_servicios (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo varchar(40) NOT NULL UNIQUE,
    nombre varchar(140) NOT NULL,
    descripcion text NOT NULL,
    tipo varchar(25) NOT NULL CHECK (tipo IN ('REVISION_ANUAL','REVISION_QUINQUENAL','CONVERSION','MODIFICACION','DESMONTAJE','OTRO')),
    precio_sugerido numeric(14,2) NOT NULL CHECK (precio_sugerido >= 0),
    activo boolean NOT NULL DEFAULT true
);
CREATE TABLE catalogo_items (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    catalogo_servicio_id bigint NOT NULL REFERENCES catalogo_servicios(id),
    orden smallint NOT NULL CHECK (orden > 0),
    descripcion varchar(180) NOT NULL,
    tipo varchar(20) NOT NULL CHECK (tipo IN ('COMPONENTE','INSPECCION','ENSAYO_PH','OBLEA','MANO_OBRA','ACCESORIO','OTRO')),
    cantidad numeric(10,2) NOT NULL CHECK (cantidad > 0),
    precio_unitario numeric(14,2) NOT NULL CHECK (precio_unitario >= 0),
    proveedor_id bigint REFERENCES proveedores(id),
    costo_unitario numeric(14,2) NOT NULL DEFAULT 0 CHECK (costo_unitario >= 0),
    CONSTRAINT catalogo_items_catalogo_servicio_id_orden_key UNIQUE (catalogo_servicio_id, orden) DEFERRABLE INITIALLY IMMEDIATE
);
