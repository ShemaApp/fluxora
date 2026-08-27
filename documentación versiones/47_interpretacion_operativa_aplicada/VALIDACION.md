# Validación — Versión 47

## Comprobaciones realizadas

| Prueba | Resultado |
|---|---|
| Sintaxis de `ventas-offline.js` | Aprobada con `node --check`. |
| Sintaxis de `sincronizacion.js` | Aprobada con `node --check`. |
| Sintaxis de `app.js` | Aprobada con `node --check`. |
| Sintaxis de `permisos.js` | Aprobada con `node --check`. |
| Service worker `v1.6.17` | Confirmado en fuente. |
| `idLocal`, `syncStatus`, `createdOfflineAt`, `updatedOfflineAt` | Conservados en ventas y operaciones locales. |
| Operación genérica | Añadidos `operationType` y `actorUid` sin retirar los campos históricos. |
| Bloqueos | Se conservan en IndexedDB con `estado: bloqueada`, `syncStatus: blocked`, detalle e historial. |
| Borrado tras sincronización | Se mantiene únicamente después de confirmación o incidencia remota registrada. |
| Repartidor | No se reactivan pantallas administrativas ni permisos de configuración. |
| Firebase Rules | No se modifican ni despliegan en esta versión. |

## Criterios a ejecutar antes del commit

Se ejecutaron `node --check` sobre `ventas-offline.js`, `sincronizacion.js`, `app.js`, `permisos.js`, `sesion.js`, `jornada.js`, `cargas-agua.js` y `sw.js`, además de `git diff --check`, validación de referencias globales y los tres tests existentes del trigger de snapshot. La revisión estática confirmó que una operación bloqueada conserva `syncStatus: blocked`, `bloqueoDetalle` e historial, aparece en el historial de errores y no vuelve a la lista de reintentos automáticos.

## Limitaciones

Esta actualización no implementa todavía las reglas definitivas de créditos, caja, gastos, inventario, productos ni auditoría administrativa. Tampoco crea un mecanismo de aprobación previa. Esas decisiones deben convertirse en reglas de dominio antes de modificar `firestore.rules` o ampliar las operaciones.
