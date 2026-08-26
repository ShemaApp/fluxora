# Propuesta de importación y exportación de clientes

## Estado actual

En la versión actual **no existe importación de clientes**. Tampoco existe una exportación específica del catálogo de clientes. La exportación que sí existe pertenece a Reportes y produce información de ventas, tarifas y conciliación en Excel o CSV; no debe confundirse con una exportación editable de clientes [1].

La pantalla Clientes crea y edita el registro maestro con nombre, localidad asignada, método de servicio, teléfono y tarifa habitual. El registro también guarda referencias internas de localidad y tarifa, estado y datos de alta para que la aplicación pueda operar y auditar correctamente [2].

## Campos que usa actualmente el formulario

| Campo visible o de negocio | Requerido | Valor que debe manejar Excel | Uso del sistema |
|---|---:|---|---|
| `Nombre` | Sí | Texto libre no vacío | Identifica al cliente en la ruta, ventas, servicios e historial |
| `Localidad` | Sí | Nombre exacto de una localidad existente | Define el alcance operativo del repartidor; debe tener repartidor asignado |
| `Método de servicio` | Sí | `Doméstica` o `Medido por medidor` | Determina el flujo de venta o relleno que se habilita |
| `Teléfono` | No | Texto; puede conservar formato y ceros iniciales | Dato de contacto del cliente |
| `Tarifa habitual` | Sí | Nombre exacto de una tarifa activa existente | Guarda la referencia a la tarifa; el precio no se captura como número libre |
| `Estado` | Recomendado | `Activo` o `Inactivo` | Controla si el cliente participa en listados y operación |

**Observación importante:** el objeto de formulario actual ya conserva `activo`, pero en la versión revisada el editor no presenta todavía un selector visible de Estado. Antes de implementar importación conviene decidir si `Estado` se mostrará también explícitamente en la ficha; no se debe hacer que Excel exponga un campo que el formulario no permita entender o mantener de forma coherente.

La columna que el usuario llamó “tipo de precio” conviene nombrarla **Tarifa habitual**. No debe contener `$15.00` ni un precio arbitrario: debe coincidir con una tarifa activa ya configurada, por ejemplo `Garrafón doméstico`. El precio, litros por unidad e incremento físico pertenecen a la configuración de la tarifa y no deben duplicarse en cada cliente.

## Campos que no deben ir en la plantilla

| Campo | Decisión | Motivo |
|---|---|---|
| ID del documento de Firestore | No exportar ni importar | Es una referencia técnica generada por backend y no debe ser capturada por el administrador |
| `localidadId` | No usar como columna humana | La hoja debe mostrar el nombre real de la localidad; el sistema resolverá la referencia internamente |
| `tarifaId` y `tarifaHabitualId` | No usar como columna humana | La hoja debe elegir por nombre de tarifa existente; el sistema resolverá el ID |
| `creadoPorUid`, `creadoPorNombre`, `fechaAlta` | No importar | Son metadatos de trazabilidad generados por el sistema |
| Saldo de crédito | No importar en el alta de clientes | El saldo nace de ventas a crédito y abonos; no se debe crear deuda por Excel |
| Ventas, servicios y comprobantes | No importar | Son historial operativo y deben conservar sus relaciones con jornada, vehículo y medidor |
| Jornada, vehículo, medidor y lecturas | No importar | Pertenecen a la operación medida, no a la ficha maestra del cliente |
| Stock, cargas y conciliación | No importar | Son datos de inventario y control de agua, no atributos del cliente |
| `__pending` u otras marcas offline | No exportar | Son estado temporal de sincronización local |
| `identificación` y `dirección` de semillas antiguas | No incluir por defecto | Son campos de ejemplo legado y no forman parte del formulario actual de Clientes |

## Exportación propuesta por filtros

La exportación debe tomar exactamente el resultado visible después de aplicar búsqueda y filtros. Actualmente Clientes permite buscar por nombre o localidad y filtrar por estado, crédito y localidad [2]. El botón debe llamarse **Exportar clientes** y debe dejar claro cuántos registros se exportarán.

La exportación administrativa recomendada debe contener únicamente estas columnas: `Nombre`, `Localidad`, `Método de servicio`, `Teléfono`, `Tarifa habitual` y, si se confirma su uso visible en la ficha, `Estado`. No incluirá IDs, saldos, ventas ni datos de jornada.

Para Excel conviene generar dos hojas separadas:

| Hoja | Contenido | ¿Se puede reutilizar para importar? |
|---|---|---:|
| `Clientes` | Los campos administrativos exportables del resultado filtrado | Sí, después de revisar la advertencia y la vista previa |
| `Filtros aplicados` | Fecha de exportación, búsqueda, estado, crédito y localidad utilizados | No; es contexto de consulta |

El CSV puede contener únicamente la hoja `Clientes`, porque no soporta hojas múltiples. El nombre del archivo debe indicar que es una exportación de clientes y no un reporte de ventas. Si se exporta el filtro `Con crédito`, el archivo debe conservar la lista de clientes resultante, pero **no convertir el filtro en una columna de saldo** salvo que se diseñe después un reporte operativo independiente.

## Plantilla de importación

