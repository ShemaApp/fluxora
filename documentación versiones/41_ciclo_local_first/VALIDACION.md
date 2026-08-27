# Validación — Ciclo operativo local-first

## Verificaciones estáticas

| Verificación | Resultado esperado |
|---|---|
| `jornada.js` | El inicio y cierre llaman a `appGuardarOperacionLocal`; no ejecutan directamente `runTransaction` ni `batch.commit`. |
| `cargas-agua.js` | La carga y la recarga se escriben mediante `appGuardarOperacionLocal`; conserva el límite de capacidad y el saldo anterior. |
| `ventas-offline.js` | La única cola IndexedDB admite `inicio_jornada`, `recarga_agua`, `cierre_jornada` y `venta_agua_medidor`. |
| Metadatos locales | Cada operación contiene `idLocal`, `syncStatus`, `createdOfflineAt` y `updatedOfflineAt`. |
| Sincronización | Se procesan operaciones pendientes en orden de creación y se eliminan solo después de confirmación remota. |
| Continuidad | Se validan `jornadaId`, `localidadId`, `vehiculoId`, `medidorId`, repartidor y saldo de agua antes de aplicar cambios. |
| Lectura física | Solo se captura en apertura y cierre; ventas y recargas no reescriben la lectura física inicial. |
| Indicadores de venta | Inicio, carga, recarga y cierre no se cuentan como litros o garrafones vendidos. |
| Service worker | Actualizado a `v1.6.15`; `ventas-offline.js`, `jornada.js` y `cargas-agua.js` ya forman parte de la precaché existente. |

## Casos de aceptación en navegador

1. Con el repartidor sin conexión, iniciar una jornada y confirmar que la interfaz muestra la jornada local, el vehículo, el medidor, la carga y la lectura inicial sin esperar a Firestore.
2. Con la jornada local pendiente, registrar una recarga adicional y confirmar que el saldo disponible aumenta localmente sin cambiar la lectura física ni la lectura lógica.
3. Registrar una venta sin conexión y confirmar que el saldo disminuye, la lectura lógica aumenta y la venta permanece en la misma cola.
4. Cerrar la jornada sin conexión y confirmar que la lectura final física, la conciliación y la diferencia se guardan como operación local.
5. Abrir Sincronización y confirmar que el contador reúne apertura, recarga, ventas y cierre pendientes, no solamente ventas.
6. Reconectar y verificar que las operaciones se envían en orden: apertura, carga o recarga, ventas y cierre.
7. Simular un cambio remoto de saldo o referencias y confirmar que la operación incompatible se bloquea, se reporta y no sobrescribe la jornada remota.
8. Confirmar que al finalizar correctamente cada transacción la operación correspondiente desaparece de IndexedDB y que los datos históricos ya sincronizados no se recalculan.
9. Confirmar que el cierre genera el snapshot administrativo existente únicamente cuando Firebase Functions esté desplegada y la transición remota sea `abierta` a `cerrada`.

## Limitaciones conocidas

La validación automatizada local puede comprobar sintaxis, contrato, orden y presencia de rutas de código, pero no puede sustituir una prueba con Firebase real, dos estados concurrentes de dispositivo ni una sesión autenticada de repartidor. Tampoco se debe interpretar la persistencia del navegador como protección contra borrado explícito, desinstalación o pérdida del dispositivo.

El flujo `relleno_por_medicion`, que genera firma, nota y PDF en Storage, no se incorporó a esta cola en esta iteración. Mantiene su lógica separada para no mezclar un documento comercial con el ciclo de carga y cierre del vehículo.
