# Revisión de la idea: catálogo e historial de movimientos

## Dictamen

La idea es **válida y más cercana a la operación real** que importar únicamente una lista de nombres. Las hojas representan dos niveles distintos: una vista resumida por localidad y cliente, y un historial diario de llenados, crédito, abonos y pagos.

La decisión correcta no es convertir la hoja completa en un único documento de Firestore. Es separar **datos maestros del cliente** de **movimientos históricos** y dejar que el sistema calcule saldos, adeudos y estados a partir de movimientos trazables.

> La hoja puede conservar una apariencia familiar para el equipo, pero no debe convertirse literalmente en la base de datos.

## Lo que encaja con FLUXORA

| Concepto de la hoja | Encaje con el modelo actual | Tratamiento recomendado |
|---|---|---|
| Localidad | Encaja directamente con la unidad operativa actual | Resolver por nombre real contra `localidades`; no importar un ID escrito |
| Nombre del cliente | Encaja directamente con `clientes.nombre` | Dato maestro obligatorio |
| Llenado | Encaja con unidades comerciales y litros vendidos | Definir si el valor es garrafones, unidades o litros; no llamarlo solo “llenado” en el modelo interno |
| Crédito | Encaja con una venta cuya forma de pago es crédito | Guardar como movimiento de venta; no como saldo escrito manualmente |
| Abono | Encaja con los abonos de una cuenta de crédito | Registrar como movimiento de pago con fecha y monto |
| Adeudo | Encaja como saldo derivado | Calcular a partir de ventas a crédito menos abonos |
| Pagado o recibido | Puede encajar, pero el significado de la hoja es ambiguo | Definir si representa efectivo recibido, total liquidado o pago aplicado |
| Fecha | Encaja con el historial | Obligatoria en cada movimiento histórico |
| Remisión | Puede ser una referencia externa de la hoja | No usarla como ID de Firestore; conservarla solo si el equipo confirma su significado |

## Campos que requieren definición antes de programar

La hoja utiliza nombres que pueden significar cosas distintas para diferentes personas. No conviene inferirlos durante la importación.

| Campo de la hoja | Problema | Pregunta necesaria |
|---|---|---|
| Número de cliente | Puede ser un número comercial visible, no el ID técnico de Firestore | ¿Debe conservarse como número externo visible o se elimina porque el sistema generará su ID interno? |
| Remisión | Puede ser folio, nota, ruta o comprobante | ¿Qué documento identifica y quién lo genera? |
| Garrafones | Puede representar unidades entregadas | ¿Es llenado doméstico, venta comercial o ambas cosas? |
| Acomodo efectivo | El nombre no corresponde a un campo actual inequívoco | ¿Es dinero recibido, garrafones cobrados en efectivo o una actividad distinta? |
| Garrafón crédito | Puede ser unidades vendidas a crédito | ¿Se debe calcular como parte de la venta con forma de pago `credito`? |
| Abonos | Puede ser suma de abonos o un abono individual de la fecha | ¿Cada fila histórica tiene un abono fechado o solo un acumulado? |
| Recibido | Puede duplicar efectivo o abono | ¿Es efectivo recibido ese día, pago total o confirmación de entrega? |
| Adeudo | Es un resultado, no necesariamente un dato de origen | ¿Se importará como saldo inicial histórico o se reconstruirá desde movimientos? |
| Atrasados | Parece un estado derivado | ¿Se calcula por antigüedad de adeudo o se capturaba manualmente? |
| Lavado | No existe como campo operativo equivalente en el modelo actual | ¿Es un servicio facturable que debe incorporarse o una anotación fuera de alcance? |

## Corrección de nombres para el modelo interno

Para evitar ambigüedad, el modelo no debería guardar una propiedad genérica llamada `llenado`. Debe distinguir las unidades y los cálculos.

```js
{
  fecha: '2026-08-18',
  clienteId: 'id-interno-resuelto',
  localidadId: 'id-interno-resuelto',
  unidadesComerciales: 10,
  unidadComercial: 'garrafón',
  litrosVendidos: 200,
  formaPago: 'credito',
  subtotal: 150,
  referenciaExterna: 'REM-001',
  origen: 'migracion_hoja',
  historico: true
}
```

La estructura anterior es conceptual; no debe añadirse al proyecto hasta confirmar las equivalencias de la hoja y decidir dónde se almacenará el histórico migrado. En las ventas actuales, FLUXORA ya conserva cliente, localidad, jornada, vehículo, medidor, litros, garrafones, tarifa, subtotal y forma de pago; esos movimientos actuales no deben duplicarse por una importación histórica [1].

## Separación recomendada

### 1. Cliente maestro

Contiene únicamente la información permanente: nombre, localidad, método de servicio, teléfono, tarifa habitual y estado, conforme al formulario actual [2]. Su ID lo genera el sistema y no debe escribirse desde Excel.

### 2. Movimiento histórico

Contiene una fila por cliente y fecha, con el movimiento que realmente se pueda reconstruir. Puede incluir llenado/unidades, litros si existen, venta a crédito, efectivo recibido, abono, referencia externa y origen de migración.

