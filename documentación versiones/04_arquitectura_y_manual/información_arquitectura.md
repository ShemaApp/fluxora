# Información de arquitectura

**Proyecto:** Sistema operativo para distribución y venta de agua medida por medidor  
**Estado:** Integración de medición y venta completada; auditoría estática posterior a la implementación  
**Roles funcionales:** `admin` y `repartidor`

## 1. Propósito rector

La aplicación está diseñada para la **venta y distribución de agua en vehículos/pipas**, controlada mediante lecturas de medidores físicos y conciliación de jornada. No es una plataforma de mapas, GPS, tracking, CRM, agenda de contactos, marketplace ni sistema logístico geográfico.

La palabra **ruta** significa el conjunto ordenado de clientes fijos asignados a un repartidor. No representa un recorrido calculado por GPS.

La prioridad operativa es:

```text
MEDIDOR
  ↓
AGUA DISPENSADA
  ↓
UNIDAD COMERCIAL / LITROS
  ↓
CLIENTE
  ↓
EFECTIVO / CRÉDITO
  ↓
INVENTARIO O CARGA
  ↓
CAJA
  ↓
CONCILIACIÓN
  ↓
CIERRE
```

## 2. Roles y aislamiento

### ADMIN

ADMIN configura y supervisa localidades, zonas, repartidores, vehículos, medidores, clientes fijos, asignaciones, unidad comercial, tarifas, productos, inventario, cargas, créditos, caja, jornadas, conciliaciones, reportes y configuración.

ADMIN no es requisito para que un repartidor abra una jornada, cargue agua, atienda clientes o cierre su operación. La administración consulta y corrige mediante operaciones autorizadas sin modificar lecturas históricas inmutables.

### REPARTIDOR

REPARTIDOR trabaja únicamente sobre su alcance autorizado: jornada, vehículo, medidor, zonas y clientes asignados. Puede iniciar jornada con lectura física inicial y carga de agua, registrar la cantidad comercial vendida por cliente, elegir efectivo o crédito, continuar offline, consultar la lectura acumulada calculada, capturar la única lectura física final y consultar el resultado de conciliación.

No recibe jerarquía administrativa, configuración global, usuarios, vehículos o medidores ajenos, clientes fuera de su alcance, inventario global, reportes globales ni permisos administrativos.

### Rol `usuario`

`usuario` no forma parte del modelo operativo. La aplicación no crea una experiencia para ese rol y una sesión con rol desconocido queda bloqueada antes de recibir menú o rutas operativas. Los perfiles válidos en la interfaz son `admin` y `repartidor`.

No se implementó ningún tercer rol futuro.

## 3. Jerarquía operativa

```text
EMPRESA
  ↓
LOCALIDAD / ZONA
  ↓
REPARTIDOR
  ↓
VEHÍCULO
  ↓
MEDIDOR
  ↓
CLIENTES FIJOS ASIGNADOS
  ↓
DESPACHOS / VENTAS
  ↓
CIERRE DE JORNADA
  ↓
CONCILIACIÓN
```

`jerarquia.js` concentra la **Assignment Management UI**. La administración no gestiona campos aislados sin relación: crea la zona con sus localidades, asigna un repartidor exclusivo, liga el vehículo y el medidor, y después asigna clientes fijos cuya localidad pertenece a esa zona.

Cada cliente conserva `zonaId`, `zonaNombre`, `zonaChoferId`, `zonaChoferNombre` y `zonaVehiculo`. El repartidor se obtiene de la zona; no se permite que el repartidor reasigne su propio alcance desde la operación.

## 4. Dos escalas de medición

La configuración administrativa vive en `config.js` mediante `ConfiguracionMedicion` de `medicion.js`, y se almacena en `_meta/medicion_venta`. El contexto `useSesion.js` la suscribe y la propaga a las pantallas operativas.

