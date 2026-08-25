# FLUXORA — Documentación de versiones

## Propósito

Esta carpeta concentra **todos los archivos Markdown del proyecto**. La documentación se organiza por etapa y tipo de cambio para que cada modificación pueda rastrearse, revisarse y diagnosticarse sin depender de memoria externa.

> Regla de trabajo: el código fuente conserva la operación; esta carpeta conserva la explicación, el alcance, las decisiones y las pruebas de cada versión.

## Mapa documental

| Carpeta | Contenido | Uso para diagnóstico |
|---|---|---|
| `00_especificacion_fuente` | Especificaciones visuales y operativas recibidas para FLUXORA. | Confirmar qué se solicitó originalmente antes de atribuir un fallo a la implementación. |
| `01_modelo_operativo` | Alcance rector, limpieza operativa y catálogo de pantallas por rol. | Revisar si un módulo pertenece al modelo de venta, distribución, medidor, caja o conciliación. |
| `02_flujo_chofer_y_jerarquia` | Flujo ultra-rápido del chofer y modelo de asignaciones Empresa → Zona → Repartidor → Vehículo → Clientes. | Revisar incidencias del flujo móvil, asignaciones y separación ADMIN/REPARTIDOR. |
| `03_medidor_y_conciliacion` | Lecturas, conversiones, ventas por medidor y cierre de jornada. | Revisar fallos de equivalencias, lecturas físicas/calculadas, diferencias y conciliación. |
| `04_arquitectura_y_manual` | Arquitectura del sistema y manual de usuario. | Entender dependencias generales y el uso esperado de la aplicación. |
| `05_reestructuracion_visual` | Reportes de cambios exclusivamente visuales. | Comparar la capa FLUXORA visual sin confundirla con lógica o reglas de negocio. |
| `06_publicacion_y_pruebas` | Publicación, GitHub Pages y pruebas del entorno. | Revisar si el fallo corresponde al despliegue, caché, PWA o entorno de prueba. |
| `07_pwa_iconos` | Iconos PWA, manifest, versión de caché y script reproducible de generación. | Revisar nombre, iconos instalables, rutas del manifest y actualización del service worker. |
| `08_configuracion_admin_repartidor` | Auditoría de configuración ADMIN y dependencias reales del REPARTIDOR. | Confirmar qué configura ADMIN y qué valores consume Jornada, Ruta, venta, caja y conciliación. |
| `09_referencias_repartidor` | Resolución de vehículos y medidores por referencias separadas en Jornada, Ruta y ventas offline. | Revisar IDs, snapshots, continuidad de lectura y compatibilidad con zonas históricas. |
| `10_flujo_desarrollo` | Procedimiento de desarrollo, validación, publicación incremental y reversión. | Confirmar cómo se publica cada bloque de prueba y cómo localizar o revertir un fallo. |
| `11_migracion_localidad` | Sustitución completa de zona por localidad como unidad de asignación del REPARTIDOR. | Revisar localidadId, asignaciones a repartidores, filtros de clientes y compatibilidad histórica. |
| `12_colecciones_indices` | Estado de colecciones activas, colecciones legadas y consultas que pueden requerir índices compuestos. | Diagnosticar errores de Firestore, localidades sin asignación e índices pendientes. |
| `13_reglas_localidad` | Reglas de seguridad por localidadId, catálogos separados y alcance del REPARTIDOR. | Diagnosticar rechazos de lectura/escritura y verificar el contrato de permisos. |
| `14_depuracion_repartidor` | Separación visual del flujo operativo del REPARTIDOR y registro de código legado conservado. | Diagnosticar pestañas, avisos o acciones genéricas visibles para el REPARTIDOR. |
| `15_limpieza_nucleo` | Limpieza estructural: retiro de pedidos, rutas geográficas, QR, GPS y transferencias logísticas; conservación del núcleo de agua medida. | Diagnosticar referencias huérfanas, módulos retirados, jornada, venta offline, cierre y conciliación. |
| `16_gestion_flota` | Interfaz ADMIN para registrar y gestionar vehículos y medidores separados, integrar la configuración de medición y mostrar el inicio del historial desde Jornada. | Diagnosticar altas, asociaciones vehículo-medidor, caché PWA e historial de lecturas. |
| `18_clientes_interfaz_responsive` | Adaptación de Clientes a filtros horizontales, estado dentro de la ficha y diseño responsive para móvil, tableta y escritorio. | Diagnosticar problemas de filtros, desbordamiento móvil, caché PWA y exposición visual de identificadores. |
| `19_recargas_agua` | Recarga adicional durante jornada abierta, saldo persistente del vehículo, historial de cargas y separación respecto al medidor físico. | Diagnosticar recargas, saldo disponible, continuidad offline y referencias de jornada. |
| `20_capacidad_tanque_5000` | Corrección del límite: 5,000 L es capacidad instantánea del tanque; se permiten ventas y recargas sucesivas durante el día y se bloquea únicamente la sobreventa individual. | Diagnosticar recargas rechazadas, saldo móvil, ventas mayores al remanente y acumulado diario. |
| `21_conciliacion_nombres_visibles` | Conciliación y reportes muestran nombres reales de localidad y etiquetas humanas de jornada; se ocultan UID, hashes, firmas e IDs internos. | Diagnosticar nombres no resueltos, localidades inexistentes en el catálogo y columnas visibles de exportación. |
| `22_cierres_caja_historial` | Cierres de caja persistentes por bloques de trabajo, historial visible y confirmación segura con cancelar o borrador. | Diagnosticar cierres repetidos, historial vacío, bloques mal calculados y borradores locales. |

