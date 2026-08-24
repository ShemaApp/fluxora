# Pruebas conductuales de `firestore.rules`

## Entorno

Las pruebas se ejecutaron en Firestore Emulator y Auth Emulator con datos sintéticos aislados. No se realizaron escrituras contra Firebase remoto. Se probaron dos repartidores, dos localidades, dos clientes y un catálogo de vehículo/medidor.

## Matriz ejecutada

| Caso | Resultado esperado | Resultado |
|---|---:|---:|
| ADMIN lee una localidad | Permitir | PASS, HTTP 200 |
| REPARTIDOR lee su localidad asignada | Permitir | PASS, HTTP 200 |
| REPARTIDOR lee una localidad ajena | Permitir actualmente para conservar la lectura autenticada del catálogo de localidades | PASS, HTTP 200 |
| REPARTIDOR lee un cliente de su localidad | Permitir | PASS, HTTP 200 |
| REPARTIDOR lee un cliente de otra localidad | Denegar | PASS, HTTP 403 |
| REPARTIDOR crea una jornada en su localidad | Permitir | PASS, HTTP 200 |
| REPARTIDOR crea una jornada en localidad ajena | Denegar | PASS, HTTP 403 |
| REPARTIDOR crea una nota para su cliente y jornada | Permitir | PASS, HTTP 200 |
| REPARTIDOR crea una nota para un cliente ajeno | Denegar | PASS, HTTP 403 |

## Interpretación

El aislamiento operativo de clientes, jornadas, rutas y notas se basa en `localidadId` y en el `repartidorId` de la localidad. La lectura de documentos de `localidades`, `vehiculos` y `medidores` permanece permitida para cualquier usuario autenticado porque la interfaz actual consume esos catálogos de referencia sin un campo de asignación de lectura específico. Esta decisión queda identificada para una iteración posterior; no se inventó una estructura adicional de permisos durante esta migración.

La prueba no pretende certificar todas las combinaciones de campos de cada colección. Deben añadirse casos de ventas, cierres, lecturas, inventario, créditos y actualizaciones de jornada cuando se disponga de fixtures completos y de credenciales de prueba con el esquema vigente.

## Validaciones complementarias

El archivo de reglas compiló al iniciar el emulador. Todos los archivos JavaScript del proyecto pasaron `node --check`, y `manifest.json` se pudo analizar como JSON válido. La búsqueda de referencias activas a `zona`, `zonaId`, `zonaNombre`, `zonaChofer` y `zonaVehiculo` en `firestore.rules` no devolvió resultados.