| Parámetro | Significado | Ejemplo |
|---|---|---:|
| `unidadComercial` | Unidad que se cobra y se registra en la venta. | Garrafón |
| `litrosPorUnidad` | Litros comerciales correspondientes a una unidad. | 20.00 L |
| `precioPorUnidad` | Precio comercial de una unidad. | $15.00 |
| `incrementoContadorPorUnidad` | Avance físico del contador que produce una unidad comercial. | 2.0000 |
| `unidadMostrada` | Nombre de la unidad física que muestra el instrumento. | Unidad de contador |
| `resolucion` / `decimales` | Precisión y formato de la lectura física. | 0.1 / 1 |

La equivalencia no mezcla escalas:

```text
1 Garrafón
  ├── 20.00 litros comerciales
  └── +2.0000 unidades del contador físico
```

Por tanto, `2.0` unidades del contador **no son 2 litros**. El valor físico se utiliza únicamente como incremento del medidor y los litros se calculan mediante `litrosPorUnidad`.

La zona puede conservar sus propios `litrosPorUnidad` e `incrementoContadorPorUnidad` para la operación asignada. Al iniciar la jornada se guarda una instantánea de `unidadComercial`, `litrosPorUnidad`, `incrementoContadorPorUnidad` y el precio base. Las tarifas configurables viven en la colección `tarifas` y cada venta selecciona una tarifa activa o la tarifa base de medición. La venta guarda un `tarifaSnapshot` completo; por ello un cambio posterior de ADMIN no recalcula ventas históricas.

### Tarifas configurables

Cada documento de `tarifas` define `tarifaId`, nombre, `unidadComercial`, `litrosPorUnidad`, `incrementoContadorPorUnidad`, `precioUnitario` y `activo`. El cliente puede conservar `tarifaHabitualId` como valor predeterminado. En la ruta, el botón **Cambiar tarifa** permite elegir otra tarifa activa únicamente para la venta actual; no modifica la ficha del cliente ni la jornada.

La regla inamovible es:

> **El precio nunca modifica el medidor. El medidor determina volumen; la tarifa determina valor monetario.**

## 5. Flujo diario

```text
LOGIN / SESIÓN
  ↓
RECONOCER REPARTIDOR
  ↓
SELECCIONAR ZONA, VEHÍCULO Y MEDIDOR ASIGNADOS
  ↓
MOSTRAR ÚLTIMA LECTURA SOLO LECTURA
  ↓
CAPTURAR LECTURA INICIAL
  ↓
CARGAR AGUA EN PLANTA
  ↓
INICIAR JORNADA Y RUTA
  ↓
CLIENTE FIJO
  ↓
DESPACHAR AGUA
  ↓
CAPTURAR CANTIDAD COMERCIAL
  ↓
CALCULAR INCREMENTO FÍSICO Y LECTURA ACUMULADA
  ↓
EFECTIVO O CRÉDITO
  ↓
GUARDAR Y MARCAR CLIENTE ATENDIDO
  ↓
SIGUIENTE CLIENTE
  ↓
LECTURA FINAL
  ↓
CONCILIACIÓN
  ↓
CIERRE
```

## 6. Jornada y continuidad del medidor

`jornada.js` administra la apertura, continuidad, lecturas y cierre. La lectura anterior procede de la última jornada cerrada del vehículo o de `zona.lecturaActual` y se presenta como **solo lectura**. La lectura inicial no puede ser menor que la anterior. Al iniciar también se registra la carga de agua en litros, que se convierte en saldo operativo de la jornada.

La jornada guarda el contexto de medición que estaba vigente al abrirse:

