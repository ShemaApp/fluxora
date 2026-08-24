# Pruebas de referencias vehículo–medidor

## Validaciones ejecutadas

| Prueba | Resultado |
|---|---|
| `node documentación versiones/09_referencias_repartidor/prueba_resolucion_referencias.js` | **OK**. El vehículo `veh-01` resolvió `Pipa 01`, enlazó `med-01` y conservó seis dígitos con 10 L por incremento. |
| `node --check` sobre todos los archivos JavaScript | **OK**. No se detectaron errores de sintaxis. |
| Validación JSON de `manifest.json` | **OK**. |
| Revisión de app shell | **OK**. `referencias-operativas.js` está incluido en `sw.js`. |

## Recorrido esperado

El ADMIN debe crear primero un medidor y un vehículo en sus colecciones separadas. La asignación de zona debe guardar `vehiculoId` y `medidorId`. Jornada resolverá esas referencias, conservará sus nombres como snapshot y guardará la lectura inicial con los IDs del instrumento. Ruta mostrará la asignación y enviará los mismos IDs a la venta offline. La lectura de despacho seguirá siendo calculada, no física.

## Compatibilidad heredada

Las zonas antiguas que solo tienen `vehiculo` como texto no se convierten automáticamente en documentos nuevos. El resolutor puede mostrar ese valor como fallback para no bloquear la lectura de datos antiguos. Las nuevas jornadas deben usar IDs cuando estén disponibles.

## Limitación pendiente

El código ya consume las colecciones `vehiculos` y `medidores`, pero este cambio no modifica `firestore.rules` ni crea aún la pantalla ADMIN para administrar dichas colecciones. Si las reglas desplegadas todavía no permiten leerlas, el contexto las dejará vacías y el resolutor utilizará los IDs/snapshots disponibles en la zona o la jornada. La habilitación de reglas y los módulos de administración deben publicarse en una iteración autorizada separada.

## Diagnóstico rápido

Si el REPARTIDOR ve “Pendiente” en vehículo o medidor, revisar en este orden: `zonas/{zonaId}.vehiculoId`; `zonas/{zonaId}.medidorId`; existencia de `vehiculos/{vehiculoId}`; existencia de `medidores/{medidorId}`; permisos de lectura; y finalmente `jornadas/{jornadaId}`. Si la jornada ya está abierta, sus snapshots no deben recalcularse usando cambios posteriores del catálogo.
