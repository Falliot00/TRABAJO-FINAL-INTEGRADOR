---
status: accepted
---

# Precisar PDF y proxy para la segunda entrega

Fecha de propuesta: 27/09/2026. Decisión aceptada dentro del diseño de la etapa 2 aprobada, según la devolución de Sofía Carnevale aportada por el equipo el 02/10/2026 y registrada en [APROBACION.md](../segunda-entrega/APROBACION.md). Esa fecha corresponde al registro de la devolución; la fecha exacta del mensaje no fue informada.

La primera entrega dejó abierta la biblioteca de PDF y la elección entre Nginx y Caddy. Para presentar un diseño concreto se selecciona **Nginx** como servidor de la aplicación estática, proxy de la API y terminación HTTPS, y **Playwright con Chromium** como generador de PDF del lado servidor mediante una plantilla HTML/CSS versionada.

La confirmación transaccional crea el snapshot documental. El renderizado se realiza después de esa transacción, utilizando únicamente el snapshot y la versión de plantilla. Su fallo deja una generación pendiente o fallida que puede reintentarse sin duplicar el servicio, las obligaciones o los resultados técnicos. El PDF se almacena fuera del directorio público y se descarga mediante autorización del backend.

Esta decisión conserva los ADR anteriores y no incorpora microservicios ni una segunda base de datos. Permite controlar la impresión del formulario, a cambio de administrar la dependencia de Chromium, limitar concurrencia de renderizado y verificar visualmente cada versión de plantilla. La fidelidad del PDF y la configuración operativa se probarán durante la implementación; todavía no se declaran verificadas. Los pendientes de interpretación y emisión de la ficha se validarán con CILGAS y sus responsables técnicos antes de emitir los casos afectados.
