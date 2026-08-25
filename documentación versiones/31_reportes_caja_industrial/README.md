# Iteración 31 — Reportes y Caja

## Objetivo

Los módulos **Reportes** y **Caja** se ajustan al lenguaje **Clean Enterprise SaaS** con una composición industrial: dato principal, contexto mínimo y acción directa.

## Cambios visuales en Reportes

| Área | Tratamiento |
|---|---|
| Encabezado | Se simplifica a **Reportes** y se reduce el texto introductorio. |
| Periodo | Los filtros Desde y Hasta se presentan como una franja compacta y alineada. |
| Indicadores | Operaciones, litros, garrafones y total operativo se muestran como una banda de datos sin tarjetas coloridas. |
| Exportación | Excel y CSV quedan como acciones primarias y secundarias claramente diferenciadas. |
| Tarifas | El resumen por tarifa se presenta como una lista plana. |
| Jornadas | La conciliación se identifica como **Control de jornadas** y conserva sus lecturas, litros y diferencias. |

## Cambios visuales en Caja

| Área | Tratamiento |
|---|---|
| Encabezado | Se alinea con el menú y se muestra como **Caja**, sin icono decorativo. |
| Resumen | Venta en efectivo, abonos, gastos y efectivo a entregar se muestran en una estructura plana. |
| Cierre | El botón principal queda como **Cerrar caja**, conservando la confirmación, el borrador local y los cierres múltiples. |
| Gastos | El formulario se compacta; Efectivo y Tarjeta se presentan como opciones textuales. |
| Historial | Se renombra visualmente a **Historial de cierres** y conserva el detalle histórico. |
| Movimientos | Los reportes por persona y gastos mantienen sus filtros, estados y acciones con menos ruido visual. |
| Incidencias | Se conserva la señal semántica de incidencia, pero sin emoji ni tarjeta decorativa. |

## Restricciones respetadas

No se modificaron cálculos de caja, ventas en efectivo, abonos, gastos, cierres independientes, número de turno, confirmación, borradores, historial, filtros de periodo, exportaciones, resúmenes por tarifa, conciliaciones, permisos ni escritura en Firestore. No se cambió la forma en que Crédito, Efectivo o Facturado se contabilizan.

Se habilitó únicamente una propiedad `className` opcional en el componente compartido `Card` para aplicar estilos de presentación específicos; los usos anteriores continúan funcionando igual.

La caché PWA se actualiza a `v1.6.9` para distribuir los cambios a dispositivos instalados.
