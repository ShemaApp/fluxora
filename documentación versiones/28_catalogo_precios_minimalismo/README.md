# Iteración 28 — Catálogo y Precios

## Objetivo

El módulo **Catálogo** se reorganiza visualmente para priorizar nombre, unidad, precio, estado y acción. La pantalla deja de depender de tarjetas decorativas y presenta los productos como filas operativas.

La pantalla de **Medición** y **Tarifas** adopta el mismo lenguaje: títulos únicos, secciones planas, campos compactos y una separación visible entre unidad comercial, medidor físico, conversión y precio.

## Cambios de presentación

| Área | Tratamiento visual |
|---|---|
| Catálogo | Encabezado compacto, búsqueda directa y filas planas por producto. |
| Producto | Nombre y precio como información primaria; unidad, stock y código como datos secundarios. |
| Acciones | Editar, seleccionar y eliminar se mantienen, pero con etiquetas textuales sin emojis. |
| Selección múltiple | Barra de selección plana, sin fondo de alerta permanente ni etiquetas con paréntesis. |
| Historial | Se conserva como acción administrativa y se eliminó únicamente el icono decorativo del título. |
| Medición | Se quitaron los prefijos A, B, C, D y E de los títulos para dejar conceptos únicos. |
| Tarifas | Las tarifas se muestran como filas con unidad, litros, incremento físico y precio; el formulario queda compacto. |
| Conversión | Se conserva la información funcional, pero la representación visual redundante se reduce. |

## Restricciones respetadas

No se modificaron validaciones, colecciones, guardado, selección, eliminación, inventario, precios, tarifas, conversiones, unidad comercial, litros por unidad, incremento del medidor, tipo de inventario ni permisos. No se creó lógica nueva. Los ajustes de `productos.js` y `medicion.js` agregan clases de presentación y limpian texto visible; el resto del cambio está en CSS.

El Service Worker se actualiza a `v1.6.6` para que el estilo llegue a dispositivos instalados.
