# Versión 42 — Backlog pendiente de FLUXORA

## Estado de referencia

El repositorio parte de la versión `v1.6.15`, con local-first implementado para inicio de jornada, carga inicial, recargas, ventas de agua medida y cierre. La cola actual vive en el object store IndexedDB `ventas_agua`, mantiene `idLocal`, `syncStatus`, `createdOfflineAt` y `updatedOfflineAt`, y ya tiene Sincronización manual y automática. Esta versión es un **inventario de pendientes**; no agrega código por sí misma.

## Pendientes técnicos de resiliencia

| Prioridad | Pendiente | Situación actual | Dependencia principal | Criterio de terminado |
|---|---|---|---|---|
| Alta | Catálogo operativo local completo | La interfaz consume catálogos remotos y la jornada usa snapshots locales de sus referencias; todavía no existe un catálogo local versionado completo. | Contrato de datos y política de vigencia. | El repartidor puede abrir su jornada con localidades, clientes fijos, vehículo, medidor, tarifas y productos necesarios desde una copia local validada, sin convertir datos administrativos en operaciones pendientes. |
| Alta | Sincronización genérica de operaciones | La cola admite ventas, inicio, recargas y cierre mediante tipos definidos; todavía no es un motor genérico basado en registro de handlers. | Catálogo local y envelope único de operación. | Una sola cola procesa operaciones tipadas sin lógica específica de “ventas”, conserva el payload, dependencias, resultado remoto y errores por operación. |
| Alta | Orden y dependencias de sincronización | El procesamiento actual respeta el orden de creación, pero las dependencias todavía no están expresadas como grafo o requisito verificable. | Motor genérico. | Una venta no se procesa antes de su apertura; una recarga no antes de la jornada; un cierre no antes de ventas y recargas que le correspondan; una dependencia bloqueada no se pierde ni se salta silenciosamente. |
| Alta | Recuperación ante cierre inesperado del navegador | IndexedDB conserva operaciones confirmadas localmente; falta probar y endurecer la recuperación de estados `syncing` que queden interrumpidos. | Estados persistidos y reanudación idempotente. | Al reabrir la PWA, ningún registro queda perdido en `syncing`; se normaliza a reintento seguro, se reconstruye la jornada local y se conserva el borrador operativo. |
| Alta | Actualización de PWA con operaciones pendientes | El service worker versiona la caché y la cola sobrevive a la actualización; falta una prueba específica de actualización durante operaciones pendientes. | Recuperación y política de actualización. | Una actualización no elimina la cola, no cambia el contrato sin migración y no impide sincronizar registros creados con la versión anterior. |
| Alta | Prueba de cinco jornadas acumuladas | Existen filtros por `jornadaId`; falta una prueba de volumen temporal con cinco jornadas del mismo repartidor y vehículo o de vehículos distintos. | Catálogo local y aislamiento de contexto. | Los indicadores, saldos, cierres, lecturas, recargas y errores nunca se mezclan entre las cinco jornadas. |
| Alta | Prueba de conexión intermitente | Existe reintento al recuperar internet; falta probar cortes repetidos entre apertura, carga, venta, recarga y cierre. | Orden y recuperación. | Cada operación queda una sola vez, conserva su estado y se reanuda después de varios ciclos online/offline. |
| Alta | Prueba de sincronización parcial | La cola conserva errores transitorios; falta verificar que operaciones anteriores puedan confirmarse aunque una posterior falle. | Dependencias explícitas y conflictos. | Las operaciones confirmadas se eliminan solo después de confirmación, las posteriores permanecen pendientes y el historial explica el punto de interrupción. |
| Alta | Control de conflictos | Ya existen bloqueos por saldo, referencias y jornada cerrada; falta una política unificada para duplicados, cierre concurrente, catálogo desactualizado y operaciones de otro dispositivo. | Motor genérico y reglas de dominio. | Cada conflicto tiene clasificación, resolución determinista, evidencia local y no sobrescribe silenciosamente datos operativos o históricos. |
| Media | Indicador por jornada | Sincronización muestra el total del repartidor; el contexto de jornada se proyecta localmente, pero falta un indicador dedicado por `jornadaId`. | Operaciones genéricas y aislamiento por jornada. | En la pantalla Jornada y en Sincronización se ve qué registros pendientes, errores y última sincronización corresponden a la jornada activa. |

## Dependencia recomendada del bloque técnico

