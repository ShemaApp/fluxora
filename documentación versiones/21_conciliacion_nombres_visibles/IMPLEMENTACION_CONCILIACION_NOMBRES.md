# Corrección — Nombres visibles en conciliación y reportes

## Alcance

La pantalla y la exportación de reportes ya no muestran UID, hashes, firmas ni IDs internos como valores visibles de localidad o jornada. Los identificadores de Firestore continúan utilizándose internamente para resolver relaciones y no se eliminaron de los datos operativos.

## Resolución visible

`reportes.js` recibe el catálogo de `localidades` que ya entrega `app.js`. Para cada venta o jornada, el reporte busca la localidad mediante `localidadId` y presenta el campo humano `nombre` del catálogo. Si un registro antiguo contiene un valor técnico en `localidadNombre`, se usa el nombre del catálogo; si no existe un nombre resoluble, se muestra `Localidad no disponible` en lugar del identificador.

La jornada visible utiliza un nombre humano guardado cuando existe. En ausencia de ese nombre, se construye una etiqueta con la fecha, por ejemplo `Jornada 24/8/2026`. Nunca se usa `jornadaId`, un código técnico o un hash como respaldo visible.

## Exportaciones

La hoja `Ventas` de Excel y el CSV utilizan los siguientes valores visibles: nombre del cliente, nombre real de localidad, etiqueta humana de jornada, nombre del vehículo, nombre del medidor, tarifa, unidades, litros, precio unitario, subtotal y forma de pago. La hoja `Conciliación` también incluye localidad, jornada, repartidor, vehículo y medidor con valores humanos.

La exportación no cambia la operación de las ventas, la conciliación, la lectura física, el medidor lógico ni el almacenamiento interno. Solo cambia la representación visible y exportada.

## Compatibilidad

Los registros históricos que ya tengan `localidadNombre` legible continúan mostrando ese dato. Los registros con solo `localidadId` se resuelven contra el catálogo actual. Si una localidad histórica ya no existe en el catálogo, no se inventa un nombre: se muestra `Localidad no disponible`.

## Validaciones

Se validó la sintaxis de todos los módulos JavaScript, el formato del repositorio, la resolución localidad → vehículo → medidor, la exportación CSV y la ausencia de los valores técnicos de localidad, jornada, vehículo y medidor en el CSV generado. Los identificadores internos permanecen disponibles para las relaciones de datos, pero no aparecen en las columnas visibles de reportes.

## Diagnóstico y reversión

Para revisar un reporte, comprobar primero que la localidad exista en `localidades` y tenga el mismo `id` que el registro. La corrección está contenida principalmente en `reportes.js`; revertir ese archivo restaura la representación anterior sin borrar ventas ni jornadas.
