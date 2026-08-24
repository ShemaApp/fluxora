# FLUXORA — Localidad como unidad operativa

## Decisión

La entidad operativa anterior `zona` queda sustituida por `localidad`. Una localidad es un registro existente del catálogo `localidades`; cada cliente fijo conserva una referencia `localidadId` y cada localidad puede estar asignada a un solo repartidor operativo. Un repartidor puede tener una o varias localidades.

```text
LOCALIDAD
  ├── repartidorId
  ├── vehiculoId
  └── medidorId
        ↓
CLIENTES CON localidadId
        ↓
JORNADA DEL REPARTIDOR
        ↓
RUTA → VENTA OFFLINE → CIERRE
```

## Contrato de datos

| Documento | Campos principales | Uso |
|---|---|---|
| `localidades/{localidadId}` | `nombre`, `activo`, `repartidorId`, `repartidorNombre`, `vehiculoId`, `vehiculoNombre`, `medidorId`, `medidorNombre` | Fuente de asignación operativa. |
| `clientes/{clienteId}` | `localidadId`, `localidadNombre`, `localidad`, `domicilio` | Pertenencia fija del cliente. |
| `jornadas/{jornadaId}` | `localidadId`, `localidadNombre`, `vehiculoId`, `medidorId` y snapshots | Contexto congelado de una jornada. |
| `rutas/{rutaId}` | `localidadId`, `localidadNombre`, `repartidorId` | Conjunto operativo de localidades/clientes. |
| `notas`, ventas offline y lecturas | `jornadaId`, `localidadId`, vehículo/medidor y snapshots | Trazabilidad histórica sin recalcular datos. |

## Asignación

El ADMIN selecciona una localidad existente, un repartidor, un vehículo y un medidor. El vehículo y el medidor siguen siendo colecciones separadas. Si el vehículo ya tiene `medidorId`, el medidor se propone automáticamente; el ADMIN puede confirmar esa referencia al guardar la asignación.

La misma localidad no debe quedar asignada simultáneamente a dos repartidores. El último guardado administrativo reemplaza la asignación visible de esa localidad; la pantalla del REPARTIDOR filtra por las localidades que tienen su `repartidorId`.

## Compatibilidad temporal

El código nuevo consume `localidadId` y `localidadNombre`. Durante esta iteración se conservan algunos campos heredados `zonaId`, `zonaNombre`, `zonaChoferId` y `zonaChoferNombre` únicamente como puente para documentos antiguos y para las reglas actualmente desplegadas. La interfaz nueva no selecciona ni filtra por zona.

No se ejecuta una migración masiva automática de documentos históricos. Los documentos existentes se interpretan con fallback controlado. Cuando un cliente, localidad, jornada o ruta se edite desde una pantalla nueva, se escriben los campos de localidad y, cuando es necesario para compatibilidad, sus alias heredados.

## Repartidor

El REPARTIDOR no selecciona una zona. Jornada muestra las localidades que tiene asignadas; Ruta muestra clientes cuyo `localidadId` pertenece a ese conjunto. Al abrir la jornada se congelan la localidad, el vehículo y el medidor. La venta offline y el cierre utilizan esos snapshots, por lo que una reasignación posterior no altera operaciones históricas.

## No incluido en esta iteración

No se crean mapas, GPS, rutas geográficas, tracking ni permisos nuevos. Tampoco se modifican todavía las reglas de Firebase; el alias heredado permite probar el flujo mientras se define una iteración específica de reglas para `localidadId`.
