# Validación de carga de gestión de flota

La primera comprobación del navegador encontró que el service worker local estaba sirviendo un `index.html` anterior: la lista de scripts no contenía `gestion-flota.js`, aunque el servidor HTTP sí entregaba el archivo nuevo y la validación por `curl` era correcta.

El hallazgo correspondía a caché local del navegador, no a un error de sintaxis ni a la ausencia del archivo. Después de limpiar el registro del service worker y las cachés locales, la PWA recargó correctamente la pantalla de acceso. La vista ADMIN de flota requiere una sesión ADMIN para comprobarse visualmente; el módulo queda cargado por `index.html` y validado por sintaxis y entrega HTTP.
