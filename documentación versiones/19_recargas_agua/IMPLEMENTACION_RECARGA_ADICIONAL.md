# Implementación — Recarga adicional de agua durante la jornada

## Objetivo

Permitir que el repartidor agregue agua adicional mientras una jornada permanece abierta, manteniendo el saldo del mismo vehículo y sin modificar las lecturas físicas ni la lectura lógica del medidor.

> La recarga aumenta el agua disponible. La venta disminuye el agua disponible y aumenta el medidor lógico. La lectura física solo se captura al abrir y cerrar la jornada.

## Modelo implementado

| Valor | Comportamiento |
|---|---|
| `aguaCargadaLitros` | Acumulado de litros cargados durante la jornada: carga inicial más recargas. |
| `aguaDisponibleLitros` | Saldo actual disponible en el vehículo. Aumenta con una carga y disminuye con cada venta. Nunca puede ser negativo. |
| `litrosRecargadosAcumulados` | Acumulado de litros agregados después de la carga inicial. |
| `lecturaCalculadaActual` | Se conserva durante una recarga. Solo aumenta cuando se confirma una venta según la equivalencia configurada. |
| `lecturaInicial` y `lecturaFinal` | Lecturas físicas manuales de apertura y cierre. La recarga no crea ni modifica una lectura física. |

La operación de recarga se registra en la colección `cargas_agua`. Cada movimiento queda ligado a `jornadaId`, `localidadId`, `vehiculoId`, `medidorId`, repartidor, fecha y litros del movimiento. La carga inicial también se registra en esta colección dentro de la misma transacción que abre la jornada.

## Interfaz

Dentro de una jornada abierta del rol REPARTIDOR aparece el bloque **RECARGA ADICIONAL**. El repartidor captura litros y pulsa **Agregar litros**. La interfaz informa que el movimiento afecta al saldo de agua del mismo vehículo y jornada, pero no al medidor.

El indicador **AGUA DISPONIBLE** muestra el saldo actual y una barra horizontal. La carga acumulada, el total de recargas y la lectura calculada se muestran en el mismo bloque. En ADMIN se conserva únicamente la supervisión de jornadas y movimientos; no se muestra el control operativo de recarga.

## Persistencia y modo offline

En línea, la recarga utiliza una transacción de Firestore que lee la jornada abierta, valida al repartidor y confirma en una sola operación el movimiento de `cargas_agua` y el incremento de los saldos de la jornada.

Sin conexión, la operación utiliza el mecanismo de persistencia local de Firestore y una escritura batch. Las actualizaciones de saldo se expresan mediante incrementos de Firestore para que varias recargas locales no se sobrescriban entre sí cuando se sincronicen. La pantalla informa que la recarga quedó pendiente localmente cuando la conexión no está disponible.

## Seguridad y referencias

Las reglas locales permiten crear una carga únicamente si el repartidor autenticado es el propietario de la jornada, la jornada está abierta y las referencias de localidad, vehículo y medidor coinciden con la jornada. Una jornada cerrada, un vehículo diferente o un medidor diferente bloquean la operación.

La regla de actualización de jornada permite que el saldo cargado aumente, conserva la continuidad de las lecturas y no permite que el repartidor cambie las referencias operativas. La colección `cargas_agua` es de solo creación; sus movimientos no se editan ni se borran.

Estas reglas están versionadas en `firestore.rules` dentro del repositorio. No se desplegaron automáticamente en Firebase remoto.

## Archivos afectados

| Archivo | Cambio |
|---|---|
| `cargas-agua.js` | Nuevo módulo para registrar carga inicial y recarga adicional con transacción o batch local. |
| `db/colecciones.js` | Nueva constante `COLECCIONES.CARGAS_AGUA`. |
| `jornada.js` | Carga inicial histórica, panel de recarga del repartidor e indicadores acumulados. |
| `ruta.js` | Supervisión ADMIN de movimientos de carga asociados a jornadas abiertas. |
| `hooks/useSesion.js` | Suscripción de cargas por repartidor o ADMIN. |
| `app.js` | Exposición de `cargasAgua` al contexto común. |
| `index.html` | Inclusión del módulo de recargas. |
| `firestore.rules` | Permisos y validaciones de referencias para `cargas_agua`. |
| `visual-fluxora.css` | Adaptación móvil del control de recarga. |
| `sw.js` | Actualización de caché a `v1.5.3`. |

## Validaciones realizadas

Se validó la sintaxis de todos los módulos JavaScript, el JSON del manifest y el formato del diff. La prueba unitaria `WATER_RECHARGE_LOGIC_OK` confirmó que una recarga de 30 litros aumenta el saldo disponible de 40 a 70 litros, aumenta la carga acumulada de 100 a 130 litros, registra el movimiento y conserva la lectura calculada.

La prueba conductual del emulador confirmó que el repartidor puede crear la recarga de su jornada, que el saldo aumenta sin cambiar el medidor, y que se bloquean un vehículo incorrecto y una jornada cerrada.

## Pendientes no incluidos

No se implementó una capacidad máxima del tanque porque los vehículos actuales no tienen un campo de capacidad configurado. Tampoco se agregó una recarga de planta o un inventario global de agua; la recarga queda registrada como movimiento de la jornada y del vehículo. Si se requiere descontar la recarga de una existencia de planta, debe definirse primero el origen, la capacidad y el responsable de esa operación.
