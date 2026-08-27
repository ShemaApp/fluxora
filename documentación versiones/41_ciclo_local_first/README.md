# Versión 41 — Ciclo operativo local-first

## Objetivo

Extender el local-first del repartidor a las operaciones que forman un ciclo completo de jornada: **inicio de jornada, carga inicial, recargas adicionales y cierre**. La cola sigue siendo única y reutiliza el object store IndexedDB `ventas_agua` ya existente; no se crea un segundo mecanismo de almacenamiento.

## Flujo operativo

| Momento | Registro local | Sincronización remota |
|---|---|---|
| Inicio de jornada | Jornada, carga inicial y lectura física inicial dentro de una operación `inicio_jornada`. | Crea jornada, carga inicial y lectura en una transacción. |
| Venta en ruta | Ya estaba cubierta por `venta_agua_medidor`. | Concilia venta, crédito, lectura lógica y saldo de agua atomizados. |
| Recarga | Operación `recarga_agua` con saldo anterior, litros agregados y saldo posterior. | Verifica que la jornada, vehículo, medidor y saldo sigan coincidiendo antes de aplicar el parche. |
| Cierre | Operación `cierre_jornada` con lectura física final, cálculo de litros, diferencias y resumen por tarifa. | Actualiza jornada y crea la lectura física final en una transacción. |

## Contrato de cada registro local

Todas las operaciones anteriores usan `idLocal`, `syncStatus`, `createdOfflineAt` y `updatedOfflineAt`. También conservan `jornadaId`, `vehiculoId`, `medidorId`, `localidadId`, el usuario repartidor, un identificador idempotente y el payload completo utilizado para sincronizar.

El payload de cada operación contiene los datos suficientes para reconstruir el estado sin consultar primero Firestore. Las operaciones de recarga y venta conservan parches absolutos de agua disponible y lectura lógica. El cierre conserva el resultado calculado a partir de los registros disponibles en ese momento; no vuelve a calcular ni modifica ventas históricas al sincronizarse.

## Orden y continuidad

El sincronizador procesa los registros pendientes en orden de creación. La apertura debe llegar antes que las recargas, ventas y cierre. Cada transacción remota verifica las referencias de repartidor, localidad, vehículo y medidor. También verifica el saldo de agua anterior para impedir que una recarga o venta local aplique sobre un estado remoto diferente.

La proyección local permite continuar la jornada antes de que Firestore confirme la operación. Si una operación queda pendiente, la interfaz de Jornada usa el snapshot local para mostrar la jornada, el saldo y el medidor lógico. Los indicadores de ventas solo cuentan registros de tipo `venta_agua_medidor`; inicio, recargas y cierre no se contabilizan como ventas.

## Estados y borrado

`pending` indica que la operación está guardada localmente y espera sincronización. `syncing` indica que el proceso la está intentando enviar. `error` queda asociado a un registro que requiere revisión o a un error no transitorio. Las operaciones exitosas se eliminan de la cola solamente después de que la transacción remota termina correctamente. Una recarga o cierre bloqueado por continuidad, jornada cerrada o referencias incompatibles no reescribe el origen y queda reportado en el historial visible de Sincronización.

## Alcance deliberadamente conservado

Esta versión cubre inicio de jornada, carga inicial, recargas adicionales, ventas de agua medida y cierre. El flujo independiente `relleno_por_medicion`, que además genera firma, nota y PDF en Storage, conserva su implementación actual para no mezclar su documento comercial con la cola de jornada sin una decisión específica. La administración de clientes, vehículos, medidores, catálogo, inventario, caja y configuración también conserva sus módulos actuales.
