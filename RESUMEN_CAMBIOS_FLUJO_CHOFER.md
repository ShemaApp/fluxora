# Resumen de cambios: flujo ultra-rápido del chofer

## Alcance aplicado

Se incorporó una experiencia específica para usuarios con rol **repartidor** dentro del módulo existente de rutas. La modificación reutiliza la arquitectura actual de la aplicación, la colección existente de clientes, las rutas activas y el módulo de ventas offline. El flujo administrativo y la pantalla de transferencias para otros roles permanecen sin cambios funcionales.

> El flujo del repartidor queda reducido a la secuencia operativa solicitada: **seleccionar cliente → capturar despacho → elegir forma de pago y guardar**.

## Pantallas implementadas

| Pantalla | Implementación | Resultado operativo |
|---|---|---|
| **1. Lista de la zona** | Muestra la ruta activa y filtra clientes activos por zona cuando el cliente tiene zona capturada. Incluye búsqueda por nombre, ID o dirección. | Al tocar un cliente se abre directamente su carrito. Los clientes atendidos muestran un cheque verde. |
| **2. Carrito de despacho** | Presenta nombre, domicilio e ID del tinaco. El selector numérico captura garrafones y calcula automáticamente el equivalente del medidor con el factor fijo `2`. | Por ejemplo, `8` garrafones se muestran como `16` dígitos del medidor. La cantidad debe ser un entero positivo. |
| **3. Cierre de venta** | Presenta dos botones grandes: **EFECTIVO** y **CRÉDITO**. El botón final guarda la venta con la forma de pago elegida. | Efectivo se envía como cobro de caja; crédito se envía como deuda/cuenta corriente conforme a la lógica existente del módulo de ventas offline. |

## Persistencia local y operación sin conexión

El flujo usa el sistema de borradores locales ya existente mediante `appReadDraft`, `appWriteDraft` y `appClearDraft`, con el alcance `chofer-rapido` y separado por usuario. Se conservan localmente el paso actual, búsqueda, cliente seleccionado, cantidad, forma de pago y estado de atención de la ruta.

La venta se registra mediante `appGuardarVentaTransferencia`, que ya utiliza la cola offline de ventas. Si el dispositivo está sin conexión, la operación conserva el estado pendiente local y queda disponible para sincronización posterior. Después de guardar correctamente, el cliente se marca como atendido en el borrador local y la interfaz vuelve automáticamente a la lista de la zona.

## Datos utilizados sin inventar información

El nombre, dirección, ID del tinaco, zona y precio se leen de los datos disponibles del cliente o del producto configurado. Si una dirección o un ID del tinaco no existe, se muestra explícitamente **“Sin dirección”**, **“Dirección no capturada”** o **“Sin ID”** según el caso, sin crear valores ficticios. El precio unitario se toma de `cliente.precioGarrafon` cuando existe y, como alternativa, del producto configurado; si no existe precio, se muestra `$0.00` en lugar de suponer un importe.

## Archivo modificado

| Archivo | Cambio |
|---|---|
| `ruta.js` | Se agregó `FlujoChoferRapido` y se conectó exclusivamente para el rol `repartidor`. Se reutilizaron las funciones globales existentes de ventas y borradores offline. |
| `RESUMEN_CAMBIOS_FLUJO_CHOFER.md` | Este documento. |

No se modificaron `app-core.js`, `ventas-offline.js`, Firebase, reglas de Firestore ni la estructura de datos existente.

## Validaciones realizadas

Se ejecutó comprobación sintáctica con Node.js sobre todos los archivos JavaScript del proyecto, incluyendo `ruta.js`, `hooks/useSesion.js` y los módulos de `db/`. También se verificó en el código la presencia de los tres pasos, el factor de medidor `2`, la escritura y limpieza del borrador local, el manejo de las formas de pago y el marcado de clientes atendidos.

## Uso esperado

El usuario debe entrar con un perfil de repartidor y tener una ruta activa asignada. En la lista, busca o toca al cliente; en el carrito captura la cantidad; presiona **Surtir**; elige **EFECTIVO** o **CRÉDITO**; y finalmente presiona **Guardar y volver a la ruta**. La pantalla queda lista para el siguiente domicilio.
