# Revisión de pantallas operativas

## Criterio rector

Cada pantalla fue evaluada contra la cadena **medidor → agua dispensada → garrafones/litros → cliente → efectivo/crédito → inventario → caja → conciliación → cierre**. No se agregaron roles, APIs, colecciones ni módulos ajenos a esa cadena.

## ADMIN

La navegación administrativa queda organizada con los módulos existentes, sin crear CRUD paralelos:

| Pantalla visible | Módulo | Responsabilidad |
|---|---|---|
| Inicio | `dashboard.js` | Resumen administrativo. |
| Asignaciones / Zonas | `jerarquia.js` | Empresa → localidad/zona → repartidor → vehículo → medidor → clientes. |
| Clientes fijos | `clientes.js` | Ficha maestra, saldo, crédito, ventas e historial. |
| Productos / Tarifas | `productos.js` | Catálogo de agua/productos y precios. |
| Inventario de agua | `inventario.js` | Existencias, entradas, salidas, cargas y transferencias reales. |
| Cargas / Transferencias | `ruta.js` | Preparación y control de carga de los vehículos. |
| Repartidores / Cargas | `rutas-repartidores.js` | Supervisión de cargas, comprobantes e historial. |
| Créditos / Abonos | `creditos.js` | Saldos, crédito y abonos. |
| Caja | `gerencia.js` | Ventas efectivo + pagos de crédito − salidas autorizadas. |
| Conciliaciones | `jornada.js` | Lecturas, litros medidos, ventas, otras salidas y diferencias. |
| Reportes operativos | `reportes.js` | Ventas, créditos, inventario, cargas, cierres y respaldo. |
| Configuración | `config.js` | Cuenta, usuarios ADMIN/REPARTIDOR y permisos. |

La pantalla `jerarquia.js` sigue siendo una **Assignment Management UI**: localidad/zona, repartidor, vehículo, medidor y clientes se administran como relaciones operativas, no como campos aislados.

## REPARTIDOR

La experiencia del repartidor se limita a:

| Pantalla | Uso |
|---|---|
| Inicio | Entrada a la operación diaria. |
| Mi Jornada | Vehículo, medidor, última lectura, lectura inicial, clientes autorizados y cierre. |
| Mi Ruta | Conjunto ordenado de clientes de su alcance y carrito de venta. |
| Créditos / Abonos | Registro de crédito y abonos cuando el permiso operativo lo permite. |

El repartidor no recibe jerarquía administrativa, configuración global, usuarios, vehículos de otros repartidores, clientes fuera de alcance, inventario global, reportes globales, permisos ni auditoría global.

## Nueva pantalla principal operacional

`jornada.js` se conectó con `app.js` para que **Mi Jornada** sea una interfaz orientada a acciones. Cuando existe jornada abierta muestra vehículo, medidor, lectura anterior solo lectura, lectura inicial, clientes asignados y botón `Vender`. El botón redirige a la ruta operacional existente; no crea una segunda venta.

La lista de clientes se filtra por `zonaId` de la jornada y solo marca atendidos a partir de ventas registradas durante la jornada. El cierre permanece en la misma pantalla y registra lectura final, litros medidos, litros vendidos, otras salidas y diferencia.

## Limpieza de funciones fuera de alcance

Se auditaron y ocultaron acciones de teléfono, WhatsApp, contacto, GPS, mapas, tracking, geolocalización, rutas geográficas, QR y rutas alternativas. La limpieza fue selectiva: no se borraron automáticamente archivos mixtos. Cuando una función heredada no podía retirarse sin reescribir un módulo completo, quedó inaccesible desde la navegación y documentada como deuda técnica.

## Conexiones conservadas

`clientes.js` alimenta la ruta con clientes fijos; `ruta.js` registra la venta y consume la carga; `ventas-offline.js` conserva borradores y cola offline; `creditos.js` actualiza saldos y abonos; `inventario.js` administra existencias y transferencias; `gerencia.js` calcula la caja; y `jornada.js` concilia el medidor contra ventas y otras salidas autorizadas.

## Validación

Se verificó la sintaxis de todos los módulos JavaScript, la navegación diferenciada por rol, la presencia de `Mi Jornada`, `Vender`, `Mi Ruta`, `Conciliaciones` y `Asignaciones / Zonas`, así como la ausencia de nuevos módulos no solicitados.
