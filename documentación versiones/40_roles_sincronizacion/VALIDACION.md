# Validación — Roles operativos y Sincronización

## Pruebas estáticas realizadas

| Verificación | Resultado |
|---|---|
| Sintaxis de `ventas-offline.js` | Correcta |
| Sintaxis de `sincronizacion.js` | Correcta |
| Sintaxis de `sesion.js`, `permisos.js` y `app.js` | Correcta |
| Todos los módulos JavaScript del proyecto | Correctos con `node --check` |
| `git diff --check` | Correcto |
| Campo `idLocal` | Creado y conservado en cada registro local |
| Campo `syncStatus` | Creado y actualizado en la cola |
| Campos `createdOfflineAt` y `updatedOfflineAt` | Creados y actualizados en la cola |
| Migración IndexedDB | No elimina el object store ni los registros existentes |
| Borrado post-sincronización | Ocurre después de `conciliar()` exitoso |
| Pestañas fijas del repartidor | `home`, `ruta`, `jornada`, `sincronizacion` |
| Pantallas administrativas para repartidor | Bloqueadas estructuralmente |
| Service worker | Actualizado a `v1.6.14` e incluye `sincronizacion.js` |

## Pruebas de navegador local

La pantalla de login local cargó correctamente después de añadir la pestaña y el módulo. La consola no mostró errores de JavaScript atribuibles a esta integración. No se introdujo una sesión Firebase falsa, por lo que la vista autenticada del repartidor debe probarse con una cuenta real de prueba.

## Casos de aceptación pendientes con usuario REPARTIDOR

1. Iniciar sesión y confirmar que el menú muestra únicamente Inicio, Operación, Jornadas y Sincronización.
2. Confirmar que no aparecen Clientes administrativo, Cobertura, Catálogo, Inventario, Reportes, Caja, Configuración ni Permisos.
3. Abrir Sincronización sin conexión y confirmar que el contador de pendientes y el estado fuera de línea son visibles.
4. Registrar una venta sin internet y confirmar que aparece un registro local con `idLocal`, `syncStatus: pending`, `createdOfflineAt` y `updatedOfflineAt`.
5. Reconectar y observar la sincronización automática.
6. Usar `Sincronizar ahora` y comprobar que se actualizan la fecha, el contador y el resultado.
7. Simular un error transitorio y confirmar que la venta permanece pendiente y que el error aparece en el historial.
8. Confirmar que una venta solo se elimina de IndexedDB después de que la operación remota sea confirmada.
9. Confirmar que una venta bloqueada por jornada, referencias o agua insuficiente no modifica ventas anteriores ni reescribe la lectura física inicial.

## Limitación declarada

La regla local-first implementada en esta iteración cubre la cola existente de ventas de agua medida. Las operaciones de configuración y administración continúan usando sus módulos actuales y no se mezclaron con la cola de ventas, para evitar introducir una segunda semántica de operaciones o romper jornada, medidor, inventario y cierre. Si se requiere que también inicio de jornada, carga, recarga o cierre nazcan en IndexedDB, debe aprobarse una iteración específica para extender el contrato de forma controlada.
