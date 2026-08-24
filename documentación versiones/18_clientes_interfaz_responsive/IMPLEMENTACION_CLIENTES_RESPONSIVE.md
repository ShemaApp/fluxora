# Implementación — Interfaz de Clientes responsive

## Objetivo

Adaptar la pantalla funcional **Clientes fijos** a la alternativa de diseño aprobada para la barra de filtros horizontales, manteniendo la lógica existente de clientes, localidades, crédito, estado, historial y permisos por rol.

La actualización es exclusivamente de presentación y usabilidad, con dos correcciones directamente relacionadas: el valor interno `LOCALIDAD_SIN_CLASIFICAR` quedó definido dentro del módulo para evitar un fallo de renderizado, y la edición conserva el estado activo o inactivo actual del cliente en lugar de activar accidentalmente un registro inactivo.

## Cambios implementados

| Área | Resultado |
|---|---|
| Búsqueda | Un campo de ancho completo con el texto `Buscar cliente o localidad…`. La búsqueda continúa evaluando nombre y localidad. |
| Barra horizontal | Tres controles desplegables en una sola fila en escritorio y tableta: `Estado`, `Crédito` y `Localidad`. Cada control muestra su etiqueta, valor, conteo y flecha. |
| Pantalla móvil | La barra conserva la disposición horizontal mediante desplazamiento lateral controlado, evitando que los filtros se amontonen o rompan el ancho de la pantalla. |
| Ficha de cliente | La ficha muestra nombre, localidad y un estado compacto `Activo` o `Inactivo`. No muestra identificación ni ID fijo del cliente. |
| Acciones | Las acciones existentes de edición, activación/desactivación e historial se conservaron. No se agregaron acciones administrativas u operativas nuevas. |
| Formulario | El formulario mantiene únicamente `Nombre` y `Localidad asignada`. La localidad se limita al catálogo activo que ya tiene repartidor asignado. |
| Caché PWA | Se incrementó el service worker de `v1.5.0` a `v1.5.1` para forzar la descarga de la nueva interfaz en dispositivos instalados. |

## Archivos modificados

| Archivo | Alcance |
|---|---|
| `clientes.js` | Reemplazo de filtros apilados por controles horizontales, estado dentro de la ficha, clases de composición responsive, preservación del estado al editar y definición del valor interno de localidad sin clasificar. |
| `visual-fluxora.css` | Estilos de la página Clientes, barra horizontal, controles desplegables, fichas, estado, acciones y reglas para móvil, tableta y escritorio. |
| `sw.js` | Actualización de `CACHE_VERSION` a `v1.5.1`; la lista de archivos precargados no cambia. |

## Lo que no cambió

No se modificaron las colecciones, las consultas de Firestore, el flujo de venta por medidor, la cola offline, la jornada, la ruta, los créditos, el historial de ventas ni la relación interna `cliente.id` utilizada para operar. El ID interno de Firestore sigue siendo necesario para persistencia y acciones, pero no se renderiza como información del cliente en esta pantalla.

Tampoco se migraron ni borraron documentos antiguos. Si una ficha histórica contiene `identificacion`, el campo no se captura ni se muestra desde esta interfaz.

## Comportamiento responsive

En pantallas de escritorio los tres filtros ocupan columnas equilibradas dentro de una barra única. En dispositivos de menor ancho, la barra mantiene una fila horizontal con controles de ancho táctil y desplazamiento lateral; de esta forma cada filtro conserva legibilidad sin comprimir las etiquetas ni provocar desbordamiento de la página. Las fichas se adaptan al ancho disponible, el nombre y la localidad usan truncado visual y las acciones pueden pasar a dos líneas cuando el espacio táctil lo requiere.

El formulario modal conserva dos campos, usa controles de ancho completo y mantiene el botón de guardado accesible en pantallas estrechas.

## Validaciones realizadas

Se ejecutó `node --check` sobre los módulos JavaScript del proyecto y `git diff --check` sin errores. Se verificó el preview autenticado en el navegador después de limpiar el service worker: la pantalla mostró el campo `Buscar cliente o localidad…`, los selectores `Estado`, `Crédito` y `Localidad`, las fichas sin ID visible y el estado `Activo` dentro de cada ficha.

También se abrió el formulario `Nuevo cliente fijo` y se confirmó que únicamente muestra `Nombre`, `Localidad asignada` y el botón de guardado. El preview mostró las localidades disponibles y no presentó errores nuevos en consola después de corregir la constante interna del filtro.

La prueba de viewport se limitó al navegador de validación disponible. La regla CSS específica para móvil quedó implementada con `@media (max-width: 767px)`, desplazamiento horizontal de filtros y controles táctiles; el navegador de validación no permitió cambiar dinámicamente su viewport mediante `window.resizeTo`.

## Diagnóstico y reversión

Si después de publicar un dispositivo sigue mostrando la barra anterior, debe cerrarse la PWA y abrirse nuevamente para que el service worker `v1.5.1` tome control. En el preview local fue necesario eliminar el caché del service worker para visualizar los archivos nuevos.

Para revertir únicamente esta iteración, se puede restaurar `clientes.js`, `visual-fluxora.css` y `sw.js` al commit anterior, o revertir el commit de esta carpeta documental. No se deben eliminar documentos de Firestore como parte de esta reversión.

## Decisiones pendientes

La adaptación visual no resuelve la generación server-side de un identificador secuencial humano. El cliente conserva el uso interno del documento Firestore y evita exponerlo en la interfaz. Si se requiere posteriormente un consecutivo administrado por backend, deberá diseñarse y desplegarse como una iteración independiente con una función o servicio autorizado; no debe implementarse dentro de este formulario estático.