| Campo | Significado |
|---|---|
| `jornadaId` | Identificador de la operación diaria. |
| `repartidorId` | Repartidor responsable. |
| `zonaId` / `zonaNombre` | Alcance operativo. |
| `vehiculo` / `vehiculoId` | Vehículo seleccionado. |
| `medidorId` | Medidor asociado. |
| `lecturaAnterior` | Lectura previa, solo referencia. |
| `lecturaInicial` | Lectura física al comenzar. |
| `lecturaActual` | Última lectura acumulada calculada por ventas; se conserva por compatibilidad. |
| `lecturaFinal` | Lectura física al regresar; única lectura física manual de cierre. |
| `lecturaCalculadaActual` | Lectura acumulada calculada por ventas, no capturada físicamente. |
| `lecturaCalculadaFinal` | Lectura acumulada calculada al cierre a partir de las ventas. |
| `aguaCargadaLitros` | Carga inicial de agua asignada al vehículo para la jornada. |
| `aguaDisponibleLitros` | Saldo de agua restante; nunca puede ser negativo. |
| `unidadComercial` | Unidad comercial congelada para la jornada. |
| `litrosPorUnidad` | Conversión comercial congelada. |
| `incrementoContadorPorUnidad` | Conversión física congelada. |
| `precioPorUnidad` | Precio base congelado. |
| `fechaInicio` / `fechaCierre` | Tiempos de operación. |

La lectura física se registra en `lecturas_medidor` para apertura y cierre. Cada venta registra además una lectura de despacho calculada, marcada como no física. Las reglas de Firestore permiten crear estos registros al responsable autorizado, pero no permiten actualizarlos ni eliminarlos.

Firebase Firestore tiene persistencia local habilitada. Además, el formulario de jornada se guarda como borrador local para recuperar la selección si se recarga la aplicación antes de completar la operación.

## 7. Venta por medidor

`ruta.js` conserva el flujo móvil de tres pasos: **seleccionar cliente**, **capturar cantidad comercial** y **cerrar venta**. El repartidor no captura una lectura física después de cada cliente. La cantidad comercial es la entrada de la venta y la lectura acumulada física es un valor calculado, no editable.

Las fórmulas aplicadas son:

```text
Incremento calculado del contador
  = Cantidad comercial × Incremento físico por unidad

Lectura calculada después
  = Lectura calculada antes + Incremento calculado del contador

Litros comerciales
  = Cantidad comercial × Litros por unidad

Total de la venta
  = Cantidad comercial × Precio unitario de su tarifaSnapshot
```

El cálculo monetario se realiza por venta y por tarifa específica. Nunca se calcula el importe aplicando un precio sobre el total global de litros.

Con la configuración de referencia:

```text
1 número rojo = 10 L
1 Garrafón = 20 L
1 Garrafón = +2 unidades del contador
```

La lectura calculada se utiliza para continuidad, trazabilidad y control entre clientes. No sustituye la lectura física final de cierre.

Ejemplo con la configuración de referencia:

```text
Lectura calculada inicial: 100.0
Venta: 8 garrafones
Incremento calculado: 8 × 2.0 = 16.0 contador
Lectura calculada después: 116.0
Litros: 8 × 20 = 160 L
Total: 8 × $15 = $120
```

La venta conserva `jornadaId`, cliente, zona/localidad, repartidor, vehículo, medidor, lectura calculada antes/después, `incrementoContador`, `garrafones`, `litrosVendidos`, saldo de agua antes/después, `unidadComercial`, las dos conversiones, forma de pago, `tarifaId`, nombre de tarifa y `tarifaSnapshot` con unidad, litros, incremento físico y precio unitario. El importe se calcula con ese snapshot. La venta original nunca se sobrescribe por una diferencia posterior.

La clave idempotente se construye con jornada, cliente y par de lecturas. Una repetición de la misma operación no crea una segunda nota, crédito ni registro de despacho.

## 8. Offline y sincronización

