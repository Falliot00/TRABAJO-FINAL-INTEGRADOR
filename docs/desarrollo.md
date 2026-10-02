# Desarrollo de CILGAS

La aplicación implementa identidad, acceso, permisos, auditoría, M02 (configuración y referencias), M03 (personas y vehículos), la base de identidad de componentes de M04, el catálogo de M05 y los proveedores comerciales necesarios de M10. La confirmación de servicios, su historia técnica, las fichas y las finanzas se implementarán en incrementos posteriores según el [diseño aprobado](segunda-entrega/README.md). El DDL de `database/` sigue siendo referencia del modelo completo; no se ejecuta sobre la aplicación para adelantar módulos.

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

`db:migrate` aplica las migraciones versionadas de `backend/prisma/migrations/` mediante `prisma migrate deploy`. Puede repetirse; no reinicia ni vacía la base. Las migraciones crean identidad, permisos, sesiones y auditoría, junto con los maestros y relaciones de M02/M03, componentes individuales, proveedores y catálogo. Para actualizar una instalación existente, generar el cliente Prisma y aplicar las migraciones antes de iniciar el nuevo backend.

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

Las relaciones del vehículo distinguen **titular** y **contacto**, con inicio y fin de vigencia. Un cambio de titular cierra el vínculo anterior y conserva su historia; la fecha de fin es exclusiva y debe ser posterior al inicio. El **pagador** se asignará al servicio en M06: no se agrega como vínculo permanente del vehículo. Los maestros actuales no implementan ni alteran snapshots o PDF; la preservación documental completa se verificará con M08.

La tabla de configuración conserva la identidad comercial del taller y una referencia explícita al actor TdM. Los datos documentales del actor siguen siendo independientes. Las referencias de marcas/modelos de este tramo corresponden a los modelos técnicos de componentes; los vehículos conservan marca y modelo textuales según el diseño aprobado.

### Recorridos de componentes, proveedores y catálogo

Desde **Componentes**, registrar una identidad eligiendo un modelo técnico existente, su número de serie y, si se conoce, el mes y año de fabricación. Buscar por serie o referencia, recuperar coincidencias y editar los datos descriptivos. La serie conserva sus ceros iniciales; modelo y serie identifican un único componente. Registrar el componente no lo instala en ningún vehículo. La consulta de historia indica expresamente que estará disponible con la confirmación de servicios; no presenta una configuración vacía como prueba de que un vehículo carece de equipo.

Desde **Proveedores**, el administrador registra nombre, CUIT opcional y contacto, busca coincidencias y edita o desactiva el proveedor. El proveedor comercial permanece separado de PEC, CRPC y TdM. Desde **Catálogo**, puede crear y editar ofertas, precios de venta y composición, con cantidades, precios unitarios, costos y proveedores sugeridos. Las propuestas de revisión anual y quinquenal permiten preparar la composición habitual; la quinquenal incluye anual, oblea, PH y recambio de válvulas ajustable. No se precargan precios comerciales del taller.

Probar una oferta con precio y costos decimales, editar su composición y recuperarla. Luego ingresar como operador: puede consultar la oferta y sus precios de venta, pero no administrar el catálogo ni consultar proveedores o costos. La API aplica esas restricciones aunque se fabrique una petición fuera de la interfaz. Cada modificación autorizada conserva su auditoría transaccional.

Este tramo no confirma servicios, no registra instalaciones, retiros ni bajas efectivas de componentes y no crea obligaciones, cobros, pagos o saldos. La preservación de valores propios de servicios confirmados y las invariantes de configuración se verificarán junto con M06; no quedan acreditadas por las pruebas de estos maestros.

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

Crear `cilgas_e2e_test` una sola vez por arranque de la instancia efímera; si ya existe, continuar con las verificaciones. Los tests backend usan esquemas aislados dentro de `TEST_DATABASE_URL`, aplican las migraciones y eliminan únicamente el esquema que crearon. Los E2E aplican las migraciones y el bootstrap sobre la base separada `cilgas_e2e_test`, sin reiniciar ni borrar otras bases. Levantan frontend en `127.0.0.1:4173` y backend en el puerto `43001`, preparan cuentas sintéticas y comprueban acceso, permisos, configuración, referencias y recuperación de personas y vehículos con duplicados. Requieren el backend compilado con `pnpm build`; los puertos de E2E deben estar libres.

Nunca apuntar las variables de pruebas a una base de operación: la integración exige un nombre que identifique una base de prueba y los E2E aceptan exclusivamente `cilgas_e2e_test` en un host local permitido. La instancia `postgres-test` no comparte el volumen de desarrollo y sus datos se pierden al detenerla. Los reportes y las capturas de escritorio/tablet se guardan en `playwright-report/` y `test-results/`, fuera de Git.

GitHub Actions ejecuta instalación con lockfile, generación del cliente Prisma, formato, lint, tipos, pruebas, build y E2E Chromium sobre una base efímera. También construye las imágenes, aplica la migración del perfil `app` y comprueba la API detrás de Nginx en el runner. Las credenciales de CI son ficticias. El workflow tiene permisos de lectura y no despliega ni utiliza secretos productivos. React Doctor se ejecuta al cerrar cambios React con el script fijado por el repositorio.

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
