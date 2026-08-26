# Validación — Importación y exportación de clientes

## Resultado

La implementación queda preparada para ADMIN y se limita al catálogo de clientes. La exportación usa el resultado filtrado de Clientes; la importación solo crea altas nuevas después de una vista previa confirmada.

## Pruebas ejecutadas

| Prueba | Resultado |
|---|---|
| `node --check clientes.js` | Correcto |
| `node --check` de todos los JS del proyecto | Correcto |
| `git diff --check` | Correcto |
| Prueba estática de helpers y contrato de archivo | `CLIENT_IMPORT_EXPORT_STATIC_OK` |
| Encabezados obligatorios faltantes | Detectados antes de procesar filas |
| Duplicados dentro del archivo | Marcados para revisión |
| Coincidencias con clientes actuales | Marcadas para revisión; no se sobrescriben |
| Localidad activa sin repartidor | Válida para ADMIN; no recibe asignación automática |
| Localidad inexistente | Rechazada por fila |
| Tarifa inexistente o inactiva | Rechazada por fila |
| CSV | BOM UTF-8 y saltos de línea reales |
| Excel | Hojas `Clientes` y `Filtros aplicados` |
| Escritura Firebase | Batch de hasta 450 altas nuevas por lote |
| Regresiones temporales heredadas | No disponibles en este entorno restaurado; no se inventaron resultados |

## Acciones visibles

Las acciones aparecen solo para ADMIN:

```text
Importar clientes
Descargar plantilla
Exportar Excel (n)
Exportar CSV (n)
```

El contador `n` corresponde al resultado posterior a búsqueda, Estado, Crédito y Localidad. El REPARTIDOR no recibe estas acciones.

## Seguridad funcional

La selección del archivo nunca escribe directamente en Firebase. La importación exige revisión y confirmación. Las filas con errores o advertencias quedan fuera de la escritura. Los IDs técnicos no se leen como campos de negocio y las localidades o tarifas no se crean automáticamente desde Excel.

La localidad se resuelve desde el catálogo activo por nombre real. Puede estar asignada o pendiente de asignación cuando el usuario es ADMIN. La relación localidad–repartidor continúa siendo responsabilidad de Cobertura. El flujo de Clientes no crea `repartidorId`, `vehiculoId` ni `medidorId`.

## Navegador

La arquitectura se mantiene como JavaScript UMD clásico global con `React.createElement`, Firebase compat CDN y SheetJS ya cargado desde `index.html`. La pantalla pública carga correctamente. La confirmación real de una importación en Firestore requiere una sesión ADMIN autenticada; no se simularon credenciales ni se alteraron datos reales durante esta validación. Las pruebas temporales heredadas de cargas, cierres, reportes, balance, recargas, reglas y relleno no estaban presentes en este entorno restaurado; solo se reportan como no disponibles y no como aprobadas.

## Alcance no modificado

No se modificaron reglas de Firestore o Storage, ni se alteraron cálculos de ventas, créditos, jornadas, medidor, inventario, caja, conciliación, offline, PDF o Storage. La versión del service worker se incrementó una sola vez a `v1.6.12` al finalizar esta iteración.
