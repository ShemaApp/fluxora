# Actualización de referencias para el REPARTIDOR

## Objetivo

Las pantallas operativas del REPARTIDOR deben recibir el vehículo y el medidor desde referencias administrativas separadas. La operación no debe depender de que el repartidor escriba nombres manualmente ni de que una venta vuelva a consultar la configuración global.

## Contrato de referencias

| Entidad | Colección | Identificador | Datos mínimos consumidos |
|---|---|---|---|
| Vehículo | `vehiculos` | `vehiculoId` | `codigo`, `nombre`, `medidorId`, `medidorNombre`, `activo`. |
| Medidor | `medidores` | `medidorId` | `codigo`, `nombre`, `modoLectura`, `digitos: 6`, `litrosPorIncremento: 10`, `resolucion`, `decimales`, `activo`. |
| Zona/asignación | `zonas` | `zonaId` | `choferId`, `vehiculoId`, `vehiculoNombre`, `medidorId`, `medidorNombre`, localidades y conversiones operativas. |
| Jornada | `jornadas` | `jornadaId` | IDs y nombres congelados de vehículo/medidor, lecturas, agua y conversiones usados durante la jornada. |

El documento de vehículo y el documento de medidor permanecen separados. La relación se expresa por `vehiculo.medidorId`; la zona referencia ambos para que el alcance operativo sea explícito. Los nombres se conservan como snapshot de lectura, pero los IDs son la referencia técnica.

## Resolución en las pantallas del REPARTIDOR

```text
zona.vehiculoId / zona.medidorId
              ↓
jornada.vehiculoId / jornada.medidorId
              ↓
Ruta y venta offline
              ↓
nota + lecturas_medidor + crédito + cierre
```

`JornadaMedidor` resuelve el vehículo y el medidor seleccionado desde la zona. La jornada guarda los IDs, los nombres visibles y las conversiones de esa apertura. `FlujoChoferRapido` muestra esos datos como contexto y envía los IDs congelados a cada venta offline; nunca usa un vehículo o medidor elegido libremente en la venta.

## Compatibilidad de datos anteriores

Durante la migración, si una zona o jornada histórica solo contiene `vehiculo` como texto, el REPARTIDOR puede seguir visualizando ese texto. Sin embargo, las jornadas nuevas deben guardar `vehiculoId` y `medidorId` cuando la asignación exista. No se sobrescriben ventas ni jornadas históricas para convertirlas con la configuración vigente.

## Regla de operación

Si una jornada de agua medida no tiene `vehiculoId` o `medidorId`, la interfaz debe mostrar la referencia como pendiente y no debe inventar un ID. El ADMIN debe completar la asignación antes de iniciar la jornada. La venta conserva `jornadaId`, `vehiculoId`, `medidorId`, `tarifaSnapshot`, `litrosPorUnidad`, `incrementoContadorPorUnidad`, lecturas calculadas y saldo de agua.

## Medidor físico

El medidor se representa como lectura acumulativa de seis dígitos. El sexto dígito aumenta cada 10 L. Esta descripción pertenece a la escala física del instrumento y no debe confundirse con la conversión comercial. La conversión de un garrafón —por ejemplo, `20 L` y `+2` unidades del contador— permanece en la configuración de medición/tarifa y en el snapshot de la jornada/venta.

## Qué no cambia

No se solicita lectura física después de cada cliente. Solo se capturan físicamente lectura inicial y lectura final. No se modifica el bloqueo de sobreventa, la cola offline, la idempotencia, el cierre, la conciliación ni la separación entre precio, litros y contador.

## Service worker y precaché

El cambio se publica con `CACHE_VERSION = 'v1.2.0'`. El archivo `referencias-operativas.js` se incluye en el app shell para que la resolución de referencias esté disponible también cuando el dispositivo trabaja sin conexión.

## Alcance de esta versión

Esta bitácora acompaña el ajuste de consumo en las pantallas del REPARTIDOR. La creación y administración de las colecciones `vehiculos` y `medidores`, así como la conversión del formulario de zona de texto libre a selectores administrativos, son parte de la configuración ADMIN y deben publicarse con sus propias validaciones y reglas antes de considerarse completas.