La plantilla debe estar disponible como **Descargar plantilla de clientes** y contener una fila de encabezados sin IDs técnicos:

```text
Nombre | Localidad | Método de servicio | Teléfono | Tarifa habitual | Estado
```

Ejemplo de contenido humano:

```text
Cliente A | Zona Norte | Doméstica | 5512345678 | Garrafón doméstico | Activo
Cliente B | Zona Norte | Medido por medidor | 5587654321 | Tarifa medida | Activo
```

`Nombre`, `Localidad`, `Método de servicio` y `Tarifa habitual` deben ser obligatorios. `Teléfono` puede quedar vacío. `Estado` debe ser obligatorio únicamente si se decide incorporarlo como control visible del formulario; de lo contrario, todos los clientes importados deberán crearse como activos y esa decisión debe mostrarse expresamente en la advertencia.

La localidad debe existir previamente y estar asignada a un repartidor, porque esa es una condición operativa vigente para guardar un cliente. La tarifa también debe existir y estar activa. La importación no debe crear localidades ni tarifas automáticamente a partir de texto desconocido.

## Advertencia y seguridad antes de importar

La importación no debe escribir directamente al seleccionar un archivo. Primero debe mostrar una advertencia como la siguiente:

> **Antes de importar:** se crearán clientes usando las localidades y tarifas existentes. No se generarán IDs manuales. Las filas con localidad inexistente, localidad sin repartidor, tarifa inexistente, tarifa inactiva, método inválido o nombre vacío no se guardarán. Esta operación no elimina ni sobrescribe clientes existentes. Revisa la vista previa antes de confirmar.

El flujo seguro recomendado es **archivo → validación → vista previa → confirmación → escritura**. La vista previa debe mostrar el total de filas, filas válidas, advertencias y errores. Cada fila debe indicar si será creada, omitida o requiere corrección.

| Validación | Resultado recomendado |
|---|---|
| Encabezado desconocido | Advertencia; no mapearlo silenciosamente a un campo distinto |
| Nombre vacío | Error y fila no importable |
| Localidad no encontrada | Error y fila no importable |
| Localidad sin repartidor asignado | Error y fila no importable |
| Método distinto de `Doméstica` o `Medido por medidor` | Error y fila no importable |
| Tarifa no encontrada o inactiva | Error y fila no importable |
| Teléfono vacío | Permitido |
| Estado vacío | Depende de la decisión sobre el campo; por defecto no debe inventarse una baja |
| Posible duplicado por nombre y localidad | Advertencia; no sobrescribir automáticamente |
| ID, `localidadId` o `tarifaId` incluidos | Advertencia de campo técnico no permitido; no usar esos valores |

## Regla para duplicados y actualizaciones

La primera versión debería operar en modo **solo altas nuevas**. No es seguro actualizar por nombre y localidad, porque puede haber dos clientes con nombres iguales o cambios legítimos de nombre. El ID de Firestore no debe aparecer en el Excel por la decisión de mantenerlo interno.

Por lo tanto, si una fila parece coincidir con un cliente existente, la aplicación debe marcarla como **posible duplicado**, excluirla de la escritura automática y permitir que el administrador la revise desde Clientes. No debe eliminar registros, cambiar localidades, cambiar tarifas ni modificar saldos por una importación masiva sin una decisión posterior y explícita.

## Separación entre exportación administrativa y datos internos

El dueño de negocio necesita una hoja limpia para revisar o preparar clientes. El sistema, en cambio, necesita conservar relaciones que no son útiles para esa hoja: IDs, referencias, metadatos de creación, créditos, ventas, servicios medidos, jornada, vehículo, medidor, lecturas y sincronización offline. La regla propuesta es:

> **La exportación administrativa muestra datos que una persona puede revisar y corregir; el sistema conserva internamente los datos que necesita para relacionar, calcular, sincronizar y auditar.**

No se debe intentar que un único Excel sea simultáneamente una ficha administrativa, un reporte financiero y una copia de la base de datos. Para esos usos deben existir exportaciones separadas y con nombres explícitos.

## Decisiones que necesito confirmar antes de implementarlo

1. ¿Confirmas que la plantilla use exactamente `Nombre`, `Localidad`, `Método de servicio`, `Teléfono`, `Tarifa habitual` y `Estado`?
2. ¿Quieres que `Estado` aparezca también como selector visible dentro de la ficha de Cliente, para que importación, exportación y formulario tengan el mismo contrato?
3. ¿La primera versión debe ser únicamente **alta de clientes nuevos**, sin actualizar ni sobrescribir coincidencias?
4. Cuando filtres por `Con crédito`, ¿quieres exportar solo la lista de clientes filtrados o también un saldo actual en un reporte separado? Mi recomendación es mantener el saldo fuera de la plantilla de clientes.

## Referencias

[1]: https://github.com/ShemaApp/fluxora/blob/main/reportes.js "Exportación actual de Reportes"
[2]: https://github.com/ShemaApp/fluxora/blob/main/clientes.js "Formulario y filtros actuales de Clientes"
[3]: https://github.com/ShemaApp/fluxora/blob/main/db/semillas.js "Campos de semillas antiguas"
