# FLUXORA — Limpieza del núcleo operativo

## Alcance

Esta iteración convierte el proyecto en una base directamente relacionada con la distribución y venta de agua medida por medidor de flujo. El criterio aplicado fue conservar el flujo de ADMIN y REPARTIDOR alrededor de localidad, cliente fijo, jornada, vehículo, medidor, carga, litros, garrafones, tarifa, efectivo, crédito, caja, conciliación, inventario operativo y reportes.

No se conservaron pantallas o cableados cuyo propósito principal fuera gestionar pedidos genéricos, transferencias logísticas, QR, GPS, mapas, seguimiento, WhatsApp o venta administrativa desconectada de la jornada de agua. La limpieza se hizo en el clon autorizado `ShemaApp/fluxora`; no se modificó otro repositorio.

> La limpieza elimina código del proyecto porque el usuario confirmó que no existen datos importantes conectados a esta base. El punto de retorno previo debe conservarse antes de usar esta versión en pruebas con datos reales.

## Archivos retirados

| Archivo o bloque | Acción | Motivo |
|---|---|---|
| `pedidos.js` | Eliminado del proyecto | Módulo de pedidos genéricos, venta administrativa desconectada, asignaciones y entregas que no pertenecen al flujo de agua medida. |
| `rutas-repartidores.js` | Eliminado del proyecto | Módulo heredado de rutas geográficas, mapas, GPS, QR, WhatsApp y transferencias logísticas. |
| `BarcodeScanner` en `app-core.js` | Eliminado | Ya no existe ningún consumidor de escáner de cámara/QR. |
| `distanciaMetros` y `RADIO_VISITA_METROS` en `app-core.js` | Eliminados | Cálculo de distancia y validación de proximidad de visita fuera del modelo rector. |
| Permisos de `/pedidos`, `/rutas` y `/ubicacion_auditoria` en `firestore.rules` | Eliminados | Las reglas ya no declaran colecciones del modelo logístico legado. |
| Campos `zonaId`, `zonaNombre`, `zonaChoferId`, `zonaChoferNombre` y `zonaVehiculo` en la asignación de cliente | Eliminados | La unidad operativa actual es `localidadId`; no se escribe compatibilidad de zona en nuevas operaciones. |

## Archivos reemplazados o simplificados

| Archivo | Resultado |
|---|---|
| `clientes.js` | Reescrito como módulo de clientes fijos por localidad. Conserva búsqueda, estado, crédito, domicilio, historial, tarifa habitual y asignación operativa. Retira QR, GPS, geolocalización, validación de proximidad, teléfono y acciones de contacto. |
| `reportes.js` | Reescrito para ventas de agua, tarifas, unidades, litros, precio unitario, subtotales, efectivo, crédito, jornadas cerradas y conciliación. Incluye exportación CSV y Excel. |
| `ventas-offline.js` | La cola queda limitada a ventas de agua medida con `jornadaId`, `localidadId`, `vehiculoId`, `medidorId`, snapshot de tarifa, lectura lógica, litros, crédito, idempotencia y actualización atómica. No conserva campos de transferencia o teléfono. |
| `ruta.js` | Mi Ruta ya no recibe ni busca documentos de `rutas`. Usa la jornada abierta, localidad asignada, vehículo y medidor; la clave local de atendidos depende de `jornadaId`. |
| `repartidores.js` | Sustituye la pantalla heredada por un panel ADMIN mínimo de repartidores, localidades, vehículo, medidor, jornadas y carga de agua. |
| `productos.js` | Conserva productos comerciales e inventario relacionado, pero elimina el botón de cámara/escáner. El código de barras puede capturarse manualmente. |
| `creditos.js` | Conserva créditos y abonos ADMIN, pero la captura de abono queda limitada a efectivo. |
| `gerencia.js` | Renombra pedidos como ventas, elimina `transferenciaId` de incidencias nuevas y muestra incidencias de operación de agua. |
| `app.js`, `dashboard.js`, `hooks/useSesion.js`, `index.html` y `sw.js` | Retiran estados, suscripciones, accesos, scripts y precaché de pedidos/transferencias heredadas. ADMIN conserva la navegación del núcleo; REPARTIDOR conserva únicamente la experiencia operativa. |
| `db/colecciones.js` | El registro central conserva solo colecciones activas del modelo actual: clientes, localidades, jornadas, lecturas, notas, tarifas, vehículos, medidores, productos, créditos, inventario, caja, gastos y metadatos. |

