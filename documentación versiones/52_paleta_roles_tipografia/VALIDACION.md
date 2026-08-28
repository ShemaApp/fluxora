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

La iteración quedó publicada en `main` mediante el commit `3b914123959d793df76187b9638a705701101eba` con el mensaje `Apply role-based Fluxora visual palette`. Los workflows `Publicar prueba en GitHub Pages` y `pages-build-deployment` finalizaron con estado `success` para ese commit.

GitHub Pages respondió HTTP 200 para `sw.js` y `visual-fluxora.css`. El `sw.js` publicado informa `v1.6.21`, conserva `./busqueda-global.js` en el APP_SHELL y `app.js` publicado contiene las clases visuales `app-shell-admin` y `app-shell-repartidor`. La matriz local pendiente de la versión 45, su revisión técnica y las reglas Firestore de la versión 51 permanecen fuera de esta iteración.

La página de prueba está disponible en [FLUXORA](https://shemaapp.github.io/fluxora/).
