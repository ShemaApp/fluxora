# Reglas de seguridad v1.4.0 — Localidad operativa

## Alcance

`firestore.rules` dejó de utilizar la zona como criterio de acceso operativo. El alcance del REPARTIDOR se determina por `localidadId` y por el documento correspondiente en `localidades`.

## Cambios principales

La función `localidadDelRepartidor(localidadId)` verifica que la localidad exista y tenga `repartidorId` igual al UID autenticado. La función `clienteDelRepartidor(clienteId)` resuelve el `localidadId` del cliente y reutiliza esa comprobación.

Los clientes nuevos requieren `localidadId`. Un ADMIN puede crear, actualizar y borrar clientes. Un REPARTIDOR puede leer y actualizar clientes de sus localidades, pero no puede cambiar la localidad asignada.

Los catálogos `vehiculos` y `medidores` son colecciones separadas. Solo ADMIN puede crear, actualizar o borrar sus documentos; el REPARTIDOR únicamente puede leerlos para operar.

Una jornada nueva del REPARTIDOR requiere `repartidorId` y una `localidadId` asignada. En una actualización de jornada, el REPARTIDOR no puede cambiar repartidor, localidad, vehículo, medidor, lecturas base, configuración de medición ni carga inicial. Las lecturas calculadas y los acumulados solo pueden avanzar.

Una ruta nueva del REPARTIDOR requiere una `localidadId` que pertenezca a su asignación. En una actualización no puede cambiar la localidad. Las rutas administrativas continúan bajo control de ADMIN.

Las ventas requieren jornada válida y cliente perteneciente a una localidad asignada al repartidor. Las lecturas de medidor siguen ligadas a la jornada del repartidor y no se pueden editar ni borrar.

## Compatibilidad

La colección `zonas` queda fuera de las reglas operativas nuevas. Los documentos históricos que todavía contengan `zonaId` o campos derivados no quedan automáticamente convertidos. Para operar con las reglas nuevas, los clientes, localidades, jornadas, rutas y ventas nuevas deben contener `localidadId`.

## Consultas de la interfaz

La sesión del REPARTIDOR consulta localidades por `repartidorId` y clientes por `localidadId` en grupos de hasta diez IDs. Esta estructura evita cargar clientes de otras localidades y coincide con el criterio de seguridad de las reglas.

## Validación

El emulador de Firestore inició correctamente con el archivo actualizado, lo que confirma que las reglas compilan. También se validaron la sintaxis de los módulos JavaScript, el resolutor localidad → vehículo → medidor y el manifest de la PWA.

La compilación local no equivale a un despliegue remoto. Este archivo y `firestore.rules` se publican en GitHub para desarrollo. Para activar las reglas en Firebase hace falta desplegar explícitamente `firestore.rules` al proyecto `fluxora-appe` desde Firebase Console o Firebase CLI con una cuenta autorizada.

## Diagnóstico

Si un REPARTIDOR no ve localidades, revisar que `localidades/{id}.repartidorId` coincida con su UID. Si no ve clientes, revisar `clientes/{id}.localidadId`. Si una venta es rechazada, revisar que el `jornadaId` pertenezca al repartidor y que el cliente de la venta tenga una localidad asignada al mismo UID. Si una operación histórica deja de escribir, verificar si aún envía campos de zona en lugar de `localidadId`.
