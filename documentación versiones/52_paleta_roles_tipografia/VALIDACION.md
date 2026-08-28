# Validación — Paleta por rol y tipografía desktop

## Alcance

Esta iteración modifica únicamente la presentación visual. No se realizaron cambios en handlers, estados de operación, rutas de navegación, permisos de Firestore, colecciones ni fórmulas del medidor.

## Pruebas ejecutadas

| Prueba | Resultado |
|---|---|
| `node --check app.js` | Aprobada. |
| `node --check sw.js` | Aprobada. |
| `node --check busqueda-global.js` | Aprobada. |
| Variables de paleta y clases visuales | Aprobadas: `app-shell-admin`, `app-shell-repartidor`, azul marino, turquesa y azul agua presentes. |
| Service worker | Aprobado: `v1.6.21`. |
| `git diff --check` | Aprobado. |
| Login en origen local fresco | Visible correctamente y sin buscador global. |
| Alcance del buscador en login | `loginGlobalSearchCount: 0`. |
| Panel de prueba ADMIN | Rail `#082A4D`, acento `#0E988A`, información `#0798C8`. |
| Panel de prueba REPARTIDOR | Rail `#0C5D6A`, acento `#0E988A`, información `#0798C8`. |
| Legibilidad desktop a 1280 px | Cuerpo 500, controles 15 px, etiquetas 14 px, campos 46 px mínimos, botones 700 y 44 px mínimos. |
| Service worker anterior en origen local | Desregistrado únicamente para evitar caché durante la prueba. |

## Observación sobre el entorno de prueba

La validación del contexto autenticado se realizó mediante un panel visual aislado con las mismas clases de shell que genera `app.js`, usando el viewport CSS real de 1280 px. No se escribieron datos en Firestore ni se ejecutaron ventas, cargas, cierres o cambios de configuración.

La diferencia de color por rol se limita a la navegación estructural: ADMIN usa azul marino para comunicar control administrativo y REPARTIDOR usa turquesa petróleo para una lectura más operativa. Las acciones primarias y los datos de medición conservan tokens comunes para no fragmentar la identidad de FLUXORA.

## Estado de publicación

El cambio está aplicado en el worktree local. No se hizo commit, push ni despliegue de GitHub Pages en esta iteración. El service worker fue incrementado localmente a `v1.6.21` para que el cambio de estilos fuerce renovación de caché cuando se publique.

La matriz local pendiente de la versión 45, su revisión técnica y las reglas Firestore de la versión 51 permanecen fuera de esta iteración.
