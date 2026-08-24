# Depuración de interfaz del REPARTIDOR — v1.5.0

## Alcance

Esta iteración separa la experiencia visible del REPARTIDOR de las funciones genéricas y administrativas que todavía existen en el proyecto. El objetivo es de navegación y presentación por rol: no se eliminaron archivos, colecciones ni funciones de negocio.

El REPARTIDOR queda orientado al flujo:

> Iniciar jornada → usar la asignación de vehículo y medidor → registrar carga en litros → capturar lectura física inicial → abrir Mi ruta → seleccionar cliente → capturar cantidad comercial → calcular litros e incremento lógico → registrar efectivo o crédito → continuar → capturar lectura física final → conciliar y cerrar jornada.

## Cambios realizados

En `app.js`, el REPARTIDOR ahora recibe una lista de navegación exclusiva con `Inicio`, `Mi Ruta` y `Mi Jornada`. Se ocultaron las pestañas de créditos independientes, venta administrativa, clientes, repartidores/cargas, productos, inventario, reportes, caja, asignaciones y privacidad. La configuración administrativa solo puede abrirse desde el control de ADMIN; el REPARTIDOR conserva una salida directa de sesión en el encabezado. La campana de transferencias también quedó visible únicamente para ADMIN.

En `sesion.js`, las capacidades estructurales del REPARTIDOR quedaron alineadas con ese menú. El registro de crédito sigue perteneciendo a la venta de ruta mediante el botón `CRÉDITO`, pero no aparece como módulo independiente. Los valores de permisos de ADMIN no se modificaron.

En `dashboard.js`, el inicio del REPARTIDOR dejó de mostrar herramientas de venta rápida, transferencias, corte administrativo o identificación por QR. Ahora muestra el estado de jornada, localidad, vehículo y medidor, junto con litros cargados, litros vendidos, litros disponibles, garrafones vendidos y medidor lógico acumulado. Los registros pendientes existentes en IndexedDB se consideran para que el resumen no pierda continuidad mientras el dispositivo está offline.

En `ruta.js`, el flujo rápido conserva el carrito, el cálculo automático por tarifa, el bloqueo de sobreventa, el pago efectivo/crédito y el guardado offline. Se agregaron al bloque permanente de la ruta los mismos indicadores operativos y se distinguió expresamente que la lectura física se captura al cierre, mientras que la lectura lógica se calcula durante las ventas. La rama heredada de transferencias permanece en el archivo para ADMIN y no se borró.

## Qué no cambió

No se modificó el cálculo de litros, el incremento del medidor, el snapshot de tarifa, la transacción de ventas, la cola offline, el vínculo `jornadaId`, el vínculo `vehiculoId`, el vínculo `medidorId`, el vínculo `localidadId` ni la conciliación de lectura física final. Tampoco se eliminaron `pedidos.js`, la rama administrativa de `ruta.js`, las colecciones de pedidos o las suscripciones existentes; quedan pendientes de decisión después de observar el comportamiento en pruebas.

## Candidatos de código fuera del flujo del REPARTIDOR

| Área | Ubicación | Estado en esta iteración | Motivo para una revisión posterior |
|---|---|---|---|
| Venta administrativa y Nuevo pedido | `pedidos.js`, rama `nota` de `app.js` | Conservado y oculto al REPARTIDOR | Es una operación administrativa o previa a transferencia, no una venta de agua medida del chofer. |
| Venta rápida de almacén | `pedidos.js`, `Dashboard` ADMIN | Conservado y oculto al REPARTIDOR | Descuenta inventario de almacén y no sigue la apertura/cierre del medidor. |
| Transferencias, QR y escáner | Rama administrativa de `ruta.js` y funciones relacionadas | Conservado y oculto al REPARTIDOR | Pertenece a la gestión de cargas o a legado logístico; no se debe borrar hasta auditar dependencias administrativas. |
| Inventario general | `productos.js`, `inventario` de `app.js` | Conservado y oculto al REPARTIDOR | ADMIN lo conserva para productos, cargas y existencias; no debe aparecer como inventario genérico en la operación del chofer. |
| Créditos como pantalla separada | `creditos.js`, pestaña `creditos` | Conservado para ADMIN y oculto al REPARTIDOR | El crédito del REPARTIDOR se registra como forma de pago de una venta, no como módulo autónomo dentro de la ruta. |
| Avisos de transferencias y pedidos | `hooks/useSesion.js` | Suscripción conservada; aviso oculto al REPARTIDOR | Se requiere una decisión posterior para retirar la consulta si ninguna operación futura la necesita. |
| Permisos editables del REPARTIDOR | `permisos.js` | Conservado como administración | El control de permisos pertenece a ADMIN; sus valores estructurales se fuerzan desde `sesion.js`. |

## Reversión

Para revertir únicamente la presentación, restaurar los commits de esta iteración en orden inverso o deshacer los cambios de `app.js`, `dashboard.js`, `ruta.js` y `sesion.js`. No es necesario restaurar datos de Firestore porque esta iteración no modifica el esquema ni escribe campos nuevos por sí misma.
