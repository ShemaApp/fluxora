# FLUXORA — Estado de colecciones e índices

## Alcance de esta revisión

Este documento describe el estado declarado por el código del proyecto. No consulta ni modifica la configuración remota de Firestore. La fuente central de nombres es `db/colecciones.js`; las suscripciones y consultas activas están en `hooks/useSesion.js` y en los módulos administrativos.

## Colecciones activas

| Colección | Estado | Uso principal |
|---|---|---|
| `usuarios` | Activa | Perfil, rol ADMIN/REPARTIDOR y asignaciones de acceso. |
| `clientes` | Activa | Clientes fijos con `localidadId` y `localidadNombre`. |
| `localidades` | Activa y ahora operativa | Catálogo, asignación a repartidor, vehículo y medidor. |
| `vehiculos` | Activa | Catálogo separado de vehículos; cada vehículo puede referenciar `medidorId`. |
| `medidores` | Activa | Catálogo separado de instrumentos y escala física. |
| `productos` | Activa | Productos comerciales y existencias. |
| `tarifas` | Activa | Tarifas configurables y snapshots de venta. |
| `jornadas` | Activa | Apertura, lectura inicial, lectura final, conciliación y snapshots. |
| `lecturas_medidor` | Activa | Lecturas físicas iniciales/finales y trazabilidad. |
| `notas` | Activa | Ventas registradas, incluyendo ventas offline sincronizadas. |
| `creditos` | Activa | Saldos y abonos de crédito. |
| `rutas` | Activa | Transferencias/cargas y datos operativos de localidad. |
| `pedidos` | Activa | Pedidos y transferencias asociadas. |
| `inventario_historial` | Activa | Entradas, salidas y movimientos de inventario comercial. |
| `devoluciones` | Activa | Devoluciones y conciliación de mercancía. |
| `cierres_caja` | Activa | Cierres y efectivo esperado. |
| `gastos` | Activa | Salidas autorizadas de caja. |
| `ubicacion_auditoria` | Activa en código existente | Registro histórico de ubicación, sin formar parte del nuevo alcance de localidad. |
| `_meta` | Activa | `seed` y `medicion_venta`, además de metadatos internos. |
| `zonas` | Legado | Se conserva como referencia histórica, pero ya no se siembra, suscribe ni consume la UI nueva. |

## Contrato operativo actual

La relación principal quedó normalizada en documentos separados:

```text
localidades/{localidadId}
  ├── repartidorId
  ├── vehiculoId
  └── medidorId
        ↓
clientes/{clienteId}.localidadId
        ↓
jornadas/{jornadaId}.localidadId + vehiculoId + medidorId
        ↓
rutas/notas/lecturas_medidor con snapshots
```

El código nuevo filtra los clientes del REPARTIDOR por las localidades que tienen asignado su usuario. La localidad no se guarda como una subcolección por repartidor; se conserva como colección independiente con referencias simples. Esto evita duplicar clientes y permite que cada cliente fijo pertenezca a una localidad estable.

## Índices encontrados

El repositorio **no contiene `firestore.indexes.json` ni otro archivo de índices compuestos**. Por tanto, no hay índices compuestos versionados dentro del proyecto.

Firestore crea automáticamente índices de campo individual. Las consultas compuestas actualmente detectadas son las siguientes:

| Consulta | Campos | Índice compuesto probable |
|---|---|---|
| Gastos personales | `capturadoPorUid ==` + `fecha desc` | `capturadoPorUid ASC, fecha DESC` |
| Cierres personales | `capturadoPorUid ==` + `fecha desc` | `capturadoPorUid ASC, fecha DESC` |
| Ventas por repartidor y periodo | `capturadoPorUid ==` + rango de `fecha` | `capturadoPorUid ASC, fecha ASC` |
| Ubicación por periodo | dos límites sobre `fecha` | Generalmente cubierto por el índice de `fecha`; verificar solo si Firestore solicita uno. |

Las consultas de `rutas`, `pedidos` y `jornadas` del REPARTIDOR filtran principalmente por `repartidorId`. Las consultas administrativas ordenan por un solo campo. La carga actual de `localidades`, `vehiculos`, `medidores`, `clientes` y `tarifas` no requiere un índice compuesto porque no combina filtros y ordenamientos en Firestore.

## Índices recomendados para la siguiente iteración

Si se quiere versionar la infraestructura de Firestore, se puede crear un `firestore.indexes.json` con los índices de gastos, cierres y reportes de ventas. No se creó todavía porque el entorno de desarrollo aún no tiene una decisión final sobre el despliegue de reglas e índices, y no conviene registrar índices que el proyecto remoto no utilice.

Para escalar el REPARTIDOR sin cargar el catálogo completo, la siguiente optimización sería consultar `localidades` por `repartidorId` y `clientes` por `localidadId`. Esa optimización debe hacerse junto con las reglas de seguridad de localidad, porque ahora el proyecto está en modo de desarrollo y el filtrado de alcance se realiza en la interfaz.

## Puntos de diagnóstico

Si aparece un error de índice, revisar primero la consola de Firestore y el enlace de creación de índice que proporciona el error. Si la sesión falla al cargar localidades, vehículos o medidores, revisar permisos de lectura de esas colecciones y el bloque correspondiente de `hooks/useSesion.js`. Si el REPARTIDOR ve cero clientes, revisar que cada cliente tenga `localidadId` y que esa localidad tenga `repartidorId` igual al UID del repartidor.

## Estado de reglas

`firestore.rules` todavía contiene condiciones históricas asociadas a zona. Esta revisión no las modifica, de acuerdo con el modo de desarrollo solicitado. La actualización de reglas para `localidadId` debe ser una iteración independiente y debe acompañarse de pruebas de lectura/escritura y de índices.
