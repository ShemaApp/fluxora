# Validación — Persistencia y cola offline

## Resultado local

La integración quedó validada sin usar Firebase Emulator ni modificar datos remotos.

| Verificación | Resultado |
|---|---|
| `node --check almacenamiento-local.js` | Correcto |
| `node --check ventas-offline.js` | Correcto |
| `node --check hooks/useSesion.js` | Correcto |
| `node --check app.js` | Correcto |
| Sintaxis de los demás módulos JavaScript | Correcta |
| `git diff --check` | Correcto |
| Persistencia concedida | Estado `persistente: true` |
| Persistencia rechazada | No bloquea la sesión; estado `persistente: false` |
| Persistencia ya concedida | No vuelve a solicitarla |
| Estimación de cuota | Calcula porcentaje de uso cuando el navegador la expone |
| Reintento de cola tras conexión IndexedDB cerrada | Implementado |
| Migración IndexedDB versión 1 → 2 | Conserva el object store y registros |
| Limpieza después de confirmación remota | Conservada |

## Casos de aceptación en navegador

Estos casos deben comprobarse en Chrome/Safari de un teléfono real después de publicar:

1. Iniciar sesión con un usuario de prueba.
2. Confirmar que la solicitud de persistencia no detiene la pantalla ni cambia el rol.
3. Revisar el banner global cuando el navegador concede persistencia.
4. Repetir con un navegador que la rechace y confirmar el aviso no bloqueante.
5. Desconectar internet, registrar una venta de prueba y confirmar que queda pendiente.
6. Cerrar y volver a abrir la PWA sin borrar los datos del sitio.
7. Reconectar internet y verificar que la venta se sincroniza.
8. Confirmar que el registro local desaparece únicamente después de una respuesta exitosa.
9. Provocar una actualización de la aplicación y verificar que IndexedDB no pierda la cola.

## Límites de esta validación

No se puede demostrar desde Node que un navegador específico concederá persistencia, porque cada navegador aplica sus propios criterios. Tampoco se puede garantizar que el navegador conserve datos si el usuario borra el almacenamiento, desinstala la PWA, cambia de teléfono o el sistema operativo libera datos de forma excepcional.

No se modificaron Firebase Rules, Storage Rules ni Cloud Functions. Como sí se agregaron módulos JavaScript servidos por la PWA, el service worker se incrementó una sola vez a `v1.6.13` y `almacenamiento-local.js` se incorporó a `APP_SHELL`.
