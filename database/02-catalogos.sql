-- Catálogos de referencia propuestos, sin personas, usuarios ni datos reales.
-- Ejecutar después de 01-esquema.sql en base descartable. No provisiona credenciales.
BEGIN;
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
INSERT INTO medios_pago (codigo, nombre) VALUES
('EFECTIVO', 'Efectivo'), ('TRANSFERENCIA', 'Transferencia');
-- Ventanas iniciales PROPUESTAS, configurables y pendientes de validación operativa.
INSERT INTO reglas_alerta (tipo, dias_anticipacion) VALUES
('OBLEA', 30), ('REVISION_PH', 60), ('OBLIGACION', 7), ('LIQUIDACION', 7);
COMMIT;
