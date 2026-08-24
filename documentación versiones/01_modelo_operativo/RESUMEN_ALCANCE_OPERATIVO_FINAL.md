# Revisión final del alcance operativo

## Modelo rector

La app queda enfocada exclusivamente en **venta y distribución de agua mediante vehículos/pipas, medidores físicos y conciliación**. La ruta significa un conjunto ordenado de clientes asignados; no es una ruta geográfica ni una navegación GPS.

Los roles funcionales siguen siendo únicamente **ADMIN** y **REPARTIDOR**.

## Clientes operativos fijos

La pantalla de clientes ya no presenta el teléfono como dato principal, ni ofrece captura de ubicación, miniatura QR o acciones de contacto. La ficha prioriza:

| Prioridad | Información |
|---|---|
| Identificación | ID fijo y nombre del cliente. |
| Asignación | Localidad, zona, chofer y vehículo heredados. |
| Operación | Estado activo, venta, garrafones/litros y forma de pago real. |
| Crédito | Saldo, crédito vigente y acceso a historial/abonos según permiso. |
| Historial | Ventas y formas de pago registradas. |

El botón QR y el bloque de captura de ubicación quedaron fuera de la experiencia visible. La gestión de clientes permanece como función administrativa; el repartidor opera desde su lista de ruta.

## Eliminación de mapas, GPS y QR

Se retiraron de la navegación y de los permisos las funciones de mapa, ubicación, tracking, geolocalización, caminos alternativos, QR de rutas y venta por QR. Se eliminó del HTML base la dependencia `html5-qrcode`.

En `rutas-repartidores.js`, la supervisión de ADMIN conserva cargas activas, comprobantes e historial, pero ya no ofrece submenús de mapa ni Clientes QR. En `reportes.js`, la pestaña de ubicación y la tarjeta de impresión de códigos QR fueron retiradas.

Algunos helpers históricos de GPS/QR permanecen físicamente en módulos heredados para evitar una reescritura riesgosa; no tienen acceso desde el menú ni permisos operativos y están documentados como deuda técnica de limpieza. No se reemplazaron por funcionalidades equivalentes.

## Inventario ligado a operación real

El inventario se mantiene para ADMIN porque representa agua disponible, productos, entradas, salidas, existencias y cargas transferidas a una ruta. La conexión operativa es:

```text
Inventario de agua y garrafones
        ↓
Carga / transferencia asignada
        ↓
Vehículo y jornada
        ↓
Venta de cliente fijo
        ↓
Consumo de inventario y cierre
```

El repartidor no administra el inventario maestro. Consume únicamente la carga asignada a su ruta.

## Crédito y abonos

El cierre de venta continúa usando la forma de pago real:

```text
VENTA
  ├── EFECTIVO → Caja
  └── CRÉDITO → Saldo del cliente → Abono → Nuevo saldo
```

La venta a crédito queda registrada en `creditos`, con saldo inicial, abonos, monto, fecha, forma de pago y usuario capturador. El permiso operativo actual permite al repartidor registrar ventas a crédito y registrar abonos cuando corresponde; ADMIN mantiene control completo.

## Caja

`gerencia.js` calcula la caja sobre operaciones reales del día y, para ADMIN, consolida los movimientos de todos los usuarios:

```text
Efectivo esperado = Ventas en efectivo + Pagos de crédito en efectivo − Salidas autorizadas en efectivo
```

Las salidas autorizadas se registran en `gastos` con monto, motivo, destinatario, forma de pago y usuario. El cierre conserva venta efectivo, abono efectivo, gasto efectivo, fórmula, efectivo esperado, clientes atendidos e incidencias de inventario.

Las ventas a crédito y las ventas no cobradas en efectivo no se suman a caja. Los gastos pagados por tarjeta se registran como información separada y no reducen el efectivo esperado.

## Jornada y conciliación

La pantalla `jornada.js` conserva la secuencia de vehículo, medidor, lecturas, ventas y cierre. ADMIN ve las jornadas cerradas y puede registrar otras salidas autorizadas en litros y explicar diferencias.

```text
Litros medidos = Lectura final − Lectura inicial

Diferencia = Litros medidos − (Litros vendidos + Otras salidas autorizadas)
```

La diferencia también se convierte a garrafones con el factor configurado por zona/vehículo. La lectura anterior y la lectura inicial quedan protegidas contra edición del repartidor.

## Estado final por pantalla

| Módulo | Estado final |
|---|---|
| `clientes.js` | Ficha de clientes operativos; sin contacto, GPS o QR visibles. |
| `ruta.js` | Flujo de carga, clientes asignados y venta del repartidor. |
| `jornada.js` | Vehículo, medidor, lecturas, litros y conciliación. |
| `jerarquia.js` | Asignación Empresa → Zona/Localidad → Chofer → Vehículo → Medidor → Clientes. |
| `inventario.js` | Inventario real y movimientos ligados a cargas/consumos. |
| `creditos.js` | Saldos, créditos y abonos. |
| `gerencia.js` | Caja y cierre con ventas efectivo, abonos y salidas autorizadas. |
| `rutas-repartidores.js` | Supervisión administrativa de cargas, comprobantes e historial; sin mapa/QR. |
| `reportes.js` | Reportes operativos y respaldo de jornadas; sin ubicación/QR. |

## Validación

Se validó la sintaxis de todos los módulos JavaScript. También se verificó la presencia de cálculos de caja, lecturas y diferencias; el vínculo de medidor en asignaciones; la desaparición del script QR del HTML; la ausencia de controles visibles de contacto, captura de ubicación y QR en la ficha; y la integridad del ZIP final.