Las ventas se guardan primero en la cola IndexedDB de `ventas-offline.js`. La cola normaliza y conserva la cantidad comercial, la lectura calculada antes/después, el incremento del contador, el saldo de agua antes/después, la unidad comercial, las dos conversiones y el `tarifaSnapshot`. Cuando vuelve la conexión, una transacción idempotente crea la nota, crédito si corresponde, despacho calculado en `lecturas_medidor` y actualiza atómicamente la jornada. La tarifa puede quedar inactiva después sin cambiar la venta pendiente o histórica, porque el snapshot viaja con la operación.

El borrador local de `ruta.js` conserva `jornadaIdRuta`, `lecturaActualRuta` y `aguaDisponibleRuta`. Así, después de una venta el siguiente cliente comienza con la lectura calculada de la venta anterior y el saldo local disminuye, incluso si la sincronización remota todavía está pendiente. Una jornada distinta limpia ese contexto para impedir mezclar operaciones.

## 9. Agua a granel y productos comerciales

El agua a granel se controla por carga física, medidor, litros comerciales vendidos y conciliación. No se descuenta como si fuera un SKU convencional.

Los productos comerciales —hielo, botellas, paletas y otros artículos— mantienen inventario de existencias:

```text
Existencia
  + Entradas
  − Ventas
  = Existencia
```

`productos.js` conserva `tipoInventario` para diferenciar `agua_granel` y `producto_comercial`; `inventario.js` se reserva para movimientos que representan entradas, salidas, cargas, transferencias o consumos reales.

## 10. Créditos y caja

```text
VENTA
  ↓
FORMA DE PAGO
  ├── EFECTIVO → CAJA
  └── CRÉDITO → SALDO
                    ↓
                  ABONO
                    ↓
              NUEVO SALDO
```

Una venta a crédito conserva su relación con cliente, jornada, vehículo, medidor, repartidor y tarifaSnapshot. Los abonos no borran la venta original. En el cierre, el crédito forma parte del subtotal de ventas, pero no del efectivo recibido. La caja se interpreta como:

```text
EFECTIVO ESPERADO
  = Ventas en efectivo
  + Pagos de crédito en efectivo
  − Salidas autorizadas
```

## 11. Conciliación

Al cerrar la jornada, `jornada.js` usa la lectura física final como fuente de verdad y la compara con la lectura acumulada calculada por ventas:

```text
Incremento físico real
  = Lectura final física − Lectura inicial física

Incremento calculado por ventas
  = Lectura calculada final − Lectura inicial física

Diferencia de contador
  = Lectura final física − Lectura calculada final

Diferencia en litros
  = Diferencia de contador ÷ Incremento físico por unidad
    × Litros por unidad
    − Otras salidas autorizadas
```

La lectura final física no sobrescribe lecturas calculadas ni ventas. La diferencia se guarda en la jornada como `diferenciaContador`, `diferenciaLitrosFisicaContraCalculada` y `tipoDiferencia`; puede clasificarse como diferencia/merma/revisión.

La administración puede registrar otras salidas autorizadas y una explicación. La diferencia se recalcula al modificar otras salidas y también se expresa en unidades comerciales mediante `diferenciaGarrafones` o su equivalente configurado.

El cierre también guarda `resumenTarifas`, agrupado por tarifaSnapshot. Cada fila muestra unidades equivalentes, litros, precio unitario, subtotal, efectivo y crédito. Este resumen monetario no participa en la fórmula física del medidor: la conciliación continúa comparando litros físicos contra litros registrados, independientemente de las tarifas.

Una diferencia no se clasifica automáticamente como robo o error. Puede requerir revisión por merma, purga, limpieza, derrame, prueba del equipo, salida autorizada, error de lectura o venta no registrada.

## 12. Responsabilidades por archivo

