# Iteración 30 — Control, cierres y conciliaciones

## Objetivo

El módulo **Control** se reorganiza visualmente para que la administración pueda leer rápidamente localidad, responsable, jornada cerrada, diferencia y datos de conciliación. La pantalla deja de sentirse como una tarjeta extensa y pasa a funcionar como una lista de registros operativos.

## Cambios visuales

| Área | Tratamiento |
|---|---|
| Encabezado | Se muestra el nombre conceptual **Control** y se oculta el texto introductorio redundante. |
| Registro de jornada | Cada cierre se presenta como una fila plana con localidad y diferencia al frente. |
| Contexto | Se muestran nombres humanos de repartidor, vehículo y medidor; el ID técnico del medidor deja de aparecer visualmente. |
| Conciliación | Lecturas, litros físicos, ventas calculadas y otras salidas permanecen visibles como detalle compacto. |
| Tarifas | El resumen por tarifa se conserva, pero sin caja interna pesada ni fondo decorativo. |
| Revisión | Los campos de otras salidas y explicación de diferencia permanecen disponibles como controles compactos. |
| Responsive | En móvil se reducen tipografías y espacios sin eliminar lecturas ni diferencias. |

## Restricciones respetadas

No se modificaron cálculos de lectura inicial, lectura final, litros medidos, litros calculados, diferencia, otras salidas, resumen de tarifas, cierre de jornada, historial, permisos ni escritura en Firestore. No se cambió el flujo operativo del repartidor. Las clases agregadas y los textos visibles modificados pertenecen a presentación; la única limpieza de datos visibles reemplaza el ID técnico por nombres humanos ya disponibles.

El Service Worker se actualiza a `v1.6.8` para distribuir el estilo renovado a dispositivos instalados.