## Especificación fuente

`00_especificacion_fuente/pantallas.md` es la referencia principal para identidad visual, paleta, responsive, navegación y exclusiones funcionales. No debe confundirse con una autorización para inventar lógica que no exista en el proyecto.

## Orden recomendado para buscar un fallo

Primero identificar la pantalla y el rol afectados. Después revisar el documento de la carpeta temática correspondiente y, finalmente, comparar el comportamiento con el código del módulo relacionado. Para problemas de publicación, caché o carga visual se debe revisar `06_publicacion_y_pruebas` y la versión del service worker antes de modificar código.

| Síntoma | Primera carpeta a revisar |
|---|---|
| El repartidor no puede avanzar por la lista, carrito o pago | `02_flujo_chofer_y_jerarquia` |
| La lectura calculada, equivalencia o diferencia no coincide | `03_medidor_y_conciliacion` |
| ADMIN y REPARTIDOR ven una estructura incorrecta | `01_modelo_operativo` y `02_flujo_chofer_y_jerarquia` |
| El estilo, logo, responsive o navegación visual falla | `00_especificacion_fuente` y `05_reestructuracion_visual` |
| La página pública no refleja el último cambio | `06_publicacion_y_pruebas` |
| El icono, nombre o instalación PWA no se actualiza | `07_pwa_iconos` |
| Firestore rechaza una lectura o escritura por localidad | `13_reglas_localidad` y `12_colecciones_indices` |
| El REPARTIDOR ve funciones fuera del núcleo o faltan módulos tras la limpieza | `14_depuracion_repartidor` y `15_limpieza_nucleo` |
| No se entiende una dependencia o módulo | `04_arquitectura_y_manual` |

## Regla para futuras versiones

Las nuevas entregas documentales deben agregarse dentro de esta carpeta. Se recomienda crear una subcarpeta numerada por etapa o versión, conservar los documentos anteriores y no sobrescribir un informe histórico cuando el cambio corresponda a una iteración diferente.

Formato sugerido:

```text
documentación versiones/
└── 08_nombre_de_la_nueva_iteracion/
    ├── CAMBIOS.md
    ├── PRUEBAS.md
    └── DECISIONES_PENDIENTES.md
```

Cada nueva carpeta debe indicar qué cambió, qué no cambió, cómo se validó, qué archivos fueron afectados y qué hacer si aparece un fallo.

## Estado actual

La documentación existente fue reubicada desde la raíz del proyecto. También se incorporó una copia de `pantallas.md` como especificación fuente dentro de `00_especificacion_fuente`. La versión `07_pwa_iconos` documenta la conversión del símbolo FLUXORA a iconos PWA y la actualización del manifest y la caché. La versión `08_configuracion_admin_repartidor` conserva la auditoría de dependencias, la versión `09_referencias_repartidor` documenta el contrato consumido por el REPARTIDOR, la versión `10_flujo_desarrollo` define la publicación incremental para pruebas y la versión `11_migracion_localidad` establece localidad como unidad operativa y la versión `12_colecciones_indices` registra el estado de colecciones e índices y la versión `13_reglas_localidad` documenta las reglas por localidadId, la versión `14_depuracion_repartidor` registra la separación visual del flujo del REPARTIDOR y la versión `15_limpieza_nucleo` documenta el retiro estructural de módulos genéricos y la conservación del núcleo operativo, y la versión `16_gestion_flota` documenta el alta administrativa de vehículos y medidores y el inicio del historial desde Jornada, y la versión `18_clientes_interfaz_responsive` documenta la nueva barra horizontal, el estado dentro de la ficha, el formulario reducido y la adaptación responsive de Clientes, y la versión `19_recargas_agua` documenta la recarga adicional, el historial de cargas y la separación entre saldo de agua y medidor físico, y la versión `20_capacidad_tanque_5000` corrige el límite para tratar 5,000 L como capacidad instantánea del tanque, permitiendo recargas sucesivas y bloqueo individual de sobreventa, y la versión `21_conciliacion_nombres_visibles` corrige los nombres visibles en conciliación y exportaciones sin eliminar identificadores internos, y la versión `22_cierres_caja_historial` registra cierres persistentes por bloques de trabajo, historial visible y confirmación segura con cancelar o borrador. No se modificaron los contenidos históricos de los documentos al moverlos.
