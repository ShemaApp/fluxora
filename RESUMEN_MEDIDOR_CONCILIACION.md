# Revisión del modelo central: medidor y conciliación

## Cadena operativa implementada

La operación queda organizada como:

```text
EMPRESA
  ↓
LOCALIDAD / ZONA
  ↓
REPARTIDOR
  ↓
VEHÍCULO / PIPA
  ↓
MEDIDOR
  ↓
CLIENTES ASIGNADOS
  ↓
VENTAS
  ↓
LECTURA FINAL
  ↓
CONCILIACIÓN
  ↓
CIERRE DE JORNADA
```

El repartidor solo puede operar clientes cuyo `zonaChoferId` corresponde a su usuario. La zona administrativa concentra vehículo, medidor y factor comercial de litros por garrafón.

## Jornada del repartidor

La pantalla `jornada.js` ahora realiza la siguiente secuencia:

| Paso | Resultado |
|---|---|
| Selección de zona | Solo muestra zonas asignadas al repartidor. |
| Selección de vehículo | El vehículo se hereda de la zona; no se captura libremente durante la operación. |
| Medidor | El medidor se hereda del vehículo/zona y se muestra como dato asociado. |
| Última lectura | Se calcula a partir de la última jornada cerrada del vehículo y aparece como **solo lectura**. |
| Lectura inicial | El repartidor la captura y el sistema rechaza valores menores que la última lectura. |
| Jornada abierta | Se registra usuario, zona, vehículo, medidor, lectura anterior, lectura inicial, fecha y factor de equivalencia. |
| Lectura final | Se captura al finalizar la ruta y debe ser mayor o igual que la lectura inicial. |
| Cierre | Se calculan litros medidos, litros vendidos, otras salidas y diferencia. |

El sistema impide abrir otra jornada mientras existe una jornada abierta para el alcance operativo del usuario.

## Datos conservados por jornada

La colección `jornadas` conserva:

| Campo | Uso |
|---|---|
| `repartidorId`, `repartidorNombre` | Trazabilidad de quién operó y cerró. |
| `zonaId`, `zonaNombre` | Alcance operativo de la jornada. |
| `vehiculo` | Vehículo/pipa utilizado. |
| `medidorId` | Medidor físico asociado. |
| `lecturaAnterior` | Última lectura cerrada; no se permite modificarla en una actualización del repartidor. |
| `lecturaInicial` | Inicio del turno; queda protegido. |
| `lecturaActual` | Última lectura registrada. |
| `lecturaFinal` | Lectura física al cierre. |
| `litrosMedidos` | `lecturaFinal - lecturaInicial`. |
| `litrosVendidos` | Litros calculados desde las ventas del periodo de la jornada. |
| `otrasSalidasLitros` | Salidas autorizadas que no corresponden a una venta. |
| `diferenciaLitros` | Litros medidos menos ventas y otras salidas. |
| `diferenciaGarrafones` | Diferencia expresada con el factor configurado. |
| `ventasRegistradas` | Número de ventas encontradas en el periodo. |
| `explicacionDiferencia` | Justificación capturada por ADMIN. |
| Fechas y usuarios | Inicio, cierre, usuario de cierre y usuario que explicó la diferencia. |

## Fórmula de conciliación

```text
Litros medidos = Lectura final − Lectura inicial

Diferencia = Litros medidos − (Litros vendidos + Otras salidas autorizadas)

Diferencia comercial = Diferencia ÷ Litros por garrafón configurados
```

Si el artículo ya trae litros explícitos (`litrosVendidos` o `litros`), se utiliza ese valor. Si no, se calcula con `cantidad × factorMedidor`. El valor inicial de referencia es 20 litros por garrafón, pero ADMIN puede configurar otro factor por zona/vehículo.

Por ejemplo, con lectura inicial `13247.9` y final `13347.9`, el consumo medido es `100 L`. Si las ventas suman `87 L` y no existen otras salidas, la diferencia es `13 L`; con un factor de `20 L` equivale a `0.65 garrafones`.

## Vista de ADMIN

ADMIN ve en **Jornada y Medidor** una lista de jornadas cerradas con zona, repartidor, vehículo, medidor, lecturas, litros medidos, litros vendidos, otras salidas y diferencia. También puede registrar:

- litros de otras salidas autorizadas;
- explicación de la diferencia;
- usuario y fecha de la explicación.

La pantalla no usa la captura operativa del repartidor: para ADMIN es una vista de control y conciliación.

## Assignment Management UI

En `jerarquia.js`, la Empresa puede configurar por cada zona:

- localidades agrupadas;
- chofer responsable;
- vehículo/pipa;
- ID de medidor;
- factor de litros por garrafón;
- clientes asignados.

El flujo administrativo conserva la relación como una asignación operativa, no como campos aislados. Al cambiar vehículo o chofer de una zona, se propagan las referencias operativas a los clientes de esa zona.

## Seguridad aplicada

Las reglas de Firestore protegen `lecturaAnterior`, `lecturaInicial`, `vehiculo`, `medidorId` y `zonaId` contra cambios realizados por el repartidor. ADMIN mantiene la capacidad de revisar y corregir datos administrativos. El repartidor solo puede leer y actualizar jornadas asociadas a su propio `repartidorId`.

## Compatibilidad con las pantallas existentes

| Pantalla | Conexión |
|---|---|
| `ruta.js` | Consume la carga/ruta y registra ventas del cliente fijo. |
| `ventas-offline.js` | Conserva ventas en cola local cuando no hay conexión. |
| `inventario.js` | ADMIN controla existencias y cargas transferidas al vehículo. |
| `clientes.js` | ADMIN mantiene clientes y asignaciones; el repartidor no usa el CRUD completo. |
| `creditos.js` | Recibe las ventas a crédito y pagos. |
| `gerencia.js` | Mantiene caja administrativa; el cierre de jornada alimenta la conciliación operativa. |
| `reportes.js` | El respaldo incluye ahora `jornadas`; los reportes de operación permanecen para ADMIN. |

## Validación

Se verificó la sintaxis de todos los módulos JavaScript, la existencia de campos de lectura y conciliación, el vínculo de medidor en la jerarquía, la protección de lecturas en las reglas y la persistencia del módulo `jornada.js` en el HTML y el service worker.