| Archivo | Responsabilidad | Rol |
|---|---|---|
| `app.js` | Navegación, contexto y renderizado por rol. | Ambos |
| `sesion.js` | Roles, pestañas y permisos estructurales. | Ambos |
| `hooks/useSesion.js` | Suscripciones de medición y catálogo de tarifas con persistencia local de Firestore. | Ambos |
| `medicion.js` | Configuración administrativa de unidad, medidor y catálogo de tarifas. | ADMIN |
| `jerarquia.js` | Assignment Management UI para zona, chofer, vehículo, medidor y clientes. | ADMIN |
| `clientes.js` | Ficha de clientes operativos fijos. | ADMIN |
| `jornada.js` | Inicio, lecturas, continuidad, cierre y conciliación. | Ambos, con vista aislada |
| `ruta.js` | Flujo rápido del repartidor y cargas administrativas heredadas. | Ambos, con vista aislada |
| `ventas-offline.js` | Cola IndexedDB, sincronización e idempotencia. | Operación interna |
| `productos.js` | Productos comerciales, existencias y tipos de inventario. | ADMIN |
| `inventario.js` | Existencias y movimientos reales. | ADMIN |
| `creditos.js` | Saldos y abonos. | ADMIN y permiso operativo |
| `gerencia.js` | Caja, gastos y cierres financieros. | ADMIN |
| `reportes.js` | Reportes y respaldos administrativos. | ADMIN |
| `rutas-repartidores.js` | Supervisión administrativa de cargas, comprobantes e historial. | ADMIN |
| `config.js` | Cuenta, permisos y acceso a Medición y Venta. | ADMIN |
| `firestore.rules` | Aislamiento, creación de lecturas e inmutabilidad. | Seguridad |

## 13. Navegación por rol

### ADMIN

```text
Inicio
├── Asignaciones / Zonas
├── Repartidores, vehículos y cargas
├── Clientes fijos
├── Productos / Tarifas
├── Inventario
├── Créditos / Abonos
├── Caja
├── Conciliaciones
├── Reportes
└── Configuración → Medición y Venta
```

### REPARTIDOR

```text
Inicio
├── Mi jornada
├── Mi ruta / clientes asignados
├── Venta por medidor
├── Créditos / Abonos autorizados
└── Cierre de jornada
```

La lista del repartidor es una lista operativa de clientes fijos asignados, no una agenda de contactos.

## 14. Fuera de alcance

No se conectan al flujo rector mapas, GPS, geolocalización, tracking, navegación, recorridos calculados, rutas alternativas, QR de rutas, venta por QR, WhatsApp, teléfono ni acciones de agenda.

El panel visible de `rutas-repartidores.js` conserva únicamente supervisión administrativa de cargas, comprobantes e historial; se retiraron sus controles visibles de GPS y QR del flujo actual. Existen ramas heredadas físicamente en ese archivo y referencias históricas de auditoría de ubicación en módulos antiguos; permanecen fuera del menú y no participan en el flujo de agua por medidor. Su eliminación física debe hacerse en una iteración de limpieza separada si se requiere reducir el legado sin perder datos históricos.

`pedidos.js` y la venta administrativa permanecen como módulos heredados o administrativos. No se usan como una segunda venta de agua por medidor del repartidor.

## 15. Seguridad relevante

Los perfiles permitidos en las reglas son `admin` y `repartidor`. El repartidor solo puede leer clientes ligados a su chofer, jornadas propias, lecturas propias y notas de sus operaciones. Las notas no se pueden actualizar ni borrar después de creadas.

`lecturas_medidor` es un registro de creación única: no se permite `update` ni `delete`. La jornada protege para el repartidor las lecturas iniciales, los vínculos de zona/vehículo/medidor y los parámetros de medición congelados.

La configuración `_meta/medicion_venta` y la colección `tarifas` pueden ser leídas por usuarios autenticados para operar, pero su escritura queda restringida a ADMIN. Las notas y créditos conservan el `tarifaSnapshot`; las notas no se pueden actualizar ni borrar y el snapshot de créditos no puede ser sustituido por un repartidor. El documento `_meta/seed` conserva la excepción técnica necesaria para la siembra inicial.

