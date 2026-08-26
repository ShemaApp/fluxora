# Validación — Trigger de snapshot de conciliación

## Estado

El trigger está implementado y versionado en `functions/`, pero no se desplegó en Firebase desde este entorno porque no hay Firebase CLI ni credenciales de despliegue disponibles. El procedimiento de despliegue queda documentado y está limitado a la función; no incluye reglas Firestore ni Storage.

## Archivos

| Archivo | Función |
|---|---|
| `functions/index.js` | Trigger `crearSnapshotConciliacionAlCerrarJornada` sobre `jornadas/{jornadaId}` |
| `functions/snapshot.js` | Constructor puro y condición de transición, sin dependencia de Firebase |
| `functions/test/snapshot.test.js` | Pruebas del evento, snapshot e inmutabilidad de la copia |
| `functions/package.json` | Dependencias y runtime Node 20 |
| `firebase.json` | Fuente de Functions |
| `.firebaserc` | Proyecto `fluxora-appe` |
| `firestore.rules` | Regla fuente de lectura ADMIN y bloqueo de escritura cliente |

## Pruebas ejecutadas

| Prueba | Resultado |
|---|---|
| `node --check functions/index.js` | Correcto |
| `node --check functions/snapshot.js` | Correcto |
| `node --test functions/test/snapshot.test.js` | 3 pruebas aprobadas |
| `git diff --check` | Correcto |
| Transición abierta → cerrada | Dispara |
| Jornada abierta → abierta | No dispara |
| Jornada cerrada → cerrada | No dispara |
| `jornadaId` vacío | No dispara / el constructor rechaza |
| Documento existente | Se omite sin sobrescritura |
| Copia de `resumenTarifas` | Profunda; no comparte referencia mutable |

## Invariantes preservados

El trigger no usa la configuración actual de tarifas o medición, no recalcula históricos, no modifica `jornadas`, no modifica `notas`, no modifica `servicios`, no modifica `lecturas_medidor`, no mezcla `jornadaId`, `vehiculoId` o `medidorId` y no altera el stock móvil. El snapshot solamente copia los valores guardados en la jornada cerrada.

## Prueba manual posterior al despliegue

1. Crear o seleccionar una jornada de prueba en estado `abierta`.
2. Cerrarla desde el flujo existente con lectura final física.
3. Confirmar la creación de `conciliaciones_jornada/{jornadaId}`.
4. Verificar que el snapshot tenga `inmutable: true`, `estadoJornada: 'cerrada'`, el mismo `jornadaId` y las referencias correctas de vehículo y medidor.
5. Editar solamente la explicación administrativa de la jornada.
6. Confirmar que no se crea un segundo snapshot y que los valores originales del snapshot no cambian.
7. Intentar escribir desde un cliente autenticado y confirmar, después de desplegar la regla, que la operación sea rechazada.

## Despliegue

No ejecutar reglas junto con la función. El comando esperado es:

```bash
cd functions
npm install
cd ..
firebase use fluxora-appe
firebase deploy --only functions:crearSnapshotConciliacionAlCerrarJornada
```

La validación real contra Firestore requiere ejecutar ese despliegue con una cuenta autorizada y un proyecto Firebase de prueba. Hasta entonces, el estado correcto es **implementado y validado localmente; no desplegado**.
