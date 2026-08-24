# Revisión de relación: localidad/zona → vehículo → medidor

## Conclusión ejecutiva

La interfaz del REPARTIDOR no selecciona directamente una localidad. Selecciona una **zona operativa** y esa zona determina el conjunto de clientes que puede atender. El vehículo y el medidor se resuelven desde la asignación de la zona y, cuando existe una jornada abierta, desde los snapshots de esa jornada.

La relación que actualmente consume el REPARTIDOR es:

```text
CLIENTE
  └── zonaId ───────────────┐
                             ↓
ZONA / LOCALIDAD OPERATIVA → CHOFER / REPARTIDOR
                             ↓
                       vehiculoId
                             ↓
                       medidorId
                             ↓
JORNADA ABIERTA
                             ↓
VENTA OFFLINE → LECTURA CALCULADA → CIERRE FÍSICO
```

## Cómo funciona hoy en la interfaz

| Pantalla | Fuente principal | Relación consumida |
|---|---|---|
| Jornada, selección inicial | `zonas` filtradas por `choferId` o `repartidorId` | El REPARTIDOR puede elegir únicamente una zona dentro de su alcance. |
| Jornada, después de elegir zona | `zonaId`, `vehiculoId`, `medidorId` y catálogos cargados | Se muestran vehículo y medidor asignados; ya no deben capturarse como texto en la operación. |
| Ruta del día | `ruta.zonaId` y la zona asignada | Los clientes se filtran por `cliente.zonaId`; si la ruta no tiene `zonaId`, existe un fallback histórico por nombre de zona. |
| Carrito/venta | `jornadaActiva` | La venta usa primero los IDs de la jornada y conserva nombre del vehículo y medidor como snapshot. |
| Cola offline | `jornadaId`, `vehiculoId`, `medidorId`, `localidadId` | La venta pendiente conserva el instrumento y la localidad del cliente para sincronizar después. |
| Cierre | `jornadaAbierta` y `lecturas_medidor` | La lectura final física queda ligada a la misma jornada, vehículo y medidor. |

## Localidad frente a zona

La localidad se utiliza principalmente como pertenencia administrativa del cliente y como validación de asignación. La zona es la unidad operativa que usa el REPARTIDOR para filtrar clientes. En consecuencia, la ruta no debe filtrar por nombre de localidad ni por vehículo: debe filtrar por `zonaId`, y la zona debe contener o referenciar sus localidades.

En la interfaz actual, la selección de Jornada muestra el nombre de la zona, pero no muestra de forma destacada sus localidades. En Ruta, el encabezado muestra la zona y la lista muestra clientes cuyo `zonaId` coincide. La venta conserva `localidadId` del cliente, pero el payload de venta no incluye todavía un `zonaId` explícito como snapshot propio; la venta depende de `jornadaId` para reconstruir ese contexto.

## Vehículo y medidor

El resolutor operativo busca primero un vehículo por `vehiculoId` y, como compatibilidad temporal, por nombre/código. Después resuelve el medidor por `medidorId` de la jornada, por la asociación del vehículo o por el campo heredado de la zona. Cuando los IDs están disponibles, Jornada compara el par exacto `vehiculoId` + `medidorId` para localizar jornadas abiertas y lecturas cerradas del mismo instrumento.

Al abrir una jornada, el sistema guarda `vehiculoId`, `vehiculoNombre`, `medidorId`, `medidorNombre`, `medidorDigitos` y `medidorLitrosPorIncremento`. Ruta consume esos snapshots y la venta offline vuelve a guardarlos en la venta normalizada, la nota conciliada, la lectura calculada, el crédito y la entrega.

## Lo que está correctamente separado

El nombre visible y el ID técnico se conservan por separado. El nombre permite lectura humana; el ID permite trazabilidad. La lectura física del medidor no se vuelve a pedir después de cada cliente. La venta calcula el incremento desde la tarifa y guarda la lectura calculada, mientras el cierre utiliza la lectura física final como fuente de conciliación.

La cola offline no cambia de vehículo o medidor a mitad de una jornada: las ventas utilizan el `jornadaId` y los IDs derivados de esa jornada. Los cambios posteriores del catálogo no deben reescribir los snapshots guardados.

## Riesgos o pendientes reales

| Hallazgo | Impacto | Acción recomendada |
|---|---|---|
| `jerarquia.js` todavía permite escribir `vehiculo` como texto y `medidorId` como texto. | Las zonas antiguas pueden no tener referencias reales a `vehiculos` y `medidores`. | Completar primero la administración separada de ambos catálogos y cambiar el formulario de zona a selectores. |
| El REPARTIDOR selecciona una zona, no una localidad. | Es correcto para la operación, pero la localidad no es visible como contexto principal. | Mostrar las localidades de la zona seleccionada como información de solo lectura, sin convertirlas en una segunda selección operativa. |
| Una zona puede contener simultáneamente `vehiculoId` y `medidorId` que no coincidan con la asociación del documento de vehículo. | Puede ocultar una asignación administrativa inconsistente. | Añadir una validación administrativa que impida o marque el desacuerdo antes de abrir la jornada. |
| La venta conserva `localidadId`, pero no `zonaId` como snapshot directo. | Para informes históricos, la zona debe reconstruirse desde la jornada o el cliente. | Añadir `zonaId` y `zonaNombre` al snapshot de venta en una iteración de trazabilidad, sin alterar cálculos. |
| La lectura heredada de zona se usa solo si el medidor de la zona es compatible. | Reduce el riesgo de mezclar instrumentos, pero requiere que las zonas nuevas tengan `medidorId`. | No usar `lecturaActual` de una zona sin vínculo de medidor en nuevas asignaciones. |
| Si Firebase todavía no permite leer `vehiculos` y `medidores`, el contexto utiliza los snapshots/campos heredados. | La pantalla puede mostrar un ID o fallback en lugar del nombre del catálogo. | Habilitar las reglas y los documentos administrativos cuando se autorice esa iteración; no modificar reglas en esta revisión. |

## Modelo de interfaz esperado

La pantalla del REPARTIDOR debe presentar una sola cadena operativa, sin campos libres:

```text
ZONA / LOCALIDADES (solo lectura)
          ↓
VEHÍCULO ASIGNADO (solo lectura)
ID: vehiculoId
          ↓
MEDIDOR ASOCIADO (solo lectura)
ID: medidorId · 6 dígitos · 10 L por incremento del sexto dígito
          ↓
LECTURA INICIAL FÍSICA
          ↓
CLIENTES DE zonaId
          ↓
VENTAS CON LECTURA CALCULADA
          ↓
LECTURA FINAL FÍSICA Y CONCILIACIÓN
```

## Archivos revisados

La revisión se realizó sobre `jornada.js`, `ruta.js`, `ventas-offline.js`, `referencias-operativas.js`, `hooks/useSesion.js`, `app.js`, `db/colecciones.js`, `jerarquia.js` y `clientes.js`. La implementación actual de referencias del REPARTIDOR quedó validada sintácticamente, pero los pendientes de administración de catálogos y reglas de Firebase deben resolverse antes de considerar completa la configuración ADMIN.

## Referencia documental

Este documento complementa `ACTUALIZACION_REFERENCIAS_VEHICULO_MEDIDOR.md` y `PRUEBAS_REFERENCIAS.md` dentro de esta misma carpeta de versión. La especificación operativa fuente se conserva en `00_especificacion_fuente/pantallas.md`.
