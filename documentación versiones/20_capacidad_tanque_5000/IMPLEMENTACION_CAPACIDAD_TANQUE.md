# Corrección — Capacidad instantánea del tanque de agua

## Regla operativa

Los **5,000 litros** representan la capacidad máxima que puede contener el camión en un momento determinado. No representan el límite total de ventas ni el total de litros cargados durante el día.

> El stock móvil de agua es `aguaDisponibleLitros`. Una recarga solo se permite si el saldo resultante no supera 5,000 litros.

La condición correcta es:

```text
aguaDisponibleLitros + litrosDeRecarga <= 5,000
```

## Ejemplo operativo

Si el camión inicia con 5,000 litros, vende 4,950 litros y quedan 50 litros disponibles, puede recargar hasta 4,950 litros. Después de la recarga vuelve a tener 5,000 litros disponibles, aunque el acumulado cargado del día sea 9,950 litros.

Por tanto, vender más de 5,000 litros durante el día es válido cuando existen recargas sucesivas. El historial de `aguaCargadaLitros` conserva el total cargado del día, mientras que `aguaDisponibleLitros` representa el stock móvil actual.

## Bloqueo de sobreventa

Cada venta se valida de manera independiente contra el saldo disponible de la jornada. Si hay 50 litros y se intenta vender una cantidad equivalente a 160 litros, esa operación se rechaza con el mensaje de agua insuficiente. La jornada no se cancela, las ventas anteriores no se revierten y el repartidor puede registrar una venta posterior de hasta 50 litros.

La validación existe tanto antes de enviar la venta desde `ruta.js` como dentro de la transacción de `ventas-offline.js`, que vuelve a comprobar la continuidad de saldo antes de escribir la venta y actualizar la jornada.

## Cambios aplicados

| Área | Corrección |
|---|---|
| Recarga | Valida el espacio libre del tanque, no el total cargado durante el día. |
| Capacidad | Se establece en 5,000 litros mediante `capacidadTanqueLitros`, con ese valor por defecto. |
| Ventas | Conservan el bloqueo por saldo insuficiente de cada operación. |
| Medidor | No se modifica por recargar; solo las ventas incrementan la lectura lógica. |
| Historial | Las cargas y recargas siguen registrándose en `cargas_agua`, con jornada, vehículo, medidor y localidad. |
| Reglas | Firestore limita `aguaDisponibleLitros` a 5,000 y permite que `aguaCargadaLitros` crezca con las recargas sucesivas. |
| Indicador | La barra de nivel se calcula contra la capacidad del tanque, no contra el total histórico cargado. |

## Compatibilidad y límites

Las jornadas antiguas que no tengan `capacidadTanqueLitros` utilizan 5,000 litros como valor predeterminado. El sistema no agrega todavía una capacidad diferente por vehículo porque ese campo no existe en el catálogo administrativo actual.

No se modifica la lectura física inicial o final, no se solicita una lectura después de cada cliente y no se cancelan ventas anteriores cuando una operación individual excede el saldo.

## Validaciones

Se validó que una recarga que eleva el saldo de 4,990 a 5,000 litros es permitida, que una recarga que lo elevaría a 5,001 litros es rechazada, y que una jornada con acumulado cargado superior a 5,000 litros sigue siendo permitida cuando el saldo instantáneo no supera la capacidad.

También se conservaron las pruebas de referencias localidad → vehículo → medidor, la prueba de escritura atómica de apertura y carga inicial, y la prueba de bloqueo de ventas por agua insuficiente existente en la transacción de ventas.


## Validación adicional del escenario operativo

Se comprobó el caso de una jornada con 5,000 litros iniciales, 4,950 litros vendidos y 50 litros disponibles. Una recarga de 4,950 litros es válida y deja nuevamente 5,000 litros en el tanque, aunque el acumulado cargado del día ya sea 9,950 litros. Una recarga que dejaría más de 5,000 litros disponibles se rechaza.

También se comprobó que una venta de 160 litros con solo 50 litros disponibles se bloquea únicamente para esa operación. La jornada conserva 50 litros disponibles y 4,950 litros vendidos; no se escriben la venta ni cambios parciales. Una venta posterior de hasta 50 litros sí puede confirmarse.