Las reglas deben validarse también con el emulador o consola de Firebase antes de producción; `node --check` valida sintaxis JavaScript, no sustituye la evaluación de reglas contra datos reales.

## 16. Validación realizada

Se validaron sintácticamente todos los archivos JavaScript del proyecto, incluidos módulos raíz, `hooks` y `db`. También se verificó de forma estática que:

- `medicion.js` está cargado en `index.html` antes de `config.js` y está incluido en el App Shell del service worker.
- `useSesion.js`, `app.js`, `RutaReparto` y `FlujoChoferRapido` propagan `medicion` y `tarifas`; `config.js` las entrega a la pantalla administrativa y `clientes.js` conserva `tarifaHabitualId`.
- `ruta.js` calcula incremento físico y lectura acumulada desde la cantidad comercial, sin pedir lectura física posterior por cliente.
- `jornada.js` captura carga, lectura inicial y lectura final, y concilia la lectura física final contra el cálculo acumulado.
- `ventas-offline.js` conserva cantidad, lecturas calculadas, saldo, escalas, identificadores y `tarifaSnapshot` en la cola, la nota, el crédito y `lecturas_medidor`.
- El importe de agua se calcula por cantidad comercial y precio unitario del snapshot; el precio no interviene en el incremento físico.
- El cierre guarda y muestra el agrupamiento por tarifa y forma de pago, separando efectivo de crédito.
- La venta online y la apertura/cierre de jornada usan operaciones atómicas de Firestore.
- El flujo muestra saldo de agua y barra visual de carga restante.
- Ya no se usa el campo único ambiguo `factorMedidor` en los módulos JavaScript.
- Las reglas protegen la configuración administrativa, la colección `tarifas`, el snapshot tarifario, los parámetros congelados y el saldo no negativo de la jornada.
- La prueba determinista de tarifas confirmó que dos precios distintos pueden producir subtotales diferentes sin cambiar el incremento físico ni la conciliación del medidor.

Resultado de la validación estática: **OK**.

## 17. Pendientes reales para la siguiente iteración

| Pendiente | Motivo | No se marcó como terminado porque… |
|---|---|---|
| Limpieza física del legado GPS/ubicación/QR en módulos antiguos | Reducir código muerto y colecciones históricas fuera del alcance. | Se conservan ramas y referencias heredadas para no borrar datos sin una decisión de migración. |
| Migración explícita de registros históricos sin `tipoInventario` o sin `jornadaId` | Evitar mezclar operaciones antiguas con la conciliación nueva. | Los datos viejos no deben reinterpretarse automáticamente. |
| Operaciones administrativas de corrección/cancelación | Mantener trazabilidad cuando una venta confirmada requiere ajuste. | Las notas confirmadas son inmutables y aún no existe un movimiento formal de corrección. |
| Pruebas contra Firebase Emulator / proyecto real | Confirmar reglas, índices, permisos y escrituras offline con datos reales. | La validación ejecutada aquí fue sintáctica y estática. |
| Prueba de campo de lecturas con el medidor real | Validar resolución, redondeo y el sentido del incremento físico. | La aplicación recibe la lectura, pero la calibración depende del instrumento instalado. |

## 18. Estado final

La aplicación queda alineada con un **sistema operativo para distribución y venta de agua medida por medidor**. El flujo implementado y validado separa volumen, tarifa y dinero:

```text
Jornada
  → vehículo y medidor
  → carga de agua
  → lectura inicial física
  → cantidad comercial por cliente
  → incremento físico calculado
  → lectura acumulada calculada
  → litros comerciales
  → tarifa específica de la venta
  → precio unitario y subtotal
  → efectivo o crédito
  → sincronización offline idempotente
  → lectura final física
  → diferencia contra lectura calculada
  → conversión y conciliación
  → cierre
```

Los pendientes anteriores son límites reales de la iteración y no deben presentarse como funcionalidades terminadas.
