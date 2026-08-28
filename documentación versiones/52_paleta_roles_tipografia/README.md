# FLUXORA — Paleta por rol y legibilidad desktop

## Objetivo

Aplicar el lenguaje visual definido para FLUXORA con una paleta Agua técnica, diferenciando el contexto administrativo del contexto operativo del REPARTIDOR. El cambio se limita a presentación, contraste, tamaño de controles y tipografía; no crea módulos, roles, permisos, operaciones ni colecciones nuevas.

## Paleta aplicada

| Uso | ADMIN | REPARTIDOR |
|---|---|---|
| Navegación y shell | Azul marino `#082A4D` | Turquesa petróleo `#0C5D6A` |
| Acción principal | Turquesa `#0E988A` | Turquesa `#0E988A` |
| Datos de medición | Azul agua `#0798C8` | Azul agua `#0798C8` |
| Superficie | Blanco `#FFFFFF` | Blanco `#FFFFFF` |
| Fondo | `#F7FAFC` | `#F7FAFC` |
| Texto principal | `#132A3B` | `#132A3B` |

ADMIN conserva un rail azul marino para comunicar control y administración global. REPARTIDOR usa un rail turquesa más operativo, mientras que el azul agua se reserva para información de litros, medidor, disponibilidad y carga. Los estados de advertencia, error y éxito mantienen su función semántica y no se convierten en decoración.

## Botones

Los botones mantienen una forma rectangular de esquinas suaves, con radio aproximado de 8 a 10 px en los controles generales. Las acciones primarias usan fondo turquesa y texto blanco; las secundarias usan superficie blanca, borde sobrio y texto turquesa oscuro; las acciones críticas conservan una jerarquía visible sin animaciones invasivas. Se añadió una respuesta breve al estado activo y un foco visible para teclado y accesibilidad.

La altura mínima desktop de los botones principales del contenido es de 44 px. En el flujo del REPARTIDOR se conserva una dimensión táctil amplia y se mantiene la equivalencia visual entre Efectivo y Crédito.

## Tipografía

La familia existente `IBM Plex Sans` se conserva para el cuerpo y `Oswald` para títulos y marca, evitando introducir una dependencia nueva. En desktop, la escala visual se reforzó con cuerpo de 16 px, peso base 500, controles de 15 px, etiquetas de 14 px, botones con peso 700 y títulos de módulo de 22 a 32 px. Los campos de entrada alcanzan una altura mínima de 46 px.

Esta regla evita depender del zoom del navegador y mejora la lectura de datos operativos, estados, formularios y controles en pantallas de escritorio. Los datos numéricos del medidor pueden conservar su tratamiento monoespaciado cuando el componente ya lo utiliza.

## Archivos relacionados

| Archivo | Cambio |
|---|---|
| `app.js` | Añade una clase visual de shell según el rol ya existente: `app-shell-admin` o `app-shell-repartidor`. No cambia rutas ni permisos. |
| `visual-fluxora.css` | Añade tokens Agua técnica, colores por rol, estados de botones, foco visible y escala desktop. |
| `sw.js` | Incrementa el caché de `v1.6.20` a `v1.6.21`. El APP_SHELL ya contenía `busqueda-global.js`; no se agregaron nuevos scripts. |
| `documentación versiones/52_paleta_roles_tipografia/` | Registra la propuesta, validación y resultados de prueba visual. |

El buscador global sigue sin mostrarse en login porque continúa montado únicamente en la shell autenticada.
