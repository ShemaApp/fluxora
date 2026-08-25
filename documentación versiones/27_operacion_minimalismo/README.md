# Iteración 27 — Operación y minimalismo operativo

## Objetivo

El módulo **Operación** se presenta como una herramienta de supervisión y ejecución, no como una colección de tarjetas decorativas. La información priorizada es localidad, repartidor, vehículo, medidor, jornada, agua disponible y cliente seleccionable.

## Panel administrativo

El panel administrativo conserva la agrupación por repartidor y localidad, pero ahora utiliza filas planas y separaciones ligeras. Las métricas de localidades activas y jornadas abiertas se presentan como datos compactos. Se eliminó visualmente el texto introductorio extenso y se redujeron bordes, radios, fondos y tarjetas.

## Flujo del repartidor

La pantalla operativa conserva el flujo existente: jornada, localidad, vehículo, medidor, agua disponible, búsqueda de cliente y selección de cliente. El encabezado se simplificó a **Operación**. Se retiró el emoji del vehículo y se dejaron nombres humanos de vehículo y medidor en lugar de exponer IDs técnicos en el resumen visible.

La barra de agua y el medidor lógico continúan visibles porque son datos de operación, no decoración. La lista de clientes se presenta como filas accionables; el nombre, localidad, método de servicio y estado de atención permanecen disponibles para ejecutar la siguiente parada.

## Restricciones respetadas

No se cambiaron consultas, permisos, rutas, handlers, ventas domésticas, servicios medidos, carga de agua, cálculo del medidor, stock móvil, lectura física, historial ni sincronización offline. Las clases añadidas son presentacionales. Los identificadores internos continúan funcionando igual.

El Service Worker se actualiza a `v1.6.5` para distribuir la hoja visual renovada en instalaciones existentes.