### 3. Datos derivados

Adeudo, atraso, saldo corriente y totales acumulados deben calcularse. No conviene importar `Adeudo` y `Atrasados` como verdad absoluta si también se importan ventas y abonos, porque existirían dos fuentes contradictorias.

La única excepción sería un **saldo inicial de migración**, si las hojas no contienen suficiente historial para reconstruir el adeudo. En ese caso debe registrarse como una operación explícitamente marcada como saldo inicial histórico, con fecha de corte, origen y nota de revisión. No debe confundirse con una venta nueva ni con efectivo recibido.

## No mezclar automáticamente con jornada y medidor

Los movimientos de las hojas antiguas no parecen contener `jornadaId`, `vehiculoId`, `medidorId`, lectura inicial, lectura final, incremento físico ni saldo de agua de la jornada. Por eso no deben insertarse como ventas actuales de agua medida ni modificar la conciliación del medidor.

La importación histórica debe quedar separada de la operación diaria actual. Las ventas nuevas continuarán naciendo desde la jornada y conservarán sus snapshots de tarifa, litros, lectura lógica, forma de pago y referencias operativas [1].

## Flujo de importación recomendado

El archivo debe procesarse en dos bloques lógicos:

```text
Excel / CSV
    │
    ├── Datos maestros del cliente
    │       └── clientes
    │
    └── Movimientos históricos por fecha
            └── revisión y migración histórica
```

El flujo seguro es **leer → identificar hojas → mapear columnas → validar → mostrar vista previa → confirmar**. La vista previa debe indicar cuántos clientes nuevos, movimientos históricos, errores, advertencias y posibles duplicados existen.

No se debe guardar nada al seleccionar el archivo. Las filas históricas con campos ambiguos deben quedar en advertencia o rechazadas hasta que el usuario defina su significado.

## Exportación recomendada

La exportación debería tener tres finalidades separadas, no un único archivo que intente servir para todo.

| Exportación | Contenido | ¿Editable para reimportar? |
|---|---|---:|
| Catálogo de clientes | Nombre, localidad, método de servicio, teléfono, tarifa habitual y estado si se confirma | Sí, solo para altas nuevas en la primera versión |
| Historial de movimientos | Fecha, cliente, localidad, llenado normalizado, crédito, abono, pagado/recibido, referencia y origen | No por defecto; es un reporte de control |
| Formato hoja operativa | Vista resumida parecida a la hoja original, con totales y filtros | No; es una salida de consulta |

El historial exportado puede conservar el aspecto de las hojas actuales, pero debe incluir una nota de que `Adeudo`, `Atrasados` y totales son valores calculados. Los IDs técnicos, estados offline, claves internas, lecturas de medidor y datos de auditoría no deben exponerse en la hoja administrativa.

## Alcance por fases

| Fase | Alcance | Riesgo |
|---|---|---|
| Fase 1 | Importar catálogo maestro de clientes con localidad y tarifa existentes | Bajo, si es solo altas nuevas |
| Fase 2 | Exportar historial actual en formato humano y filtrable | Bajo, porque no escribe datos |
| Fase 3 | Importar movimientos históricos claramente definidos | Medio; requiere diccionario y fecha de corte |
| Fase 4 | Reconstructir saldos iniciales o cuentas históricas | Alto; requiere conciliación con el dueño del negocio |
| Fuera de esta fase | Convertir filas antiguas en ventas nuevas de jornada o alterar medidor/caja | No permitido |

## Recomendación final

La idea debe avanzar, pero con una corrección de alcance: **no empezar por importar todas las columnas de la hoja**. Primero hay que cerrar un diccionario de significados para `Acomodo efectivo`, `Recibido`, `Adeudo`, `Atrasados` y `Lavado`. Después se puede construir un importador de dos entidades: clientes y movimientos históricos.

Para las primeras 50 altas, recomiendo mantener el importador de clientes independiente y seguro. Para las hojas antiguas, recomiendo comenzar con una **exportación de consulta parecida a la libreta**, y solo después diseñar la migración histórica, porque una exportación no pone en riesgo los saldos ni la conciliación actual.

## Decisiones que debe confirmar el equipo

1. ¿`Número de cliente` es un folio visible que debe conservarse como dato externo o se elimina porque el ID del sistema debe permanecer interno?
2. ¿Qué significa exactamente `Acomodo efectivo`?
3. ¿`Recibido` significa efectivo cobrado, abono aplicado o confirmación de entrega?
4. ¿`Adeudo` debe reconstruirse desde ventas y abonos o existe un saldo inicial a una fecha de corte?
5. ¿`Lavado` forma parte de FLUXORA o es una anotación de la hoja que debe quedar fuera?
6. ¿Las hojas históricas contienen una fila por movimiento real o solo acumulados por cliente?
7. ¿Se requiere conservar `Remisión` como referencia externa visible?

## Referencias

[1]: https://github.com/ShemaApp/fluxora/blob/main/ventas-offline.js "Estructura actual de ventas y trazabilidad operativa"
[2]: https://github.com/ShemaApp/fluxora/blob/main/clientes.js "Formulario y datos maestros actuales de Clientes"
