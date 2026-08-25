# Iteración 29 — Cobertura y Territorio

## Objetivo

El módulo **Cobertura** se ajusta al lenguaje **Clean Enterprise SaaS** con una jerarquía directa: localidad → repartidor → vehículo y medidor → clientes asignados.

## Cambios visuales

| Área | Tratamiento |
|---|---|
| Encabezado | Se conserva únicamente el nombre conceptual **Cobertura**; se oculta el texto introductorio largo. |
| Resumen jerárquico | Se retira el diagrama explicativo con flechas, etiquetas y bloques duplicados. El listado operativo de localidades permanece visible. |
| Localidades | Se presentan como filas planas con nombre, cantidad de clientes, repartidor, vehículo, medidor y estado. |
| Identificadores | El ID técnico de la localidad deja de mostrarse en la interfaz. La referencia interna no se elimina. |
| Nueva localidad | El formulario conserva nombre, repartidor, vehículo, medidor y acción de creación, con campos más compactos. |
| Clientes | La asignación conserva búsqueda, filtro y selector de localidad, con filas limpias y sin tarjetas decorativas. |
| Responsive | En móvil los selectores de asignación se distribuyen en dos líneas y las filas mantienen un área de interacción clara. |

## Restricciones respetadas

No se modificaron consultas, colecciones, permisos, relaciones de localidad, repartidor, vehículo o medidor, asignación de clientes, validaciones, guardado ni mensajes de operación. No se agregó GPS, mapas, rutas geográficas ni lógica nueva. Los cambios en `jerarquia.js` son clases de presentación y limpieza de texto visible; el resto está limitado a CSS.

La caché PWA se actualiza a `v1.6.7` para distribuir el estilo a dispositivos instalados.
