# Continuidad funcional con el sistema CILGAS original

Fecha de revisión: **27/09/2026**.

El sistema original se utiliza como referencia funcional por indicación del equipo. Esta segunda entrega conserva la identidad de la herramienta y sus recorridos principales, pero desarrolla un diseño propio acorde con la propuesta del TFI. No se incorpora implementación del sistema original a esta etapa.

## Fuentes y alcance de la revisión

- Repositorio de referencia: [Falliot00/sistema-cilgas](https://github.com/Falliot00/sistema-cilgas), de acceso privado.
- Revisión consultada de `main`: `57be32e7e432b81b750d51ef935e871f70e3bf9f`.
- Documentos revisados: `README.md`, `CONTEXT.md`, `AGENTS.md`, `docs/README.md`, `docs/architecture.md`, `docs/current-state.md`, `docs/access-control.md`, `docs/flows/services.md`, `docs/flows/finance.md`, `docs/design-system.md`, `docs/quality.md`, los cinco ADR y los tres procedimientos de `docs/operations/`.
- Contraste estructural: `prisma/schema.prisma`, `package.json` y árbol de rutas y migraciones. No se ejecutó la aplicación ni se consultó su base de producción.

El documento es una síntesis propia de capacidades y decisiones de diseño: no publica código, documentación íntegra, credenciales ni datos reales del repositorio privado. Quien no tenga acceso al original puede revisar la propuesta del TFI mediante los documentos de esta entrega.

La referencia técnica **no constituye aprobación de la tutora ni del comité**. Ante diferencias de alcance, prevalecen el [README del TFI](../../README.md), su [glosario](../../CONTEXT.md) y sus [ADR](../adr/).

## Esencia que se conserva

La herramienta sigue siendo una aplicación interna para registrar trabajos de CILGAS, consultar antecedentes de personas y vehículos, controlar vencimientos y entender cobros y obligaciones. El centro de la operación es el **servicio realizado**; una oblea o una revisión se relacionan con el trabajo que las originó.

| Capacidad del original | Continuidad en el diseño del TFI | Mejora prevista |
| --- | --- | --- |
| Clientes y vehículos | Buscar o registrar personas y seleccionar el vehículo antes de registrar el servicio. | Distinguir titular, contacto y pagador; conservar configuraciones técnicas e historia sin duplicar los datos del vehículo en la persona. |
| Catálogo y prestaciones | El catálogo propone condiciones; cada servicio realizado conserva sus condiciones históricas. | Composición variable mediante ítems, con cantidades, precios y costos propios. |
| Obleas y pruebas hidráulicas | Se originan desde un servicio concreto y se consultan desde su historia. | Identificar individualmente cilindros, válvulas y reguladores; separar el ensayo del cilindro del servicio de revisión quinquenal. |
| Renovaciones | Una nueva intervención conserva la anterior y registra fechas y condiciones propias. | Evitar que renovar equivalga a sobrescribir un vencimiento o reescribir la historia técnica. |
| Cobro particular | Registrar dinero realmente recibido, completo o parcial, con sus medios de pago. | Aplicar cada cobro a un servicio y conservar su desglose; el importe vendido no se interpreta como efectivo recibido. |
| Convenios y liquidaciones | Agrupar operaciones elegibles de una entidad y registrar posteriormente el cobro. | Modelar entidad, convenio, cupón y liquidación explícitamente; el convenio no es un tipo técnico de oblea ni un medio de dinero recibido. |
| Proveedores y obligaciones | Distinguir el nacimiento de una obligación de su pago efectivo. | Atribuir costos a los ítems y proveedores que correspondan y derivar pendientes desde las aplicaciones de pagos. |
| Caja y Caja Real | Mantener la consulta operativa y el análisis financiero con permisos diferentes. | Calcular ambas perspectivas sobre hechos relacionados; evitar libros paralelos editables y doble cómputo de pagos. |
| Usuarios, roles y actividad | Administrador y Operador con control de acceso en el backend. | Una matriz de capacidades coherente entre interfaz, API y documentación. |
| Alertas y consulta histórica | Consultar próximos vencimientos y operaciones relacionadas. | Incluir vencimientos técnicos por componente y obligaciones financieras, con umbrales configurables. |
| Uso administrativo cotidiano | Tablas legibles, filtros, formularios consistentes y estados explícitos. | Reducir la carga repetida, mostrar errores junto al campo y no depender solamente del color para expresar estados. |

## Reglas que orientan el diseño

1. **Un origen operativo identificable.** Los resultados técnicos y documentales nuevos deben apuntar al servicio realizado que los produjo. Consultar un resultado no abre un circuito financiero independiente.
2. **Historia conservada.** Una renovación o nueva intervención no modifica el trabajo anterior. Las fichas confirmadas agregan la protección específica acordada para el TFI: snapshot autocontenido, PDF y rectificaciones enlazadas.
3. **Anular, desactivar y eliminar son acciones diferentes.** Los hechos confirmados se corrigen de forma trazable; los catálogos utilizados se desactivan. La eliminación se limita a registros sin historia ni dependencias, como borradores descartables.
4. **Dinero y deuda tienen momentos distintos.** Nacer una obligación reduce la perspectiva teórica; pagarla reduce el efectivo y el pendiente de esa obligación. El pago no debe reducir otra vez el resultado teórico.
5. **Cada pago conserva su composición.** Una combinación de efectivo y transferencia debe reconstruirse como un mismo cobro o egreso, con sus partes identificadas. Su registro o anulación debe mantener la consistencia del conjunto.
6. **No se admiten cobros o pagos duplicados por repetir una solicitud.** Las operaciones sensibles requieren transacción e identificación suficiente para prevenir duplicaciones.
7. **No se supera el pendiente.** Un pago aplicado a una obligación no puede superar su saldo; una obligación con pagos activos no se anula ignorando esas dependencias.
8. **Las fechas de negocio no cambian por la zona horaria.** Fechas de servicio y vencimientos se expresan como fechas civiles; los instantes de auditoría se conservan por separado. La zona de operación es `America/Argentina/Buenos_Aires`.
9. **La interfaz no concede permisos.** La API verifica usuario activo y capacidad para cada acción. El Operador no recibe acceso financiero sensible por conocer una URL.

Estas reglas son criterios del diseño propuesto, sujetos a la revisión académica. Las prácticas técnicas del taller y su validez documental se contrastan además con las fichas relevadas y con sus responsables; no se deducen requisitos normativos únicamente del código existente.

## Diferencias deliberadas y límites

| Aspecto | Referencia original | Decisión del TFI |
| --- | --- | --- |
| Organización técnica | Aplicación Next.js con API y persistencia en el mismo proyecto. | React/Vite y NestJS en monorepo, con PostgreSQL y Prisma, según ADR-0001 y ADR-0002. |
| Distribución interna | Algunos servicios y formularios reúnen numerosos flujos; la documentación original registra esa deuda. | Límites por capacidades de negocio y coordinación transaccional explícita. |
| Identidad técnica | Obleas y pruebas conservan datos operativos y cantidades. | Componentes individuales, configuraciones históricas, resultados por cilindro y trazabilidad documental. |
| Ficha técnica | El esquema revisado no contiene una entidad de ficha histórica autocontenida. | Ficha confirmada inmutable, PDF y rectificaciones, según ADR-0003. |
| Relaciones financieras | Existen referencias mediante tipo e identificador y acumulados redundantes. | Relaciones explícitas y saldos derivados de hechos, según ADR-0004. |
| Historia anterior | El original conserva registros independientes anteriores a su consolidación. | Puesta en marcha desde una fecha de corte, sin migración histórica masiva ni reproducción de caminos antiguos. |
| Planes de cuotas | El original posee planes, frecuencias e intereses. | El MVP admite cobros parciales y anticipos aplicados a un servicio. Los calendarios avanzados siguen siendo una mejora posterior. |
| Pago por antigüedad | El original permite distribuir un pago entre varias deudas del proveedor en orden de antigüedad. | Es una referencia para evolución. No se incorpora una regla automática de asignación por antigüedad como requisito nuevo del MVP; se mantiene la aplicación explícita y verificable. |
| Convenios complejos | El original tiene estados y circuitos propios de liquidación. | Se prioriza el circuito básico aprobado como alcance; diferencias y cobros parciales complejos permanecen fuera del MVP. |
| Calidad | La documentación original identifica falta de suite automatizada y CI. | Diseñar pruebas de integración para invariantes, autorización y transacciones; implementar la automatización después de aprobar esta entrega. |

No se heredan automáticamente el límite comercial de cantidad de cilindros, las agrupaciones de proveedores ni las categorías del sistema anterior. El TFI contempla hasta cuatro cilindros en el relevamiento técnico, aunque la oferta habitual pueda incluir menos, y mantiene los catálogos configurables.

## Resultado esperado de la adaptación

Una persona que ya conoce el sistema original debe reconocer el recorrido personas → vehículo → servicio → resultados técnicos → cobro o convenio. La mejora principal consiste en poder reconstruir también **qué componentes tenía el equipo, qué cambió, qué documento se emitió y cómo se formó cada saldo**, sin volver a transcribir ni alterar información histórica.

Esta continuidad funcional no amplía el alcance académico con inventario integral, automatización de SICGNC, facturación fiscal, portal de clientes ni migración del sistema anterior. La implementación comienza únicamente después de la aprobación explícita de la segunda entrega.
