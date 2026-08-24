# Implementación v1.3.0 — Localidad operativa del REPARTIDOR

## Cambios realizados

La interfaz y el contexto operativo dejaron de usar zona como unidad de trabajo. `localidades` se carga desde Firestore y se entrega a Clientes, Jerarquía, Jornada y Ruta. Cada localidad puede guardar `repartidorId`, `vehiculoId` y `medidorId`; vehículo y medidor continúan viviendo en colecciones separadas.

Clientes valida y persiste `localidadId` y `localidadNombre`. Si una localidad escrita no existe todavía, la pantalla ADMIN la crea en `localidades`. La ficha del cliente ya no presenta un selector de zona.

Jerarquía fue reemplazada por una pantalla de Localidades operativas. El ADMIN puede crear localidades y asignarles repartidor, vehículo y medidor. Al elegir vehículo se propone su medidor asociado. Los clientes fijos se asignan mediante un selector de localidad.

Jornada selecciona localidades asignadas al repartidor y congela localidad, vehículo y medidor. Ruta filtra clientes por `localidadId`, conserva fallback por nombre para documentos anteriores y guarda localidad en transferencias. Ventas offline y cierre siguen usando `jornadaId`, `vehiculoId` y `medidorId`.

## Compatibilidad

Los documentos históricos que aún tienen `zonaId`, `zonaNombre` o `zonaChoferId` no se migran automáticamente. La UI nueva no los usa como unidad de selección. Las eliminaciones de esos campos solo ocurren cuando una ficha es reasignada desde la pantalla nueva.

El contrato histórico `zonas` queda identificado como legado en `db/colecciones.js`; no se siembra ni se suscribe en el contexto de sesión.

## Validaciones

- Sintaxis de todos los módulos JavaScript.
- Resolución `localidad → vehículo → medidor`.
- Filtrado de clientes por localidades asignadas.
- Carga de `localidades` en sesión.
- Manifest, iconos PWA y precaché `sw.js`.
- Arranque local sin errores de sintaxis.

## Pendiente separado

Las reglas de Firestore todavía contienen condiciones históricas de zona porque la instrucción de desarrollo actual es no modificar restricciones de seguridad. Si el proyecto remoto usa esas reglas y no está en modo de prueba, los nuevos documentos con solo `localidadId` pueden ser rechazados. La siguiente iteración debe actualizar reglas y migrar consultas de seguridad de forma explícita; no debe mezclarse silenciosamente con esta implementación.

## Reversión

Para volver al estado anterior de esta iteración, revisar el commit de GitHub asociado y restaurar los archivos del bloque. No borrar manualmente documentos de `localidades`, clientes, jornadas o ventas históricas.
