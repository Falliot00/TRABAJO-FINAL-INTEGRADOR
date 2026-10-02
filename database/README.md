# Base de datos — segunda entrega

Diseño relacional de CILGAS incluido en la etapa 2 aprobada, según el [registro de devolución de la tutora](../docs/segunda-entrega/APROBACION.md). PostgreSQL es la única fuente persistente; JSONB se utiliza exclusivamente para el contenido histórico de las fichas confirmadas. **El SQL sigue siendo diseño declarativo; no es una migración productiva.**

| Archivo | Contenido |
| --- | --- |
| [01-esquema.sql](01-esquema.sql) | DDL declarativo de 42 tablas: campos, tipos, PK, FK, restricciones e índices principales. |
| [02-catalogos.sql](02-catalogos.sql) | DML de referencia: roles, capacidades, medios y ventanas de alerta propuestas. No contiene clientes, usuarios, contraseñas ni fotografías. |
| [DIAGRAMA_ER.md](DIAGRAMA_ER.md) | ER físico completo en 11 vistas Mermaid con todos los campos y claves; las FK entre vistas se enumeran junto a cada gráfico. |
| [DICCIONARIO_DATOS.md](DICCIONARIO_DATOS.md) | Significado de todas las columnas, nulabilidad, claves, restricciones e índices. |
| [MODELO_DATOS.md](../docs/segunda-entrega/MODELO_DATOS.md) | Decisiones, cardinalidades, contrato de snapshot e invariantes pendientes de implementar. |

## Naturaleza de esta entrega

Los archivos SQL son **documentación ejecutable del diseño** exigida por la consigna. No incluyen funciones, triggers, procedimientos, lógica de negocio, aplicación, datos operativos ni migraciones de producción. No se implementa todavía Prisma: después de la aprobación se traducirá este diseño a migraciones versionadas y se mantendrán en SQL las restricciones que lo requieran.

`01-esquema.sql` está pensado para PostgreSQL 16 o posterior. La verificación realizada se identifica con su versión efectiva en el [informe de validación](../docs/segunda-entrega/VALIDACION.md); no se afirma ejecución sobre una versión que no se probó.

## Orden de lectura y comprobación

1. Revisar el modelo y el ER con la tutora.
2. Contrastar los campos de las fichas con el diccionario.
3. Si se desea verificar el DDL, utilizar **exclusivamente una base vacía y descartable**, primero `01-esquema.sql` y luego `02-catalogos.sql`.
4. Revisar las restricciones entre filas listadas en MODELO_DATOS: serán responsabilidad de transacciones y permisos del futuro backend.

Los scripts son de ejecución única; no contienen `DROP`, no eliminan información ni intentan actualizar una instalación existente. No se ejecutaron contra la base del sistema original ni contra producción.

## Convenciones de integridad

- PK técnicas `bigint` identity; identificadores regulatorios y números de serie como texto.
- Relaciones de negocio mediante FK reales, incluidas FK compuestas para exigir el tipo de componente, actor o convenio correcto.
- Dinero `numeric(14,2)` en ARS. No se guarda una tabla editable de caja ni columnas de saldo pagado/pendiente.
- Referencias con `NO ACTION` y bajas lógicas: sin borrados en cascada sobre historia técnica/financiera.
- Índice parcial para una sola configuración vigente por vehículo.
- Mes/año representado por `date` con día técnico 1; interfaces y PDF muestran sólo mes/año.
- Una cabecera agrupa cada operación de cobro o egreso; sólo sus fracciones participan en el flujo financiero.
- Toda condición que no pueda asegurarse mediante FK, CHECK o unicidad se documenta explícitamente como control futuro del backend.