```text
Catálogo operativo local
        ↓
Envelope genérico de operación
        ↓
Dependencias y orden de sincronización
        ↓
Recuperación ante cierre inesperado
        ↓
Actualización segura de PWA
        ↓
Pruebas de cinco jornadas, conexión intermitente y sincronización parcial
        ↓
Control de conflictos e indicador por jornada
```

El catálogo local debe distinguir entre **datos de referencia** y **operaciones**. Localidades, clientes, vehículos, medidores, tarifas y productos pueden ser copias de lectura con versión y fecha de actualización; iniciar jornada, cargar, recargar, vender y cerrar son operaciones que deben tener `idLocal` y pasar por la cola. No se debe crear una segunda cola ni guardar una copia mutable de la administración como si fuera una operación.

## Pendientes de prioridad alta del dominio

| Prioridad | Pendiente | Decisión que debe quedar definida antes del código | Resultado esperado |
|---|---|---|---|
| Alta | Escalamiento de roles | Definir si significa jerarquía de permisos dentro de `ADMIN` y `REPARTIDOR`, delegación temporal o un tercer rol futuro. El contexto rector prohíbe implementar ahora ese tercer rol. | Matriz de capacidades por acción, sin reactivar `usuario` ni crear una experiencia adicional no aprobada. |
| Alta | Reglas de créditos | Definir cuándo nace el saldo, cómo se registran abonos, qué usuario puede cobrarlos, cómo se bloquea una cuenta y cómo se resuelven ventas o abonos offline. | Crédito separado de efectivo recibido, historial inmutable, saldo derivado y snapshot de la venta original. |
| Alta | Reglas de caja | Definir cierres múltiples, efectivo esperado, pagos de crédito, salidas autorizadas, borradores, confirmación y reapertura operativa. | Cada cierre tiene folio, jornada o periodo, movimientos incluidos, diferencias y estado; cerrar dos veces no duplica el movimiento. |
| Alta | Reglas de gastos | Definir tipos autorizados, relación con jornada o caja, monto, comprobante, usuario, aprobación, edición y cancelación. | Los gastos no se confunden con recargas, inventario ni ventas y se auditan como movimientos independientes. |
| Alta | Reglas de inventario | Separar agua a granel de productos comerciales; definir cargas, recargas, consumos, existencias, transferencias y ajustes autorizados. | El agua se controla por litros, tanque, medidor y conciliación; los productos convencionales por existencia, entradas y salidas. |
| Alta | Reglas de productos | Definir alta, baja lógica, unidad comercial, tarifa, litros, incremento del medidor, precio, vigencia y snapshot histórico. | El precio nunca modifica el medidor; una venta conserva la tarifa usada y los históricos no se recalculan con la configuración vigente. |
| Alta | Auditoría de cambios administrativos | Definir qué cambios se auditan, quién puede realizarlos, motivo, antes/después, fecha, origen y si se permite corrección compensatoria. | Cambios de clientes, localidades, asignaciones, vehículos, medidores, tarifas, productos, inventario, caja y permisos quedan rastreables sin sobrescribir el historial. |

## Orden recomendado para la prioridad alta

La primera definición debe ser la **matriz de roles y acciones**, sin crear un tercer rol. Después deben fijarse las reglas de productos e inventario porque alimentan el cálculo de agua, las cargas y la conciliación. Luego se definen créditos, caja y gastos, que consumen ventas y movimientos de inventario. La auditoría administrativa debe acompañar cada una de esas operaciones y no añadirse al final como una pantalla aislada.

```text
Matriz de roles y acciones
        ↓
Productos y tarifas
        ↓
Inventario de agua y productos
        ↓
Créditos
        ↓
Caja y cierres
        ↓
Gastos
        ↓
Auditoría administrativa transversal
```

## Fuera de alcance hasta nueva aprobación

No se debe crear un tercer rol, convertir `usuario` en rol comodín, agregar mapas, GPS, tracking, rutas geográficas, QR, WhatsApp operativo, otra cola IndexedDB, recalculado histórico con la configuración actual ni despliegue automático de reglas Firebase. El flujo `relleno_por_medicion` con firma, nota y PDF continúa separado hasta que se defina expresamente su incorporación al motor genérico.

## Próxima iteración propuesta

La siguiente iteración debería comenzar por el **catálogo operativo local y el envelope genérico de operaciones**, y producir primero pruebas de orden, recuperación y sincronización parcial antes de modificar créditos, caja o gastos. La implementación de las reglas de dominio debe esperar a que el usuario confirme las decisiones de la matriz de roles, los estados de crédito, el alcance de caja y el tratamiento de gastos.
