# Versión 40 — Roles operativos y Sincronización

## Objetivo

Ajustar la experiencia del rol `REPARTIDOR` para que vea únicamente las herramientas necesarias para operar una jornada de distribución de agua medida, y hacer visible el estado de la cola local sin convertir Firestore en la fuente primaria durante una venta.

## Qué debe ver el repartidor

La navegación del repartidor queda limitada a cuatro accesos:

| Acceso | Propósito operativo |
|---|---|
| Inicio | Resumen de la jornada activa, vehículo, medidor, litros cargados, litros vendidos, litros disponibles, garrafones vendidos y medidor lógico acumulado. |
| Operación | Lista de clientes de localidades asignadas, búsqueda, selección de cliente, cantidad comercial, cálculo automático de litros e incremento del medidor lógico, forma de pago y cierre de venta. |
| Jornadas | Inicio y cierre de jornada, asignación vigente, carga de agua, lectura física inicial, lectura física final y conciliación. |
| Sincronización | Pendientes locales, conectividad, última sincronización, acción manual y errores de sincronización. |

El repartidor no ve Clientes como módulo administrativo independiente, Cobertura, Catálogo, Inventario global, Reportes, Caja, Configuración, Permisos, vehículos de otros repartidores ni datos fuera de sus localidades autorizadas.

## Reglas de rol

La aplicación solo admite los roles funcionales `admin` y `repartidor`. Un rol distinto queda bloqueado y no recibe una tercera experiencia de usuario.

`ADMIN` conserva el acceso a la supervisión y configuración global. `REPARTIDOR` recibe un alcance fijo y operativo: no puede reactivar desde la interfaz pantallas de administración, productos, inventario, reportes, caja, créditos, clientes administrativos ni exportaciones CSV.

La pestaña `Sincronización` es una capacidad operativa obligatoria del repartidor. No aparece para ADMIN por defecto, porque el administrador revisa la información global sincronizada y no debe confundirse con la cola local del dispositivo operativo.

## Contrato local-first de una venta

Cada venta de agua medida se normaliza y se escribe primero en el object store IndexedDB existente `ventas_agua`. El registro conserva la operación completa y los campos mínimos del contrato:

| Campo | Uso |
|---|---|
| `idLocal` | Identificador local estable de la operación. |
| `syncStatus` | Estado local: `pending`, `syncing`, `error` o `synced`. |
| `createdOfflineAt` | Momento de creación del registro local. |
| `updatedOfflineAt` | Momento de la última actualización local. |
| `jornadaId` | Evita mezclar jornadas. |
| `vehiculoId` | Evita mezclar cargas y operaciones de vehículos diferentes. |
| `medidorId` | Mantiene la referencia al instrumento correcto. |
| `localidadId` | Mantiene el alcance operativo de la venta. |
| `tarifaSnapshot` | Conserva la tarifa utilizada, sin recalcular históricos. |
| `lecturaCalculadaAntes` y `lecturaCalculadaDespues` | Trazabilidad del incremento lógico sin solicitar una lectura física por cliente. |
| `aguaDisponibleAntesLitros` y `aguaDisponibleDespuesLitros` | Control del stock móvil y bloqueo de sobreventa. |

La operación local no se elimina por el solo hecho de que exista conexión. Primero se intenta conciliar mediante la transacción existente. El registro solo se elimina después de una respuesta confirmada. Los errores transitorios permanecen en IndexedDB con estado pendiente; los bloqueos de negocio quedan registrados en el historial local y no alteran ventas anteriores.

## Sincronización automática y manual

La cola se procesa automáticamente cuando el navegador informa que volvió internet y también después de una sesión autenticada. El repartidor puede iniciar el mismo proceso desde `Sincronizar ahora`. Si no hay conexión, el botón informa el estado y no intenta escribir en Firestore.

La pantalla muestra únicamente información de la cola local del usuario actual. La última sincronización y los últimos errores se conservan como estado pequeño en `localStorage`; las ventas pendientes y su detalle permanecen en IndexedDB.

## Fuera de alcance de esta versión

No se creó una segunda cola, no se añadió un servicio de backend nuevo, no se modificaron reglas remotas de Firebase y no se trasladaron automáticamente a esta cola las operaciones administrativas de catálogo, clientes, vehículos, inventario o configuración. La integración cubre la cola existente de ventas de agua medida para no alterar las invariantes de jornada, medidor y cierre.
