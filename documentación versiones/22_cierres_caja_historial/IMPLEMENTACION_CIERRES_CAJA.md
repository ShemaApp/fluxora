# Cierres de caja — Historial persistente, bloques y confirmación

## Objetivo

Cada cierre de caja debe conservarse como un movimiento histórico visible debajo de la caja actual. El sistema permite cerrar caja más de una vez durante el mismo día porque un repartidor o responsable puede salir, atender una urgencia y regresar a trabajar.

## Modelo de bloques

La caja actual se calcula como un bloque de movimientos. Al comenzar el día, el bloque inicia en la hora local de inicio del día. Después de un cierre confirmado, el siguiente bloque inicia en la fecha y hora de ese cierre. Por lo tanto, las ventas, abonos y gastos del bloque anterior no se vuelven a sumar en el siguiente cierre.

Cada cierre se guarda en `cierres_caja` como un documento independiente con un identificador único por momento. El campo `turnoNumero` indica el orden del cierre dentro del día. La clave contiene el día y una parte temporal, por ejemplo:

```text
caja-AAAA-MM-DD-<secuencia temporal>
```

El historial conserva todos los cierres y se ordena por fecha descendente.

## Confirmación de seguridad

Pulsar **Cerrar caja de hoy** no guarda inmediatamente. Primero se abre una confirmación con la pregunta:

> ¿Confirmas que quieres cerrar caja?

La persona debe elegir una de estas opciones:

| Opción | Resultado |
|---|---|
| **Sí, cerrar caja** | Guarda el cierre definitivo en `cierres_caja` y lo agrega al historial. |
| **Cancelar** | Cierra el diálogo sin guardar ni modificar movimientos. |
| **Guardar borrador** | Guarda un resumen local en el dispositivo, sin crear un cierre definitivo ni agregarlo al historial. |

El botón de confirmación se deshabilita mientras la escritura está en curso para evitar dobles toques. Los cierres posteriores siguen permitidos de forma explícita.

## Persistencia e historial

El comprobante guarda fecha, día local, número de cierre, estado, responsable, ventas en efectivo, abonos en efectivo, gastos en efectivo, fórmula base, efectivo a entregar, cantidad de ventas, clientes atendidos, incidencias y gastos con tarjeta pendientes. La pantalla muestra debajo de la caja actual el bloque **Historial de cierres de caja** con cada cierre guardado.

Los borradores utilizan la infraestructura local existente, caducan conforme a la política general de borradores y no deben confundirse con un cierre confirmado. Al confirmar un cierre, el borrador local se elimina.

## Alcance

Cerrar caja no cancela ventas, no elimina gastos y no bloquea el registro de movimientos posteriores. Solo corta el bloque actual para que el siguiente cierre sea independiente. No se implementa todavía una reapertura o corrección de cierres; si se necesita, debe ser una operación administrativa explícita y auditable.

## Compatibilidad

Los cierres históricos creados con identificadores aleatorios continúan siendo legibles. El listener mantiene la colección `cierres_caja` existente y el nuevo código acepta tanto cierres antiguos como nuevos. Los datos operativos no se migran ni se eliminan.

## Validación

Se validó la sintaxis de todos los módulos JavaScript y el formato del repositorio. La prueba funcional cubre cancelar sin escribir, guardar borrador sin crear cierre, confirmar un primer cierre, volver a abrir caja y confirmar un segundo cierre independiente del mismo día. También se verificó que los dos documentos del historial tengan IDs diferentes y números de turno consecutivos.

## Diagnóstico y reversión

El flujo está contenido en `gerencia.js` y utiliza la colección existente `cierres_caja`. Para revisar un cierre, comprobar `fecha`, `diaLocal`, `turnoNumero`, `estado` y `efectivoAEntregar`. Para revertir el comportamiento visual sin borrar datos, revertir `gerencia.js`; los documentos históricos permanecen intactos.
