# Desarrollo de CILGAS

La aplicación implementa identidad, acceso, permisos, auditoría, M02 (configuración y referencias), M03 (personas y vehículos), componentes de M04, el catálogo de M05, proveedores de M10 y borradores de M06. El motor de confirmación integra historia técnica, resultados, obligaciones y ficha inmutable, con PDF pendiente. La confirmación aplica las reglas acordadas el 05/10/2026 y devuelve requisitos concretos por servicio, según el detalle inferior. Cobros, pagos, caja y generación de PDF siguen fuera de este incremento. El DDL de `database/` conserva el [diseño aprobado](segunda-entrega/README.md); la aplicación utiliza exclusivamente sus migraciones versionadas.

## Herramientas y configuración

Usar Node.js **24.18.0**, pnpm **11.17.0** y Docker con Compose v2. Los manifiestos y `pnpm-lock.yaml` fijan las dependencias. Las imágenes fijan versión y digest: PostgreSQL **16.14-bookworm**, Node.js **24.18.0-bookworm-slim** y Nginx **1.30.5-alpine3.24**. No es necesario instalar PostgreSQL globalmente.

Desde la raíz del repositorio, copiar `.env.example` a `.env`. En PowerShell:

```powershell
Copy-Item .env.example .env
```

Editar `.env` antes de iniciar la base. Definir una clave local y actualizar tanto `POSTGRES_PASSWORD` como las cuatro URL de conexión. Codificar los caracteres reservados de la contraseña dentro de las URL. El archivo está excluido de Git y del contexto Docker; nunca poner credenciales reales en archivos versionados.

| Variable                                                                    | Uso                                                                                                    |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `POSTGRES_USER`, `POSTGRES_DB`, `POSTGRES_PASSWORD`                         | Creación inicial de la base de desarrollo.                                                             |
| `DATABASE_URL`                                                              | Backend y migraciones ejecutados desde el equipo, puerto `55432`.                                      |
| `DATABASE_URL_DOCKER`                                                       | Backend y migración dentro de Docker, host `postgres`, puerto `5432`.                                  |
| `TEST_DATABASE_URL`                                                         | Base de pruebas `cilgas_test`, puerto local `55433`.                                                   |
| `E2E_DATABASE_URL`                                                          | Base separada `cilgas_e2e_test` en la instancia de pruebas; opcional, derivada de `TEST_DATABASE_URL`. |
| `APP_ORIGIN`                                                                | Origen exacto del navegador: `http://localhost:5173` durante desarrollo.                               |
| `BOOTSTRAP_ADMIN_NAME`, `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_PASSWORD` | Alta explícita de la primera cuenta administradora.                                                    |

Los scripts de la raíz cargan `.env` para desarrollo, migración, bootstrap y pruebas, sin reemplazar variables ya definidas en el entorno. CI proporciona sus propias variables. Usar los comandos desde esa raíz.

## Preparar la base y la primera cuenta

```text
pnpm install --frozen-lockfile
pnpm db:generate
docker compose up -d --wait postgres
pnpm db:migrate
```

`db:migrate` aplica las migraciones versionadas de `backend/prisma/migrations/` mediante `prisma migrate deploy`. Puede repetirse; no reinicia ni vacía la base. Las migraciones crean identidad, permisos, sesiones y auditoría, junto con los maestros y relaciones de M02/M03, componentes individuales, proveedores, catálogo, borradores y los hechos de confirmación de M06. Para actualizar una instalación existente, generar el cliente Prisma y aplicar las migraciones antes de iniciar el nuevo backend. Aplicar las migraciones no confirma borradores ni modifica snapshots anteriores; los requisitos se evalúan al revisar y confirmar cada trabajo.

Definir nombre, email válido y una contraseña de entre 12 y 128 caracteres en las variables `BOOTSTRAP_ADMIN_*` de `.env`. No hay contraseña de acceso predeterminada. Luego ejecutar:

```text
pnpm db:bootstrap
```

El comando registra el alta inicial en auditoría. Repetirlo con el mismo email no cambia la contraseña. Cuando ya hay un administrador, las cuentas siguientes se crean desde la gestión de usuarios de la aplicación. Quitar `BOOTSTRAP_ADMIN_PASSWORD` de `.env` después del alta; no hace falta conservarla para arrancar la API.

