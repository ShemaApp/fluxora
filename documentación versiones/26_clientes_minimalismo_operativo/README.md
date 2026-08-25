# Iteración 26 — Clientes y minimalismo operativo

## Objetivo

El módulo **Clientes** se reorganiza visualmente bajo el principio **cliente → dato → acción**. La lista deja de sentirse como una colección de tarjetas y pasa a funcionar como una relación operativa compacta, legible y rápida de recorrer.

| Orden visual | Información |
|---|---|
| 1 | Nombre del cliente. |
| 2 | Localidad asignada. |
| 3 | Método de servicio: Doméstica o Medido por medidor. |
| 4 | Saldo actual, cuando existe. |
| 5 | Estado y acceso a la acción disponible. |

La búsqueda permanece visible como acción principal. Los filtros de Estado, Crédito y Localidad se mantienen, pero se presentan como controles planos y compactos. Las acciones secundarias —editar, activar o desactivar e historial— solo aparecen al expandir el registro correspondiente.

## Elementos retirados visualmente

Se redujeron sombras, bordes, radios grandes, fondos de tarjeta y etiquetas duplicadas. El bloque repetido de estado y crédito que aparecía dentro de las acciones expandidas se oculta porque esos datos ya se muestran en el resumen del cliente. No se eliminaron datos ni acciones; solo se evita repetirlos visualmente.

## Restricciones respetadas

No se modificaron colecciones, filtros, consultas, tarifas, métodos de servicio, saldos, historial de ventas, servicios medidos, PDF, permisos, edición ni navegación. El saldo mostrado usa el mapa de crédito que el módulo ya calculaba. Las clases visuales nuevas se limitan a presentación responsive.

En escritorio, la lista se presenta como filas con separación mínima. En móvil, los filtros pueden desplazarse horizontalmente y cada registro conserva un área táctil clara sin perder localidad, método, saldo o estado.