## Núcleo conservado

El sistema conserva la secuencia operativa del REPARTIDOR: iniciar jornada, reconocer localidad/vehículo/medidor, registrar carga, capturar lectura física inicial, abrir Mi Ruta, seleccionar cliente fijo, indicar cantidad comercial, calcular litros e incremento lógico, registrar efectivo o crédito, guardar la venta y continuar. El cierre conserva la lectura física final y la conciliación contra las ventas calculadas.

La lectura física no se solicita después de cada cliente. Las ventas guardan la lectura lógica antes y después, la equivalencia comercial, los litros, el incremento del contador, el saldo de agua, el snapshot de la tarifa y las referencias congeladas de jornada, localidad, vehículo y medidor.

ADMIN conserva configuración de localidades, repartidores, vehículos, medidores, tarifas, clientes, inventario operativo, cargas, créditos, caja, reportes y conciliación. La administración se mantiene como supervisión y configuración; no se usa para sustituir la operación diaria del REPARTIDOR.

## Validaciones realizadas

| Validación | Resultado |
|---|---|
| `node --check` sobre todos los archivos JavaScript | Correcta |
| Parseo de `manifest.json` | Correcto |
| `git diff --check` | Correcto |
| Referencias a símbolos retirados (`pedidos`, `rutas`, QR, GPS, BarcodeScanner, colecciones eliminadas) en los archivos activos | Ninguna en la auditoría acotada |
| Propiedades usadas de `COLECCIONES` contra `db/colecciones.js` | Todas definidas |
| Compilación local de `firestore.rules` con Firestore Emulator | Correcta |
| Servidor HTTP local y carga de `index.html` | Correcta |
| Carga visual del login en navegador | Correcta |
| Consola del navegador | Sin errores de carga; permanece la advertencia conocida de App Check no configurado y la advertencia deprecada de persistencia multi-tab |

La validación autenticada completa de ADMIN y REPARTIDOR no se ejecutó porque no se proporcionaron credenciales de prueba. Debe realizarse antes de usar el bloque con operaciones reales.

## Datos y reglas de Firebase

Esta limpieza modifica localmente y versiona `firestore.rules` para retirar los permisos de pedidos, rutas y auditoría de ubicación. El archivo no se despliega automáticamente a Firebase por publicar en GitHub Pages. El entorno remoto de Firestore conserva sus reglas actuales hasta ejecutar un despliegue explícito y autorizado al proyecto `fluxora-appe`.

La eliminación de módulos no borra documentos de Firestore por sí misma. Las colecciones heredadas, si existen en el proyecto remoto, no son eliminadas automáticamente por esta iteración.

## Reversión

El punto de retorno previo a esta limpieza es el tag `pre-limpieza-v1.4.0` y el commit publicado `b05a697`. Para revertir el código del repositorio se debe restaurar ese punto en una rama de trabajo, revisar el diff y publicar una reversión independiente. No se debe ejecutar un despliegue remoto de reglas como parte de una reversión de GitHub Pages sin confirmar primero el proyecto y el efecto en Firebase.

## Diagnóstico posterior

Si falla el acceso inicial, revisar `app.js`, `hooks/useSesion.js`, `index.html` y `sw.js`. Si falla la venta, revisar `ruta.js` y `ventas-offline.js`. Si falla la lectura o el cierre, revisar `jornada.js`, `lecturas_medidor`, `firestore.rules` y la conciliación. Si falla la administración de asignaciones, revisar `repartidores.js`, `jerarquia.js` y `referencias-operativas.js`.

La siguiente prueba debe cubrir una jornada completa offline y online: carga de agua, lectura inicial, dos ventas con tarifas diferentes, una venta a crédito, continuidad de lectura lógica, sincronización idempotente, lectura final física, conciliación y cierre.

## Referencias internas

- `documentación versiones/01_modelo_operativo`
- `documentación versiones/03_medidor_y_conciliacion`
- `documentación versiones/11_migracion_localidad`
- `documentación versiones/13_reglas_localidad`
- `documentación versiones/14_depuracion_repartidor`
- `documentación versiones/10_flujo_desarrollo`
