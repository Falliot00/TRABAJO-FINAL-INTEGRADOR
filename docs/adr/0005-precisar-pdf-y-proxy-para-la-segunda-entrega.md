---
status: proposed
---

# Precisar PDF y proxy para la segunda entrega

Fecha: 27/09/2026. Propuesta técnica del equipo, pendiente de la revisión de la segunda entrega.

La primera entrega dejó abierta la biblioteca de PDF y la elección entre Nginx y Caddy. Para presentar un diseño concreto se selecciona **Nginx** como servidor de la aplicación estática, proxy de la API y terminación HTTPS, y **Playwright con Chromium** como generador de PDF del lado servidor mediante una plantilla HTML/CSS versionada.

La confirmación transaccional crea el snapshot documental. El renderizado se realiza después de esa transacción, utilizando únicamente el snapshot y la versión de plantilla. Su fallo deja una generación pendiente o fallida que puede reintentarse sin duplicar el servicio, las obligaciones o los resultados técnicos. El PDF se almacena fuera del directorio público y se descarga mediante autorización del backend.

Esta decisión conserva los ADR anteriores y no incorpora microservicios ni una segunda base de datos. Permite controlar la impresión del formulario, a cambio de administrar la dependencia de Chromium, limitar concurrencia de renderizado y verificar visualmente cada versión de plantilla. La fidelidad del PDF y la configuración operativa se probarán después de la aprobación, durante la implementación; no se declaran ya verificadas.
