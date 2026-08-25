# Iteración 23 — Relleno por medición, borradores, firma y comprobante

## 1. Propósito

Esta iteración agrega un servicio independiente para clientes cuyo método es **Medido por medidor**. El flujo permite capturar dos marcadores del recipiente o contenedor, calcular el volumen facturable con la misma configuración comercial vigente, guardar borradores locales para firmarlos posteriormente y generar una nota PDF asociada al servicio.

La funcionalidad no sustituye la venta doméstica por cantidad, no convierte al cliente en un medidor físico del camión y no agrega mapas, GPS, tracking, QR, llamadas ni un módulo de WhatsApp. La única integración de WhatsApp prevista es compartir la nota PDF o, cuando el navegador no puede adjuntar archivos, compartir el enlace de descarga del PDF.

## 2. Formulario vigente del cliente

El editor administrativo conserva únicamente estos campos funcionales:

| Campo | Contrato |
|---|---|
| Nombre | Nombre visible del cliente fijo. |
| Localidad | Localidad existente y ya asignada a un repartidor. |
| Método de servicio | `Doméstica` para la venta normal por cantidad; `Medido por medidor` para el servicio facturado por marcadores. |
| Teléfono | Dato auxiliar del cliente; no crea una agenda ni acciones de llamadas. |
| Tarifa | Tarifa activa existente seleccionada del catálogo. |
| Estado | Activo o inactivo, conservado como control operativo. |

El identificador interno del documento de Firestore no se muestra como parte de la ficha operativa. El repartidor solo debe recibir clientes dentro del alcance de las localidades asignadas.

## 3. Cálculo del servicio

El repartidor captura exclusivamente `marcadorInicial` y `marcadorFinal`. Ambos deben ser enteros no negativos y el marcador final no puede ser menor al inicial.

```text
incrementos del recipiente = marcadorFinal - marcadorInicial
litros rellenados = incrementos del recipiente × litrosPorIncremento
unidades comerciales = litros rellenados ÷ tarifaSnapshot.litrosPorUnidad
incremento lógico del camión = unidades comerciales × tarifaSnapshot.incrementoContadorPorUnidad
total facturado = unidades comerciales × tarifaSnapshot.precioUnitario
```

Los resultados son de solo lectura en la interfaz. No existe redondeo silencioso: las unidades comerciales se conservan como decimal cuando la equivalencia de litros lo produce. La tarifa queda copiada en `tarifaSnapshot`, por lo que modificar una tarifa después no recalcula servicios históricos.

## 4. Separación entre medición del servicio y jornada del camión

> **Los marcadores del recipiente pertenecen al servicio y a su nota; no son lecturas físicas del medidor del camión.**

La jornada mantiene sus lecturas físicas `lecturaInicial` y `lecturaFinal` sin ser reemplazadas por el marcador del cliente. El servicio no crea documentos en `lecturas_medidor` y no altera el registro físico de apertura o cierre.

Al finalizar un servicio firmado, la aplicación sí actualiza de forma transaccional el estado lógico de la misma jornada y vehículo:

| Estado de jornada afectado | Efecto |
|---|---|
| `aguaDisponibleLitros` | Disminuye exactamente por los litros rellenados. |
| `lecturaCalculadaActual` | Aumenta por la equivalencia comercial configurada. |
| `lecturaActual` | Se mantiene sincronizada con la lectura lógica calculada, no con un marcador físico. |
| `litrosVendidosAcumulados` | Aumenta por los litros rellenados para la conciliación volumétrica. |
| `lecturaInicial` / `lecturaFinal` | No se modifican desde este flujo. |
| `lecturas_medidor` | No se crea ni se actualiza por el marcador del cliente. |

El cierre suma los servicios completados de la jornada a los litros registrados, al incremento lógico calculado y al resumen por tarifa. La diferencia continúa comparando la lectura física final contra la lectura inicial más los incrementos lógicos, sin reescribir ventas ni lecturas físicas.

## 5. Borradores y firma agrupada

Un borrador no es un servicio finalizado ni aparece como nota histórica. Se guarda en `localStorage` con una clave separada por usuario, versión e identificador estable del borrador. Contiene los marcadores, el cálculo preliminar, la referencia de jornada, vehículo, medidor, localidad y el snapshot de tarifa utilizado en la medición.

El trabajador puede medir varios contenedores, guardar cada resultado como borrador y, posteriormente, seleccionar varios borradores para firmarlos en secuencia. Al confirmar cada firma se genera un servicio independiente. El sistema vuelve a leer dentro de la transacción el saldo de agua y la lectura lógica actuales; si otro servicio ya consumió el saldo o avanzó la lectura, la finalización se rechaza para evitar una aplicación duplicada o desfasada.

