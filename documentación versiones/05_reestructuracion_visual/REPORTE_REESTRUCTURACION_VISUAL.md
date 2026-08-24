# FLUXORA — Reporte de reestructuración visual

## Alcance de esta iteración

Se inició la reestructuración visual de FLUXORA siguiendo la presentación aprobada y el archivo `pantallas.md`. El objetivo de esta iteración es cambiar **cómo se ve** la aplicación sin modificar **cómo funciona**.

> No se modificaron cálculos, consultas, eventos, callbacks, autenticación, persistencia offline, Firebase, permisos, reglas de Firestore ni decisiones de negocio.

## Cambios visuales realizados

| Área | Cambio |
|---|---|
| Identidad | Se agregaron `assets/brand/fluxora-logo.svg` y `assets/brand/fluxora-logo.png` como activos de marca dentro del proyecto. |
| Login | Se sustituyó el emblema provisional por el logotipo FLUXORA. Se aplicó una composición azul marino con textura técnica, panel claro, acento cyan y pie visual de derechos reservados 2026–2029. |
| Capa compartida | Se creó `visual-fluxora.css` con tokens cromáticos, textura de fondo, navegación, tarjetas, botones, campos, etiquetas, modales, métricas y responsive. |
| Primitivas | Se añadieron clases de presentación a `Card`, `BFill`, `BOut`, `Inp`, `Lbl`, `Row`, `Tag` y `Toggle`. Solo sirven para aplicar CSS; no cambian sus props ni callbacks. |
| Inicio | Se marcaron visualmente el contenedor de Inicio y sus métricas para aplicar una jerarquía técnica más clara. |
| Configuración | Se marcó visualmente el contenedor de Configuración para aplicar el tratamiento de encabezado y pestañas de la referencia. |
| Jornada / conciliación | Se marcaron las vistas operativas de repartidor y administrativa para aplicar tratamiento de lectura, carga de agua, cierre y conciliación. |
| Ruta / carrito | Se marcó el flujo de ruta para reforzar visualmente la lista de clientes, el carrito de despacho, la tarifa de venta y la selección de pago. |
| Login | Se ocultó visualmente el bloque existente de enlaces de privacidad/confidencialidad para respetar la composición solicitada de solo correo, contraseña y acceso. El contenido no fue eliminado. |
| PWA | Se actualizó la precaché visual a `v5-identidad-visual` para incluir el CSS y los activos de marca. Esto solo garantiza disponibilidad visual offline. |
| Metadata | Se actualizó el título del documento y el nombre corto de la PWA a FLUXORA. |

## Archivos tocados

Los cambios de código se limitaron a:

- `index.html`: hoja visual, título y metadata visual.
- `visual-fluxora.css`: nueva capa de presentación.
- `app-core.js`: clases visuales en primitivas compartidas.
- `auth.js`: clase visual del login y referencia al logo, sin cambiar el handler de autenticación.
- `dashboard.js`: clases visuales del Inicio y sus métricas.
- `config.js`: clase visual del contenedor de Configuración.
- `ruta.js`: clase visual del contenedor de Ruta/Carrito.
- `jornada.js`: clases visuales de Jornada y Conciliación.
- `sw.js`: precaché de CSS y activos visuales.
- `assets/brand/fluxora-logo.svg` y `assets/brand/fluxora-logo.png`: activos visuales.

## Archivos que no se tocaron

No se modificaron `firebase-init.js`, `firestore.rules`, `ventas-offline.js`, `medicion.js`, `jerarquia.js`, `clientes.js`, `inventario.js`, `productos.js` ni los módulos de servicios de datos. Tampoco se alteraron roles, navegación lógica, fórmulas, reglas o colecciones.

## Criterios visuales aplicados

La capa utiliza Deep Navy `#063B5C`, Petroleum Blue `#075985`, Cyan `#06B6D4`, Cyan Light `#67E8F9`, Graphite `#0F172A`, Slate `#64748B`, fondo `#F8FAFC`, blanco y bordes `#E2E8F0`. Se incorporó una textura de cuadrícula técnica muy discreta y se priorizaron cifras, estados, barras de carga, botones primarios y lectura operativa.

El diseño mantiene separación visual entre ADMIN y REPARTIDOR sin introducir nuevas funciones. Los elementos que aparecen en `pantallas.md` pero cuya lógica todavía no exista deben continuar siendo tratados como decisiones de producto pendientes, no como autorización para crear comportamiento nuevo.

## Validación realizada

Se validó sintaxis de los módulos JavaScript con `node --check`, se confirmó la carga del CSS externo y de los activos de marca, y se revisó visualmente el login desde un servidor HTTP local. La aplicación mostró el logotipo, campos de correo y contraseña, botón de acceso y el pie visual exacto de derechos reservados 2026-2029. Los enlaces de privacidad/confidencialidad permanecen en el markup existente, pero ya no se muestran visualmente.

La prueba de login contra Firebase y la revisión de cada pantalla con una cuenta ADMIN o REPARTIDOR quedan para la siguiente validación visual, porque requieren credenciales de prueba y datos reales del proyecto.
