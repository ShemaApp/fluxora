# Versión 47 — Interpretación operativa aplicada

## Alcance

Esta versión aterriza en el código las reglas aprobadas de la Matriz de Interpretación Operativa y Ambigüedades. Se actualizan únicamente los archivos relacionados con permisos visibles, cola local-first, estados de sincronización, conflictos e indicador por jornada.

No se agregan roles, módulos de negocio ni reglas Firebase nuevas. Se conservan únicamente `ADMIN` y `REPARTIDOR`; `usuario` continúa fuera del modelo y el tercer rol futuro no se implementa.

## Cambios aplicados

| Área | Actualización |
|---|---|
| Cola IndexedDB | La única cola conserva operaciones de ventas y del ciclo de jornada, con `operationType`, `actorUid`, `idLocal`, estado, fechas, payload y referencias de alcance. |
| Conflictos | Un bloqueo de negocio ya no se elimina al fallar. Se conserva localmente como `estado: bloqueada`, `syncStatus: blocked`, detalle, error e historial de intentos. |
| Historial | Los errores y bloqueos incluyen `operacionId`, tipo de operación, `idLocal`, jornada y detalle de causa. Los alias de venta existentes se mantienen para compatibilidad. |
| Sincronización | Se agregan alias genéricos para resumen, suscripción, sincronización y operaciones pendientes por jornada sin crear una segunda cola. |
| Pantalla Sincronización | Muestra operaciones genéricas, agrupación por jornada, tipos de operación, pendientes, incidencias, última sincronización y errores. |
| Banner global | Cambia el lenguaje de “ventas” o “cambios” a “operaciones” para representar inicio, carga, recarga, venta y cierre. |
| Administración de permisos | La explicación diferencia acceso de pantalla, edición administrativa y aprobación previa; no convierte la jornada normal en una operación dependiente de ADMIN. |
| PWA | Service worker actualizado a `v1.6.17`; los módulos existentes ya forman parte de `APP_SHELL`. |

## Reglas preservadas

Las operaciones normales siguen siendo local-first. El repartidor puede continuar su jornada dentro de su alcance, incluso sin conexión. La aprobación administrativa queda reservada para excepciones, ajustes, correcciones, cancelaciones posteriores, conflictos y operaciones administrativas que se definan explícitamente.

Los registros confirmados no se sobrescriben ni se borran físicamente. Las diferencias de saldo, medidor, inventario o caja se resuelven mediante operación compensatoria o corrección auditada cuando esas reglas de dominio sean implementadas.

La cola elimina un registro solo después de la confirmación remota. Un error transitorio permanece reintentable; un bloqueo o conflicto queda conservado para revisión y no vuelve a enviarse automáticamente hasta que exista una resolución definida.

## Archivos relacionados

- `ventas-offline.js`
- `sincronizacion.js`
- `app.js`
- `permisos.js`
- `sw.js`
- `documentación versiones/47_interpretacion_operativa_aplicada/`

`jornada.js` y `cargas-agua.js` no requirieron cambios en esta iteración porque ya delegaban inicio, carga y recarga al contrato local-first existente. `firestore.rules` tampoco se modificó: las restricciones definitivas permanecen pendientes de aprobación y no se despliegan automáticamente.