El volumen `cilgas_postgres_data` conserva la base entre recreaciones de contenedores. Cambiar las variables `POSTGRES_*` después de inicializarlo no modifica usuarios ni contraseñas existentes. Esos cambios requieren una operación explícita de administración de PostgreSQL.

## Ejecutar la aplicación

Para trabajar con recarga durante desarrollo:

```text
pnpm dev
```

Abrir [http://localhost:5173](http://localhost:5173). Vite dirige `/api` a la API local del puerto `3000`; usar `localhost`, coherente con `APP_ORIGIN`. La sesión pertenece al servidor y la autorización se verifica en la API, aunque una opción no sea visible en el menú.

Para verificar las aplicaciones compiladas detrás de Nginx:

```text
docker compose --profile app up -d --build --wait
docker compose --profile app ps
```

Abrir [http://localhost:8080](http://localhost:8080). El perfil `app` configura explícitamente ese origen para el backend, espera la salud de PostgreSQL, aplica las migraciones mediante un proceso separado y recién entonces inicia la API y Nginx. La primera cuenta puede prepararse con `pnpm db:bootstrap` antes o después del arranque porque utiliza la misma base de desarrollo.

Nginx sirve el frontend y conserva el prefijo `/api` al reenviar las solicitudes al backend. La API no tiene puerto publicado en Docker. PostgreSQL y Nginx sólo se publican en la interfaz de loopback del equipo. El perfil local usa HTTP y `NODE_ENV=development`; no es una configuración para exponer a Internet.

La configuración utiliza una sola instancia de la API: el limitador de intentos y la clave para CSRF viven en ese proceso. Las sesiones se conservan en PostgreSQL; después de un reinicio, el frontend solicita un nuevo token CSRF antes de cada modificación. La sesión dura ocho horas por defecto, configurable mediante `SESSION_TTL_HOURS` entre 1 y 24. OpenAPI está disponible en `/api/docs` sólo en desarrollo.

Para inspeccionar un fallo de inicio sin mostrar configuración ni secretos:

```text
docker compose --profile app logs --tail 80 migrate backend web
```

Para detener los contenedores conservando la base:

```text
docker compose --profile app --profile test down
```

No agregar `--volumes`: eliminaría el almacenamiento persistente de desarrollo. Tampoco usar `prisma migrate reset` como procedimiento de actualización.

## Verificaciones

### Recorridos de configuración, personas y vehículos

Desde **Configuración**, el administrador carga los datos del taller, el TdM relacionado y las referencias de PEC, TdM, CRPC y modelos de componentes. La capacidad `configuracion.administrar` se incorpora mediante migración sólo al rol administrador. Los operadores consultan referencias técnicas; cada modificación se autoriza en la API y se registra en la misma transacción que su evento de auditoría. No se precargan identidades regulatorias ni habilitaciones inferidas.

Desde **Personas**, buscar por documento o nombre antes de registrar. El formulario muestra coincidencias para recuperar la persona existente o distinguir un homónimo. Desde la persona se accede a sus vehículos, incluidos los vínculos históricos. **Vehículos** permite buscar por dominio y editar los datos actuales, conservando inyección como sí, no o sin informar y el detalle específico del tipo Otros.

Los documentos, dominios, códigos y matrículas se transportan como texto. La API normaliza identificadores y mantiene restricciones únicas para resolver también altas concurrentes. Los campos opcionales pueden vaciarse durante una edición y las bajas son lógicas.

Las relaciones del vehículo distinguen **titular** y **contacto**, con inicio y fin de vigencia. Un cambio de titular cierra el vínculo anterior y conserva su historia; la fecha de fin es exclusiva y debe ser posterior al inicio. El **pagador** se asigna al borrador de servicio en M06: no se agrega como vínculo permanente del vehículo. Los maestros actuales no implementan ni alteran snapshots o PDF; la preservación documental completa se verificará con M08.

La tabla de configuración conserva la identidad comercial del taller y una referencia explícita al actor TdM. Los datos documentales del actor siguen siendo independientes. Las referencias de marcas/modelos de este tramo corresponden a los modelos técnicos de componentes; los vehículos conservan marca y modelo textuales según el diseño aprobado.

### Recorridos de componentes, proveedores y catálogo

Desde **Componentes**, registrar una identidad eligiendo un modelo técnico existente, su número de serie y, si se conoce, el mes y año de fabricación. Buscar por serie o referencia, recuperar coincidencias y editar los datos descriptivos. La serie conserva sus ceros iniciales; modelo y serie identifican un único componente. Registrar el componente no lo instala en ningún vehículo. La consulta de historia distingue movimientos, intervenciones sin recambio y resultados de PH originados en confirmaciones, con referencia al servicio. Una historia vacía no demuestra que el vehículo carezca de equipo.

Desde **Proveedores**, el administrador registra nombre, CUIT opcional y contacto, busca coincidencias y edita o desactiva el proveedor. El proveedor comercial permanece separado de PEC, CRPC y TdM. Desde **Catálogo**, puede crear y editar ofertas, precios de venta y composición, con cantidades, precios unitarios, costos y proveedores sugeridos. Las propuestas de revisión anual y quinquenal permiten preparar la composición habitual; la quinquenal incluye anual, oblea, PH y recambio de válvulas ajustable. No se precargan precios comerciales del taller.

Probar una oferta con precio y costos decimales, editar su composición y recuperarla. Luego ingresar como operador: puede consultar la oferta y sus precios de venta, pero no administrar el catálogo ni consultar proveedores o costos. La API aplica esas restricciones aunque se fabrique una petición fuera de la interfaz. Cada modificación autorizada conserva su auditoría transaccional.

Este tramo no confirma servicios, no registra instalaciones, retiros ni bajas efectivas de componentes y no crea obligaciones, cobros, pagos o saldos. La preservación de valores propios de servicios confirmados y las invariantes de configuración se verificarán junto con M06; no quedan acreditadas por las pruebas de estos maestros.

### Relevamiento inicial de equipos existentes

Desde **Vehículos → Configuraciones**, una cuenta con capacidad `servicios.gestionar` puede relevar un equipo que ya existe. Primero se registran las identidades de sus componentes en **Componentes**; luego se seleccionan un regulador y entre una y cuatro parejas explícitas de cilindro y válvula. Esta carga inicial exige que el vehículo no tenga configuraciones previas. Una configuración vacía o cerrada sigue siendo historia conocida y no habilita otro relevamiento inicial.

Se pueden conservar antecedentes conocidos de PH por cilindro y de oblea del vehículo. Los campos desconocidos se dejan vacíos: no se presupone un resultado aprobado, un CRPC, una fecha de ensayo ni una emisión. La fecha conocida de PH conserva su precisión de mes/año o día completo. Los vencimientos conocidos corresponden al cierre del mes y se contrastan con la duración aplicable cuando se conoce la fecha inicial. Los antecedentes quedan identificados como datos relevados, separados de los ensayos y obleas de servicios confirmados.

Guardar registra la configuración observada desde ese momento, sus parejas y sus antecedentes, junto con usuario y auditoría. No reconstruye la fecha de instalación ni crea servicios, movimientos de instalación, ensayos, emisiones, fichas u obligaciones históricos. El relevamiento guardado se consulta sin edición. Ante una respuesta de red incierta, el reintento de la misma solicitud recupera el mismo resultado; una clave reutilizada con otros datos o una configuración creada concurrentemente producen un conflicto.

La transacción bloquea el vehículo y los componentes para impedir dos cargas iniciales o instalar un componente simultáneamente en vehículos distintos. También rechaza componentes dados de baja técnica y referencias de tipo incorrecto. Una falla revierte conjuntamente configuración, antecedentes y auditoría.

Después se puede preparar una revisión o modificación M06 sobre esa configuración. Al confirmar, los antecedentes conocidos completan la representación documental sin crear un ensayo ni una oblea anterior. Los datos contradictorios, vencidos, rechazados o insuficientes mantienen sus controles específicos. Los resultados posteriores se conservan como hechos del servicio y la ficha conserva el snapshot inmutable. Los movimientos físicos de accesorios, el PDF y las finanzas mantienen su alcance separado.

### Recorrido de borradores de servicios

Desde **Servicios**, crear un **Nuevo borrador**, buscar el vehículo y seleccionar una oferta activa. La propuesta comercial se copia al servicio: los cambios posteriores del catálogo no reemplazan sus valores. La fecha y las personas por rol pertenecen al trabajo; una misma persona puede ser titular, contacto y pagador. Se pueden ajustar sin modificar las relaciones históricas del vehículo. El alta recupera los vínculos vigentes para la fecha indicada; si hay varios contactos, deja ese rol pendiente para elegirlo explícitamente.

Editar la descripción, cantidades, precios, descuentos y total acordado. Asociar componentes individuales existentes con su acción comercial cuando corresponda; cada componente individual representa una unidad. El total acordado puede diferir de la suma de los ítems mientras el servicio está en borrador. Los costos copiados son propuestas, no obligaciones. El administrador puede revisarlos; el operador no los recibe ni puede introducirlos mediante una petición directa.

Completar o dejar pendiente la preparación documental: actores regulatorios, obleas propuestas, fechas y observaciones. Los renglones técnicos conservan componentes, posición prevista y datos de revisión, incluso incompletos. La acción comercial sobre un componente y la marca documental son campos distintos. Los datos propuestos no certifican resultados ni resuelven los pendientes regulatorios del diseño.

Guardar, buscar por vehículo o persona y recuperar el borrador. Ingresar con otra cuenta autorizada y continuar el mismo registro: se conserva el creador y cada guardado registra su actor en auditoría. Si dos personas parten de la misma versión, el segundo guardado informa el conflicto; debe recuperarse la versión actual antes de continuar, sin sobrescribirla silenciosamente.

Guardar un borrador no instala ni retira componentes, no modifica configuraciones, no emite obleas o documentos y no genera obligaciones o movimientos de dinero. La revisión y confirmación son acciones separadas, descritas a continuación. Cancelación, cobros y pagos quedan fuera de este incremento.

### Confirmación de servicios y límites regulatorios

Desde **Servicios**, revisar la confirmación de un borrador ya guardado. La revisión recupera su versión y la configuración actual del vehículo, y muestra los requisitos pendientes devueltos por el servidor. Cerrar la revisión permite continuar editando el borrador. El chequeo no confirma el trabajo ni reserva componentes; al confirmar, el servidor vuelve a validar los datos dentro de la transacción.

La confirmación fija los valores históricos del trabajo y coordina configuración, movimientos de componentes, resultados técnicos, obligaciones por costos externos, ficha y auditoría. Un costo absorbido no genera obligación. El control de versión y de configuración detecta preparaciones desactualizadas; una clave de idempotencia conserva el resultado de una solicitud repetida. La ficha queda en estado PDF **PENDIENTE**. Guardar o revisar un borrador sigue sin producir esos efectos.

Los servicios confirmados y sus fichas se consultan sin edición. La ficha conserva datos autocontenidos de personas, vehículo, taller, actores, componentes y resultados; las modificaciones posteriores de maestros no reemplazan el snapshot. Los permisos técnicos no habilitan la consulta de costos u obligaciones. La generación del PDF y las rectificaciones no se implementan en este tramo.

El [relevamiento de fichas](segunda-entrega/RELEVAMIENTO_FICHAS.md#definiciones-operativas-confirmadas-el-05102026) y las reglas RN-19 a RN-24 respaldan las validaciones de este incremento. Q1–Q11 están resueltos: no se mantienen los bloqueos generales RF-01 a RF-05, RF-07 y RF-08 por decisiones ya acordadas.

- **Datos obligatorios:** al confirmar se verifican marca, modelo, año, dominio, inyección y tipo de vehículo; titular con nombre, documento, calle, altura, CPA, localidad, provincia y teléfono. Una altura `S/N` expresa domicilio sin número. Piso/depto y observaciones libres siguen siendo opcionales; los maestros y borradores pueden guardarse incompletos.
- **Operación y PH:** conversión C incluye PH; servicio de PH o quinquenal usa R; PH por vencimiento también usa R aunque la oblea siga vigente. Una modificación M requiere el antecedente de oblea vigente y conserva el motivo del ensayo cuando lo incluye. La renovación, modificación y PH requieren oblea nueva. D/B no presumen una emisión.
- **Fechas y resultados:** habilitación coincide con la fecha del servicio. La oblea vence al finalizar el mismo mes del año siguiente; la PH, al finalizar ese mes cinco años después. El ensayo conserva mes/año o día conocido, separado de fabricación. Se exige resultado real y CRPC; el certificado puede faltar. Un cilindro rechazado no queda instalado.
- **Componentes e historia:** MSDB se contrasta con instalaciones y retiros reales. S conserva la instalación; D permite reutilizar; B impide volver a instalar el componente. Cada válvula identifica explícitamente su cilindro. El recambio conserva ambas relaciones históricas, presenta la pareja resultante y agrega la válvula retirada a Observaciones con código, serie, D/B y cilindro. Admite hasta cuatro recambios sin perder las salientes.
- **Ficha:** los nuevos snapshots conservan esos vínculos y datos autocontenidos. Las fichas anteriores se consultan con su contenido original. Firmas, aclaraciones y sellos se completan manualmente después de imprimir; no son requisitos digitales previos. El PDF continúa pendiente.

Las pruebas ejercitan tanto las reglas de producción como las garantías transaccionales por HTTP y PostgreSQL aislado: confirmación completa, rechazos específicos, conservación del borrador, reintentos idempotentes, carreras por componentes y configuración, permisos, auditoría y snapshots. Las pruebas históricas del motor pueden usar un adaptador sintético dentro de su aplicación de prueba; no existe una opción HTTP o de entorno para omitir las validaciones de producción.

Permanecen límites concretos: los accesorios documentales no identifican por sí solos la configuración física. Sin configuración conocida, una conversión con instalaciones explícitas puede iniciar la historia; un vehículo con equipo existente requiere el relevamiento inicial antes de confirmar una revisión o modificación. Las instalaciones o retiros físicos de accesorios requieren su representación explícita. Las piezas sin identidad suficiente no se completan con números inventados. SICGNC, rectificación externa y ciertos catálogos mantienen sus pendientes específicos, sin bloquear indiscriminadamente servicios completos.

### Ejecutar las comprobaciones

Las pruebas usan datos sintéticos y una instancia PostgreSQL separada, guardada en memoria y descartable. Iniciarla sólo cuando se necesite:

```text
docker compose --profile test up -d --wait postgres-test
docker compose exec postgres-test sh -c 'createdb -U "$POSTGRES_USER" cilgas_e2e_test'
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm exec playwright install chromium
pnpm test:e2e
pnpm react-doctor
```

Crear `cilgas_e2e_test` una sola vez por arranque de la instancia efímera; si ya existe, continuar con las verificaciones. Los tests backend usan esquemas aislados dentro de `TEST_DATABASE_URL`, aplican las migraciones y eliminan únicamente el esquema que crearon. Los E2E aplican las migraciones y el bootstrap sobre la base separada `cilgas_e2e_test`, sin reiniciar ni borrar otras bases. Levantan frontend en `127.0.0.1:4173` y backend en el puerto `43001`, preparan cuentas sintéticas y comprueban acceso, permisos, maestros, componentes, catálogo y recuperación y edición compartida de borradores. Requieren el backend compilado con `pnpm build`; los puertos de E2E deben estar libres.

Nunca apuntar las variables de pruebas a una base de operación: la integración exige un nombre que identifique una base de prueba y los E2E aceptan exclusivamente `cilgas_e2e_test` en un host local permitido. La instancia `postgres-test` no comparte el volumen de desarrollo y sus datos se pierden al detenerla. Los reportes y las capturas de escritorio/tablet se guardan en `playwright-report/` y `test-results/`, fuera de Git.

GitHub Actions ejecuta instalación con lockfile, generación del cliente Prisma, formato, lint, tipos, pruebas, build y E2E Chromium sobre una base efímera. También construye las imágenes, aplica la migración del perfil `app` y comprueba la API detrás de Nginx en el runner. Las credenciales de CI son ficticias. El workflow tiene permisos de lectura y no despliega ni utiliza secretos productivos. React Doctor se ejecuta al cerrar cambios React con el script fijado por el repositorio.

### Reglas de estilos del frontend

`@shadcn/lint` está instalado como dependencia de desarrollo en la raíz del workspace y se ejecuta con `pnpm lint`, también en CI. Las reglas se configuran en el bloque `frontend/src/**/*.{ts,tsx}` de [`eslint.config.mjs`](../eslint.config.mjs); el backend y los contratos conservan sus comprobaciones existentes.

El paquete no publica un preset `recommended`. Se adopta la selección compatible con el CSS propio del proyecto a partir de su [guía de adopción](https://github.com/shadcn-ui/lint/blob/main/docs/adoption.md#add-more-rules), con severidad `error`:

- `shadcn/no-inline-styles`: impide propiedades de estilo inline y elementos `<style>` en JSX. Permite propiedades CSS personalizadas para valores dinámicos, pero rechaza colores literales en ellas.
- `shadcn/no-raw-colors`: impide colores literales en atributos SVG y clases de la paleta Tailwind. En los iconos, usar `currentColor`, `none` o una variable CSS del tema.
- `shadcn/no-arbitrary-values`, con `allow: ["layout"]`: impide valores arbitrarios de apariencia en clases Tailwind y permite los de layout, según la configuración de adopción del paquete.

El frontend no usa Tailwind ni tiene `components.json`. Estas reglas no analizan las declaraciones de los archivos `.css` ni comprueban que sus variables estén definidas. La regla de valores arbitrarios sólo interviene si se introduce esa sintaxis en las clases; sin un tema Tailwind, la de colores no verifica tokens de color no declarados.

`no-unknown-classes` queda sin activar porque las clases propias no se descubren mediante un tema Tailwind. `no-restyle` y `require-static-classes` requieren identificar componentes de un sistema de diseño y sus contratos de clases; los componentes actuales no exponen esa API. Si se incorpora Tailwind o un sistema de componentes, configurar su descubrimiento y revisar esas reglas con la [documentación oficial](https://github.com/shadcn-ui/lint#settings).

## Preparación para HTTPS y producción

La infraestructura de este incremento permite verificación local; no acredita un despliegue, un respaldo ni una restauración productiva. El VPS, su convivencia con otros servicios y el dominio siguen requiriendo preparación antes de publicar.

La configuración [tls.conf.example](../infra/nginx/tls.conf.example) contiene el servidor HTTPS previsto. Para habilitarlo en un despliegue autorizado:

1. Crear una configuración privada a partir del ejemplo, reemplazando `cilgas.example.invalid` por el dominio real. Provisionar un certificado válido y su renovación; montar `fullchain.pem` y `privkey.pem` como archivos de sólo lectura. No versionarlos ni incluirlos en imágenes.
2. Reemplazar el archivo local `default.conf` por esa configuración al desplegar el servicio web. Publicar sólo los puertos HTTP/HTTPS necesarios; HTTP únicamente redirige a HTTPS. Verificar `nginx -t` con los certificados montados antes de activar el servicio.
3. Configurar el backend con `NODE_ENV=production` y `APP_ORIGIN=https://dominio-real`. La aplicación exige HTTPS en ese modo y entrega la cookie de sesión con `Secure`. Mantener el backend y PostgreSQL en la red interna y eliminar la publicación de `55432`. No iniciar `postgres-test` en producción.
4. Proporcionar credenciales separadas para la base, la cuenta de aplicación y las migraciones con los permisos necesarios. Inyectar secretos fuera de Git y crear la cuenta inicial mediante el bootstrap explícito.
5. Revisar y respaldar la base antes de nuevas migraciones. Ejecutar la migración y comprobar su finalización antes de habilitar la nueva API. Una reversión de imagen no revierte una migración.
6. Configurar y comprobar el respaldo externo y la restauración según los compromisos de [continuidad](segunda-entrega/ARQUITECTURA.md#6-despliegue-y-continuidad). La sola existencia del volumen no constituye un respaldo.

Las imágenes oficiales y el orden de arranque se verificaron contra [Docker Official Images](https://hub.docker.com/search?image_filter=official) y la [documentación de Compose](https://docs.docker.com/compose/how-tos/startup-order/). La construcción utiliza [pnpm deploy](https://pnpm.io/cli/deploy) para aislar las dependencias de producción de la API. Actualizar versiones o digests requiere volver a validar instalación, migraciones, pruebas y compilación.
