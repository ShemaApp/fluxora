# Clientes y localidades independientes

## Objetivo

Corregir el flujo administrativo de Clientes para que ADMIN pueda seleccionar cualquier localidad activa existente del catálogo, aunque todavía no tenga repartidor asignado, y pueda crear una nueva localidad desde el mismo módulo.

## Cambios aplicados

La ficha de cliente ya no limita el selector de ADMIN a localidades con `repartidorId`. ADMIN recibe todas las localidades activas entregadas por el catálogo de Firestore. El REPARTIDOR conserva su alcance restringido a las localidades que le corresponden.

La etiqueta del campo pasó de **Localidad asignada** a **Localidad**, porque la asignación pertenece al flujo administrativo de Cobertura y no debe bloquear la creación del cliente. Si la localidad seleccionada ya tiene repartidor, la ficha lo informa; si aún no lo tiene, muestra que queda pendiente de asignación.

El encabezado de Clientes incorpora dos acciones para ADMIN:

```text
+ Nuevo cliente    + Nueva localidad
```

`+ Nueva localidad` abre un formulario compacto que solicita únicamente el nombre. Al guardar, crea un documento en `COLECCIONES.LOCALIDADES` con `activo: true` y metadatos de creación. No escribe `repartidorId`, `vehiculoId` ni `medidorId`; por lo tanto, la localidad queda disponible en el catálogo y pendiente de asignación posterior desde Cobertura.

## Reglas preservadas

La corrección no cambia IDs internos, navegación, permisos, clientes existentes, tarifas, ventas, créditos, jornadas, medidor, inventario, caja, conciliación, almacenamiento offline ni reglas remotas.

El guardado del cliente continúa exigiendo nombre, localidad existente y tarifa activa. Para REPARTIDOR, la localidad debe pertenecer a su alcance operativo. Para ADMIN, la localidad puede estar pendiente de asignación porque ADMIN gestiona el catálogo y la asignación se realiza posteriormente en Cobertura.

No se añadió asignación automática. La nueva localidad no se vincula con ningún repartidor, vehículo o medidor desde Clientes.

## Validación esperada

| Caso | Resultado |
|---|---|
| ADMIN crea cliente con localidad asignada | Permitido |
| ADMIN crea cliente con localidad activa pendiente | Permitido; se muestra pendiente de asignación |
| ADMIN crea localidad nueva | Se agrega solo al catálogo de localidades |
| Nueva localidad con el mismo nombre activo | Rechazada como duplicada |
| REPARTIDOR intenta usar localidad fuera de su alcance | Rechazado |
| Cliente sin localidad | Rechazado |
| Cliente con tarifa inexistente o inactiva | Rechazado |
| Nueva localidad | No recibe repartidor, vehículo ni medidor automáticamente |

## Archivos modificados

- `clientes.js`: catálogo completo para ADMIN, selector de localidad, alta independiente de localidad y acciones del encabezado.
- `visual-fluxora.css`: disposición responsive de las acciones y estilo del modal de nueva localidad.

## Alcance fuera de esta corrección

La asignación de localidad a repartidor, vehículo y medidor continúa perteneciendo a Cobertura y no se replica en el formulario de Clientes. Esta corrección solo permite preparar el catálogo y vincular después el cliente con una localidad existente.
