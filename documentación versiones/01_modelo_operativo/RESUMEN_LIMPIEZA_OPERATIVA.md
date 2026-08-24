# Limpieza operativa del sistema de agua

## Contexto rector aplicado

La aplicación se ajustó al modelo real de **venta y distribución de agua en garrafones mediante vehículos/pipas, medidores físicos y conciliación de lecturas**. No se creó ni se habilitó un tercer rol futuro.

Los únicos roles funcionales son:

| Rol | Experiencia |
|---|---|
| **ADMIN** | Administra asignaciones, clientes, zonas, choferes, vehículos, productos, tarifas, inventario, cargas, créditos, pagos, operaciones, jornadas, cierres, conciliaciones, reportes y configuración. |
| **REPARTIDOR** | Inicia jornada, captura medidor, consulta su ruta, atiende clientes fijos, registra garrafones/litros, elige pago real, cierra jornada y entrega datos para conciliación. |

Las cuentas existentes con un rol distinto de `admin` o `repartidor` no reciben una tercera experiencia: quedan bloqueadas con un mensaje para que la Empresa Administrativa actualice su perfil.

## Pantallas visibles por rol

| Pantalla | ADMIN | REPARTIDOR | Función final |
|---|---:|---:|---|
| Inicio | Sí | Sí | Resumen contextual. |
| Asignaciones / Jerarquía | Sí | No | Empresa → Zona/Localidad → Chofer → Vehículo → Clientes. |
| Clientes | Sí | No | Ficha maestra y asignación operativa. El chofer consulta desde su ruta. |
| Jornada y Medidor | Sí | Sí | Lectura inicial, lectura final, litros medidos y cierre de jornada. |
| Mi Ruta / Carga | Sí, supervisa/carga | Sí, opera | Transferencia, carga de vehículo y carrito de venta. |
| Control de distribución | Sí | No | Supervisión de cargas, comprobantes e historial. |
| Productos | Sí | No | Catálogo, precios y tarifas. |
| Inventario | Sí | No | Existencias, movimientos y carga asignada. |
| Créditos | Sí | Sí, si registra pagos | Deudas, abonos y saldos. |
| Reportes | Sí | No | Ventas, créditos, cargas, inventario y auditoría. |
| Gerencia | Sí | No | Caja, gastos y cierre administrativo. |
| Venta administrativa | Sí | No | Venta interna/administrativa excepcional; no es el flujo del repartidor. |

## Pantallas y funcionalidades retiradas de la experiencia operativa

Se retiraron del menú y de la experiencia del repartidor los módulos de clientes completos, pedidos genéricos, control de distribución, productos, inventario, reportes y gerencia. La pantalla `ruta.js` queda como el único camino operativo del chofer para la ruta y el carrito.

En `rutas-repartidores.js`, el repartidor ya no recibe la pantalla de supervisión. Para ADMIN se conservaron únicamente las vistas de **Cargas activas**, **Comprobantes** e **Historial**. Se retiraron de la navegación los submódulos de mapa y Clientes QR.

También se retiró la librería externa `html5-qrcode` del HTML base. Los controles visibles de QR y referencia GPS quedaron deshabilitados en la ficha de cliente. En Reportes se retiraron la pestaña de ubicación y la tarjeta de impresión de códigos QR.

Algunas funciones heredadas de GPS, mapa y QR permanecen físicamente en archivos antiguos como código no alcanzable desde la navegación actual. Se documentan como deuda técnica para una segunda limpieza de código; no se exponen ni se conceden permisos para ejecutarlas.

## Conexión operativa final

```text
ADMIN
  │
  ├── Asignaciones
  │     └── Zona + Localidades + Chofer + Vehículo + Clientes
  │
  ├── Inventario
  │     └── Carga / transferencia asignada a una ruta
  │
  ├── Jornada y Medidor
  │     └── Lecturas inicial y final, litros medidos, conciliación
  │
  └── Reportes / Créditos / Gerencia
        └── Control global

REPARTIDOR
  │
  ├── Jornada y Medidor
  │     ├── Selecciona zona y vehículo
  │     ├── Captura lectura inicial
  │     └── Captura lectura final y cierra jornada
  │
  └── Mi Ruta / Carga
        ├── Recibe carga asignada
        ├── Atiende clientes de sus zonas
        ├── Registra garrafones y litros equivalentes
        ├── Registra efectivo o crédito real
        └── Deja ventas para caja, créditos y conciliación
```

La colección `jornadas` almacena `repartidorId`, `zonaId`, `vehiculo`, `lecturaInicial`, `lecturaFinal`, `litrosMedidos`, estado y fechas. La diferencia se deja disponible para la conciliación administrativa posterior con los garrafones/litros registrados en ventas y la carga transferida.

## Persistencia offline

La jornada conserva un borrador local con zona, vehículo y lectura inicial. Firestore mantiene la persistencia local existente para los datos sincronizados y la cola de ventas offline conserva el registro de efectivo/crédito cuando el dispositivo no tiene conexión. El respaldo administrativo incluye ahora la colección `jornadas`.

## Referencias heredadas al rol `usuario`

La auditoría encontró referencias en `sesion.js`, `config.js` y el fallback de `hooks/useSesion.js`. Se aplicaron estos cambios:

| Referencia | Tratamiento |
|---|---|
| Plantilla de permisos `usuario` | Eliminada de permisos, pestañas y edición. |
| Alta de usuarios | Solo permite `admin` o `repartidor`; el valor inicial es `repartidor`. |
| Fallback de sesión | Ya no crea una sesión con `role: "usuario"`; marca la cuenta como `accesoBloqueado`. |
| Pantalla de cuenta heredada | Se muestra bloqueo, no menú ni experiencia operativa. |
| Reglas Firestore | Creación y actualización de perfiles restringida a `admin` o `repartidor`. |

No se diseñó un tercer rol, no se agregaron pantallas futuras y no se creó lógica de permisos para un rol adicional.

## Archivos modificados en esta limpieza

| Archivo | Cambio |
|---|---|
| `sesion.js` | Solo ADMIN/REPARTIDOR; GPS y cámara/QR sin permisos; menú operativo reducido. |
| `config.js` | Alta de usuarios limitada a ADMIN o REPARTIDOR. |
| `hooks/useSesion.js` | Fallback desconocido bloqueado; suscripción a jornadas. |
| `app.js` | Nueva pantalla Jornada y Medidor; menú por rol simplificado. |
| `jornada.js` | Nuevo flujo de jornada, medidor y cierre con borrador local. |
| `db/colecciones.js` | Nueva colección `JORNADAS`. |
| `firestore.rules` | Reglas para jornadas y validación de roles. |
| `rutas-repartidores.js` | Menú sin mapas ni Clientes QR; queda orientado a supervisión ADMIN. |
| `clientes.js` | GPS/QR no visibles; conserva ficha y asignaciones administrativas. |
| `reportes.js` | Sin ubicación ni tarjeta QR; respaldo incluye jornadas. |
| `index.html` | Se eliminó `html5-qrcode` y se cargó `jornada.js`. |
| `sw.js` | Caché actualizado para el módulo de jornada. |

## Validación realizada

Se validó la sintaxis de los módulos JavaScript, la presencia de `jornada.js`, la colección `jornadas`, el bloqueo del rol desconocido, la ausencia de la opción `usuario` en Configuración, la reducción de menús para REPARTIDOR y la inclusión de la jornada en el service worker.
