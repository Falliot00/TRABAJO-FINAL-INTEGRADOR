# Sistema integral de gestión para CILGAS

Trabajo Final Integrador de la Tecnicatura Universitaria en Programación de la Universidad Tecnológica Nacional.

## Equipo

- Fermín Alliot
- Gabriel Antuña
- Grupo 213
- Tutora: Sofía Carnevale

## Repositorio único

[github.com/Falliot00/TRABAJO-FINAL-INTEGRADOR](https://github.com/Falliot00/TRABAJO-FINAL-INTEGRADOR)

El repositorio es público y ambos integrantes, `Falliot00` y `GaboAnt`, cuentan con acceso de escritura.

## Desarrollo — primer incremento

La base de la aplicación incorpora el monorepo con React/Vite y NestJS, contratos compartidos y migraciones de PostgreSQL para identidad y auditoría. Permite iniciar y cerrar sesión, administrar cuentas y roles, desactivar usuarios, revocar sesiones y consultar la auditoría según permisos. La interfaz incluye temas oscuro y claro y navegación adaptable.

La [guía de desarrollo y operación local](docs/desarrollo.md) explica la instalación reproducible, las bases aisladas, el alta del primer administrador mediante configuración, las pruebas y los contenedores. Requiere Node.js 24.18.0, pnpm 11.17.0 y PostgreSQL; el perfil Docker de desarrollo utiliza PostgreSQL 16.14. No se incluyen usuarios ni contraseñas productivas.

Los módulos de servicios, fichas/PDF, finanzas, convenios y alertas se implementarán en los siguientes incrementos de [MODULOS.md](docs/segunda-entrega/MODULOS.md). Los archivos de la segunda entrega conservan el diseño aprobado y sus criterios de aceptación; el SQL de `/database` sigue siendo referencia de diseño. Las migraciones ejecutables de cada incremento se encuentran en `/backend/prisma/migrations`.

## Segunda entrega — Diseño y módulos

**Fecha de preparación y publicación: 27/09/2026. Estado: etapa 2 aprobada, según la devolución de la tutora comunicada por el equipo el 02/10/2026.**

El [índice de la segunda entrega](docs/segunda-entrega/README.md) reúne el diseño relacional, las fichas relevadas, los módulos priorizados, la arquitectura y el registro de validación. El [modelo de datos](docs/segunda-entrega/MODELO_DATOS.md), el [diccionario completo](database/DICCIONARIO_DATOS.md) y el [DDL](database/01-esquema.sql) se complementan para mostrar tablas, campos, tipos, claves, relaciones e índices.

- [Listado de módulos y permisos](docs/segunda-entrega/MODULOS.md).
- [Arquitectura y tecnologías definidas](docs/segunda-entrega/ARQUITECTURA.md).
- [Reglas de negocio y ejemplos financieros](docs/segunda-entrega/REGLAS_NEGOCIO.md).
- [Relevamiento de las cinco fichas](docs/segunda-entrega/RELEVAMIENTO_FICHAS.md).
- [Continuidad funcional con el sistema original](docs/segunda-entrega/REFERENCIA_FUNCIONAL.md).
- [Checklist y registro de aprobación](docs/segunda-entrega/APROBACION.md).

Al publicar la segunda entrega, `/frontend`, `/backend` y `/packages/contracts` contenían solamente carpetas con marcadores vacíos; esa entrega presentó diseño SQL, documentación y diagramas sin código de aplicación. La implementación posterior se describe en el apartado de desarrollo. La devolución de la tutora informa que el aprobado está asentado en la plataforma e indica avanzar al código y a la entrega final; la evidencia y su alcance están en el registro de aprobación.

## Cliente

CILGAS es un taller que presta servicios relacionados con equipos de Gas Natural Comprimido (GNC). Dentro de su actividad intervienen responsabilidades propias de los Talleres de Montaje, los Productores de Equipos Completos y los Centros de Revisión Periódica de Cilindros.

El propietario es la autoridad principal para validar las reglas comerciales y operativas. Los responsables técnicos, las entidades que mantienen convenios y los proveedores son stakeholders externos, aunque inicialmente no utilizarán el sistema.

## Problemática real

La problemática central es la **falta de trazabilidad integral y confiable de la operación debido al manejo fragmentado en papel**. No contar con software no constituye por sí mismo el problema: es una condición que favorece la repetición de datos, los errores documentales, las demoras administrativas y la dificultad para comprender la situación financiera.

Los perjuicios priorizados por CILGAS son:

1. desconocimiento financiero;
2. errores documentales;
3. demora administrativa.

El relevamiento de la primera entrega identificó la necesidad de un registro centralizado que relacione personas, vehículos, equipos de GNC, servicios realizados, componentes, fichas técnicas, obleas, revisiones quinquenales, vencimientos, cobros, convenios, proveedores, obligaciones y pagos.

El volumen aproximado es de 500 obleas, 150 pruebas hidráulicas y 400 movimientos financieros mensuales, con cuatro convenios comerciales y movimientos económicos superiores a ARS 10.000.000 por mes. No se espera alta concurrencia; la dificultad se encuentra en la consistencia y trazabilidad del dominio.

## Situación relevada en la primera entrega

En el flujo habitual de una revisión quinquenal:

1. la persona lleva el vehículo a CILGAS;
2. se solicitan nuevamente sus datos y los del vehículo, aunque ya haya sido atendida anteriormente;
3. se realiza el trabajo técnico sobre uno o más cilindros y componentes;
4. se efectúa también la revisión anual y se asigna una nueva oblea;
5. el propietario decide los reemplazos técnicos; el cambio de válvulas se propone habitualmente y puede ajustarse por cilindro según lo realizado;
6. el cliente paga en efectivo, transferencia o mediante las condiciones comerciales acordadas;
7. el hijo del propietario completa la ficha técnica en papel;
8. el hijo y el propietario controlan la documentación;
9. alguno de ellos carga la operación manualmente en SICGNC;
10. se conserva el identificador resultante y se imprime la documentación correspondiente.

La ficha técnica reúne datos del taller, PEC, operación, obleas, vehículo, propietario, regulador, cilindros, válvulas y demás componentes. En el flujo relevado y en la ficha F01, la PH se indica junto con `REVISIÓN ANUAL` mediante una anotación manual. Las [cinco fichas relevadas](docs/segunda-entrega/RELEVAMIENTO_FICHAS.md) muestran variantes que requieren conservar por separado operación documental y ensayo realizado.

## Propuesta de valor

Se propone una aplicación web interna que permita registrar cada servicio una sola vez y mantener relacionada toda su historia técnica, documental, comercial y financiera.

La solución permitirá:

- recuperar personas, vehículos y configuraciones anteriores sin volver a transcribir todos sus datos;
- proponer la composición habitual de un servicio y registrar lo efectivamente utilizado o modificado;
- conservar la evolución de cilindros, válvulas, reguladores y demás componentes;
- generar fichas técnicas en PDF listas para imprimir y asistir la carga manual en SICGNC;
- preservar cada ficha confirmada como una fotografía histórica inmutable;
- relacionar obleas, revisiones de cilindros, certificados y cambios de componentes con el servicio que los originó;
- registrar cobros completos, parciales, anticipos y pagos combinados;
- distinguir obligaciones con proveedores de pagos efectivamente realizados;
- derivar perspectivas financieras explicables sin mantener libros paralelos;
- administrar convenios, cupones y liquidaciones;
- mostrar alertas internas antes de vencimientos técnicos y financieros;
- permitir delegación futura mediante roles, permisos y auditoría.

El sistema no reemplazará SICGNC ni los sistemas fiscales o contables oficiales.

## Actores y usuarios

### Usuarios iniciales

- **Propietario:** supervisa la operación y accede a todas las capacidades sensibles.
- **Hijo del propietario:** registra la actividad cotidiana y posee las mismas facultades administrativas que el propietario.

### Usuario futuro

- **Operador:** podrá registrar personas, vehículos, servicios, fichas y cobros, y consultar los movimientos originados por su operación. No podrá acceder a Caja Real, administrar usuarios, anular cobros ni operar liquidaciones.

### Personas relacionadas

El titular del vehículo, la persona de contacto y quien paga pueden ser diferentes. Estas personas pueden registrarse para documentar un servicio sin convertirse en usuarios de la aplicación.

### Stakeholders sin acceso inicial

- responsables técnicos;
- entidades pagadoras de convenios;
- proveedores;
- clientes de CILGAS.

## Flujo propuesto

1. Buscar una persona o registrarla junto con sus datos regulatorios y de contacto.
2. Seleccionar o registrar el vehículo y consultar su configuración técnica vigente.
3. Crear un borrador a partir de un servicio del catálogo.
4. Ajustar componentes, cantidades, precios, costos y resultados a lo realmente realizado.
5. Confirmar el servicio. Recién entonces se originan sus efectos técnicos, documentales y las obligaciones con proveedores. Los cobros, incluidos anticipos vinculados al borrador, se registran explícitamente cuando se recibe dinero.
6. Generar la ficha técnica, la oblea, la revisión de cilindros y los demás resultados aplicables.
7. Registrar cobros, obligaciones con proveedores y egresos sin confundir importes vendidos con dinero recibido.
8. Descargar e imprimir el PDF y completar manualmente el flujo de SICGNC.
9. Conservar la ficha confirmada y cualquier rectificación posterior.
10. Consultar historia, saldos, vencimientos y alertas desde información relacionada.

No se modelará un flujo operativo detallado con estados como “en taller” o “esperando repuesto”. Un borrador podrá editarse mientras se respeten sus cobros explícitos vinculados; guardarlo no genera efectos por sí solo. Al confirmarse, representará un servicio ya realizado.

## Modelo conceptual

El diseño físico se presenta en [la segunda entrega](docs/segunda-entrega/MODELO_DATOS.md). Los conceptos y relaciones que lo fundamentan son:

- un **servicio del catálogo** es una oferta configurable;
- un **servicio realizado** es un trabajo concreto con condiciones históricas propias;
- el catálogo propone una composición, pero el servicio registra los ítems efectivamente utilizados, retirados, inspeccionados o generados;
- un vehículo mantiene una sola configuración de equipo vigente y puede conservar varias configuraciones históricas;
- cilindros, válvulas y reguladores requieren identidad e historial individual;
- una revisión quinquenal puede involucrar hasta cuatro cilindros, aunque la oferta comercial habitual alcance tres;
- la prueba hidráulica es un ensayo y no implica necesariamente cambiar el cilindro;
- obleas, revisiones, certificados, cambios de componentes y fichas son resultados trazables del servicio realizado;
- una ficha confirmada conserva un snapshot inmutable; un error posterior genera una rectificación y no una sobrescritura;
- todo cobro se aplica desde el inicio a un servicio concreto; CILGAS no administrará saldos a favor generales;
- una obligación con un proveedor nace al realizarse el servicio que origina el costo;
- los pagos a proveedores y demás egresos se registran cuando ocurren efectivamente;
- un convenio pertenece a una entidad pagadora y sus cupones disponibles pueden agruparse en liquidaciones.

El vocabulario acordado se mantiene en [CONTEXT.md](CONTEXT.md) y las decisiones arquitectónicas relevantes en [docs/adr](docs/adr).

## Reglas financieras

Una venta no se considera dinero disponible hasta que exista un cobro efectivo. Si un servicio cuesta ARS 100.000 y sólo se cobraron ARS 30.000, el ingreso financiero reconocido es ARS 30.000.

Se mantendrá una única fuente de hechos financieros:

- cobros;
- egresos;
- obligaciones con proveedores;
- pagos de obligaciones;
- anulaciones y ajustes auditables.

A partir de esos hechos se derivarán dos perspectivas:

- **Saldo real:** flujo neto acumulado desde la puesta en marcha, considerando exclusivamente cobros y egresos efectivos registrados.
- **Saldo teórico:** saldo real menos obligaciones pendientes con proveedores. Reconoce la deuda desde su nacimiento; sus pagos ya incluidos en egresos no se descuentan por segunda vez. La [regla financiera y sus ejemplos](docs/segunda-entrega/REGLAS_NEGOCIO.md) explicitan el cálculo.

Estas perspectivas no serán libros editables independientes. “Saldo real” no significará saldo bancario ni arqueo físico, porque el MVP no realizará conciliación ni partirá de saldos históricos.

Un costo absorbido por CILGAS no generará automáticamente un egreso ficticio. La mano de obra u otro gasto asociado podrá registrarse como egreso cuando exista un hecho económico real y el administrador decida documentarlo.

## Alcance

### MVP

- autenticación local, roles y auditoría de acciones sensibles;
- personas relacionadas, vehículos y configuraciones históricas de equipos;
- catálogo y servicios realizados con composición variable;
- borradores y confirmación de servicios;
- obleas, revisiones quinquenales, componentes y resultados técnicos;
- generación y descarga de fichas técnicas en PDF;
- snapshots documentales y rectificaciones;
- cobros totales, parciales, anticipos y pagos combinados;
- costos, proveedores, obligaciones y pagos;
- gastos generales y movimientos efectivos;
- saldos real y teórico derivados;
- convenios, cupones y liquidaciones básicas;
- alertas internas configurables;
- copias de seguridad y despliegue online.

### Nice to have

- planes de cuotas con calendarios avanzados;
- diferencias y pagos parciales complejos en liquidaciones;
- inventario integral de componentes;
- informes y exportaciones avanzadas;
- digitalización y conservación de documentos firmados;
- envío automático de WhatsApp o email;
- métricas y tableros avanzados.

### Fuera de alcance

- facturación fiscal e integración con ARCA;
- contabilidad formal e impuestos;
- integración o automatización directa de SICGNC;
- aplicación móvil nativa;
- portal de autogestión para clientes;
- microservicios y procesamiento distribuido;
- gestión completa de compras y stock;
- migración masiva de documentación en papel;
- cuentas corrientes o saldos a favor generales de clientes.

El sistema comenzará desde una fecha de corte sin migrar registros históricos. Ante una caída extraordinaria de Internet, CILGAS continuará temporalmente en papel y cargará la operación al recuperar la conexión.

## Arquitectura

Se utilizará un **monolito modular en un monorepo**. El frontend y el backend tendrán límites explícitos, pero se desplegarán como una única solución. No se utilizarán microservicios porque el volumen y la concurrencia no justifican su costo operativo ni la complejidad de mantener consistencia distribuida.

Los módulos se organizarán por capacidades de negocio y no por tablas. Las operaciones que produzcan efectos técnicos, documentales y financieros se coordinarán de forma transaccional desde el backend.

La comunicación será REST con JSON y documentación OpenAPI. El backend será la autoridad para reglas, permisos y validaciones; ocultar una opción en la interfaz no se considerará un control de seguridad.

## Stack tecnológico

| Área | Tecnología | Justificación |
| --- | --- | --- |
| Lenguaje | TypeScript | Unifica frontend y backend, aporta tipado estático y reduce cambios de contexto para un equipo pequeño. |
| Frontend | React + Vite | Adecuado para una aplicación interna sin necesidades de SEO o renderizado público; ofrece desarrollo rápido y una compilación estática sencilla. |
| Backend | NestJS | Facilita modularidad, validación, autorización, inyección de dependencias, pruebas y documentación REST. |
| API | REST + OpenAPI | Es suficiente para los consumidores previstos, explícito y fácil de probar. |
| Base de datos | PostgreSQL | Proporciona relaciones, restricciones, transacciones e integridad adecuadas para historia técnica y finanzas. |
| ORM | Prisma | Acelera el acceso tipado y las migraciones; se permitirá SQL explícito para consultas financieras que lo requieran. |
| Snapshots | PostgreSQL JSONB | Conserva el contenido autocontenido de fichas históricas sin introducir una segunda base de datos. |
| Monorepo | pnpm workspaces | Permite coordinar frontend, backend y contratos compartidos con instalación reproducible. |
| Contenedores | Docker | Homogeneiza desarrollo y producción y simplifica el despliegue en el VPS existente. |
| Infraestructura | VPS Hostinger + dominio existente | Evita contratar nueva infraestructura y permite control directo del entorno. |
| Proxy y HTTPS | Nginx | Servirá la aplicación estática, enrutará la API y terminará HTTPS en el VPS; decisión técnica detallada en la segunda entrega. |
| Integración continua | GitHub Actions | Automatiza análisis estático, pruebas y builds en cada cambio integrado. |
| Testing backend | Jest/Supertest e integración con PostgreSQL | Verifica reglas, API y transacciones sobre una base real de prueba. |
| Testing frontend | Vitest y Testing Library | Verifica componentes y comportamiento sin depender de recorridos completos. |
| Testing E2E | Playwright | Cubre los recorridos críticos desde la perspectiva del usuario. |
| PDF | Playwright/Chromium en el servidor, con plantilla HTML/CSS versionada | Generará el PDF desde el snapshot confirmado; permite reintentar el renderizado sin duplicar efectos del servicio. La fidelidad a la plantilla se verificará al implementar. |

### PostgreSQL frente a NoSQL

PostgreSQL es la opción principal por la cantidad de relaciones, la necesidad de integridad referencial, las transacciones financieras, la trazabilidad y las consultas cruzadas. Una base documental no elimina esas relaciones y trasladaría invariantes críticas al código.

JSONB se utilizará únicamente como complemento para snapshots históricos. No se incorporará una segunda base de datos NoSQL porque aumentaría despliegue, respaldos, sincronización y pruebas sin resolver una necesidad actual.

## Seguridad

- autenticación local con contraseñas almacenadas mediante hash seguro;
- sesiones en cookies seguras y `HttpOnly`;
- autorización por capacidades aplicada en el backend;
- HTTPS obligatorio;
- validación de todos los datos de entrada;
- limitación de intentos de inicio de sesión;
- auditoría de accesos y mutaciones sensibles;
- anulaciones y rectificaciones en lugar de sobrescrituras silenciosas;
- secretos fuera del repositorio;
- principio de mínimo privilegio para aplicación y base de datos;
- copias de seguridad externas al VPS y pruebas de restauración.

## Estrategia de testing y calidad

La prioridad no será alcanzar un porcentaje arbitrario de cobertura, sino proteger reglas y recorridos de alto riesgo:

- confirmación transaccional de un servicio;
- generación de resultados y snapshot documental;
- rectificación de una ficha;
- cobros parciales y combinados;
- nacimiento y pago de obligaciones;
- derivación de saldos real y teórico;
- liquidación básica de convenios;
- autorización y anulación de operaciones sensibles;
- generación del PDF reglamentario.

GitHub Actions ejecutará formato, lint, typecheck, pruebas, builds y recorridos E2E críticos. React Doctor se utilizará como control complementario de estado, efectos, rendimiento, arquitectura, seguridad y accesibilidad.

## Despliegue y continuidad

La aplicación se desplegará mediante Docker en el VPS de Hostinger que ya posee el cliente y utilizará su dominio registrado. Un proxy inverso administrará HTTPS. El equipo podrá continuar administrando el servidor después de la entrega.

Se realizarán copias automáticas diarias, almacenadas fuera del VPS y conservadas al menos 30 días. El objetivo inicial es perder como máximo un día de información y recuperar el servicio dentro de cuatro horas. Antes de la entrega final se ejecutará y documentará una restauración de prueba.

## Plan de trabajo

El equipo dispone de aproximadamente 40 horas semanales combinadas.

El 02/10/2026 el equipo confirmó esa dedicación y la fecha de entrega final del 14/11/2026. No informó una consigna final adicional a los entregables previstos: aplicación desplegada, informe, manuales y video.

| Período | Objetivo | Resultado esperado |
| --- | --- | --- |
| Hasta 30/08 | Propuesta y repositorio | Problema, valor, alcance, stack, riesgos, viabilidad y repositorio único. |
| 31/08 al 13/09 | Descubrimiento y validación | Flujos, vocabulario, reglas confirmadas, hipótesis y pendientes validados con el propietario. |
| 14/09 al 27/09 | Diseño y módulos | Modelo conceptual refinado, diseño de datos y módulos aprobados por tutora y comité. |
| 28/09 al 04/10 | Base técnica | Monorepo, CI, autenticación, autorización, persistencia, migraciones y despliegue inicial. |
| 05/10 al 18/10 | Núcleo operativo | Personas, vehículos, equipos, catálogo, servicios, componentes, fichas, obleas y revisiones. |
| 19/10 al 01/11 | Núcleo financiero | Cobros, proveedores, obligaciones, pagos, gastos, caja, convenios y liquidaciones básicas. |
| 02/11 al 08/11 | Integración y endurecimiento | Alertas, auditoría, pruebas críticas, seguridad, backups, accesibilidad y correcciones. |
| 09/11 al 14/11 | Entrega final | Despliegue estable, informe, manuales, video y margen de contingencia. |
| Después del 14/11 | Defensa | Preparación de demostración y justificación ante el comité. |

El testing, la revisión y la documentación se realizarán durante todo el desarrollo y no se postergarán completamente a la etapa final.

## Riesgos y mitigaciones

| Riesgo | Impacto | Mitigación |
| --- | --- | --- |
| Reglas regulatorias o prácticas del taller todavía ambiguas | Documentos incorrectos o modelo inadecuado | Validar con el propietario y responsables técnicos; distinguir normativa, política operativa e hipótesis. |
| Alcance amplio para once semanas | Entrega incompleta o baja calidad | Priorizar recorridos completos, limitar variantes avanzadas y proteger un margen final. |
| Intentar modelar inventario completo por el intercambio de cilindros | Desvío del objetivo principal | Conservar identidad, ubicación y disponibilidad conceptual; postergar compras y stock integral. |
| Errores en cálculos financieros | Pérdida de confianza | Hechos financieros únicos, transacciones, invariantes y pruebas de integración. |
| Modificación accidental de historia | Pérdida de trazabilidad | Snapshots inmutables, rectificaciones, anulaciones y auditoría. |
| Dependencia del conocimiento del propietario y su hijo | Baja adopción o reglas incompletas | Validaciones frecuentes con casos reales y demostraciones incrementales. |
| Falla o pérdida del VPS | Indisponibilidad o pérdida de datos | HTTPS, endurecimiento, backups externos y restauraciones verificadas. |
| Cambios en la ficha o SICGNC | Reprocesamiento documental | Plantillas versionadas y sin automatización directa del sistema externo. |

## Viabilidad

### Técnica

El volumen es moderado y compatible con un monolito y una única instancia PostgreSQL. El stack seleccionado es maduro, permite transacciones, testing automatizado y despliegue en la infraestructura existente. La principal dificultad técnica es la coherencia del dominio, no la escala.

### Operativa

Los dos usuarios iniciales conocen el proceso y participarán en la validación. La aplicación se orientará a escritorio y tablet, con diseño adaptable. CILGAS posee conectividad estable y cuenta con un procedimiento manual de contingencia ante cortes extraordinarios.

### Temporal

Con dos integrantes y 40 horas semanales combinadas, el proyecto es viable si se mantiene el alcance acordado. Convenios complejos, cuotas avanzadas, automatizaciones externas e inventario integral serán las primeras capacidades a reducir si amenazan los flujos técnicos y financieros centrales.

## Criterios de éxito

El producto se considerará exitoso si:

- el 100% de los servicios nuevos relaciona persona, vehículo, configuración del equipo, ficha y situación de cobro;
- cada saldo mostrado puede explicarse mediante cobros, obligaciones, pagos y egresos registrados;
- ninguna ficha confirmada cambia silenciosamente y toda corrección queda como rectificación trazable;
- el sistema muestra el 100% de los vencimientos registrados dentro del período de alerta configurado;
- los usuarios pueden recuperar información existente y generar el PDF sin volver a transcribir datos que siguen vigentes.

## Estado del conocimiento

### Confirmado por el propietario

- prioridades del problema;
- usuarios iniciales y distribución general de tareas;
- composición variable de servicios;
- generación manual posterior en SICGNC;
- snapshots históricos de fichas;
- cobros parciales y combinados;
- nacimiento de obligaciones al realizar servicios;
- saldos derivados desde hechos financieros;
- reemplazo habitual de válvulas, precisado por el equipo el 02/10/2026 como propuesta ajustable por cilindro;
- infraestructura disponible y administración posterior.

### Hipótesis de diseño aceptadas

- servicios confirmados como origen común de resultados técnicos y financieros;
- configuración histórica del equipo con una sola versión vigente;
- inventario técnico mínimo para cilindros sin gestión integral de stock;
- plazos de alerta configurables;
- división del MVP y capacidades posteriores.

### Pendiente de validar

- identidad y responsabilidades jurídicas exactas entre CILGAS y los sujetos regulatorios relacionados;
- ciclo posterior de los cilindros usados que quedan en poder de CILGAS;
- significado y formato definitivo del identificador devuelto por SICGNC;
- reglas excepcionales de rectificación aceptadas por el circuito regulatorio;
- validación durante la implementación de Nginx y del PDF con Playwright/Chromium;
- validaciones específicas de las fichas y el diseño indicadas en [APROBACION.md](docs/segunda-entrega/APROBACION.md).