Los borradores se conservan localmente durante siete días. Guardar una medición como borrador no consume agua ni avanza el medidor lógico, por lo que puede conservarse mientras el trabajador termina el recorrido o espera una recarga. La firma final, el PDF y las escrituras de Firestore requieren conexión a Firebase en esta iteración; además, la finalización vuelve a comprobar el saldo suficiente y la lectura lógica vigente. La interfaz muestra el error si Storage, PDF o Firebase no están disponibles. Esto evita presentar un servicio como completado cuando todavía no existe un comprobante persistido.

## 6. Persistencia final

Cuando una firma se confirma se escriben dos documentos relacionados:

| Colección | Contenido |
|---|---|
| `servicios` | Cliente, jornada, repartidor, vehículo, medidor, marcadores, cálculo, snapshot de tarifa, total, firma, ruta del PDF y estado `completado`. |
| `comprobantes` | Folio, relación con servicio, cliente, ruta de Storage, URL de descarga, firma capturada, creador y estado. |

El PDF se guarda en Storage bajo una ruta del tipo:

```text
comprobantes/{uid}/{servicioId}.pdf
```

El importe del servicio se marca como `facturado` en reportes. No se agrega automáticamente a efectivo, crédito ni caja porque el requerimiento vigente describe notas para facturación y no definió el momento de cobro. Esta separación evita inflar el efectivo esperado o crear saldos de crédito sin una decisión de negocio explícita.

## 7. Historial y compartir

El historial de Clientes combina ventas normales y servicios completados del cliente. Las filas de relleno muestran marcadores, litros, unidades comerciales, tarifa, total facturado y acciones para:

- abrir la nota PDF;
- ver el detalle del servicio;
- compartir el PDF.

En navegadores móviles compatibles, compartir usa el archivo PDF como archivo adjunto mediante la capacidad nativa del navegador. Si el navegador no permite adjuntar archivos, se abre WhatsApp con un enlace HTTPS al PDF y la interfaz informa expresamente que se compartió un enlace, no un archivo adjunto automático.

## 8. Reportes y cierre

Los reportes incluyen los servicios completados dentro del periodo seleccionado, distinguen `Relleno por medición` de `Venta por cantidad`, agrupan por tarifa y separan `Efectivo`, `Crédito` y `Facturado`. Excel y CSV conservan el tipo de operación, el snapshot de tarifa, unidades, litros, subtotal y estado.

La hoja de conciliación incluye la cantidad de servicios medidos y sus litros, mientras que la caja no suma el estado `facturado` como efectivo recibido.

## 9. Reglas de integridad

La implementación debe preservar estas invariantes:

1. Un marcador final menor al inicial nunca produce un servicio.
2. Un servicio no puede consumir más litros que el saldo actual de la jornada.
3. La finalización comprueba que jornada, localidad, vehículo, medidor y repartidor correspondan entre sí.
4. La actualización de stock móvil, lectura lógica, acumulado de litros, servicio y comprobante ocurre en una operación de Firestore.
5. Una firma no puede finalizar dos veces el mismo borrador.
6. Una configuración de tarifa posterior no cambia históricos porque cada servicio guarda un snapshot.
7. El flujo normal de ventas continúa utilizando su propia cola y sus propias referencias de medidor físico.
8. La lectura física inicial y la lectura física final solo pertenecen al flujo de Jornada.

## 10. Reglas Firebase y despliegue

Los archivos `firestore.rules` y `storage.rules` quedan versionados localmente para revisión. No se despliegan automáticamente a Firebase. Antes de usar esta funcionalidad con datos reales debe revisarse y desplegarse explícitamente la política de Storage y la política de Firestore correspondiente al proyecto `fluxora-appe`.

## 11. Escenario de verificación

Con `marcadorInicial = 123478`, `marcadorFinal = 123489`, `litrosPorIncremento = 10`, una tarifa de `20 L` por unidad y `incrementoContadorPorUnidad = 2`:

```text
11 incrementos × 10 L = 110 L
110 L ÷ 20 L = 5.5 unidades comerciales
5.5 × 2 = +11 unidades del contador lógico
```

Si la jornada tenía 500 L disponibles, queda con 390 L. La lectura física inicial permanece intacta; la lectura lógica aumenta once unidades; el documento del servicio conserva los dos marcadores y el snapshot de la tarifa.

## 12. Pendiente de decisión comercial

La iteración deja deliberadamente fuera de caja y crédito el estado `facturado`. Falta definir si una nota firmada debe convertirse posteriormente en crédito, en efectivo cobrado o en una cuenta de facturación separada. Esa decisión deberá implementarse como una operación explícita y no como una inferencia del servicio de medición.
