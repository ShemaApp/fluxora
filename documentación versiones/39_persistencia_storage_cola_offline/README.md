# Persistencia de almacenamiento y cola offline

## Objetivo

Reducir el riesgo de que el navegador desaloje los datos locales de FLUXORA y conservar la continuidad de las ventas offline hasta recibir confirmación de Firebase. La solución no cambia la lógica de jornada, medidor, stock móvil, tarifas, créditos, caja o conciliación.

## Archivos integrados

| Archivo | Responsabilidad |
|---|---|
| `almacenamiento-local.js` | Comprueba `navigator.storage`, solicita persistencia, calcula una estimación de uso/cuota y publica el estado mediante un evento global |
| `hooks/useSesion.js` | Solicita la persistencia después de autenticar al usuario e inicia un intento de sincronización |
| `ventas-offline.js` | Conserva la cola IndexedDB, migra la versión sin borrar registros, reabre la conexión si se cierra y solo elimina una venta después de confirmarla |
| `app.js` | Usa el banner global existente para avisar de conexión, pendientes y almacenamiento no persistente |
| `index.html` | Carga el módulo antes de `useSesion.js` |

## Flujo

```text
Inicio de sesión confirmado
        ↓
Comprobar si el origen ya es persistente
        ↓
Solicitar persistencia si todavía no lo es
        ↓
Mostrar estado no bloqueante
        ↓
Intentar sincronizar la cola si hay conexión
        ↓
Conservar cada operación hasta confirmación de Firebase
```

La solicitud es una mejora de resiliencia, no una condición para entrar a la aplicación. Si el navegador la rechaza o no soporta la API, el usuario puede seguir trabajando y el banner global informa la situación.

## Cola IndexedDB

La cola existente `app-offline-ventas-agua-v2` se actualizó de versión 1 a versión 2. La migración conserva el object store y sus registros; no ejecuta `deleteObjectStore`. La conexión escucha `versionchange` y `close` para liberar la referencia y permitir una reapertura posterior.

Si una transacción falla por una conexión cerrada o inactiva, se descarta únicamente la referencia local y se reintenta una vez con una nueva conexión. No se borra el registro pendiente por un error de apertura.

La limpieza sigue ocurriendo únicamente después de que `conciliar()` confirma la venta en Firestore. Los bloqueos de negocio, como saldo de agua insuficiente o referencias que ya no corresponden a la jornada, se eliminan de la cola como `bloqueada` para no reintentarlos indefinidamente; los errores transitorios permanecen pendientes.

## Garantías y límites

| Garantía | Estado |
|---|---|
| Solicitar almacenamiento persistente después del login | Implementada |
| No bloquear el login si se rechaza | Implementada |
| Mostrar pendientes de la cola en el banner existente | Implementada |
| Conservar datos ante migración de IndexedDB | Implementada |
| Reabrir después de cierre de conexión | Implementada con un reintento |
| Borrar una venta solo después de confirmación | Se conserva el comportamiento existente |
| Evitar pérdida por borrar datos del sitio | No es posible garantizarlo |
| Recuperar datos de un teléfono perdido o desinstalación | No es posible sin sincronización previa |
| Sustituir Firebase por almacenamiento local | No se hace |

El almacenamiento persistente no evita que el usuario borre los datos del sitio, desinstale la PWA, se quede sin espacio de forma crítica, pierda el dispositivo o encuentre un error de código. Para esos escenarios, la cola debe sincronizarse con frecuencia y el banner debe mostrar pendientes.

## Uso de `localStorage`

`localStorage` queda reservado para preferencias, PIN local, borradores pequeños y referencias de sesión. Las operaciones de venta y sus snapshots deben seguir viviendo en IndexedDB hasta la confirmación remota.

## No incluido

No se agregaron nuevas colecciones, reglas, triggers, APIs, servicios externos ni lógica de negocio. No se cambió la versión de Firebase, no se modificó la cola semántica de ventas y no se alteraron los campos de jornada, vehículo, medidor o tarifa.
