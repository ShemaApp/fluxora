# Iteración 25 — Nomenclatura conceptual de módulos

## Criterio

FLUXORA adopta nombres únicos para los módulos visibles. Los nombres describen el dominio de trabajo y no enumeran acciones, entidades o funciones mediante barras, guiones, paréntesis o ampersands. La interfaz queda alineada con el principio **un módulo, un nombre**.

| Nombre visible | Identificador interno conservado | Alcance que permanece dentro |
|---|---|---|
| Inicio | `home` | Indicadores y accesos de entrada. |
| Clientes | `clientes` | Clientes operativos, filtros e historial. |
| Créditos | `creditos` | Saldos y pagos de crédito. |
| Jornadas | `ruta` para ADMIN | Cargas y jornadas administrativas. |
| Control | `jornada` para ADMIN | Conciliación y control de jornada. |
| Operación | `repartidores` para ADMIN; `ruta` para REPARTIDOR | Repartidores, cargas y flujo operativo de ruta. |
| Catálogo | `productos` | Productos, tarifas y precios. |
| Inventario | `inventario` | Existencias y movimientos de agua. |
| Reportes | `reportes` | Resultados y exportaciones operativas. |
| Caja | `gerencia` | Efectivo, cierres y movimientos de caja. |
| Cobertura | `jerarquia` | Localidades y asignaciones operativas. |
| Privacidad | `privacidad` | Documentos de privacidad y uso seguro. |

## Ajustes internos de encabezados

También se alinearon los encabezados visibles de Clientes, Jornadas, Operación, Catálogo, Créditos, Cobertura, Medición y Flota. El bloque de accesos del Inicio ahora se denomina **Módulos** y conserva los mismos destinos. Las etiquetas auxiliares de permisos se simplificaron sin modificar permisos, roles ni identificadores.

## Restricciones respetadas

Este cambio es de presentación y nomenclatura. No se cambiaron colecciones, reglas, datos, handlers, cálculos, permisos, destinos internos ni el flujo de ventas. Los identificadores técnicos continúan siendo los mismos para evitar migraciones y mantener compatibilidad con la aplicación publicada.

La nomenclatura no implica fusionar módulos ni agregar pantallas nuevas. **Operación**, **Catálogo**, **Cobertura** y **Control** son nombres conceptuales de acceso; las funciones que ya existían continúan en sus módulos y rutas actuales.
