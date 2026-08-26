# Trigger de snapshot de conciliación al cerrar jornada

## Objetivo

Cuando una jornada pasa de `abierta` a `cerrada`, el backend crea un snapshot administrativo inmutable de la conciliación. El snapshot conserva los valores de esa jornada tal como quedaron al cierre; no consulta la configuración actual ni reescribe la jornada, ventas, servicios, caja o lecturas originales.

## Decisión de arquitectura

| Enfoque | Resultado | Decisión |
|---|---|---|
| Trigger de backend sobre `jornadas/{jornadaId}` | Funciona aunque el navegador se cierre después de guardar, centraliza la auditoría y permite reintentos idempotentes | Implementado |
| Evento solamente en la PWA | Puede mostrar una confirmación visual, pero no garantiza la escritura si el dispositivo queda offline o la pestaña se cierra | No usar como fuente de verdad |

El frontend actual es una PWA estática. Por eso el trigger vive en una carpeta `functions/` separada, con `firebase-functions` y `firebase-admin`, sin introducir un servidor dentro de la PWA.

## Evento exacto

La función escucha actualizaciones de:

```text
jornadas/{jornadaId}
```

Solo continúa cuando se cumple exactamente:

```text
antes.estado === 'abierta'
después.estado === 'cerrada'
jornadaId no está vacío
```

Una edición posterior de una jornada ya cerrada, como añadir una explicación administrativa, no crea otro snapshot.

## Documento generado

La ruta es:

```text
conciliaciones_jornada/{jornadaId}
```

El ID determinista evita duplicados. El backend usa `create()` en lugar de `set()` o `update()`. Si el evento se reintenta y el documento ya existe, el trigger registra el caso y termina sin sobrescribirlo.

El documento conserva:

| Grupo | Datos |
|---|---|
| Identidad | `snapshotVersion`, `tipo`, `inmutable`, `origen`, `jornadaId`, `jornadaPath` |
| Referencias | Repartidor, localidad, vehículo y medidor, con ID y nombre snapshot |
| Lecturas | Lectura anterior, inicial, final física, final calculada, incrementos y diferencia de contador |
| Volumen | Litros medidos, litros calculados por ventas, litros vendidos, ventas registradas, servicios medidos y otras salidas |
| Agua | Capacidad, carga inicial, recargas acumuladas y agua disponible |
| Escala usada | Unidad comercial, litros por unidad, incremento físico, precio y parámetros del medidor usados en esa jornada |
| Conciliación | Diferencia física contra calculada, diferencia final, garrafones, tipo y explicación |
| Tarifas | Copia profunda de `resumenTarifas` tal como quedó guardado en la jornada |
| Auditoría | `eventId`, fecha de generación y nombre de la función |

## Qué no hace

El trigger no modifica el documento de `jornadas`, no cambia ventas o servicios, no recalcula históricos con tarifas actuales, no cambia lecturas físicas, no mezcla vehículos, medidores o jornadas y no crea movimientos contables. El snapshot es una copia administrativa para consulta, auditoría y futuras exportaciones.

La conciliación sigue siendo la calculada por `jornada.js` al cerrar:

```text
lectura final física
contra
lectura final calculada por las operaciones registradas
```

La fuente operativa continúa siendo la jornada cerrada y sus documentos originales. El snapshot no sustituye esos registros.

## Seguridad

Se añadió una regla fuente para `conciliaciones_jornada`:

```text
ADMIN puede leer.
El cliente no puede crear, editar ni borrar.
La función escribe mediante Admin SDK.
```

La regla está versionada en `firestore.rules`, pero **no se desplegó automáticamente**. La función también usa Admin SDK, por lo que su escritura no depende de un permiso de cliente.

## Despliegue controlado

Desde la raíz del repositorio, después de instalar Firebase CLI y autenticar el proyecto correcto:

```bash
cd functions
npm install
cd ..
firebase use fluxora-appe
firebase deploy --only functions:crearSnapshotConciliacionAlCerrarJornada
```

Este comando despliega únicamente la función. No despliega `firestore.rules` ni `storage.rules`. Antes de ejecutarlo se debe confirmar que el proyecto activo sea `fluxora-appe` y que la cuenta tenga habilitado el servicio de Functions.

## Rollout recomendado

Primero desplegar la función en el proyecto de prueba. Después cerrar una jornada de prueba y comprobar que aparezca exactamente un documento en `conciliaciones_jornada/{jornadaId}`. Luego editar la explicación de esa jornada y confirmar que no aparece un segundo documento ni se modifica el snapshot original. Finalmente, consultar el snapshot desde una vista ADMIN cuando se integre esa lectura en el módulo Control.
