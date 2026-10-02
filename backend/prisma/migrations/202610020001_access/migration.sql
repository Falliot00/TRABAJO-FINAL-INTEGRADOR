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


INSERT INTO roles (codigo, nombre, descripcion) VALUES
('ADMINISTRADOR', 'Administrador', 'Propietario e hijo: administración operativa, técnica, financiera y de acceso.'),
('OPERADOR', 'Operador', 'Operación cotidiana con consulta financiera limitada a movimientos propios.');
INSERT INTO permisos (codigo, descripcion) VALUES
('personas.gestionar', 'Registrar y actualizar personas, contactos y vehículos.'),
('catalogo.consultar', 'Consultar ofertas y composición.'),
('catalogo.administrar', 'Administrar catálogo, precios, costos y proveedores.'),
('servicios.gestionar', 'Preparar y confirmar trabajos con sus resultados técnicos.'),
('fichas.consultar', 'Consultar y descargar fichas y su historia.'),
('fichas.rectificar', 'Emitir una rectificación sin sobrescribir la historia.'),
('cobros.registrar', 'Registrar ingresos aplicados a un servicio y anticipos explícitos.'),
('movimientos.consultar_propios', 'Consultar sólo movimientos de la propia operación.'),
('cobros.anular', 'Anular de forma auditada un ingreso registrado por error.'),
('finanzas.consultar', 'Consultar saldos real y teórico y hechos de todo el negocio.'),
('egresos.gestionar', 'Registrar, consultar y anular egresos y aplicaciones a obligaciones.'),
('convenios.administrar', 'Administrar convenios y condiciones comerciales.'),
('cupones.gestionar', 'Registrar autorizaciones de trabajos mediante cupón.'),
('liquidaciones.gestionar', 'Presentar y cobrar liquidaciones básicas.'),
('alertas.consultar', 'Consultar y atender avisos permitidos según ámbito del usuario.'),
('alertas.configurar', 'Ajustar anticipación de vencimientos.'),
('usuarios.administrar', 'Administrar accesos y revocar sesiones.'),
('auditoria.consultar', 'Revisar eventos de acceso y acciones sensibles.');
INSERT INTO roles_permisos (rol_id, permiso_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permisos p WHERE r.codigo = 'ADMINISTRADOR';
INSERT INTO roles_permisos (rol_id, permiso_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permisos p
WHERE r.codigo = 'OPERADOR' AND p.codigo IN (
'personas.gestionar', 'catalogo.consultar', 'servicios.gestionar', 'fichas.consultar',
'cobros.registrar', 'movimientos.consultar_propios', 'cupones.gestionar', 'alertas.consultar'
);
